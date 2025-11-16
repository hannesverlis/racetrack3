let lastFinishedRaceId = null;

function displayNextRace(nextRace) {
    const noRace = document.getElementById('no-race');
    const raceInfo = document.getElementById('race-info');
    const raceName = document.getElementById('race-name');
    const driversList = document.getElementById('drivers-list');
    const paddockMessage = document.getElementById('paddock-message');
    
    // If there's a paddock message, hide it when next race is available
    if (paddockMessage) {
        paddockMessage.classList.add('hidden');
    }
    
    if (!nextRace.id) {
        noRace.classList.remove('hidden');
        raceInfo.classList.add('hidden');
        noRace.textContent = nextRace.message || 'No planned races';
        return;
    }
    
    noRace.classList.add('hidden');
    raceInfo.classList.remove('hidden');
    
    raceName.textContent = nextRace.name;
    
    if (nextRace.drivers.length === 0) {
        driversList.innerHTML = '<p>No drivers</p>';
    } else {
        driversList.innerHTML = `
            <ul style="list-style: none; padding: 0;">
                ${nextRace.drivers.map(driver => `
                    <li style="padding: 10px; margin: 5px 0; background: white; border-radius: 5px; border-left: 4px solid #667eea;">
                        <strong>${driver.name}</strong> - Car #${driver.carNumber}
                    </li>
                `).join('')}
            </ul>
        `;
    }
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
    displayNextRace(nextRace);
});

socket.on('race-update', (race) => {
    // If race finished, show paddock message
    if (race.status === 'FINISHED') {
        lastFinishedRaceId = race.id;
        showPaddockMessage();
        
        // Hide paddock message after 10 seconds or when next race is available
        setTimeout(() => {
            // Check if there's a new next race
            fetch('/api/public/next-race')
                .then(res => res.json())
                .then(data => {
                    if (data.id && data.id !== lastFinishedRaceId) {
                        displayNextRace(data);
                    }
                })
                .catch(err => console.error('Error loading next race:', err));
        }, 10000); // 10 seconds
    }
});

// Subscribe to next race updates
socket.emit('subscribe-next-race');

// Load initially
fetch('/api/public/next-race')
    .then(res => res.json())
    .then(data => displayNextRace(data))
    .catch(err => console.error('Error loading next race:', err));
