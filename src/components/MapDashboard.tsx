import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import LiveEdgeNode from './LiveEdgeNode';

const socket = io('http://localhost:3001');

interface SensorNode {
  id: number;
  lat: number;
  lng: number;
  status: 'safe' | 'warning' | 'critical';
  lastDetectedAt?: number;
  lastSoundType?: string;
}

interface ThreatLog {
  timestamp: string;
  logic: string;
  nodeId: number;
}

const TILE_PROVIDERS = {
  tactical: {
    name: 'Tactical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    // Deep military dark palette
    theme: {
      safe: { ring: '#00ff9d', glow: '#00ff9d', bg: '#0d1f1a', border: '#00ff9d', text: '#00ff9d', subtext: '#4dffbe', label: '#e0fff2' },
      warning: { ring: '#f59e0b', glow: '#f59e0b', bg: '#1f1500', border: '#f59e0b', text: '#f59e0b', subtext: '#fcd34d', label: '#fff7e0' },
      critical: { ring: '#ff2d2d', glow: '#ff0000', bg: '#1f0000', border: '#ff2d2d', text: '#ff2d2d', subtext: '#ff8080', label: '#ffe0e0' },
      tooltip: {
        bg: 'rgba(5,15,10,0.97)',
        border: '#1a3d2b',
        headerText: '#4dffbe',
        bodyText: '#b0ffd4',
        timeText: '#4d8870',
        font: '"Share Tech Mono", monospace',
      }
    }
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    // Bright contrast for satellite imagery
    theme: {
      safe: { ring: '#38bdf8', glow: '#38bdf8', bg: '#001a2e', border: '#38bdf8', text: '#38bdf8', subtext: '#7dd3fc', label: '#e0f4ff' },
      warning: { ring: '#fb923c', glow: '#fb923c', bg: '#1f0e00', border: '#fb923c', text: '#fb923c', subtext: '#fdba74', label: '#fff3e0' },
      critical: { ring: '#f43f5e', glow: '#ff0040', bg: '#200010', border: '#f43f5e', text: '#f43f5e', subtext: '#fb7185', label: '#ffe4ec' },
      tooltip: {
        bg: 'rgba(0,10,20,0.95)',
        border: '#1e3a5f',
        headerText: '#7dd3fc',
        bodyText: '#bae6fd',
        timeText: '#4a7a9b',
        font: '"Courier New", monospace',
      }
    }
  },
  forest: {
    name: 'Forest Terrain',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    // Earthy naturalistic palette
    theme: {
      safe: { ring: '#65a30d', glow: '#84cc16', bg: '#0f1a00', border: '#65a30d', text: '#84cc16', subtext: '#a3e635', label: '#f0ffe0' },
      warning: { ring: '#ca8a04', glow: '#eab308', bg: '#1a1200', border: '#ca8a04', text: '#eab308', subtext: '#fde047', label: '#fffbe0' },
      critical: { ring: '#b91c1c', glow: '#ef4444', bg: '#1a0000', border: '#b91c1c', text: '#ef4444', subtext: '#f87171', label: '#ffe4e4' },
      tooltip: {
        bg: 'rgba(10,18,5,0.96)',
        border: '#2d4a1e',
        headerText: '#a3e635',
        bodyText: '#d9f99d',
        timeText: '#5a7a3a',
        font: '"Lucida Console", monospace',
      }
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

// ─── THEME-AWARE RADIO TOWER ICON (Node 1 / primary) ─────────────────────────
const createRadioTowerIcon = (status: SensorNode['status'], theme: typeof TILE_PROVIDERS[ThemeKey]['theme']) => {
  const t = theme[status];

  const pulseRing = status === 'critical'
    ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:${t.ring};animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;opacity:0.55;"></div>
       <div style="position:absolute;inset:-4px;border-radius:50%;background:${t.ring};animation:ping 1.3s cubic-bezier(0,0,0.2,1) infinite;opacity:0.35;"></div>`
    : status === 'warning'
      ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${t.ring};animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.4;"></div>`
      : `<div style="position:absolute;inset:-4px;border-radius:50%;background:${t.ring};animation:ping 2.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.2;"></div>`;

  const html = `
    <style>
      @keyframes ping { 75%,100%{transform:scale(2);opacity:0} }
    </style>
    <div style="
      position:relative;
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      transform:translate(-50%,-50%);
    ">
      ${pulseRing}
      <div style="
        position:relative;z-index:10;
        width:28px;height:28px;
        background:${t.bg};
        border:2px solid ${t.border};
        border-radius:6px;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 12px ${t.glow}88, inset 0 0 6px ${t.glow}22;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="${t.text}">
          <path d="M12 2a1 1 0 0 1 1 1v1.07A8 8 0 0 1 20 12a1 1 0 0 1-2 0 6 6 0 0 0-5-5.92V7a1 1 0 0 1-2 0V6.08A6 6 0 0 0 6 12a1 1 0 0 1-2 0 8 8 0 0 1 7-7.93V3a1 1 0 0 1 1-1zm0 8a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2zm0 6a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0v-4a1 1 0 0 1 1-1z"/>
        </svg>
      </div>
      <!-- node ID badge -->
      <div style="
        position:absolute;top:-6px;right:-8px;z-index:20;
        background:${t.border};color:${t.bg === '#0d1f1a' ? '#000' : '#fff'};
        font-size:9px;font-weight:700;font-family:monospace;
        padding:1px 4px;border-radius:3px;letter-spacing:0.5px;
      ">01</div>
    </div>`;

  return L.divIcon({ html, className: 'custom-leaflet-marker bg-transparent border-none', iconSize: [0, 0], iconAnchor: [0, 0] });
};

// ─── THEME-AWARE RADAR DOT ICON (secondary nodes) ────────────────────────────
const createRadarIcon = (status: SensorNode['status'], nodeId: number, theme: typeof TILE_PROVIDERS[ThemeKey]['theme']) => {
  const t = theme[status];

  const pulseRing = status === 'critical'
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:${t.ring};animation:ping 0.9s cubic-bezier(0,0,0.2,1) infinite;opacity:0.6;"></div>`
    : status === 'warning'
      ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${t.ring};animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;opacity:0.4;"></div>`
      : '';

  const html = `
    <style>
      @keyframes ping { 75%,100%{transform:scale(2.2);opacity:0} }
    </style>
    <div style="
      position:relative;
      width:14px;height:14px;
      display:flex;align-items:center;justify-content:center;
      transform:translate(-50%,-50%);
    ">
      ${pulseRing}
      <div style="
        position:relative;z-index:10;
        width:12px;height:12px;
        background:${t.bg};
        border:1.5px solid ${t.border};
        border-radius:50%;
        box-shadow:0 0 8px ${t.glow}99;
      "></div>
      <!-- small ID label beneath dot -->
      <div style="
        position:absolute;top:14px;left:50%;transform:translateX(-50%);
        color:${t.subtext};font-size:8px;font-family:monospace;
        white-space:nowrap;pointer-events:none;
        text-shadow:0 1px 3px #000;
      ">${String(nodeId).padStart(2, '0')}</div>
    </div>`;

  return L.divIcon({ html, className: 'custom-leaflet-marker bg-transparent border-none', iconSize: [0, 0], iconAnchor: [0, 0] });
};

// ─── THEME-AWARE TOOLTIP HTML ─────────────────────────────────────────────────
const buildTooltipClass = (theme: typeof TILE_PROVIDERS[ThemeKey]['theme'], status: SensorNode['status']) => {
  // We inject a style block; Leaflet tooltip className lets us target it
  return `echogrid-tooltip echogrid-${status}`;
};

const injectTooltipStyles = (themes: typeof TILE_PROVIDERS) => {
  const id = 'echogrid-tooltip-styles';
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  // We'll update styles dynamically per theme via CSS vars on :root
  el.textContent = `
    .echogrid-tooltip {
      background: var(--tt-bg) !important;
      border: 1px solid var(--tt-border) !important;
      border-radius: 6px !important;
      padding: 8px 12px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.7), 0 0 0 1px var(--tt-border) !important;
      font-family: var(--tt-font) !important;
      pointer-events: none !important;
    }
    .echogrid-tooltip::before { display:none !important; }
    .leaflet-tooltip-top.echogrid-tooltip::before { display:none !important; }
  `;
  document.head.appendChild(el);
};

const MapGeolocationTracker = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 18);
  }, [center, map]);
  return null;
};

const MapDashboard: React.FC<{ goHome: () => void }> = ({ goHome }) => {
  const [mapTheme, setMapTheme] = useState<ThemeKey>('tactical');
  const [center, setCenter] = useState<[number, number]>([47.6062, -122.3321]);
  const [nodes, setNodes] = useState<SensorNode[]>([]);
  const [logs, setLogs] = useState<ThreatLog[]>([]);
  const [escalateNode, setEscalateNode] = useState<SensorNode | null>(null);
  const now = useNow();

  const currentTheme = TILE_PROVIDERS[mapTheme].theme;

  // Inject tooltip base styles once
  useEffect(() => { injectTooltipStyles(TILE_PROVIDERS); }, []);

  // Apply CSS variables for the active theme
  useEffect(() => {
    const tt = currentTheme.tooltip;
    document.documentElement.style.setProperty('--tt-bg', tt.bg);
    document.documentElement.style.setProperty('--tt-border', tt.border);
    document.documentElement.style.setProperty('--tt-font', tt.font);
  }, [mapTheme]);

  const handleManualSimulate = (soundType: string) => {
    fetch('http://localhost:3001/api/simulate-sound', {
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
      setLogs((prev) => [{ timestamp: data.timestamp, logic: data.logicApplied, nodeId: data.node.id }, ...prev].slice(0, 50));
      setNodes((prevNodes) =>
        prevNodes.map(node => {
          if (node.id === data.node.id) {
            const updatedNode = {
              ...node,
              status: data.node.status,
              lastDetectedAt: data.node.lastDetectedAt,
              lastSoundType: data.node.lastSoundType
            } as SensorNode;
            if (updatedNode.status === 'critical') setEscalateNode(updatedNode);
            return updatedNode;
          }
          return node;
        })
      );
    });

    return () => {
      socket.off('initial_state');
      socket.off('threat_update');
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-zinc-950 font-inter text-white overflow-hidden">

      {/* LEFT SIDEBAR */}
      <div className="w-[30%] min-w-[350px] border-r border-zinc-900 bg-zinc-950 flex flex-col relative z-20 shadow-2xl overflow-y-auto">
        <div className="p-6 pb-2">
          <h1 className="text-4xl tracking-tight text-white font-instrument mb-1">Command Center</h1>
          <p className="text-zinc-500 text-sm">EchoGrid® Tactical Oversight</p>
        </div>

        <div className="px-6 pt-4 pb-2">
          <LiveEdgeNode />
        </div>

        <div className="px-6 pb-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 shadow-inner">
            <h4 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Manual Sensor Override (Node 1)</h4>
            <div className="flex flex-col gap-2">
              {['vehicle', 'chainsaw', 'gunshot'].map(type => (
                <button
                  key={type}
                  onClick={() => handleManualSimulate(type)}
                  className="w-full font-mono text-left px-4 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-colors"
                >
                  [ Simulate {type.charAt(0).toUpperCase() + type.slice(1)} ]
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-6 border-t border-zinc-800 bg-zinc-950/50">
          <h3 className="font-instrument text-2xl text-zinc-100 mb-4 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]"></span>
            Live Acoustic Feed
          </h3>
          <ul className="flex-1 overflow-y-auto pr-2 space-y-4">
            {logs.length === 0 ? (
              <li className="text-zinc-500 text-sm italic">Monitoring silent frequencies...</li>
            ) : (
              logs.map((log, i) => (
                <li key={i} className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 shadow-md backdrop-blur relative">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-emerald-400">Node {log.nodeId}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium">{log.logic}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* RIGHT MAP */}
      <div className="flex-1 relative">
        <button
          onClick={goHome}
          className="absolute top-4 left-4 z-[400] bg-zinc-900/80 backdrop-blur border border-zinc-700/50 text-white font-semibold text-sm px-4 py-2 rounded-md hover:bg-zinc-800 transition-colors shadow-2xl flex items-center gap-2"
        >
          ← Back to Home
        </button>

        {/* Theme switcher */}
        <div className="absolute top-4 right-4 z-[400] flex bg-zinc-900/90 backdrop-blur border border-zinc-700/50 rounded-lg p-1 shadow-2xl">
          {Object.entries(TILE_PROVIDERS).map(([key, provider]) => (
            <button
              key={key}
              onClick={() => setMapTheme(key as ThemeKey)}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-all duration-300 ${mapTheme === key ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
                }`}
            >
              {provider.name}
            </button>
          ))}
        </div>

        {nodes.length > 0 ? (
          <MapContainer
            center={center}
            zoom={18}
            className="h-full w-full bg-zinc-950 z-10"
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
                {/* Always show a minimal label; expand on non-safe */}
                <Tooltip
                  permanent={node.status !== 'safe'}
                  direction="top"
                  offset={[0, node.id === 1 ? -28 : -18]}
                  className={buildTooltipClass(currentTheme, node.status)}
                  opacity={1}
                >
                  {node.status !== 'safe' && node.lastDetectedAt && node.lastSoundType ? (
                    /* ── Active threat tooltip ── */
                    <div style={{ fontFamily: currentTheme.tooltip.font, minWidth: 120 }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ color: currentTheme.tooltip.headerText, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                          NODE {String(node.id).padStart(2, '0')}
                        </span>
                        <span style={{
                          color: node.status === 'critical' ? currentTheme[node.status].text : currentTheme[node.status].subtext,
                          fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
                          background: `${currentTheme[node.status].ring}22`,
                          border: `1px solid ${currentTheme[node.status].ring}55`,
                          borderRadius: 3, padding: '1px 5px'
                        }}>
                          {node.status}
                        </span>
                      </div>
                      {/* Sound type */}
                      <div style={{ color: currentTheme.tooltip.bodyText, fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                        ⚠ {node.lastSoundType?.toUpperCase()}
                      </div>
                      {/* Elapsed time */}
                      <div style={{ color: currentTheme.tooltip.timeText, fontSize: 10 }}>
                        {Math.floor((now - node.lastDetectedAt) / 1000)}s ago
                      </div>
                    </div>
                  ) : (
                    /* ── Safe / hover label ── */
                    <div style={{ fontFamily: currentTheme.tooltip.font, color: currentTheme.tooltip.headerText, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      NODE {String(node.id).padStart(2, '0')} · NOMINAL
                    </div>
                  )}
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-emerald-500 font-mono tracking-widest uppercase animate-pulse">
            Calibrating Satellite Mesh...
          </div>
        )}
      </div>
    </div>
  );
};

export default MapDashboard;