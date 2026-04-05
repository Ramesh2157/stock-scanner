# Stock Scanner AI - Project Context

## 📋 Project Overview

**Name:** Stock Scanner AI - Autonomous Trading System  
**Version:** 0.1.0  
**Status:** Phase 1 (Foundation)  
**Date Created:** April 5, 2026

### 🎯 Mission
Build an autonomous AI-powered stock analysis and trading system using:
- **Claude 3.5 Sonnet** - Pattern analysis & decision-making brain
- **Claw.ai Agents** - Task execution & automation
- **Paperclip.ai** - Company reporting & dashboard management

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   AUTONOMOUS AGENT ECOSYSTEM                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ CLAUDE SONNET    │  │ CLAW.AI AGENTS   │  │ PAPERCLIP.AI │  │
│  │ (Brain)          │  │ (Executors)      │  │ (Manager)    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                     │                    │           │
│           ├─────────────────────┼────────────────────┤           │
│           │                     │                    │           │
│  ┌────────▼──────────────────────────────────────────▼────────┐  │
│  │      CENTRAL ORCHESTRATOR / MESSAGE BUS                   │  │
│  │   (Manages agent communication & task delegation)         │  │
│  └────────┬──────────────────────────────────────────────────┘  │
│           │                                                     │
│  ┌────────▼──────────────────────────────────────────────────┐  │
│  │           DATA LAYER (SQLite)                             │  │
│  │  ├─ Real-time Market Data                                 │  │
│  │  ├─ Trade Execution Log                                   │  │
│  │  ├─ Daily Reports Database                                │  │
│  │  └─ Historical Backtest Results                           │  │
│  └────────┬──────────────────────────────────────────────────┘  │
│           │                                                     │
│  ┌────────▼──────────────────────────────────────────────────┐  │
│  │      DASHBOARD & REPORTING (WebSocket + React)            │  │
│  │  ├─ Real-time Portfolio View                              │  │
│  │  ├─ Daily AI Reports (Email/Web)                          │  │
│  │  ├─ Agent Performance Metrics                             │  │
│  │  └─ Risk Management Alerts                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Phase Breakdown

### **Phase 1: Foundation (Week 1-2)** ✅ CURRENT
- Project structure & CI/CD setup
- Claude API integration
- Database schema & initialization
- Logging system
- Unit tests framework
- **GitHub Branch:** `phase-1-foundation`

### **Phase 2: Agent Framework (Week 3-4)**
- Claw Agent SDK integration
- ScannerAgent implementation
- ExecutionAgent implementation
- RiskAgent implementation
- Message Bus architecture
- **GitHub Branch:** `phase-2-agents`

### **Phase 3: Orchestration (Week 5-6)**
- AgentOrchestrator core
- Automated workflow engine
- Inter-agent communication
- Error handling & recovery
- Task delegation system
- **GitHub Branch:** `phase-3-orchestration`

### **Phase 4: Reporting & Dashboard (Week 7-8)**
- Paperclip Company integration
- Daily report generation
- WebSocket dashboard server
- React frontend UI
- Email distribution
- **GitHub Branch:** `phase-4-dashboard`

### **Phase 5: Integration & Testing (Week 9-10)**
- End-to-end testing
- Performance optimization
- Docker containerization
- GitHub Actions CI/CD
- Production deployment
- **GitHub Branch:** `phase-5-integration`

### **Phase 6: Monitoring & Optimization (Week 11+)**
- Live trading simulation
- Monitoring dashboard
- Performance tuning
- Continuous improvement
- Documentation
- **GitHub Branch:** `phase-6-optimization`

---

## 🗂️ Current Project Structure

```
stock-scanner/
├── src/
│   ├── agents/                    # Agent implementations
│   │   ├── baseAgent.mjs
│   │   ├── scannerAgent.mjs
│   │   ├── executionAgent.mjs
│   │   └── riskAgent.mjs
│   │
│   ├── orchestrator/              # Orchestration layer
│   │   ├── agentOrchestrator.mjs
│   │   ├── messageBus.mjs
│   │   └── workflowEngine.mjs
│   │
│   ├── services/                  # Business logic
│   │   ├── claudeService.mjs
│   │   ├── reportGenerator.mjs
│   │   └── paperclipCompanyManager.mjs
│   │
│   ├── db/                        # Database layer
│   │   ├── initialize.mjs
│   │   ├── schema.sql
│   │   └── migrations.mjs
│   │
│   ├── utils/                     # Utilities
│   │   ├── logger.mjs
│   │   ├── mockDataGenerator.mjs
│   │   └── constants.mjs
│   │
│   ├── tests/                     # Test suites by phase
│   │   ├── phase1/
│   │   │   ├── claude.test.mjs
│   │   │   └── database.test.mjs
│   │   ├── phase2/
│   │   ├── phase3/
│   │   ├── phase4/
│   │   └── phase5/
│   │
│   ├── dashboard/                 # Dashboard server
│   │   ├── dashboardServer.mjs
│   │   └── routes.mjs
│   │
│   └── main.mjs                   # Entry point
│
├── public/                        # Frontend assets
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── styles/
│   ├── dist/
│   └── index.html
│
├── data/                          # Data storage
│   ├── trades.db                  # SQLite database
│   ├── candles/                   # OHLCV data
│   ├── reports/                   # Generated reports
│   └── mock/                      # Mock data for testing
│
├── logs/                          # Application logs
│   ├── app.log
│   └── error.log
│
├── .github/
│   └── workflows/                 # CI/CD pipelines
│       ├── phase-1.yml
│       ├── phase-2.yml
│       └── ...
│
├── config/                        # Configuration files
│   ├── development.env
│   ├── production.env
│   └── testing.env
│
├── docs/                          # Documentation
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── API_REFERENCE.md
│   └── TESTING_GUIDE.md
│
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── package.json                   # Node dependencies
├── package-lock.json              # Locked dependencies
├── jest.config.js                 # Jest configuration
├── CONTEXT.md                     # This file
├── IMPLEMENTATION.md              # Phase-by-phase guide
├── README.md                      # Main readme
└── Dockerfile                     # Docker configuration
```

---

## 🔑 Key Technologies

### Runtime & Framework
- **Node.js:** 18+
- **Type:** ES Modules (.mjs)

### AI & APIs
- **Claude 3.5 Sonnet:** Pattern analysis & decision-making
- **Anthropic SDK:** @anthropic-ai/sdk v0.24.0
- **Claw.ai:** Agent framework (Phase 2)
- **Paperclip.ai:** Reporting system (Phase 4)

### Database
- **SQLite3:** Local data persistence
- **Migrations:** Version control for schema

### Backend
- **Express.js:** REST API server
- **Socket.io:** Real-time WebSocket communication
- **Bull Queue:** Task queue (optional)
- **Redis:** Caching & message queue (optional)

### Frontend
- **React:** UI framework
- **Recharts:** Data visualization
- **Socket.io Client:** Real-time updates
- **Zustand:** State management

### DevOps
- **Docker:** Containerization
- **GitHub Actions:** CI/CD pipeline
- **Jest:** Testing framework
- **ESLint:** Code linting
- **Prettier:** Code formatting

### Monitoring & Logging
- **Winston:** Structured logging
- **Codecov:** Code coverage tracking
- **PM2:** Process management (optional)

---

## 🚀 Quick Reference

### Environment Variables
```env
# API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Environment
NODE_ENV=development
LOG_LEVEL=info

# Database
DB_TYPE=sqlite
DB_PATH=./data/trades.db

# Server
PORT=3000
HOST=localhost

# Feature Flags
FEATURE_CLAUDE_ENABLED=true
FEATURE_AGENTS_ENABLED=false
FEATURE_PAPERCLIP_ENABLED=false
FEATURE_DASHBOARD_ENABLED=false

# Testing
TEST_MODE=true
MOCK_DATA_PATH=./data/mock
```

### Common Commands
```bash
# Setup
npm install
npm run db:init

# Development
npm run dev
npm run logs:watch

# Testing
npm test                    # All tests
npm run test:phase1         # Phase 1 tests
npm run test:phase2         # Phase 2 tests
npm run test -- --coverage  # With coverage

# Code Quality
npm run lint
npm run format
npm run format -- --check

# Deployment
npm run build:dashboard
npm run build:docker
npm start

# Database
npm run db:init
npm run db:seed
```

---

## 📈 Current Dependencies

```json
{
  "production": {
    "@anthropic-ai/sdk": "^0.24.0",
    "@supabase/supabase-js": "^2.98.0",
    "axios": "^1.13.6",
    "cors": "^2.8.5",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "morgan": "^1.10.0",
    "node-cron": "^4.2.1",
    "socket.io": "^4.7.2",
    "sqlite3": "^5.1.6",
    "technicalindicators": "^3.1.0",
    "winston": "^3.14.1",
    "yahoo-finance2": "^3.13.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "jest": "^29.7.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1",
    "nodemon": "^3.0.2",
    "supertest": "^6.3.3"
  }
}
```

---

## 📊 Database Schema (Phase 1)

### Tables
1. **trades** - Trade execution log
   - id (PK), symbol, entry/exit prices, quantity, P&L, status, agent_name

2. **signals** - Trading signals generated
   - id (PK), symbol, signal_type, confidence, entry/stop/target, pattern

3. **daily_reports** - Daily AI-generated reports
   - id (PK), report_date, summary, metrics, agent_status

4. **agent_logs** - Agent task execution logs
   - id (PK), agent_name, task, status, result, duration

---

## 🧪 Testing Strategy

### Phase-wise Testing
- **Phase 1:** Claude API, Database setup, Logging
- **Phase 2:** Agent initialization, Task execution, Message bus
- **Phase 3:** Orchestrator, Workflows, Inter-agent communication
- **Phase 4:** Reports, Dashboard, Email distribution
- **Phase 5:** End-to-end workflows, Performance, Docker

### Coverage Goals
- Phase 1: >80%
- Phase 2: >75%
- Phase 3: >70%
- Phase 4: >65%
- Phase 5: >85% (production-ready)

---

## 🔄 Workflow

### Daily Trading Workflow
```
09:15 AM (Market Open)
  ↓
[Scanner Agent] Fetches market data & scans symbols
  ↓
[Claude Sonnet] Analyzes patterns for high-confidence setups
  ↓
[Message Bus] Publishes trading signals
  ↓
[Execution Agent] Reviews & executes trades (if confidence > 75%)
  ↓
[Risk Agent] Monitors positions
  ↓
12:00 PM (Midday Check)
  ↓
[Risk Agent] Checks portfolio drawdown & alerts
  ↓
15:30 PM (Market Close)
  ↓
[Reporter Agent] Compiles daily trades & metrics
  ↓
[Claude Sonnet] Generates insights
  ↓
[Paperclip Company] Formats professional reports
  ↓
[Email Service] Distributes to stakeholders
  ↓
[Dashboard] Updates with daily results
```

---

## 📱 Stakeholder Reports

### Portfolio Manager (Daily - Detailed)
- All trade details
- Risk metrics
- Performance analysis
- Recommendations

### Risk Officer (Daily - Risk-focused)
- Drawdown metrics
- Position concentration
- VaR calculations
- Alerts & breaches

### CEO (Weekly - Executive Brief)
- Overall performance
- Key metrics
- High-level insights
- Business recommendations

---

## ✅ Success Criteria

### Phase 1 ✅
- [ ] Claude API integration working
- [ ] Database schema created
- [ ] Unit tests passing (>80% coverage)
- [ ] GitHub Actions CI/CD active
- [ ] Documentation complete

### Phase 2
- [ ] All 3 agents operational
- [ ] Message bus working
- [ ] Agent tests passing
- [ ] Mock data generation complete

### Phase 3
- [ ] Orchestrator coordinating agents
- [ ] Workflows automated & scheduled
- [ ] Error handling robust
- [ ] E2E tests passing

### Phase 4
- [ ] Reports generating daily
- [ ] Dashboard real-time updates
- [ ] Email distribution working
- [ ] UI/UX complete

### Phase 5
- [ ] Full system integration tested
- [ ] Docker deployable
- [ ] Production-ready code
- [ ] >85% test coverage

---

## 🤝 Contributing Guidelines

### Branch Naming
```
phase-{number}-{feature-name}
bugfix/issue-description
feature/feature-name
docs/documentation-update
```

### Commit Messages
```
Phase {N}: Add feature description
- Detailed change 1
- Detailed change 2

Fixes #issue_number
```

### PR Process
1. Create feature branch from phase branch
2. Make changes & commit
3. Push to GitHub
4. GitHub Actions runs tests automatically
5. Code review & merge
6. Merge to main when phase complete

---

## 📚 Documentation Structure

- **CONTEXT.md** (this file) - Project overview & architecture
- **IMPLEMENTATION.md** - Phase-by-phase implementation guide
- **API_REFERENCE.md** - API endpoints & data structures
- **TESTING_GUIDE.md** - Testing procedures & coverage
- **DEPLOYMENT.md** - Docker & production setup
- **TROUBLESHOOTING.md** - Common issues & fixes

---

## 🎯 Next Steps

1. ✅ **Phase 1 Foundation** (Current)
   - Initialize project structure
   - Set up Claude integration
   - Create database schema
   - Write unit tests

2. 🔄 **Phase 2 Agents** (Next)
   - Create base agent class
   - Implement 3 specialized agents
   - Set up message bus

3. 📋 Continue with remaining phases...

---

## 📞 Support

### Resources
- [Claude API Docs](https://docs.anthropic.com)
- [Node.js Documentation](https://nodejs.org/docs)
- [Express.js Guide](https://expressjs.com)
- [SQLite Documentation](https://sqlite.org/docs.html)

### Getting Help
- Check TROUBLESHOOTING.md
- Review test files for examples
- Check GitHub Issues
- Review agent logs

---

**Last Updated:** April 5, 2026  
**Current Phase:** 1 (Foundation)  
**Status:** In Progress
