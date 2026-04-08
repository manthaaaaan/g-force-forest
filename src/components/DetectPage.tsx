import React, { useState, useRef, useEffect, type ChangeEvent } from 'react';

interface DetectPageProps {
  onBack: () => void;
}

interface DetectionBox {
  label: string;
  score: number;
  box: [number, number, number, number];
}

interface SubbedFrame {
  id: string;
  timestamp: number;
  imageBlobUrl: string;
  detections: DetectionBox[];
  originalWidth: number;
  originalHeight: number;
}

const HF_BACKEND = 'https://manthaaaaan-wildlife-detection.hf.space';
type InputMode = 'file' | 'youtube';

const DetectPage: React.FC<DetectPageProps> = ({ onBack }) => {
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [progress, setProgress] = useState(0);
  const [intervalSec, setIntervalSec] = useState<number>(2);
  const [frames, setFrames] = useState<SubbedFrame[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setFrames([]);
      setErrorMsg('');
      setProgress(0);
    }
  };

  const handleYoutubeDownload = async () => {
    if (!youtubeUrl.trim()) return;
    setIsDownloading(true);
    setErrorMsg('');
    setFrames([]);
    setProgress(0);

    try {
      const res = await fetch(`${HF_BACKEND}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
        signal: AbortSignal.timeout(180000)
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const err = await res.json();
        throw new Error(err.error || 'Download failed');
      }

      if (!res.ok) throw new Error(`Download failed: ${res.status}`);

      const blob = await res.blob();
      setVideoUrl(URL.createObjectURL(blob));
      setVideoFile(null);
    } catch (err: any) {
      setErrorMsg(`YouTube download failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const wakeUpBackend = async (): Promise<boolean> => {
    setIsWakingUp(true);
    try {
      const res = await fetch(`${HF_BACKEND}/docs`, {
        method: 'GET',
        signal: AbortSignal.timeout(60000)
      });
      setIsWakingUp(false);
      return res.ok;
    } catch {
      setIsWakingUp(false);
      return false;
    }
  };

  const extractFrame = (video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No context');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject('Failed to create blob');
      }, 'image/jpeg', 0.9);
    });
  };

  const uploadFrame = async (blob: Blob): Promise<{ detections: DetectionBox[], image_size: [number, number] }> => {
    const formData = new FormData();
    formData.append('file', blob, 'frame.jpg');
    const res = await fetch(`${HF_BACKEND}/detect`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000) // OWL-ViT needs more time per frame
    });
    if (!res.ok) throw new Error(`Detection failed: ${res.status}`);
    return await res.json();
  };

  const startDetection = async () => {
    if (!videoUrl || !hiddenVideoRef.current || !hiddenCanvasRef.current) return;
    setIsProcessing(true);
    setErrorMsg('');
    setFrames([]);
    setProgress(0);

    const isAlive = await wakeUpBackend();
    if (!isAlive) {
      setErrorMsg('Could not reach detection server. Please try again.');
      setIsProcessing(false);
      return;
    }

    const video = hiddenVideoRef.current;
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) resolve();
      else video.onloadedmetadata = () => resolve();
    });

    const canvas = hiddenCanvasRef.current;
    const duration = video.duration;
    if (!duration || !isFinite(duration)) {
      setErrorMsg('Invalid video duration');
      setIsProcessing(false);
      return;
    }

    const totalSteps = Math.floor(duration / intervalSec) + 1;
    const processedFrames: SubbedFrame[] = [];

    for (let i = 0; i < totalSteps; i++) {
      const timeTarget = i * intervalSec;
      if (timeTarget > duration) break;

      video.currentTime = timeTarget;
      await new Promise<void>((resolve) => {
        const handleSeeked = () => {
          video.removeEventListener('seeked', handleSeeked);
          resolve();
        };
        video.addEventListener('seeked', handleSeeked);
      });

      try {
        const blob = await extractFrame(video, canvas);
        const blobUrl = URL.createObjectURL(blob);
        const { detections, image_size } = await uploadFrame(blob);

        processedFrames.push({
          id: `${Date.now()}-${i}`,
          timestamp: timeTarget,
          imageBlobUrl: blobUrl,
          detections,
          originalWidth: image_size[0],
          originalHeight: image_size[1]
        });

        setFrames([...processedFrames]);
        setProgress(Math.round(((i + 1) / totalSteps) * 100));
      } catch (err: any) {
        console.error('Frame failed:', err);
        setErrorMsg(`Failed at ${timeTarget.toFixed(1)}s: ${err.message}`);
      }
    }

    setIsProcessing(false);
    setProgress(100);
  };

  const getButtonLabel = () => {
    if (isWakingUp) return 'Waking up server...';
    if (isProcessing) return 'Processing...';
    return 'Run Detection';
  };

  const isBusy = isProcessing || isWakingUp || isDownloading;

  return (
    <div className="min-h-screen bg-[#020202] text-white font-inter flex flex-col overflow-y-auto relative">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-emerald-900/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-teal-900/10 blur-[130px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }}></div>
      </div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full flex-shrink-0 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <button onClick={onBack} className="text-sm cursor-pointer text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
          ← Back
        </button>
        <h1 className="text-xl tracking-tight font-instrument flex items-center gap-3">
          <span className="text-emerald-500">EchoGrid</span> Wildlife Detection
        </h1>
        <div className="w-16"></div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-start">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-instrument">1. Input Footage</h2>

            {/* Tab Switcher */}
            <div className="flex rounded-xl overflow-hidden border border-zinc-800 w-full">
              <button
                onClick={() => { setInputMode('file'); setVideoUrl(null); setFrames([]); setErrorMsg(''); }}
                className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-widest transition-all ${inputMode === 'file' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                disabled={isBusy}
              >
                📁 Upload File
              </button>
              <button
                onClick={() => { setInputMode('youtube'); setVideoUrl(null); setFrames([]); setErrorMsg(''); }}
                className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-widest transition-all ${inputMode === 'youtube' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                disabled={isBusy}
              >
                ▶ YouTube Link
              </button>
            </div>

            {/* File Upload */}
            {inputMode === 'file' && (
              <label className="border-2 border-dashed border-zinc-800 hover:border-emerald-500 hover:bg-emerald-950/20 transition-all rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer min-h-[220px]">
                <input type="file" className="hidden" accept="video/mp4,video/webm" onChange={handleFileChange} />
                {videoFile ? (
                  <div className="text-center">
                    <span className="text-emerald-400 text-4xl mb-3 block">✓</span>
                    <span className="text-zinc-200 font-medium">{videoFile.name}</span>
                    <span className="text-zinc-500 text-sm block mt-1">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                    <span className="text-emerald-500 text-xs tracking-widest mt-4 uppercase block underline decoration-emerald-800">Change File</span>
                  </div>
                ) : (
                  <div className="text-center opacity-70 flex flex-col items-center gap-2">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 mb-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4" />
                      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
                    </svg>
                    <span className="text-zinc-400">Click or drag MP4/WebM video here</span>
                  </div>
                )}
              </label>
            )}

            {/* YouTube Input */}
            {inputMode === 'youtube' && (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  disabled={isDownloading}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <p className="text-zinc-500 text-xs px-1">Short clips work best — under 2 minutes recommended.</p>
                <button
                  onClick={handleYoutubeDownload}
                  disabled={isDownloading || !youtubeUrl.trim()}
                  className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all ${isDownloading || !youtubeUrl.trim() ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                >
                  {isDownloading ? '⏳ Downloading...' : '⬇ Load Video'}
                </button>
                {isDownloading && (
                  <p className="text-yellow-400 text-xs font-mono text-center animate-pulse">Downloading from YouTube — 30-60s...</p>
                )}
                {videoUrl && !isDownloading && (
                  <p className="text-emerald-400 text-xs font-mono text-center">✓ Video loaded — ready to detect!</p>
                )}
              </div>
            )}

            {/* Controls */}
            {videoUrl && (
              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-zinc-300 font-medium uppercase tracking-widest block">Extraction Interval</label>
                    <span className="text-emerald-400 font-mono bg-emerald-950 px-2 py-1 rounded text-xs">{intervalSec}s</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={intervalSec} onChange={e => setIntervalSec(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                    disabled={isBusy}
                  />
                  <p className="text-zinc-600 text-xs mt-1">OWL-ViT scans 100+ species — each frame takes ~5s on free hardware</p>
                </div>

                <button
                  onClick={startDetection}
                  disabled={isBusy}
                  className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all shadow-xl ${isBusy ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                >
                  {getButtonLabel()}
                </button>

                {isWakingUp && (
                  <p className="text-yellow-400 text-xs font-mono text-center animate-pulse">⏳ Waking up server — ~30s on first use...</p>
                )}
                {isProcessing && !isWakingUp && (
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                  </div>
                )}
                {errorMsg && <p className="text-red-500 text-sm font-mono">{errorMsg}</p>}
              </div>
            )}
          </div>

          {/* Video Preview */}
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-instrument">2. Video Preview</h2>
            {videoUrl ? (
              <div className="rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-black">
                <video src={videoUrl} controls className="w-full h-full object-contain max-h-[450px]" />
              </div>
            ) : (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 min-h-[300px] flex items-center justify-center text-zinc-700">
                Awaiting Video Input...
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {frames.length > 0 && (
          <div className="border-t border-white/10 pt-10 mt-6 flex flex-col gap-6">
            <div className="flex justify-between items-center bg-black/80 sticky top-0 py-4 z-20 backdrop-blur-md border-b border-white/5">
              <h2 className="text-3xl font-instrument">
                Analysis Results <span className="text-emerald-500 text-xl">({frames.length} frames)</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {frames.map(f => <FrameResult key={f.id} frame={f} />)}
            </div>
          </div>
        )}
      </main>

      {videoUrl && (
        <video ref={hiddenVideoRef} src={videoUrl} className="hidden" crossOrigin="anonymous" preload="auto" muted playsInline />
      )}
      <canvas ref={hiddenCanvasRef} className="hidden" />
    </div>
  );
};

const FrameResult = ({ frame }: { frame: SubbedFrame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sortedDetections = [...frame.detections].sort((a, b) => b.score - a.score);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = frame.imageBlobUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      frame.detections.forEach((d, i) => {
        const [x1, y1, x2, y2] = d.box;

        // Color cycle for different animals
        const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7', '#06b6d4'];
        const color = colors[i % colors.length];

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(3, canvas.width / 200);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        const text = `${d.label.toUpperCase()} ${(d.score * 100).toFixed(0)}%`;
        ctx.font = `bold ${Math.max(14, canvas.width / 50)}px monospace`;
        const textWidth = ctx.measureText(text).width;
        const textHeight = Math.max(20, canvas.width / 35);

        ctx.fillStyle = color;
        ctx.fillRect(x1, y1 - textHeight, textWidth + 10, textHeight);

        ctx.fillStyle = '#000000';
        ctx.fillText(text, x1 + 5, y1 - 5);
      });
    };
  }, [frame]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-lg p-4 flex flex-col gap-4 hover:border-emerald-950 transition-colors">
      <div className="flex justify-between items-center px-1">
        <span className="font-mono text-emerald-500 font-bold tracking-widest text-sm">T+{frame.timestamp.toFixed(1)}s</span>
        <span className="text-xs text-zinc-500">{sortedDetections.length} detections</span>
      </div>
      <div className="w-full relative aspect-video bg-black rounded-xl overflow-hidden border border-black/50">
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
      </div>
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {sortedDetections.map((d, idx) => (
          <span key={idx} className="px-2.5 py-1 rounded-full text-xs font-mono border bg-emerald-950 border-emerald-800 text-emerald-400">
            {d.label} {Math.round(d.score * 100)}%
          </span>
        ))}
        {sortedDetections.length === 0 && (
          <span className="text-zinc-600 text-xs italic px-1">No animals detected in frame</span>
        )}
      </div>
    </div>
  );
};

export default DetectPage;