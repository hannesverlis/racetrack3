function displayNextRace(nextRace) {
    const noRace = document.getElementById('no-race');
    const raceInfo = document.getElementById('race-info');
    const raceName = document.getElementById('race-name');
    const driversList = document.getElementById('drivers-list');
    
    if (!nextRace.id) {
        noRace.classList.remove('hidden');
        raceInfo.classList.add('hidden');
        noRace.textContent = nextRace.message || 'Pole ühtegi planeeritud võidusõitu';
        return;
    }
    
    noRace.classList.add('hidden');
    raceInfo.classList.remove('hidden');
    
    raceName.textContent = nextRace.name;
    
    if (nextRace.drivers.length === 0) {
        driversList.innerHTML = '<p>Pole ühtegi sõitjat</p>';
    } else {
        driversList.innerHTML = `
            <ul style="list-style: none; padding: 0;">
                ${nextRace.drivers.map(driver => `
                    <li style="padding: 10px; margin: 5px 0; background: white; border-radius: 5px; border-left: 4px solid #667eea;">
                        <strong>${driver.name}</strong> - Auto #${driver.carNumber}
                    </li>
                `).join('')}
            </ul>
        `;
    }
}

// Socket.IO kuulamine
socket.on('next-race', (nextRace) => {
    displayNextRace(nextRace);
});

// Tellime järgmise võidusõidu uuendusi
socket.emit('subscribe-next-race');

// Laadi algselt
fetch('/api/public/next-race')
    .then(res => res.json())
    .then(data => displayNextRace(data))
    .catch(err => console.error('Error loading next race:', err));

