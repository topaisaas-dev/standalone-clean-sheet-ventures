export interface Form4OwnerRelationship {
  isDirector: boolean;
  isOfficer: boolean;
  isTenPercentOwner: boolean;
  officerTitle?: string;
}

export interface Form4Transaction {
  securityTitle: string;
  transactionDate: string;
  transactionCode: string; // 'P' = Open Market Purchase, 'S' = Sale, 'M' = Option, 'A' = Grant
  shares: number;
  pricePerShare: number;
  totalDollarValue: number;
  acquiredDisposed: 'A' | 'D';
  sharesOwnedAfter: number;
  isOpenMarketPurchase: boolean; // Code === 'P' && acquired === 'A'
}

export interface Form4Filing {
  issuerSymbol: string;
  issuerName: string;
  issuerCik: string;
  ownerName: string;
  ownerCik?: string;
  relationship: Form4OwnerRelationship;
  periodOfReport: string;
  transactions: Form4Transaction[];
  hasOpenMarketPurchases: boolean;
  totalOpenMarketPurchaseValue: number;
}

export class Form4Parser {
  private static extractTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = regex.exec(xml);
    return match ? match[1].trim() : null;
  }

  private static extractValueTag(xml: string, tag: string): string | null {
    const parent = this.extractTag(xml, tag);
    if (!parent) return null;
    const val = this.extractTag(parent, 'value');
    return val !== null ? val : parent;
  }

  /**
   * Parses standard SEC EDGAR Form 4 XML filing into structured domain object.
   */
  public static parse(xmlContent: string): Form4Filing {
    // 1. Issuer details
    const issuerBlock = this.extractTag(xmlContent, 'issuer') || '';
    const issuerSymbol = (this.extractTag(issuerBlock, 'issuerTradingSymbol') || 'UNKNOWN').toUpperCase();
    const issuerName = this.extractTag(issuerBlock, 'issuerName') || 'Unknown Corp';
    const issuerCik = this.extractTag(issuerBlock, 'issuerCik') || '';

    // 2. Reporting Owner details
    const rptOwnerBlock = this.extractTag(xmlContent, 'reportingOwner') || '';
    const ownerNameBlock = this.extractTag(rptOwnerBlock, 'reportingOwnerId') || rptOwnerBlock;
    const ownerName = this.extractTag(ownerNameBlock, 'rptOwnerName') || 'Unknown Insider';
    const ownerCik = this.extractTag(ownerNameBlock, 'rptOwnerCik') || undefined;

    const relBlock = this.extractTag(rptOwnerBlock, 'reportingOwnerRelationship') || '';
    const isDirector = (this.extractTag(relBlock, 'isDirector') || '').trim() === '1' || /true/i.test(this.extractTag(relBlock, 'isDirector') || '');
    const isOfficer = (this.extractTag(relBlock, 'isOfficer') || '').trim() === '1' || /true/i.test(this.extractTag(relBlock, 'isOfficer') || '');
    const isTenPercent = (this.extractTag(relBlock, 'isTenPercentOwner') || '').trim() === '1' || /true/i.test(this.extractTag(relBlock, 'isTenPercentOwner') || '');
    const officerTitle = this.extractTag(relBlock, 'officerTitle') || undefined;

    const periodOfReport = this.extractTag(xmlContent, 'periodOfReport') || new Date().toISOString().split('T')[0];

    // 3. Non-Derivative Transactions
    const transactions: Form4Transaction[] = [];
    const nonDerivRegex = /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi;
    let match: RegExpExecArray | null;

    let totalOpenMarketPurchaseValue = 0;

    while ((match = nonDerivRegex.exec(xmlContent)) !== null) {
      const txBlock = match[1];

      const securityTitle = this.extractValueTag(txBlock, 'securityTitle') || 'Common Stock';
      const txDate = this.extractValueTag(txBlock, 'transactionDate') || periodOfReport;

      const codingBlock = this.extractTag(txBlock, 'transactionCoding') || '';
      const txCode = (this.extractTag(codingBlock, 'transactionCode') || 'UNKNOWN').toUpperCase();

      const amountsBlock = this.extractTag(txBlock, 'transactionAmounts') || txBlock;
      const sharesStr = this.extractValueTag(amountsBlock, 'transactionShares') || '0';
      const priceStr = this.extractValueTag(amountsBlock, 'transactionPricePerShare') || '0';
      const acqDisp = (this.extractValueTag(amountsBlock, 'transactionAcquiredDisposedCode') || 'A').toUpperCase() as 'A' | 'D';

      const postBlock = this.extractTag(txBlock, 'postTransactionAmounts') || txBlock;
      const ownedAfterStr = this.extractValueTag(postBlock, 'sharesOwnedFollowingTransaction') || '0';

      const shares = Math.abs(parseFloat(sharesStr) || 0);
      const pricePerShare = Math.abs(parseFloat(priceStr) || 0);
      const totalDollarValue = Math.round(shares * pricePerShare * 100) / 100;
      const sharesOwnedAfter = parseFloat(ownedAfterStr) || 0;

      const isOpenMarketPurchase = txCode === 'P' && acqDisp === 'A';

      if (isOpenMarketPurchase) {
        totalOpenMarketPurchaseValue += totalDollarValue;
      }

      transactions.push({
        securityTitle,
        transactionDate: txDate,
        transactionCode: txCode,
        shares,
        pricePerShare,
        totalDollarValue,
        acquiredDisposed: acqDisp,
        sharesOwnedAfter,
        isOpenMarketPurchase
      });
    }

    return {
      issuerSymbol,
      issuerName,
      issuerCik,
      ownerName,
      ownerCik,
      relationship: {
        isDirector,
        isOfficer,
        isTenPercentOwner: isTenPercent,
        officerTitle
      },
      periodOfReport,
      transactions,
      hasOpenMarketPurchases: totalOpenMarketPurchaseValue > 0,
      totalOpenMarketPurchaseValue: Math.round(totalOpenMarketPurchaseValue * 100) / 100
    };
  }
}
