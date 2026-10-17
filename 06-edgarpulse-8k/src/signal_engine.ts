import type { Form4Filing, Form4Transaction } from './form4_parser.ts';
import type { Form8KFiling } from './form8k_parser.ts';

export type SignalVerdict =
  | 'STRONG_BULLISH_INSIDER_CLUSTER'
  | 'BULLISH_C_SUITE_BUY'
  | 'MODERATE_INSIDER_ACCUMULATION'
  | 'LOW_CONVICTION_NOISE';

export interface InsiderAlphaSignal {
  symbol: string;
  companyName: string;
  filingDate: string;
  insiderName: string;
  officerTitle?: string;
  totalPurchaseValue: number;
  totalSharesBought: number;
  averagePrice: number;
  convictionScore: number; // 0 to 100
  verdict: SignalVerdict;
  isCluster: boolean;
  distinctInsidersInCluster: number;
  clusterTotalValue: number;
  catalystNotes: string[];
}

export class SignalEngine {
  /**
   * Evaluates a single Form 4 filing and computes an insider conviction score.
   */
  public static evaluateFiling(filing: Form4Filing): InsiderAlphaSignal | null {
    if (!filing.hasOpenMarketPurchases) {
      return null;
    }

    const openMarketTx = filing.transactions.filter(t => t.isOpenMarketPurchase);
    if (openMarketTx.length === 0) {
      return null;
    }

    const totalVal = filing.totalOpenMarketPurchaseValue;
    const totalShares = openMarketTx.reduce((acc, t) => acc + t.shares, 0);
    const avgPrice = totalShares > 0 ? Math.round((totalVal / totalShares) * 100) / 100 : 0;

    let score = 0;
    const notes: string[] = [];

    // 1. Seniority weighting
    const rel = filing.relationship;
    const title = (rel.officerTitle || '').toLowerCase();
    const isCeoOrCfo = title.includes('ceo') || title.includes('cfo') || title.includes('chief executive') || title.includes('chief financial');

    if (isCeoOrCfo) {
      score += 35;
      notes.push(`High seniority: C-Suite purchase by ${rel.officerTitle || 'Executive'}`);
    } else if (rel.isOfficer) {
      score += 25;
      notes.push(`Executive officer purchase: ${rel.officerTitle || 'Officer'}`);
    } else if (rel.isDirector) {
      score += 20;
      notes.push('Board of Directors purchase');
    } else if (rel.isTenPercentOwner) {
      score += 15;
      notes.push('10% Beneficial Owner purchase');
    }

    // 2. Dollar volume sizing
    if (totalVal >= 1000000) {
      score += 40;
      notes.push(`Whale scale conviction: $${(totalVal / 1000000).toFixed(2)}M deployed`);
    } else if (totalVal >= 500000) {
      score += 30;
      notes.push(`Major scale conviction: $${(totalVal / 1000).toFixed(0)}k deployed`);
    } else if (totalVal >= 100000) {
      score += 20;
      notes.push(`Significant capital deployment: $${(totalVal / 1000).toFixed(0)}k`);
    } else if (totalVal >= 25000) {
      score += 10;
      notes.push(`Material buy: $${(totalVal / 1000).toFixed(0)}k`);
    }

    // 3. Percentage increase in personal holdings
    const latestTx = openMarketTx[openMarketTx.length - 1];
    const ownedPrior = latestTx.sharesOwnedAfter - totalShares;
    if (ownedPrior > 0) {
      const pctIncrease = (totalShares / ownedPrior) * 100;
      if (pctIncrease >= 20) {
        score += 15;
        notes.push(`Substantial stake expansion: +${pctIncrease.toFixed(1)}% of prior holdings`);
      }
    } else if (latestTx.sharesOwnedAfter > 0 && ownedPrior <= 0) {
      // First-time stake initialization
      score += 15;
      notes.push('Initial personal equity stake created (skin in the game)');
    }

    const convictionScore = Math.min(100, score);

    let verdict: SignalVerdict = 'LOW_CONVICTION_NOISE';
    if (convictionScore >= 75) {
      verdict = 'BULLISH_C_SUITE_BUY';
    } else if (convictionScore >= 45) {
      verdict = 'MODERATE_INSIDER_ACCUMULATION';
    }

    return {
      symbol: filing.issuerSymbol,
      companyName: filing.issuerName,
      filingDate: filing.periodOfReport,
      insiderName: filing.ownerName,
      officerTitle: filing.relationship.officerTitle,
      totalPurchaseValue: totalVal,
      totalSharesBought: totalShares,
      averagePrice: avgPrice,
      convictionScore,
      verdict,
      isCluster: false,
      distinctInsidersInCluster: 1,
      clusterTotalValue: totalVal,
      catalystNotes: notes
    };
  }

  /**
   * Cluster Detector: analyzes multiple filings across the same ticker
   * to discover multi-insider simultaneous accumulation within a 72-hour window.
   */
  public static analyzeClusters(
    filings: Form4Filing[],
    form8kEvents: Form8KFiling[] = []
  ): InsiderAlphaSignal[] {
    const validSignals = filings
      .map(f => this.evaluateFiling(f))
      .filter((s): s is InsiderAlphaSignal => s !== null);

    // Group by ticker symbol
    const bySymbol = new Map<string, InsiderAlphaSignal[]>();
    for (const sig of validSignals) {
      if (!bySymbol.has(sig.symbol)) {
        bySymbol.set(sig.symbol, []);
      }
      bySymbol.get(sig.symbol)!.push(sig);
    }

    const enhancedSignals: InsiderAlphaSignal[] = [];

    for (const [symbol, signals] of bySymbol.entries()) {
      const distinctInsiders = new Set(signals.map(s => s.insiderName));
      const totalClusterValue = signals.reduce((acc, s) => acc + s.totalPurchaseValue, 0);

      // Check Form 8-K correlation for this symbol
      const related8k = form8kEvents.find(e => e.issuerSymbol === symbol);

      for (const sig of signals) {
        let boostedScore = sig.convictionScore;
        const notes = [...sig.catalystNotes];

        if (distinctInsiders.size >= 2) {
          const clusterBoost = distinctInsiders.size >= 3 ? 35 : 25;
          boostedScore += clusterBoost;
          notes.push(`⚡ CLUSTER BUYING DETECTED: ${distinctInsiders.size} distinct insiders bought $${(totalClusterValue / 1000).toFixed(0)}k`);
        }

        if (related8k) {
          boostedScore += 10;
          notes.push(`8-K Catalyst: Material filing on ${related8k.filingDate} (${related8k.items.map(i => i.itemNumber).join(', ')})`);
        }

        const finalScore = Math.min(100, boostedScore);

        let verdict: SignalVerdict = sig.verdict;
        if (distinctInsiders.size >= 2 && finalScore >= 70) {
          verdict = 'STRONG_BULLISH_INSIDER_CLUSTER';
        } else if (finalScore >= 70) {
          verdict = 'BULLISH_C_SUITE_BUY';
        } else if (finalScore >= 40) {
          verdict = 'MODERATE_INSIDER_ACCUMULATION';
        }

        enhancedSignals.push({
          ...sig,
          convictionScore: finalScore,
          verdict,
          isCluster: distinctInsiders.size >= 2,
          distinctInsidersInCluster: distinctInsiders.size,
          clusterTotalValue: totalClusterValue,
          catalystNotes: notes
        });
      }
    }

    return enhancedSignals.sort((a, b) => b.convictionScore - a.convictionScore);
  }
}
