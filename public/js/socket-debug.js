// Socket.IO Debug Monitor
let messages = [];
let messageCount = 0;
let serverCount = 0;
let clientCount = 0;
let autoScroll = true;
let currentFilter = 'all';

// Sender descriptions
const senderDescriptions = {
    server: {
        name: '🖥️ Server',
        description: 'Server sends event to all clients or specific client',
        color: '#667eea'
    },
    client: {
        name: '💻 Client',
        description: 'Client (browser) sends event to server',
        color: '#2ecc71'
    }
};

// Event descriptions
const eventDescriptions = {
    'race-update': {
        name: 'Race Update',
        description: 'Race status or data change (PLANNED → RUNNING → FINISHED)',
        icon: '🏁'
    },
    'leaderboard': {
        name: 'Leaderboard',
        description: 'Leaderboard update - shows driver positions, laps and fastest laps',
        icon: '📊'
    },
    'countdown': {
        name: 'Timer',
        description: 'Race timer update - shows remaining time',
        icon: '⏰'
    },
    'laps': {
        name: 'Lap Registration',
        description: 'New lap registered - contains lap number, time and driver info',
        icon: '⏱️'
    },
    'flags': {
        name: 'Flag Mode',
        description: 'Race flag mode change (SAFE, CAUTION, DANGER, FINISHING)',
        icon: '🚩'
    },
    'next-race': {
        name: 'Next Race',
        description: 'Next planned race info update',
        icon: '🏎️'
    },
    'subscribe-leaderboard': {
        name: 'Subscribe Leaderboard',
        description: 'Client wants to receive leaderboard updates for specific race',
        icon: '📡'
    },
    'subscribe-countdown': {
        name: 'Subscribe Timer',
        description: 'Client wants to receive timer updates for specific race',
        icon: '📡'
    },
    'subscribe-flags': {
        name: 'Subscribe Flag Mode',
        description: 'Client wants to receive flag mode updates for specific race',
        icon: '📡'
    },
    'subscribe-next-race': {
        name: 'Subscribe Next Race',
        description: 'Client wants to receive next race info',
        icon: '📡'
    },
    'test-message': {
        name: 'Test Message',
        description: 'Test message from client to server (hard-coded test)',
        icon: '🧪'
    },
    'test-response': {
        name: 'Test Response',
        description: 'Test response from server to client',
        icon: '🧪'
    },
    'test-ping': {
        name: 'Test Ping',
        description: 'Server automatic test message (every 10 seconds)',
        icon: '🏓'
    },
    'connect': {
        name: 'Connection Established',
        description: 'Socket.IO connection successfully established',
        icon: '✅'
    },
    'disconnect': {
        name: 'Connection Disconnected',
        description: 'Socket.IO connection disconnected',
        icon: '❌'
    },
    'connect_error': {
        name: 'Connection Error',
        description: 'Error occurred while establishing Socket.IO connection',
        icon: '⚠️'
    }
};

function addMessage(sender, eventName, data) {
    const message = {
        id: messageCount++,
        sender: sender, // 'server' or 'client'
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
    
    // Filter messages
    let filteredMessages = messages;
    if (currentFilter !== 'all') {
        if (currentFilter === 'server' || currentFilter === 'client') {
            filteredMessages = messages.filter(m => m.sender === currentFilter);
        } else {
            filteredMessages = messages.filter(m => m.eventName === currentFilter);
        }
    }
    
    if (filteredMessages.length === 0) {
        container.innerHTML = '<div class="empty-state">No messages</div>';
        return;
    }
    
    container.innerHTML = filteredMessages.map(msg => {
        const sender = senderDescriptions[msg.sender];
        const event = eventDescriptions[msg.eventName] || {
            name: msg.eventName,
            description: 'Unknown event',
            icon: '📨'
        };
        
        const timeStr = msg.timestamp.toLocaleTimeString('en-US', {
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
    if (confirm('Are you sure you want to delete all messages?')) {
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
    
    // Update button activity
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
        statusEl.textContent = '✅ Connection: Connected';
        statusText.textContent = 'Connected';
    } else {
        statusEl.className = 'connection-status disconnected';
        statusEl.textContent = '❌ Connection: Disconnected';
        statusText.textContent = 'Disconnected';
    }
}

// Wait until socket exists
function initSocketDebug() {
    if (!socket) {
        // Wait a bit for socket to be created
        setTimeout(initSocketDebug, 100);
        return;
    }
    
    console.log('Socket found:', socket);
    console.log('Socket connected:', socket.connected);
    
    // Update connection status immediately
    updateConnectionStatus(socket.connected);
    
    // Intercept Socket.IO events
    const originalEmit = socket.emit.bind(socket);
    socket.emit = function(eventName, ...args) {
        addMessage('client', eventName, args.length === 1 ? args[0] : args);
        return originalEmit(eventName, ...args);
    };
    
    // Listen to all Socket.IO events
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
    
    // Check connection status periodically
    setInterval(() => {
        if (socket) {
            const isConnected = socket.connected;
            const statusEl = document.getElementById('connection-status');
            const currentStatus = statusEl ? statusEl.textContent.includes('Connected') : false;
            
            if (isConnected !== currentStatus) {
                updateConnectionStatus(isConnected);
            }
        }
    }, 1000);
    
    // Listen to all race events
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
    
    // Test events
    socket.on('test-response', (data) => {
        addMessage('server', 'test-response', data);
    });
    
    socket.on('test-ping', (data) => {
        addMessage('server', 'test-ping', data);
    });
    
    // Initial setup - check connection status
    const checkConnection = () => {
        if (socket) {
            const isConnected = socket.connected || socket.io && socket.io.readyState === 'open';
            updateConnectionStatus(isConnected);
            
            if (isConnected && socket.id) {
                addMessage('server', 'connect', { 
                    socketId: socket.id, 
                    note: 'Connection is active',
                    readyState: socket.io ? socket.io.readyState : 'unknown'
                });
            }
        }
    };
    
    // Check immediately
    checkConnection();
    
    // Check also a bit later (if socket is still connecting)
    setTimeout(checkConnection, 500);
    setTimeout(checkConnection, 1000);
    setTimeout(checkConnection, 2000);
}

// Fix filter function
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const filter = this.textContent.trim().toLowerCase();
        
        if (filter === 'all') {
            currentFilter = 'all';
        } else if (filter === 'server') {
            currentFilter = 'server';
        } else if (filter === 'client') {
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

// Test: Hard-coded messages at intervals
let testInterval = null;

function startTestMessages() {
    let testCounter = 0;
    
    // Stop previous interval if it exists
    if (testInterval) {
        clearInterval(testInterval);
    }
    
    testInterval = setInterval(() => {
        testCounter++;
        
        // Send test message to server
        if (socket && socket.connected) {
            socket.emit('test-message', {
                counter: testCounter,
                message: 'Test message from client',
                timestamp: new Date().toISOString()
            });
        }
        
        // Add local test message (shows that client is working)
        addMessage('client', 'test-message', {
            counter: testCounter,
            message: 'Test message (local)',
            timestamp: new Date().toISOString(),
            note: 'This is a local test message to see that debug monitor is working'
        });
        
        // Every 5th message, add server-side test
        if (testCounter % 5 === 0) {
            addMessage('server', 'test-response', {
                counter: testCounter,
                message: 'Test response from server',
                timestamp: new Date().toISOString(),
                note: 'This is a simulated server response'
            });
        }
    }, 2000); // Every 2 seconds
}

// Listen to test responses
function setupTestListeners() {
    if (!socket) {
        setTimeout(setupTestListeners, 100);
        return;
    }
    
    socket.on('test-response', (data) => {
        addMessage('server', 'test-response', data);
    });
}

// Initialization
initSocketDebug();
setupTestListeners();
