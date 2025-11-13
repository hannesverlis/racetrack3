// Socket.IO Debug Monitor
let messages = [];
let messageCount = 0;
let serverCount = 0;
let clientCount = 0;
let autoScroll = true;
let currentFilter = 'all';

// Saatja kirjeldused
const senderDescriptions = {
    server: {
        name: '🖥️ Server',
        description: 'Server saadab sündmuse kõigile klientidele või konkreetsele kliendile',
        color: '#667eea'
    },
    client: {
        name: '💻 Klient',
        description: 'Klient (brauser) saadab sündmuse serverile',
        color: '#2ecc71'
    }
};

// Sündmuste kirjeldused
const eventDescriptions = {
    'race-update': {
        name: 'Võidusõidu uuendus',
        description: 'Võidusõidu staatuse või andmete muutus (PLANNED → RUNNING → FINISHED)',
        icon: '🏁'
    },
    'leaderboard': {
        name: 'Edetabel',
        description: 'Edetabeli uuendus - näitab sõitjate kohti, ringe ja kiireimaid ringe',
        icon: '📊'
    },
    'countdown': {
        name: 'Ajastaja',
        description: 'Võidusõidu ajastaja uuendus - näitab järelejäänud aega',
        icon: '⏰'
    },
    'laps': {
        name: 'Ringi registreerimine',
        description: 'Uus ring on registreeritud - sisaldab ringi numbrit, aega ja sõitja infot',
        icon: '⏱️'
    },
    'flags': {
        name: 'Lipu režiim',
        description: 'Võidusõidu lipu režiimi muutus (SAFE, CAUTION, DANGER, FINISHING)',
        icon: '🚩'
    },
    'next-race': {
        name: 'Järgmine võidusõit',
        description: 'Järgmise planeeritud võidusõidu info uuendus',
        icon: '🏎️'
    },
    'subscribe-leaderboard': {
        name: 'Tellib edetabelit',
        description: 'Klient soovib saada edetabeli uuendusi konkreetse võidusõidu kohta',
        icon: '📡'
    },
    'subscribe-countdown': {
        name: 'Tellib ajastajat',
        description: 'Klient soovib saada ajastaja uuendusi konkreetse võidusõidu kohta',
        icon: '📡'
    },
    'subscribe-flags': {
        name: 'Tellib lipu režiimi',
        description: 'Klient soovib saada lipu režiimi uuendusi konkreetse võidusõidu kohta',
        icon: '📡'
    },
    'subscribe-next-race': {
        name: 'Tellib järgmist võidusõitu',
        description: 'Klient soovib saada järgmise võidusõidu infot',
        icon: '📡'
    },
    'test-message': {
        name: 'Test sõnum',
        description: 'Test sõnum klientist serverile (hard-coded test)',
        icon: '🧪'
    },
    'test-response': {
        name: 'Test vastus',
        description: 'Test vastus serverilt kliendile',
        icon: '🧪'
    },
    'test-ping': {
        name: 'Test ping',
        description: 'Serveri automaatne test sõnum (iga 10 sekundit)',
        icon: '🏓'
    },
    'connect': {
        name: 'Ühendus loodud',
        description: 'Socket.IO ühendus on edukalt loodud',
        icon: '✅'
    },
    'disconnect': {
        name: 'Ühendus katkestatud',
        description: 'Socket.IO ühendus on katkestatud',
        icon: '❌'
    },
    'connect_error': {
        name: 'Ühenduse viga',
        description: 'Socket.IO ühenduse loomisel tekkis viga',
        icon: '⚠️'
    }
};

function addMessage(sender, eventName, data) {
    const message = {
        id: messageCount++,
        sender: sender, // 'server' või 'client'
        eventName: eventName,
        data: data,
        timestamp: new Date()
    };
    
    messages.push(message);
    
    if (sender === 'server') {
        serverCount++;
    } else {
        clientCount++;
    }
    
    updateStats();
    renderMessages();
    
    if (autoScroll) {
        scrollToBottom();
    }
}

function updateStats() {
    document.getElementById('total-messages').textContent = messages.length;
    document.getElementById('server-messages').textContent = serverCount;
    document.getElementById('client-messages').textContent = clientCount;
}

function renderMessages() {
    const container = document.getElementById('messages-container');
    
    // Filtreeri sõnumid
    let filteredMessages = messages;
    if (currentFilter !== 'all') {
        if (currentFilter === 'server' || currentFilter === 'client') {
            filteredMessages = messages.filter(m => m.sender === currentFilter);
        } else {
            filteredMessages = messages.filter(m => m.eventName === currentFilter);
        }
    }
    
    if (filteredMessages.length === 0) {
        container.innerHTML = '<div class="empty-state">Pole sõnumeid</div>';
        return;
    }
    
    container.innerHTML = filteredMessages.map(msg => {
        const sender = senderDescriptions[msg.sender];
        const event = eventDescriptions[msg.eventName] || {
            name: msg.eventName,
            description: 'Tundmatu sündmus',
            icon: '📨'
        };
        
        const timeStr = msg.timestamp.toLocaleTimeString('et-EE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
        
        return `
            <div class="message-item ${msg.sender}" data-message-id="${msg.id}">
                <div class="message-header">
                    <div class="message-sender">
                        <span class="sender-badge ${msg.sender}">${sender.name}</span>
                        <span class="event-name">${event.icon} ${event.name}</span>
                        <span style="color: #666; font-size: 0.9em;">(${msg.eventName})</span>
                    </div>
                    <div class="message-time">${timeStr}</div>
                </div>
                <div style="margin-top: 8px; color: #666; font-size: 0.9em;">
                    ${sender.description}
                </div>
                <div style="margin-top: 5px; color: #666; font-size: 0.9em;">
                    ${event.description}
                </div>
                <div class="message-data">
                    <pre>${JSON.stringify(msg.data, null, 2)}</pre>
                </div>
            </div>
        `;
    }).join('');
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
}

function clearMessages() {
    if (confirm('Kas oled kindel, et soovid kõik sõnumid kustutada?')) {
        messages = [];
        messageCount = 0;
        serverCount = 0;
        clientCount = 0;
        updateStats();
        renderMessages();
    }
}

function toggleAutoScroll() {
    autoScroll = !autoScroll;
    document.getElementById('auto-scroll-status').textContent = autoScroll ? 'ON' : 'OFF';
    if (autoScroll) {
        scrollToBottom();
    }
}

function filterMessages(filter) {
    currentFilter = filter;
    
    // Uuenda nuppude aktiivsus
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderMessages();
    if (autoScroll) {
        scrollToBottom();
    }
}

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-status-text');
    
    if (connected) {
        statusEl.className = 'connection-status connected';
        statusEl.textContent = '✅ Ühendus: Ühendatud';
        statusText.textContent = 'Ühendatud';
    } else {
        statusEl.className = 'connection-status disconnected';
        statusEl.textContent = '❌ Ühendus: Katkestatud';
        statusText.textContent = 'Katkestatud';
    }
}

// Oota, kuni socket on olemas
function initSocketDebug() {
    if (!socket) {
        // Oota veidi, kuni socket on loodud
        setTimeout(initSocketDebug, 100);
        return;
    }
    
    console.log('Socket found:', socket);
    console.log('Socket connected:', socket.connected);
    
    // Uuenda ühenduse staatust kohe
    updateConnectionStatus(socket.connected);
    
    // Intercepteerime Socket.IO sündmused
    const originalEmit = socket.emit.bind(socket);
    socket.emit = function(eventName, ...args) {
        addMessage('client', eventName, args.length === 1 ? args[0] : args);
        return originalEmit(eventName, ...args);
    };
    
    // Kuulame kõiki Socket.IO sündmusi
    socket.on('connect', () => {
        console.log('Socket connected event fired');
        updateConnectionStatus(true);
        addMessage('server', 'connect', { socketId: socket.id });
    });
    
    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        updateConnectionStatus(false);
        addMessage('server', 'disconnect', { reason: reason });
    });
    
    socket.on('connect_error', (error) => {
        console.log('Socket connect error:', error);
        updateConnectionStatus(false);
        addMessage('server', 'connect_error', { error: error.message });
    });
    
    // Kontrolli ühenduse staatust perioodiliselt
    setInterval(() => {
        if (socket) {
            const isConnected = socket.connected;
            const statusEl = document.getElementById('connection-status');
            const currentStatus = statusEl ? statusEl.textContent.includes('Ühendatud') : false;
            
            if (isConnected !== currentStatus) {
                updateConnectionStatus(isConnected);
            }
        }
    }, 1000);
    
    // Kuulame kõiki võidusõidu sündmusi
    socket.on('race-update', (data) => {
        addMessage('server', 'race-update', data);
    });
    
    socket.on('leaderboard', (data) => {
        addMessage('server', 'leaderboard', data);
    });
    
    socket.on('countdown', (data) => {
        addMessage('server', 'countdown', data);
    });
    
    socket.on('laps', (data) => {
        addMessage('server', 'laps', data);
    });
    
    socket.on('flags', (data) => {
        addMessage('server', 'flags', data);
    });
    
    socket.on('next-race', (data) => {
        addMessage('server', 'next-race', data);
    });
    
    // Test sündmused
    socket.on('test-response', (data) => {
        addMessage('server', 'test-response', data);
    });
    
    socket.on('test-ping', (data) => {
        addMessage('server', 'test-ping', data);
    });
    
    // Algseadistus - kontrolli ühenduse staatust
    const checkConnection = () => {
        if (socket) {
            const isConnected = socket.connected || socket.io && socket.io.readyState === 'open';
            updateConnectionStatus(isConnected);
            
            if (isConnected && socket.id) {
                addMessage('server', 'connect', { 
                    socketId: socket.id, 
                    note: 'Ühendus on aktiivne',
                    readyState: socket.io ? socket.io.readyState : 'unknown'
                });
            }
        }
    };
    
    // Kontrolli kohe
    checkConnection();
    
    // Kontrolli ka veidi hiljem (kui socket on veel ühendamas)
    setTimeout(checkConnection, 500);
    setTimeout(checkConnection, 1000);
    setTimeout(checkConnection, 2000);
}

// Parandame filter funktsiooni
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const filter = this.textContent.trim().toLowerCase();
        
        if (filter === 'kõik') {
            currentFilter = 'all';
        } else if (filter === 'server') {
            currentFilter = 'server';
        } else if (filter === 'klient') {
            currentFilter = 'client';
        } else {
            currentFilter = filter;
        }
        
        renderMessages();
        if (autoScroll) {
            scrollToBottom();
        }
    });
});

// Test: Hard-coded sõnumid intervalliga
let testInterval = null;

function startTestMessages() {
    let testCounter = 0;
    
    // Peata eelmine intervall, kui see on olemas
    if (testInterval) {
        clearInterval(testInterval);
    }
    
    testInterval = setInterval(() => {
        testCounter++;
        
        // Saada test sõnum serverile
        if (socket && socket.connected) {
            socket.emit('test-message', {
                counter: testCounter,
                message: 'Test sõnum klientist',
                timestamp: new Date().toISOString()
            });
        }
        
        // Lisa ka kohalik test sõnum (näitab, et klient töötab)
        addMessage('client', 'test-message', {
            counter: testCounter,
            message: 'Test sõnum (kohalik)',
            timestamp: new Date().toISOString(),
            note: 'See on kohalik test sõnum, et näha, et debug monitor töötab'
        });
        
        // Iga 5. sõnum, lisa ka serveri poolne test
        if (testCounter % 5 === 0) {
            addMessage('server', 'test-response', {
                counter: testCounter,
                message: 'Test vastus serverilt',
                timestamp: new Date().toISOString(),
                note: 'See on simuleeritud serveri vastus'
            });
        }
    }, 2000); // Iga 2 sekundit
}

// Kuulame test vastuseid
function setupTestListeners() {
    if (!socket) {
        setTimeout(setupTestListeners, 100);
        return;
    }
    
    socket.on('test-response', (data) => {
        addMessage('server', 'test-response', data);
    });
}

// Algseadistus
initSocketDebug();
setupTestListeners();

// Käivita test sõnumid kohe
setTimeout(() => {
    startTestMessages();
    console.log('Test sõnumid käivitatud - peaksid ilmuma iga 2 sekundi tagant');
}, 500);

