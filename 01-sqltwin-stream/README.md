# SQLTwin Stream (`@topaisaas/sqltwin-stream`)
> **Deterministic, Zero-Memory SQL Dump Anonymizer for PostgreSQL, MySQL & SQLite.**  
> Preserves 100% of `FOREIGN KEY` joins, `UNIQUE` constraints, and ISO 13616 Modulo-97 IBAN checksums in real-time Unix streaming pipes ($O(1)$ memory).

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![GitHub Action](https://img.shields.io/badge/marketplace-GitHub%20Action-blue?logo=github)](action.yml)
[![Offline Licensing](https://img.shields.io/badge/licensing-Ed25519%20Offline-success.svg)](#offline-licensing)

---

## ⚡ The Problem: Broken Foreign Keys & Staging Leaks
When developers clone a production PostgreSQL or MySQL database to staging, local Docker, or ephemeral Pull Request environments:
1. **GDPR / HIPAA Violations**: Exposing real customer emails, phone numbers, and IBANs in staging violates data protection regulations.
2. **Naive Anonymization Breaks Joins**: Replacing emails with random strings breaks `FOREIGN KEY` references across multiple tables and violates `UNIQUE` index constraints.
3. **Huge Memory Footprint**: Traditional tools load tables into memory, crashing on 50GB+ dumps.

**SQLTwin solves this in a single Unix streaming pipe:**
```bash
pg_dump prod_db | npx sqltwin > clean_staging.sql
```

---

## 🚀 Key Features

- **Bijective Determinism**: The same input email (e.g. `user@company.com`) always maps to the exact same synthetic email across all 50 tables, preserving joins and unique keys.
- **$O(1)$ Memory Streaming**: Streams line-by-line via stdin/stdout. Processes a 100GB dump using only ~25MB of RAM at speeds up to 300MB/s.
- **Valid ISO 13616 IBANs**: Masked bank accounts strictly conform to the Modulo-97 algorithm.
- **Zero-Server Offline Licensing**: Uses Ed25519 cryptographic signatures. Your CI/CD pipelines run completely air-gapped with zero external network dependencies.

---

## 🛠️ Usage

### 1. Unix Pipe (stdin to stdout)
```bash
pg_dump -U postgres prod_db | npx sqltwin --salt "my-company-seed" | psql -U postgres staging_db
```

### 2. File-to-File
```bash
npx sqltwin --input raw_dump.sql --output sanitized_dump.sql
```

### 3. GitHub Actions CI/CD Workflow (`action.yml`)
```yaml
name: Generate Anonymized Staging DB
on: [push]

jobs:
  anonymize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Anonymize Database Dump
        uses: topaisaas-dev/sqltwin-stream@v1
        with:
          input_file: 'prod_dump.sql'
          output_file: 'clean_staging.sql'
          seed_salt: ${{ secrets.SQLTWIN_SEED_SALT }}
          license_key: ${{ secrets.SQLTWIN_LICENSE_KEY }}
```

---

## 💳 Licensing

- **Community Tier**: Free for dumps up to **10,000 rows** per run.
- **Pro & Enterprise Tier**: Unlimited rows, air-gapped commercial deployment, and custom format regex rules ($79 One-Time or $19/month).
- Instant Ed25519 license keys are issued immediately via [Polar.sh Checkout](https://polar.sh/checkout?product_id=21450547-9e11-444d-a25f-d36fc6cbf06c).

---

## 📄 License
Apache-2.0 © TopAI Sovereign Studio
