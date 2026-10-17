# 🛡️ Flaky Quarantine — Mathematical Markov Flaky Test Isolator & Static Anti-Pattern Scanner

> **Automated GitHub Action & CLI that calculates Markov instability coefficients on JUnit reports and isolates flaky tests to keep main branches green and unblock Pull Requests without hiding genuine failures.**

[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Flaky%20Quarantine-blue.svg)](https://github.com/marketplace)
[![Infra Cost](https://img.shields.io/badge/Infra%20Cost-%240.00%20Serverless-purple.svg)](#)
[![Licensing](https://img.shields.io/badge/Licensing-Offline%20Ed25519-brightgreen.svg)](#)
[![Tests Passing](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)](#)

---

## 🛑 The Problem: The Flaky Test Tax on Engineering Velocity

In modern software teams, between **10% and 25% of CI test failures are non-deterministic (flaky)**:
- Developers re-run failed CI pipelines 2 to 4 times hoping for a green run.
- Build queues become congested, delaying deployments.
- Developers lose faith in the test suite and start merging with broken tests.
- Naive solutions either ignore failures completely or require manual test annotations that rot over time.

## 🚀 The Solution: Mathematical Markov Analysis

**Flaky Quarantine** does not rely on guesswork:
1. **Markov Chain Flip Analysis**: Evaluates state transitions $P(\text{FAIL} \mid \text{PASS})$ and $P(\text{PASS} \mid \text{FAIL})$ across runs under identical code.
   - A test that fails 100% of the time is **genuinely broken** $\rightarrow$ blocks the PR.
   - A test that flips state across retries is **flaky** $\rightarrow$ quarantined.
2. **Static AST Anti-Pattern Scanner**: Identifies the 5 root causes before tests even run:
   - ⚠️ `ARBITRARY_SLEEP_TIMEOUT` (`waitForTimeout`, `time.sleep`)
   - ⚠️ `FLOATING_UNWAIT_PROMISE` (missing `await` on locator actions)
   - ⚠️ `NON_DETERMINISTIC_TIME_SEED` (`Date.now()`, `Math.random()`)
   - ⚠️ `SHARED_MUTABLE_GLOBAL_STATE` (`process.env` pollution)
   - ⚠️ `UNBOUNDED_POLLING_RACE` (`while` loop without timeout)
3. **Automated Quarantine Manifest**: Generates `.flaky-quarantine.json` and supplies command-line flags (`--grep-invert`) to isolate quarantined tests into an asynchronous non-blocking track.

---

## 🛠️ GitHub Actions Workflow Integration

Add to `.github/workflows/ci.yml`:

```yaml
name: CI with Flaky Quarantine

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Playwright Tests
        run: npx playwright test --reporter=junit:results/junit.xml || true

      - name: Mathematical Flaky Detection & Quarantine
        uses: topaisaas/flaky-quarantine@v1
        with:
          reports: 'results/junit.xml'
          output: '.flaky-quarantine.json'

      - name: Enforce Strict Pipeline (Excluding Quarantined)
        run: |
          QUARANTINE_PATTERN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.flaky-quarantine.json')).configSnippets.playwrightGrepInvert)")
          if [ -n "$QUARANTINE_PATTERN" ]; then
            npx playwright test --grep-invert "$QUARANTINE_PATTERN"
          else
            npx playwright test
          fi
```

---

## 💻 CLI Usage

### 1. Scan Test Codebase for Flakiness Anti-Patterns
```bash
npx @topaisaas/flaky-quarantine scan --path tests/
```
Output:
```text
📄 tests/checkout.spec.ts (Risk Score: 95/100)
  [Line 4] ⚠️ ARBITRARY_SLEEP_TIMEOUT: await page.waitForTimeout(3000);
    ↳ Explanation: Hardcoded sleep introduces nondeterministic CI races under runner CPU throttling.
    ↳ Fix: Replace with event-driven locators (page.locator().waitFor({ state: "visible" })).
  [Line 7] ⚠️ FLOATING_UNWAIT_PROMISE: page.click('#buy-now-btn');
    ↳ Explanation: Unawaited async Playwright call will float and complete after test teardown.
    ↳ Fix: Prepend with await keyword.
```

### 2. Ingest Multiple JUnit XML Runs & Generate Quarantine
```bash
npx @topaisaas/flaky-quarantine analyze --reports run1.xml,run2.xml --output .flaky-quarantine.json --markdown
```

---

## 🔐 Zero-Server Offline Ed25519 Licensing

- **Community Free Tier**: Up to 5 quarantined tests per repository forever.
- **Team Pro / Enterprise Tier**: Unlimited quarantines, team slack notifications, automated Jira flakiness ticket sync ($29/mo via [Polar.sh Checkout](https://buy.polar.sh/polar_cl_iel9yWlONZUVA92iPTUR0WgdhRoWjYWCDtypa47534c) or GitHub Marketplace billing).
- **100% Offline Validation**: Ed25519 digital signature verified on the runner ($0.00 infrastructure cost, zero server dependencies).

```bash
export FLAKY_QUARANTINE_LICENSE="FLAKY.<base64_payload>.<ed25519_signature>"
```

---

## 🧪 Rigorous Test Suite

```bash
npm test
```
- ✅ Markov Chain State Transition & Flakiness Stability Scoring
- ✅ Static AST Scanner for Top 5 Flaky Anti-Patterns
- ✅ JUnit XML Report Parsing
- ✅ Quarantine Manifest Generation & CI Config Snippets
- ✅ Zero-Server Offline Ed25519 Cryptographic Licensing

---

## 📄 License
Apache-2.0.
