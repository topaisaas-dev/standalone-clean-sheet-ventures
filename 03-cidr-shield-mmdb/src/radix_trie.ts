import { IpUtils } from './ip_utils.ts';

export type IpCategory =
  | 'DATACENTER'
  | 'TOR_EXIT'
  | 'VPN'
  | 'PUBLIC_PROXY'
  | 'RESIDENTIAL_CLEAN';

export interface IpMetadata {
  category: IpCategory;
  provider: string;
  asn?: number;
  riskScore: number; // 0 (safest) to 100 (highest risk)
  cidr?: string;
}

export class TrieNode {
  public child0: TrieNode | null = null;
  public child1: TrieNode | null = null;
  public data: IpMetadata | null = null;
}

export class RadixTrie {
  public root: TrieNode = new TrieNode();
  private prefixCount = 0;

  /**
   * Inserts a CIDR prefix with its metadata into the Radix Trie.
   */
  public insert(cidr: string, metadata: IpMetadata): void {
    const { baseInt, prefixLen } = IpUtils.parseIpv4Cidr(cidr);
    let current = this.root;

    for (let i = 0; i < prefixLen; i++) {
      const bit = IpUtils.getBit(baseInt, i);
      if (bit === 0) {
        if (!current.child0) {
          current.child0 = new TrieNode();
        }
        current = current.child0;
      } else {
        if (!current.child1) {
          current.child1 = new TrieNode();
        }
        current = current.child1;
      }
    }

    current.data = {
      ...metadata,
      cidr
    };
    this.prefixCount++;
  }

  /**
   * Performs Longest Prefix Match (LPM) on an IPv4 address.
   * Returns metadata of the most specific matching CIDR block,
   * or a default clean residential classification if unmatched.
   */
  public lookup(ip: string): IpMetadata {
    const ipInt = IpUtils.ipv4ToInt(ip);
    let current: TrieNode | null = this.root;
    let longestMatch: IpMetadata | null = current.data;

    for (let i = 0; i < 32; i++) {
      if (!current) break;
      const bit = IpUtils.getBit(ipInt, i);
      current = bit === 0 ? current.child0 : current.child1;

      if (current && current.data) {
        longestMatch = current.data;
      }
    }

    if (longestMatch) {
      return longestMatch;
    }

    // Default fallback: Clean residential / unclassified
    return {
      category: 'RESIDENTIAL_CLEAN',
      provider: 'ISP_RESIDENTIAL',
      riskScore: 0,
      cidr: `${ip}/32`
    };
  }

  public getCount(): number {
    return this.prefixCount;
  }
}
