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
        document.getElementById('login-error').textContent = 'Invalid access code';
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
        alert('Error loading races: ' + error.message);
    }
}

function displayRaces() {
    const container = document.getElementById('races-list');
    
    // Show PLANNED and FINISHED races
    const plannedRaces = races.filter(r => r.status === 'PLANNED');
    const finishedRaces = races.filter(r => r.status === 'FINISHED').sort((a, b) => {
        // Sort by end time (newest first)
        const aTime = a.endTime ? new Date(a.endTime) : new Date(0);
        const bTime = b.endTime ? new Date(b.endTime) : new Date(0);
        return bTime - aTime;
    });
    
    if (plannedRaces.length === 0 && finishedRaces.length === 0) {
        container.innerHTML = '<p>No races</p>';
        return;
    }
    
    let html = '';
    
    // Show PLANNED races
    if (plannedRaces.length > 0) {
        html += '<h3 style="margin-top: 20px; color: #667eea;">Planned Races</h3>';
        html += plannedRaces.map(race => {
        const driversHtml = race.drivers.length > 0 
            ? `<div class="drivers-list">
                <strong>Drivers:</strong>
                <ul>
                    ${race.drivers.map(driver => `
                        <li>
                            ${driver.name} - Car #${driver.carNumber}
                            <button onclick="removeDriver(${race.id}, ${driver.id})" class="remove-driver-btn">🗑️</button>
                        </li>
                    `).join('')}
                </ul>
            </div>`
            : '<p class="no-drivers">No drivers yet</p>';
        
        const driversCount = race.drivers ? race.drivers.length : 0;
        const maxDrivers = 8;
        const driversInfo = `<p style="margin-top: 10px; color: #666; font-size: 0.9em;">
            Drivers: <strong>${driversCount}/${maxDrivers}</strong>
            ${driversCount >= maxDrivers ? '<span style="color: #e74c3c;">(full)</span>' : ''}
        </p>`;
        
        return `
        <div class="race-item" data-race-id="${race.id}">
            <div class="race-header">
                <div>
                    <h3>${race.name}</h3>
                    <span class="race-status ${race.status.toLowerCase()}">${race.status}</span>
                    ${driversInfo}
                </div>
                <div>
                    <button onclick="deleteRace(${race.id})">Delete Race</button>
                </div>
            </div>
            <div class="race-drivers-section">
                ${driversHtml}
                ${driversCount < maxDrivers ? `
                <div class="add-driver-form">
                    <input type="text" id="driver-name-${race.id}" placeholder="Driver name" />
                    <input type="number" id="car-number-${race.id}" placeholder="Car number" min="1" />
                    <button onclick="addDriverToRace(${race.id})">Add Driver</button>
                </div>
                ` : '<p style="color: #e74c3c; margin-top: 15px; font-weight: bold;">⚠️ Maximum number of drivers (8) reached</p>'}
            </div>
        </div>
    `;
        }).join('');
    }
    
    // Show FINISHED races
    if (finishedRaces.length > 0) {
        html += '<h3 style="margin-top: 30px; color: #95a5a6;">Finished Races</h3>';
        html += finishedRaces.map(race => {
            const driversHtml = race.drivers && race.drivers.length > 0 
                ? `<div class="drivers-list">
                    <strong>Drivers:</strong>
                    <ul>
                        ${race.drivers.map(driver => `
                            <li>
                                ${driver.name} - Car #${driver.carNumber}
                            </li>
                        `).join('')}
                    </ul>
                </div>`
                : '<p class="no-drivers">No drivers</p>';
            
            const endTime = race.endTime ? new Date(race.endTime).toLocaleString('en-US') : 'Unknown';
            
            return `
            <div class="race-item finished-race" data-race-id="${race.id}">
                <div class="race-header">
                    <div>
                        <h3>${race.name}</h3>
                        <span class="race-status ${race.status.toLowerCase()}">${race.status}</span>
                        <p style="margin-top: 5px; color: #666; font-size: 0.9em;">Finished: ${endTime}</p>
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
        alert('Enter race name');
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
        alert('Error creating race: ' + error.message);
    }
}

async function deleteRace(raceId) {
    if (!confirm('Are you sure you want to delete this race?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/races/${raceId}`, {
            method: 'DELETE'
        });
        
        await loadRaces();
    } catch (error) {
        alert('Error deleting race: ' + error.message);
    }
}

async function addDriverToRace(raceId) {
    const name = document.getElementById(`driver-name-${raceId}`).value.trim();
    const carNumber = parseInt(document.getElementById(`car-number-${raceId}`).value);
    
    // Check maximum number of drivers locally
    const race = races.find(r => r.id === raceId);
    const MAX_DRIVERS = 8;
    
    if (race && race.drivers && race.drivers.length >= MAX_DRIVERS) {
        alert(`Maximum of ${MAX_DRIVERS} drivers can be registered per race`);
        return;
    }
    
    if (!name) {
        alert('Enter driver name');
        return;
    }
    
    if (!carNumber || carNumber < 1) {
        alert('Enter valid car number');
        return;
    }
    
    try {
        // Add driver
        await apiRequest(`/api/races/${raceId}/drivers`, {
            method: 'POST',
            body: JSON.stringify({ name, carNumber })
        });
        
        // Clear fields
        document.getElementById(`driver-name-${raceId}`).value = '';
        document.getElementById(`car-number-${raceId}`).value = '';
        
        // Refresh race list from server to get fresh data
        await loadRaces();
    } catch (error) {
        alert('Error adding driver: ' + error.message);
    }
}

// Function removed, drivers are now displayed directly in displayRaces() function

async function removeDriver(raceId, entryId) {
    if (!confirm('Are you sure you want to remove this driver?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/races/${raceId}/drivers/${entryId}`, {
            method: 'DELETE'
        });
        
        // Refresh race list
        await loadRaces();
    } catch (error) {
        alert('Error removing driver: ' + error.message);
    }
}

// Socket.IO listening
socket.on('race-update', (race) => {
    const index = races.findIndex(r => r.id === race.id);
    
    if (race.deleted) {
        // Race was deleted
        races = races.filter(r => r.id !== race.id);
        displayRaces();
        return;
    }
    
    if (index !== -1) {
        // Race was updated
        races[index] = race;
        
        // If race changed to RUNNING, remove it from front-desk page
        if (race.status !== 'PLANNED') {
            races = races.filter(r => r.id !== race.id || r.status === 'PLANNED');
        }
        
        displayRaces();
    } else if (race.status === 'PLANNED') {
        // New PLANNED race was added
        races.push(race);
        displayRaces();
    }
});

socket.on('next-race', () => {
    // Race was updated
});
