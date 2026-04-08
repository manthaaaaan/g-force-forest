import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LiveBackground from './LiveBackground';
import AIPredictor from './AIPredictor';

const API_BASE = 'https://manthaaaaan-wildlife-detection.hf.space';

type Role = 'ranger' | 'civilian' | null;

interface GuardAlertsProps {
  onBack: () => void;
  role: Role;
}

const ALERTS = [
  { id: 'forestfire', title: 'Forest Fire', desc: 'Rapidly spreading thermal anomaly detected. Issue immediate evacuation protocol.', icon: '🔥', color: 'from-orange-500 to-red-600', ring: 'focus:ring-red-500' },
  { id: 'thunderstorm', title: 'Thunderstorm', desc: 'Severe electrical storm with lightning strikes. Ground teams must seek shelter.', icon: '⚡', color: 'from-yellow-400 to-yellow-600', ring: 'focus:ring-yellow-500' },
  { id: 'immenserain', title: 'Immense Rain', desc: 'Critical precipitation levels. High risk of flash flooding and terrain instability.', icon: '🌧️', color: 'from-blue-500 to-cyan-600', ring: 'focus:ring-blue-500' },
  { id: 'treeclogging', title: 'Tree Clogging', desc: 'High density fallen timber blocking primary water streams or pathways.', icon: '🪵', color: 'from-amber-700 to-amber-900', ring: 'focus:ring-amber-700' },
];

const crosshairIcon = L.divIcon({
  html: `
    <style>
      @keyframes customBounce { 
        0%, 100% { transform: translate(-50%, -100%); } 
        50% { transform: translate(-50%, -120%); } 
      }
      @keyframes pulseRing {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
      }
    </style>
    <div style="position:relative; width:40px; height:40px;">
      <div style="position:absolute; top:50%; left:50%; width:20px; height:20px; background:rgba(239,68,68,0.5); border-radius:50%; animation:pulseRing 1.5s infinite;"></div>
      <div style="position:absolute; top:50%; left:50%; font-size:36px; color:red; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.6)); animation:customBounce 2s infinite ease-in-out;">📍</div>
    </div>
  `,
  className: 'bg-transparent border-none',
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const MapClickHandler = ({ onSelect }: { onSelect: (pos: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      onSelect([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
};

const MapGeolocationTracker = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, 16); }, [center, map]);
  return null;
};

const getAlertEmoji = (type: string) => {
  if (type.includes('Fire')) return '🔥';
  if (type.includes('Thunder')) return '⚡';
  if (type.includes('Rain')) return '🌧️';
  if (type.includes('Tree') || type.includes('Clog')) return '🪵';
  return '🆘';
};

const getActiveHazardIcon = (type: string) => L.divIcon({
  html: `
    <style>@keyframes gping { 75%,100%{transform:scale(3);opacity:0} }</style>
    <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);">
      <div style="position:absolute;inset:-10px;border-radius:50%;background:#ef4444;animation:gping 1.5s cubic-bezier(0,0,0.2,1) infinite;opacity:0.6;"></div>
      <div style="font-size:32px; z-index:10; filter: drop-shadow(0 0 10px rgba(239,68,68,0.8));">${getAlertEmoji(type)}</div>
    </div>
  `,
  className: 'bg-transparent border-none',
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

const GuardAlerts: React.FC<GuardAlertsProps> = ({ onBack, role }) => {
  const isRanger = role === 'ranger';
  const [issuing, setIssuing] = useState<string | null>(null);
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [center, setCenter] = useState<[number, number]>([47.6062, -122.3321]);
  const [activeAlert, setActiveAlert] = useState<{ type: string; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (isRanger) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCenter(coords);
          setSelectedPos(coords);
        });
      }

      fetch(`${API_BASE}/api/guard-alert`)
        .then(res => res.json())
        .then(data => {
          if (data.alert && data.alert.lat !== undefined && data.alert.lng !== undefined) {
            setActiveAlert({ type: data.alert.type, lat: data.alert.lat, lng: data.alert.lng });
          }
        })
        .catch(err => console.error(err));
    }
  }, [isRanger]);

  const handleIssueAlert = async (typeId: string, title: string) => {
    if (!isRanger || !selectedPos) return;
    setIssuing(typeId);
    try {
      await fetch(`${API_BASE}/api/guard-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: title, issuer: 'Ranger Command', lat: selectedPos[0], lng: selectedPos[1] })
      });

      setActiveAlert({ type: title, lat: selectedPos[0], lng: selectedPos[1] });

      setTimeout(() => {
        setIssuing(null);
      }, 1000);
    } catch (err) {
      console.error('Failed to issue alert', err);
      setIssuing(null);
    }
  };

  const handleClearAlerts = async () => {
    if (!isRanger) return;
    try {
      await fetch(`${API_BASE}/api/clear-guard-alert`, { method: 'POST' });
      setActiveAlert(null);
    } catch (err) {
      console.error('Failed to clear alerts', err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-inter flex flex-col relative overflow-y-auto">

      <LiveBackground alertType={activeAlert?.type} />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-sm cursor-pointer text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back
          </button>
        </div>
        <h1 className="text-xl tracking-tight text-white font-instrument">
          EchoGrid<sup className="text-xs">®</sup> Guard Alerts
        </h1>
        <div className="w-16"></div>
      </nav>

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 pb-12 flex flex-col">
        <div className="mb-8 text-center">
          <h2 className="text-5xl md:text-6xl font-instrument mb-4 tracking-tight">Environmental Overseer</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Global alert broadcasting system. Authorized Rangers can emit sector-wide warnings to all connected edge nodes and civilian devices to ensure immediate evacuation and safety protocols.
          </p>
        </div>

        {!isRanger && (
          <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-6 mb-8 text-center backdrop-blur-sm">
            <span className="text-red-500 font-mono text-sm tracking-widest uppercase">Unauthorized Access</span>
            <p className="text-red-200/70 mt-2 text-sm">
              You are viewing this page with civilian credentials. Only authenticated Rangers have clearance to issue environmental alerts.
            </p>
          </div>
        )}

        {isRanger && (
          <div className="mb-10 w-full flex flex-col items-center">
            <div className="w-full max-w-md flex justify-between items-end mb-3">
              <h3 className="text-xl font-bold tracking-tight">1. Target Location</h3>
              <div className="text-xs font-mono text-zinc-500 flex items-center gap-3">
                {selectedPos ? (
                  <>
                    <span className="bg-zinc-800 px-2 py-1 rounded border border-zinc-700">
                      [ {selectedPos[0].toFixed(4)}, {selectedPos[1].toFixed(4)} ]
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPos(null);
                        if (activeAlert) handleClearAlerts();
                      }}
                      className="text-red-500 hover:text-red-400 outline-none uppercase tracking-widest font-bold text-[10px] bg-red-950/30 px-2 py-1 rounded cursor-pointer"
                    >
                      {activeAlert ? 'Unlock & Clear Alert' : 'Unlock Target'}
                    </button>
                  </>
                ) : (
                  <span className="text-red-500 tracking-widest uppercase bg-red-950/30 px-2 py-1 rounded">LOCK/UNLOCK</span>
                )}
              </div>
            </div>

            <div className="w-full max-w-md aspect-square rounded-[2rem] overflow-hidden border-[3px] border-zinc-800 relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <MapContainer center={center} zoom={15} zoomControl={false} className="w-full h-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OSM' />
                <MapGeolocationTracker center={center} />
                <MapClickHandler onSelect={setSelectedPos} />
                {selectedPos && <Marker position={selectedPos} icon={crosshairIcon} />}
                {activeAlert && (
                  <Marker position={[activeAlert.lat, activeAlert.lng]} icon={getActiveHazardIcon(activeAlert.type)} />
                )}
              </MapContainer>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
                <div className={`px-4 py-2 rounded-full text-xs font-bold font-mono shadow-xl whitespace-nowrap backdrop-blur-md border ${selectedPos
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                    : 'bg-red-950/80 border-red-800 text-red-400'
                  }`}>
                  {selectedPos ? 'TARGET LOCKED' : 'CLICK MAP TO SELECT HAZARD ORIGIN'}
                </div>
              </div>
            </div>
          </div>
        )}

        {isRanger && <h3 className="text-xl font-bold tracking-tight mb-4">2. Select Threat Vector</h3>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ALERTS.map(alert => (
            <div
              key={alert.id}
              className={`bg-zinc-900/50 border rounded-3xl p-8 backdrop-blur-md transition-all duration-300 ${isRanger
                  ? selectedPos ? 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/80' : 'border-zinc-900 opacity-50 grayscale'
                  : 'opacity-80 grayscale-[30%]'
                }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br ${alert.color} shadow-lg shadow-black/50`}>
                  {alert.icon}
                </div>
                <h3 className="text-2xl font-semibold tracking-tight">{alert.title}</h3>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed mb-8 h-10">
                {alert.desc}
              </p>

              {isRanger ? (
                <button
                  onClick={() => handleIssueAlert(alert.id, alert.title)}
                  disabled={issuing === alert.id || !selectedPos}
                  className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 cursor-pointer ${!selectedPos
                      ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                      : issuing === alert.id
                        ? 'bg-zinc-800 text-zinc-500'
                        : `bg-white text-black hover:scale-[1.02] active:scale-[0.98] outline-none focus:ring-4 ${alert.ring} shadow-xl shadow-white/10`
                    }`}
                >
                  {issuing === alert.id ? 'Broadcasting...' : `Issue ${alert.title} Alert`}
                </button>
              ) : (
                <button disabled className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs bg-zinc-800 text-zinc-600 cursor-not-allowed">
                  Requires Clearance
                </button>
              )}
            </div>
          ))}
        </div>

        {isRanger && (
          <div className="mt-12 text-center">
            <button
              onClick={handleClearAlerts}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest font-mono underline decoration-zinc-700 underline-offset-4 cursor-pointer"
            >
              Clear All Active Alerts
            </button>
          </div>
        )}

        {isRanger && <AIPredictor lat={center[0]} lng={center[1]} />}

      </main>
    </div>
  );
};

export default GuardAlerts;