const LAP_OBSERVER_KEY = '662e0f6c';
let races = [];
let currentRaceId = null;
let lapStats = {};

function checkAccessKey() {
    const key = document.getElementById('access-key').value.trim();
    
    if (key === LAP_OBSERVER_KEY) {
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
        // Kasuta avalikku endpoint'i käimasolevate võidusõitude jaoks
        races = await apiRequest('/api/public/running-races');
        updateRaceSelect();
    } catch (error) {
        console.error('Error loading races:', error);
        alert('Viga võidusõitude laadimisel: ' + error.message);
    }
}

function updateRaceSelect() {
    const select = document.getElementById('race-select');
    
    // Kuna races on juba filtreeritud RUNNING võidusõidud, kasuta otse races massiivi
    select.innerHTML = '<option value="">-- Vali võidusõit --</option>' +
        races.map(race => `<option value="${race.id}">${race.name}</option>`).join('');
    
    // Kui pole käimasolevaid võidusõitu, näita teadet
    if (races.length === 0) {
        console.log('Pole käimasolevaid võidusõitu');
    }
}

function loadRaceDrivers() {
    const raceId = parseInt(document.getElementById('race-select').value);
    
    if (!raceId) {
        document.getElementById('lap-buttons-section').classList.add('hidden');
        document.getElementById('lap-stats-section').classList.add('hidden');
        currentRaceId = null;
        return;
    }
    
    const race = races.find(r => r.id === raceId);
    if (!race || race.status !== 'RUNNING') {
        alert('Valitud võidusõit ei ole aktiivne');
        return;
    }
    
    currentRaceId = raceId;
    displayLapButtons(race.drivers);
    document.getElementById('lap-buttons-section').classList.remove('hidden');
    document.getElementById('lap-stats-section').classList.remove('hidden');
    
    // Telli leaderboard'i kohe, et näidata statistikat
    socket.emit('subscribe-leaderboard', raceId);
    
    // Näita algne statistika (tühi või olemasolev)
    const container = document.getElementById('lap-stats');
    container.innerHTML = `
        <h3>Edetabel</h3>
        <p>Laen andmeid...</p>
        <h3 style="margin-top: 30px;">Ringide ajalugu</h3>
        <div id="lap-history">
            <p>Pole veel ringe registreeritud</p>
        </div>
    `;
}

function displayLapButtons(drivers) {
    const container = document.getElementById('lap-buttons');
    
    container.innerHTML = drivers.map(driver => `
        <button class="lap-button" onclick="registerLap(${driver.carNumber})">
            Auto #${driver.carNumber}<br>
            <small>${driver.name}</small>
        </button>
    `).join('');
}

async function registerLap(carNumber) {
    if (!currentRaceId) {
        alert('Vali esmalt võidusõit');
        return;
    }
    
    try {
        await apiRequest('/api/laps', {
            method: 'POST',
            body: JSON.stringify({ raceId: currentRaceId, carNumber })
        });
        
        // Nupu visuaalne tagasiside
        const buttons = document.querySelectorAll('.lap-button');
        buttons.forEach(btn => {
            if (btn.textContent.includes(`Auto #${carNumber}`)) {
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    btn.style.transform = '';
                }, 200);
            }
        });
    } catch (error) {
        alert('Viga ringi registreerimisel: ' + error.message);
    }
}

let lapHistory = {}; // raceId -> { carNumber -> [laps] }

function updateLapStats(leaderboard) {
    if (leaderboard.raceId !== currentRaceId) return;
    
    const container = document.getElementById('lap-stats');
    
    // Näita nii leaderboard'i kui ka ringide ajalugu
    let html = '';
    
    if (leaderboard.entries.length > 0) {
        html += `
            <h3>Edetabel</h3>
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>Koht</th>
                        <th>Sõitja</th>
                        <th>Auto #</th>
                        <th>Ringe</th>
                        <th>Kiireim ring</th>
                    </tr>
                </thead>
                <tbody>
                    ${leaderboard.entries.map((entry, index) => `
                        <tr>
                            <td class="position">${index + 1}</td>
                            <td>${entry.driverName}</td>
                            <td>#${entry.carNumber}</td>
                            <td>${entry.currentLap}</td>
                            <td>${entry.fastestLap ? formatLapTime(entry.fastestLap) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        html += '<p>Pole veel ringe registreeritud</p>';
    }
    
    html += '<h3 style="margin-top: 30px;">Ringide ajalugu</h3>';
    html += '<div id="lap-history"></div>';
    
    container.innerHTML = html;
    
    // Näita ringide ajalugu
    displayLapHistory();
}

function displayLapHistory() {
    const historyContainer = document.getElementById('lap-history');
    if (!historyContainer) {
        console.log('lap-history element not found');
        return;
    }
    
    if (!currentRaceId) {
        historyContainer.innerHTML = '<p>Vali võidusõit</p>';
        return;
    }
    
    if (!lapHistory[currentRaceId] || Object.keys(lapHistory[currentRaceId]).length === 0) {
        historyContainer.innerHTML = '<p>Pole veel ringe registreeritud</p>';
        return;
    }
    
    // Kogume kõik ringid ühte massiivi koos ajaga
    const allLaps = [];
    Object.keys(lapHistory[currentRaceId]).forEach(carNumber => {
        lapHistory[currentRaceId][carNumber].forEach((lap) => {
            allLaps.push({
                carNumber: parseInt(carNumber),
                lapNumber: lap.lapNumber,
                lapTime: lap.lapMs,
                timestamp: lap.timestamp,
                driverName: lap.driverName || `Auto #${carNumber}`
            });
        });
    });
    
    // Sorteeri ajastamise järgi (uusimad esimestena)
    allLaps.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (allLaps.length === 0) {
        historyContainer.innerHTML = '<p>Pole veel ringe registreeritud</p>';
        return;
    }
    
    historyContainer.innerHTML = `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Aeg</th>
                    <th>Sõitja</th>
                    <th>Auto #</th>
                    <th>Ring #</th>
                    <th>Ringi aeg</th>
                </tr>
            </thead>
            <tbody>
                ${allLaps.map(lap => `
                    <tr>
                        <td>${formatTimestamp(lap.timestamp)}</td>
                        <td>${lap.driverName || 'Tundmatu'}</td>
                        <td>#${lap.carNumber}</td>
                        <td>${lap.lapNumber}</td>
                        <td>${formatLapTime(lap.lapTime)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('et-EE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatLapTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds}.${String(milliseconds).padStart(3, '0')}s`;
}

// Socket.IO kuulamine
socket.on('race-update', (race) => {
    // Uuenda ainult käimasolevaid võidusõitu
    if (race.status === 'RUNNING') {
        const index = races.findIndex(r => r.id === race.id);
        if (index !== -1) {
            races[index] = race;
        } else {
            races.push(race);
        }
        updateRaceSelect();
        
        // Kui valitud võidusõit uuendati, uuenda ka sõitjad
        if (race.id === currentRaceId) {
            displayLapButtons(race.drivers);
        }
    } else {
        // Võidusõit lõppes või kustutati
        races = races.filter(r => r.id !== race.id);
        updateRaceSelect();
        
        if (race.id === currentRaceId) {
            document.getElementById('lap-buttons-section').classList.add('hidden');
            document.getElementById('lap-stats-section').classList.add('hidden');
            currentRaceId = null;
        }
    }
});

socket.on('leaderboard', (leaderboard) => {
    updateLapStats(leaderboard);
});

socket.on('laps', (data) => {
    console.log('Laps event received:', data);
    if (data.raceId === currentRaceId && data.lap) {
        // Lisa ring ajalukku
        if (!lapHistory[currentRaceId]) {
            lapHistory[currentRaceId] = {};
        }
        if (!lapHistory[currentRaceId][data.lap.carNumber]) {
            lapHistory[currentRaceId][data.lap.carNumber] = [];
        }
        
        // Leia sõitja nimi
        const race = races.find(r => r.id === currentRaceId);
        const driver = race ? race.drivers.find(d => d.carNumber === data.lap.carNumber) : null;
        const driverName = driver ? driver.name : null;
        
        const lapData = {
            lapNumber: data.lap.lapNumber,
            lapMs: data.lap.lapMs,
            timestamp: data.lap.timestamp,
            driverName: driverName
        };
        
        console.log('Adding lap to history:', lapData);
        lapHistory[currentRaceId][data.lap.carNumber].push(lapData);
        
        // Uuenda ringide ajalugu
        displayLapHistory();
    } else {
        console.log('Lap event ignored - raceId mismatch or no lap data', {
            currentRaceId,
            receivedRaceId: data.raceId,
            hasLap: !!data.lap
        });
    }
});

