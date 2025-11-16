let currentRaceId = null;
let remainingTime = null;

function loadLeaderboard() {
    // Wait for Socket.IO event
}

function updateRemainingTimeDisplay(seconds) {
    remainingTime = seconds;
    const timeDisplay = document.getElementById('remaining-time-display');
    if (timeDisplay) {
        timeDisplay.textContent = formatTime(seconds);
        
        // Change color when time is running out
        if (seconds <= 10) {
            timeDisplay.style.color = '#e74c3c';
            timeDisplay.style.animation = 'pulse 1s infinite';
        } else if (seconds <= 30) {
            timeDisplay.style.color = '#f39c12';
            timeDisplay.style.animation = '';
        } else {
            timeDisplay.style.color = '#2ecc71';
            timeDisplay.style.animation = '';
        }
    }
}

function displayLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboard-table');
    const noRace = document.getElementById('no-race');
    
    if (!leaderboard.entries || leaderboard.entries.length === 0) {
        container.classList.add('hidden');
        noRace.classList.remove('hidden');
        noRace.textContent = 'Waiting for race...';
        // Hide remaining time display
        const timeDisplay = document.getElementById('remaining-time-display');
        if (timeDisplay) {
            timeDisplay.parentElement.classList.add('hidden');
        }
        return;
    }
    
    noRace.classList.add('hidden');
    container.classList.remove('hidden');
    
    // Show remaining time display
    const timeDisplay = document.getElementById('remaining-time-display');
    if (timeDisplay) {
        timeDisplay.parentElement.classList.remove('hidden');
        // Use remainingTime from leaderboard or saved value
        if (leaderboard.entries.length > 0 && leaderboard.entries[0].remainingTime !== undefined) {
            updateRemainingTimeDisplay(leaderboard.entries[0].remainingTime);
        } else if (remainingTime !== null) {
            updateRemainingTimeDisplay(remainingTime);
        }
    }
    
    const modeColors = {
        'SAFE': '#2ecc71',
        'CAUTION': '#f39c12',
        'DANGER': '#e74c3c',
        'FINISHING': '#34495e'
    };
    
    container.innerHTML = `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Position</th>
                    <th>Driver</th>
                    <th>Car #</th>
                    <th>Laps</th>
                    <th>Fastest Lap</th>
                    <th>Remaining Time</th>
                    <th>Flag</th>
                </tr>
            </thead>
            <tbody>
                ${leaderboard.entries.map((entry, index) => {
                    const rowClass = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';
                    return `
                        <tr class="${rowClass}">
                            <td class="position">${index + 1}</td>
                            <td>${entry.driverName}</td>
                            <td>#${entry.carNumber}</td>
                            <td>${entry.currentLap}</td>
                            <td>${entry.fastestLap ? formatLapTime(entry.fastestLap) : '-'}</td>
                            <td>${formatTime(entry.remainingTime)}</td>
                            <td>
                                <span style="color: ${modeColors[leaderboard.mode] || '#333'}; font-size: 1.5em;">
                                    ${getFlagEmoji(leaderboard.mode)}
                                </span>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function formatLapTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds}.${String(milliseconds).padStart(3, '0')}s`;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getFlagEmoji(mode) {
    switch (mode) {
        case 'SAFE': return '🟢';
        case 'CAUTION': return '🟡';
        case 'DANGER': return '🔴';
        case 'FINISHING': return '🏁';
        default: return '⚪';
    }
}

// Socket.IO listening
socket.on('leaderboard', (leaderboard) => {
    console.log('Leaderboard received:', leaderboard);
    if (leaderboard && leaderboard.raceId) {
        currentRaceId = leaderboard.raceId;
        displayLeaderboard(leaderboard);
    }
});

socket.on('countdown', (data) => {
    console.log('Countdown received:', data);
    if (data.raceId === currentRaceId && data.isRunning) {
        updateRemainingTimeDisplay(data.remainingSeconds);
    }
});

socket.on('race-update', (race) => {
    console.log('Race update received:', race);
    if (race.status === 'RUNNING') {
        // If race started, subscribe to its leaderboard and countdown
        if (!currentRaceId || currentRaceId === race.id) {
            currentRaceId = race.id;
            console.log('Subscribing to leaderboard for race:', race.id);
            socket.emit('subscribe-leaderboard', race.id);
            socket.emit('subscribe-countdown', race.id);
        }
    } else if (race.status === 'FINISHED' && race.id === currentRaceId) {
        // Race finished, show last leaderboard for 5 more seconds
        updateRemainingTimeDisplay(0);
        setTimeout(() => {
            const container = document.getElementById('leaderboard-table');
            const noRace = document.getElementById('no-race');
            const timeDisplay = document.getElementById('remaining-time-display');
            if (container) container.classList.add('hidden');
            if (timeDisplay) timeDisplay.parentElement.classList.add('hidden');
            if (noRace) {
                noRace.classList.remove('hidden');
                noRace.textContent = 'Race finished';
            }
        }, 5000);
    }
});

// Subscribe to leaderboard updates
function subscribeToLeaderboard() {
    fetch('/api/public/running-races')
        .then(response => response.json())
        .then(runningRaces => {
            console.log('Running races:', runningRaces);
            if (runningRaces.length > 0) {
                // Subscribe to first running race's leaderboard and countdown
                const firstRunningRace = runningRaces[0];
                currentRaceId = firstRunningRace.id;
                console.log('Subscribing to leaderboard for race:', firstRunningRace.id);
                socket.emit('subscribe-leaderboard', firstRunningRace.id);
                socket.emit('subscribe-countdown', firstRunningRace.id);
            } else {
                // No running races
                const container = document.getElementById('leaderboard-table');
                const noRace = document.getElementById('no-race');
                const timeDisplay = document.getElementById('remaining-time-display');
                if (container) container.classList.add('hidden');
                if (timeDisplay) timeDisplay.parentElement.classList.add('hidden');
                if (noRace) {
                    noRace.classList.remove('hidden');
                    noRace.textContent = 'No running races';
                }
            }
        })
        .catch(error => {
            console.error('Error loading running races:', error);
        });
}

socket.on('connect', () => {
    console.log('Socket connected, subscribing to leaderboard');
    // On page load, subscribe to running races' leaderboard
    subscribeToLeaderboard();
});

// If socket is already connected, subscribe immediately
setTimeout(() => {
    if (socket && socket.connected) {
        subscribeToLeaderboard();
    } else {
        // Wait for socket connection
        socket.on('connect', () => {
            subscribeToLeaderboard();
        });
    }
}, 100);
