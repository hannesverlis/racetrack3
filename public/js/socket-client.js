// Socket.IO client
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

// API requests with access key
async function apiRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // Add access key only if URL is not a public endpoint
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
            // If response is not JSON, use status text
            errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
    }
    
    if (response.status === 204) {
        return null;
    }
    
    return await response.json();
}

// Fullscreen mode
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Initialization
if (typeof window !== 'undefined') {
    initSocket();
}
