# Socket.IO Arhitektuuridiagramm - Racetrack3

## Ülevaade

```
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER (server.js)                      │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │ Express API  │         │ Socket.IO   │                     │
│  │   (HTTP)     │         │   Server    │                     │
│  └──────┬───────┘         └──────┬───────┘                    │
│         │                        │                             │
│         └──────────┬──────────────┘                             │
│                    │                                            │
│              ┌─────▼─────┐                                      │
│              │   Andmed  │                                      │
│              │ (races,   │                                      │
│              │   laps)   │                                      │
│              └───────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ Socket.IO ühendused
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Front Desk   │   │ Race Control  │   │ Lap Tracker   │
│               │   │               │   │               │
│ • Loo võidusõit│   │ • Alusta sõit │   │ • Registreeri │
│ • Lisa sõitja │   │ • Muuda režiim│   │   ring        │
│ • Kustuta     │   │ • Lõpeta sõit │   │               │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        │                   ▼                   ▼
        │           ┌───────────────┐   ┌───────────────┐
        │           │ Leader Board  │   │ Race Countdown│
        │           │               │   │               │
        │           │ • Näita edetabel│   │ • Näita ajastaja│
        │           └───────────────┘   └───────────────┘
        │
        └───────────────────────────────────────────────┘
```

## Sündmuste voog

### 1. Võidusõidu loomine (Front Desk)

```
Front Desk                    Server                    Teised kliendid
     │                           │                            │
     │── HTTP POST /api/races ──>│                            │
     │                           │                            │
     │<── 201 Created ──────────│                            │
     │                           │                            │
     │                           │── Socket.IO emit ─────────>│
     │                           │  'race-update'             │
     │                           │  'next-race'               │
     │                           │                            │
     │<── Socket.IO 'race-update'│                            │
     │    'next-race' ───────────│                            │
```

### 2. Võidusõidu alustamine (Race Control)

```
Race Control                  Server                    Kõik kliendid
     │                           │                            │
     │── HTTP POST /api/control/1/start ──>│                  │
     │                           │                            │
     │                           │ (Muudab staatust RUNNING)  │
     │                           │                            │
     │<── 204 No Content ────────│                            │
     │                           │                            │
     │                           │── Socket.IO emit ──────────>│
     │                           │  'race-update' (RUNNING)   │
     │                           │  'countdown' (ajastaja)    │
     │                           │  'flags' (SAFE)            │
     │                           │  'next-race' (uuendus)     │
     │                           │                            │
     │<── Socket.IO sündmused ───│                            │
     │                           │<── Socket.IO sündmused ────│
```

### 3. Ringi registreerimine (Lap-line Tracker)

```
Lap Tracker                    Server                    Leader Board
     │                           │                            │
     │── HTTP POST /api/laps ────>│                            │
     │   {raceId: 1, carNumber: 5}│                            │
     │                           │                            │
     │                           │ (Lisab ringi andmebaasi)   │
     │                           │                            │
     │<── 202 Accepted ─────────│                            │
     │                           │                            │
     │                           │── Socket.IO emit ──────────>│
     │                           │  'leaderboard' (uuendus)   │
     │                           │  'laps' (uus ring)         │
     │                           │                            │
     │<── Socket.IO 'leaderboard'│                            │
     │    'laps' ────────────────│                            │
     │                           │<── Socket.IO 'leaderboard'─│
```

## Sündmuste maatriks

| Sündmus | Saatja | Vastuvõtjad | Kui |
|---------|--------|-------------|-----|
| `race-update` | Server | Kõik | Võidusõidu staatuse muutus |
| `leaderboard` | Server | Leader Board, Lap Tracker | Ringi lisatud või uuendatud |
| `countdown` | Server | Countdown, Race Control | Iga sekund (ajastaja) |
| `laps` | Server | Lap Tracker | Uus ring registreeritud |
| `flags` | Server | Race Control, Race Flags | Režiimi muutus |
| `next-race` | Server | Front Desk, Race Control | Järgmise võidusõidu muutus |
| `subscribe-leaderboard` | Klient | Server | Klient soovib leaderboard'i |
| `subscribe-countdown` | Klient | Server | Klient soovib countdown'i |
| `subscribe-flags` | Klient | Server | Klient soovib lipu režiimi |
| `subscribe-next-race` | Klient | Server | Klient soovib järgmist võidusõitu |

## Reaalajas näide: Võidusõit käib

```
Aeg    | Front Desk | Race Control | Lap Tracker | Leader Board | Countdown
-------|------------|--------------|-------------|--------------|----------
00:00  | PLANNED    | Näitab järgmist| -          | Ootab        | 00:00
       |            | võidusõitu    |             |              |
-------|------------|--------------|-------------|--------------|----------
00:05  | PLANNED    | [Alusta] ────┼─────────────┼──────────────┼─────────>
       |            |               │             │              │
       |            |               │             │              │
       |<───────────┼───────────────┼─────────────┼──────────────┼─────────
       | race-update| race-update   | race-update | race-update  | race-update
       | (RUNNING)  | (RUNNING)     | (RUNNING)   | (RUNNING)    | (RUNNING)
       |            |               │             │              │
       |            | countdown ────┼─────────────┼──────────────┼─────────>
       |            |               │             │              │
-------|------------|--------------|-------------|--------------|----------
00:10  | (eemaldatud)| RUNNING      | Vali võidusõit│ Ootab      | 09:50
       |            |               │             │              │
       |            |               │ [Vali race] │              │
       |            |               │             │              │
-------|------------|--------------|-------------|--------------|----------
00:15  | -          | RUNNING      | [Auto #5] ──┼──────────────┼─────────>
       |            |               │             │              │
       |            |               │             │              │
       |            |               │             │<──────────────┼─────────
       |            |               │             │ leaderboard  │
       |            |               │             │ (1 ring)     │
       |            |               │             │              │
       |            |               │<────────────┼──────────────┼─────────
       |            |               │ leaderboard │              │
       |            |               │ laps        │              │
-------|------------|--------------|-------------|--------------|----------
00:20  | -          | RUNNING      | [Auto #3] ──┼──────────────┼─────────>
       |            |               │             │              │
       |            |               │             │<──────────────┼─────────
       |            |               │             │ leaderboard  │
       |            |               │             │ (2 ringi)    │
       |            |               │             │              │
       |            |               │<────────────┼──────────────┼─────────
       |            |               │ leaderboard │              │
       |            |               │ laps        │              │
```

## Koodi struktuur

```
public/js/
├── socket-client.js          ← Socket.IO ühenduse algseadistus
│   └── socket = io()         ← Loob ühenduse
│
├── front-desk.js
│   ├── socket.on('race-update')    ← Kuulab võidusõidu uuendusi
│   └── socket.on('next-race')      ← Kuulab järgmise võidusõidu uuendusi
│
├── race-control.js
│   ├── socket.on('race-update')    ← Kuulab võidusõidu uuendusi
│   ├── socket.on('countdown')      ← Kuulab ajastaja uuendusi
│   ├── socket.on('flags')          ← Kuulab lipu režiimi muutusi
│   └── socket.emit('subscribe-countdown', raceId)  ← Tellib countdown'i
│
├── lap-line-tracker.js
│   ├── socket.on('race-update')    ← Kuulab võidusõidu uuendusi
│   ├── socket.on('leaderboard')    ← Kuulab edetabeli uuendusi
│   └── socket.on('laps')           ← Kuulab ringide registreerimisi
│
├── leader-board.js
│   ├── socket.on('leaderboard')    ← Kuulab edetabeli uuendusi
│   ├── socket.on('race-update')    ← Kuulab võidusõidu uuendusi
│   └── socket.emit('subscribe-leaderboard', raceId)  ← Tellib leaderboard'i
│
└── race-countdown.js
    ├── socket.on('countdown')       ← Kuulab ajastaja uuendusi
    ├── socket.on('race-update')     ← Kuulab võidusõidu uuendusi
    └── socket.emit('subscribe-countdown', raceId)  ← Tellib countdown'i
```

## Olulised punktid

1. **Socket.IO ühendus luuakse automaatselt** - `socket-client.js` loob ühenduse
2. **Kõik kliendid kuulavad** - Iga leht kuulab vajalikke sündmusi
3. **Server saadab automaatselt** - Kui midagi muutub, saadab server kõigile
4. **Reaalajas värskendused** - Kõik näevad muudatusi kohe

## Näide: Kuidas töötab

1. **Kasutaja A** (Front Desk) loob uue võidusõidu
   → Server saadab `race-update` kõigile
   → **Kasutaja B** (Race Control) näeb kohe uut võidusõitu

2. **Kasutaja B** (Race Control) alustab võidusõitu
   → Server saadab `race-update`, `countdown`, `flags` kõigile
   → **Kasutaja C** (Leader Board) näeb kohe, et võidusõit käib
   → **Kasutaja D** (Countdown) näeb kohe ajastaja

3. **Kasutaja E** (Lap Tracker) registreerib ringi
   → Server saadab `leaderboard`, `laps` kõigile
   → **Kasutaja C** (Leader Board) näeb kohe uuendatud edetabelit
   → **Kasutaja E** näeb kohe oma ringide ajalugu

## Kokkuvõte

Socket.IO võimaldab meil luua **reaalajas rakenduse**, kus:
- ✅ Kõik kliendid näevad muudatusi **kohe**
- ✅ Pole vaja lehte värskendada
- ✅ Andmed on alati **sünkroniseeritud**
- ✅ Kasutajakogemus on **sujuv ja reaalajas**

