import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import LiveEdgeNode from './LiveEdgeNode';

const API_BASE = 'https://manthaaaaan-wildlife-detection.hf.space';

const socket = io(API_BASE);

interface SensorNode {
  id: number;
  lat: number;
  lng: number;
  status: 'safe' | 'warning' | 'critical';
  lastDetectedAt?: number;
  lastSoundType?: string;
}


interface MapDashboardProps {
  goHome: () => void;
  role: 'ranger' | 'civilian';
  username: string;
  onLogout: () => void;
  onEmergency: () => void;
}

const TILE_PROVIDERS = {
  tactical: {
    name: 'Tactical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    theme: {
      safe: { ring: '#00ff9d', glow: '#00ff9d', bg: '#0d1f1a', border: '#00ff9d', text: '#00ff9d', subtext: '#4dffbe', label: '#e0fff2' },
      warning: { ring: '#f59e0b', glow: '#f59e0b', bg: '#1f1500', border: '#f59e0b', text: '#f59e0b', subtext: '#fcd34d', label: '#fff7e0' },
      critical: { ring: '#ff2d2d', glow: '#ff0000', bg: '#1f0000', border: '#ff2d2d', text: '#ff2d2d', subtext: '#ff8080', label: '#ffe0e0' },
      tooltip: { bg: 'rgba(5,15,10,0.97)', border: '#1a3d2b', headerText: '#4dffbe', bodyText: '#b0ffd4', timeText: '#4d8870', font: '"Share Tech Mono", monospace' }
    }
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    theme: {
      safe: { ring: '#38bdf8', glow: '#38bdf8', bg: '#001a2e', border: '#38bdf8', text: '#38bdf8', subtext: '#7dd3fc', label: '#e0f4ff' },
      warning: { ring: '#fb923c', glow: '#fb923c', bg: '#1f0e00', border: '#fb923c', text: '#fb923c', subtext: '#fdba74', label: '#fff3e0' },
      critical: { ring: '#f43f5e', glow: '#ff0040', bg: '#200010', border: '#f43f5e', text: '#f43f5e', subtext: '#fb7185', label: '#ffe4ec' },
      tooltip: { bg: 'rgba(0,10,20,0.95)', border: '#1e3a5f', headerText: '#7dd3fc', bodyText: '#bae6fd', timeText: '#4a7a9b', font: '"Courier New", monospace' }
    }
  },
  forest: {
    name: 'Forest Terrain',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    theme: {
      safe: { ring: '#65a30d', glow: '#84cc16', bg: '#0f1a00', border: '#65a30d', text: '#84cc16', subtext: '#a3e635', label: '#f0ffe0' },
      warning: { ring: '#ca8a04', glow: '#eab308', bg: '#1a1200', border: '#ca8a04', text: '#eab308', subtext: '#fde047', label: '#fffbe0' },
      critical: { ring: '#b91c1c', glow: '#ef4444', bg: '#1a0000', border: '#b91c1c', text: '#ef4444', subtext: '#f87171', label: '#ffe4e4' },
      tooltip: { bg: 'rgba(10,18,5,0.96)', border: '#2d4a1e', headerText: '#a3e635', bodyText: '#d9f99d', timeText: '#5a7a3a', font: '"Lucida Console", monospace' }
    }
  }
};

type ThemeKey = keyof typeof TILE_PROVIDERS;

const MapManager = ({ escalateNode }: { escalateNode: SensorNode | null }) => {
  const map = useMap();
  useEffect(() => {
    if (escalateNode && escalateNode.status === 'critical') {
      map.flyTo([escalateNode.lat, escalateNode.lng], 16, { animate: true, duration: 1.5 });
    }
  }, [escalateNode, map]);
  return null;
};

const useNow = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
};

const createRadioTowerIcon = (status: SensorNode['status'], theme: typeof TILE_PROVIDERS[ThemeKey]['theme']) => {
  const t = theme[status];
  const pulseRing = status === 'critical'
    ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:${t.ring};animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;opacity:0.55;"></div>
       <div style="position:absolute;inset:-4px;border-radius:50%;background:${t.ring};animation:ping 1.3s cubic-bezier(0,0,0.2,1) infinite;opacity:0.35;"></div>`
    : status === 'warning'
      ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${t.ring};animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.4;"></div>`
      : `<div style="position:absolute;inset:-4px;border-radius:50%;background:${t.ring};animation:ping 2.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.2;"></div>`;

  const html = `
    <style>@keyframes ping { 75%,100%{transform:scale(2);opacity:0} }</style>
    <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);">
      ${pulseRing}
      <div style="position:relative;z-index:10;width:28px;height:28px;background:${t.bg};border:2px solid ${t.border};border-radius:6px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${t.glow}88, inset 0 0 6px ${t.glow}22;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="${t.text}">
          <path d="M12 2a1 1 0 0 1 1 1v1.07A8 8 0 0 1 20 12a1 1 0 0 1-2 0 6 6 0 0 0-5-5.92V7a1 1 0 0 1-2 0V6.08A6 6 0 0 0 6 12a1 1 0 0 1-2 0 8 8 0 0 1 7-7.93V3a1 1 0 0 1 1-1zm0 8a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2zm0 6a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0v-4a1 1 0 0 1 1-1z"/>
        </svg>
      </div>
      <div style="position:absolute;top:-6px;right:-8px;z-index:20;background:${t.border};color:${t.bg === '#0d1f1a' ? '#000' : '#fff'};font-size:9px;font-weight:700;font-family:monospace;padding:1px 4px;border-radius:3px;letter-spacing:0.5px;">01</div>
    </div>`;

  return L.divIcon({ html, className: 'custom-leaflet-marker bg-transparent border-none', iconSize: [0, 0], iconAnchor: [0, 0] });
};

const createRadarIcon = (status: SensorNode['status'], nodeId: number, theme: typeof TILE_PROVIDERS[ThemeKey]['theme']) => {
  const t = theme[status];
  const pulseRing = status === 'critical'
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${t.ring};animation:ping 0.9s cubic-bezier(0,0,0.2,1) infinite;opacity:0.6;"></div>`
    : status === 'warning'
      ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${t.ring};animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;opacity:0.4;"></div>`
      : '';

  const html = `
    <style>@keyframes ping { 75%,100%{transform:scale(2.2);opacity:0} }</style>
    <div style="position:relative;width:14px;height:14px;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);">
      ${pulseRing}
      <div style="position:relative;z-index:10;width:12px;height:12px;background:${t.bg};border:1.5px solid ${t.border};border-radius:50%;box-shadow:0 0 8px ${t.glow}99;"></div>
      <div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);color:${t.subtext};font-size:8px;font-family:monospace;white-space:nowrap;pointer-events:none;text-shadow:0 1px 3px #000;">${String(nodeId).padStart(2, '0')}</div>
    </div>`;

  return L.divIcon({ html, className: 'custom-leaflet-marker bg-transparent border-none', iconSize: [0, 0], iconAnchor: [0, 0] });
};

const buildTooltipClass = (_theme: typeof TILE_PROVIDERS[ThemeKey]['theme'], status: SensorNode['status']) => {
  return `echogrid-tooltip echogrid-${status}`;
};

const injectTooltipStyles = (_themes: typeof TILE_PROVIDERS) => {
  const id = 'echogrid-tooltip-styles';
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = `
    .echogrid-tooltip {
      background: var(--tt-bg) !important;
      border: 1px solid var(--tt-border) !important;
      border-radius: 6px !important;
      padding: 10px 14px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.7), 0 0 0 1px var(--tt-border) !important;
      font-family: var(--tt-font) !important;
      pointer-events: none !important;
    }
    .echogrid-tooltip::before { display:none !important; }
    .leaflet-tooltip-top.echogrid-tooltip::before { display:none !important; }
  `;
  document.head.appendChild(el);
};

const injectSimButtonStyles = () => {
  const id = 'echogrid-sim-btn-styles';
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = `
    .sim-btn {
      width: 100%;
      text-align: left;
      padding: 12px 16px;
      font-family: monospace;
      font-size: 0.9rem;
      color: #000;
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s, border-color 0.2s;
      display: block;
    }
    .sim-btn:hover {
      background: #000 !important;
      color: #fff !important;
      border-color: #000 !important;
    }
    .sim-btn:active {
      background: #222 !important;
      color: #fff !important;
    }
    .back-btn:hover {
      background: rgba(0,0,0,0.05) !important;
    }
    .signout-btn:hover {
      background: #000 !important;
      color: #fff !important;
    }
    .theme-btn:hover {
      background: rgba(0,0,0,0.08) !important;
      color: #000 !important;
    }
  `;
  document.head.appendChild(el);
};

const MapGeolocationTracker = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, 18); }, [center, map]);
  return null;
};

const MapDashboard: React.FC<MapDashboardProps> = ({ goHome, role, username, onLogout, onEmergency }) => {
  const [mapTheme, setMapTheme] = useState<ThemeKey>('forest');
  const [center, setCenter] = useState<[number, number]>([47.6062, -122.3321]);
  const [nodes, setNodes] = useState<SensorNode[]>([]);
  const [globalAlert, setGlobalAlert] = useState<{ type: string; issuer: string; lat?: number; lng?: number } | null>(null);
  
  const escalateNode = React.useMemo(() => {
    const criticalNodes = [...nodes].filter(n => n.status === 'critical');
    if (criticalNodes.length === 0) return null;
    return criticalNodes.sort((a, b) => (b.lastDetectedAt || 0) - (a.lastDetectedAt || 0))[0];
  }, [nodes]);

  const now = useNow();

  const currentTheme = TILE_PROVIDERS[mapTheme].theme;
  const isRanger = role === 'ranger';

  useEffect(() => {
    injectTooltipStyles(TILE_PROVIDERS);
    injectSimButtonStyles();
  }, []);

  useEffect(() => {
    const tt = currentTheme.tooltip;
    document.documentElement.style.setProperty('--tt-bg', tt.bg);
    document.documentElement.style.setProperty('--tt-border', tt.border);
    document.documentElement.style.setProperty('--tt-font', tt.font);
  }, [mapTheme]);

  const handleManualSimulate = (soundType: string) => {
    if (soundType === 'chainsaw' || soundType === 'gunshot') {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'square';
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const nowTime = audioCtx.currentTime;
        osc.frequency.setValueAtTime(600, nowTime);
        for(let i=0; i<3; i++){
            osc.frequency.linearRampToValueAtTime(1000, nowTime + i + 0.5);
            osc.frequency.linearRampToValueAtTime(600, nowTime + i + 1.0);
        }
        
        gainNode.gain.setValueAtTime(0.05, nowTime);
        gainNode.gain.linearRampToValueAtTime(0, nowTime + 3.0);

        osc.start(nowTime);
        osc.stop(nowTime + 3.0);
      } catch (e) {
        console.warn("Web Audio API not supported", e);
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        for (let i = 0; i < 3; i++) {
          const msg = new SpeechSynthesisUtterance(`Potential ${soundType}`);
          msg.rate = 1.1;
          window.speechSynthesis.speak(msg);
        }
      }
    }

    fetch(`${API_BASE}/api/simulate-sound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId: 1, soundType, confidenceScore: 99 })
    }).catch(err => console.error(err));
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCenter([lat, lng]);
          const generatedNodes: SensorNode[] = [];
          for (let i = 1; i <= 10; i++) {
            generatedNodes.push({
              id: i,
              lat: i === 1 ? lat : lat + (Math.random() - 0.5) * 0.05,
              lng: i === 1 ? lng : lng + (Math.random() - 0.5) * 0.05,
              status: 'safe'
            });
          }
          setNodes(generatedNodes);
        },
        () => console.warn("Geolocation denied. Using default center.")
      );
    }

    socket.on('initial_state', () => { });
    socket.on('threat_update', (data: any) => {
      setNodes((prevNodes) =>
        prevNodes.map(node => {
          if (node.id === data.node.id) {
            const updatedNode = {
              ...node,
              status: data.node.status,
              lastDetectedAt: data.node.lastDetectedAt,
              lastSoundType: data.node.lastSoundType
            } as SensorNode;
            return updatedNode;
          }
          return node;
        })
      );
    });

    fetch(`${API_BASE}/api/guard-alert`)
      .then(res => res.json())
      .then(data => {
        if (data.alert) {
          setGlobalAlert({ type: data.alert.type, issuer: data.alert.issuer, lat: data.alert.lat, lng: data.alert.lng });
        }
      })
      .catch(err => console.error(err));

    socket.on('guard_alert', (data: { type: string; issuer: string; lat: number; lng: number }) => {
      setGlobalAlert({ type: data.type, issuer: data.issuer, lat: data.lat, lng: data.lng });
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(`Emergency Broadcast: ${data.type} Alert issued by ${data.issuer}`);
        msg.rate = 1.05;
        window.speechSynthesis.speak(msg);
      }
    });

    socket.on('guard_alert_clear', () => {
      setGlobalAlert(null);
    });

    return () => {
      socket.off('initial_state');
      socket.off('threat_update');
      socket.off('guard_alert');
      socket.off('guard_alert_clear');
    };
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: '"Inter", sans-serif' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div
        className="w-[30%] min-w-[350px] flex flex-col relative z-20 overflow-y-auto"
        style={{
          background: 'linear-gradient(160deg, #ffffff 0%, #aaaaaaff 40%, #afafafff 100%)',
          borderRight: '1px solid #e5e5e5'
        }}
      >

        {/* ── Header ── */}
        <div className="p-6 pb-3">
          <h1
            className="mb-1"
            style={{ fontFamily: '"Instrument Serif", serif', fontSize: '2.5rem', fontWeight: 400, color: '#000', letterSpacing: '-1px', lineHeight: 1 }}
          >
            Command Center
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#6F6F6F' }}>EchoGrid® Tactical Oversight</p>

          {/* User badge */}
          <div
            className="mt-4 flex items-center justify-between px-4 py-3 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
              border: '1px solid #e5e5e5'
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: isRanger ? '#000' : '#e5e5e5', color: isRanger ? '#fff' : '#6F6F6F' }}
              >
                {username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#000', lineHeight: 1 }}>{username}</p>
                <p style={{ fontSize: '0.65rem', color: isRanger ? '#000' : '#6F6F6F', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '3px' }}>
                  {isRanger ? '🌲 Ranger' : '👤 Civilian'}
                </p>
              </div>
            </div>
            <button
              className="signout-btn"
              onClick={onLogout}
              style={{
                fontSize: '0.75rem', color: '#6F6F6F', background: '#fff',
                border: '1px solid #e5e5e5', borderRadius: '999px',
                padding: '6px 14px', cursor: 'pointer', fontFamily: '"Inter", sans-serif',
                transition: 'all 0.2s'
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Live Edge Node */}
        <div className="px-6 pt-2 pb-2">
          <LiveEdgeNode onTrigger={handleManualSimulate} />
        </div>

        {/* ── RANGER ONLY: Live Coordinate Panel ── */}
        {isRanger && (
          <div className="px-6 pb-4">
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'linear-gradient(145deg, #ffffff 0%, #ebebeb 100%)',
                border: '1px solid #e0e0e0'
              }}
            >
              <h4 className="flex items-center gap-2 mb-3" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#000', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#000', display: 'inline-block' }}></span>
                Ranger Intel · Live Coordinates
              </h4>

              <div className="mb-3 pb-3" style={{ borderBottom: '1px solid #e5e5e5' }}>
                <p style={{ fontSize: '0.75rem', color: '#6F6F6F', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Your Position</p>
                <p style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: '#000' }}>
                  {center[0].toFixed(6)}, {center[1].toFixed(6)}
                </p>
              </div>

              {escalateNode ? (
                <div className="mb-3 pb-3" style={{ borderBottom: '1px solid #e5e5e5' }}>
                  <p style={{ fontSize: '0.75rem', color: '#6F6F6F', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    ⚠ Triggered Node {String(escalateNode.id).padStart(2, '0')}
                  </p>
                  <p style={{ fontSize: '0.9rem', fontFamily: 'monospace', color: '#b91c1c', marginBottom: '4px' }}>
                    {escalateNode.lat.toFixed(6)}, {escalateNode.lng.toFixed(6)}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6F6F6F' }}>
                    {escalateNode.lastSoundType?.toUpperCase()} ·{' '}
                    {escalateNode.lastDetectedAt ? `${Math.floor((now - escalateNode.lastDetectedAt) / 1000)}s ago` : '—'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6F6F6F', fontFamily: 'monospace', marginTop: '4px' }}>
                    Δ {(Math.sqrt(
                      Math.pow((escalateNode.lat - center[0]) * 111320, 2) +
                      Math.pow((escalateNode.lng - center[1]) * 111320 * Math.cos(center[0] * Math.PI / 180), 2)
                    )).toFixed(0)}m from your position
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#6F6F6F', fontStyle: 'italic', marginBottom: '12px' }}>No active threat coordinates</p>
              )}

              <button 
                onClick={onEmergency}
                className="w-full mt-2 mb-5 py-3 rounded-xl border border-red-500/40 bg-red-600/10 text-red-700 font-bold uppercase tracking-[0.15em] text-xs hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] transition-all duration-300 cursor-pointer"
                style={{ fontFamily: '"Inter", sans-serif', textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              >
                [ INITIATE EMERGENCY PROTOCOL ]
              </button>

              <div>
                <p style={{ fontSize: '0.75rem', color: '#6F6F6F', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>All Node Positions</p>
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                  {nodes.map(node => (
                    <div key={node.id} className="flex items-center justify-between">
                      <span style={{
                        fontSize: '0.8rem', fontFamily: 'monospace',
                        color: node.status === 'critical' ? '#b91c1c' : node.status === 'warning' ? '#ca8a04' : '#6F6F6F'
                      }}>
                        N{String(node.id).padStart(2, '0')}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#6F6F6F' }}>
                        {node.lat.toFixed(4)}, {node.lng.toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ALL ROLES: Manual Sensor Override ── */}
        <div className="px-6 pb-4">
          <div className="rounded-2xl p-4" style={{ background: '#f5f5f5', border: '1px solid #e5e5e5' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#000', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              Manual Sensor Override (Node 1)
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#6F6F6F', fontStyle: 'italic', marginBottom: '12px', lineHeight: 1.4 }}>
              {isRanger
                ? 'Triggering will broadcast coordinates to your Ranger Intel panel'
                : 'Trigger an acoustic alert · Rangers will receive coordinates'}
            </p>
            <div className="flex flex-col gap-2">
              {(['vehicle', 'chainsaw', 'gunshot'] as const).map(type => (
                <button
                  key={type}
                  className="sim-btn"
                  onClick={() => handleManualSimulate(type)}
                >
                  [ Simulate {type.charAt(0).toUpperCase() + type.slice(1)} ]
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── RIGHT MAP ── */}
      <div className="flex-1 relative flex flex-col">
        {globalAlert && (
          <div className="relative w-full z-[1000] flex-shrink-0 bg-red-600/90 backdrop-blur-md animate-pulse border-b border-red-500 shadow-[0_4px_30px_rgba(220,38,38,0.5)]">
            <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-lg">⚠️</div>
                <div>
                  <h3 className="text-white font-bold uppercase tracking-widest text-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    Environmental Alert: {globalAlert.type}
                  </h3>
                  <p className="text-white/90 text-[10px] uppercase tracking-widest font-mono mt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    Issued by {globalAlert.issuer} • Evacuation Protocol Initiated
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 relative w-full h-full">
          <button
            className="back-btn absolute top-4 left-4 z-[400] flex items-center gap-2"
            onClick={goHome}
            style={{
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
              border: '1px solid #e5e5e5', borderRadius: '999px',
              padding: '8px 18px', fontSize: '0.8rem', fontWeight: 600,
              color: '#000', cursor: 'pointer', fontFamily: '"Inter", sans-serif',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)', transition: 'background 0.2s'
            }}
          >
            ← Back to Home
          </button>

          {/* Theme switcher */}
          <div
            className="absolute top-4 right-4 z-[400] flex p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', border: '1px solid #e5e5e5', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          >
            {Object.entries(TILE_PROVIDERS).map(([key, provider]) => (
              <button
                key={key}
                className={mapTheme !== key ? 'theme-btn' : ''}
                onClick={() => setMapTheme(key as ThemeKey)}
                style={{
                  padding: '6px 14px', fontSize: '0.72rem', fontWeight: 600,
                  borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontFamily: '"Inter", sans-serif', transition: 'all 0.2s',
                  background: mapTheme === key ? '#000' : 'transparent',
                  color: mapTheme === key ? '#fff' : '#6F6F6F',
                }}
              >
                {provider.name}
              </button>
            ))}
          </div>

          {nodes.length > 0 ? (
            <MapContainer
              center={center}
              zoom={18}
              className="h-full w-full z-10"
              zoomControl={false}
            >
              <TileLayer
                key={mapTheme}
                url={TILE_PROVIDERS[mapTheme].url}
                attribution='&copy; OpenStreetMap & Carto'
              />
              <MapManager escalateNode={escalateNode} />
              <MapGeolocationTracker center={center} />

              {nodes.map(node => (
                <Marker
                  key={`${node.id}-${mapTheme}-${node.status}`}
                  position={[node.lat, node.lng]}
                  icon={
                    node.id === 1
                      ? createRadioTowerIcon(node.status, currentTheme)
                      : createRadarIcon(node.status, node.id, currentTheme)
                  }
                >
                  <Tooltip
                    permanent={node.status !== 'safe'}
                    direction="top"
                    offset={[0, node.id === 1 ? -28 : -18]}
                    className={buildTooltipClass(currentTheme, node.status)}
                    opacity={1}
                  >
                    {node.status !== 'safe' && node.lastDetectedAt && node.lastSoundType ? (
                      <div style={{ fontFamily: currentTheme.tooltip.font, minWidth: 180 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ color: currentTheme.tooltip.headerText, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            NODE {String(node.id).padStart(2, '0')}
                          </span>
                          <span style={{
                            color: node.status === 'critical' ? currentTheme[node.status].text : currentTheme[node.status].subtext,
                            fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                            background: `${currentTheme[node.status].ring}22`,
                            border: `1px solid ${currentTheme[node.status].ring}55`,
                            borderRadius: 3, padding: '2px 6px'
                          }}>
                            {node.status}
                          </span>
                        </div>
                        <div style={{ color: currentTheme.tooltip.bodyText, fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                          ⚠ {node.lastSoundType?.toUpperCase()}
                        </div>
                        {isRanger && (
                          <div style={{ color: currentTheme.tooltip.headerText, fontSize: 11, fontFamily: 'monospace', marginBottom: 4, opacity: 0.8 }}>
                            📍 {node.lat.toFixed(5)}, {node.lng.toFixed(5)}
                          </div>
                        )}
                        <div style={{ color: currentTheme.tooltip.timeText, fontSize: 14 }}>
                          {Math.floor((now - node.lastDetectedAt) / 1000)}s ago
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontFamily: currentTheme.tooltip.font, color: currentTheme.tooltip.headerText, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        NODE {String(node.id).padStart(2, '0')} · NOMINAL
                      </div>
                    )}
                  </Tooltip>
                </Marker>
              ))}

              {globalAlert && globalAlert.lat !== undefined && globalAlert.lng !== undefined && (
                <Marker
                  position={[globalAlert.lat, globalAlert.lng]}
                  icon={L.divIcon({
                    html: `
                      <style>@keyframes gping { 75%,100%{transform:scale(3);opacity:0} }</style>
                      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);">
                        <div style="position:absolute;inset:-10px;border-radius:50%;background:#ef4444;animation:gping 1.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.6;"></div>
                        <div style="font-size:32px; z-index:10; filter: drop-shadow(0 0 10px rgba(239,68,68,0.8));">${
                          globalAlert.type.includes('Fire') ? '🔥' :
                          globalAlert.type.includes('Thunder') ? '⚡' :
                          globalAlert.type.includes('Rain') ? '🌧️' :
                          globalAlert.type.includes('Tree') || globalAlert.type.includes('Clog') ? '🪵' : '🆘'
                        }</div>
                      </div>
                    `,
                    className: 'bg-transparent border-none',
                    iconSize: [0, 0],
                    iconAnchor: [0, 0]
                  })}
                >
                  <Tooltip permanent direction="top" offset={[0, -20]} className={buildTooltipClass(currentTheme, 'critical')} opacity={1}>
                    <div style={{ fontFamily: currentTheme.tooltip.font, color: currentTheme.tooltip.headerText, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      <strong style={{ color: '#ef4444' }}>{globalAlert.type.toUpperCase()} DETECTED</strong><br/>
                      <span style={{ fontSize: 11, opacity: 0.8 }}>📍 {globalAlert.lat.toFixed(5)}, {globalAlert.lng.toFixed(5)}</span>
                    </div>
                  </Tooltip>
                </Marker>
              )}
            </MapContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center" style={{ background: '#f5f5f5', color: '#6F6F6F', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Calibrating Satellite Mesh...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapDashboard;