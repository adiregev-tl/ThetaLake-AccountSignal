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
Find 5 technology case studies from OTHER technology companies (AWS, Microsoft, Google, Salesforce, ServiceNow, Snowflake, etc.) where ${companyName} is featured as a customer or partner.
IMPORTANT: Only include case studies HOSTED BY other companies, NOT case studies hosted on ${companyName}'s own website.
Format: Vendor: Title | URL | Summary
[/CASE_STUDIES]

[COMPLIANCE_VENDORS]
Based on what you know about ${companyName}, list any compliance, archiving, e-discovery, or communications surveillance technology vendors (beyond Smarsh, Global Relay, NICE, Verint, Arctera, Veritas, Proofpoint, Shield, Behavox, Digital Reasoning, Mimecast, ZL Technologies) that ${companyName} may use, partner with, or that have published content about ${companyName}.
These must be real, named companies. One name per line. If none, leave empty.
[/COMPLIANCE_VENDORS]

[COMPETITOR_MENTIONS]
Leave this section empty. Competitor mentions are populated separately via verified web search.
[/COMPETITOR_MENTIONS]

[LEADERSHIP_CHANGES]
List any recent leadership changes, executive appointments, promotions, or departures in the past 12 months. Format:
Name | New Role | Change Type (appointed/promoted/departed/expanded_role) | Date | Previous Role (if applicable) | Source URL
[/LEADERSHIP_CHANGES]

[MA_ACTIVITY]
List ONLY verified, publicly announced mergers, acquisitions, and divestitures from the past 10 years.
CRITICAL: Only include deals with REAL company names that you can verify from news sources. Do NOT make up or hallucinate company names like "Fintech Startup XYZ" or "Regional Bank ABC". If you cannot verify real M&A activity, leave this section empty.
Format: Year | Type (Acquisition/Merger/Divestiture) | Target/Partner (real verified company name) | Deal Value (if known) | Strategic Rationale
[/MA_ACTIVITY]

[REGULATORY_LANDSCAPE]
Based on your knowledge of "${companyName}", its industry, business activities, and geographic operations, list ALL regulatory bodies that oversee, regulate, or interact with this company.
IMPORTANT: This section must NOT be empty. Every company operates under regulatory oversight. Consider the company's industry (financial services, healthcare, tech, etc.), the jurisdictions it operates in, and its specific business activities (securities, banking, insurance, data privacy, etc.).
For financial services companies, typical regulators include: SEC, FINRA, OCC, FDIC, Federal Reserve, CFPB, DOJ, State AGs, and international bodies like FCA, ESMA, PRA, MAS, ASIC, BaFin depending on geographic presence.
For technology companies, consider: FTC, FCC, EU DPA, state privacy regulators, SEC (if public), etc.
Format: Regulatory Body (use SHORT name/acronym only, e.g., "SEC" not "SEC (Securities and Exchange Commission)") | Brief context of the relationship (e.g., "Primary securities regulator", "Banking supervisor", "Registered broker-dealer") | Regulator homepage URL (e.g., https://www.sec.gov, https://www.finra.org)
[/REGULATORY_LANDSCAPE]

[REGULATORY_EVENTS]
Search SEC.gov, FINRA.org, DOJ.gov, FCA.org.uk, and major financial news sources (Reuters, Bloomberg, WSJ) for enforcement actions, fines, penalties, settlements, consent orders, or investigations involving "${companyName}" from the past 5 years (2020-present).

Look specifically for:
- SEC enforcement actions and litigation releases
- FINRA disciplinary actions and fines
- DOJ settlements and criminal charges
- State attorney general actions
- International regulatory penalties (FCA, ESMA, etc.)

For major financial institutions, there are typically multiple enforcement actions - search thoroughly.
IMPORTANT: Only include REAL events with verifiable sources. Do not fabricate events.
Format: Date (YYYY-MM or YYYY) | Regulatory Body | Event Type (fine/penalty/settlement/enforcement/investigation/consent/order) | Amount (e.g., $15 million) | Brief description of violation | News or official source URL
[/REGULATORY_EVENTS]

[SOURCES]
List all source URLs used, one per line.
[/SOURCES]`;
  }
}
