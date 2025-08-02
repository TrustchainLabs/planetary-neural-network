# @hsuite/dao

> 🚧 **Work in Progress** - This application is currently under active development. Features and APIs may change.

> 🏛️ **Decentralized Autonomous Organization (DAO) Platform** - A comprehensive governance solution for the Hedera ecosystem.

A powerful and flexible DAO management platform that enables decentralized governance, proposal management, and community-driven decision-making within the HbarSuite ecosystem. Built with NestJS, MongoDB, and seamless integration with the Hedera network.

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technical Architecture](#technical-architecture)
- [API Endpoints](#api-endpoints)
- [Installation & Setup](#installation--setup)
- [Usage Examples](#usage-examples)
- [Database Schema](#database-schema)
- [Environment Configuration](#environment-configuration)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🔍 Overview

The `@hsuite/dao` application provides a complete DAO governance infrastructure that supports:

- **DAO Creation & Management**: Create and configure DAOs with custom governance rules
- **Proposal Lifecycle**: Submit, vote on, and execute governance proposals
- **Flexible Voting**: Support for token-weighted voting and custom voting options
- **Member Management**: Handle DAO membership and permissions
- **Real-time Updates**: WebSocket integration for live governance updates

## ✨ Features

### 🏛️ DAO Management
- **Create DAOs** with custom governance parameters
- **Configure voting rules** including thresholds and voting periods
- **Manage member permissions** and access control
- **Track DAO status** and operational metrics

### 📝 Proposal System
- **Submit proposals** with structured data and custom voting options
- **Lifecycle management** from creation to execution
- **Multiple proposal types** supporting various governance actions
- **Time-bounded voting** with configurable periods

### 🗳️ Voting Mechanism
- **Flexible voting options** (YES/NO/ABSTAIN or custom choices up to 5 options)
- **Token-weighted voting** based on governance token holdings
- **Vote validation** ensuring member eligibility and preventing duplicates
- **Voting history** and transparency features

### 🔄 Real-time Features
- **WebSocket integration** for live updates
- **Event-driven architecture** with background job processing
- **Automated status updates** based on voting outcomes

## 🏗️ Technical Architecture

### Core Components

```typescript
/**
 * Main application components:
 * - SmartAppService: Core application logic and initialization
 * - DaoModule: DAO entity management and business logic
 * - ProposalModule: Proposal lifecycle management
 * - VoteModule: Voting system and validation
 * - ConfigModule: Application configuration management
 */
```

### Data Models

#### DAO Entity
```typescript
interface Dao {
  daoId: string;              // Unique DAO identifier
  name: string;               // DAO display name
  description: string;        // DAO description
  ownerAddress: string;       // Creator's Hedera account ID
  status: DaoStatus;          // PENDING | ACTIVE | INACTIVE
  votingRules: {
    threshold: number;        // Approval threshold (1-100%)
    minVotingPeriod: number;  // Minimum voting duration (hours)
    tokenWeighted: boolean;   // Token-weighted vs equal voting
  };
  members: string[];          // Array of member addresses
  proposals: Proposal[];      // Associated proposals
}
```

#### Proposal Entity
```typescript
interface Proposal {
  proposalId: string;         // Unique proposal identifier
  daoId: string;             // Parent DAO reference
  title: string;             // Proposal title
  description: string;       // Detailed description
  creatorAddress: string;    // Proposer's address
  status: ProposalStatus;    // PENDING | ACTIVE | PASSED | REJECTED
  startTime: Date;           // Voting start time
  endTime: Date;             // Voting end time
  proposalData: object;      // Custom proposal data
  votingOptions: string[];   // Available voting choices
  votes: Vote[];             // Cast votes
}
```

#### Vote Entity
```typescript
interface Vote {
  voteId: string;            // Unique vote identifier
  proposalId: string;        // Target proposal
  daoId: string;             // Parent DAO
  voterAddress: string;      // Voter's address
  choice: string;            // Selected voting option
  weight: number;            // Vote weight (for token-weighted voting)
  comment?: string;          // Optional voter comment
}
```

### Infrastructure Stack
- **Framework**: NestJS with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Queue System**: Bull Queue for background processing
- **WebSockets**: Real-time communication
- **Blockchain**: Hedera Hashgraph integration
- **Validation**: class-validator and class-transformer
- **Documentation**: Swagger/OpenAPI

## 🔌 API Endpoints

### DAO Management

#### Create DAO
```http
POST /daos
Content-Type: application/json

{
  "name": "HbarSuite Community DAO",
  "description": "Governance for HbarSuite ecosystem",
  "ownerAddress": "0.0.123456",
  "votingRules": {
    "threshold": 51,
    "minVotingPeriod": 72,
    "tokenWeighted": true
  }
}
```

#### Get DAO by ID
```http
GET /daos/{daoId}
```

#### Get DAOs by Owner
```http
GET /daos/owner/{ownerAddress}
```

#### Add Member to DAO
```http
POST /daos/{daoId}/members
Content-Type: application/json

{
  "memberAddress": "0.0.789012"
}
```

### Proposal Management

#### Create Proposal
```http
POST /proposals
Content-Type: application/json

{
  "daoId": "dao-123",
  "title": "Treasury Allocation for Q4",
  "description": "Allocate 10,000 HBAR for marketing initiatives",
  "creatorAddress": "0.0.123456",
  "votingDurationHours": 168,
  "proposalData": {
    "action": "transfer",
    "amount": 10000,
    "currency": "HBAR",
    "recipient": "0.0.789012"
  },
  "votingOptions": ["Approve", "Reject", "Modify Amount"]
}
```

#### Get Proposal
```http
GET /proposals/{proposalId}
```

#### Get DAO Proposals
```http
GET /proposals/dao/{daoId}
```

#### Get Active Proposals
```http
GET /proposals/dao/{daoId}/active
```

### Voting

#### Cast Vote
```http
POST /votes
Content-Type: application/json

{
  "proposalId": "prop-456",
  "daoId": "dao-123",
  "voterAddress": "0.0.345678",
  "choice": "Approve",
  "comment": "This proposal aligns with our strategic goals"
}
```

#### Get Vote by ID
```http
GET /votes/{voteId}
```

#### Get Proposal Votes
```http
GET /votes/proposal/{proposalId}
```

#### Get Voter's Vote
```http
GET /votes/proposal/{proposalId}/voter/{voterAddress}
```

#### Get Voting Results
```http
GET /votes/proposal/{proposalId}/results
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- MongoDB 5.0+
- Redis (for Bull Queue)
- Hedera account for blockchain interaction

### Environment Configuration

Create `.smart_app.env` file:
```bash
# Database Configuration
DATABASE_URL=mongodb://localhost:27017/hsuite_dao

# Redis Configuration (for queues)
REDIS_HOST=localhost
REDIS_PORT=6379

# Hedera Network Configuration
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT
HEDERA_PRIVATE_KEY=your_private_key

# Application Configuration
PORT=3001
APP_NAME=@hsuite/dao
LOG_LEVEL=info

# WebSocket Configuration
WS_PORT=3002
WS_NAMESPACE=dao_events

# Queue Configuration
QUEUE_REDIS_URL=redis://localhost:6379
```

### Installation Steps

1. **Install dependencies**:
```bash
npm install
# or
yarn install
```

2. **Start MongoDB and Redis**:
```bash
# MongoDB
mongod --dbpath /path/to/db

# Redis
redis-server
```

3. **Run database migrations** (if any):
```bash
npm run migration:run
```

4. **Start the application**:
```bash
# Development mode
npm run start:dev dao

# Production mode
npm run start:prod dao
```

5. **Verify installation**:
```bash
curl http://localhost:3001/health
```

## 📚 Usage Examples

### Complete DAO Workflow

```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:3001';

// 1. Create a DAO
const createDao = async () => {
  const response = await axios.post(`${API_BASE}/daos`, {
    name: 'Community Treasury DAO',
    description: 'Managing community funds and initiatives',
    ownerAddress: '0.0.123456',
    votingRules: {
      threshold: 60,
      minVotingPeriod: 72,
      tokenWeighted: true
    }
  });
  return response.data.daoId;
};

// 2. Add members to the DAO
const addMember = async (daoId: string, memberAddress: string) => {
  await axios.post(`${API_BASE}/daos/${daoId}/members`, {
    memberAddress
  });
};

// 3. Create a proposal
const createProposal = async (daoId: string) => {
  const response = await axios.post(`${API_BASE}/proposals`, {
    daoId,
    title: 'Fund Developer Bounty Program',
    description: 'Allocate 5000 HBAR for developer incentives',
    creatorAddress: '0.0.123456',
    votingDurationHours: 120,
    proposalData: {
      action: 'allocate_treasury',
      amount: 5000,
      purpose: 'developer_bounties'
    }
  });
  return response.data.proposalId;
};

// 4. Cast a vote
const castVote = async (proposalId: string, daoId: string) => {
  await axios.post(`${API_BASE}/votes`, {
    proposalId,
    daoId,
    voterAddress: '0.0.789012',
    choice: 'YES',
    comment: 'Great initiative for ecosystem growth'
  });
};

// 5. Check voting results
const getResults = async (proposalId: string) => {
  const response = await axios.get(`${API_BASE}/votes/proposal/${proposalId}/results`);
  return response.data;
};
```

### WebSocket Integration

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3002', {
  auth: {
    token: 'your_auth_token'
  }
});

// Listen for DAO events
socket.on('dao_created', (data) => {
  console.log('New DAO created:', data);
});

socket.on('proposal_submitted', (data) => {
  console.log('New proposal submitted:', data);
});

socket.on('vote_cast', (data) => {
  console.log('Vote cast:', data);
});

socket.on('proposal_status_changed', (data) => {
  console.log('Proposal status updated:', data);
});
```

## 🗃️ Database Schema

### Collections Structure

#### dao_entities
```javascript
{
  _id: ObjectId,
  daoId: String (unique),
  name: String,
  description: String,
  ownerAddress: String,
  status: String, // 'PENDING' | 'ACTIVE' | 'INACTIVE'
  votingRules: {
    threshold: Number,
    minVotingPeriod: Number,
    tokenWeighted: Boolean
  },
  members: [String],
  proposals: [ObjectId], // refs to dao_proposals
  createdAt: Date,
  updatedAt: Date
}
```

#### dao_proposals
```javascript
{
  _id: ObjectId,
  proposalId: String (unique),
  dao: ObjectId, // ref to dao_entities
  daoId: String,
  title: String,
  description: String,
  creatorAddress: String,
  status: String, // 'PENDING' | 'ACTIVE' | 'PASSED' | 'REJECTED'
  startTime: Date,
  endTime: Date,
  proposalData: Object,
  votingOptions: [String],
  votes: [ObjectId], // refs to dao_votes
  createdAt: Date,
  updatedAt: Date
}
```

#### dao_votes
```javascript
{
  _id: ObjectId,
  voteId: String (unique),
  proposal: ObjectId, // ref to dao_proposals
  proposalId: String,
  dao: ObjectId, // ref to dao_entities
  daoId: String,
  voterAddress: String,
  choice: String,
  weight: Number,
  comment: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔧 Development

### Project Structure
```
apps/dao/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── smart-app.module.ts     # Root module
│   ├── smart-app.service.ts    # Core application service
│   ├── smart-app.controller.ts # Main controller
│   ├── commander.ts            # CLI commands
│   ├── sockets/                # WebSocket implementation
│   └── modules/
│       ├── config/             # Configuration module
│       ├── daos/               # DAO entities and services
│       │   ├── entities/       # DAO entity definitions
│       │   ├── dto/            # Data transfer objects
│       │   ├── dao.controller.ts
│       │   ├── dao.service.ts
│       │   └── dao.model.service.ts
│       ├── proposals/          # Proposal management
│       │   ├── entities/       # Proposal entities
│       │   ├── dto/            # DTOs for proposals
│       │   ├── proposal.controller.ts
│       │   ├── proposal.service.ts
│       │   └── proposal.model.service.ts
│       └── votes/              # Voting system
│           ├── entities/       # Vote entities
│           ├── dto/            # Vote DTOs
│           ├── vote.controller.ts
│           ├── vote.service.ts
│           └── vote.model.service.ts
├── test/                       # Test files
├── config/                     # Configuration files
├── tsconfig.app.json          # TypeScript config
└── README.md                  # This file
```

### Running Tests
```bash
# Unit tests
npm run test dao

# E2E tests
npm run test:e2e dao

# Test coverage
npm run test:cov dao

# Watch mode
npm run test:watch dao
```

### Code Quality
```bash
# Linting
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### Building for Production
```bash
# Build the application
npm run build dao

# Start production server
npm run start:prod dao
```

## 📖 API Documentation

The application provides comprehensive API documentation via Swagger UI:

- **Development**: http://localhost:3001/api/docs
- **Swagger JSON**: http://localhost:3001/api/docs-json

### Key API Features:
- **Comprehensive schemas** for all request/response objects
- **Interactive testing** directly from the documentation
- **Authentication examples** for secured endpoints
- **Error response documentation** with status codes

## 🔒 Security Considerations

- **Input validation** using class-validator decorators
- **Authentication** via Hedera account signatures
- **Rate limiting** on API endpoints
- **Data sanitization** for MongoDB injection prevention
- **CORS configuration** for cross-origin requests

## 🤝 Contributing

We welcome contributions to improve the DAO platform! Please read our [Contributing Guide](../../CONTRIBUTING.md) for details on:

- Code style and conventions
- Testing requirements
- Pull request process
- Issue reporting guidelines

## 📄 License

This package is part of the HbarSuite ecosystem and is covered by its license terms.

---

## 🆘 Support & Documentation

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Comprehensive guides in `/docs`
- **Community**: Join our Discord for real-time support
- **API Reference**: Interactive Swagger documentation

---

<p align="center">
  Built with ❤️ by the HbarSuite Team<br>
  Empowering decentralized governance on Hedera<br>
  Copyright © 2024 HbarSuite. All rights reserved.
</p>