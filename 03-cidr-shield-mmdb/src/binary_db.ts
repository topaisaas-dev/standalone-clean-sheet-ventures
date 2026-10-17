import { IpUtils } from './ip_utils.ts';
import { RadixTrie } from './radix_trie.ts';
import type { IpMetadata, IpCategory } from './radix_trie.ts';

const MAGIC_BYTES = Buffer.from('CSDB'); // CIDR Shield Database magic: 0x43, 0x53, 0x44, 0x42
const FORMAT_VERSION = 1;

const CATEGORY_MAP: Record<IpCategory, number> = {
  DATACENTER: 1,
  TOR_EXIT: 2,
  VPN: 3,
  PUBLIC_PROXY: 4,
  RESIDENTIAL_CLEAN: 5
};

const REVERSE_CATEGORY_MAP: Record<number, IpCategory> = {
  1: 'DATACENTER',
  2: 'TOR_EXIT',
  3: 'VPN',
  4: 'PUBLIC_PROXY',
  5: 'RESIDENTIAL_CLEAN'
};

export interface CidrRecord {
  cidr: string;
  category: IpCategory;
  provider: string;
  asn?: number;
  riskScore: number;
}

export class CidrShieldDatabase {
  private trie: RadixTrie = new RadixTrie();
  private compiledAt: Date = new Date();

  /**
   * Loads a binary .cidrdb buffer or file into the Radix Trie.
   */
  public loadBinary(buffer: Buffer): void {
    if (buffer.length < 14) {
      throw new Error('Invalid binary database: file too small');
    }

    if (!buffer.subarray(0, 4).equals(MAGIC_BYTES)) {
      throw new Error('Invalid magic header: not a valid CIDR Shield binary database');
    }

    const version = buffer.readUInt16BE(4);
    if (version !== FORMAT_VERSION) {
      throw new Error(`Unsupported format version: ${version}`);
    }

    const timestampSec = buffer.readUInt32BE(6);
    this.compiledAt = new Date(timestampSec * 1000);

    const recordCount = buffer.readUInt32BE(10);
    let offset = 14;

    for (let i = 0; i < recordCount; i++) {
      if (offset >= buffer.length) break;

      const baseInt = buffer.readUInt32BE(offset);
      offset += 4;

      const prefixLen = buffer.readUInt8(offset);
      offset += 1;

      const catCode = buffer.readUInt8(offset);
      offset += 1;

      const riskScore = buffer.readUInt8(offset);
      offset += 1;

      const asn = buffer.readUInt32BE(offset);
      offset += 4;

      const provLen = buffer.readUInt8(offset);
      offset += 1;

      const provider = buffer.toString('utf8', offset, offset + provLen);
      offset += provLen;

      const baseIp = IpUtils.intToIpv4(baseInt);
      const cidr = `${baseIp}/${prefixLen}`;
      const category = REVERSE_CATEGORY_MAP[catCode] || 'DATACENTER';

      this.trie.insert(cidr, {
        category,
        provider,
        asn: asn > 0 ? asn : undefined,
        riskScore
      });
    }
  }

  /**
   * Compiles an array of CIDR records into the binary .cidrdb format Buffer.
   */
  public static compile(records: CidrRecord[], timestamp = Math.floor(Date.now() / 1000)): Buffer {
    const buffers: Buffer[] = [];

    // Header: Magic(4) + Version(2) + Timestamp(4) + RecordCount(4) = 14 bytes
    const header = Buffer.alloc(14);
    MAGIC_BYTES.copy(header, 0);
    header.writeUInt16BE(FORMAT_VERSION, 4);
    header.writeUInt32BE(timestamp, 6);
    header.writeUInt32BE(records.length, 10);
    buffers.push(header);

    for (const rec of records) {
      const { baseInt, prefixLen } = IpUtils.parseIpv4Cidr(rec.cidr);
      const provBuffer = Buffer.from(rec.provider || 'UNKNOWN', 'utf8');
      const provLen = Math.min(provBuffer.length, 255);

      const row = Buffer.alloc(12 + provLen);
      row.writeUInt32BE(baseInt, 0);
      row.writeUInt8(prefixLen, 4);
      row.writeUInt8(CATEGORY_MAP[rec.category] || 1, 5);
      row.writeUInt8(Math.max(0, Math.min(100, rec.riskScore || 0)), 6);
      row.writeUInt32BE(rec.asn || 0, 7);
      row.writeUInt8(provLen, 11);
      provBuffer.copy(row, 12, 0, provLen);

      buffers.push(row);
    }

    return Buffer.concat(buffers);
  }

  /**
   * Fast Longest Prefix Match (LPM) IP lookup (< 0.001 ms).
   */
  public lookup(ip: string): IpMetadata {
    return this.trie.lookup(ip);
  }

  public getTrie(): RadixTrie {
    return this.trie;
  }

  public getCompiledAt(): Date {
    return this.compiledAt;
  }
}

// Built-in foundational feed data representing major cloud, proxy, and Tor ranges
export const BUILTIN_IP_DATASETS: CidrRecord[] = [
  // AWS Ranges (ASN 16509)
  { cidr: '3.0.0.0/9', category: 'DATACENTER', provider: 'AWS', asn: 16509, riskScore: 85 },
  { cidr: '13.32.0.0/15', category: 'DATACENTER', provider: 'AWS CloudFront', asn: 16509, riskScore: 80 },
  { cidr: '52.0.0.0/10', category: 'DATACENTER', provider: 'AWS EC2', asn: 16509, riskScore: 85 },
  { cidr: '54.240.0.0/12', category: 'DATACENTER', provider: 'AWS', asn: 16509, riskScore: 85 },

  // Google Cloud (GCP - ASN 15169 / 396982)
  { cidr: '34.64.0.0/11', category: 'DATACENTER', provider: 'GCP Compute', asn: 15169, riskScore: 85 },
  { cidr: '35.184.0.0/13', category: 'DATACENTER', provider: 'GCP', asn: 15169, riskScore: 85 },
  { cidr: '35.208.0.0/12', category: 'DATACENTER', provider: 'GCP Kubernetes', asn: 15169, riskScore: 85 },

  // Microsoft Azure (ASN 8075)
  { cidr: '20.36.0.0/14', category: 'DATACENTER', provider: 'Azure', asn: 8075, riskScore: 85 },
  { cidr: '40.64.0.0/10', category: 'DATACENTER', provider: 'Azure Cloud', asn: 8075, riskScore: 85 },
  { cidr: '51.140.0.0/14', category: 'DATACENTER', provider: 'Azure UK', asn: 8075, riskScore: 85 },

  // Oracle Cloud (OCI - ASN 31898)
  { cidr: '129.213.0.0/16', category: 'DATACENTER', provider: 'Oracle OCI', asn: 31898, riskScore: 85 },
  { cidr: '130.35.0.0/16', category: 'DATACENTER', provider: 'Oracle OCI', asn: 31898, riskScore: 85 },

  // DigitalOcean (ASN 14061)
  { cidr: '159.65.0.0/16', category: 'DATACENTER', provider: 'DigitalOcean', asn: 14061, riskScore: 90 },
  { cidr: '167.99.0.0/16', category: 'DATACENTER', provider: 'DigitalOcean', asn: 14061, riskScore: 90 },

  // Hetzner (ASN 24940)
  { cidr: '88.198.0.0/16', category: 'DATACENTER', provider: 'Hetzner Online', asn: 24940, riskScore: 90 },
  { cidr: '95.216.0.0/16', category: 'DATACENTER', provider: 'Hetzner Cloud', asn: 24940, riskScore: 90 },

  // Known Tor Exit Nodes (Critical Risk = 100)
  { cidr: '185.220.101.0/24', category: 'TOR_EXIT', provider: 'Tor Project Exit Relay', riskScore: 100 },
  { cidr: '185.220.102.0/24', category: 'TOR_EXIT', provider: 'Tor Project Exit Relay', riskScore: 100 },
  { cidr: '171.25.193.20/32', category: 'TOR_EXIT', provider: 'Tor Exit Node', riskScore: 100 },

  // Commercial VPN Providers
  { cidr: '89.187.160.0/19', category: 'VPN', provider: 'Datacamp VPN Pool', riskScore: 95 },
  { cidr: '193.189.100.0/24', category: 'VPN', provider: 'Mullvad / Wireguard Node', riskScore: 95 }
];
