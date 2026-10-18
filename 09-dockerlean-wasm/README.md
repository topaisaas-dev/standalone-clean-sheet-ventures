# @topaisaas/dockerlean-wasm

> **Deterministic, Air-Gapped Dockerfile & OCI Container Bloat Auditor.**  
> Detects 12 build inefficiencies, layer bloat, and container security risks in sub-50ms with zero Docker daemon dependency.

[![npm version](https://img.shields.io/npm/v/@topaisaas/dockerlean-wasm.svg)](https://www.npmjs.com/package/@topaisaas/dockerlean-wasm)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-v1-blue.svg)](action.yml)
[![Air-Gapped](https://img.shields.io/badge/Security-Air--Gapped%20Offline-green.svg)](https://topaisaas.dev)

---

## ⚡ The Problem

Container builds in CI/CD are notoriously bloated and slow. Without linting, teams inadvertently:
1. **Invalidate layer caches** by running `COPY . .` before installing dependencies.
2. **Leave package caches in layers** (`apt-get install` without cleaning `/var/lib/apt/lists/*`), wasting hundreds of MBs.
3. **Run as privileged root user** or skip **multi-stage builds**, inflating registry storage costs and introducing security liabilities.

`dockerlean-wasm` audits Dockerfiles locally via static analysis in **under 50 milliseconds** without needing Docker installed.

---

## 🚀 Instant Usage

### 1. In Local Terminal or CI
```bash
npx -y @topaisaas/dockerlean-wasm Dockerfile --markdown
```

### 2. In GitHub Actions CI
```yaml
- name: Audit Dockerfile Bloat
  uses: topaisaas-dev/dockerlean-wasm@v1
  with:
    dockerfile: 'Dockerfile'
    fail_on_bloat: 'true'
```

---

## 🛡️ Offline Ed25519 Commercial Licensing

- **Community Free Tier**: Up to 2 Dockerfiles audited.
- **Pro Lifetime**: Unlimited Dockerfiles and CI pipelines.
- **Instant 1-Click Unblock**: [Purchase License on Polar.sh](https://buy.polar.sh/polar_cl_z8AW0MGKNFyHrDG4rHySEtviAxtxze5vnJLF64JjI6L) ($29 one-time lifetime).
- **Emergency Production Hotfix Bypass**: Append `--emergency-pass-24h` to bypass paywalls for 24 hours during critical hotfixes.

---

## 📄 License

Apache-2.0. Copyright (c) 2026 TopAI Sovereign Studio.
