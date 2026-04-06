import React, { useEffect, useRef, useState } from 'react';

const LiveEdgeNode: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsActive(true);

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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsActive(false);
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

      // Base background color mapping to zinc-950
      canvasCtx.fillStyle = '#09090b'; 
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];

        // Greenish-yellow color effect for active monitoring
        canvasCtx.fillStyle = `rgb(${barHeight + 50}, 250, 150)`;
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

        x += barWidth + 1;
      }
    };
    draw();
  };

  const startInferenceLoop = () => {
    intervalRef.current = setInterval(() => {
      if (!analyserRef.current) return;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
      }
      const average = sum / dataArray.length;

      // Threshold check (lowered sensitivity from 130 to 80)
      if (average > 80) {
        console.log(`🎤 Loud noise detected by Edge Node! Tricking backend with vehicle -> chainsaw sequence.`);
        
        // 1. Send vehicle
        fetch('http://localhost:3001/api/simulate-sound', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId: 1, soundType: 'vehicle', confidenceScore: 0.95 })
        }).catch(err => console.error("Edge Node HTTP Error:", err));

        // 2. Wait 1 second, send chainsaw
        setTimeout(() => {
          fetch('http://localhost:3001/api/simulate-sound', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodeId: 1, soundType: 'chainsaw', confidenceScore: 0.98 })
          }).catch(err => console.error("Edge Node HTTP Error:", err));
        }, 1000);
      }
    }, 3000); // 3-second heartbeat analysis
  };

  useEffect(() => {
    return () => {
      stopMic(); // Cleanup execution on component unmount
    };
  }, []);

  return (
    <div className="bg-zinc-950 text-white rounded-3xl p-8 shadow-2xl border border-zinc-800/80 w-full max-w-md mx-auto font-inter">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-instrument text-zinc-100 mb-1">Live Edge Node</h2>
          <p className="text-sm text-zinc-500 tracking-wide font-mono uppercase">Acoustic Sensor ID: 001</p>
        </div>
      </div>

      {/* Visualizer Frame */}
      <div className="bg-[#09090b] rounded-xl overflow-hidden mb-8 h-48 flex items-center justify-center relative border border-zinc-800 shadow-inner">
        <canvas ref={canvasRef} width={400} height={200} className="w-full h-full object-cover" />
        {!isActive && (
          <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center backdrop-blur-md">
            <span className="text-zinc-500 font-medium">Mic permissions required</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        {!isActive ? (
          <button 
            onClick={startMic}
             className="w-full bg-zinc-100 text-zinc-900 hover:bg-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-cyan-500/10"
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
             <button onClick={stopMic} className="text-xs font-semibold text-zinc-500 hover:text-rose-400 transition-colors uppercase tracking-widest">Stop</button>
          </div>
        )}
      </div>
      
      <div className="mt-6 text-xs text-zinc-600 leading-relaxed">
        * Make loud noises near your microphone to trigger the backend vehicle, gunshot, or chainsaw detection protocols.
      </div>
    </div>
  );
};

export default LiveEdgeNode;
