const SAFETY_OFFICIAL_KEY = 'a2d393bc';
let currentRaceId = null;
let countdownInterval = null;

function checkAccessKey() {
    const key = document.getElementById('access-key').value.trim();
    
    if (key === SAFETY_OFFICIAL_KEY) {
        accessKey = key;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        loadNextRace();
    } else {
        document.getElementById('login-error').textContent = 'Vale ligipääsukood';
        setTimeout(() => {
            document.getElementById('login-error').textContent = '';
        }, 3000);
    }
}

async function loadNextRace() {
    try {
        const nextRace = await apiRequest('/api/public/next-race');
        displayNextRace(nextRace);
    } catch (error) {
        console.error('Error loading next race:', error);
    }
}

function displayNextRace(nextRace) {
    const container = document.getElementById('next-race-info');
    
    if (!nextRace.id) {
        container.innerHTML = '<p>' + (nextRace.message || 'Pole ühtegi planeeritud võidusõitu') + '</p>';
        document.getElementById('start-race-btn').classList.add('hidden');
        currentRaceId = null;
        return;
    }
    
    // Kontrolli, kas see võidusõit on endiselt PLANNED
    // Kui mitte, siis ei näita seda
    container.innerHTML = `
        <h3>${nextRace.name}</h3>
        <p><strong>Sõitjad:</strong> ${nextRace.drivers.length}</p>
        ${nextRace.drivers.length > 0 ? `
        <ul>
            ${nextRace.drivers.map(d => `<li>${d.name} - Auto #${d.carNumber}</li>`).join('')}
        </ul>
        ` : '<p>Pole ühtegi sõitjat</p>'}
    `;
    
    // Näita nuppu ainult siis, kui on sõitjaid
    if (nextRace.drivers.length > 0) {
        document.getElementById('start-race-btn').classList.remove('hidden');
    } else {
        document.getElementById('start-race-btn').classList.add('hidden');
    }
    
    currentRaceId = nextRace.id;
}

async function startRace() {
    if (!currentRaceId) {
        alert('Pole võidusõitu, mida alustada');
        return;
    }
    
    // Kontrolli enne, kas järgmine võidusõit on endiselt PLANNED
    try {
        const nextRace = await apiRequest('/api/public/next-race');
        
        // Kui järgmine võidusõit ei ole meie valitud võidusõit või pole enam PLANNED
        if (!nextRace.id || nextRace.id !== currentRaceId) {
            alert('Võidusõit on juba alustatud või muutunud. Värskendan nimekirja...');
            await loadNextRace();
            return;
        }
        
        // Kontrolli, kas on sõitjaid
        if (!nextRace.drivers || nextRace.drivers.length === 0) {
            alert('Võidusõit peab omama vähemalt ühte sõitjat!');
            return;
        }
    } catch (error) {
        console.error('Error checking next race:', error);
        // Jätka siiski võidusõidu alustamisega
    }
    
    try {
        await apiRequest(`/api/control/${currentRaceId}/start`, {
            method: 'POST'
        });
        
        // Värskenda võidusõitu serverist, et veenduda, et staatus on õige
        await loadRacesAndUpdate();
        
        // Socket.IO sündmus uuendab lehe automaatselt
    } catch (error) {
        alert('Viga võidusõidu alustamisel: ' + error.message);
        // Värskenda järgmist võidusõitu, kui võidusõit ei saanud alustatud
        await loadNextRace();
    }
}

async function loadRacesAndUpdate() {
    try {
        // Oota veidi, et server saaks võidusõidu uuendada
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Kontrolli, kas võidusõit on nüüd käimas
        const runningRaces = await apiRequest('/api/public/running-races');
        const currentRace = runningRaces.find(r => r.id === currentRaceId);
        
        if (currentRace && currentRace.status === 'RUNNING') {
            // Võidusõit on käimas, näita seda
            if (document.getElementById('next-race-section') && !document.getElementById('next-race-section').classList.contains('hidden')) {
                document.getElementById('next-race-section').classList.add('hidden');
                document.getElementById('current-race-section').classList.remove('hidden');
            }
            displayCurrentRace(currentRace);
            socket.emit('subscribe-countdown', currentRace.id);
        } else {
            // Võidusõit ei ole käimas, laadi järgmine PLANNED võidusõit
            await loadNextRace();
        }
    } catch (error) {
        console.error('Error loading races:', error);
        // Võidusõit võib olla käimas, aga me ei saanud seda kontrollida
        // Socket.IO sündmus peaks lehe uuendama
    }
}

async function loadCurrentRace() {
    try {
        // Kasuta avalikku endpoint'i käimasolevate võidusõitude jaoks
        const runningRaces = await apiRequest('/api/public/running-races');
        const race = runningRaces.find(r => r.id === currentRaceId);
        
        if (race) {
            displayCurrentRace(race);
        }
    } catch (error) {
        console.error('Error loading current race:', error);
    }
}

function displayCurrentRace(race) {
    const container = document.getElementById('current-race-info');
    container.innerHTML = `
        <h3>${race.name}</h3>
        <p><strong>Staatus:</strong> ${race.status}</p>
        <p><strong>Režiim:</strong> ${race.mode}</p>
    `;
}

async function setMode(mode) {
    if (!currentRaceId) return;
    
    try {
        await apiRequest(`/api/control/${currentRaceId}/mode`, {
            method: 'POST',
            body: JSON.stringify({ mode })
        });
    } catch (error) {
        alert('Viga režiimi muutmisel: ' + error.message);
    }
}

async function finishRace() {
    if (!currentRaceId) {
        alert('Pole aktiivset võidusõitu');
        return;
    }
    
    if (!confirm('Kas oled kindel, et soovid võidusõidu lõpetada?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/control/${currentRaceId}/finish`, {
            method: 'POST'
        });
        
        document.getElementById('current-race-section').classList.add('hidden');
        document.getElementById('next-race-section').classList.remove('hidden');
        currentRaceId = null;
        loadNextRace();
    } catch (error) {
        alert('Viga võidusõidu lõpetamisel: ' + error.message);
    }
}

function updateCountdown(remainingSeconds) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    document.getElementById('countdown-display').innerHTML = `
        <div class="countdown-label">Järelejäänud aeg</div>
        <div class="countdown-time">${display}</div>
    `;
}

// Socket.IO kuulamine
socket.on('race-update', (race) => {
    // Kui võidusõit alustati, näita praegust võidusõitu
    if (race.status === 'RUNNING') {
        // Kui see on võidusõit, mida me just alustasime või mis on juba käimas
        if (currentRaceId === race.id || currentRaceId === null) {
            if (document.getElementById('next-race-section') && !document.getElementById('next-race-section').classList.contains('hidden')) {
                document.getElementById('next-race-section').classList.add('hidden');
                document.getElementById('current-race-section').classList.remove('hidden');
            }
            currentRaceId = race.id;
            displayCurrentRace(race);
            socket.emit('subscribe-countdown', race.id);
        }
    }
    
    // Kui võidusõit muutus PLANNED-ist midagi muuks, aga see oli meie valitud võidusõit
    if (race.status !== 'PLANNED' && race.id === currentRaceId && race.status !== 'RUNNING') {
        // Võidusõit muutus (nt FINISHED), laadi järgmine
        currentRaceId = null;
        loadNextRace();
    }
    
    // Kui võidusõit lõppes, näita järgmist
    if (race.status === 'FINISHED' && race.id === currentRaceId) {
        if (document.getElementById('current-race-section')) {
            document.getElementById('current-race-section').classList.add('hidden');
            document.getElementById('next-race-section').classList.remove('hidden');
        }
        currentRaceId = null;
        loadNextRace();
    }
    
    // Uuenda praegust võidusõitu, kui see on aktiivne
    if (race.id === currentRaceId && race.status === 'RUNNING') {
        displayCurrentRace(race);
    }
    
    // Kui võidusõit muutus PLANNED-ist midagi muuks, aga see ei ole meie valitud võidusõit
    // Värskenda järgmist võidusõitu, kui praegu pole aktiivset võidusõitu
    if (race.status !== 'PLANNED' && currentRaceId === null) {
        loadNextRace();
    }
});

socket.on('countdown', (data) => {
    if (data.raceId === currentRaceId) {
        updateCountdown(data.remainingSeconds);
        
        if (!data.isRunning && currentRaceId) {
            // Võidusõit lõppes
            setTimeout(() => {
                document.getElementById('current-race-section').classList.add('hidden');
                document.getElementById('next-race-section').classList.remove('hidden');
                currentRaceId = null;
                loadNextRace();
            }, 2000);
        }
    }
});

socket.on('flags', (data) => {
    if (data.raceId === currentRaceId) {
        // Režiim muutus
    }
});

socket.on('next-race', (nextRace) => {
    if (!currentRaceId) {
        displayNextRace(nextRace);
        if (nextRace.id) {
            currentRaceId = nextRace.id;
        }
    }
});

