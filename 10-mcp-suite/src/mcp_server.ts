import readline from 'node:readline';

// Import all 9 micro-appliance engines
import { SqlStreamParser } from '../../01-sqltwin-stream/dist/index.js';
import { Packer3D } from '../../02-pack3d-wasm/dist/index.js';
import { CidrShieldDatabase, BUILTIN_IP_DATASETS } from '../../03-cidr-shield-mmdb/dist/index.js';
import { MarkovAnalyzer, JUnitParser, QuarantineManager } from '../../04-flaky-quarantine/dist/index.js';
import { PlanParser, BlastAnalyzer } from '../../05-terracost-blast/dist/index.js';
import { Form4Parser } from '../../06-edgarpulse-8k/dist/index.js';
import { AgentPrGuard } from '../../07-agentpr-guard/dist/index.js';
import { AstPruner } from '../../08-tokenprune-wasm/dist/index.js';
import { DockerfileLinter } from '../../09-dockerlean-wasm/dist/index.js';
import { QuotaManager } from './quota_manager.js';

export const SERVER_INSTRUCTIONS =
  "TopAI Sovereign MCP Suite provides 9 deterministic, air-gapped developer appliances natively to AI agents (Claude Desktop, Cursor, Windsurf): " +
  "(1) PR Anti-Hallucination Guard (`agentpr_guard_audit`), " +
  "(2) AST-Aware Token Pruning (`tokenprune_wasm_trim`), " +
  "(3) Dockerfile Bloat Linter (`dockerlean_wasm_audit`), " +
  "(4) Sub-millisecond CIDR Classifier (`cidr_shield_lookup`), " +
  "(5) Terraform Blast Radius Evaluator (`terracost_blast_evaluate`), " +
  "(6) 3D Bin Packing Optimizer (`pack3d_wasm_pack`), " +
  "(7) Markov Flaky Test Quarantine (`flaky_quarantine_analyze`), " +
  "(8) Format-Preserving SQL Anonymizer (`sqltwin_stream_anonymize`), and " +
  "(9) SEC EDGAR Form 4/8-K Filing Parser (`edgarpulse_parse_filing`). " +
  "All appliances execute locally in-memory with zero network telemetry.";

export const MCP_TOOLS = [
  {
    name: 'agentpr_guard_audit',
    description:
      "Audits unified git diffs or Pull Requests for AI-hallucinated NPM/PyPI packages, typosquatting attacks, unauthorized boundary imports, and leaked secrets. " +
      "Use when verifying code changes from AI coding agents (Cursor, Claude Code, Copilot) before merging into production repositories. " +
      "Do not use for general AST syntax minification (use `tokenprune_wasm_trim` instead) or container configuration analysis (use `dockerlean_wasm_audit` instead). " +
      "Stateless, read-only, idempotent execution in <5ms.",
    annotations: {
      title: "Pull Request Anti-Hallucination & Security Auditor",
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        diff: {
          type: 'string',
          description: "Unified git diff or PR patch text to audit. Must include hunk headers (e.g., 'diff --git a/... b/...')."
        },
        licenseKey: {
          type: 'string',
          description: "Optional TopAI Sovereign Pro offline license key (or set TOPAI_LICENSE_KEY env variable)."
        }
      },
      required: ['diff'],
      additionalProperties: false
    }
  },
  {
    name: 'tokenprune_wasm_trim',
    description:
      "Prunes TypeScript and JavaScript source code using AST parsing to extract public interfaces, type signatures, and exports while collapsing method implementations into concise summaries. " +
      "Saves 50%-70% of LLM context window tokens without losing structural semantic information. " +
      "Use when feeding large codebase files into LLM prompts for high-level reasoning or architecture planning. " +
      "Do not use for PR security auditing (use `agentpr_guard_audit` instead). " +
      "Stateless, read-only, idempotent execution in <10ms.",
    annotations: {
      title: "AST-Aware Token Pruning & Signature Extractor",
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        sourceCode: {
          type: 'string',
          description: "Raw TypeScript or JavaScript file content to prune and condense."
        },
        filename: {
          type: 'string',
          description: "Source filename with extension for AST dialect resolution (e.g., 'service.ts', 'component.tsx'). Defaults to 'source.ts'."
        },
        licenseKey: {
          type: 'string',
          description: "Optional TopAI Sovereign Pro offline license key (or set TOPAI_LICENSE_KEY env variable)."
        }
      },
      required: ['sourceCode'],
      additionalProperties: false
    }
  },
  {
    name: 'dockerlean_wasm_audit',
    description:
      "Statically lints and audits Dockerfiles for layer bloat, cache-busting RUN ordering, root user vulnerabilities, missing multi-stage build patterns, and excessive image footprint. " +
      "Use when reviewing container configurations, CI/CD pipeline Dockerfiles, or developer images to ensure lean, secure containerization. " +
      "Do not use for runtime container debugging or security auditing of git commits (use `agentpr_guard_audit` instead). " +
      "Stateless, read-only, idempotent execution in <5ms.",
    annotations: {
      title: "Dockerfile Optimization & Bloat Linter",
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        dockerfileContent: {
          type: 'string',
          description: "Full UTF-8 content of the Dockerfile to audit for layer efficiency and security."
        },
        licenseKey: {
          type: 'string',
          description: "Optional TopAI Sovereign Pro offline license key (or set TOPAI_LICENSE_KEY env variable)."
        }
      },
      required: ['dockerfileContent'],
      additionalProperties: false
    }
  },
  {
    name: 'cidr_shield_lookup',
    description:
      "Performs sub-millisecond offline Radix Trie Longest Prefix Match (LPM) on any IPv4 address to classify traffic as Datacenter/Cloud (AWS, GCP, Azure, Hetzner), VPN, Tor Exit Node, Public Proxy, or Clean Residential. " +
      "Use when authenticating incoming requests, preventing bot abuse, or assessing IP risk in auth flows without third-party network API calls. " +
      "Do not use for domain DNS resolution or WHOIS lookups. " +
      "Stateless, read-only, idempotent lookup in <0.01ms.",
    annotations: {
      title: "Zero-Latency IP Classifier & Cloud/Proxy Shield",
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        ip: {
          type: 'string',
          description: "Standard dotted-decimal IPv4 address to classify (e.g., '3.5.10.1', '185.220.101.5')."
        },
        licenseKey: {
          type: 'string',
          description: "Optional TopAI Sovereign Pro offline license key (or set TOPAI_LICENSE_KEY env variable)."
        }
      },
      required: ['ip'],
      additionalProperties: false
    }
  },
  {
    name: 'terracost_blast_evaluate',
    description:
      "Evaluates Terraform plan JSON output to calculate infrastructure blast radius, identify high-risk stateful resource destructions (databases, storage buckets), and compute monthly FinOps cost delta estimations. " +
      "Use in CI/CD pipelines or pre-apply infrastructure reviews to prevent accidental downtime and cloud budget overruns. " +
      "Do not use for linting Docker containers (use `dockerlean_wasm_audit` instead). " +
      "Stateless, read-only, idempotent analysis in <10ms.",
    annotations: {
      title: "Terraform Blast Radius & FinOps Cost Evaluator",
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        planJson: {
          type: 'string',
          description: "Valid JSON output generated from 'terraform show -json <planfile>'."
        },
        licenseKey: {
          type: 'string',
          description: "Optional TopAI Sovereign Pro offline license key (or set TOPAI_LICENSE_KEY env variable)."
        }
      },
      required: ['planJson'],
      additionalProperties: false
    }
  },
  {
    name: 'pack3d_wasm_pack',
    description:
      "Calculates optimal 3D carton packing arrangements for physical items using First-Fit Decreasing (FFD) and Extreme Point heuristics with full 6-axis orthogonal rotations. " +
      "Computes container utilization percentage, volumetric freight weight, and unplaced items. " +
      "Use for logistics optimization, e-commerce order fulfillment, and shipping carton selection. " +
      "Do not use for 2D sheet nesting. " +
      "Stateless, read-only, idempotent calculation in <15ms.",
    annotations: {
      title: "3D Extreme Point Bin Packing Optimizer",
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: "List of 3D items with dimensions (width, height, depth) and weights to pack into cartons.",
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: "Unique item identifier" },
              w: { type: 'number', description: "Width in cm" },
              h: { type: 'number', description: "Height in cm" },
              d: { type: 'number', description: "Depth in cm" },
              weightKg: { type: 'number', description: "Weight in kilograms (optional, default: 0.5)" }
            },
            required: ['id', 'w', 'h', 'd'],
            additionalProperties: false
          }
        },
        licenseKey: {
          type: 'string',
          description: "Optional TopAI Sovereign Pro offline license key (or set TOPAI_LICENSE_KEY env variable)."
        }
      },
      required: ['items'],
      additionalProperties: false
    }
  },
  {
    name: 'flaky_quarantine_analyze',
    description:
      "Analyzes multiple historical JUnit XML test run reports using two-state Markov chain transition matrices to statistically separate genuinely broken tests from nondeterministic flaky tests. " +
      "Generates quarantine recommendations and test stability manifests. " +
      "Use in CI/CD failure triage to automatically quarantine intermittent test suites. " +
      "Do not use for git diff auditing (use `agentpr_guard_audit` instead). " +
      "Stateless, read-only, idempotent analysis in <10ms.",
    annotations: {
      title: "Markov-Chain Test Flakiness & Quarantine Manager",
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        junitXmlReports: {
          type: 'array',
          items: { type: 'string' },
          description: "Array of JUnit XML report strings representing chronological CI test runs."
        },
        licenseKey: {
          type: 'string',
          description: "Optional TopAI Sovereign Pro offline license key (or set TOPAI_LICENSE_KEY env variable)."
        }
      },
      required: ['junitXmlReports'],
      additionalProperties: false
    }
  },
  {
    name: 'sqltwin_stream_anonymize',
    description:
      "Streams and anonymizes PostgreSQL/MySQL database dumps replacing PII (emails, phone numbers, names, IBANs) with synthetic values using HMAC format-preserving encryption while preserving 100% of foreign key joins, relational referential integrity, and unique constraints. " +
      "Use when preparing production database snapshots for staging environments or local developer machines. " +
      "Do not use for SEC filing extraction (use `edgarpulse_parse_filing` instead). " +
      "Stateless, deterministic, offline execution in <10ms.",
    annotations: {
      title: "Deterministic Format-Preserving SQL Anonymizer",
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        sqlContent: {
          type: 'string',
          description: "Raw SQL dump content containing CREATE TABLE, COPY, or INSERT statements."
        },
        secretSalt: {
          type: 'string',
          description: "Optional cryptographic HMAC salt for deterministic pseudonymization (default: 'mcp-salt')."
        },
        licenseKey: {
          type: 'string',
          description: "Optional TopAI Sovereign Pro offline license key (or set TOPAI_LICENSE_KEY env variable)."
        }
      },
      required: ['sqlContent'],
      additionalProperties: false
    }
  },
  {
    name: 'edgarpulse_parse_filing',
    description:
      "Parses raw SEC Form 4 and Form 8-K XML filings to extract C-suite insider transactions, open-market cluster purchases, vesting events, and calculate quantitative managerial conviction scores. " +
      "Use when tracking institutional ownership changes or corporate governance signals in financial analysis workflows. " +
      "Do not use for SQL dump anonymization (use `sqltwin_stream_anonymize` instead). " +
      "Stateless, read-only, idempotent extraction in <5ms.",
    annotations: {
      title: "SEC Form 4 & 8-K Insider Sentiment Analyzer",
      readOnlyHint: true,
      idempotentHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        filingXml: {
          type: 'string',
          description: "Raw XML content of SEC EDGAR Form 4 or Form 8-K filing."
        },
        licenseKey: {
          type: 'string',
          description: "Optional TopAI Sovereign Pro offline license key (or set TOPAI_LICENSE_KEY env variable)."
        }
      },
      required: ['filingXml'],
      additionalProperties: false
    }
  }
];

export class McpServer {
  private cidrDb: any = null;

  private getCidrDb() {
    if (!this.cidrDb) {
      this.cidrDb = new CidrShieldDatabase();
      const binary = CidrShieldDatabase.compile(BUILTIN_IP_DATASETS);
      this.cidrDb.loadBinary(binary);
    }
    return this.cidrDb;
  }

  /**
   * Executes a specific tool by name.
   */
  public async executeTool(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case 'agentpr_guard_audit': {
        const report = AgentPrGuard.auditDiff(args.diff || '');
        const md = AgentPrGuard.generateMarkdownReport(report);
        const hasVulnerability = !report.isApproved;
        return {
          report,
          markdown: md,
          hasVulnerability,
          securityNotice: report.isApproved
            ? "✅ PR Integrity Verified: No AI package hallucinations or credential leaks detected."
            : "🛑 AI Supply-Chain Risk Intercepted: Hallucinated dependencies or boundary leaks caught."
        };
      }

      case 'tokenprune_wasm_trim': {
        const result = AstPruner.pruneTypeScript(args.sourceCode || '', args.filename || 'source.ts');
        const tokensSaved = result.tokensSaved || 0;
        const dollarsSaved = Math.round((tokensSaved / 1_000_000) * 3.0 * 1000) / 1000;
        return {
          tokensSaved: result.tokensSaved,
          savingsRatioPercent: result.savingsRatioPercent,
          prunedContent: result.prunedContent,
          estimatedCostSavingsUsd: `$${dollarsSaved.toFixed(3)}`,
          roiNotice: `Saved ${tokensSaved.toLocaleString()} prompt tokens on this run (~$${dollarsSaved.toFixed(3)} saved on Claude 3.5 Sonnet).`
        };
      }

      case 'dockerlean_wasm_audit': {
        const report = DockerfileLinter.audit(args.dockerfileContent || '');
        const md = DockerfileLinter.generateMarkdownReport(report);
        return {
          report,
          markdown: md,
          efficiencyNotice: `DockerLean evaluated container layers. Optimization delta: ${report.leanScore}/100.`
        };
      }

      case 'cidr_shield_lookup': {
        const db = this.getCidrDb();
        const res = db.lookup(args.ip);
        return res;
      }

      case 'terracost_blast_evaluate': {
        const summary = PlanParser.parse(args.planJson || '{}');
        const report = BlastAnalyzer.evaluate(summary);
        const md = BlastAnalyzer.generateMarkdownSummary(report);
        return { report, markdown: md };
      }

      case 'pack3d_wasm_pack': {
        const items = (args.items || []).map((it: any) => ({
          id: it.id,
          w: it.w,
          h: it.h,
          d: it.d,
          weightKg: it.weightKg || 0.5,
          allowRotate: true
        }));
        const box = { id: 'box-standard', name: 'Standard Carton', w: 50, h: 40, d: 30, maxWeightKg: 25, tareWeightKg: 0.3 };
        const res = Packer3D.packSingleBox(box, items);
        return res;
      }

      case 'flaky_quarantine_analyze': {
        const manager = new QuarantineManager();
        for (const xml of (args.junitXmlReports || [])) {
          const suite = JUnitParser.parse(xml);
          manager.ingestJUnitSuite(suite);
        }
        const manifest = manager.generateManifest();
        return manifest;
      }

      case 'sqltwin_stream_anonymize': {
        const parser = new SqlStreamParser({ secretSalt: args.secretSalt || 'mcp-salt' });
        const result = parser.processSqlChunk(args.sqlContent || '');
        return {
          rowsProcessed: result.rowsProcessed,
          anonymizedSql: result.outputSql
        };
      }

      case 'edgarpulse_parse_filing': {
        const filing = Form4Parser.parse(args.filingXml || '');
        return {
          issuer: filing.issuerSymbol,
          transactionsCount: filing.transactions.length,
          transactions: filing.transactions
        };
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  }

  /**
   * Starts the stdio JSON-RPC loop.
   */
  public startStdio(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      if (!line.trim()) return;

      try {
        const msg = JSON.parse(line);
        const { id, method, params } = msg;

        if (method === 'initialize') {
          const response = {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: { listChanged: false },
                resources: { subscribe: false, listChanged: false },
                prompts: { listChanged: false }
              },
              serverInfo: {
                name: 'topai-mcp-suite',
                version: '1.0.5'
              },
              instructions: SERVER_INSTRUCTIONS
            }
          };
          process.stdout.write(JSON.stringify(response) + '\n');
        } else if (method === 'notifications/initialized') {
          // No-op lifecycle event
        } else if (method === 'ping') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result: {} }) + '\n');
        } else if (method === 'tools/list') {
          const response = {
            jsonrpc: '2.0',
            id,
            result: {
              tools: MCP_TOOLS
            }
          };
          process.stdout.write(JSON.stringify(response) + '\n');
        } else if (method === 'resources/list') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result: { resources: [] } }) + '\n');
        } else if (method === 'prompts/list') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result: { prompts: [] } }) + '\n');
        } else if (method === 'tools/call') {
          try {
            const toolName = params.name;
            const args = params.arguments || {};
            const licenseKey = args.licenseKey;

            const quotaManager = QuotaManager.getInstance();
            const evaluation = quotaManager.recordAndEvaluate({
              toolName,
              licenseKey
            });

            if (!evaluation.allowed) {
              const paywallResponse = {
                jsonrpc: '2.0',
                id,
                result: {
                  isError: true,
                  content: [
                    {
                      type: 'text',
                      text: evaluation.paywallMessage || 'Quota exceeded. Upgrade to continue.'
                    }
                  ],
                  _meta: {
                    httpStatus: 402,
                    paywall: {
                      error: 'QUOTA_EXCEEDED',
                      freeLimit: evaluation.freeLimit,
                      callCount: evaluation.callCount,
                      checkoutUrl: 'https://buy.polar.sh/polar_cl_OUy6Q7GoY78aXhbdaFyoJ646wtXgD7mszAadt4FgJHz'
                    }
                  }
                }
              };
              process.stdout.write(JSON.stringify(paywallResponse) + '\n');
            } else {
              const toolResult = await this.executeTool(toolName, args);

              // Update metrics if tool emitted savings or security hazards
              quotaManager.recordCallMetrics(toolResult?.tokensSaved, toolResult?.hasVulnerability);

              const response = {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(toolResult, null, 2) + '\n' + evaluation.roiFooter
                    }
                  ],
                  _meta: {
                    quota: {
                      allowed: true,
                      callCount: evaluation.callCount,
                      remainingCalls: evaluation.remainingCalls,
                      isLicensed: evaluation.isLicensed,
                      cumulativeDollarsSaved: evaluation.dollarsSavedTotal
                    }
                  }
                }
              };
              process.stdout.write(JSON.stringify(response) + '\n');
            }
          } catch (toolErr: any) {
            const errorResponse = {
              jsonrpc: '2.0',
              id,
              result: {
                isError: true,
                content: [
                  {
                    type: 'text',
                    text: `Error executing ${params.name}: ${toolErr.message}`
                  }
                ]
              }
            };
            process.stdout.write(JSON.stringify(errorResponse) + '\n');
          }
        } else {
          // Method not found
          if (id !== undefined) {
            const response = {
              jsonrpc: '2.0',
              id,
              error: { code: -32601, message: `Method '${method}' not found` }
            };
            process.stdout.write(JSON.stringify(response) + '\n');
          }
        }
      } catch (err: any) {
        // Parse error
        const response = {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: `Parse error: ${err.message}` }
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    });
  }
}
