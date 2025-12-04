require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

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

// Access keys - environment variables are required
if (!process.env.RECEPTIONIST_KEY || !process.env.SAFETY_OFFICIAL_KEY || !process.env.LAP_LINE_OBSERVER_KEY) {
  console.error('ERROR: Environment variables for access keys are required!');
  console.error('Please set the following environment variables:');
  console.error('  - RECEPTIONIST_KEY');
  console.error('  - SAFETY_OFFICIAL_KEY');
  console.error('  - LAP_LINE_OBSERVER_KEY');
  console.error('');
  process.exit(1);
}

const ACCESS_KEYS = {
  RECEPTIONIST: process.env.RECEPTIONIST_KEY,
  SAFETY_OFFICIAL: process.env.SAFETY_OFFICIAL_KEY,
  LAP_OBSERVER: process.env.LAP_LINE_OBSERVER_KEY
};

// Data directories
const DATA_DIR = path.join(__dirname, 'data');
const RACES_FILE = path.join(DATA_DIR, 'races.json');
const LAPS_FILE = path.join(DATA_DIR, 'laps.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Data model (in memory)
let races = [];
let laps = [];
let raceTimers = new Map(); // raceId -> timer interval

let nextRaceId = 1;
let nextEntryId = 1;

// State persistence functions
function loadState() {
  try {
    // Load races
    if (fs.existsSync(RACES_FILE)) {
      const racesData = fs.readFileSync(RACES_FILE, 'utf8');
      races = JSON.parse(racesData);
      console.log(`Loaded ${races.length} races from file`);
    }
    
    // Load laps
    if (fs.existsSync(LAPS_FILE)) {
      const lapsData = fs.readFileSync(LAPS_FILE, 'utf8');
      laps = JSON.parse(lapsData);
      console.log(`Loaded ${laps.length} laps from file`);
    }
    
    // Load state (nextRaceId, nextEntryId)
    if (fs.existsSync(STATE_FILE)) {
      const stateData = fs.readFileSync(STATE_FILE, 'utf8');
      const state = JSON.parse(stateData);
      nextRaceId = state.nextRaceId || 1;
      nextEntryId = state.nextEntryId || 1;
      console.log(`Loaded state: nextRaceId=${nextRaceId}, nextEntryId=${nextEntryId}`);
    }
    
    // Restore race timers for RUNNING races
    races.forEach(race => {
      if (race.status === 'RUNNING' && race.startTime) {
        const startTime = new Date(race.startTime);
        const now = new Date();
        const elapsedMs = now - startTime;
        const durationMs = race.durationSec * 1000;
        const remainingMs = durationMs - elapsedMs;
        
        if (remainingMs > 0) {
          // Race is still running, restart timer
          startRaceTimer(race.id);
          console.log(`Restarted timer for race ${race.id}, remaining: ${Math.floor(remainingMs / 1000)}s`);
        } else {
          // Race time has expired, finish it
          race.status = 'FINISHED';
          race.mode = 'FINISHING';
          race.endTime = now;
          saveRaces();
          io.emit('race-update', race);
          io.emit('flags', { raceId: race.id, mode: race.mode });
          io.emit('countdown', { raceId: race.id, remainingSeconds: 0, isRunning: false });
          io.emit('next-race', getNextRace()); // Update next race display
          console.log(`Race ${race.id} expired and was finished`);
        }
      }
    });
  } catch (error) {
    console.error('Error loading state:', error);
  }
}

function saveRaces() {
  try {
    fs.writeFileSync(RACES_FILE, JSON.stringify(races, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving races:', error);
  }
}

function saveLaps() {
  try {
    fs.writeFileSync(LAPS_FILE, JSON.stringify(laps, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving laps:', error);
  }
}

function saveState() {
  try {
    const state = {
      nextRaceId,
      nextEntryId
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

// Load state on server startup
loadState();

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

// Public API endpoints (read-only, no access key required)

// GET /api/public/config - public configuration including access keys
app.get('/api/public/config', (req, res) => {
  res.json({
    accessKeys: {
      receptionist: ACCESS_KEYS.RECEPTIONIST,
      safetyOfficial: ACCESS_KEYS.SAFETY_OFFICIAL,
      lapObserver: ACCESS_KEYS.LAP_OBSERVER
    }
  });
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

// Helper functions

function getNextRace() {
  const plannedRaces = races.filter(r => r.status === 'PLANNED');
  if (plannedRaces.length === 0) {
    return { id: null, name: null, drivers: [], message: 'No upcoming races', races: [] };
  }
  
  // Sort by ID (lowest first)
  const sortedRaces = plannedRaces.sort((a, b) => a.id - b.id);
  
  // Get first PLANNED race (lowest ID) for backward compatibility
  const nextRace = sortedRaces[0];
  
  return {
    id: nextRace.id,
    name: nextRace.name,
    drivers: nextRace.drivers.map(d => ({
      name: d.name,
      carNumber: d.carNumber
    })),
    races: sortedRaces.map(race => ({
      id: race.id,
      name: race.name,
      drivers: race.drivers.map(d => ({
        name: d.name,
        carNumber: d.carNumber
      }))
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
    // Current lap is the number of completed laps
    // The first lap starts when the car crosses the finish line for the first time
    // So if no laps are registered, currentLap = 0 (not started first lap yet)
    // If 1 lap is registered, currentLap = 1 (first lap is in progress)
    const currentLap = driverLaps.length;
    
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
  
  // Sort: fastest lap first, then most laps
  entries.sort((a, b) => {
    // First sort by fastest lap (lower is better)
    if (a.fastestLap === null && b.fastestLap === null) {
      // If both have no fastest lap, sort by laps
      return b.currentLap - a.currentLap;
    }
    if (a.fastestLap === null) return 1; // No fastest lap goes to bottom
    if (b.fastestLap === null) return -1; // No fastest lap goes to bottom
    if (a.fastestLap !== b.fastestLap) {
      return a.fastestLap - b.fastestLap; // Lower fastest lap time is better
    }
    // If fastest lap times are equal, sort by most laps
    return b.currentLap - a.currentLap;
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
    
    if (remainingMs <= 0) {
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

// Socket.IO access key check helper
function checkSocketAccessKey(socket, requiredKey, callback) {
  const accessKey = socket.handshake.auth?.accessKey || socket.handshake.query?.accessKey;
  
  if (!accessKey || accessKey !== requiredKey) {
    socket.emit('error', { message: 'Invalid access key' });
    return false;
  }
  
  callback();
  return true;
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
  
  // Front Desk events
  socket.on('create-race', (data, callback) => {
    const accessKey = data.accessKey;
    if (!accessKey || accessKey !== ACCESS_KEYS.RECEPTIONIST) {
      if (callback) callback({ error: 'Invalid access key' });
      return;
    }
    
    const { name } = data;
    if (!name || name.trim() === '') {
      if (callback) callback({ error: 'Race name is required' });
      return;
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
    saveRaces();
    saveState();
    
    io.emit('race-update', race);
    io.emit('next-race', getNextRace());
    
    if (callback) callback({ success: true, race });
  });
  
  socket.on('delete-race', (data, callback) => {
    const accessKey = data.accessKey;
    if (!accessKey || accessKey !== ACCESS_KEYS.RECEPTIONIST) {
      if (callback) callback({ error: 'Invalid access key' });
      return;
    }
    
    const raceId = parseInt(data.raceId);
    const raceIndex = races.findIndex(r => r.id === raceId);
    
    if (raceIndex === -1) {
      if (callback) callback({ error: 'Race not found' });
      return;
    }
    
    const race = races[raceIndex];
    if (race.status !== 'PLANNED') {
      if (callback) callback({ error: 'Can only delete PLANNED races' });
      return;
    }
    
    races.splice(raceIndex, 1);
    laps = laps.filter(l => l.raceId !== raceId);
    saveRaces();
    saveLaps();
    
    io.emit('race-update', { id: raceId, deleted: true });
    io.emit('next-race', getNextRace());
    
    if (callback) callback({ success: true });
  });
  
  socket.on('add-driver', (data, callback) => {
    const accessKey = data.accessKey;
    if (!accessKey || accessKey !== ACCESS_KEYS.RECEPTIONIST) {
      if (callback) callback({ error: 'Invalid access key' });
      return;
    }
    
    const raceId = parseInt(data.raceId);
    const { name, carNumber } = data;
    
    const race = races.find(r => r.id === raceId);
    if (!race) {
      if (callback) callback({ error: 'Race not found' });
      return;
    }
    
    if (race.status !== 'PLANNED') {
      if (callback) callback({ error: 'Can only add drivers to PLANNED races' });
      return;
    }
    
    const MAX_DRIVERS = 8;
    if (race.drivers.length >= MAX_DRIVERS) {
      if (callback) callback({ error: `Maximum of ${MAX_DRIVERS} drivers can be registered per race` });
      return;
    }
    
    if (!name || name.trim() === '') {
      if (callback) callback({ error: 'Driver name is required' });
      return;
    }
    
    if (!carNumber || typeof carNumber !== 'number') {
      if (callback) callback({ error: 'Car number is required' });
      return;
    }
    
    const duplicateName = race.drivers.find(d => d.name.toLowerCase() === name.trim().toLowerCase());
    if (duplicateName) {
      if (callback) callback({ error: 'Driver name must be unique' });
      return;
    }
    
    const duplicateCarNumber = race.drivers.find(d => d.carNumber === carNumber);
    if (duplicateCarNumber) {
      if (callback) callback({ error: 'Car number must be unique' });
      return;
    }
    
    const entry = {
      id: nextEntryId++,
      name: name.trim(),
      carNumber: carNumber
    };
    
    race.drivers.push(entry);
    saveRaces();
    saveState();
    
    io.emit('race-update', race);
    io.emit('next-race', getNextRace());
    
    if (callback) callback({ success: true, entry });
  });
  
  socket.on('edit-driver', (data, callback) => {
    const accessKey = data.accessKey;
    if (!accessKey || accessKey !== ACCESS_KEYS.RECEPTIONIST) {
      if (callback) callback({ error: 'Invalid access key' });
      return;
    }
    
    const raceId = parseInt(data.raceId);
    const entryId = parseInt(data.entryId);
    const { name, carNumber } = data;
    
    const race = races.find(r => r.id === raceId);
    if (!race) {
      if (callback) callback({ error: 'Race not found' });
      return;
    }
    
    if (race.status !== 'PLANNED') {
      if (callback) callback({ error: 'Can only edit drivers in PLANNED races' });
      return;
    }
    
    const entryIndex = race.drivers.findIndex(d => d.id === entryId);
    if (entryIndex === -1) {
      if (callback) callback({ error: 'Driver entry not found' });
      return;
    }
    
    if (!name || name.trim() === '') {
      if (callback) callback({ error: 'Driver name is required' });
      return;
    }
    
    if (!carNumber || typeof carNumber !== 'number') {
      if (callback) callback({ error: 'Car number is required' });
      return;
    }
    
    const duplicateName = race.drivers.find((d, index) => 
      index !== entryIndex && d.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicateName) {
      if (callback) callback({ error: 'Driver name must be unique' });
      return;
    }
    
    const duplicateCarNumber = race.drivers.find((d, index) => 
      index !== entryIndex && d.carNumber === carNumber
    );
    if (duplicateCarNumber) {
      if (callback) callback({ error: 'Car number must be unique' });
      return;
    }
    
    race.drivers[entryIndex].name = name.trim();
    race.drivers[entryIndex].carNumber = carNumber;
    saveRaces();
    
    io.emit('race-update', race);
    io.emit('next-race', getNextRace());
    
    if (callback) callback({ success: true, entry: race.drivers[entryIndex] });
  });
  
  socket.on('remove-driver', (data, callback) => {
    const accessKey = data.accessKey;
    if (!accessKey || accessKey !== ACCESS_KEYS.RECEPTIONIST) {
      if (callback) callback({ error: 'Invalid access key' });
      return;
    }
    
    const raceId = parseInt(data.raceId);
    const entryId = parseInt(data.entryId);
    
    const race = races.find(r => r.id === raceId);
    if (!race) {
      if (callback) callback({ error: 'Race not found' });
      return;
    }
    
    if (race.status !== 'PLANNED') {
      if (callback) callback({ error: 'Can only remove drivers from PLANNED races' });
      return;
    }
    
    const entryIndex = race.drivers.findIndex(d => d.id === entryId);
    if (entryIndex === -1) {
      if (callback) callback({ error: 'Driver entry not found' });
      return;
    }
    
    race.drivers.splice(entryIndex, 1);
    saveRaces();
    
    io.emit('race-update', race);
    io.emit('next-race', getNextRace());
    
    if (callback) callback({ success: true });
  });
  
  socket.on('get-races', (data, callback) => {
    const accessKey = data?.accessKey;
    if (!accessKey || accessKey !== ACCESS_KEYS.RECEPTIONIST) {
      if (callback) callback({ error: 'Invalid access key' });
      return;
    }
    
    if (callback) callback({ success: true, races });
  });
  
  socket.on('get-available-races', (callback) => {
    const availableRaces = races.filter(r => r.status === 'PLANNED' || r.status === 'RUNNING');
    if (callback) callback({ success: true, races: availableRaces });
  });
  
  socket.on('get-running-races', (callback) => {
    const runningRaces = races.filter(r => r.status === 'RUNNING');
    if (callback) callback({ success: true, races: runningRaces.map(race => ({
      id: race.id,
      name: race.name,
      status: race.status,
      mode: race.mode,
      drivers: race.drivers.map(d => ({
        name: d.name,
        carNumber: d.carNumber
      }))
    })) });
  });
  
  // Race Control events
  socket.on('start-race', (data, callback) => {
    const accessKey = data.accessKey;
    if (!accessKey || accessKey !== ACCESS_KEYS.SAFETY_OFFICIAL) {
      if (callback) callback({ error: 'Invalid access key' });
      return;
    }
    
    const raceId = parseInt(data.raceId);
    const race = races.find(r => r.id === raceId);
    
    if (!race) {
      if (callback) callback({ error: 'Race not found' });
      return;
    }
    
    if (race.status !== 'PLANNED') {
      if (callback) callback({ error: 'Race can only be started from PLANNED status' });
      return;
    }
    
    if (race.drivers.length === 0) {
      if (callback) callback({ error: 'Race must have at least one driver' });
      return;
    }
    
    race.status = 'RUNNING';
    race.mode = 'SAFE';
    race.startTime = new Date();
    race.endTime = null;
    saveRaces();
    
    startRaceTimer(raceId);
    
    io.emit('race-update', race);
    io.emit('flags', { raceId, mode: race.mode });
    io.emit('next-race', getNextRace());
    
    if (callback) callback({ success: true, race });
  });
  
  socket.on('finish-race', (data, callback) => {
    const accessKey = data.accessKey;
    if (!accessKey || accessKey !== ACCESS_KEYS.SAFETY_OFFICIAL) {
      if (callback) callback({ error: 'Invalid access key' });
      return;
    }
    
    const raceId = parseInt(data.raceId);
    const race = races.find(r => r.id === raceId);
    
    if (!race) {
      if (callback) callback({ error: 'Race not found' });
      return;
    }
    
    if (race.status !== 'RUNNING') {
      if (callback) callback({ error: 'Race can only be finished from RUNNING status' });
      return;
    }
    
    race.status = 'FINISHED';
    race.mode = 'FINISHING';
    race.endTime = new Date();
    saveRaces();
    
    stopRaceTimer(raceId);
    
    io.emit('race-update', race);
    io.emit('flags', { raceId, mode: race.mode });
    io.emit('countdown', { raceId, remainingSeconds: 0, isRunning: false });
    io.emit('next-race', getNextRace()); // Update next race display
    
    if (callback) callback({ success: true, race });
  });
  
  socket.on('end-race-session', (data, callback) => {
    const accessKey = data.accessKey;
    if (!accessKey || accessKey !== ACCESS_KEYS.SAFETY_OFFICIAL) {
      if (callback) callback({ error: 'Invalid access key' });
      return;
    }
    
    const raceId = parseInt(data.raceId);
    const race = races.find(r => r.id === raceId);
    
    if (!race) {
      if (callback) callback({ error: 'Race not found' });
      return;
    }
    
    if (race.status !== 'FINISHED' || race.mode !== 'FINISHING') {
      if (callback) callback({ error: 'Race session can only be ended when race is FINISHED with FINISHING mode' });
      return;
    }
    
    race.mode = 'DANGER';
    saveRaces();
    
    io.emit('race-update', race);
    io.emit('flags', { raceId, mode: race.mode });
    io.emit('next-race', getNextRace());
    
    if (callback) callback({ success: true, race });
  });
  
  socket.on('set-mode', (data, callback) => {
    const accessKey = data.accessKey;
    if (!accessKey || accessKey !== ACCESS_KEYS.SAFETY_OFFICIAL) {
      if (callback) callback({ error: 'Invalid access key' });
      return;
    }
    
    const raceId = parseInt(data.raceId);
    const { mode } = data;
    
    const race = races.find(r => r.id === raceId);
    if (!race) {
      if (callback) callback({ error: 'Race not found' });
      return;
    }
    
    if (race.status !== 'RUNNING') {
      if (callback) callback({ error: 'Can only change mode for RUNNING races' });
      return;
    }
    
    const validModes = ['SAFE', 'CAUTION', 'DANGER', 'FINISHING'];
    if (!validModes.includes(mode)) {
      if (callback) callback({ error: `Invalid mode. Must be one of: ${validModes.join(', ')}` });
      return;
    }
    
    race.mode = mode;
    saveRaces();
    
    io.emit('race-update', race);
    io.emit('flags', { raceId, mode: race.mode });
    
    if (callback) callback({ success: true, race });
  });
  
  // Lap-line Tracker events
  socket.on('register-lap', (data, callback) => {
    const accessKey = data.accessKey;
    if (!accessKey || accessKey !== ACCESS_KEYS.LAP_OBSERVER) {
      if (callback) callback({ error: 'Invalid access key' });
      return;
    }
    
    const raceId = parseInt(data.raceId);
    const { carNumber } = data;
    
    const race = races.find(r => r.id === raceId);
    if (!race) {
      if (callback) callback({ error: 'Race not found' });
      return;
    }
    
    if (race.status !== 'RUNNING') {
      if (callback) callback({ error: 'Can only register laps for RUNNING races' });
      return;
    }
    
    const driver = race.drivers.find(d => d.carNumber === carNumber);
    if (!driver) {
      if (callback) callback({ error: 'Car number not found in race' });
      return;
    }
    
    const now = new Date();
    const raceStartTime = race.startTime ? new Date(race.startTime) : now;
    const elapsedMs = now - raceStartTime;
    
    const previousLaps = laps.filter(l => l.raceId === raceId && l.carNumber === carNumber);
    const lapNumber = previousLaps.length + 1;
    
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
    saveLaps();
    
    io.emit('leaderboard', getLeaderboard(raceId));
    io.emit('laps', { raceId, lap });
    
    if (callback) callback({ success: true, lap });
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
