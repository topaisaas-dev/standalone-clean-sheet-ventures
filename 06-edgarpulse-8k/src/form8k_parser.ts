export interface Form8KItem {
  itemNumber: string; // e.g. "1.01", "2.02", "5.02"
  itemTitle: string;
  isMaterialCorporateChange: boolean;
}

export interface Form8KFiling {
  issuerSymbol: string;
  issuerName: string;
  filingDate: string;
  items: Form8KItem[];
  hasMajorLeadershipChange: boolean; // Item 5.02
  hasEarningsResults: boolean; // Item 2.02
  hasMaterialAgreement: boolean; // Item 1.01
}

const ITEM_DESCRIPTIONS: Record<string, { title: string; isMaterial: boolean }> = {
  '1.01': { title: 'Entry into a Material Definitive Agreement', isMaterial: true },
  '1.02': { title: 'Termination of a Material Definitive Agreement', isMaterial: true },
  '1.03': { title: 'Bankruptcy or Receivership', isMaterial: true },
  '2.01': { title: 'Completion of Acquisition or Disposition of Assets', isMaterial: true },
  '2.02': { title: 'Results of Operations and Financial Condition', isMaterial: true },
  '3.01': { title: 'Notice of Delisting or Failure to Satisfy Continued Listing Rule', isMaterial: true },
  '5.01': { title: 'Changes in Control of Registrant', isMaterial: true },
  '5.02': { title: 'Departure of Directors or Principal Officers; Election of Directors', isMaterial: true },
  '7.01': { title: 'Regulation FD Disclosure', isMaterial: false },
  '8.01': { title: 'Other Events', isMaterial: false }
};

export class Form8KParser {
  /**
   * Parses Form 8-K text or SGML/XML content to extract disclosed items and corporate triggers.
   */
  public static parse(content: string, symbol = 'UNKNOWN', filingDate?: string): Form8KFiling {
    const itemsFound: Form8KItem[] = [];

    // Match patterns like "Item 1.01", "Item 5.02", "ITEM 2.02"
    const itemRegex = /\bitem\s+([1-9]\.[0-9]{2})\b/gi;
    let match: RegExpExecArray | null;
    const seenItems = new Set<string>();

    while ((match = itemRegex.exec(content)) !== null) {
      const itemNum = match[1];
      if (!seenItems.has(itemNum)) {
        seenItems.add(itemNum);
        const meta = ITEM_DESCRIPTIONS[itemNum] || { title: `Unscheduled Disclosure ${itemNum}`, isMaterial: true };
        itemsFound.push({
          itemNumber: itemNum,
          itemTitle: meta.title,
          isMaterialCorporateChange: meta.isMaterial
        });
      }
    }

    // Extract company name if available
    let companyName = 'Unknown Corporation';
    const compMatch = /COMPANY CONFORMED NAME:\s*([^\r\n]+)/i.exec(content);
    if (compMatch) {
      companyName = compMatch[1].trim();
    }

    const date = filingDate || new Date().toISOString().split('T')[0];

    return {
      issuerSymbol: symbol.toUpperCase(),
      issuerName: companyName,
      filingDate: date,
      items: itemsFound,
      hasMajorLeadershipChange: seenItems.has('5.02'),
      hasEarningsResults: seenItems.has('2.02'),
      hasMaterialAgreement: seenItems.has('1.01')
    };
  }
}
