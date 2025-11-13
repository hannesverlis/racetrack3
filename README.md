# 🏁 Beachside Racetrack MVP

Reaalajas võidusõidu juhtimissüsteem Beachside Racetrack jaoks. Node.js server Express + Socket.IO-ga.

## 🚀 Funktsionaalsus

### Võidusõitude haldamine
- Võidusõitude lisamine ja kustutamine
- Sõitjate registreerimine ja auto numbrite määramine
- Unikaalsete sõitjanimede kontroll

### Võidusõidu juhtimine
- Võidusõidu alustamine ja lõpetamine
- Võidusõidu režiimide juhtimine (Turvaline, Oht, Ohulik, Lõpeta)
- 10-minutiline ajastaja (1 minut arendusrežiimis)

### Ringide registreerimine
- Reaalajas ringide registreerimine
- Kiireimate ringide jälgimine
- Ringide statistika

### Publikudispleid
- Reaalajas tulemuste kuvamine
- Võidusõidu lippude kuvamine
- Järgmise võidusõidu info

## 🛠️ Tehnoloogiad

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Reaalajas kommunikatsioon:** Socket.IO
- **Stiilid:** CSS Grid, Flexbox, Gradientid

## 📋 Kasutajaliidesed

| Kasutajaliides | Kasutaja | Marsruut | Kirjeldus |
|----------------|----------|----------|-----------|
| Front Desk | Receptionist | `/front-desk.html` | Võidusõitude ja sõitjate haldamine |
| Race Control | Safety Official | `/race-control.html` | Võidusõidu juhtimine ja turvalisus |
| Lap-line Tracker | Lap-line Observer | `/lap-line-tracker.html` | Ringide registreerimine |
| Leader Board | Publik | `/leader-board.html` | Võidusõidu tulemused |
| Next Race | Sõitjad | `/next-race.html` | Järgmise võidusõidu info |
| Race Countdown | Publik | `/race-countdown.html` | Võidusõidu ajastaja |
| Race Flags | Publik | `/race-flags.html` | Võidusõidu lippude kuvamine |

## 🔐 Turvalisus

Kõik töötajaliidesed nõuavad ligipääsukoodi:

- **Front Desk:** `8ded6076`
- **Race Control:** `a2d393bc`
- **Lap-line Tracker:** `662e0f6c`

## 🚀 Paigaldamine ja käivitamine

### Eeltingimused
- Node.js (versioon 14 või uuem)
- npm

### 1. Sõltuvuste paigaldamine
```bash
npm install
```

### 2. Keskkonnamuutujate seadistamine
Loo `.env` fail projekti juurkaustas:
```
RECEPTIONIST_KEY=8ded6076
SAFETY_OFFICIAL_KEY=a2d393bc
LAP_LINE_OBSERVER_KEY=662e0f6c
PORT=3000
DEV_MODE=false
```

### 3. Serveri käivitamine
```bash
# Tavarežiim (10 minutit)
npm start

# Arendusrežiim (1 minut)
npm run dev
```

### 4. Kasutajaliideste ligipääs
Server on kättesaadav aadressil `http://localhost:3000`

## 📖 Kasutajajuhend

### Front Desk (Receptionist)

1. **Ligipääs:** Sisesta ligipääsukood `8ded6076`
2. **Võidusõidu lisamine:**
   - Sisesta võidusõidu nimi
   - Vajuta "Lisa võidusõit"
3. **Sõitja lisamine:**
   - Vali võidusõit rippmenüüst
   - Sisesta sõitja nimi ja auto number
   - Vajuta "Lisa sõitja"
4. **Sõitja kustutamine:** Vajuta 🗑️ nuppu sõitja kõrval

### Race Control (Safety Official)

1. **Ligipääs:** Sisesta ligipääsukood `a2d393bc`
2. **Võidusõidu alustamine:**
   - Vaata järgmise võidusõidu infot
   - Vajuta "Alusta võidusõitu"
3. **Võidusõidu juhtimine:**
   - 🟢 **Turvaline:** Tavaline võidusõit
   - 🟡 **Oht:** Aeglane sõit
   - 🔴 **Ohulik:** Võidusõit peatatud
   - 🏁 **Lõpeta:** Võidusõidu lõpetamine
4. **Võidusõidu lõpetamine:** Vajuta "Lõpeta võidusõit"

### Lap-line Tracker (Lap-line Observer)

1. **Ligipääs:** Sisesta ligipääsukood `662e0f6c`
2. **Ringide registreerimine:**
   - Vali võidusõit rippmenüüst
   - Vajuta auto numbri nuppu, kui auto läbib ringi
   - Nupud on suured ja kergeks kasutamiseks
   - Ringide statistika värskeneb automaatselt

### Publikudispleid

- **Leader Board:** Reaalajas võidusõidu tulemused ja kohtade järjestus
- **Next Race:** Järgmise võidusõidu info ja sõitjate nimekiri
- **Race Countdown:** Suur võidusõidu ajastaja
- **Race Flags:** Võidusõidu lippude kuvamine (täisekraan)

## 🔧 Arendusrežiim

Arendusrežiimis kestab võidusõit 1 minuti asemel 10 minutit:

```bash
npm run dev
```

## 🌐 Võrgu ligipääs

Server kuulab kõikidel võrguliidestel (`0.0.0.0`), seega on kasutajaliidesed kättesaadavad teistest seadmetest samas võrgus.

### Näide võrgu ligipääsust:
- Arvuti IP: `192.168.1.100`
- Kasutajaliidesed: `http://192.168.1.100:3000/front-desk.html`

## 📱 Mobiili optimeerimine

Kõik kasutajaliidesed on optimeeritud mobiiliseadmetele:
- Responsive disain
- Suured puutetundlikud nupud
- Optimeeritud fontide suurused

## 🎨 Kasutajaliidese funktsioonid

### Täisekraani režiim
Publikudispleidel on võimalik minna täisekraani režiimi nupu ⛶ abil.

### Reaalajas värskendamine
Kõik andmed värskenevad automaatselt Socket.IO abil:
- Võidusõidu tulemused
- Ajastaja
- Võidusõidu režiimid
- Ringide statistika

### Veateated
Süsteem kuvab selgeid veateateid:
- Vale ligipääsukood
- Puuduvad andmed
- Võidusõidu vead

## 🔄 Võidusõidu tsükkel

1. **Planeerimine:** Receptionist lisab võidusõidu ja sõitjad
2. **Alustamine:** Safety Official alustab võidusõitu
3. **Jälgimine:** Lap-line Observer registreerib ringid
4. **Lõpetamine:** Safety Official lõpetab võidusõidu
5. **Järgmine:** Süsteem valmistub järgmisele võidusõidule

## 🐛 Probleemide lahendamine

### Server ei käivitu
- Kontrolli, kas kõik keskkonnamuutujad on seadistatud
- Veendu, et Node.js on paigaldatud
- Kontrolli, kas port 3000 on vaba

### Kasutajaliidesed ei tööta
- Kontrolli, kas server töötab
- Veendu, et Socket.IO on paigaldatud
- Kontrolli brauseri konsooli veateadete jaoks

### Reaalajas kommunikatsioon ei tööta
- Kontrolli võrguühendust
- Veendu, et tulemüür ei blokeeri porti 3000
- Kontrolli Socket.IO ühendust brauseri konsoolis

## 📞 Tugi

Kui tekib probleeme, kontrolli:
1. Serveri konsooli veateadete jaoks
2. Brauseri konsooli (F12)
3. Võrguühendust
4. Keskkonnamuutujate seadistamist

