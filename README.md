# 🏁 Beachside Racetrack MVP

Real-time race management system for Beachside Racetrack. Node.js server with Express + Socket.IO.

## 🚀 Features

### Race Management
- Add and delete races
- Register drivers and assign car numbers
- Unique driver name validation

### Race Control
- Start and finish races
- Race mode control (Safe, Caution, Danger, Finish)
- 10-minute timer (1 minute in development mode)

### Lap Registration
- Real-time lap registration
- Fastest lap tracking
- Lap statistics

### Public Displays
- Real-time race results display
- Race flag display
- Next race information

## 🛠️ Technologies

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Real-time Communication:** Socket.IO
- **Styling:** CSS Grid, Flexbox, Gradients

## 📋 User Interfaces

| Interface | User | Route | Description |
|-----------|------|-------|-------------|
| Front Desk | Receptionist | `/front-desk.html` | Race and driver management |
| Race Control | Safety Official | `/race-control.html` | Race control and safety |
| Lap-line Tracker | Lap-line Observer | `/lap-line-tracker.html` | Lap registration |
| Leader Board | Public | `/leader-board.html` | Race results |
| Next Race | Drivers | `/next-race.html` | Next race information |
| Race Countdown | Public | `/race-countdown.html` | Race countdown timer |
| Race Flags | Public | `/race-flags.html` | Race flag display |

## 🔐 Security

All staff interfaces require an access key:

- **Front Desk:** `8ded6076`
- **Race Control:** `a2d393bc`
- **Lap-line Tracker:** `662e0f6c`

## 🚀 Installation and Running

### Prerequisites
- Node.js (version 14 or higher)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables Setup
Create a `.env` file in the project root:
```
RECEPTIONIST_KEY=8ded6076
SAFETY_OFFICIAL_KEY=a2d393bc
LAP_LINE_OBSERVER_KEY=662e0f6c
PORT=3000
DEV_MODE=false
```

### 3. Start Server
```bash
# Normal mode (10 minutes)
npm start

# Development mode (1 minute)
npm run dev
```

### 4. Access User Interfaces
Server is accessible at `http://localhost:3000`

## 📖 User Guide

### Front Desk (Receptionist)

1. **Access:** Enter access key `8ded6076`
2. **Add Race:**
   - Enter race name
   - Click "Add Race"
3. **Add Driver:**
   - Select race from dropdown
   - Enter driver name and car number
   - Click "Add Driver"
4. **Delete Driver:** Click 🗑️ button next to driver

### Race Control (Safety Official)

1. **Access:** Enter access key `a2d393bc`
2. **Start Race:**
   - View next race information
   - Click "Start Race"
3. **Race Control:**
   - 🟢 **Safe:** Normal race
   - 🟡 **Caution:** Slow race
   - 🔴 **Danger:** Race stopped
   - 🏁 **Finish:** Race finished
4. **Finish Race:** Click "END"
5. **End Race Session:** Click "End Race Session" button
   - This ends the race session and displays "Proceed to the paddock" message on Next Race display
   - After 5 seconds, the Next Race display automatically updates to show the next planned race

### Lap-line Tracker (Lap-line Observer)

1. **Access:** Enter access key `662e0f6c`
2. **Register Laps:**
   - Select race from dropdown
   - Click car number button when car passes finish line
   - Buttons are large and easy to use
   - Lap statistics update automatically

### Public Displays

- **Leader Board:** Real-time race results and rankings
- **Next Race:** Next race information and driver list
  - Shows "Proceed to the paddock" message temporarily after race session ends
  - Automatically updates to show next race after 5 seconds
- **Race Countdown:** Large race countdown timer
- **Race Flags:** Race flag display (fullscreen)

## 🔧 Development Mode

In development mode, races last 1 minute instead of 10 minutes:

```bash
npm run dev
```

## 🌐 Network Access

Server listens on all network interfaces (`0.0.0.0`), so user interfaces are accessible from other devices on the same network.

### Example Network Access:
- Computer IP: `192.168.1.100`
- User Interfaces: `http://192.168.1.100:3000/front-desk.html`

## 📱 Mobile Optimization

All user interfaces are optimized for mobile devices:
- Responsive design
- Large touch-friendly buttons
- Optimized font sizes

## 🎨 User Interface Features

### Fullscreen Mode
Public displays can enter fullscreen mode using the ⛶ button.

### Real-time Updates
All data updates automatically via Socket.IO:
- Race results
- Timer
- Race modes
- Lap statistics

### Error Messages
System displays clear error messages:
- Invalid access key
- Missing data
- Race errors

## 🔄 Race Cycle

1. **Planning:** Receptionist adds race and drivers
2. **Starting:** Safety Official starts race
3. **Monitoring:** Lap-line Observer registers laps
4. **Finishing:** Safety Official finishes race
5. **Session End:** Safety Official ends race session
   - "Proceed to the paddock" message appears on Next Race display
   - Message displays for 5 seconds
6. **Next:** System automatically updates to show next planned race

## 🐛 Troubleshooting

### Server Won't Start
- Check that all environment variables are set
- Ensure Node.js is installed
- Check if port 3000 is available

### User Interfaces Not Working
- Check if server is running
- Ensure Socket.IO is installed
- Check browser console for errors

### Real-time Communication Not Working
- Check network connection
- Ensure firewall doesn't block port 3000
- Check Socket.IO connection in browser console

## 📞 Support

If you encounter problems, check:
1. Server console for error messages
2. Browser console (F12)
3. Network connection
4. Environment variable setup
