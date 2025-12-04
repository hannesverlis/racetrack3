require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const DEV_MODE = process.env.DEV_MODE === 'true' || process.env.DEV_MODE === '1';
const DEFAULT_DURATION_SEC = DEV_MODE ? 60 : 600;

// Access keys
const ACCESS_KEYS = {
  RECEPTIONIST: process.env.RECEPTIONIST_KEY || '8ded6076',
  SAFETY_OFFICIAL: process.env.SAFETY_OFFICIAL_KEY || 'a2d393bc',
  LAP_OBSERVER: process.env.LAP_LINE_OBSERVER_KEY || '662e0f6c'
};

// Data model (in memory)
let races = [];
let laps = [];
let raceTimers = new Map(); // raceId -> timer interval

let nextRaceId = 1;
let nextEntryId = 1;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Access key check middleware
function checkAccessKey(requiredKey) {
  return (req, res, next) => {
    const accessKey = req.headers['x-access-key'];
    
    if (!accessKey || accessKey !== requiredKey) {
      // Invalid key: wait 500ms before response
      setTimeout(() => {
        res.status(401).json({ error: 'Invalid access key' });
      }, 500);
      return;
    }
    
    next();
  };
}

// API endpoints

// POST /api/races - create race
app.post('/api/races', checkAccessKey(ACCESS_KEYS.RECEPTIONIST), (req, res) => {
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Race name is required' });
  }
  
  const race = {
    id: nextRaceId++,
    name: name.trim(),
    status: 'PLANNED',
    mode: 'SAFE',
    startTime: null,
    endTime: null,
    durationSec: DEFAULT_DURATION_SEC,
    drivers: []
  };
  
  races.push(race);
  
  // Send Socket.IO event
  io.emit('race-update', race);
  io.emit('next-race', getNextRace());
  
  res.status(201).json(race);
});

// GET /api/races - get all races
app.get('/api/races', checkAccessKey(ACCESS_KEYS.RECEPTIONIST), (req, res) => {
  const { status } = req.query;
  
  let filteredRaces = races;
  if (status) {
    filteredRaces = races.filter(r => r.status === status);
  }
  
  res.json(filteredRaces);
});

// DELETE /api/races/:raceId - delete race
app.delete('/api/races/:raceId', checkAccessKey(ACCESS_KEYS.RECEPTIONIST), (req, res) => {
  const raceId = parseInt(req.params.raceId);
  const raceIndex = races.findIndex(r => r.id === raceId);
  
  if (raceIndex === -1) {
    return res.status(404).json({ error: 'Race not found' });
  }
  
  const race = races[raceIndex];
  
  if (race.status !== 'PLANNED') {
    return res.status(400).json({ error: 'Can only delete PLANNED races' });
  }
  
  races.splice(raceIndex, 1);
  
  // Delete laps too
  laps = laps.filter(l => l.raceId !== raceId);
  
  // Send Socket.IO event
  io.emit('race-update', { id: raceId, deleted: true });
  io.emit('next-race', getNextRace());
  
  res.status(204).send();
});

// POST /api/races/:raceId/drivers - add driver
app.post('/api/races/:raceId/drivers', checkAccessKey(ACCESS_KEYS.RECEPTIONIST), (req, res) => {
  const raceId = parseInt(req.params.raceId);
  const { name, carNumber } = req.body;
  
  const race = races.find(r => r.id === raceId);
  if (!race) {
    return res.status(404).json({ error: 'Race not found' });
  }
  
  if (race.status !== 'PLANNED') {
    return res.status(400).json({ error: 'Can only add drivers to PLANNED races' });
  }
  
  // Check maximum number of drivers
  const MAX_DRIVERS = 8;
  if (race.drivers.length >= MAX_DRIVERS) {
    return res.status(400).json({ error: `Maximum of ${MAX_DRIVERS} drivers can be registered per race` });
  }
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Driver name is required' });
  }
  
  if (!carNumber || typeof carNumber !== 'number') {
    return res.status(400).json({ error: 'Car number is required' });
  }
  
  // Check uniqueness
  const duplicateName = race.drivers.find(d => d.name.toLowerCase() === name.trim().toLowerCase());
  if (duplicateName) {
    return res.status(400).json({ error: 'Driver name must be unique' });
  }
  
  const duplicateCarNumber = race.drivers.find(d => d.carNumber === carNumber);
  if (duplicateCarNumber) {
    return res.status(400).json({ error: 'Car number must be unique' });
  }
  
  const entry = {
    id: nextEntryId++,
    name: name.trim(),
    carNumber: carNumber
  };
  
  race.drivers.push(entry);
  
  // Send Socket.IO event
  io.emit('race-update', race);
  io.emit('next-race', getNextRace());
  
  res.status(201).json(entry);
});

// PUT /api/races/:raceId/drivers/:entryId - update driver
app.put('/api/races/:raceId/drivers/:entryId', checkAccessKey(ACCESS_KEYS.RECEPTIONIST), (req, res) => {
  const raceId = parseInt(req.params.raceId);
  const entryId = parseInt(req.params.entryId);
  const { name, carNumber } = req.body;
  
  const race = races.find(r => r.id === raceId);
  if (!race) {
    return res.status(404).json({ error: 'Race not found' });
  }
  
  if (race.status !== 'PLANNED') {
    return res.status(400).json({ error: 'Can only edit drivers in PLANNED races' });
  }
  
  const entryIndex = race.drivers.findIndex(d => d.id === entryId);
  if (entryIndex === -1) {
    return res.status(404).json({ error: 'Driver entry not found' });
  }
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Driver name is required' });
  }
  
  if (!carNumber || typeof carNumber !== 'number') {
    return res.status(400).json({ error: 'Car number is required' });
  }
  
  // Check uniqueness (excluding current driver)
  const duplicateName = race.drivers.find((d, index) => 
    index !== entryIndex && d.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (duplicateName) {
    return res.status(400).json({ error: 'Driver name must be unique' });
  }
  
  const duplicateCarNumber = race.drivers.find((d, index) => 
    index !== entryIndex && d.carNumber === carNumber
  );
  if (duplicateCarNumber) {
    return res.status(400).json({ error: 'Car number must be unique' });
  }
  
  // Update driver
  race.drivers[entryIndex].name = name.trim();
  race.drivers[entryIndex].carNumber = carNumber;
  
  // Send Socket.IO event
  io.emit('race-update', race);
  io.emit('next-race', getNextRace());
  
  res.json(race.drivers[entryIndex]);
});

// DELETE /api/races/:raceId/drivers/:entryId - remove driver
app.delete('/api/races/:raceId/drivers/:entryId', checkAccessKey(ACCESS_KEYS.RECEPTIONIST), (req, res) => {
  const raceId = parseInt(req.params.raceId);
  const entryId = parseInt(req.params.entryId);
  
  const race = races.find(r => r.id === raceId);
  if (!race) {
    return res.status(404).json({ error: 'Race not found' });
  }
  
  if (race.status !== 'PLANNED') {
    return res.status(400).json({ error: 'Can only remove drivers from PLANNED races' });
  }
  
  const entryIndex = race.drivers.findIndex(d => d.id === entryId);
  if (entryIndex === -1) {
    return res.status(404).json({ error: 'Driver entry not found' });
  }
  
  race.drivers.splice(entryIndex, 1);
  
  // Send Socket.IO event
  io.emit('race-update', race);
  io.emit('next-race', getNextRace());
  
  res.status(204).send();
});

// GET /api/public/next-race - next race info
app.get('/api/public/next-race', (req, res) => {
  const nextRace = getNextRace();
  res.json(nextRace);
});

// GET /api/public/running-races - running races info (public)
app.get('/api/public/running-races', (req, res) => {
  const runningRaces = races.filter(r => r.status === 'RUNNING');
  res.json(runningRaces.map(race => ({
    id: race.id,
    name: race.name,
    status: race.status,
    mode: race.mode,
    drivers: race.drivers.map(d => ({
      name: d.name,
      carNumber: d.carNumber
    }))
  })));
});

// GET /api/public/available-races - PLANNED and RUNNING races (public)
app.get('/api/public/available-races', (req, res) => {
  const availableRaces = races.filter(r => r.status === 'PLANNED' || r.status === 'RUNNING');
  res.json(availableRaces.map(race => ({
    id: race.id,
    name: race.name,
    status: race.status,
    mode: race.mode,
    drivers: race.drivers.map(d => ({
      name: d.name,
      carNumber: d.carNumber
    }))
  })));
});

// POST /api/control/:raceId/start - start race
app.post('/api/control/:raceId/start', checkAccessKey(ACCESS_KEYS.SAFETY_OFFICIAL), (req, res) => {
  const raceId = parseInt(req.params.raceId);
  const race = races.find(r => r.id === raceId);
  
  if (!race) {
    return res.status(404).json({ error: 'Race not found' });
  }
  
  if (race.status !== 'PLANNED') {
    return res.status(400).json({ error: 'Race can only be started from PLANNED status' });
  }
  
  if (race.drivers.length === 0) {
    return res.status(400).json({ error: 'Race must have at least one driver' });
  }
  
  race.status = 'RUNNING';
  race.mode = 'SAFE';
  race.startTime = new Date();
  race.endTime = null;
  
  // Start timer
  startRaceTimer(raceId);
  
  // Send Socket.IO events
  io.emit('race-update', race);
  io.emit('flags', { raceId, mode: race.mode });
  io.emit('next-race', getNextRace());
  
  res.status(204).send();
});

// POST /api/control/:raceId/finish - finish race
app.post('/api/control/:raceId/finish', checkAccessKey(ACCESS_KEYS.SAFETY_OFFICIAL), (req, res) => {
  const raceId = parseInt(req.params.raceId);
  const race = races.find(r => r.id === raceId);
  
  if (!race) {
    return res.status(404).json({ error: 'Race not found' });
  }
  
  if (race.status !== 'RUNNING') {
    return res.status(400).json({ error: 'Race can only be finished from RUNNING status' });
  }
  
  race.status = 'FINISHED';
  race.mode = 'FINISHING';
  race.endTime = new Date();
  
  // Stop timer
  stopRaceTimer(raceId);
  
  // Send Socket.IO events
  io.emit('race-update', race);
  io.emit('flags', { raceId, mode: race.mode });
  io.emit('countdown', { raceId, remainingSeconds: 0, isRunning: false });
  
  res.status(204).send();
});

// POST /api/control/:raceId/mode - set mode
app.post('/api/control/:raceId/mode', checkAccessKey(ACCESS_KEYS.SAFETY_OFFICIAL), (req, res) => {
  const raceId = parseInt(req.params.raceId);
  const { mode } = req.body;
  
  const race = races.find(r => r.id === raceId);
  if (!race) {
    return res.status(404).json({ error: 'Race not found' });
  }
  
  if (race.status !== 'RUNNING') {
    return res.status(400).json({ error: 'Can only change mode for RUNNING races' });
  }
  
  const validModes = ['SAFE', 'CAUTION', 'DANGER', 'FINISHING'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({ error: `Invalid mode. Must be one of: ${validModes.join(', ')}` });
  }
  
  race.mode = mode;
  
  // Send Socket.IO event
  io.emit('race-update', race);
  io.emit('flags', { raceId, mode: race.mode });
  
  res.status(204).send();
});

// POST /api/laps - register lap
app.post('/api/laps', checkAccessKey(ACCESS_KEYS.LAP_OBSERVER), (req, res) => {
  const { raceId, carNumber } = req.body;
  
  const race = races.find(r => r.id === raceId);
  if (!race) {
    return res.status(404).json({ error: 'Race not found' });
  }
  
  if (race.status !== 'RUNNING') {
    return res.status(400).json({ error: 'Can only register laps for RUNNING races' });
  }
  
  const driver = race.drivers.find(d => d.carNumber === carNumber);
  if (!driver) {
    return res.status(404).json({ error: 'Car number not found in race' });
  }
  
  const now = new Date();
  const raceStartTime = race.startTime ? new Date(race.startTime) : now;
  const elapsedMs = now - raceStartTime;
  
  // Find previous lap
  const previousLaps = laps.filter(l => l.raceId === raceId && l.carNumber === carNumber);
  const lapNumber = previousLaps.length + 1;
  
  // Calculate lap time (from previous lap to now)
  let lapMs = elapsedMs;
  if (previousLaps.length > 0) {
    const lastLap = previousLaps[previousLaps.length - 1];
    const lastLapTime = new Date(lastLap.timestamp);
    lapMs = now - lastLapTime;
  }
  
  const lap = {
    raceId,
    carNumber,
    lapNumber,
    lapMs,
    timestamp: now
  };
  
  laps.push(lap);
  
  // Send Socket.IO events
  io.emit('leaderboard', getLeaderboard(raceId));
  io.emit('laps', { raceId, lap });
  
  res.status(202).json(lap);
});

// Helper functions

function getNextRace() {
  const plannedRaces = races.filter(r => r.status === 'PLANNED');
  if (plannedRaces.length === 0) {
    return { id: null, name: null, drivers: [], message: 'No upcoming races' };
  }
  
  // Get first PLANNED race (lowest ID)
  const nextRace = plannedRaces.sort((a, b) => a.id - b.id)[0];
  
  return {
    id: nextRace.id,
    name: nextRace.name,
    drivers: nextRace.drivers.map(d => ({
      name: d.name,
      carNumber: d.carNumber
    }))
  };
}

function getLeaderboard(raceId) {
  const race = races.find(r => r.id === raceId);
  if (!race || race.status !== 'RUNNING') {
    return { raceId, entries: [] };
  }
  
  const now = new Date();
  const raceStartTime = race.startTime ? new Date(race.startTime) : now;
  const elapsedMs = now - raceStartTime;
  const remainingMs = (race.durationSec * 1000) - elapsedMs;
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  
  const entries = race.drivers.map(driver => {
    const driverLaps = laps.filter(l => l.raceId === raceId && l.carNumber === driver.carNumber);
    const currentLap = driverLaps.length + 1;
    
    // Find fastest lap
    let fastestLap = null;
    if (driverLaps.length > 0) {
      fastestLap = Math.min(...driverLaps.map(l => l.lapMs));
    }
    
    return {
      carNumber: driver.carNumber,
      driverName: driver.name,
      currentLap: currentLap,
      fastestLap: fastestLap,
      remainingTime: remainingSeconds
    };
  });
  
  // Sort: most laps first, then fastest lap
  entries.sort((a, b) => {
    if (a.currentLap !== b.currentLap) {
      return b.currentLap - a.currentLap;
    }
    if (a.fastestLap === null && b.fastestLap === null) return 0;
    if (a.fastestLap === null) return 1;
    if (b.fastestLap === null) return -1;
    return a.fastestLap - b.fastestLap;
  });
  
  return { raceId, entries, mode: race.mode };
}

function startRaceTimer(raceId) {
  const race = races.find(r => r.id === raceId);
  if (!race) return;
  
  // Stop previous timer if it exists
  stopRaceTimer(raceId);
  
  const startTime = race.startTime ? new Date(race.startTime) : new Date();
  const durationMs = race.durationSec * 1000;
  
  const timer = setInterval(() => {
    const now = new Date();
    const elapsedMs = now - startTime;
    const remainingMs = durationMs - elapsedMs;
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    
    if (remainingSeconds === 0) {
      // Time ran out - finish race automatically
      race.status = 'FINISHED';
      race.mode = 'FINISHING';
      race.endTime = now;
      stopRaceTimer(raceId);
      
      io.emit('race-update', race);
      io.emit('flags', { raceId, mode: race.mode });
      io.emit('countdown', { raceId, remainingSeconds: 0, isRunning: false });
    } else {
      // Send timer update
      io.emit('countdown', { raceId, remainingSeconds, isRunning: true });
    }
  }, 1000);
  
  raceTimers.set(raceId, timer);
  
  // Send first timer update
  io.emit('countdown', { raceId, remainingSeconds: race.durationSec, isRunning: true });
}

function stopRaceTimer(raceId) {
  const timer = raceTimers.get(raceId);
  if (timer) {
    clearInterval(timer);
    raceTimers.delete(raceId);
  }
}

// Socket.IO connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Subscriptions
  socket.on('subscribe-leaderboard', (raceId) => {
    console.log('subscribe-leaderboard called with raceId:', raceId);
    const leaderboard = getLeaderboard(raceId);
    console.log('Leaderboard data:', leaderboard);
    socket.emit('leaderboard', leaderboard);
  });
  
  socket.on('subscribe-flags', (raceId) => {
    const race = races.find(r => r.id === raceId);
    if (race) {
      socket.emit('flags', { raceId, mode: race.mode });
    }
  });
  
  socket.on('subscribe-countdown', (raceId) => {
    const race = races.find(r => r.id === raceId);
    if (race && race.status === 'RUNNING') {
      const startTime = race.startTime ? new Date(race.startTime) : new Date();
      const now = new Date();
      const elapsedMs = now - startTime;
      const remainingMs = (race.durationSec * 1000) - elapsedMs;
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      socket.emit('countdown', { raceId, remainingSeconds, isRunning: true });
    }
  });
  
  socket.on('subscribe-next-race', () => {
    socket.emit('next-race', getNextRace());
  });
  
  // Test message listening
  socket.on('test-message', (data) => {
    console.log('Test message received from client:', data);
    // Respond immediately
    socket.emit('test-response', {
      received: data,
      serverTime: new Date().toISOString(),
      message: 'Server received test message and responds back'
    });
  });
  
  // Send test message to client every 10 seconds
  const testInterval = setInterval(() => {
    if (socket.connected) {
      socket.emit('test-ping', {
        message: 'Server test message',
        timestamp: new Date().toISOString(),
        serverTime: Date.now()
      });
    }
  }, 10000);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(testInterval);
  });
});

// Server startup
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Server accessible at http://0.0.0.0:${PORT} (network)`);
  console.log(`Dev mode: ${DEV_MODE ? 'ON (1 minute)' : 'OFF (10 minutes)'}`);
});
