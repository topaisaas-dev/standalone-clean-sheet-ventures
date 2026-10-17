export type TestOutcome = 'PASS' | 'FAIL' | 'SKIPPED';

export interface MarkovAnalysisResult {
  totalRuns: number;
  passCount: number;
  failCount: number;
  flipCount: number;
  passToFailProb: number;
  failToPassProb: number;
  flakinessScore: number; // 0.0 (perfectly stable) to 1.0 (maximally unstable)
  classification: 'STABLE_PASS' | 'STABLE_FAIL' | 'HIGHLY_FLAKY' | 'MODERATELY_FLAKY';
  isFlaky: boolean;
}

export class MarkovAnalyzer {
  /**
   * Analyzes an ordered sequence of test run outcomes to compute
   * the Markov chain transition probabilities and flakiness coefficient.
   */
  public static analyze(outcomes: TestOutcome[]): MarkovAnalysisResult {
    // Filter out SKIPPED runs
    const valid = outcomes.filter(o => o === 'PASS' || o === 'FAIL');

    if (valid.length < 2) {
      const isPass = valid[0] === 'PASS';
      return {
        totalRuns: valid.length,
        passCount: isPass ? 1 : 0,
        failCount: isPass ? 0 : 1,
        flipCount: 0,
        passToFailProb: 0,
        failToPassProb: 0,
        flakinessScore: 0,
        classification: isPass ? 'STABLE_PASS' : 'STABLE_FAIL',
        isFlaky: false
      };
    }

    let passCount = 0;
    let failCount = 0;
    let passToFail = 0;
    let passToPass = 0;
    let failToPass = 0;
    let failToFail = 0;
    let flipCount = 0;

    for (let i = 0; i < valid.length; i++) {
      if (valid[i] === 'PASS') passCount++;
      else failCount++;

      if (i > 0) {
        const prev = valid[i - 1];
        const curr = valid[i];

        if (prev !== curr) {
          flipCount++;
        }

        if (prev === 'PASS' && curr === 'FAIL') passToFail++;
        else if (prev === 'PASS' && curr === 'PASS') passToPass++;
        else if (prev === 'FAIL' && curr === 'PASS') failToPass++;
        else if (prev === 'FAIL' && curr === 'FAIL') failToFail++;
      }
    }

    const totalPassTransitions = passToPass + passToFail;
    const totalFailTransitions = failToPass + failToFail;

    const passToFailProb = totalPassTransitions > 0 ? passToFail / totalPassTransitions : 0;
    const failToPassProb = totalFailTransitions > 0 ? failToPass / totalFailTransitions : 0;

    // A test that always passes or always fails has 0 flips -> 0 flakiness score.
    // A test that flips state constantly has maximum instability.
    const maxPossibleFlips = valid.length - 1;
    const flakinessScore = maxPossibleFlips > 0
      ? Math.round((flipCount / maxPossibleFlips) * 100) / 100
      : 0;

    let classification: MarkovAnalysisResult['classification'] = 'STABLE_PASS';
    if (failCount === valid.length) {
      classification = 'STABLE_FAIL';
    } else if (flakinessScore >= 0.4 || (passCount > 0 && failCount > 0 && flipCount >= 2)) {
      classification = 'HIGHLY_FLAKY';
    } else if (passCount > 0 && failCount > 0) {
      classification = 'MODERATELY_FLAKY';
    }

    const isFlaky = classification === 'HIGHLY_FLAKY' || classification === 'MODERATELY_FLAKY';

    return {
      totalRuns: valid.length,
      passCount,
      failCount,
      flipCount,
      passToFailProb: Math.round(passToFailProb * 1000) / 1000,
      failToPassProb: Math.round(failToPassProb * 1000) / 1000,
      flakinessScore,
      classification,
      isFlaky
    };
  }
}
