const RECEPTIONIST_KEY = '8ded6076';
let races = [];

function checkAccessKey() {
    const key = document.getElementById('access-key').value.trim();
    
    if (key === RECEPTIONIST_KEY) {
        accessKey = key;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        loadRaces();
    } else {
        document.getElementById('login-error').textContent = 'Vale ligipääsukood';
        setTimeout(() => {
            document.getElementById('login-error').textContent = '';
        }, 3000);
    }
}

async function loadRaces() {
    try {
        races = await apiRequest('/api/races');
        displayRaces();
    } catch (error) {
        console.error('Error loading races:', error);
        alert('Viga võidusõitude laadimisel: ' + error.message);
    }
}

function displayRaces() {
    const container = document.getElementById('races-list');
    
    // Näita PLANNED ja FINISHED võidusõitu
    const plannedRaces = races.filter(r => r.status === 'PLANNED');
    const finishedRaces = races.filter(r => r.status === 'FINISHED').sort((a, b) => {
        // Sorteeri lõppemise aja järgi (uusimad esimestena)
        const aTime = a.endTime ? new Date(a.endTime) : new Date(0);
        const bTime = b.endTime ? new Date(b.endTime) : new Date(0);
        return bTime - aTime;
    });
    
    if (plannedRaces.length === 0 && finishedRaces.length === 0) {
        container.innerHTML = '<p>Pole ühtegi võidusõitu</p>';
        return;
    }
    
    let html = '';
    
    // Näita PLANNED võidusõitu
    if (plannedRaces.length > 0) {
        html += '<h3 style="margin-top: 20px; color: #667eea;">Planeeritud võidusõidud</h3>';
        html += plannedRaces.map(race => {
        const driversHtml = race.drivers.length > 0 
            ? `<div class="drivers-list">
                <strong>Sõitjad:</strong>
                <ul>
                    ${race.drivers.map(driver => `
                        <li>
                            ${driver.name} - Auto #${driver.carNumber}
                            <button onclick="removeDriver(${race.id}, ${driver.id})" class="remove-driver-btn">🗑️</button>
                        </li>
                    `).join('')}
                </ul>
            </div>`
            : '<p class="no-drivers">Pole veel sõitjaid</p>';
        
        return `
        <div class="race-item" data-race-id="${race.id}">
            <div class="race-header">
                <div>
                    <h3>${race.name}</h3>
                    <span class="race-status ${race.status.toLowerCase()}">${race.status}</span>
                </div>
                <div>
                    <button onclick="deleteRace(${race.id})">Kustuta võidusõit</button>
                </div>
            </div>
            <div class="race-drivers-section">
                ${driversHtml}
                <div class="add-driver-form">
                    <input type="text" id="driver-name-${race.id}" placeholder="Sõitja nimi" />
                    <input type="number" id="car-number-${race.id}" placeholder="Auto number" min="1" />
                    <button onclick="addDriverToRace(${race.id})">Lisa sõitja</button>
                </div>
            </div>
        </div>
    `;
        }).join('');
    }
    
    // Näita FINISHED võidusõitu
    if (finishedRaces.length > 0) {
        html += '<h3 style="margin-top: 30px; color: #95a5a6;">Lõppenud võidusõidud</h3>';
        html += finishedRaces.map(race => {
            const driversHtml = race.drivers && race.drivers.length > 0 
                ? `<div class="drivers-list">
                    <strong>Sõitjad:</strong>
                    <ul>
                        ${race.drivers.map(driver => `
                            <li>
                                ${driver.name} - Auto #${driver.carNumber}
                            </li>
                        `).join('')}
                    </ul>
                </div>`
                : '<p class="no-drivers">Pole sõitjaid</p>';
            
            const endTime = race.endTime ? new Date(race.endTime).toLocaleString('et-EE') : 'Tundmatu';
            
            return `
            <div class="race-item finished-race" data-race-id="${race.id}">
                <div class="race-header">
                    <div>
                        <h3>${race.name}</h3>
                        <span class="race-status ${race.status.toLowerCase()}">${race.status}</span>
                        <p style="margin-top: 5px; color: #666; font-size: 0.9em;">Lõppes: ${endTime}</p>
                    </div>
                </div>
                <div class="race-drivers-section">
                    ${driversHtml}
                </div>
            </div>
        `;
        }).join('');
    }
    
    container.innerHTML = html;
}

async function createRace() {
    const name = document.getElementById('race-name').value.trim();
    
    if (!name) {
        alert('Sisesta võidusõidu nimi');
        return;
    }
    
    try {
        const race = await apiRequest('/api/races', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        
        document.getElementById('race-name').value = '';
        await loadRaces();
    } catch (error) {
        alert('Viga võidusõidu loomisel: ' + error.message);
    }
}

async function deleteRace(raceId) {
    if (!confirm('Kas oled kindel, et soovid selle võidusõidu kustutada?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/races/${raceId}`, {
            method: 'DELETE'
        });
        
        await loadRaces();
    } catch (error) {
        alert('Viga võidusõidu kustutamisel: ' + error.message);
    }
}

async function addDriverToRace(raceId) {
    const name = document.getElementById(`driver-name-${raceId}`).value.trim();
    const carNumber = parseInt(document.getElementById(`car-number-${raceId}`).value);
    
    if (!name) {
        alert('Sisesta sõitja nimi');
        return;
    }
    
    if (!carNumber || carNumber < 1) {
        alert('Sisesta kehtiv auto number');
        return;
    }
    
    try {
        // Lisa sõitja
        await apiRequest(`/api/races/${raceId}/drivers`, {
            method: 'POST',
            body: JSON.stringify({ name, carNumber })
        });
        
        // Tühjenda väljad
        document.getElementById(`driver-name-${raceId}`).value = '';
        document.getElementById(`car-number-${raceId}`).value = '';
        
        // Värskenda võidusõitude nimekiri serverist, et saada värskeid andmeid
        await loadRaces();
    } catch (error) {
        alert('Viga sõitja lisamisel: ' + error.message);
    }
}

// Funktsioon on eemaldatud, sest sõitjad näidatakse nüüd otse displayRaces() funktsioonis

async function removeDriver(raceId, entryId) {
    if (!confirm('Kas oled kindel, et soovid selle sõitja eemaldada?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/races/${raceId}/drivers/${entryId}`, {
            method: 'DELETE'
        });
        
        // Värskenda võidusõitude nimekiri
        await loadRaces();
    } catch (error) {
        alert('Viga sõitja eemaldamisel: ' + error.message);
    }
}

// Socket.IO kuulamine
socket.on('race-update', (race) => {
    const index = races.findIndex(r => r.id === race.id);
    
    if (race.deleted) {
        // Võidusõit kustutati
        races = races.filter(r => r.id !== race.id);
        displayRaces();
        return;
    }
    
    if (index !== -1) {
        // Võidusõit uuendati
        races[index] = race;
        
        // Kui võidusõit muutus RUNNING-uks, eemalda see front-desk lehelt
        if (race.status !== 'PLANNED') {
            races = races.filter(r => r.id !== race.id || r.status === 'PLANNED');
        }
        
        displayRaces();
    } else if (race.status === 'PLANNED') {
        // Uus PLANNED võidusõit lisati
        races.push(race);
        displayRaces();
    }
});

socket.on('next-race', () => {
    // Võidusõit uuendati
});

