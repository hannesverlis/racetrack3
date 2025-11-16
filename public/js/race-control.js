const SAFETY_OFFICIAL_KEY = 'a2d393bc';
let currentRaceId = null;
let countdownInterval = null;

function checkAccessKey() {
    const key = document.getElementById('access-key').value.trim();
    
    if (key === SAFETY_OFFICIAL_KEY) {
        accessKey = key;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        loadNextRace();
    } else {
        document.getElementById('login-error').textContent = 'Invalid access code';
        setTimeout(() => {
            document.getElementById('login-error').textContent = '';
        }, 3000);
    }
}

async function loadNextRace() {
    try {
        const nextRace = await apiRequest('/api/public/next-race');
        displayNextRace(nextRace);
    } catch (error) {
        console.error('Error loading next race:', error);
    }
}

function displayNextRace(nextRace) {
    const container = document.getElementById('next-race-info');
    
    if (!nextRace.id) {
        container.innerHTML = '<p>' + (nextRace.message || 'No planned races') + '</p>';
        document.getElementById('start-race-btn').classList.add('hidden');
        currentRaceId = null;
        return;
    }
    
    // Check if this race is still PLANNED
    // If not, don't show it
    container.innerHTML = `
        <h3>${nextRace.name}</h3>
        <p><strong>Drivers:</strong> ${nextRace.drivers.length}</p>
        ${nextRace.drivers.length > 0 ? `
        <ul>
            ${nextRace.drivers.map(d => `<li>${d.name} - Car #${d.carNumber}</li>`).join('')}
        </ul>
        ` : '<p>No drivers</p>'}
    `;
    
    // Show button only if there are drivers
    if (nextRace.drivers.length > 0) {
        document.getElementById('start-race-btn').classList.remove('hidden');
    } else {
        document.getElementById('start-race-btn').classList.add('hidden');
    }
    
    currentRaceId = nextRace.id;
}

async function startRace() {
    if (!currentRaceId) {
        alert('No race to start');
        return;
    }
    
    // Check first if the next race is still PLANNED
    try {
        const nextRace = await apiRequest('/api/public/next-race');
        
        // If the next race is not our selected race or is no longer PLANNED
        if (!nextRace.id || nextRace.id !== currentRaceId) {
            alert('Race has already been started or changed. Refreshing list...');
            await loadNextRace();
            return;
        }
        
        // Check if there are drivers
        if (!nextRace.drivers || nextRace.drivers.length === 0) {
            alert('Race must have at least one driver!');
            return;
        }
    } catch (error) {
        console.error('Error checking next race:', error);
        // Continue with starting the race anyway
    }
    
    try {
        await apiRequest(`/api/control/${currentRaceId}/start`, {
            method: 'POST'
        });
        
        // Refresh race from server to ensure status is correct
        await loadRacesAndUpdate();
        
        // Socket.IO event will update the page automatically
    } catch (error) {
        alert('Error starting race: ' + error.message);
        // Refresh next race if race couldn't be started
        await loadNextRace();
    }
}

async function loadRacesAndUpdate() {
    try {
        // Wait a bit for server to update the race
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if race is now running
        const runningRaces = await apiRequest('/api/public/running-races');
        const currentRace = runningRaces.find(r => r.id === currentRaceId);
        
        if (currentRace && currentRace.status === 'RUNNING') {
            // Race is running, show it
            if (document.getElementById('next-race-section') && !document.getElementById('next-race-section').classList.contains('hidden')) {
                document.getElementById('next-race-section').classList.add('hidden');
                document.getElementById('current-race-section').classList.remove('hidden');
            }
            displayCurrentRace(currentRace);
            socket.emit('subscribe-countdown', currentRace.id);
        } else {
            // Race is not running, load next PLANNED race
            await loadNextRace();
        }
    } catch (error) {
        console.error('Error loading races:', error);
        // Race might be running, but we couldn't check it
        // Socket.IO event should update the page
    }
}

async function loadCurrentRace() {
    try {
        // Use public endpoint for running races
        const runningRaces = await apiRequest('/api/public/running-races');
        const race = runningRaces.find(r => r.id === currentRaceId);
        
        if (race) {
            displayCurrentRace(race);
        }
    } catch (error) {
        console.error('Error loading current race:', error);
    }
}

function displayCurrentRace(race) {
    const container = document.getElementById('current-race-info');
    container.innerHTML = `
        <h3>${race.name}</h3>
        <p><strong>Status:</strong> ${race.status}</p>
        <p><strong>Mode:</strong> ${race.mode}</p>
    `;
    
    // Update flag display
    updateFlagDisplay(race.mode);
}

function updateFlagDisplay(mode) {
    const flagDisplay = document.getElementById('flag-display');
    if (!flagDisplay) return;
    
    // Remove all mode classes
    flagDisplay.className = 'flag-display';
    
    // Add correct mode class and flag
    switch (mode) {
        case 'SAFE':
            flagDisplay.classList.add('flag-safe');
            flagDisplay.innerHTML = '<div class="flag-content"><div class="flag-green"></div><span>SAFE</span></div>';
            break;
        case 'CAUTION':
            flagDisplay.classList.add('flag-caution');
            flagDisplay.innerHTML = '<div class="flag-content"><div class="flag-yellow"></div><span>CAUTION</span></div>';
            break;
        case 'DANGER':
            flagDisplay.classList.add('flag-danger');
            flagDisplay.innerHTML = '<div class="flag-content"><div class="flag-red"></div><span>DANGER</span></div>';
            break;
        case 'FINISHING':
            flagDisplay.classList.add('flag-finishing');
            flagDisplay.innerHTML = '<div class="flag-content"><div class="flag-checkered"></div><span>FINISHING</span></div>';
            break;
        default:
            flagDisplay.classList.add('flag-safe');
            flagDisplay.innerHTML = '<div class="flag-content"><div class="flag-green"></div><span>SAFE</span></div>';
    }
}

async function setMode(mode) {
    if (!currentRaceId) return;
    
    try {
        await apiRequest(`/api/control/${currentRaceId}/mode`, {
            method: 'POST',
            body: JSON.stringify({ mode })
        });
    } catch (error) {
        alert('Error changing mode: ' + error.message);
    }
}

async function finishRace() {
    if (!currentRaceId) {
        alert('No active race');
        return;
    }
    
    if (!confirm('Are you sure you want to finish the race?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/control/${currentRaceId}/finish`, {
            method: 'POST'
        });
        
        document.getElementById('current-race-section').classList.add('hidden');
        document.getElementById('next-race-section').classList.remove('hidden');
        currentRaceId = null;
        loadNextRace();
    } catch (error) {
        alert('Error finishing race: ' + error.message);
    }
}

function updateCountdown(remainingSeconds) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    document.getElementById('countdown-display').innerHTML = `
        <div class="countdown-label">Remaining Time</div>
        <div class="countdown-time">${display}</div>
    `;
}

// Socket.IO listening
socket.on('race-update', (race) => {
    // If race started, show current race
    if (race.status === 'RUNNING') {
        // If this is the race we just started or is already running
        if (currentRaceId === race.id || currentRaceId === null) {
            if (document.getElementById('next-race-section') && !document.getElementById('next-race-section').classList.contains('hidden')) {
                document.getElementById('next-race-section').classList.add('hidden');
                document.getElementById('current-race-section').classList.remove('hidden');
            }
            currentRaceId = race.id;
            displayCurrentRace(race);
            socket.emit('subscribe-countdown', race.id);
        }
    }
    
    // If race changed from PLANNED to something else, but it was our selected race
    if (race.status !== 'PLANNED' && race.id === currentRaceId && race.status !== 'RUNNING') {
        // Race changed (e.g. FINISHED), load next
        currentRaceId = null;
        loadNextRace();
    }
    
    // If race finished, show next
    if (race.status === 'FINISHED' && race.id === currentRaceId) {
        if (document.getElementById('current-race-section')) {
            document.getElementById('current-race-section').classList.add('hidden');
            document.getElementById('next-race-section').classList.remove('hidden');
        }
        currentRaceId = null;
        loadNextRace();
    }
    
    // Update current race if it's active
    if (race.id === currentRaceId && race.status === 'RUNNING') {
        displayCurrentRace(race);
    }
    
    // If race changed from PLANNED to something else, but it's not our selected race
    // Refresh next race if there's no active race currently
    if (race.status !== 'PLANNED' && currentRaceId === null) {
        loadNextRace();
    }
});

socket.on('countdown', (data) => {
    if (data.raceId === currentRaceId) {
        updateCountdown(data.remainingSeconds);
        
        if (!data.isRunning && currentRaceId) {
            // Race finished
            setTimeout(() => {
                document.getElementById('current-race-section').classList.add('hidden');
                document.getElementById('next-race-section').classList.remove('hidden');
                currentRaceId = null;
                loadNextRace();
            }, 2000);
        }
    }
});

socket.on('flags', (data) => {
    if (data.raceId === currentRaceId) {
        // Mode changed, update flag display
        updateFlagDisplay(data.mode);
    }
});

socket.on('next-race', (nextRace) => {
    if (!currentRaceId) {
        displayNextRace(nextRace);
        if (nextRace.id) {
            currentRaceId = nextRace.id;
        }
    }
});
