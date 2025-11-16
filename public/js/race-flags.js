let currentRaceId = null;

function updateFlags(mode) {
    const flagsDisplay = document.getElementById('flags-display');
    
    // Remove all mode classes
    flagsDisplay.className = 'flags-container';
    flagsDisplay.classList.add('flag');
    
    // Add correct mode class
    switch (mode) {
        case 'SAFE':
            flagsDisplay.classList.add('safe');
            flagsDisplay.innerHTML = `
                <div class="flag-content">
                    <h1>SAFE</h1>
                    <p>Safe</p>
                </div>
            `;
            break;
        case 'CAUTION':
            flagsDisplay.classList.add('caution');
            flagsDisplay.innerHTML = `
                <div class="flag-content">
                    <h1>CAUTION</h1>
                    <p>Caution</p>
                </div>
            `;
            break;
        case 'DANGER':
            flagsDisplay.classList.add('danger');
            flagsDisplay.innerHTML = `
                <div class="flag-content">
                    <h1>DANGER</h1>
                    <p>Danger</p>
                </div>
            `;
            break;
        case 'FINISHING':
            flagsDisplay.classList.add('finishing');
            flagsDisplay.innerHTML = `
                <div class="flag-content">
                    <div class="flag-checkered"></div>
                    <h1>FINISHING</h1>
                    <p>Finishing</p>
                </div>
            `;
            break;
        default:
            flagsDisplay.classList.add('safe');
            flagsDisplay.innerHTML = `
                <div class="flag-content">
                    <h1>SAFE</h1>
                    <p>Safe</p>
                </div>
            `;
    }
}

// Socket.IO listening
socket.on('flags', (data) => {
    currentRaceId = data.raceId;
    updateFlags(data.mode);
});

socket.on('race-update', (race) => {
    if (race.status === 'RUNNING') {
        currentRaceId = race.id;
        updateFlags(race.mode);
        socket.emit('subscribe-flags', race.id);
    } else if (race.status === 'FINISHED' && race.id === currentRaceId) {
        // Race finished - show FINISHING flag
        updateFlags('FINISHING');
    }
});

// Subscribe to flag updates
socket.on('race-update', (race) => {
    if (race.status === 'RUNNING') {
        socket.emit('subscribe-flags', race.id);
    }
});
