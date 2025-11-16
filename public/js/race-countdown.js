let currentRaceId = null;

function updateCountdown(remainingSeconds) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    document.getElementById('countdown-time').textContent = display;
    
    // Change color when time decreases
    const countdownTime = document.getElementById('countdown-time');
    if (remainingSeconds <= 60) {
        countdownTime.style.color = '#e74c3c';
    } else if (remainingSeconds <= 300) {
        countdownTime.style.color = '#f39c12';
    } else {
        countdownTime.style.color = '#764ba2';
    }
}

// Socket.IO listening
socket.on('countdown', (data) => {
    if (data.isRunning) {
        currentRaceId = data.raceId;
        updateCountdown(data.remainingSeconds);
    } else {
        // Race finished
        updateCountdown(0);
        setTimeout(() => {
            document.getElementById('countdown-time').textContent = '00:00';
            const label = document.querySelector('.countdown-label');
            if (label) {
                label.textContent = 'Race finished';
            }
        }, 2000);
    }
});

// Subscribe to timer updates
socket.on('race-update', (race) => {
    if (race.status === 'RUNNING') {
        currentRaceId = race.id;
        socket.emit('subscribe-countdown', race.id);
    } else if (race.status === 'FINISHED' && race.id === currentRaceId) {
        // Race finished
        currentRaceId = null;
        updateCountdown(0);
    }
});

// On page load, subscribe to running races' countdown
function subscribeToCountdown() {
    fetch('/api/public/running-races')
        .then(response => response.json())
        .then(runningRaces => {
            if (runningRaces.length > 0) {
                // Subscribe to first running race's countdown
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

// If socket is already connected, subscribe immediately
if (socket && socket.connected) {
    subscribeToCountdown();
}
