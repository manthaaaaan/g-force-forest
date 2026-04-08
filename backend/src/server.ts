import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import axios from 'axios';
import multer from 'multer';

const upload = multer();

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const HF_API_KEY = process.env.HF_API_KEY || process.env.HF_API_TOKEN || '';
const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/laion/clap-htsat-unfused';

console.log(
  '🔑 HF Token loaded:',
  HF_API_KEY ? `${HF_API_KEY.slice(0, 8)}...` : '❌ MISSING'
);

type NodeStatus = 'safe' | 'warning' | 'critical';

interface SensorNode {
  id: number;
  lat: number;
  lng: number;
  status: NodeStatus;
  lastDetectedAt?: number;
  lastSoundType?: string;
}

interface SoundEvent {
  nodeId: number;
  soundType: string;
  timestamp: number;
}

const nodes: SensorNode[] = [];
const BASE_LAT = 47.6062;
const BASE_LNG = -122.3321;

for (let i = 1; i <= 10; i++) {
  nodes.push({
    id: i,
    lat: BASE_LAT + (Math.random() - 0.5) * 0.1,
    lng: BASE_LNG + (Math.random() - 0.5) * 0.1,
    status: 'safe'
  });
}

const recentEvents: SoundEvent[] = [];

// ── Label mapping ──
const LABEL_MAP: Record<string, string> = {
  'Gunshot, gunfire': 'gunshot',
  Explosion: 'gunshot',
  Bang: 'gunshot',
  Firecracker: 'gunshot',
  Chainsaw: 'chainsaw',
  Drill: 'chainsaw',
  Grinder: 'chainsaw',
  Car: 'vehicle',
  Truck: 'vehicle',
  Bus: 'vehicle',
  Motorcycle: 'vehicle',
  Engine: 'vehicle',
  Vehicle: 'vehicle'
};

const mapLabelToSoundType = (
  labels: { label: string; score: number }[]
) => {
  for (const { label, score } of labels) {
    if (LABEL_MAP[label]) return { soundType: LABEL_MAP[label], confidence: score };
    const key = Object.keys(LABEL_MAP).find(k =>
      label.toLowerCase().includes(k.toLowerCase())
    );
    if (key) return { soundType: LABEL_MAP[key], confidence: score };
  }
  return null;
};

// ── Threat logic ──
const buildLogicString = (
  soundType: string,
  status: NodeStatus,
  hadRecentVehicle: boolean,
  nodeId: number
): string => {
  if (soundType === 'vehicle') {
    return `Node ${nodeId}: Vehicle movement detected — flagged as WARNING. Monitoring for follow-up acoustic signatures.`;
  }
  if (soundType === 'chainsaw') {
    if (hadRecentVehicle) {
      return `Node ${nodeId}: Chainsaw detected within 5 min of vehicle activity — CRITICAL. Confirmed illegal logging operation.`;
    }
    return `Node ${nodeId}: Chainsaw sound detected — CRITICAL. Immediate investigation required.`;
  }
  if (soundType === 'gunshot') {
    if (hadRecentVehicle) {
      return `Node ${nodeId}: Gunshot detected following vehicle approach — CRITICAL. Confirmed poaching event.`;
    }
    return `Node ${nodeId}: Gunshot detected — CRITICAL. Active threat tracking in progress.`;
  }
  return `Node ${nodeId}: Unknown acoustic event detected — status updated to ${status.toUpperCase()}.`;
};

const processThreat = (
  nodeId: number,
  soundType: string,
  confidenceScore: number
) => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const now = Date.now();
  const fiveMinsAgo = now - 5 * 60 * 1000;

  let hadRecentVehicle = false;

  if (soundType === 'vehicle') {
    node.status = 'warning';
  } else if (soundType === 'gunshot' || soundType === 'chainsaw') {
    const recentVehicle = recentEvents.find(
      e =>
        e.nodeId === nodeId &&
        e.soundType === 'vehicle' &&
        e.timestamp >= fiveMinsAgo
    );
    hadRecentVehicle = !!recentVehicle;
    node.status = 'critical';
  }

  node.lastDetectedAt = now;
  node.lastSoundType = soundType;

  recentEvents.push({ nodeId, soundType, timestamp: now });

  const logicApplied = buildLogicString(soundType, node.status, hadRecentVehicle, nodeId);

  const threatData = {
    node,
    timestamp: new Date().toISOString(),
    logicApplied,
    confidenceScore
  };

  io.emit('threat_update', threatData);

  return threatData;
};

// ── Health ──
app.get('/', (_req, res) => {
  res.json({ status: 'active' });
});

// ── SIMULATE SOUND (was missing — this is why buttons didn't work) ──
app.post('/api/simulate-sound', (req: Request, res: Response): any => {
  const { nodeId, soundType, confidenceScore } = req.body;

  if (!nodeId || !soundType) {
    return res.status(400).json({ error: 'Missing nodeId or soundType' });
  }

  console.log(`🎮 Simulating [${soundType}] on Node ${nodeId}`);

  const threatData = processThreat(nodeId, soundType, confidenceScore ?? 99);

  if (!threatData) {
    return res.status(404).json({ error: `Node ${nodeId} not found` });
  }

  res.json({ success: true, threatData });
});

// ── CLASSIFY AUDIO ──
app.post('/api/classify-audio', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
  const nodeId = req.body.nodeId ? parseInt(req.body.nodeId, 10) : 1;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No audio file provided in FormData' });
  }
  
  if (file.buffer.length < 1000) {
    return res.status(400).json({ error: 'File too small', details: 'Audio must be at least 1000 bytes' });
  }

  if (!HF_API_KEY) {
    return res.status(500).json({ error: 'HF_API_KEY missing in backend .env' });
  }

  console.log(`🎤 Received File - Size: ${file.size || file.buffer.length} bytes, MimeType: ${file.mimetype}`);

  try {
    const audioBuffer = file.buffer;

    const hfResponse = await axios.post(HF_MODEL_URL, audioBuffer, {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'audio/wav',
      },
      timeout: 30000 
    });

    console.log('📊 HF Status:', hfResponse.status);
    const results = hfResponse.data;
    const topPrediction = Array.isArray(results) && results.length > 0 ? results[0] : null;

    console.log('HF Prediction Results Summary:', results.slice(0, 3));

    // Support internal Map mapping while still serving requested cleaner JSON
    const mapped = mapLabelToSoundType(results);
    const threatData = mapped && mapped.confidence > 0.05 
      ? processThreat(nodeId, mapped.soundType, mapped.confidence) 
      : null;

    return res.json({ 
       topPrediction,
       confidenceScore: topPrediction ? topPrediction.score : 0,
       mapped,
       threatData,
       rawResults: results 
    });

  } catch (err: any) {
    console.error('❌ HF API Error Status:', err.response?.status);
    console.error('❌ HF API Error Data:', err.response?.data);
    res.status(err.response?.status || 500).json({
       error: 'HF API Error',
       details: err.message,
       hfDetails: err.response?.data
    });
  }
});

// ── Guard Alerts ──
interface GuardAlert {
  id: string;
  type: string;
  timestamp: string;
  issuer: string;
  lat: number;
  lng: number;
}

let activeGuardAlert: GuardAlert | null = null;

app.post('/api/guard-alert', (req: Request, res: Response): any => {
  const { type, issuer, lat, lng } = req.body;
  if (!type || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing alert type, lat, or lng' });
  }

  const newAlert: GuardAlert = {
    id: Date.now().toString(),
    type,
    timestamp: new Date().toISOString(),
    issuer: issuer || 'Ranger',
    lat,
    lng
  };

  activeGuardAlert = newAlert;
  io.emit('guard_alert', newAlert);
  console.log(`🚨 GUARD ALERT ISSUED: ${type}`);

  // Clear alert after 10 minutes
  setTimeout(() => {
    if (activeGuardAlert && activeGuardAlert.id === newAlert.id) {
      activeGuardAlert = null;
      io.emit('guard_alert_clear');
      console.log(`✅ GUARD ALERT CLEARED: ${type}`);
    }
  }, 10 * 60 * 1000);

  res.json({ success: true, alert: newAlert });
});

app.post('/api/clear-guard-alert', (req: Request, res: Response): any => {
  activeGuardAlert = null;
  io.emit('guard_alert_clear');
  res.json({ success: true });
});

app.get('/api/guard-alert', (_req, res) => {
  res.json({ alert: activeGuardAlert });
});

// ── Nodes ──
app.get('/api/nodes', (_req, res) => {
  res.json(nodes);
});

// ── Socket ──
io.on('connection', socket => {
  console.log('🔗 Connected:', socket.id);
  socket.emit('initial_state', nodes);
  if (activeGuardAlert) {
    socket.emit('guard_alert', activeGuardAlert);
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Running on http://localhost:${PORT}`);
});

// ── Auto reset (3 min inactivity → safe) ──
setInterval(() => {
  const now = Date.now();
  nodes.forEach(node => {
    if (
      node.status !== 'safe' &&
      node.lastDetectedAt &&
      now - node.lastDetectedAt > 180000
    ) {
      node.status = 'safe';
      node.lastDetectedAt = undefined;
      node.lastSoundType = undefined;

      io.emit('threat_update', {
        node,
        timestamp: new Date().toISOString(),
        logicApplied: `Node ${node.id}: No acoustic activity for 3 minutes — status reset to SAFE.`,
        confidenceScore: 0
      });
    }
  });
}, 1000);