import React, { useEffect, useRef, useState } from 'react';

const LiveEdgeNode: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [lastDetected, setLastDetected] = useState<string | null>(null);
  const [avgLevel, setAvgLevel] = useState(0);
  const [status, setStatus] = useState<'idle' | 'sending' | 'loading' | 'detected' | 'quiet'>('idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cooldownRef = useRef<boolean>(false);
  const spectrumStats = useRef({ lowMax: 0, midMax: 0, highMax: 0 });

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsActive(true);
      setStatus('idle');

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      visualize();
      startInferenceLoop();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopMic = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsActive(false);
    setLastDetected(null);
    setAvgLevel(0);
    setStatus('idle');
    cooldownRef.current = false;
  };

  const visualize = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = '#09090b';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      let lowSum = 0, midSum = 0, highSum = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];
        
        if (i < 15) lowSum += barHeight;
        else if (i < 60) midSum += barHeight;
        else highSum += barHeight;

        canvasCtx.fillStyle = `rgb(${barHeight + 50}, 250, 150)`;
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
      }

      spectrumStats.current.lowMax = Math.max(spectrumStats.current.lowMax, lowSum / 15);
      spectrumStats.current.midMax = Math.max(spectrumStats.current.midMax, midSum / 45);
      spectrumStats.current.highMax = Math.max(spectrumStats.current.highMax, highSum / 68);
    };
    draw();
  };

  const startInferenceLoop = () => {
    if (!streamRef.current) return;

    // Determine supported mimeType
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    const mediaRecorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = mediaRecorder;
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob([...chunks], { type: mimeType || 'audio/webm' });
      chunks.length = 0;

      const stats = spectrumStats.current;
      const avg = Math.round((stats.lowMax + stats.midMax + stats.highMax) / 3);
      setAvgLevel(avg);

      // Reset for next chunk
      spectrumStats.current = { lowMax: 0, midMax: 0, highMax: 0 };

      if (avg < 70) {
        console.log(`🔇 Too quiet (avg: ${avg}), skipping analysis`);
        setStatus('quiet');
        return;
      }

      if (cooldownRef.current) {
        console.log('⏸ skipping (cooldown)');
        return;
      }

      if (!audioBlob) {
        console.log('⚪ blob is null, skipping');
        return;
      }

      if (audioBlob.size < 1000) {
        console.log('⚪ audio too small');
        return;
      }

      setStatus('sending');
      cooldownRef.current = true;

      try {
        console.log(`sending to Gemini... (${audioBlob.size} bytes)`);

        const getBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
           const reader = new FileReader();
           reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || "");
           reader.onerror = reject;
           reader.readAsDataURL(blob);
        });

        const base64data = await getBase64(audioBlob);
        if (!base64data) throw new Error("Failed to encode audio");

        const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!geminiKey) throw new Error("Missing VITE_GEMINI_API_KEY in frontend .env");

        const payload = {
          contents: [
            {
              parts: [
                { text: "Analyze this audio. Identify if it contains dangerous sounds like gunshot, chainsaw, or human activity. Give a short answer." },
                {
                  inline_data: {
                    mime_type: audioBlob.type || "audio/webm",
                    data: base64data
                  }
                }
              ]
            }
          ]
        };

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
           const errorJson = await res.json().catch(() => ({}));
           console.error("Full Gemini Error JSON:", errorJson);
           throw new Error(`Gemini API Error: ${res.status}`);
        }

        const data = await res.json();
        console.log("response received", data);

        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No threat detected";
        console.log("✅ Analysis Result:", answer);

        const lower = answer.toLowerCase();
        let detectedType = 'Loud Anomaly';
        
        if (lower.includes('chainsaw')) {
           detectedType = 'chainsaw';
        } else if (lower.includes('gun') || lower.includes('shot')) {
           detectedType = 'gunshot';
        } else if (lower.includes('human') || lower.includes('speech') || lower.includes('voice')) {
           detectedType = 'human';
        } else if (lower.includes('vehicle') || lower.includes('engine')) {
           detectedType = 'vehicle';
        }
        
        setLastDetected(detectedType);
        setStatus('detected');

        // Anti-spam cooldown protection
        setTimeout(() => {
          cooldownRef.current = false;
          setStatus('idle');
        }, 10000);

      } catch (err: any) {
        console.error('❌ Classification error:', err.message);
        setTimeout(() => {
          cooldownRef.current = false;
          setStatus('idle');
        }, 10000);
      }
    };

    // Record 3s chunks in a loop
    const recordCycle = () => {
      if (!streamRef.current) return;
      if (mediaRecorder.state === 'inactive') {
        mediaRecorder.start();
      }
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
        // Start next cycle after a short gap
        setTimeout(() => {
          if (streamRef.current) recordCycle();
        }, 300);
      }, 3000);
    };

    recordCycle();
  };

  useEffect(() => {
    return () => { stopMic(); };
  }, []);

  const statusLabel: Record<string, { text: string; color: string }> = {
    idle:     { text: 'Listening...', color: '#6F6F6F' },
    quiet:    { text: 'Too quiet', color: '#6F6F6F' },
    sending:  { text: 'Analyzing...', color: '#f59e0b' },
    loading:  { text: 'Model warming up...', color: '#f59e0b' },
    detected: { text: 'Threat classified!', color: '#ef4444' },
  };

  return (
    <div className="bg-zinc-950 text-white rounded-3xl p-8 shadow-2xl border border-zinc-800/80 w-full max-w-md mx-auto font-inter">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-instrument text-zinc-100 mb-1">Live Edge Node</h2>
          <p className="text-sm text-zinc-500 tracking-wide font-mono uppercase">Acoustic Sensor ID: 001</p>
        </div>
        {isActive && (
          <div className="text-right">
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider mb-1">Level</p>
            <p className={`text-sm font-mono font-bold ${
              avgLevel > 60 ? 'text-red-400' : avgLevel > 30 ? 'text-yellow-400' : 'text-emerald-400'
            }`}>
              {avgLevel}
            </p>
          </div>
        )}
      </div>

      {/* Visualizer */}
      <div className="bg-[#09090b] rounded-xl overflow-hidden mb-4 h-48 flex items-center justify-center relative border border-zinc-800 shadow-inner">
        <canvas ref={canvasRef} width={400} height={200} className="w-full h-full object-cover" />
        {!isActive && (
          <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center backdrop-blur-md">
            <span className="text-zinc-500 font-medium">Mic permissions required</span>
          </div>
        )}
      </div>

      {/* Status bar */}
      {isActive && (
        <div className="mb-3 flex items-center gap-2 px-1">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: statusLabel[status]?.color, display: 'inline-block' }}
          />
          <span className="text-[11px] font-mono" style={{ color: statusLabel[status]?.color }}>
            {statusLabel[status]?.text}
          </span>
        </div>
      )}

      {/* Last detected badge */}
      {lastDetected && isActive && (
        <div className="mb-4 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Last classified:</span>
          <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
            lastDetected === 'gunshot'  ? 'text-red-400' :
            lastDetected === 'chainsaw' ? 'text-yellow-400' :
            'text-blue-400'
          }`}>
            {lastDetected === 'gunshot' ? '🔴' : lastDetected === 'chainsaw' ? '🟡' : '🔵'} {lastDetected}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        {!isActive ? (
          <button
            onClick={startMic}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            Connect Microphone
          </button>
        ) : (
          <div className="flex items-center justify-between w-full bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4 shadow-inner ring-1 ring-emerald-500/20">
            <div className="flex items-center gap-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-semibold tracking-wide text-sm uppercase">Live Feed Active</span>
            </div>
            <button
              onClick={stopMic}
              className="text-xs font-semibold text-zinc-500 hover:text-rose-400 transition-colors uppercase tracking-widest"
            >
              Stop
            </button>
          </div>
        )}
      </div>


    </div>
  );
};

export default LiveEdgeNode;