let currentRaceId = null;

function updateCountdown(remainingSeconds) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    document.getElementById('countdown-time').textContent = display;
    
    // Muuda värv, kui aeg väheneb
    const countdownTime = document.getElementById('countdown-time');
    if (remainingSeconds <= 60) {
        countdownTime.style.color = '#e74c3c';
    } else if (remainingSeconds <= 300) {
        countdownTime.style.color = '#f39c12';
    } else {
        countdownTime.style.color = '#764ba2';
    }
}

// Socket.IO kuulamine
socket.on('countdown', (data) => {
    if (data.isRunning) {
        currentRaceId = data.raceId;
        updateCountdown(data.remainingSeconds);
    } else {
        // Võidusõit lõppes
        updateCountdown(0);
        setTimeout(() => {
            document.getElementById('countdown-time').textContent = '00:00';
            const label = document.querySelector('.countdown-label');
            if (label) {
                label.textContent = 'Võidusõit on lõppenud';
            }
        }, 2000);
    }
});

// Tellime ajastaja uuendusi
socket.on('race-update', (race) => {
    if (race.status === 'RUNNING') {
        currentRaceId = race.id;
        socket.emit('subscribe-countdown', race.id);
    } else if (race.status === 'FINISHED' && race.id === currentRaceId) {
        // Võidusõit lõppes
        currentRaceId = null;
        updateCountdown(0);
    }
});

// Lehe laadimisel telli käimasolevate võidusõitude countdown'i
function subscribeToCountdown() {
    fetch('/api/public/running-races')
        .then(response => response.json())
        .then(runningRaces => {
            if (runningRaces.length > 0) {
                // Telli esimese käimasoleva võidusõidu countdown'i
                const firstRunningRace = runningRaces[0];
                currentRaceId = firstRunningRace.id;
                socket.emit('subscribe-countdown', firstRunningRace.id);
            }
        })
        .catch(error => {
            console.error('Error loading running races:', error);
        });
}

socket.on('connect', () => {
    subscribeToCountdown();
});

// Kui socket on juba ühendatud, telli kohe
if (socket && socket.connected) {
    subscribeToCountdown();
}

