import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

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

// 1. In-Memory State: Create an array to track 10 "Sensor Nodes".
const nodes: SensorNode[] = [];
// Random base coordinates (e.g., representing a forest area)
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

// Store recent sound events in memory
const recentEvents: SoundEvent[] = [];

// Root health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'active', message: 'Forest Guardian Backend is LIVE!' });
});

// 3. REST Endpoint
app.post('/api/simulate-sound', (req: Request, res: Response): any => {
  const { nodeId, soundType, confidenceScore } = req.body;

  if (nodeId === undefined || !soundType) {
    return res.status(400).json({ error: 'Missing nodeId or soundType' });
  }

  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }

  const now = Date.now();
  const fiveMinsAgo = now - 5 * 60 * 1000;
  
  let logicApplied = "None";
  let statusChanged = false;

  // 4. Advanced Threat Logic (Sequence Analyzer)
  if (soundType.toLowerCase() === 'vehicle') {
    node.status = 'warning';
    statusChanged = true;
    logicApplied = "Vehicle sound detected -> Status set to warning";
  } else if (soundType.toLowerCase() === 'gunshot' || soundType.toLowerCase() === 'chainsaw') {
    // Check for vehicle within 5 mins
    const recentVehicle = recentEvents.find(
      e => e.nodeId === nodeId && e.soundType.toLowerCase() === 'vehicle' && e.timestamp >= fiveMinsAgo
    );
    
    if (recentVehicle) {
      node.status = 'critical';
      logicApplied = `ESCALATION: ${soundType} detected within 5 minutes of vehicle -> Status set to critical`;
    } else {
      node.status = 'warning';
      logicApplied = `${soundType} detected with NO prior vehicle sound -> Status set to warning`;
    }
    statusChanged = true;
  }
  
  if (statusChanged || node.status !== 'safe') {
    node.lastDetectedAt = now;
    node.lastSoundType = soundType.toLowerCase();
  } else {
    logicApplied = `Sound "${soundType}" processed (confidence: ${confidenceScore}) -> No threat logic matched, status unchanged`;
    // We emit update even if status doesn't change because "or a sound is processed" is in requirements
  }

  // Record event
  recentEvents.push({ nodeId, soundType, timestamp: now });

  // Cleanup old events to prevent memory leak
  while(recentEvents.length > 500) {
    recentEvents.shift();
  }

  // 5. WebSockets: EMIT threat_update
  const threatData = {
    node,
    logicApplied,
    timestamp: new Date().toISOString()
  };

  console.log('Broadcasting threat update:', threatData);
  io.emit('threat_update', threatData);
  
  console.log("Current Node Status for Node 1:", nodes[0].status);

  res.json({ message: 'Sound processed successfully', threatData });
});

// Auxiliary endpoint
app.get('/api/nodes', (req: Request, res: Response) => {
  res.json(nodes);
});

// Socket.io connections
io.on('connection', (socket) => {
  console.log('🔗 Client connected to Socket:', socket.id);
  
  // Optionally send initial state map to new clients
  socket.emit('initial_state', nodes);
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// 1. Server Setup: running on port 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Virtual Forest Simulation Engine running on http://localhost:${PORT}`);
});

// Threat Degradation Engine
setInterval(() => {
  const now = Date.now();
  nodes.forEach(node => {
    // 3 minutes = 180000 ms
    if (node.status !== 'safe' && node.lastDetectedAt && (now - node.lastDetectedAt > 180000)) {
      node.status = 'safe';
      node.lastDetectedAt = undefined;
      node.lastSoundType = undefined;
      
      const threatData = {
        node,
        logicApplied: 'Node stabilized automatically after 3 minutes of silence.',
        timestamp: new Date().toISOString()
      };
      
      console.log(`Decay triggered for Node ${node.id}`);
      io.emit('threat_update', threatData);
    }
  });
}, 1000);
