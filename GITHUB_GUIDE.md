# GitHub Setup & Phase Management Guide

**Complete guide to setting up GitHub repository for phase-by-phase development.**

---

## 📦 Initial GitHub Setup

### Step 1: Create Repository Structure

```bash
# Navigate to project
cd /Users/padu4/Documents/RnD/stockscanner/stock-scanner

# Initialize git (if not already done)
git init
git config user.name "Your Name"
git config user.email "your@email.com"

# Create main branches
git branch develop
git branch phase-1-foundation
git branch phase-2-agents
git branch phase-3-orchestration
git branch phase-4-dashboard
git branch phase-5-integration
git branch phase-6-optimization
```

### Step 2: Add Remote Repository

```bash
# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/stock-scanner-ai.git

# Or if using SSH
git remote add origin git@github.com:YOUR_USERNAME/stock-scanner-ai.git

# Verify remote
git remote -v
```

### Step 3: Push Initial Branches

```bash
# Push all branches
git push -u origin master
git push -u origin develop
git push -u origin phase-1-foundation
git push -u origin phase-2-agents
git push -u origin phase-3-orchestration
git push -u origin phase-4-dashboard
git push -u origin phase-5-integration
git push -u origin phase-6-optimization
```

---

## 🔀 Branch Strategy

### Branch Naming Convention

```
Feature Branches (from phase branch):
  feature/scanner-improvements
  feature/better-error-handling

Bug Fixes:
  bugfix/memory-leak
  bugfix/api-timeout

Phase Branches:
  phase-1-foundation
  phase-2-agents
  phase-3-orchestration
  phase-4-dashboard
  phase-5-integration
  phase-6-optimization

Release Branches:
  release/v1.0.0
  release/v1.1.0
```

### Branch Workflow

```
main (production)
  ↑
  └─ develop (staging)
      ↑
      ├─ phase-1-foundation ✅
      │   ├─ feature/logging
      │   ├─ feature/database
      │   └─ feature/claude-integration
      │
      ├─ phase-2-agents (incoming)
      │   ├─ feature/scanner-agent
      │   ├─ feature/execution-agent
      │   └─ feature/risk-agent
      │
      └─ phase-3-orchestration (planned)
```

---

## 🔄 Phase Workflow

### For Each Phase:

#### 1. Create Feature Branch
```bash
# Switch to phase branch
git checkout phase-1-foundation

# Create feature branch
git checkout -b feature/logger-setup

# Make changes
# ... edit files ...

# Commit
git add .
git commit -m "Phase 1: Add logger utility"
```

#### 2. Push Feature Branch
```bash
git push -u origin feature/logger-setup
```

#### 3. Create Pull Request
- Go to GitHub repository
- Click "New Pull Request"
- Set base to `phase-1-foundation`
- Set compare to `feature/logger-setup`
- Fill in PR description
- Click "Create Pull Request"

#### 4. GitHub Actions Runs Tests
```yaml
✓ Lint passing
✓ Tests passing (>80% coverage)
✓ Build successful
✓ No security issues
```

#### 5. Merge PR
```bash
# After approval, merge on GitHub
# Or merge locally:
git checkout phase-1-foundation
git pull origin phase-1-foundation
git merge feature/logger-setup
git push origin phase-1-foundation
```

#### 6. Complete Phase & Merge Up
```bash
# When phase complete, merge to develop
git checkout develop
git pull origin develop
git merge phase-1-foundation
git push origin develop

# Eventually merge to main for production
git checkout main
git pull origin main
git merge develop
git push origin main
```

---

## 📋 Phase 1 GitHub Workflow

### Step 1: Switch to Phase 1 Branch
```bash
git checkout phase-1-foundation
```

### Step 2: Create Documentation PR
```bash
# Create feature branch
git checkout -b feature/phase1-documentation

# Make sure these files exist:
# - CONTEXT.md ✅
# - IMPLEMENTATION.md ✅
# - QUICK_START.md ✅
# - TESTING_GUIDE.md ✅

# Commit
git add .
git commit -m "Phase 1: Add documentation

- CONTEXT.md: Project overview and architecture
- IMPLEMENTATION.md: Step-by-step implementation guide
- QUICK_START.md: Quick setup instructions
- TESTING_GUIDE.md: Testing procedures

Documentation complete for Phase 1"

# Push
git push -u origin feature/phase1-documentation
```

### Step 3: Create Code Files PR
```bash
# Create another feature branch
git checkout -b feature/phase1-foundation-code

# Create all Phase 1 code files:
# - src/utils/logger.mjs
# - src/services/claudeService.mjs
# - src/db/schema.sql
# - src/db/initialize.mjs
# - src/utils/mockDataGenerator.mjs
# - src/tests/phase1/claude.test.mjs
# - src/tests/phase1/database.test.mjs
# - src/main.mjs
# - .github/workflows/phase-1.yml

# Commit
git add .
git commit -m "Phase 1: Foundation implementation

- Add logger utility for structured logging
- Implement Claude API service integration
- Create database schema and initialization
- Add mock data generators for testing
- Write comprehensive unit tests (>80% coverage)
- Add GitHub Actions CI/CD workflow

Closes #1"

# Push
git push -u origin feature/phase1-foundation-code
```

### Step 4: Create Environment PR
```bash
git checkout -b feature/phase1-environment

# Ensure these files exist:
# - .env.example
# - jest.config.js
# - .gitignore

git add .
git commit -m "Phase 1: Environment and config

- Add .env.example with all required variables
- Add Jest configuration for testing
- Update .gitignore for sensitive files"

git push -u origin feature/phase1-environment
```

### Step 5: Merge All PRs
```bash
# Go to GitHub and merge each PR
# After all merged:

git checkout phase-1-foundation
git pull origin phase-1-foundation

# Verify all files present
ls -la src/utils/
ls -la src/services/
ls -la src/tests/phase1/
```

### Step 6: Run Tests
```bash
npm install
npm run db:init
npm run test:phase1
```

### Step 7: Merge to Develop
```bash
# After all tests passing and PRs merged
git checkout develop
git pull origin develop
git merge phase-1-foundation
git push origin develop

# Tag release
git tag -a v0.1.0-phase1 -m "Phase 1: Foundation complete"
git push origin v0.1.0-phase1
```

---

## 🔒 Protected Branch Rules

### For `main` Branch

Go to Settings → Branches → Add Rule:

```
Branch name pattern: main

☑ Require a pull request before merging
  - Require approvals: 1
  - Dismiss stale review: ✓
  - Require review from code owners: ✓

☑ Require status checks to pass before merging
  - Required status checks:
    - GitHub Actions / build
    - GitHub Actions / test
    - Codecov

☑ Require branches to be up to date before merging
☑ Include administrators
```

### For `develop` Branch

```
Branch name pattern: develop

☑ Require a pull request before merging
  - Require approvals: 1

☑ Require status checks to pass before merging
  - Required status checks:
    - GitHub Actions / build
    - GitHub Actions / test

☑ Require branches to be up to date before merging
```

---

## 🤖 GitHub Actions Setup

### Step 1: Create Secrets

Go to Settings → Secrets and Variables → Actions:

```
ANTHROPIC_API_KEY = sk-ant-your-key-here
CODECOV_TOKEN = (get from codecov.io)
```

### Step 2: Create Workflow Files

**File:** `.github/workflows/phase-1.yml`

```yaml
name: Phase 1 - Foundation

on:
  push:
    branches: [phase-1-foundation, develop, main]
  pull_request:
    branches: [phase-1-foundation, develop, main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint || true
      
      - name: Format check
        run: npm run format:check || true
      
      - name: Initialize database
        run: npm run db:init
      
      - name: Run tests
        run: npm run test:phase1
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          NODE_ENV: test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: phase1
          fail_ci_if_error: false
```

### Step 3: Verify Workflow Runs

```bash
# Push to trigger workflow
git add .
git commit -m "Add Phase 1 workflow"
git push origin phase-1-foundation

# Check Actions tab on GitHub
```

---

## 📊 Pull Request Template

**File:** `.github/pull_request_template.md`

```markdown
## Description
Briefly describe what this PR does.

## Related Issue
Closes #(issue number)

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Phase
- [ ] Phase 1 - Foundation
- [ ] Phase 2 - Agents
- [ ] Phase 3 - Orchestration
- [ ] Phase 4 - Dashboard
- [ ] Phase 5 - Integration
- [ ] Phase 6 - Optimization

## Testing
- [ ] Added new tests
- [ ] All tests passing
- [ ] Coverage maintained (>80%)

## Checklist
- [ ] Code follows project style
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Ready for merge

## Screenshots (if applicable)
Add screenshots here
```

---

## 📌 GitHub Labels

Create these labels for organization:

```
Label              Color    Description
─────────────────────────────────────────
phase-1           #0366d6  Phase 1 issues
phase-2           #3b2dc4  Phase 2 issues
phase-3           #7d5ceb  Phase 3 issues
phase-4           #c5a3ff  Phase 4 issues
phase-5           #ffd700  Phase 5 issues
bug                #d73a49  Bug reports
enhancement        #a2eeef  Feature requests
documentation      #0075ca  Doc updates
blocked            #fc2929  Blocked work
ready-to-review    #98c54f  Ready for review
in-progress        #cccccc  Currently being worked on
```

---

## 📈 Release Management

### Version Tagging

```bash
# After completing each phase
git tag -a v0.1.0-phase1 -m "Phase 1: Foundation complete"
git tag -a v0.2.0-phase2 -m "Phase 2: Agent framework ready"
git push origin --tags

# View tags
git tag -l
git show v0.1.0-phase1
```

### Create Release

Go to GitHub → Releases → Create Release:

```
Tag: v0.1.0-phase1
Title: Phase 1: Foundation Complete
Description:

## Phase 1 Completed ✅

### Features
- Claude API integration
- Database schema & initialization
- Logging system
- Unit tests (>80% coverage)
- GitHub Actions CI/CD

### Testing
- All tests passing
- Coverage: 82%
- Ready for Phase 2

### What's Next
- Phase 2: Agent Framework
- Target: Week 3-4
```

---

## 🔍 Monitoring & Tracking

### GitHub Projects

Create project for phase tracking:

```
Columns:
- 📋 Backlog
- 🔄 In Progress
- 👀 In Review
- ✅ Done

Cards for each phase and feature
```

### Milestone Tracking

Create milestones for each phase:

```
Phase 1 Foundation
- Due date: Week 2
- Issues: Foundation tasks
- Progress: 100% when complete

Phase 2 Agents
- Due date: Week 4
- Issues: Agent tasks
- Progress: Tracking...
```

---

## 🚀 Deployment

### GitHub Pages (Optional)

Deploy documentation to GitHub Pages:

```bash
# Enable in Settings → Pages
# Source: docs/ folder

# Or automatic deployment from GitHub Actions
```

### GitHub Releases as Deployment

```bash
# Download specific version
git checkout v0.1.0-phase1

# Deploy that version
npm install
npm start
```

---

## 📚 GitHub Documentation

### Create Wiki (Optional)

Add to repository wiki:

1. **Architecture.md** - System design
2. **API Reference.md** - API endpoints
3. **Troubleshooting.md** - Common issues
4. **Contributing.md** - Contribution guidelines

---

## ✅ GitHub Checklist

### Initial Setup
- [ ] Repository created
- [ ] Remote configured
- [ ] Branches created
- [ ] Protected rules set
- [ ] Secrets added
- [ ] Workflows created

### Phase 1
- [ ] Documentation PRs merged
- [ ] Code PRs merged
- [ ] All tests passing
- [ ] Coverage >80%
- [ ] Release tagged
- [ ] Release notes created

### Ongoing
- [ ] PRs reviewed promptly
- [ ] Tests passing
- [ ] Coverage maintained
- [ ] Documentation updated
- [ ] Issues closed
- [ ] Milestones tracked

---

## 🎯 Command Reference

```bash
# Branch operations
git branch -a                          # List all branches
git checkout phase-1-foundation        # Switch branch
git checkout -b feature/name           # Create new branch
git merge feature/name                 # Merge branch

# Commits
git add .                              # Stage changes
git commit -m "message"                # Commit
git push origin branch                 # Push to remote
git pull origin branch                 # Pull from remote

# Tags
git tag -a v0.1.0 -m "message"        # Create tag
git push origin --tags                 # Push tags
git tag -d v0.1.0                      # Delete tag

# View history
git log --oneline -10                  # Last 10 commits
git log --graph --oneline --all        # Visual history
git show commit-hash                   # Show specific commit

# Undo changes
git revert commit-hash                 # Undo specific commit
git reset --hard HEAD~1                # Undo last commit
```

---

## 📞 Support

- **GitHub Docs:** https://docs.github.com
- **GitHub CLI:** https://cli.github.com
- **Actions Docs:** https://docs.github.com/en/actions

---

**Last Updated:** April 5, 2026  
**Status:** GitHub Setup Guide Complete
