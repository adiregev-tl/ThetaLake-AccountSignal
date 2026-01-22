import { AnalysisResult } from '@/types/analysis';

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  timeout?: number;
}

export interface AIProvider {
  readonly name: string;
  readonly supportsWebGrounding: boolean;
  analyzeCompany(companyName: string): Promise<AnalysisResult>;
}

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;
  abstract readonly supportsWebGrounding: boolean;

  protected apiKey: string;
  protected model: string;
  protected timeout: number;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || this.getDefaultModel();
    this.timeout = config.timeout || 60000;
  }

  abstract getDefaultModel(): string;
  abstract analyzeCompany(companyName: string): Promise<AnalysisResult>;

  protected getAnalysisPrompt(companyName: string): string {
    return `You are a corporate intelligence analyst. Analyze "${companyName}" and provide comprehensive information. Search for the most current information available.

Return your analysis in the following EXACT format with tags:

[SUMMARY]
Write exactly 4 sentences summarizing the company's core activities, market position, and recent developments.
[/SUMMARY]

[SENTIMENT]
One word only: BULLISH, BEARISH, MIXED, or NEUTRAL based on recent news and market perception.
[/SENTIMENT]

[QUICK_FACTS]
Employee Count: [number or estimate]
Headquarters: [location]
Industry: [primary industry]
Founded: [year]
CEO: [name]
Market Cap: [value if public, or "Private"]
[/QUICK_FACTS]

[INVESTOR_DOCS]
Latest 10-K | [URL if found] | [Key highlights]
Latest Investor Presentation | [URL if found] | [Key highlights]
[/INVESTOR_DOCS]

[KEY_PRIORITIES]
List 5 key strategic priorities from executive communications:
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]
4. [Priority 4]
5. [Priority 5]
[/KEY_PRIORITIES]

[GROWTH_INITIATIVES]
List 5 growth initiatives:
1. [Initiative 1]
2. [Initiative 2]
3. [Initiative 3]
4. [Initiative 4]
5. [Initiative 5]
[/GROWTH_INITIATIVES]

[TECH_NEWS]
Provide exactly 10 recent AI/technology news items about this company (past month). Format each as:
Title | URL | Brief summary
[/TECH_NEWS]

[CASE_STUDIES]
Find 5 external case studies where ${companyName} is a CUSTOMER or PARTNER of tech vendors (AWS, Microsoft, Google, Salesforce, etc.). NOT self-hosted case studies. Format:
Vendor: Title | URL | Summary
[/CASE_STUDIES]

[COMPETITORS]
List 5 main competitors. Format:
Competitor Name | Market Position | Key Differentiator
[/COMPETITORS]

[COMPETITOR_MENTIONS]
Search for any mentions of "${companyName}" on the websites, press releases, case studies, or partner pages of these specific companies: Smarsh, Global Relay, NICE, Verint, Arctera, Veritas, Proofpoint, Shield, Behavox, Digital Reasoning, Mimecast, ZL Technologies.
Look for: customer logos, case studies, partner announcements, press releases, or comparison mentions.
IMPORTANT: Only include REAL URLs that actually exist on the competitor's website (e.g., https://www.smarsh.com/..., https://www.globalrelay.com/..., etc.). Do NOT use placeholder URLs.
Format each finding as:
Competitor Name | Mention Type (customer/partner/comparison/case_study/press_release/other) | Title | Full External URL | Date (YYYY-MM or YYYY if exact date unknown) | Brief summary
[/COMPETITOR_MENTIONS]

[LEADERSHIP_CHANGES]
List any recent leadership changes, executive appointments, promotions, or departures in the past 12 months. Format:
Name | New Role | Change Type (appointed/promoted/departed/expanded_role) | Date | Previous Role (if applicable) | Source URL
[/LEADERSHIP_CHANGES]

[MA_ACTIVITY]
List mergers, acquisitions, and divestitures in the past 5 years. Format:
Year | Type (Acquisition/Merger/Divestiture) | Target/Partner | Deal Value (if known) | Strategic Rationale
[/MA_ACTIVITY]

[SOURCES]
List all source URLs used, one per line.
[/SOURCES]`;
  }
}
