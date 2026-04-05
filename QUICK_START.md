# Quick Start Guide

**Get started with Stock Scanner AI in 5 minutes!**

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Clone & Install
```bash
# Navigate to your project
cd /Users/padu4/Documents/RnD/stockscanner/stock-scanner

# Install dependencies
npm install

# Add missing dependencies for Phase 1
npm install --save \
  @anthropic-ai/sdk \
  sqlite3 \
  express \
  socket.io \
  cors \
  morgan \
  winston \
  node-cron

npm install --save-dev \
  @types/node \
  jest \
  eslint \
  prettier \
  nodemon \
  supertest
```

### Step 2: Configure Environment
```bash
# Copy example environment
cp .env.example .env

# Edit .env with your API key
# Get key from: https://console.anthropic.com/
nano .env
```

### Step 3: Initialize Database
```bash
npm run db:init
```

### Step 4: Run Tests
```bash
npm run test:phase1
```

### Step 5: Start Server
```bash
npm start
```

✅ **Server running at** `http://localhost:3000`

---

## 📋 Phase 1 Files Already Created

✅ `CONTEXT.md` - Project overview  
✅ `IMPLEMENTATION.md` - Detailed phase guide  
✅ `QUICK_START.md` - This file

### Next: Create Phase 1 Code Files

Run these commands to create all Phase 1 files:

```bash
# Create directory structure
mkdir -p src/{agents,orchestrator,services,db,utils,tests/phase1}
mkdir -p public/{src,dist}
mkdir -p data/{candles,reports,backtest,mock}
mkdir -p logs
mkdir -p .github/workflows
mkdir -p config
mkdir -p docs

# You'll create individual files next...
```

---

## 🤖 Project Structure

```
stock-scanner/
├── 📄 CONTEXT.md                 ← Overview & Architecture
├── 📄 IMPLEMENTATION.md          ← Phase-by-phase guide
├── 📄 QUICK_START.md             ← THIS FILE
├── 📄 README.md                  ← Main readme
│
├── src/
│   ├── agents/                   # Agent implementations (Phase 2+)
│   ├── orchestrator/             # Orchestration (Phase 3+)
│   ├── services/                 # Business logic
│   │   ├── claudeService.mjs     ← Claude integration
│   │   ├── reportGenerator.mjs
│   │   └── paperclipCompanyManager.mjs
│   │
│   ├── db/                       # Database
│   │   ├── schema.sql            ← Database tables
│   │   ├── initialize.mjs        ← Setup database
│   │   └── migrations.mjs
│   │
│   ├── utils/                    # Utilities
│   │   ├── logger.mjs            ← Logging system
│   │   ├── mockDataGenerator.mjs ← Test data
│   │   └── constants.mjs
│   │
│   ├── tests/
│   │   └── phase1/               ← Phase 1 tests
│   │       ├── claude.test.mjs
│   │       └── database.test.mjs
│   │
│   └── main.mjs                  ← Application entry point
│
├── data/                         # Data storage
│   ├── trades.db                 # SQLite database
│   ├── candles/
│   ├── reports/
│   └── mock/
│
├── logs/                         # Application logs
├── .github/workflows/            # CI/CD pipelines
├── package.json                  # Dependencies
├── .env.example                  # Environment template
└── .gitignore
```

---

## 💻 Essential Commands

### Development
```bash
npm start              # Start server
npm run dev           # Start with auto-reload
npm run logs:watch    # Watch logs in real-time
```

### Testing
```bash
npm test              # Run all tests
npm run test:phase1   # Run Phase 1 tests only
npm run test -- --coverage   # With coverage report
```

### Database
```bash
npm run db:init       # Initialize database
npm run clean         # Clean database & logs
```

### Code Quality
```bash
npm run lint          # Check code style
npm run format        # Auto-format code
npm run format:check  # Check formatting
```

---

## 🔑 API Keys

### Get Claude API Key

1. Go to [Anthropic Console](https://console.anthropic.com)
2. Sign up or log in
3. Create new API key
4. Copy key to `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Test API Key

```bash
# Run Claude service test
npm run test:phase1 -- claude.test.mjs
```

---

## 📊 Health Check

Once server is running:

```bash
# Check system health
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "phase": 1,
  "timestamp": "2026-04-05T10:30:00.000Z",
  "features": {
    "claude": true,
    "agents": false,
    "dashboard": false
  }
}
```

---

## 🧪 First Test Run

```bash
# Initialize database
npm run db:init

# Run Phase 1 tests
npm run test:phase1

# Expected output:
# ✅ Phase 1 - Claude Integration
#   ✓ should initialize Claude service
#   ✓ should call Claude API successfully
#   ✓ should handle errors gracefully
# 
# ✅ Phase 1 - Database Setup
#   ✓ should create database file
#   ✓ should create all required tables
#   ✓ should create indexes
#   ✓ should allow inserting trades
#
# Test Suites: 2 passed, 2 total
# Tests: 7 passed, 7 total
# Coverage: 82.5%
```

---

## 🚨 Troubleshooting

### Issue: "ANTHROPIC_API_KEY not configured"
**Solution:**
```bash
# Make sure .env file exists and has key
cat .env | grep ANTHROPIC_API_KEY

# If not found, add it
echo "ANTHROPIC_API_KEY=sk-ant-your-key" >> .env
```

### Issue: Database already exists
**Solution:**
```bash
# Clean and reinitialize
npm run clean
npm run db:init
```

### Issue: Port 3000 already in use
**Solution:**
```bash
# Use different port
PORT=3001 npm start

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Issue: Module not found errors
**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📈 Progress Checklist

### Phase 1: Foundation ✅
- [x] CONTEXT.md created
- [x] IMPLEMENTATION.md created
- [x] QUICK_START.md created
- [ ] Create Phase 1 code files (next step)
- [ ] Run and pass all tests
- [ ] Push to GitHub

### Phase 2: Agents 🔄
- [ ] Branch: `phase-2-agents`
- [ ] Create agent classes
- [ ] Message bus implementation
- [ ] Agent tests

### Phase 3+
- [ ] Continue with phases...

---

## 🎯 Next Steps

1. **Create Phase 1 code files:**
   - Use IMPLEMENTATION.md as reference
   - Create `src/services/claudeService.mjs`
   - Create `src/utils/logger.mjs`
   - Create `src/db/schema.sql`
   - Create tests in `src/tests/phase1/`

2. **Run tests:**
   ```bash
   npm run db:init
   npm run test:phase1
   ```

3. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Phase 1: Foundation setup"
   git push -u origin phase-1-foundation
   ```

4. **Create Pull Request:**
   - Go to GitHub repo
   - Click "New Pull Request"
   - Compare `phase-1-foundation` with `main`

---

## 📚 Documentation Map

| Document | Purpose |
|----------|---------|
| `CONTEXT.md` | 📋 Project overview, architecture, stakeholders |
| `IMPLEMENTATION.md` | 🔧 Step-by-step phase implementation |
| `QUICK_START.md` | ⚡ This file - quick setup |
| `README.md` | 📖 Main project readme |
| `TESTING_GUIDE.md` | 🧪 How to run tests (coming) |
| `API_REFERENCE.md` | 🔌 API endpoints (coming) |
| `DEPLOYMENT.md` | 🚀 Docker & production (coming) |

---

## 🤝 Getting Help

1. **Check TROUBLESHOOTING.md** (coming soon)
2. **Review test files** in `src/tests/` for examples
3. **Check logs**: `npm run logs:watch`
4. **Review GitHub Issues**
5. **Check Claude docs**: https://docs.anthropic.com

---

## ✨ Success Indicators

✅ Server starts without errors  
✅ Database initialized  
✅ Tests pass >80%  
✅ Health check returns OK  
✅ No console errors  

---

**Ready to build?** 🚀

Next: Follow IMPLEMENTATION.md to create Phase 1 code files!

---

**Last Updated:** April 5, 2026  
**Status:** Phase 1 Documentation Complete
