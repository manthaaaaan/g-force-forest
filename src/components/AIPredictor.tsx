import React, { useState, useEffect } from 'react';

interface AIPredictorProps {
  lat: number;
  lng: number;
}

interface Prediction {
  id: string;
  type: string;
  severity: 'warning' | 'critical';
  time: string;
  message: string;
}

const WMO_CODES: Record<number, { type: string, sev: 'warning' | 'critical', msg: string }> = {
  65: { type: 'Heavy Rain', sev: 'warning', msg: 'Expected heavy intensity rain capable of causing localized flooding.' },
  67: { type: 'Freezing Rain', sev: 'critical', msg: 'Expected heavy freezing rain. High risk of ice accumulation.' },
  75: { type: 'Heavy Snow', sev: 'warning', msg: 'Heavy snow fall predicted. Visibility will be severely reduced.' },
  82: { type: 'Violent Showers', sev: 'critical', msg: 'Violent rain showers approaching. Imminent flash flood warning.' },
  95: { type: 'Thunderstorm', sev: 'critical', msg: 'Severe thunderstorm expected with potential for lighting strikes and high winds.' },
  96: { type: 'Hail Thunderstorm', sev: 'critical', msg: 'Severe thunderstorm with hail expected. Immediate shelter required.' },
  99: { type: 'Heavy Hail', sev: 'critical', msg: 'Severe thunderstorm with heavy hail expected. Immediate shelter required.' },
};

const AIPredictor: React.FC<AIPredictorProps> = ({ lat, lng }) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      setError('');
      try {
        // We use Open-Meteo as our intelligence feed for weather predictions
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=weather_code&timezone=auto&forecast_days=2`);
        if (!res.ok) throw new Error('AI Intelligence Feed offline');
        const data = await res.json();

        // Parse hourly forecast to extract extreme weather
        const newPredictions: Prediction[] = [];
        const times = data.hourly.time;
        const codes = data.hourly.weather_code;

        const now = new Date();
        const seenEvents = new Set<string>();

        for (let i = 0; i < times.length; i++) {
          const forecastTime = new Date(times[i]);
          if (forecastTime < now) continue; // Skip past

          const code = codes[i];
          if (WMO_CODES[code]) {
            const eventInfo = WMO_CODES[code];
            // Only add the first instance of a specific event type to avoid spamming the UI for consecutive hours
            if (!seenEvents.has(eventInfo.type)) {
               seenEvents.add(eventInfo.type);
               newPredictions.push({
                 id: `${code}-${times[i]}`,
                 type: eventInfo.type,
                 severity: eventInfo.sev,
                 time: forecastTime.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
                 message: eventInfo.msg
               });
            }
          }
        }

        // Simulating the "AI analyzing" delay for visual effect
        setTimeout(() => {
          setPredictions(newPredictions);
          setLoading(false);
        }, 1500);

      } catch (err: any) {
        console.error('Prediction Fetch Error:', err);
        setError('Failed to establish link with AI environmental prediction satellite.');
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [lat, lng]);

  return (
    <div className="w-full mt-12 bg-zinc-950/80 border border-zinc-900 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden">
      {/* Decorative AI scanning line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-emerald-500/50 [animation:scan_4s_ease-in-out_infinite]" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-3 h-3 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} shadow-[0_0_10px_currentColor]`} />
        <h3 className="text-xl font-mono tracking-widest uppercase text-white">AI Environmental Oracle</h3>
      </div>

      <p className="text-zinc-400 text-sm mb-6 max-w-3xl">
        Real-time predictive intelligence cross-referencing satellite meteorological data for coordinates <span className="text-emerald-400 font-mono">[{lat.toFixed(4)}, {lng.toFixed(4)}]</span>.
      </p>

      {loading ? (
        <div className="flex items-center gap-4 py-8 px-4 bg-black/40 rounded-xl border border-zinc-800 border-dashed">
           <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
           <span className="text-emerald-500 font-mono text-sm tracking-widest blink">ANALYZING ATMOSPHERIC DATA...</span>
        </div>
      ) : error ? (
        <div className="py-4 px-6 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      ) : predictions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/30 border border-emerald-900/30 rounded-xl">
           <span className="text-4xl mb-4">✨</span>
           <span className="text-emerald-400 font-mono tracking-widest text-sm uppercase">NO CRITICAL ANOMALIES DETECTED</span>
           <span className="text-zinc-500 text-xs mt-2">The projected environment is stable for the next 48 hours.</span>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Pending Climatic Threats:</h4>
          {predictions.map(pred => (
            <div key={pred.id} className={`flex flex-col md:flex-row gap-4 p-5 rounded-xl border ${pred.severity === 'critical' ? 'bg-red-950/20 border-red-900/50' : 'bg-amber-950/20 border-amber-900/50'}`}>
               <div className="md:w-32 flex-shrink-0 flex flex-col justify-center">
                  <span className={`text-xs font-bold uppercase tracking-widest ${pred.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`}>{pred.severity}</span>
                  <span className="text-white font-mono text-sm mt-1">{pred.time}</span>
               </div>
               <div className="flex-1">
                  <h5 className="text-lg font-bold text-white mb-1">{pred.type}</h5>
                  <p className="text-sm text-zinc-400 leading-relaxed">{pred.message}</p>
               </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          90% { top: 100%; opacity: 0; }
        }
        .blink { animation: blinker 1s linear infinite; }
        @keyframes blinker { 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
};

export default AIPredictor;
