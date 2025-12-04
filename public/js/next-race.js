let lastFinishedRaceId = null;

function displayNextRace(nextRace) {
    const noRace = document.getElementById('no-race');
    const raceInfo = document.getElementById('race-info');
    const paddockMessage = document.getElementById('paddock-message');
    
    // If there's a paddock message, hide it when next race is available
    if (paddockMessage) {
        paddockMessage.classList.add('hidden');
    }
    
    // Check if we have races array (new format) or single race (old format)
    const racesToShow = nextRace.races || (nextRace.id ? [nextRace] : []);
    
    if (racesToShow.length === 0) {
        noRace.classList.remove('hidden');
        raceInfo.classList.add('hidden');
        noRace.textContent = nextRace.message || 'No planned races';
        return;
    }
    
    noRace.classList.add('hidden');
    raceInfo.classList.remove('hidden');
    
    // Display all planned races
    raceInfo.innerHTML = `
        ${racesToShow.map((race, index) => `
            <div class="race-item" style="margin-bottom: 30px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="margin-top: 0; color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                    ${index === 0 ? '🏁 Next Race' : `Race ${index + 1}`}: ${race.name}
                </h2>
                <h3 style="margin-top: 15px; margin-bottom: 10px; color: #555;">Drivers</h3>
                ${race.drivers.length === 0 ? 
                    '<p style="color: #999; font-style: italic;">No drivers registered</p>' :
                    `<ul style="list-style: none; padding: 0; margin: 0;">
                        ${race.drivers.map(driver => `
                            <li style="padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #667eea;">
                                <strong>${driver.name}</strong> - Car #${driver.carNumber}
                            </li>
                        `).join('')}
                    </ul>`
                }
            </div>
        `).join('')}
    `;
}

function showPaddockMessage() {
    const paddockMessage = document.getElementById('paddock-message');
    const raceInfo = document.getElementById('race-info');
    const noRace = document.getElementById('no-race');
    
    if (paddockMessage) {
        paddockMessage.classList.remove('hidden');
        if (raceInfo) raceInfo.classList.add('hidden');
        if (noRace) noRace.classList.add('hidden');
    }
}

// Socket.IO listening
socket.on('next-race', (nextRace) => {
    // Always update display when next-race event is received
    // This ensures that if there's no next race, we show "No planned races" instead of paddock message
    displayNextRace(nextRace);
});

socket.on('race-update', (race) => {
    // If race finished, show paddock message temporarily
    if (race.status === 'FINISHED') {
        lastFinishedRaceId = race.id;
        showPaddockMessage();
        
        // After a short delay, check for next race
        // The next-race Socket.IO event will update the display automatically
        setTimeout(() => {
            // Request next race update via Socket.IO
            socket.emit('subscribe-next-race');
        }, 2000); // 2 seconds - shorter delay
    }
});

// Subscribe to next race updates
socket.on('connect', () => {
    socket.emit('subscribe-next-race');
});

// Load initially via Socket.IO
socket.emit('subscribe-next-race');
