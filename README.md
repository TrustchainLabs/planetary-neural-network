### Ecosphere – Planetary Neural Network (Hedera Origins Hackathon)

Ecosphere builds a decentralized, edge-first climate intelligence network on Hedera. The platform tokenizes geography into Geo Medallion NFTs, runs a Smart App on devices for on-device validation and AI inferencing, and anchors integrity and rewards through Smart Nodes and Hedera services.

- **Backend**: NestJS Smart App (`./backend`) – device data ingestion, validation, Smart Node + Hedera integrations, APIs and websockets
- **Frontend**: Ionic + Angular app (`./frontend`) – wallet connect, map, medallion purchase/admin, device UX

### Prerequisites
- Node.js (LTS recommended)
- Yarn (we do not use npm)
- Redis and MongoDB available for backend features that require them

### Quick Start
1) Install dependencies

```bash
cd backend && yarn install && cd ../frontend && yarn install
```

2) Configure backend environment

```bash
cd backend
cp .smart_app.env.example .smart_app.env
# Fill in required values (Hedera network, Mongo, Redis, Smart Registry, etc.)
```

3) First-time backend initialization (new database)

```bash
cd backend
yarn run commander config   # seed/create config for a fresh DB
```

4) Run dev servers (three terminals)

```bash
# Terminal 1 – Backend (NestJS)
cd backend
yarn yarn start:prod

# Terminal 2 – Backend (NestJS)
cd backend
yarn yarn start:device

# Terminal 3 – Frontend (Angular)
cd frontend
ionic serve
```

Backend defaults to `PORT=8888` (configurable via `.smart_app.env`). Frontend serves on Angular’s default dev port (typically 4200).

### Monorepo Structure
- `backend/`: NestJS Smart App, CLI tools, device entrypoints, tests
- `frontend/`: Ionic/Angular application
- `ecosphere_pitch.txt`: Hackathon pitch notes and links

### Contributing
- Use Yarn for all commands
- Backend environment file must be named `.smart_app.env`

### Links
- Documentation: [docs.ecosphereprime.com](https://docs.ecosphereprime.com)
- Demo playlist: [YouTube Playlist](https://www.youtube.com/playlist?list=PLFbuiTmxwo5qLeC-m4gQZyJLgO6KrRG__)
- Hackathon demo: [Video](https://youtu.be/lKfduZpjgCc)
- Neuroverse explainer: [Video](https://youtu.be/XQOFF3BsLYI)
- Wayfarer Agent demo: [Video](https://youtu.be/UnLqJUzmGww)

