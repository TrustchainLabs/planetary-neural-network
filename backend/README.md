### Backend – Smart App (NestJS)

Edge-first Smart App for device onboarding, data validation, AI-ready processing, Smart Node coordination, and Hedera integrations (HCS/HTS). Built for the Hedera Origins Hackathon.

We use Yarn. Do not use npm. Environment file must be named `.smart_app.env`.

### Tech
- NestJS 10, WebSockets (Socket.IO)
- MongoDB (Mongoose), Redis (cache/throttling/sessions)
- Hsuite SDKs for Smart Nodes, Smart Config, Users, Auth, Subscriptions
- TensorFlow.js for optional inference pathways

### Setup
1) Install dependencies

```bash
yarn
```

2) Configure environment

```bash
cp .smart_app.env.example .smart_app.env
# Edit .smart_app.env to match your setup
```

Key variables from `.smart_app.env.example`:
- General: `IS_DEBUG_MODE`, `VALID_DURATION`, `CLUSTERS`
- Hedera/Network: `NODE_ENV` (testnet|mainnet), `CLIENT_ENV` (local-node|mainnet|testnet), `NETWORK`, `LEDGER`
- Server: `PORT`
- Session/Auth: `SESSION_SECRET`
- Smart Registry: `SMART_REGISTRY_URL`
- Mongo: `DEV_MONGO_DB`, `PROD_MONGO_DB`
- Subscriptions: `DEV_SUBSCRIPTIONS_TOKEN_ID`, `PROD_SUBSCRIPTIONS_TOKEN_ID`, payment token and decimals, `SUBSCRIPTIONS_PAYMENT_COINGECKO_ID`, `COINGECKO_API_KEY`, `SUBSCRIPTIONS_CID`, `SUBSCRIPTIONS_METADATA`
- Redis: `REDIS_URL`, `REDIS_USERNAME`, `REDIS_PASSWORD`, `REDIS_PORT`, `REDIS_DATABASE`
- Sensors: `ENABLE_MOCK_SENSORS`
- Testnet operator: `DEV_NODE_ID`, `DEV_NODE_PRIVATE_KEY`, `DEV_NODE_PUBLIC_KEY`

### First-time initialization (new database)
Run this once on a fresh database to create/seed configuration:

```bash
yarn run commander config
```

### Device server

```bash
yarn start:device
```

### Production server

```bash
yarn start:prod            # runs dist/src/main
# or
yarn start:production      # runs dist/src/main-production
```

### CLI Utilities
Some operations are exposed via a Commander-based CLI:

```bash
# General command entry
yarn commander --help

# Create/configure app config
yarn run commander config

# Or via helper script
yarn config:create
```

### Testing & Linting
```bash
yarn test
yarn test:watch
yarn test:cov
yarn test:e2e
yarn lint
```

### Notes
- Ensure MongoDB and Redis are reachable if you enable related modules
- The backend serves APIs and websockets consumed by the Ionic/Angular frontend
