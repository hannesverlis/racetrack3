const LAP_OBSERVER_KEY = '662e0f6c';
let races = [];
let currentRaceId = null;
let lapStats = {};

function checkAccessKey() {
    const key = document.getElementById('access-key').value.trim();
    
    if (key === LAP_OBSERVER_KEY) {
        accessKey = key;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        loadRaces();
    } else {
        document.getElementById('login-error').textContent = 'Invalid access code';
        setTimeout(() => {
            document.getElementById('login-error').textContent = '';
        }, 3000);
    }
}

async function loadRaces() {
    try {
        // Load both PLANNED and RUNNING races
        races = await apiRequest('/api/public/available-races');
        updateRaceSelect();
    } catch (error) {
        console.error('Error loading races:', error);
        alert('Error loading races: ' + error.message);
    }
}

function updateRaceSelect() {
    const select = document.getElementById('race-select');
    
    // Sort: RUNNING races first, then PLANNED
    const sortedRaces = [...races].sort((a, b) => {
        if (a.status === 'RUNNING' && b.status !== 'RUNNING') return -1;
        if (a.status !== 'RUNNING' && b.status === 'RUNNING') return 1;
        return a.id - b.id;
    });
    
    select.innerHTML = '<option value="">-- Select Race --</option>' +
        sortedRaces.map(race => {
            const statusLabel = race.status === 'RUNNING' ? ' (Running)' : ' (Planned)';
            return `<option value="${race.id}">${race.name}${statusLabel}</option>`;
        }).join('');
    
    // If no races, show message
    if (races.length === 0) {
        console.log('No available races');
    }
}

function loadRaceDrivers() {
    const raceId = parseInt(document.getElementById('race-select').value);
    
    if (!raceId) {
        document.getElementById('lap-buttons-section').classList.add('hidden');
        document.getElementById('lap-stats-section').classList.add('hidden');
        currentRaceId = null;
        return;
    }
    
    const race = races.find(r => r.id === raceId);
    if (!race) {
        alert('Selected race not found');
        return;
    }
    
    // If race is still PLANNED, show warning message
    if (race.status === 'PLANNED') {
        document.getElementById('lap-buttons-section').classList.add('hidden');
        document.getElementById('lap-stats-section').classList.remove('hidden');
        currentRaceId = raceId;
        
        const container = document.getElementById('lap-stats');
        container.innerHTML = `
            <div style="padding: 20px; background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; text-align: center;">
                <h3 style="color: #856404; margin-top: 0;">⏳ Race is still planned</h3>
                <p style="color: #856404; margin-bottom: 0;">
                    Laps can only be registered once the race has started.<br>
                    Wait until the race becomes active.
                </p>
            </div>
        `;
        return;
    }
    
    // If race is RUNNING, show lap registration option
    if (race.status !== 'RUNNING') {
        alert('Selected race is not active');
        return;
    }
    
    currentRaceId = raceId;
    displayLapButtons(race.drivers);
    document.getElementById('lap-buttons-section').classList.remove('hidden');
    document.getElementById('lap-stats-section').classList.remove('hidden');
    
    // Subscribe to leaderboard immediately to show statistics
    socket.emit('subscribe-leaderboard', raceId);
    
    // Show initial statistics (empty or existing)
    const container = document.getElementById('lap-stats');
    container.innerHTML = `
        <h3>Leaderboard</h3>
        <p>Loading data...</p>
        <h3 style="margin-top: 30px;">Lap History</h3>
        <div id="lap-history">
            <p>No laps registered yet</p>
        </div>
    `;
}

function displayLapButtons(drivers) {
    const container = document.getElementById('lap-buttons');
    
    container.innerHTML = drivers.map(driver => `
        <button class="lap-button" data-car-number="${driver.carNumber}" onclick="registerLap(${driver.carNumber})">
            Car #${driver.carNumber}<br>
            <small>${driver.name}</small>
        </button>
    `).join('');
}

async function registerLap(carNumber) {
    if (!currentRaceId) {
        alert('Select a race first');
        return;
    }
    
    try {
        await apiRequest('/api/laps', {
            method: 'POST',
            body: JSON.stringify({ raceId: currentRaceId, carNumber })
        });
        
        // Visual feedback for button - use data-attribute for exact match
        const button = document.querySelector(`.lap-button[data-car-number="${carNumber}"]`);
        if (button) {
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = '';
            }, 200);
        }
    } catch (error) {
        alert('Error registering lap: ' + error.message);
    }
}

let lapHistory = {}; // raceId -> { carNumber -> [laps] }

function updateLapStats(leaderboard) {
    if (leaderboard.raceId !== currentRaceId) return;
    
    const container = document.getElementById('lap-stats');
    
    // Show both leaderboard and lap history
    let html = '';
    
    if (leaderboard.entries.length > 0) {
        html += `
            <h3>Leaderboard</h3>
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>Position</th>
                        <th>Driver</th>
                        <th>Car #</th>
                        <th>Laps</th>
                        <th>Fastest Lap</th>
                    </tr>
                </thead>
                <tbody>
                    ${leaderboard.entries.map((entry, index) => `
                        <tr>
                            <td class="position">${index + 1}</td>
                            <td>${entry.driverName}</td>
                            <td>#${entry.carNumber}</td>
                            <td>${entry.currentLap}</td>
                            <td>${entry.fastestLap ? formatLapTime(entry.fastestLap) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        html += '<p>No laps registered yet</p>';
    }
    
    html += '<h3 style="margin-top: 30px;">Lap History</h3>';
    html += '<div id="lap-history"></div>';
    
    container.innerHTML = html;
    
    // Show lap history
    displayLapHistory();
}

function displayLapHistory() {
    const historyContainer = document.getElementById('lap-history');
    if (!historyContainer) {
        console.log('lap-history element not found');
        return;
    }
    
    if (!currentRaceId) {
        historyContainer.innerHTML = '<p>Select a race</p>';
        return;
    }
    
    if (!lapHistory[currentRaceId] || Object.keys(lapHistory[currentRaceId]).length === 0) {
        historyContainer.innerHTML = '<p>No laps registered yet</p>';
        return;
    }
    
    // Collect all laps into one array with time
    const allLaps = [];
    Object.keys(lapHistory[currentRaceId]).forEach(carNumber => {
        lapHistory[currentRaceId][carNumber].forEach((lap) => {
            allLaps.push({
                carNumber: parseInt(carNumber),
                lapNumber: lap.lapNumber,
                lapTime: lap.lapMs,
                timestamp: lap.timestamp,
                driverName: lap.driverName || `Car #${carNumber}`
            });
        });
    });
    
    // Sort by timestamp (newest first)
    allLaps.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (allLaps.length === 0) {
        historyContainer.innerHTML = '<p>No laps registered yet</p>';
        return;
    }
    
    historyContainer.innerHTML = `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Driver</th>
                    <th>Car #</th>
                    <th>Lap #</th>
                    <th>Lap Time</th>
                </tr>
            </thead>
            <tbody>
                ${allLaps.map(lap => `
                    <tr>
                        <td>${formatTimestamp(lap.timestamp)}</td>
                        <td>${lap.driverName || 'Unknown'}</td>
                        <td>#${lap.carNumber}</td>
                        <td>${lap.lapNumber}</td>
                        <td>${formatLapTime(lap.lapTime)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatLapTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds}.${String(milliseconds).padStart(3, '0')}s`;
}

// Socket.IO listening
socket.on('race-update', (race) => {
    // Update PLANNED and RUNNING races
    if (race.status === 'PLANNED' || race.status === 'RUNNING') {
        const index = races.findIndex(r => r.id === race.id);
        if (index !== -1) {
            races[index] = race;
        } else {
            races.push(race);
        }
        updateRaceSelect();
        
        // If selected race was updated and it's RUNNING, update drivers and buttons
        if (race.id === currentRaceId && race.status === 'RUNNING') {
            // Update lap buttons if drivers changed
            displayLapButtons(race.drivers);
            
            // Ensure sections are visible (don't reload to preserve statistics)
            document.getElementById('lap-buttons-section').classList.remove('hidden');
            document.getElementById('lap-stats-section').classList.remove('hidden');
            
            // Check if this is a status change from PLANNED to RUNNING
            // We need to check the previous state, not current state
            const previousRace = races.find(r => r.id === race.id);
            const wasPlanned = previousRace && previousRace.status === 'PLANNED';
            
            // Only reload if race just changed from PLANNED to RUNNING
            if (wasPlanned && race.status === 'RUNNING') {
                loadRaceDrivers();
            }
        }
    } else {
        // Race finished or was deleted
        races = races.filter(r => r.id !== race.id);
        updateRaceSelect();
        
        if (race.id === currentRaceId) {
            document.getElementById('lap-buttons-section').classList.add('hidden');
            document.getElementById('lap-stats-section').classList.add('hidden');
            currentRaceId = null;
        }
    }
});

socket.on('leaderboard', (leaderboard) => {
    updateLapStats(leaderboard);
});

socket.on('laps', (data) => {
    console.log('Laps event received:', data);
    if (data.raceId === currentRaceId && data.lap) {
        // Add lap to history
        if (!lapHistory[currentRaceId]) {
            lapHistory[currentRaceId] = {};
        }
        if (!lapHistory[currentRaceId][data.lap.carNumber]) {
            lapHistory[currentRaceId][data.lap.carNumber] = [];
        }
        
        // Find driver name
        const race = races.find(r => r.id === currentRaceId);
        const driver = race ? race.drivers.find(d => d.carNumber === data.lap.carNumber) : null;
        const driverName = driver ? driver.name : null;
        
        const lapData = {
            lapNumber: data.lap.lapNumber,
            lapMs: data.lap.lapMs,
            timestamp: data.lap.timestamp,
            driverName: driverName
        };
        
        console.log('Adding lap to history:', lapData);
        lapHistory[currentRaceId][data.lap.carNumber].push(lapData);
        
        // Update lap history
        displayLapHistory();
    } else {
        console.log('Lap event ignored - raceId mismatch or no lap data', {
            currentRaceId,
            receivedRaceId: data.raceId,
            hasLap: !!data.lap
        });
    }
});
