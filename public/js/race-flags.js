let currentRaceId = null;

function updateFlags(mode) {
    const flagsDisplay = document.getElementById('flags-display');
    
    // Eemalda kõik režiimi klassid
    flagsDisplay.className = 'flags-container';
    flagsDisplay.classList.add('flag');
    
    // Lisa õige režiimi klass
    switch (mode) {
        case 'SAFE':
            flagsDisplay.classList.add('safe');
            flagsDisplay.innerHTML = `
                <div class="flag-content">
                    <h1>SAFE</h1>
                    <p>Turvaline</p>
                </div>
            `;
            break;
        case 'CAUTION':
            flagsDisplay.classList.add('caution');
            flagsDisplay.innerHTML = `
                <div class="flag-content">
                    <h1>CAUTION</h1>
                    <p>Ettevaatust</p>
                </div>
            `;
            break;
        case 'DANGER':
            flagsDisplay.classList.add('danger');
            flagsDisplay.innerHTML = `
                <div class="flag-content">
                    <h1>DANGER</h1>
                    <p>Ohtlik</p>
                </div>
            `;
            break;
        case 'FINISHING':
            flagsDisplay.classList.add('finishing');
            flagsDisplay.innerHTML = `
                <div class="flag-content">
                    <h1>FINISHING</h1>
                    <p>Lõpetamine</p>
                </div>
            `;
            break;
        default:
            flagsDisplay.classList.add('safe');
            flagsDisplay.innerHTML = `
                <div class="flag-content">
                    <h1>SAFE</h1>
                    <p>Turvaline</p>
                </div>
            `;
    }
}

// Socket.IO kuulamine
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
        // Võidusõit lõppes - näita DANGER lippu
        updateFlags('DANGER');
    }
});

// Tellime lippude uuendusi
socket.on('race-update', (race) => {
    if (race.status === 'RUNNING') {
        socket.emit('subscribe-flags', race.id);
    }
});

