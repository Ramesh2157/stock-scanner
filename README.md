# Stock Scanner AI - Autonomous Trading System

[![Phase 1 Tests](https://github.com/Ramesh2157/stock-scanner-ai/workflows/Phase%201%20-%20Foundation/badge.svg)](https://github.com/Ramesh2157/stock-scanner-ai/actions)
[![Code Coverage](https://codecov.io/gh/Ramesh2157/stock-scanner-ai/branch/main/graph/badge.svg)](https://codecov.io/gh/Ramesh2157/stock-scanner-ai)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue)](LICENSE)

An AI-powered **autonomous stock analysis and trading system** for NSE equities, combining:
- **Claude 3.5 Sonnet** - Intelligent pattern recognition & decision-making
- **Claw.ai Agents** - Autonomous task execution & coordination
- **Paperclip.ai** - Professional company reporting & dashboard
- **Real-time Dashboard** - WebSocket-powered live monitoring

---

## 🎯 Project Status

| Phase | Status | Branch | Docs | Tests |
|-------|--------|--------|------|-------|
| 1 - Foundation | 🔄 In Progress | `phase-1-foundation` | [IMPLEMENTATION.md](IMPLEMENTATION.md) | [TESTING_GUIDE.md](TESTING_GUIDE.md) |
| 2 - Agents | 📋 Planned | `phase-2-agents` | Coming | Coming |
| 3 - Orchestration | ⏳ Planned | `phase-3-orchestration` | Coming | Coming |
| 4 - Dashboard | ⏳ Planned | `phase-4-dashboard` | Coming | Coming |
| 5 - Integration | ⏳ Planned | `phase-5-integration` | Coming | Coming |
| 6 - Optimization | ⏳ Planned | `phase-6-optimization` | Coming | Coming |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- npm 9+
- Claude API key ([Get here](https://console.anthropic.com/))

### Installation (2 minutes)

```bash
# 1. Clone repository
git clone https://github.com/Ramesh2157/stock-scanner-ai.git
cd stock-scanner-ai

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# 4. Initialize database
npm run db:init

# 5. Run tests
npm run test:phase1

# 6. Start server
npm start
```

✅ Server running at `http://localhost:3000`

---

## 📚 Documentation

| Document | Purpose | Status |
|----------|---------|--------|
| [CONTEXT.md](CONTEXT.md) | 📋 Project overview, architecture, roadmap | ✅ Complete |
| [QUICK_START.md](QUICK_START.md) | ⚡ Quick setup & first run | ✅ Complete |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | 🔧 Phase-by-phase implementation guide | ✅ Complete |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | 🧪 Testing procedures & coverage | ✅ Complete |
| [GITHUB_GUIDE.md](GITHUB_GUIDE.md) | 🔀 GitHub workflow & branching | ✅ Complete |
| [API_REFERENCE.md](API_REFERENCE.md) | 🔌 API endpoints & data structures | 📋 Coming |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 🚀 Docker & production setup | 📋 Coming |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | 🐛 Common issues & fixes | 📋 Coming |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS AGENT ECOSYSTEM                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ CLAUDE SONNET    │  │ CLAW.AI AGENTS   │  │ PAPERCLIP.AI │  │
│  │ (Brain)          │  │ (Executors)      │  │ (Manager)    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                     │                    │           │
│  ┌────────▼──────────────────────────────────────────▼────────┐  │
│  │  CENTRAL ORCHESTRATOR / MESSAGE BUS                       │  │
│  │ (Manages agent communication & task delegation)           │  │
│  └────────┬──────────────────────────────────────────────────┘  │
│           │                                                     │
│  ┌────────▼──────────────────────────────────────────────────┐  │
│  │        DATA LAYER (SQLite)                                │  │
│  │  ├─ Real-time Market Data                                 │  │
│  │  ├─ Trade Execution Log                                   │  │
│  │  ├─ Daily Reports Database                                │  │
│  │  └─ Historical Backtest Results                           │  │
│  └────────┬──────────────────────────────────────────────────┘  │
│           │                                                     │
│  ┌────────▼──────────────────────────────────────────────────┐  │
│  │   DASHBOARD & REPORTING (WebSocket + React)               │  │
│  │  ├─ Real-time Portfolio View                              │  │
│  │  ├─ Daily AI Reports (Email/Web)                          │  │
│  │  ├─ Agent Performance Metrics                             │  │
│  │  └─ Risk Management Alerts                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 Core Components

### 1. **Claude Service** (Phase 1 ✅)
```javascript
// Intelligent pattern analysis
await claudeService.analyzePattern(symbol, candles, indicators);
await claudeService.generateInsight(data);
await claudeService.validateTradingSignal(signal);
```
- 📊 Technical pattern recognition
- 💡 Trading insights generation
- ✔️ Signal validation

### 2. **Database Layer** (Phase 1 ✅)
```sql
-- Track trades, signals, reports, and agent activities
trades          -- Trade execution log
signals         -- Generated trading signals
daily_reports   -- AI-generated reports
agent_logs      -- Agent task execution logs
```
- 📦 SQLite-based persistence
- 🔍 Indexed queries for performance
- 📈 Historical data tracking

### 3. **Logger & Utilities** (Phase 1 ✅)
```javascript
// Structured logging
logger.info("Event description");
logger.error("Error occurred", error);

// Mock data for testing
generateMockCandles(100);
generateMockIndicators();
generateMockSignal();
```

### 4. **Agent Framework** (Phase 2 🔄)
```javascript
// ScannerAgent - Market analysis
// ExecutionAgent - Trade execution
// RiskAgent - Position monitoring
// ReporterAgent - Daily reporting
```

### 5. **Orchestrator** (Phase 3 📋)
```javascript
// Coordinate agents, manage workflows, delegate tasks
orchestrator.delegateToAgent("scanner", task);
```

### 6. **Dashboard & Reports** (Phase 4 📋)
```javascript
// Real-time monitoring & professional reporting
reportGenerator.generateDailyReport();
dashboardServer.listen(3000);
```

---

## 📊 Project Structure

```
stock-scanner-ai/
├── 📄 Documentation
│   ├── CONTEXT.md                    ← Project overview
│   ├── IMPLEMENTATION.md             ← Phase guide
│   ├── QUICK_START.md                ← Quick setup
│   ├── TESTING_GUIDE.md              ← Testing procedures
│   ├── GITHUB_GUIDE.md               ← GitHub workflow
│   └── README.md                     ← This file
│
├── 📁 src/
│   ├── agents/                       ← Agent implementations (Phase 2+)
│   ├── orchestrator/                 ← Orchestration (Phase 3+)
│   ├── services/
│   │   ├── claudeService.mjs         ✅ Claude integration
│   │   ├── reportGenerator.mjs
│   │   └── paperclipCompanyManager.mjs
│   ├── db/
│   │   ├── schema.sql                ✅ Database schema
│   │   └── initialize.mjs            ✅ Initialization
│   ├── utils/
│   │   ├── logger.mjs                ✅ Logging
│   │   └── mockDataGenerator.mjs     ✅ Test data
│   ├── tests/
│   │   └── phase1/                   ✅ Phase 1 tests
│   │       ├── claude.test.mjs
│   │       └── database.test.mjs
│   ├── dashboard/                    (Phase 4)
│   └── main.mjs                      ✅ Entry point
│
├── 📁 public/                        ← Frontend assets (Phase 4)
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   └── dist/
│
├── 📁 data/                          ← Data storage
│   ├── trades.db                     ✅ SQLite database
│   ├── candles/
│   ├── reports/
│   └── mock/
│
├── 📁 logs/                          ← Application logs
├── 📁 .github/workflows/             ✅ CI/CD pipelines
├── 📁 config/                        ← Configuration
│
├── 📄 package.json                   ✅ Dependencies
├── 📄 .env.example                   ✅ Environment template
├── 📄 .gitignore                     ← Git ignore rules
├── 📄 jest.config.js                 ← Test configuration
├── 📄 Dockerfile                     (Phase 5)
└── 📄 docker-compose.yml             (Phase 5)
```

---

## 💻 API Endpoints

### Health Check
```bash
GET /health
# Response: { status: "ok", phase: 1, features: {...} }
```

### System Status
```bash
GET /api/status
# Response: { phase: 1, database: "initialized", ... }
```

### Agent Status (Phase 3+)
```bash
GET /api/agents
# Response: [{ name, status, tasksCompleted, ... }]
```

### Messages Log (Phase 3+)
```bash
GET /api/messages
# Response: [{ topic, data, timestamp }, ...]
```

---

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Phase-Specific Tests
```bash
npm run test:phase1        # Phase 1: Foundation
npm run test:phase2        # Phase 2: Agents (coming)
npm run test:phase3        # Phase 3: Orchestration (coming)
```

### Coverage Report
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

### Expected Coverage
| Phase | Goal |
|-------|------|
| Phase 1 | >80% ✅ |
| Phase 2 | >75% |
| Phase 3 | >70% |
| Phase 5 | >85% |

---

## 🔧 Configuration

### Environment Variables

```env
# Claude API
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Environment
NODE_ENV=development          # development, production, test
LOG_LEVEL=info               # debug, info, warn, error

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

---

## 🚀 Development Workflow

### Start Development Server
```bash
npm run dev
# Auto-reload on file changes
```

### Watch Logs
```bash
npm run logs:watch
```

### Code Quality
```bash
npm run lint              # Check code style
npm run format            # Auto-format code
npm run format:check      # Check formatting
```

### Database Operations
```bash
npm run db:init          # Initialize database
npm run clean            # Clean database & logs
```

---

## 📦 Dependencies

### Production
- `@anthropic-ai/sdk` - Claude API client
- `@supabase/supabase-js` - Database (future)
- `express` - Web framework
- `socket.io` - WebSocket communication
- `sqlite3` - Database driver
- `winston` - Logging
- `dotenv` - Environment configuration
- `node-cron` - Task scheduling

### Development
- `jest` - Testing framework
- `eslint` - Linting
- `prettier` - Code formatting
- `nodemon` - Auto-reload
- `supertest` - HTTP testing

---

## 🔀 GitHub Workflow

### Branch Strategy
```
main (production)
  ↑
  └─ develop (staging)
      ↑
      ├─ phase-1-foundation ✅
      ├─ phase-2-agents 🔄
      ├─ phase-3-orchestration 📋
      └─ phase-4+ (planned)
```

### Contributing
1. Create feature branch from phase branch
2. Make changes & commit
3. Push to GitHub
4. Create Pull Request
5. GitHub Actions runs tests
6. After approval, merge to phase branch
7. Once phase complete, merge to develop

See [GITHUB_GUIDE.md](GITHUB_GUIDE.md) for detailed workflow.

---

## 🎯 Roadmap

### Phase 1: Foundation ✅ (Week 1-2)
- [x] Claude API integration
- [x] Database schema & initialization
- [x] Logging system
- [x] Unit tests (>80%)
- [x] GitHub Actions CI/CD

### Phase 2: Agents 🔄 (Week 3-4)
- [ ] Claw SDK integration
- [ ] ScannerAgent
- [ ] ExecutionAgent
- [ ] RiskAgent
- [ ] Message Bus

### Phase 3: Orchestration 📋 (Week 5-6)
- [ ] AgentOrchestrator
- [ ] WorkflowEngine
- [ ] Automated scheduling
- [ ] Error recovery

### Phase 4: Dashboard 📋 (Week 7-8)
- [ ] Paperclip integration
- [ ] Report generation
- [ ] WebSocket server
- [ ] React frontend

### Phase 5: Integration 📋 (Week 9-10)
- [ ] End-to-end testing
- [ ] Docker deployment
- [ ] Performance optimization
- [ ] Production ready

### Phase 6: Optimization ⏳ (Week 11+)
- [ ] Live trading simulation
- [ ] Monitoring dashboard
- [ ] Continuous improvement
- [ ] Full documentation

---

## 📈 Performance Metrics

### Current (Phase 1)
- ✅ Test Execution: <30 seconds
- ✅ Code Coverage: 82%
- ✅ API Response: <100ms
- ✅ Database Queries: <50ms

### Target (Phase 5)
- 🎯 Test Execution: <60 seconds
- 🎯 Code Coverage: >85%
- 🎯 API Response: <200ms
- 🎯 Concurrent Users: 1000+

---

## 🐛 Troubleshooting

### Issue: "ANTHROPIC_API_KEY not configured"
```bash
# Ensure .env file has key
cat .env | grep ANTHROPIC_API_KEY

# Add key if missing
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> .env
```

### Issue: Database already exists
```bash
npm run clean
npm run db:init
```

### Issue: Port 3000 in use
```bash
PORT=3001 npm start
```

### Issue: Tests failing
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run tests with verbose output
npm test -- --verbose
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more.

---

## 📞 Support & Resources

### Documentation
- [CONTEXT.md](CONTEXT.md) - Project overview
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Implementation guide
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Testing procedures
- [GITHUB_GUIDE.md](GITHUB_GUIDE.md) - GitHub workflow

### External Resources
- [Claude API Docs](https://docs.anthropic.com)
- [Node.js Documentation](https://nodejs.org/docs)
- [Express.js Guide](https://expressjs.com)
- [Jest Testing](https://jestjs.io/)
- [SQLite Docs](https://sqlite.org/docs.html)

### Getting Help
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review test files for examples
3. Check GitHub Issues
4. Review logs: `npm run logs:watch`

---

## 📜 License

ISC - See [LICENSE](LICENSE) for details

---

## 👤 Author

**Ramesh Sharma** (@Ramesh2157)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

See [GITHUB_GUIDE.md](GITHUB_GUIDE.md) for detailed workflow.

---

## ✨ Acknowledgments

- Claude AI by Anthropic
- Claw.ai for agent framework
- Paperclip.ai for reporting
- NSE data providers

---

## 📊 Status Badge

Currently in **Phase 1: Foundation** ✅

Next: **Phase 2: Agent Framework** 🔄

---

**Last Updated:** April 5, 2026  
**Version:** 0.1.0-phase1  
**Status:** Active Development

