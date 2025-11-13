// Socket.IO klient
let socket = null;
let accessKey = null;

function initSocket() {
    if (socket) {
        socket.disconnect();
    }
    
    socket = io();
    
    socket.on('connect', () => {
        console.log('Socket.IO connected');
    });
    
    socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
    });
    
    socket.on('error', (error) => {
        console.error('Socket.IO error:', error);
    });
}

// API päringud ligipääsukoodiga
async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // Lisa ligipääsukood ainult kui URL ei ole avalik endpoint
    const isPublicEndpoint = url.startsWith('/api/public/');
    if (accessKey && !isPublicEndpoint) {
        headers['x-access-key'] = accessKey;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (e) {
            // Kui response pole JSON, kasuta status teksti
            errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
    }
    
    if (response.status === 204) {
        return null;
    }
    
    return await response.json();
}

// Täisekraani režiim
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Algseadistus
if (typeof window !== 'undefined') {
    initSocket();
}

