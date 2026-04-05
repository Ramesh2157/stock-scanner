# Testing Guide

**Complete testing strategy and procedures for all phases.**

---

## 📋 Overview

This guide covers testing for the Stock Scanner AI system across all phases.

### Test Coverage Goals
| Phase | Goal | Status |
|-------|------|--------|
| Phase 1 | >80% | 🎯 Target |
| Phase 2 | >75% | 📋 Planned |
| Phase 3 | >70% | 📋 Planned |
| Phase 4 | >65% | 📋 Planned |
| Phase 5 | >85% | 🎯 Production-Ready |

---

## 🧪 Phase 1 Testing

### Test Files Location
```
src/tests/phase1/
├── claude.test.mjs          # Claude API integration
├── database.test.mjs        # Database schema & operations
└── logger.test.mjs          # Logging system (optional)
```

### Running Phase 1 Tests

```bash
# Run all Phase 1 tests
npm run test:phase1

# Run specific test file
npm test -- src/tests/phase1/claude.test.mjs

# Run with coverage
npm run test:phase1 -- --coverage

# Run in watch mode
npm run test:phase1 -- --watch

# Run specific test
npm test -- -t "should initialize Claude service"
```

### Test Categories

#### 1. Claude Integration Tests ✅
- Service initialization
- API connectivity
- Request/response handling
- Error handling
- Timeout handling

```bash
npm test -- src/tests/phase1/claude.test.mjs
```

#### 2. Database Tests ✅
- Database file creation
- Table creation
- Index creation
- Data insertion
- Data retrieval
- Foreign key constraints

```bash
npm test -- src/tests/phase1/database.test.mjs
```

#### 3. Utility Tests
- Logger functionality
- Mock data generation
- Constants validation

### Expected Test Output

```
PASS  src/tests/phase1/claude.test.mjs
  Phase 1 - Claude Integration
    ✓ should initialize Claude service (5ms)
    ✓ should call Claude API successfully (8234ms)
    ✓ should handle errors gracefully (2145ms)

PASS  src/tests/phase1/database.test.mjs
  Phase 1 - Database Setup
    ✓ should create database file (10ms)
    ✓ should create all required tables (25ms)
    ✓ should create indexes for performance (15ms)
    ✓ should allow inserting trades (20ms)

Test Suites: 2 passed, 2 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        12.5 s
Coverage:    82.5% (statements: 82.5%, branches: 78%, functions: 85%, lines: 82%)
```

---

## 🤖 Phase 2 Testing (Coming)

### Agent Testing Strategy

#### Agent Unit Tests
- ScannerAgent task execution
- ExecutionAgent trade placement
- RiskAgent position monitoring

#### Message Bus Tests
- Message publishing
- Subscription handling
- Error propagation

#### Integration Tests
- Agent initialization
- Inter-agent communication
- Task delegation

### Running Phase 2 Tests

```bash
npm run test:phase2
npm test -- src/tests/phase2/ --coverage
```

---

## 🎯 Phase 3 Testing (Coming)

### Orchestration Tests

#### Orchestrator Tests
- Agent coordination
- Task queuing
- Error recovery

#### Workflow Tests
- Schedule execution
- Task chaining
- Failure handling

### Running Phase 3 Tests

```bash
npm run test:phase3
npm test -- src/tests/phase3/ --coverage
```

---

## 📊 Phase 4 Testing (Coming)

### Dashboard & Reporting Tests

#### Report Generation Tests
- Report creation
- Section generation
- Email formatting

#### Dashboard Tests
- WebSocket connection
- Real-time updates
- Data serialization

### Running Phase 4 Tests

```bash
npm run test:phase4
npm test -- src/tests/phase4/ --coverage
```

---

## 🧪 Phase 5 Testing (Coming)

### Integration Tests

#### End-to-End Tests
- Complete trading workflow
- Error scenarios
- Edge cases

#### Performance Tests
- Concurrent message handling
- Response time benchmarks
- Memory usage
- CPU usage

#### Load Tests
- 100+ concurrent requests
- 1000+ messages/second
- Large data processing

### Running Phase 5 Tests

```bash
npm run test:phase5
npm test -- src/tests/phase5/ --coverage
npm test -- --testMatch="**/e2e.test.mjs"
```

---

## 📈 Coverage Reports

### Generate Coverage Report

```bash
# Generate HTML coverage report
npm test -- --coverage

# Open in browser
open coverage/lcov-report/index.html
```

### Coverage Structure

```
coverage/
├── lcov-report/          # HTML report
│   └── index.html        # Open in browser
├── coverage-final.json   # Machine-readable
└── lcov.info            # For CI/CD (Codecov)
```

### Upload to Codecov

```bash
# Automatic via GitHub Actions
# Manual upload:
npm install -g codecov
codecov -f coverage/lcov.info
```

---

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
export default {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.mjs"],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.mjs",
    "!src/tests/**",
    "!src/main.mjs"
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  transform: {},
  extensionsToTreatAsEsm: [".mjs"]
};
```

---

## 🧪 Test Patterns

### Pattern 1: API Test

```javascript
it("should call API successfully", async () => {
  const result = await someFunction();
  
  expect(result).toBeDefined();
  expect(result.status).toBe("success");
});
```

### Pattern 2: Error Handling Test

```javascript
it("should handle errors gracefully", async () => {
  try {
    await invalidFunction();
    fail("Should have thrown error");
  } catch (error) {
    expect(error.message).toContain("expected error");
  }
});
```

### Pattern 3: Database Test

```javascript
it("should insert and retrieve data", (done) => {
  db.run("INSERT INTO table VALUES (...)", () => {
    db.get("SELECT * FROM table", (err, row) => {
      expect(err).toBeNull();
      expect(row.value).toBe("expected");
      done();
    });
  });
});
```

### Pattern 4: Mock Data Test

```javascript
it("should process mock data", () => {
  const mockCandles = generateMockCandles(10);
  const result = processCandles(mockCandles);
  
  expect(result).toBeDefined();
  expect(result.length).toBe(10);
});
```

---

## 🚀 Continuous Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --coverage
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Badge in README

```markdown
[![Tests](https://github.com/username/repo/workflows/Tests/badge.svg)](https://github.com/username/repo/actions)
[![Coverage](https://codecov.io/gh/username/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/username/repo)
```

---

## 🎯 Manual Testing Checklist

### Before Each Phase Release

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Coverage >80%
- [ ] No console errors
- [ ] No memory leaks
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Ready for merge

---

## 🐛 Debugging Tests

### Run Single Test

```bash
npm test -- -t "test name"
npm test -- --testNamePattern="pattern"
```

### Verbose Output

```bash
npm test -- --verbose
npm test -- --debug
```

### Watch Mode

```bash
npm test -- --watch
npm test -- --watchAll
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

Then set breakpoints and press F5.

---

## 📊 Test Metrics

### Metrics to Track

| Metric | Phase 1 Goal | Phase 5 Goal |
|--------|-------------|-------------|
| Line Coverage | 80% | 85% |
| Branch Coverage | 75% | 85% |
| Function Coverage | 80% | 85% |
| Statement Coverage | 80% | 85% |
| Test Execution Time | <30s | <60s |
| Pass Rate | 100% | 100% |

### How to View Metrics

```bash
# After running tests
open coverage/lcov-report/index.html

# Or check summary in terminal
npm test -- --coverage --coverageReporters=text-summary
```

---

## ✅ Test Checklist Per Phase

### Phase 1
- [ ] Claude API tests (3 tests)
- [ ] Database tests (4 tests)
- [ ] Coverage >80%
- [ ] All tests passing

### Phase 2
- [ ] ScannerAgent tests (5 tests)
- [ ] ExecutionAgent tests (5 tests)
- [ ] RiskAgent tests (5 tests)
- [ ] MessageBus tests (4 tests)
- [ ] Coverage >75%

### Phase 3
- [ ] Orchestrator tests (5 tests)
- [ ] WorkflowEngine tests (4 tests)
- [ ] Error handling tests (3 tests)
- [ ] Coverage >70%

### Phase 4
- [ ] ReportGenerator tests (4 tests)
- [ ] DashboardServer tests (4 tests)
- [ ] Email distribution tests (3 tests)
- [ ] Coverage >65%

### Phase 5
- [ ] End-to-end tests (10 tests)
- [ ] Performance tests (5 tests)
- [ ] Load tests (3 tests)
- [ ] Integration tests (8 tests)
- [ ] Coverage >85%

---

## 🎓 Learning Resources

- [Jest Documentation](https://jestjs.io/)
- [Node.js Testing Guide](https://nodejs.org/en/docs/guides/testing/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## 🔗 Related Documents

- **CONTEXT.md** - Project overview
- **IMPLEMENTATION.md** - Implementation guide
- **QUICK_START.md** - Quick setup
- **API_REFERENCE.md** - API endpoints (coming)

---

**Last Updated:** April 5, 2026  
**Status:** Phase 1 Testing Guide Complete
