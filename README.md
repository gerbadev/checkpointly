# Checkpointly 🎯 [EN]

> AI-powered habit building app through gamified adventures

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.73-blue.svg)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
![Award](https://img.shields.io/badge/Croatian_Software_Development_Competition-7th_Place-FFD700.svg)

![Checkpointly Banner](/client/assets/images/Checkpointly_bez_pozadine.png)

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 About the Project

🏆 **Award-Winning Application:** Checkpointly proudly secured **7th place** at the official Croatian Software Development competition!

Checkpointly is an innovative mobile application that revolutionizes the way people build habits and achieve goals. Instead of traditional habit tracking, Checkpointly transforms every goal into an **adventure** – a structured journey composed of small, achievable checkpoint steps.

### The Problem We Solve

Most people formulate big goals like "I'll start working out regularly" or "I'll learn to code," but quickly lose motivation because:

- ❌ They don't know where to start
- ❌ They don't understand how to progressively increase difficulty
- ❌ They can't see their progress
- ❌ They lose motivation after the first setback

### Our Solution

Checkpointly uses **artificial intelligence** to:

- ✅ Automatically generate personalized checkpoint maps
- ✅ Adapt difficulty based on user experience and available time
- ✅ Gamify progress (XP, level, streak)
- ✅ Visually track achievements
- ✅ Provide a freeze token system that offers flexibility
- ✅ Connect with friends and share your adventures

## ✨ Key Features

### 🤖 AI Checkpoint Generation

Advanced OpenAI system that creates personalized steps based on:
- User interests
- Available time (5-30+ min daily)
- Experience level (beginner, intermediate, advanced)
- Goal type (habit, consistency, project, energy_sleep, explore)

```javascript
// Example AI-generated checkpoints for "Learn C++"
[
  {
    title: "Install C++ compiler",
    notes: "Download and install GCC or Visual Studio..."
  },
  {
    title: "Write your first Hello World program",
    notes: "Create a main.cpp file and write the basic structure..."
  },
  // ... 6-10 total checkpoints
]
```

### 🎮 Gamification System

- **XP Points**: 20 XP per completed checkpoint (once daily)
- **Level System**: Linear progression with visual progress bar
- **Streak Tracking**: Track consecutive days of activity
- **Daily Bonus**: Random rewards (10-100 XP or freeze token)
- **Freeze Tokens**: Save your streak when you miss a day

### 👥 Social Connections

- **Friends System**: Add friends to your network and stay motivated together
- **Shared Adventures**: Share your current adventures with friends to keep each other accountable
- **Social Feed**: See your friends' activity and progress in real-time

### 🎨 Visual Themes

Each adventure has a unique visual identity:

| Theme | Emoji | Mood | Colors |
|-------|-------|------|--------|
| Mountain | ⛰️ | Persistence, climbing | Gray, blue, white |
| Space | 🌌 | Exploration, creativity | Dark blue, purple |
| Forest | 🌲 | Growth, nature, peace | Emerald, green, brown |
| Ocean | 🌊 | Fluidity, adaptation | Turquoise, blue |
| Desert | 🏜️ | Endurance, focus | Gold, orange |

### 📱 Personalized Onboarding

7-step process that customizes the app:

1. **Welcome** – Introduction to the concept
2. **Interests** – Select areas of interest
3. **Goal** – Define goal type
4. **Tempo** – Set daily time commitment
5. **How It Works** – Quick tutorial
6. **First Adventure** – Create first adventure
7. **Done** – Enter the app

## 🛠 Technologies

### Frontend

```
React Native 0.73+    │ Cross-platform development
Expo Router           │ File-based routing
TypeScript            │ Type-safe development
Context API           │ State management
AsyncStorage          │ Local storage
```

### Backend

```
Node.js 18+           │ Runtime environment
Express 4.18+         │ Web framework
PostgreSQL 14+        │ Relational database
JWT                   │ Authentication
bcrypt                │ Password hashing
```

### AI & Services

```
OpenAI API            │ GPT-4 for checkpoint generation
Railway               │ Hosting and deployment
GitHub Actions        │ CI/CD pipeline
```

### Development Tools

```
VS Code               │ IDE
Expo Go               │ Mobile testing
Postman               │ API testing
pgAdmin               │ Database management
```

## 📦 Installation

### Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- npm or yarn
- PostgreSQL 14+ ([download](https://www.postgresql.org/download/))
- Expo CLI: `npm install -g expo-cli`
- Git

### 1. Clone the repository

```bash
git clone https://github.com/gerbadev/checkpointly-app.git
cd checkpointly
```

### 2. Backend setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials:
# DATABASE_URL=postgresql://user:password@localhost:5432/checkpointly
# OPENAI_API_KEY=sk-...
# JWT_SECRET=your-secret-key
# PORT=3000

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### 3. Frontend setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env:
# EXPO_PUBLIC_API_URL=http://localhost:3000

# Start Expo development server
npm start
```

### 4. Mobile testing

- Scan QR code with Expo Go app (iOS/Android)
- Or press `i` for iOS simulator / `a` for Android emulator

## 📁 Project Structure

```
checkpointly/
├── frontend/                 # React Native app
│   ├── app/                 # Expo Router pages
│   │   ├── (onboarding)/   # Onboarding flow
│   │   │   ├── welcome.tsx
│   │   │   ├── interests.tsx
│   │   │   ├── goal.tsx
│   │   │   ├── tempo.tsx
│   │   │   ├── how-it-works.tsx
│   │   │   ├── first-adventure.tsx
│   │   │   └── done.tsx
│   │   ├── (tabs)/         # Main app
│   │   │   ├── index.tsx   # Dashboard
│   │   │   ├── adventures.tsx
│   │   │   └── profile.tsx
│   │   └── _layout.tsx
│   ├── components/          # Reusable components
│   ├── contexts/           # React Context
│   ├── services/           # API services
│   └── utils/              # Helper functions
│
├── backend/                 # Node.js/Express server
│   ├── controllers/        # Business logic
│   │   ├── authController.js
│   │   ├── habitsController.js
│   │   ├── profileController.js
│   │   ├── rewardsController.js
│   │   └── dashboardController.js
│   ├── services/           # External services
│   │   └── openaiService.js
│   ├── routes/             # API endpoints
│   ├── middleware/         # Express middleware
│   ├── db/                 # Database
│   │   ├── schema.sql
│   │   └── migrations/
│   └── utils/              # Helper functions
│
└── docs/                    # Documentation
    ├── API.md
    ├── DEPLOYMENT.md
    └── CONTRIBUTING.md
```

## 🔌 API Documentation

### Authentication

#### POST /auth/register
Register a new user.

```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123",
  "dateOfBirth": "1995-06-15"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "onboardingCompleted": false
  }
}
```

#### POST /auth/login
Login existing user.

```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Adventures (Habits)

#### POST /habits/create
Create a new adventure with AI checkpoint generation.

```json
// Request
{
  "title": "Learn C++",
  "theme": "space",
  "dailyMinutes": 20,
  "experienceLevel": "beginner"
}

// Response
{
  "habit": {
    "id": "uuid",
    "title": "Learn C++",
    "theme": "space",
    "checkpoints": [
      {
        "id": "uuid",
        "title": "Install C++ compiler",
        "notes": "Download and install...",
        "orderIndex": 0,
        "completed": false
      }
      // ... more checkpoints
    ]
  }
}
```

#### GET /habits
Retrieve all user adventures.

#### POST /habits/:id/regenerate
Regenerate all checkpoints for an adventure.

### Checkpoints

#### POST /checkpoints/:id/complete
Mark checkpoint as completed.

```json
// Response
{
  "checkpoint": { "completed": true },
  "reward": {
    "xpGained": 20,
    "newXpTotal": 140,
    "newLevel": 2,
    "streakIncreased": true,
    "currentStreak": 7
  }
}
```

### Rewards

#### POST /rewards/daily-bonus
Claim daily bonus.

```json
// Response
{
  "reward": {
    "type": "xp",  // or "freeze_token"
    "amount": 50
  },
  "newStats": {
    "xp": 190,
    "level": 2,
    "freezeTokens": 0
  }
}
```

#### GET /rewards/stats
Get user statistics.


## 💻 Development

### Running tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Linting

```bash
# Backend
npm run lint

# Frontend
npm run lint
```

### Database migrations

```bash
cd backend

# Create new migration
npm run migrate:create migration_name

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback
```

### Debug mode

```bash
# Backend with debug output
DEBUG=checkpointly:* npm run dev

# Frontend with debug mode
EXPO_DEBUG=true npm start
```

## 🚀 Deployment

### Backend (Railway)

1. Create a Railway account at [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add PostgreSQL plugin
4. Set environment variables
5. Deploy will run automatically

```bash
# Or via Railway CLI
railway login
railway link
railway up
```

### Frontend (Expo)

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

Detailed instructions in [DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## 🗓 Roadmap

### V1.0 (Current version) ✅
- [x] AI checkpoint generation
- [x] Gamification system (XP, level, streak)
- [x] Personalized onboarding
- [x] Visual themes
- [x] Daily bonus system
- [x] Freeze token mechanism
- [x] Social layer (friend system)
- [x] Shared adventures

### V1.1 (Q2 2026)
- [ ] Leaderboards
- [ ] Community challenges

### V1.2 (Q3 2026)
- [ ] Adaptive AI difficulty
- [ ] Smart reminders
- [ ] Advanced analytics dashboard
- [ ] Progress export (PDF, CSV)

### V2.0 (Q4 2026)
- [ ] Premium tier
- [ ] Offline mode with sync
- [ ] iOS and Web versions
- [ ] Adventure marketplace
- [ ] Personalized AI coaching

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Reporting Bugs

Please use GitHub Issues to report bugs. Include:
- Clear problem description
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots if applicable
- Environment info (OS, app version, etc.)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

Project developed by a team dedicated to improving productivity and mental well-being through technology.

Marko Gerbus - @gerbus_marko
Matej Levanić - @levanic33
Pablo Koren - @pablo.koren

On Instagram.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) for the GPT API
- [Expo](https://expo.dev/) for excellent development experience
- [Railway](https://railway.app/) for simple deployment
- All beta testers who helped shape the app
- State commission for the opportunity to present our idea to a wider audience 
- Mentor for support

Official Software Development Competition Website:
https://informatika.azoo.hr/kategorija/3/Razvoj-softvera

## 📞 Contact

- Email: markogerbus8@gmail.com

---

<p align="center">
  Made with ❤️ for everyone who wants to build better habits
</p>

<p align="center">
  <sub>Checkpointly © 2026</sub>
</p>
<hr/>

# Checkpointly 🎯 [HR]

> AI-pokretana aplikacija za izgradnju navika kroz gamificirane avanture

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.73-blue.svg)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
![Nagrada](https://img.shields.io/badge/Croatian_Software_Development_Competition-7._Mjesto-FFD700.svg)

![Checkpointly Banner](/client/assets/images/Checkpointly_bez_pozadine.png)

## 📖 Sadržaj

- [O projektu](#-o-projektu)
- [Ključne značajke](#-ključne-značajke)
- [Tehnologije](#-tehnologije)
- [Instalacija](#-instalacija)
- [Struktura projekta](#-struktura-projekta)
- [Razvoj](#-razvoj)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Doprinos](#-doprinos)
- [Licenca](#-licenca)

## 🎯 O projektu

🏆 **Nagrađivana aplikacija:** Checkpointly je s ponosom osvojio **7. mjesto** na službenom natjecanju u razvoju softvera u Hrvatskoj (Croatian Software Development Competition)!

Checkpointly je inovativna mobilna aplikacija koja revolucionizira način na koji ljudi grade navike i ostvaruju ciljeve. Umjesto tradicionalnog praćenja navika, Checkpointly pretvara svaki cilj u **avanturu** – strukturiranu putanju sastavljenu od malih, izvedivih checkpoint koraka.

### Problem koji rješavamo

Većina ljudi formulira velike ciljeve poput "Počet ću redovito trenirati" ili "Naučit ću programirati", ali vrlo brzo gubi motivaciju jer:

- ❌ Ne znaju s čime početi
- ❌ Ne razumiju kako progresivno povećavati težinu
- ❌ Ne vide svoj napredak
- ❌ Izgube motivaciju nakon prvog propusta

### Naše rješenje

Checkpointly koristi **umjetnu inteligenciju** za:

- ✅ Automatsko generiranje personaliziranih checkpoint mapa
- ✅ Prilagođavanje težine prema korisnikovom iskustvu i vremenu
- ✅ Gamifikaciju napretka (XP, level, streak)
- ✅ Vizualno praćenje postignuća
- ✅ Freeze token sustav koji daje fleksibilnost
- ✅ Povezivanje s prijateljima i dijeljenje avantura

## ✨ Ključne značajke

### 🤖 AI Generiranje Checkpointa

Napredni OpenAI sustav koji kreira personalizirane korake na temelju:
- Korisnikovih interesa
- Dostupnog vremena (5-30+ min dnevno)
- Experience levela (beginner, intermediate, advanced)
- Tipa cilja (habit, consistency, project, energy_sleep, explore)

```javascript
// Primjer AI generiranih checkpointa za "Naučiti C++"
[
  {
    title: "Instaliraj C++ kompajler",
    notes: "Preuzmi i instaliraj GCC ili Visual Studio..."
  },
  {
    title: "Napiši prvi Hello World program",
    notes: "Kreiraj main.cpp datoteku i napiši osnovnu strukturu..."
  },
  // ... 6-10 checkpointa ukupno
]
```

### 🎮 Gamifikacijski Sustav

- **XP Bodovi**: 20 XP po završenom checkpointu (jednom dnevno)
- **Level Sustav**: Linearna progresija s vizualnim progress barom
- **Streak Tracking**: Prati uzastopne dane aktivnosti
- **Dnevni Bonus**: Nasumične nagrade (10-100 XP ili freeze token)
- **Freeze Tokens**: Spasi svoj streak kada propustiš dan

### 👥 Socijalne Značajke

- **Sustav prijatelja**: Dodajte prijatelje u svoju mrežu i zajedno ostanite motivirani
- **Dijeljenje avantura**: Podijelite svoje trenutne avanture s prijateljima za međusobnu odgovornost
- **Socijalni Feed**: Pratite aktivnosti i napredak svojih prijatelja u stvarnom vremenu

### 🎨 Vizualne Teme

Svaka avantura ima jedinstveni vizualni identitet:

| Tema | Emoji | Mood | Boje |
|------|-------|------|------|
| Planina | ⛰️ | Ustrajnost, penjanje | Siva, plava, bijela |
| Svemir | 🌌 | Istraživanje, kreativnost | Tamno plava, ljubičasta |
| Šuma | 🌲 | Rast, priroda, mir | Emerald, zelena, smeđa |
| Ocean | 🌊 | Fluidnost, adaptacija | Tirkizna, plava |
| Pustinja | 🏜️ | Izdržljivost, fokus | Zlatna, narančasta |

### 📱 Personalizirani Onboarding

7-koračni proces koji prilagođava aplikaciju:

1. **Welcome** – Upoznavanje s konceptom
2. **Interests** – Odabir područja interesa
3. **Goal** – Definiranje tipa cilja
4. **Tempo** – Postavljanje dnevnog vremena
5. **How It Works** – Kratki tutorial
6. **First Adventure** – Kreiranje prve avanture
7. **Done** – Ulazak u aplikaciju

## 🛠 Tehnologije

### Frontend

```
React Native 0.73+    │ Cross-platform razvoj
Expo Router           │ File-based routing
TypeScript            │ Type-safe development
Context API           │ State management
AsyncStorage          │ Lokalno spremanje
```

### Backend

```
Node.js 18+           │ Runtime environment
Express 4.18+         │ Web framework
PostgreSQL 14+        │ Relacijska baza
JWT                   │ Autentifikacija
bcrypt                │ Password hashing
```

### AI & Servisi

```
OpenAI API            │ GPT-4 za generiranje checkpointa
Railway               │ Hosting i deployment
GitHub Actions        │ CI/CD pipeline
```

### Razvojna okruženja

```
VS Code               │ IDE
Expo Go               │ Mobile testing
Postman               │ API testing
pgAdmin               │ Database management
```

## 📦 Instalacija

### Preduvjeti

- Node.js 18+ ([preuzmi](https://nodejs.org/))
- npm ili yarn
- PostgreSQL 14+ ([preuzmi](https://www.postgresql.org/download/))
- Expo CLI: `npm install -g expo-cli`
- Git

### 1. Kloniraj repozitorij

```bash
git clone https://github.com/gerbadev/checkpointly-app.git
cd checkpointly
```

### 2. Backend setup

```bash
cd backend

# Instaliraj dependencies
npm install

# Kreiraj .env datoteku
cp .env.example .env

# Uredi .env s tvojim credentials:
# DATABASE_URL=postgresql://user:password@localhost:5432/checkpointly
# OPENAI_API_KEY=sk-...
# JWT_SECRET=your-secret-key
# PORT=3000

# Pokreni migrations
npm run migrate

# Pokreni development server
npm run dev
```

### 3. Frontend setup

```bash
cd ../frontend

# Instaliraj dependencies
npm install

# Kreiraj .env datoteku
cp .env.example .env

# Uredi .env:
# EXPO_PUBLIC_API_URL=http://localhost:3000

# Pokreni Expo development server
npm start
```

### 4. Mobitel testiranje

- Skeniraj QR kod s Expo Go aplikacijom (iOS/Android)
- Ili pritisni `i` za iOS simulator / `a` za Android emulator

## 📁 Struktura projekta

```
checkpointly/
├── frontend/                 # React Native aplikacija
│   ├── app/                 # Expo Router stranice
│   │   ├── (onboarding)/   # Onboarding flow
│   │   │   ├── welcome.tsx
│   │   │   ├── interests.tsx
│   │   │   ├── goal.tsx
│   │   │   ├── tempo.tsx
│   │   │   ├── how-it-works.tsx
│   │   │   ├── first-adventure.tsx
│   │   │   └── done.tsx
│   │   ├── (tabs)/         # Glavna aplikacija
│   │   │   ├── index.tsx   # Dashboard
│   │   │   ├── adventures.tsx
│   │   │   └── profile.tsx
│   │   └── _layout.tsx
│   ├── components/          # Reusable komponente
│   ├── contexts/           # React Context
│   ├── services/           # API servisi
│   └── utils/              # Helper funkcije
│
├── backend/                 # Node.js/Express server
│   ├── controllers/        # Business logika
│   │   ├── authController.js
│   │   ├── habitsController.js
│   │   ├── profileController.js
│   │   ├── rewardsController.js
│   │   └── dashboardController.js
│   ├── services/           # Eksterni servisi
│   │   └── openaiService.js
│   ├── routes/             # API endpoints
│   ├── middleware/         # Express middleware
│   ├── db/                 # Database
│   │   ├── schema.sql
│   │   └── migrations/
│   └── utils/              # Helper funkcije
│
└── docs/                    # Dokumentacija
    ├── API.md
    ├── DEPLOYMENT.md
    └── CONTRIBUTING.md
```

## 🔌 API Dokumentacija

### Autentifikacija

#### POST /auth/register
Registracija novog korisnika.

```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123",
  "dateOfBirth": "1995-06-15"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "onboardingCompleted": false
  }
}
```

#### POST /auth/login
Prijava postojećeg korisnika.

```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Avanture (Habits)

#### POST /habits/create
Kreiranje nove avanture s AI generiranjem checkpointa.

```json
// Request
{
  "title": "Naučiti C++",
  "theme": "space",
  "dailyMinutes": 20,
  "experienceLevel": "beginner"
}

// Response
{
  "habit": {
    "id": "uuid",
    "title": "Naučiti C++",
    "theme": "space",
    "checkpoints": [
      {
        "id": "uuid",
        "title": "Instaliraj C++ kompajler",
        "notes": "Preuzmi i instaliraj...",
        "orderIndex": 0,
        "completed": false
      }
      // ... više checkpointa
    ]
  }
}
```

#### GET /habits
Dohvaćanje svih avantura korisnika.

#### POST /habits/:id/regenerate
Regeneracija svih checkpointa za avanturu.

### Checkpointi

#### POST /checkpoints/:id/complete
Označavanje checkpointa kao završenog.

```json
// Response
{
  "checkpoint": { "completed": true },
  "reward": {
    "xpGained": 20,
    "newXpTotal": 140,
    "newLevel": 2,
    "streakIncreased": true,
    "currentStreak": 7
  }
}
```

### Nagrade

#### POST /rewards/daily-bonus
Preuzimanje dnevnog bonusa.

```json
// Response
{
  "reward": {
    "type": "xp",  // ili "freeze_token"
    "amount": 50
  },
  "newStats": {
    "xp": 190,
    "level": 2,
    "freezeTokens": 0
  }
}
```

#### GET /rewards/stats
Dohvaćanje statistike korisnika.


## 💻 Razvoj

### Pokretanje testova

```bash
# Backend testovi
cd backend
npm test

# Frontend testovi
cd frontend
npm test
```

### Linting

```bash
# Backend
npm run lint

# Frontend
npm run lint
```

### Database migrations

```bash
cd backend

# Kreiranje nove migracije
npm run migrate:create naziv_migracije

# Pokretanje migracija
npm run migrate

# Rollback zadnje migracije
npm run migrate:rollback
```

### Debug mode

```bash
# Backend s debug outputom
DEBUG=checkpointly:* npm run dev

# Frontend s debug režimom
EXPO_DEBUG=true npm start
```

## 🚀 Deployment

### Backend (Railway)

1. Kreiraj Railway račun na [railway.app](https://railway.app)
2. Poveži GitHub repozitorij
3. Dodaj PostgreSQL plugin
4. Postavi environment varijable
5. Deploy će se pokrenuti automatski

```bash
# Ili preko Railway CLI
railway login
railway link
railway up
```

### Frontend (Expo)

```bash
# Build za iOS
eas build --platform ios

# Build za Android
eas build --platform android

# Submit na App Store
eas submit --platform ios

# Submit na Google Play
eas submit --platform android
```

Detaljne upute u [DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## 🗓 Roadmap

### V1.0 (Trenutna verzija) ✅
- [x] AI generiranje checkpointa
- [x] Gamifikacijski sustav (XP, level, streak)
- [x] Personalizirani onboarding
- [x] Vizualne teme
- [x] Dnevni bonus sustav
- [x] Freeze token mehanizam
- [x] Socijalni sloj (sustav prijatelja)
- [x] Dijeljenje avantura

### V1.1 (Q2 2026)
- [ ] Leaderboards
- [ ] Community challenges

### V1.2 (Q3 2026)
- [ ] Adaptive AI difficulty
- [ ] Smart reminders
- [ ] Advanced analytics dashboard
- [ ] Export napretka (PDF, CSV)

### V2.0 (Q4 2026)
- [ ] Premium tier
- [ ] Offline mode s sinkronizacijom
- [ ] iOS i Web verzije
- [ ] Marketplace za avanture
- [ ] Personalizirani AI coaching

## 🤝 Doprinos

Dobrodošli su doprinosi! Molimo pročitajte [CONTRIBUTING.md](./docs/CONTRIBUTING.md) za detalje o našem code of conduct i procesu slanja pull requesta.

### Kako doprinijeti

1. Fork repozitorija
2. Kreiraj feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit promjene (`git commit -m 'Add some AmazingFeature'`)
4. Push na branch (`git push origin feature/AmazingFeature`)
5. Otvori Pull Request

### Prijava bugova

Molimo koristite GitHub Issues za prijavu bugova. Uključite:
- Jasni opis problema
- Korake za reprodukciju
- Očekivano vs. stvarno ponašanje
- Screenshots ako je primjenjivo
- Environment info (OS, verzija aplikacije, itd.)

## 📄 Licenca

Ovaj projekt je licenciran pod MIT licencom - pogledajte [LICENSE](LICENSE) datoteku za detalje.

## 👨‍💻 Autor

Projekt razvija tim posvećen poboljšanju produktivnosti i mentalne dobrobiti kroz tehnologiju.

Marko Gerbus - @gerbus_marko
Matej Levanić - @levanic33
Pablo Koren - @pablo.koren

Na Instagramu.

## 🙏 Zahvale

- [OpenAI](https://openai.com/) za GPT API
- [Expo](https://expo.dev/) za odličan development experience
- [Railway](https://railway.app/) za jednostavan deployment
- Svim beta testerima koji su pomogli oblikovati aplikaciju
- Državnom povjerenstvu na prilici da iznesemo svoju ideju široj publici
- Mentoru na podršci

Službena stranica natjecanja:
https://informatika.azoo.hr/kategorija/3/Razvoj-softvera

## 📞 Kontakt

- Email: markogerbus8@gmail.com

---

<p align="center">
  Napravljeno s ❤️ za sve koji žele graditi bolje navike
</p>

<p align="center">
  <sub>Checkpointly © 2026</sub>
</p>
