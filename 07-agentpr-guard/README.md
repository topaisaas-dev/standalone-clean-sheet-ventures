# @topaisaas/agentpr-guard

> **Deterministic Pull Request & Git Hook Auditor for AI-Generated Code (Claude Code, Cursor, Windsurf, Devin).**  
> Air-gapped, zero external network telemetry, verified offline via Ed25519.

[![npm version](https://img.shields.io/npm/v/@topaisaas/agentpr-guard.svg)](https://www.npmjs.com/package/@topaisaas/agentpr-guard)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-v1-purple.svg)](action.yml)
[![Air-Gapped](https://img.shields.io/badge/Security-Air--Gapped%20Offline-green.svg)](https://topaisaas.dev)

---

## ⚡ The Pain Point

AI coding assistants generate dozens of Pull Requests every day. However, they frequently:
1. **Hallucinate synthetic npm/pypi dependencies** that do not exist or are malicious typosquatting packages.
2. **Break architectural boundaries** (e.g., frontend components importing backend database drivers or Node built-ins).
3. **Leak hardcoded tokens or generate bloated unfulfilled placeholder boilerplate**.

`agentpr-guard` runs in **under 150 milliseconds** locally or in GitHub Actions, audits the git diff deterministically, and posts a clean verification report to your PR.

---

## 🚀 Instant Usage

### 1. In Local Git Pre-Commit Hook
```bash
npx -y @topaisaas/agentpr-guard pre-commit --fail-on-reject
```

### 2. In GitHub Actions CI
```yaml
- name: Audit AI Pull Request
  uses: topaisaas-dev/agentpr-guard@v1
  with:
    fail_on_reject: 'true'
```

### 3. Direct CLI Analysis
```bash
git diff origin/main...HEAD | npx -y @topaisaas/agentpr-guard audit --markdown
```

---

## 🛡️ Offline Ed25519 Commercial Licensing

- **Community Free Tier**: Up to 3 PR audits per day.
- **Team Pro / Enterprise**: Unlimited audits in high-throughput CI/CD pipelines.
- **Instant 1-Click Unblock**: [Purchase License on Polar.sh](https://buy.polar.sh/polar_cl_OUy6Q7GoY78aXhbdaFyoJ646wtXgD7mszAadt4FgJHz) ($39/month).
- **Emergency Production Hotfix Bypass**: Append `--emergency-pass-24h` to bypass paywalls for 24 hours during critical hotfixes.

---

## 📄 License

Apache-2.0. Copyright (c) 2026 TopAI Sovereign Studio.
