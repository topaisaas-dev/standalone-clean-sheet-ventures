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

export const MCP_TOOLS = [
  {
    name: 'agentpr_guard_audit',
    description: 'Audit a git diff or Pull Request for AI-hallucinated packages, typosquatting, and architecture boundary breaches.',
    inputSchema: {
      type: 'object',
      properties: {
        diff: { type: 'string', description: 'Unified git diff string to audit' }
      },
      required: ['diff']
    }
  },
  {
    name: 'tokenprune_wasm_trim',
    description: 'Prune TypeScript/JavaScript source code to reduce LLM context token usage by 50%-70% by collapsing method bodies.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceCode: { type: 'string', description: 'Source code content to prune' },
        filename: { type: 'string', description: 'Filename for context (e.g. service.ts)' }
      },
      required: ['sourceCode']
    }
  },
  {
    name: 'dockerlean_wasm_audit',
    description: 'Audit a Dockerfile statically for layer bloat, cache invalidation, root user, and missing multi-stage build.',
    inputSchema: {
      type: 'object',
      properties: {
        dockerfileContent: { type: 'string', description: 'Content of the Dockerfile' }
      },
      required: ['dockerfileContent']
    }
  },
  {
    name: 'cidr_shield_lookup',
    description: 'Query an IPv4 address with 0ms latency to detect Datacenter/Cloud servers, VPNs, Tor, and bot proxies.',
    inputSchema: {
      type: 'object',
      properties: {
        ip: { type: 'string', description: 'IPv4 address (e.g. 3.5.10.1)' }
      },
      required: ['ip']
    }
  },
  {
    name: 'terracost_blast_evaluate',
    description: 'Evaluate a Terraform JSON plan for blast radius, stateful resource destruction, and monthly FinOps cost delta.',
    inputSchema: {
      type: 'object',
      properties: {
        planJson: { type: 'string', description: 'Terraform plan JSON content' }
      },
      required: ['planJson']
    }
  },
  {
    name: 'pack3d_wasm_pack',
    description: '3D bin packing optimizer. Packs multiple 3D items into available cartons with 6-axis orthogonal rotation.',
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              w: { type: 'number' },
              h: { type: 'number' },
              d: { type: 'number' },
              weightKg: { type: 'number' }
            },
            required: ['id', 'w', 'h', 'd']
          }
        }
      },
      required: ['items']
    }
  },
  {
    name: 'flaky_quarantine_analyze',
    description: 'Analyze test stability from multiple JUnit XML runs using Markov chain transition matrices.',
    inputSchema: {
      type: 'object',
      properties: {
        junitXmlReports: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of JUnit XML report strings'
        }
      },
      required: ['junitXmlReports']
    }
  },
  {
    name: 'sqltwin_stream_anonymize',
    description: 'Anonymize raw SQL dump content preserving 100% of foreign key joins and unique constraints.',
    inputSchema: {
      type: 'object',
      properties: {
        sqlContent: { type: 'string', description: 'Raw SQL dump content' },
        secretSalt: { type: 'string', description: 'HMAC salt for deterministic pseudonymization' }
      },
      required: ['sqlContent']
    }
  },
  {
    name: 'edgarpulse_parse_filing',
    description: 'Parse SEC Form 4 or 8-K XML filing to detect C-suite open market cluster purchases with quantitative conviction score.',
    inputSchema: {
      type: 'object',
      properties: {
        filingXml: { type: 'string', description: 'Raw SEC XML filing content' }
      },
      required: ['filingXml']
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
        return { report, markdown: md };
      }

      case 'tokenprune_wasm_trim': {
        const result = AstPruner.pruneTypeScript(args.sourceCode || '', args.filename || 'source.ts');
        return {
          tokensSaved: result.tokensSaved,
          savingsRatioPercent: result.savingsRatioPercent,
          prunedContent: result.prunedContent
        };
      }

      case 'dockerlean_wasm_audit': {
        const report = DockerfileLinter.audit(args.dockerfileContent || '');
        const md = DockerfileLinter.generateMarkdownReport(report);
        return { report, markdown: md };
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
              capabilities: { tools: {} },
              serverInfo: {
                name: 'topai-sovereign-suite',
                version: '1.0.0'
              }
            }
          };
          process.stdout.write(JSON.stringify(response) + '\n');
        } else if (method === 'notifications/initialized') {
          // No-op
        } else if (method === 'tools/list') {
          const response = {
            jsonrpc: '2.0',
            id,
            result: {
              tools: MCP_TOOLS
            }
          };
          process.stdout.write(JSON.stringify(response) + '\n');
        } else if (method === 'tools/call') {
          try {
            const toolResult = await this.executeTool(params.name, params.arguments || {});
            const response = {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(toolResult, null, 2)
                  }
                ]
              }
            };
            process.stdout.write(JSON.stringify(response) + '\n');
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
