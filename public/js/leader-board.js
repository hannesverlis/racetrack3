let currentRaceId = null;

function loadLeaderboard() {
    // Oota Socket.IO sündmust
}

function displayLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboard-table');
    const noRace = document.getElementById('no-race');
    
    if (!leaderboard.entries || leaderboard.entries.length === 0) {
        container.classList.add('hidden');
        noRace.classList.remove('hidden');
        noRace.textContent = 'Ootan võidusõitu...';
        return;
    }
    
    noRace.classList.add('hidden');
    container.classList.remove('hidden');
    
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
                    <th>Koht</th>
                    <th>Sõitja</th>
                    <th>Auto #</th>
                    <th>Ringe</th>
                    <th>Kiireim ring</th>
                    <th>Järelejäänud aeg</th>
                    <th>Lipp</th>
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

// Socket.IO kuulamine
socket.on('leaderboard', (leaderboard) => {
    console.log('Leaderboard received:', leaderboard);
    if (leaderboard && leaderboard.raceId) {
        currentRaceId = leaderboard.raceId;
        displayLeaderboard(leaderboard);
    }
});

socket.on('race-update', (race) => {
    console.log('Race update received:', race);
    if (race.status === 'RUNNING') {
        // Kui võidusõit alustati, telli selle leaderboard'i
        if (!currentRaceId || currentRaceId === race.id) {
            currentRaceId = race.id;
            console.log('Subscribing to leaderboard for race:', race.id);
            socket.emit('subscribe-leaderboard', race.id);
        }
    } else if (race.status === 'FINISHED' && race.id === currentRaceId) {
        // Võidusõit lõppes, näita viimast leaderboard'i veel 5 sekundit
        setTimeout(() => {
            const container = document.getElementById('leaderboard-table');
            const noRace = document.getElementById('no-race');
            if (container) container.classList.add('hidden');
            if (noRace) {
                noRace.classList.remove('hidden');
                noRace.textContent = 'Võidusõit on lõppenud';
            }
        }, 5000);
    }
});

// Tellime leaderboard'i uuendusi
function subscribeToLeaderboard() {
    fetch('/api/public/running-races')
        .then(response => response.json())
        .then(runningRaces => {
            console.log('Running races:', runningRaces);
            if (runningRaces.length > 0) {
                // Telli esimese käimasoleva võidusõidu leaderboard'i
                const firstRunningRace = runningRaces[0];
                currentRaceId = firstRunningRace.id;
                console.log('Subscribing to leaderboard for race:', firstRunningRace.id);
                socket.emit('subscribe-leaderboard', firstRunningRace.id);
            } else {
                // Pole käimasolevaid võidusõitu
                const container = document.getElementById('leaderboard-table');
                const noRace = document.getElementById('no-race');
                if (container) container.classList.add('hidden');
                if (noRace) {
                    noRace.classList.remove('hidden');
                    noRace.textContent = 'Pole käimasolevaid võidusõitu';
                }
            }
        })
        .catch(error => {
            console.error('Error loading running races:', error);
        });
}

socket.on('connect', () => {
    console.log('Socket connected, subscribing to leaderboard');
    // Lehe laadimisel telli käimasolevate võidusõitude leaderboard'i
    subscribeToLeaderboard();
});

// Kui socket on juba ühendatud, telli kohe
setTimeout(() => {
    if (socket && socket.connected) {
        subscribeToLeaderboard();
    } else {
        // Oota socket ühendust
        socket.on('connect', () => {
            subscribeToLeaderboard();
        });
    }
}, 100);

