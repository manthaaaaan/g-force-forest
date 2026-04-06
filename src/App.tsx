import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import LiveEdgeNode from './components/LiveEdgeNode';

const socket = io('http://localhost:3001');

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [logs, setLogs] = useState<{timestamp: string, logic: string}[]>([]);

  useEffect(() => {
    socket.on('connect', () => {
      console.log("✅ Connected to backend socket!");
    });

    socket.on('connect_error', (error) => {
      console.error("Socket connect_error:", error);
    });

    socket.on('disconnect', () => {
      console.log("❌ Disconnected from backend socket.");
    });

    socket.on('threat_update', (data: any) => {
      setLogs((prev) => [{ timestamp: data.timestamp, logic: data.logicApplied }, ...prev].slice(0, 5));
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('threat_update');
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let frameId: number;

    const checkTime = () => {
      if (video.duration) {
        const time = video.currentTime;
        const duration = video.duration;
        
        // Fade in over 0.5s
        if (time < 0.5) {
          setVideoOpacity(time / 0.5);
        }
        // Fade out over 0.5s before end
        else if (duration - time < 0.5) {
          setVideoOpacity((duration - time) / 0.5);
        } else {
          setVideoOpacity(1);
        }
      }
      frameId = requestAnimationFrame(checkTime);
    };

    frameId = requestAnimationFrame(checkTime);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  const handleEnded = () => {
    const video = videoRef.current;
    if (!video) return;

    setVideoOpacity(0);
    setTimeout(() => {
      video.currentTime = 0;
      video.play().catch(e => console.error("Video play failed:", e));
    }, 100);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      {/* Background Video Layer */}
      <div 
        className="absolute w-full h-full z-0 overflow-hidden" 
        style={{ top: '300px', right: 0, bottom: 0, left: 0 }}
      >
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
          autoPlay
          muted
          playsInline
          onEnded={handleEnded}
          style={{ opacity: videoOpacity, transition: 'opacity 0.1s linear' }}
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <a href="/" className="text-3xl tracking-tight text-black font-instrument decoration-none">
          EchoGrid<sup className="text-sm">®</sup>
        </a>

        <div className="hidden md:flex gap-8 items-center">
          <a href="/" className="text-sm text-black transition-colors">Home</a>
          <a href="#" className="text-sm text-[#6F6F6F] hover:text-black transition-colors">Map</a>
          <a href="#" className="text-sm text-[#6F6F6F] hover:text-black transition-colors">Technology</a>
          <a href="#" className="text-sm text-[#6F6F6F] hover:text-black transition-colors">Simulation</a>
          <a href="#" className="text-sm text-[#6F6F6F] hover:text-black transition-colors">Contact</a>
        </div>

        <button className="rounded-full px-6 py-2.5 text-sm bg-black text-white hover:scale-105 transition-transform duration-300">
          Access Dashboard
        </button>
      </nav>

      {/* Hero Section */}
      <main 
        className="relative z-10 flex flex-col items-center justify-center text-center px-6 pb-40"
        style={{ paddingTop: 'calc(8rem - 75px)' }}
      >
        <h1 className="text-5xl sm:text-7xl md:text-8xl max-w-7xl font-normal font-instrument leading-[0.95] tracking-[-2.46px] text-black animate-fade-rise opacity-0">
          Within the <span className="text-[#6F6F6F] italic">canopy,</span> we decode <span className="text-[#6F6F6F] italic">the danger.</span>
        </h1>
        
        <p className="text-base sm:text-lg max-w-2xl mt-8 leading-relaxed text-[#6F6F6F] animate-fade-rise-delay opacity-0">
          Building acoustic intelligence for rangers, conservationists, and vulnerable ecosystems. Through the ambient noise, we deploy edge AI to detect, pinpoint, and neutralize threats in real-time.
        </p>

        <div className="mt-12 z-20 animate-fade-rise-delay-2 opacity-0 w-full flex justify-center">
          <LiveEdgeNode />
        </div>

        {logs.length > 0 && (
          <div className="mt-12 text-left max-w-2xl w-full bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl z-20 animate-fade-rise ring-1 ring-black/5">
            <h3 className="font-instrument text-2xl mb-4 text-black tracking-tight">Live Threat Logs (Node 4)</h3>
            <ul className="text-sm text-[#6F6F6F] flex flex-col gap-3">
              {logs.map((log, i) => (
                <li key={i} className="flex gap-4 items-start pb-3 border-b border-black/5 last:border-0 last:pb-0">
                  <span className="font-mono text-black whitespace-nowrap bg-gray-100 px-2 py-1 rounded">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </span>
                  <span className="leading-tight">{log.logic}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
