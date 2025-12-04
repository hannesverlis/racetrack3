let SAFETY_OFFICIAL_KEY = null;
let currentRaceId = null;
let countdownInterval = null;

// Load access keys from server
async function loadAccessKeys() {
    try {
        const response = await fetch('/api/public/config');
        const config = await response.json();
        SAFETY_OFFICIAL_KEY = config.accessKeys.safetyOfficial;
    } catch (error) {
        console.error('Error loading access keys:', error);
        // Fallback to default if server config fails
        SAFETY_OFFICIAL_KEY = 'a2d393bc';
    }
}

function checkAccessKey() {
    const key = document.getElementById('access-key').value.trim();
    
    // Wait for access key to be loaded
    if (!SAFETY_OFFICIAL_KEY) {
        document.getElementById('login-error').textContent = 'Loading access keys...';
        setTimeout(() => {
            checkAccessKey();
        }, 100);
        return;
    }
    
    if (key === SAFETY_OFFICIAL_KEY) {
        accessKey = key;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        // Check for running race first, then load next race
        checkAndLoadCurrentRace();
    } else {
        document.getElementById('login-error').textContent = 'Invalid access code';
        setTimeout(() => {
            document.getElementById('login-error').textContent = '';
        }, 3000);
    }
}

// Load access keys when page loads
loadAccessKeys();

async function checkAndLoadCurrentRace() {
    // First check if there's a running race via Socket.IO
    socket.emit('get-running-races', (response) => {
        if (response.success && response.races && response.races.length > 0) {
            // There's a running race, show it
            const runningRace = response.races[0];
            currentRaceId = runningRace.id;
            
            // Show current race section
            document.getElementById('next-race-section').classList.add('hidden');
            document.getElementById('current-race-section').classList.remove('hidden');
            
            // Display the running race
            displayCurrentRace(runningRace);
            
            // Subscribe to countdown
            socket.emit('subscribe-countdown', runningRace.id);
        } else {
            // No running race, load next planned race
            loadNextRace();
        }
    });
}

function loadNextRace() {
    // Use Socket.IO to get next race
    socket.emit('subscribe-next-race');
    // The next-race event will be received via Socket.IO and handled by the listener
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

function startRace() {
    if (!currentRaceId) {
        alert('No race to start');
        return;
    }
    
    socket.emit('start-race', { accessKey, raceId: currentRaceId }, (response) => {
        if (response.error) {
            alert('Error starting race: ' + response.error);
            loadNextRace();
        } else {
            // Socket.IO events will update the page automatically
        }
    });
}

function loadCurrentRace() {
    // Race will be updated via Socket.IO events
    // This function is kept for compatibility but doesn't need to do anything
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
    
    // Show/hide controls based on mode
    updateRaceControls(race.mode);
}

function updateRaceControls(mode) {
    const modeControls = document.querySelector('.mode-controls');
    const finishBtn = document.getElementById('finish-btn');
    const endBtn = document.getElementById('end-btn');
    
    if (mode === 'FINISHING') {
        // Hide mode controls and finish button, show end button
        if (modeControls) modeControls.classList.add('hidden');
        if (finishBtn) finishBtn.classList.add('hidden');
        if (endBtn) endBtn.classList.remove('hidden');
    } else {
        // Show mode controls and finish button, hide end button
        if (modeControls) modeControls.classList.remove('hidden');
        if (finishBtn) finishBtn.classList.remove('hidden');
        if (endBtn) endBtn.classList.add('hidden');
    }
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

function setMode(mode) {
    if (!currentRaceId) return;
    
    socket.emit('set-mode', { accessKey, raceId: currentRaceId, mode }, (response) => {
        if (response.error) {
            alert('Error changing mode: ' + response.error);
        }
        // Socket.IO events will update the page automatically
    });
}

function finishRace() {
    if (!currentRaceId) {
        alert('No active race');
        return;
    }
    
    if (!confirm('Are you sure you want to finish the race?')) {
        return;
    }
    
    socket.emit('finish-race', { accessKey, raceId: currentRaceId }, (response) => {
        if (response.error) {
            alert('Error finishing race: ' + response.error);
        }
        // Socket.IO events will update the page automatically
    });
}

function endRaceSession() {
    if (!currentRaceId) {
        alert('No active race');
        return;
    }
    
    if (!confirm('Are you sure you want to end the race session?')) {
        return;
    }
    
    socket.emit('end-race-session', { accessKey, raceId: currentRaceId }, (response) => {
        if (response.error) {
            alert('Error ending race session: ' + response.error);
        } else {
            // Hide current race section and show next race
            document.getElementById('current-race-section').classList.add('hidden');
            document.getElementById('next-race-section').classList.remove('hidden');
            currentRaceId = null;
            loadNextRace();
        }
    });
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
    
    // If race finished and mode is DANGER (session ended), show next
    if (race.status === 'FINISHED' && race.mode === 'DANGER' && race.id === currentRaceId) {
        if (document.getElementById('current-race-section')) {
            document.getElementById('current-race-section').classList.add('hidden');
            document.getElementById('next-race-section').classList.remove('hidden');
        }
        currentRaceId = null;
        loadNextRace();
        return; // Don't process further
    }
    
    // Update current race if it's active (RUNNING or FINISHED with FINISHING mode)
    if (race.id === currentRaceId && (race.status === 'RUNNING' || (race.status === 'FINISHED' && race.mode === 'FINISHING'))) {
        displayCurrentRace(race);
        return; // Don't process further
    }
    
    // If race changed from PLANNED to something else, but it was our selected race
    // Only hide if race is not RUNNING and not FINISHED with FINISHING mode
    if (race.status !== 'PLANNED' && race.id === currentRaceId && race.status !== 'RUNNING' && !(race.status === 'FINISHED' && race.mode === 'FINISHING')) {
        // Race changed (e.g. FINISHED with DANGER mode), load next
        currentRaceId = null;
        loadNextRace();
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
        
        // Don't auto-hide race section when timer stops - wait for END button
        // The race will be in FINISHING mode, and END button will be visible
    }
});

socket.on('flags', (data) => {
    if (data.raceId === currentRaceId) {
        // Mode changed, update flag display
        updateFlagDisplay(data.mode);
        // Update race controls visibility
        updateRaceControls(data.mode);
        
        // If mode changed to FINISHING, make sure race section is visible
        if (data.mode === 'FINISHING') {
            const currentRaceSection = document.getElementById('current-race-section');
            const nextRaceSection = document.getElementById('next-race-section');
            if (currentRaceSection && currentRaceSection.classList.contains('hidden')) {
                currentRaceSection.classList.remove('hidden');
            }
            if (nextRaceSection && !nextRaceSection.classList.contains('hidden')) {
                nextRaceSection.classList.add('hidden');
            }
        }
    }
});

socket.on('next-race', (nextRace) => {
    // Update next race info if we're showing the next race section
    // or if there's no current race running
    const nextRaceSection = document.getElementById('next-race-section');
    const currentRaceSection = document.getElementById('current-race-section');
    const isShowingNextRace = nextRaceSection && !nextRaceSection.classList.contains('hidden');
    const isShowingCurrentRace = currentRaceSection && !currentRaceSection.classList.contains('hidden');
    
    // Only update if we're showing next race section (not current race)
    if (isShowingNextRace && !isShowingCurrentRace) {
        displayNextRace(nextRace);
        if (nextRace.id) {
            currentRaceId = nextRace.id;
        }
    }
});
