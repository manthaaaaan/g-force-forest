import React, { useEffect, useState, useRef } from 'react';

interface EmergencySOSProps {
  onCancel: () => void;
}

const EmergencySOS: React.FC<EmergencySOSProps> = ({ onCancel }) => {
  const [pulse, setPulse] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [deployed, setDeployed] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (deployed) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Media access denied:", err));

      const timer = setInterval(() => setRecTime(t => t + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [deployed]);

  const stopRecording = () => {
    if (videoRef.current && videoRef.current.srcObject) {
       const stream = videoRef.current.srcObject as MediaStream;
       stream.getTracks().forEach(track => track.stop());
       videoRef.current.srcObject = null;
    }
    setDeployed(false);
    setRecTime(0);
  };

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
    }
  }, []);

  useEffect(() => {
    // Cinematic slow pulse
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    // Deep heavy cinematic drone audio
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, audioCtx.currentTime); // Low bass drone
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 2); // Fade in
      
      osc.start();
      
      return () => {
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        setTimeout(() => osc.stop(), 500);
      };
    } catch (e) {
      console.warn("Audio Context not supported for drone", e);
    }
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden transition-colors duration-1000"
      style={{
        background: pulse 
          ? 'radial-gradient(circle at center, #2a0000 0%, #050000 70%, #000000 100%)' 
          : 'radial-gradient(circle at center, #150000 0%, #000000 70%, #000000 100%)',
        fontFamily: '"SF Pro Display", "Inter", sans-serif'
      }}
    >
      {/* Glitch Overlay Scanner */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #ff0000 2px, #ff0000 4px)',
          backgroundSize: '100% 4px',
          animation: 'scanline 10s linear infinite',
          zIndex: 5
        }}
      />
      <style>{`
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        @keyframes rotate-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Header Container */}
      <div className="absolute top-10 left-10 text-left z-10">
        <h1 className="text-red-600 font-bold tracking-[0.3em] text-sm md:text-xl uppercase" style={{ textShadow: '0 0 20px rgba(255,0,0,0.5)' }}>
          ECHOGRID // COMMAND OVERRIDE
        </h1>
        <p className="font-mono text-red-500/60 text-xs mt-2 uppercase tracking-widest">
          Auth-Level: Ranger Prime · Connection: SECURE
        </p>
      </div>

      <div className="absolute top-10 right-10 text-right z-10 hidden md:block">
        {deployed ? (
          <div className="flex flex-col items-end">
            <div className="flex bg-black/60 px-4 py-2 items-center justify-center gap-3 border border-red-500/40 rounded shadow-[0_0_15px_rgba(255,0,0,0.3)]">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.8)]" />
              <span className="font-mono text-red-500 font-bold tracking-widest text-xl">REC</span>
              <span className="font-mono text-red-400 tracking-wider text-xl ml-2">
                 00:{String(Math.floor(recTime/60)).padStart(2, '0')}:{String(recTime%60).padStart(2, '0')}
              </span>
            </div>
          </div>
        ) : (
          <p className="font-mono text-red-600 text-lg tracking-widest animate-pulse">
            STATUS: CRITICAL
          </p>
        )}
        <p className="font-mono text-white/40 text-xs mt-2 uppercase">
          Sys-Time: {new Date().toISOString()}
        </p>
      </div>

      {/* Main Core UI */}
      <div className="relative z-20 flex flex-col items-center">
        {!deployed ? (
          <>
            {/* Pulsing Target Ring */}
            <div className="relative flex items-center justify-center w-[300px] h-[300px] md:w-[450px] md:h-[450px]">
              {/* Static outer ring */}
              <div className="absolute inset-0 rounded-full border border-red-900/30 border-dashed animate-[spin_30s_linear_infinite]" />
              
              {/* Pulsing inner glow */}
              <div 
                className="absolute inset-4 rounded-full bg-red-600/5 blur-3xl transition-opacity duration-700"
                style={{ opacity: pulse ? 0.8 : 0.2 }}
              />
              
              {/* Central Button */}
              <button 
                className="group relative flex flex-col items-center justify-center w-[180px] h-[180px] md:w-[240px] md:h-[240px] rounded-full border-2 border-red-500 bg-black overflow-hidden backdrop-blur-xl shadow-[0_0_80px_rgba(255,0,0,0.2)] hover:shadow-[0_0_120px_rgba(255,0,0,0.6)] transition-all duration-500 cursor-pointer hover:scale-105"
                onClick={() => setDeployed(true)}
              >
                {/* Inner fill hover effect */}
                <div className="absolute inset-0 bg-red-600 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-700 ease-in-out" />
                
                <div className="relative z-10 flex flex-col items-center mt-2">
                  <svg className="w-10 h-10 md:w-14 md:h-14 mb-2 text-red-500 group-hover:text-white transition-colors duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h2 className="text-red-500 group-hover:text-white font-bold text-2xl md:text-3xl tracking-widest transition-colors duration-500" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                    DEPLOY
                  </h2>
                  <p className="text-red-500/70 group-hover:text-white/90 font-mono text-[0.65rem] md:text-xs mt-1 tracking-[0.2em] transition-colors duration-500">
                    STRIKE TEAM
                  </p>
                </div>
              </button>
            </div>

            {/* Telemetry Block */}
            <div className="mt-12 flex flex-col items-center text-center max-w-lg px-6">
              <p className="font-mono text-red-400 text-sm md:text-base tracking-widest leading-relaxed mb-4">
                A CRITICAL ANOMALY HAS BEEN DETECTED IN SECTOR 4.<br/>
                AUTOMATED DISPATCH WILL ENGAGE IN:
              </p>
              <div className="font-mono text-6xl md:text-8xl font-light tracking-tighter text-white" style={{ textShadow: '0 0 30px rgba(255,255,255,0.4)' }}>
                00:{String(countdown).padStart(2, '0')}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center mt-8">
            <h2 className="text-white font-bold text-2xl md:text-3xl tracking-[0.2em] animate-pulse uppercase text-center mb-6" style={{ textShadow: '0 0 30px rgba(255,0,0,0.8)' }}>
              LIVE SECURE FEED ESTABLISHED
            </h2>
            
            <div className="relative border-4 border-red-500/50 rounded-xl overflow-hidden mb-8 shadow-[0_0_40px_rgba(255,0,0,0.4)] bg-black">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                className="w-[320px] h-[240px] md:w-[640px] md:h-[480px] object-cover scale-x-[-1]"
              />
              {/* Surveillance Overlay Reticle */}
              <div className="absolute inset-0 pointer-events-none border border-red-500/20" />
              <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 text-white font-mono text-xs font-bold tracking-widest rounded animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.8)]">
                LIVE // HQ LINK
              </div>
              <div className="absolute bottom-4 right-4 flex gap-1">
                <span className="w-2 h-4 bg-red-500/50" />
                <span className="w-2 h-4 bg-red-500/70" />
                <span className="w-2 h-4 bg-red-600" />
              </div>
            </div>

            <button 
              onClick={stopRecording}
              className="px-8 py-3 bg-red-600 hover:bg-white hover:text-red-600 text-white font-bold font-mono text-sm tracking-widest rounded-full transition-all duration-300 border border-red-400 shadow-[0_0_20px_rgba(255,0,0,0.5)] uppercase"
            >
              [ STOP RECORDING ]
            </button>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center z-20">
        <button 
          onClick={onCancel}
          className="font-mono text-xs md:text-sm tracking-widest text-white/50 hover:text-white px-8 py-3 rounded-full border border-white/10 hover:border-white/40 hover:bg-white/5 transition-all duration-300"
        >
          [ ABORT PROTOCOL ]
        </button>
      </div>

    </div>
  );
};

export default EmergencySOS;
