import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import MapDashboard from './components/MapDashboard';
import LoginPage from './components/LoginPage';
import WildlifePatterns from './components/WildlifePatterns';
import EmergencySOS from './components/EmergencySOS';
import GuardAlerts from './components/GuardAlerts';

import DetectPage from './components/DetectPage';

const socket = io('http://localhost:3001');

type Role = 'ranger' | 'civilian';
type View = 'hero' | 'login' | 'map' | 'wildlife' | 'sos' | 'guard_alerts' | 'detect';

function App() {
  const [view, setView] = useState<View>('login');
  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [logs, setLogs] = useState<{ timestamp: string; logic: string }[]>([]);

  useEffect(() => {
    socket.on('connect', () => console.log("✅ Connected to backend socket!"));
    socket.on('connect_error', (error) => console.error("Socket connect_error:", error));
    socket.on('disconnect', () => console.log("❌ Disconnected from backend socket."));
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
    if (view !== 'hero') return;
    const video = videoRef.current;
    if (!video) return;
    let frameId: number;
    const checkTime = () => {
      if (video.duration) {
        const time = video.currentTime;
        const duration = video.duration;
        if (time < 0.5) setVideoOpacity(time / 0.5);
        else if (duration - time < 0.5) setVideoOpacity((duration - time) / 0.5);
        else setVideoOpacity(1);
      }
      frameId = requestAnimationFrame(checkTime);
    };
    frameId = requestAnimationFrame(checkTime);
    return () => cancelAnimationFrame(frameId);
  }, [view]);

  const handleEnded = () => {
    const video = videoRef.current;
    if (!video) return;
    setVideoOpacity(0);
    setTimeout(() => {
      video.currentTime = 0;
      video.play().catch(e => console.error("Video play failed:", e));
    }, 100);
  };

  const handleLogin = (userRole: Role, name: string) => {
    setRole(userRole);
    setUsername(name);
    setView('hero');
  };

  const handleLogout = () => {
    setRole(null);
    setUsername('');
    setView('hero');
  };

  // ── Login page ──
  if (view === 'login') {
    return <LoginPage onLogin={handleLogin} onBack={() => setView('hero')} />;
  }

  // ── Map dashboard ──
  if (view === 'map') {
    return (
      <MapDashboard
        goHome={() => setView('hero')}
        role={role!}
        username={username}
        onLogout={handleLogout}
        onEmergency={() => setView('sos')}
      />
    );
  }

  // ── Wildlife Patterns page ──
  if (view === 'wildlife') {
    return <WildlifePatterns onBack={() => setView('hero')} />;
  }

  // ── Emergency SOS page ──
  if (view === 'sos') {
    return <EmergencySOS onCancel={() => role ? setView('map') : setView('hero')} />;
  }

  // ── Guard Alerts page ──
  if (view === 'guard_alerts') {
    return <GuardAlerts role={role} onBack={() => setView('hero')} />;
  }

  // ── Detect page ──
  if (view === 'detect') {
    return <DetectPage onBack={() => setView('hero')} />;
  }

  // ── Hero page ──
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">

      {/* Background Video */}
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
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <a href="/" className="text-3xl tracking-tight text-black font-instrument decoration-none">
          EchoGrid<sup className="text-sm">®</sup>
        </a>
        <div className="hidden md:flex gap-8 items-center">
          <button onClick={() => setView('hero')} className="text-sm cursor-pointer text-black transition-colors font-medium">Home</button>
          <button onClick={() => role ? setView('map') : setView('login')} className="text-sm cursor-pointer text-[#6F6F6F] hover:text-black transition-colors">Map</button>
          <button onClick={() => setView('guard_alerts')} className="text-sm cursor-pointer text-[#6F6F6F] hover:text-black transition-colors">Guard Alerts</button>
          <button onClick={() => setView('wildlife')} className="text-sm cursor-pointer text-[#6F6F6F] hover:text-black transition-colors">Wildlife Patterns</button>
          <button onClick={() => setView('detect')} className="text-sm cursor-pointer text-emerald-600 hover:text-emerald-500 font-bold tracking-wide transition-colors">Detect</button>
          <button onClick={() => setView('sos')} className="text-sm cursor-pointer text-red-500 hover:text-red-700 font-bold tracking-wide transition-colors">Emergency SOS</button>
        </div>

      </nav>

      {/* Hero Section */}
      <main
        className="relative z-10 flex flex-col items-center justify-center text-center px-6 pb-40"
        style={{ paddingTop: 'calc(8rem - 75px)' }}
      >
        <h1 className="text-5xl sm:text-7xl md:text-8xl max-w-7xl font-normal font-instrument leading-[0.95] tracking-[-2.46px] text-black animate-fade-rise opacity-0">
          Within the <span className="text-[#6F6F6F] italic">canopy,</span> we decode{' '}
          <span className="text-[#6F6F6F] italic">the danger.</span>
        </h1>

        <p className="text-base sm:text-lg max-w-2xl mt-8 leading-relaxed text-[#6F6F6F] animate-fade-rise-delay opacity-0">
          Building acoustic intelligence for rangers, conservationists, and vulnerable ecosystems.
          Through the ambient noise, we deploy edge AI to detect, pinpoint, and neutralize threats in real-time.

          Built by Team G-Force
        </p>
        {/* Features Intro */}
        <div className="mt-16 w-full max-w-7xl z-20 animate-fade-rise-delay-2 opacity-0 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-black/5 shadow-sm hover:-translate-y-1 transition-transform overflow-hidden relative">
              <h3 className="font-instrument text-2xl text-black mb-2 relative z-10 flex items-center gap-2">📍 Map</h3>
              <p className="text-sm text-[#6F6F6F] leading-relaxed relative z-10">Geospatial visualization of real-time acoustic nodes and threats across your sector.</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-black/5 shadow-sm hover:-translate-y-1 transition-transform overflow-hidden relative">
              <h3 className="font-instrument text-2xl text-black mb-2 relative z-10 flex items-center gap-2">📊 Wildlife Patterns</h3>
              <p className="text-sm text-[#6F6F6F] leading-relaxed relative z-10">Analyze species distribution, density, and intelligence dynamically mapped over time.</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-black/5 shadow-sm hover:-translate-y-1 transition-transform overflow-hidden relative">
              <h3 className="font-instrument text-2xl text-red-600 mb-2 relative z-10 flex items-center gap-2">🚨 Emergency SOS</h3>
              <p className="text-sm text-[#6F6F6F] leading-relaxed relative z-10">Rapidly broadcast automated distress signals with live geographical coordinates.</p>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-black/5 shadow-sm hover:-translate-y-1 transition-transform overflow-hidden relative">
              <h3 className="font-instrument text-2xl text-emerald-600 mb-2 relative z-10 flex items-center gap-2">🎯 Detection AI</h3>
              <p className="text-sm text-[#6F6F6F] leading-relaxed relative z-10">Detects wildlife, vehicles, and threats in uploaded videos utilizing state-of-the-art vision models.</p>
            </div>
          </div>

          {role === 'ranger' && (
            <div className="mt-6 flex justify-center">
              <div className="bg-red-50/90 backdrop-blur-md p-6 rounded-2xl border border-red-200 shadow-sm hover:-translate-y-1 transition-transform max-w-md text-left w-full relative overflow-hidden">
                <h3 className="font-instrument text-2xl text-red-700 mb-2 relative z-10 flex items-center gap-2">⚠️ Guard Alerts</h3>
                <p className="text-sm text-red-600/80 leading-relaxed relative z-10">Authorized clearance to broadcast sector-wide anomaly and evacuation protocols.</p>
              </div>
            </div>
          )}
        </div>
        {logs.length > 0 && (
          <div className="mt-12 text-left max-w-2xl w-full bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl z-20 animate-fade-rise ring-1 ring-black/5">
            <h3 className="font-instrument text-2xl mb-4 text-black tracking-tight">Live Threat Logs (Node 4)</h3>
            <ul className="text-sm text-[#6F6F6F] flex flex-col gap-3">
              {logs.map((log, i) => (
                <li key={i} className="flex gap-4 items-start pb-3 border-b border-black/5 last:border-0 last:pb-0">
                  <span className="font-mono text-black whitespace-nowrap bg-gray-100 px-2 py-1 rounded">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="leading-tight">{log.logic}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-24 z-20 font-instrument" style={{ animation: 'fadeRise 1s ease-out 0.8s forwards', opacity: 0 }}>
          <p className="text-[#6F6F6F] text-lg tracking-widest uppercase flex items-center gap-3">
            Built by <span className="font-bold text-black text-2xl bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-cyan-600 drop-shadow-sm">G-Force</span>
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;