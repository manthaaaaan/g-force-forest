import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WildlifeChatbot from './WildlifeChatbot';

interface WildlifePatternsProps {
  onBack: () => void;
}

interface AnimalSighting {
  id: number;
  commonName: string;
  scientificName: string;
  image: string;
  timeAgo: string;
  distanceKm: string;
  quality: string;
  observerName: string;
  placeGuess: string;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

async function fetchNearbyAnimals(lat: number, lon: number): Promise<AnimalSighting[]> {
  const url =
    `https://api.inaturalist.org/v1/observations` +
    `?lat=${lat}&lng=${lon}&radius=50` +
    `&order=desc&order_by=created_at&per_page=12` +
    `&iconic_taxa=Mammalia,Reptilia,Aves,Amphibia` +
    `&photos=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('iNaturalist fetch failed');
  const data = await res.json();

  return (data.results || [])
    .filter((obs: any) => obs.taxon && obs.photos?.length > 0)
    .slice(0, 10)
    .map((obs: any): AnimalSighting => {
      const parts = (obs.location || `${lat},${lon}`).split(',');
      const obsLat = parseFloat(parts[0]);
      const obsLon = parseFloat(parts[1]);
      return {
        id: obs.id,
        commonName:
          obs.taxon.preferred_common_name ||
          obs.taxon.name,
        scientificName: obs.taxon.name,
        image: (obs.photos[0]?.url || '').replace('square', 'medium'),
        timeAgo: getTimeAgo(obs.created_at),
        distanceKm: haversineKm(lat, lon, obsLat, obsLon),
        quality: obs.quality_grade === 'research' ? 'Verified' : 'Reported',
        observerName: obs.user?.login || 'Anonymous',
        placeGuess: obs.place_guess || 'Nearby',
      };
    });
}

const WildlifePatterns: React.FC<WildlifePatternsProps> = ({ onBack }) => {
  const [locationName, setLocationName] = useState('your area');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [sightings, setSightings] = useState<AnimalSighting[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadSightings = useCallback(async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);
      const results = await fetchNearbyAnimals(lat, lon);
      if (results.length === 0) {
        setError('No wildlife observations found within 50 km. iNaturalist may not have coverage here yet.');
      } else {
        setSightings(results);
        setLastUpdated(new Date());
      }
    } catch {
      setError('Could not load wildlife data. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get GPS once
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser.');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          );
          const d = await r.json();
          setLocationName(
            d.address?.city || d.address?.town || d.address?.state || 'Your Area'
          );
        } catch {
          setLocationName('Your Area');
        }
        loadSightings(lat, lon);
      },
      () => {
        setError(
          'Location permission denied. Please allow location access to see real nearby wildlife.'
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [loadSightings]);

  // Refresh every 60 seconds
  useEffect(() => {
    if (!coords) return;
    const id = setInterval(() => loadSightings(coords.lat, coords.lon), 60000);
    return () => clearInterval(id);
  }, [coords, loadSightings]);

  const qualityColor = (q: string) =>
    q === 'Verified' ? '#22c55e' : '#f59e0b';

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col"
      style={{ background: '#424242ff', fontFamily: '"DM Sans", sans-serif' }}
    >
      {/* Video bg */}
      <video
        autoPlay muted playsInline loop
        className="fixed inset-0 z-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.14, filter: 'saturate(0.3)' }}
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
          type="video/mp4"
        />
      </video>
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center"
        style={{
          background: 'rgba(8,12,8,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <button
          onClick={onBack}
          className="text-2xl cursor-pointer border-none bg-transparent p-0 hover:opacity-70 transition-opacity"
          style={{ fontFamily: '"Instrument Serif", serif', color: '#d4f0d4' }}
        >
          EchoGrid<sup style={{ fontSize: '0.45em' }}>®</sup>
        </button>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`}
          />
          <span
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {loading ? 'Fetching…' : 'Live · iNaturalist'}
          </span>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 px-5 pt-24 pb-20 max-w-2xl mx-auto w-full">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p
            style={{
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#86efac',
              marginBottom: '8px',
            }}
          >
            Wildlife Detected Near You
          </p>
          <h1
            style={{
              fontFamily: '"Instrument Serif", serif',
              fontSize: 'clamp(2.4rem, 7vw, 4rem)',
              lineHeight: 1.0,
              color: '#f0faf0',
              fontWeight: 400,
              marginBottom: '6px',
            }}
          >
            Recent Animals
            <br />
            <em style={{ color: 'rgba(255,255,255,0.3)' }}>in {locationName}</em>
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.38)',
              marginTop: '12px',
              marginBottom: '28px',
            }}
          >
            Real observations by iNaturalist contributors near your GPS location.
            {lastUpdated && (
              <span style={{ color: 'rgba(255,255,255,0.22)', marginLeft: '6px' }}>
                · Updated {getTimeAgo(lastUpdated.toISOString())}
              </span>
            )}
          </p>
        </motion.div>

        {/* Loading spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-green-400 animate-spin"
              style={{ borderColor: 'rgba(34,197,94,0.2)', borderTopColor: '#22c55e' }}
            />
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
              Scanning iNaturalist for observations near you…
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
              {error}
            </p>
            {coords && (
              <button
                onClick={() => loadSightings(coords.lat, coords.lon)}
                className="px-4 py-2 rounded-full text-sm cursor-pointer"
                style={{
                  background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  color: '#86efac',
                }}
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Sighting cards */}
        {!loading && !error && (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {sightings.map((animal, i) => (
                <motion.div
                  key={animal.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.055 }}
                  onClick={() =>
                    setSelected(selected === animal.id ? null : animal.id)
                  }
                  className="cursor-pointer rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Photo */}
                    <div
                      className="relative flex-shrink-0 rounded-xl overflow-hidden"
                      style={{ width: 78, height: 78, background: '#1a2a1a' }}
                    >
                      <img
                        src={animal.image}
                        alt={animal.commonName}
                        className="w-full h-full object-cover"
                        style={{ filter: 'brightness(0.88) saturate(1.2)' }}
                        onError={(e) => {
                          const t = e.target as HTMLImageElement;
                          t.src = `https://placehold.co/78x78/1a2a1a/86efac?text=${encodeURIComponent(
                            (animal.commonName || '?').slice(0, 2).toUpperCase()
                          )}`;
                        }}
                      />
                    </div>

                    {/* Text info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div
                            style={{
                              fontSize: '17px',
                              fontWeight: 700,
                              color: '#e8f5e2',
                              lineHeight: 1.25,
                            }}
                          >
                            {animal.commonName}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              fontStyle: 'italic',
                              color: 'rgba(255,255,255,0.28)',
                              marginTop: '2px',
                            }}
                          >
                            {animal.scientificName}
                          </div>
                        </div>

                        {/* Status badge — bigger font */}
                        <div
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: `1px solid ${qualityColor(animal.quality)}55`,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: qualityColor(animal.quality) }}
                          />
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: qualityColor(animal.quality),
                              letterSpacing: '0.02em',
                            }}
                          >
                            {animal.quality}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)' }}>
                          📍 {animal.distanceKm} km away
                        </span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)' }}>
                          🕐 {animal.timeAgo}
                        </span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)' }}>
                          👤 {animal.observerName}
                        </span>
                      </div>
                    </div>

                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '16px' }}>
                      {selected === animal.id ? '↑' : '↓'}
                    </span>
                  </div>

                  {/* Expanded panel */}
                  <AnimatePresence>
                    {selected === animal.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{
                          overflow: 'hidden',
                          borderTop: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <div className="p-4 flex gap-4 items-start">
                          <img
                            src={animal.image}
                            alt={animal.commonName}
                            className="rounded-xl object-cover flex-shrink-0"
                            style={{ width: 110, height: 80 }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div>
                            <p
                              style={{
                                fontSize: '11px',
                                color: '#86efac',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                marginBottom: '6px',
                              }}
                            >
                              Observation Details
                            </p>
                            <p
                              style={{
                                fontSize: '13px',
                                color: 'rgba(255,255,255,0.6)',
                                lineHeight: 1.6,
                              }}
                            >
                              Spotted near{' '}
                              <strong style={{ color: 'rgba(255,255,255,0.85)' }}>
                                {animal.placeGuess}
                              </strong>
                              , {animal.timeAgo} by{' '}
                              <strong style={{ color: 'rgba(255,255,255,0.85)' }}>
                                {animal.observerName}
                              </strong>{' '}
                              on iNaturalist.
                            </p>
                            <a
                              href={`https://www.inaturalist.org/observations/${animal.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-block mt-3 px-3 py-1.5 rounded-lg text-xs"
                              style={{
                                background: 'rgba(34,197,94,0.1)',
                                border: '1px solid rgba(34,197,94,0.25)',
                                color: '#86efac',
                                textDecoration: 'none',
                              }}
                            >
                              View on iNaturalist →
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Refresh info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl mt-1"
              style={{
                border: '1px dashed rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.22)',
                fontSize: '12px',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Auto-refreshes every 60 seconds · {sightings.length} real observations loaded
            </motion.div>
          </div>
        )}

        {/* Chatbot */}
        {!loading && !error && sightings.length > 0 && (
          <div className="mt-8">
            <WildlifeChatbot
              locationName={locationName}
              availableSpecies={sightings.map((s) => s.commonName)}
            />
          </div>
        )}

        <button
          onClick={onBack}
          className="mt-6 bg-transparent border-none cursor-pointer text-sm w-full hover:opacity-80 transition-opacity"
          style={{ color: 'rgba(255,255,255,0.22)' }}
        >
          ← Back to routing
        </button>
      </div>
    </div>
  );
};

export default WildlifePatterns;