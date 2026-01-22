import { NextRequest, NextResponse } from 'next/server';
import { createAIProvider } from '@/lib/ai/factory';
import { AnalyzeRequest, AnalyzeResponse, ApiError } from '@/types/api';
import { ProviderName, PROVIDER_INFO } from '@/types/analysis';
import { searchCompanyNews, searchCompanyCaseStudies, searchCompanyInfo, searchInvestorDocuments } from '@/lib/services/webSearch';
import { tavilySearchCompanyNews, tavilySearchCaseStudies, tavilySearchCompanyInfo, tavilySearchInvestorDocs, tavilySearchCompetitorMentions, tavilySearchLeadershipChanges, CompetitorMention } from '@/lib/services/tavilySearch';
import { createClient } from '@/lib/supabase/server';
import { parseLeadershipArticles } from '@/lib/ai/parseLeadershipNews';

// Type for server settings
interface ServerSettings {
  default_provider: string;
  openai_api_key: string | null;
  anthropic_api_key: string | null;
  gemini_api_key: string | null;
  perplexity_api_key: string | null;
  openai_model: string;
  anthropic_model: string;
  gemini_model: string;
  perplexity_model: string;
  web_search_provider: string;
  tavily_api_key: string | null;
  websearchapi_key: string | null;
}

// Get API key for a provider from settings
function getProviderApiKey(settings: ServerSettings, provider: ProviderName): string | null {
  switch (provider) {
    case 'openai': return settings.openai_api_key;
    case 'anthropic': return settings.anthropic_api_key;
    case 'gemini': return settings.gemini_api_key;
    case 'perplexity': return settings.perplexity_api_key;
    default: return null;
  }
}

// Get model for a provider from settings
function getProviderModel(settings: ServerSettings, provider: ProviderName): string {
  switch (provider) {
    case 'openai': return settings.openai_model || 'gpt-4o';
    case 'anthropic': return settings.anthropic_model || 'claude-sonnet-4-20250514';
    case 'gemini': return settings.gemini_model || 'gemini-2.0-flash';
    case 'perplexity': return settings.perplexity_model || 'sonar-pro';
    default: return 'gpt-4o';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const {
      companyName,
      provider: clientProvider,
      model: clientModel,
      apiKey: clientApiKey,
      webSearchApiKey: clientWebSearchApiKey,
      tavilyApiKey: clientTavilyApiKey
    } = body;

    // Validate input
    if (!companyName?.trim()) {
      return NextResponse.json<ApiError>(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Fetch server settings from Supabase
    const supabase = await createClient();
    const { data: settings } = await supabase
      .from('app_settings')
      .select('*')
      .single();

    // Type assertion for settings
    const serverSettings = settings as ServerSettings | null;

    // Determine provider - use server default if not specified by client
    const provider = clientProvider || serverSettings?.default_provider || 'openai';

    if (!['openai', 'anthropic', 'gemini', 'perplexity'].includes(provider)) {
      return NextResponse.json<ApiError>(
        { error: 'Valid provider is required (openai, anthropic, gemini, or perplexity)' },
        { status: 400 }
      );
    }

    // Get API key - prefer server settings, fall back to client-provided (for local dev)
    const apiKey = (serverSettings ? getProviderApiKey(serverSettings, provider as ProviderName) : null) || clientApiKey;

    if (!apiKey?.trim()) {
      return NextResponse.json<ApiError>(
        { error: 'API key not configured. Please contact an administrator.' },
        { status: 401 }
      );
    }

    // Get model - prefer client-specified, then server settings, then default
    const model = clientModel || (serverSettings ? getProviderModel(serverSettings, provider as ProviderName) : undefined);

    // Get web search keys - prefer server settings
    const webSearchProvider = serverSettings?.web_search_provider || 'none';
    const tavilyApiKey = serverSettings?.tavily_api_key || clientTavilyApiKey;
    const webSearchApiKey = serverSettings?.websearchapi_key || clientWebSearchApiKey;

    const providerInfo = PROVIDER_INFO[provider as ProviderName];
    const useTavily = !providerInfo.supportsWebGrounding && webSearchProvider === 'tavily' && !!tavilyApiKey;
    const useWebSearchApi = !providerInfo.supportsWebGrounding && webSearchProvider === 'websearchapi' && !!webSearchApiKey;
    const shouldUseWebSearch = useTavily || useWebSearchApi;
    let webSearchData = null;
    let webSearchError: string | null = null;
    const webSearchProviderName = useTavily ? 'Tavily' : 'WebSearchAPI';

    // If provider doesn't have native web grounding and we have a web search API key,
    // fetch real-time web data to augment the analysis
    if (shouldUseWebSearch) {
      try {
        if (useTavily) {
          // Use Tavily for web search
          const [newsResults, caseStudyResults, infoResults, investorDocsResults, competitorMentionsResults, leadershipResults] = await Promise.all([
            tavilySearchCompanyNews(companyName.trim(), tavilyApiKey!),
            tavilySearchCaseStudies(companyName.trim(), tavilyApiKey!),
            tavilySearchCompanyInfo(companyName.trim(), tavilyApiKey!),
            tavilySearchInvestorDocs(companyName.trim(), tavilyApiKey!),
            tavilySearchCompetitorMentions(companyName.trim(), tavilyApiKey!),
            tavilySearchLeadershipChanges(companyName.trim(), tavilyApiKey!)
          ]);

          webSearchData = {
            news: newsResults.map(r => ({ title: r.title, url: r.url, description: r.content })),
            caseStudies: caseStudyResults.map(r => ({ title: r.title, url: r.url, description: r.content })),
            info: { sources: infoResults.sources.map(r => ({ title: r.title, url: r.url, description: r.content })) },
            investorDocs: investorDocsResults.map(r => ({ title: r.title, url: r.url, description: r.content })),
            competitorMentions: competitorMentionsResults,
            leadershipChanges: leadershipResults.map(r => ({ title: r.title, url: r.url, description: r.content }))
          };
        } else {
          // Use WebSearchAPI for web search
          const [newsResults, caseStudyResults, infoResults, investorDocsResults] = await Promise.all([
            searchCompanyNews(companyName.trim(), webSearchApiKey!),
            searchCompanyCaseStudies(companyName.trim(), webSearchApiKey!),
            searchCompanyInfo(companyName.trim(), webSearchApiKey!),
            searchInvestorDocuments(companyName.trim(), webSearchApiKey!)
          ]);

          webSearchData = {
            news: newsResults,
            caseStudies: caseStudyResults,
            info: infoResults,
            investorDocs: investorDocsResults
          };
        }
      } catch (err) {
        // Log but don't fail - web search is an enhancement
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.warn(`${webSearchProviderName} error (non-fatal):`, errorMessage);

        // Parse the error to give a user-friendly message
        if (errorMessage.includes('Forbidden') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Invalid API Key')) {
          webSearchError = `${webSearchProviderName} key is invalid or expired`;
        } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          webSearchError = `${webSearchProviderName} rate limit exceeded`;
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
          webSearchError = `${webSearchProviderName} request timed out`;
        } else {
          webSearchError = `${webSearchProviderName} failed: ` + errorMessage.substring(0, 100);
        }
      }
    }

    // Create provider and execute analysis with optional model override
    const aiProvider = createAIProvider(provider as ProviderName, apiKey, { model });
    const analysis = await aiProvider.analyzeCompany(companyName.trim());

    // If we have web search data, merge it with the analysis results
    if (webSearchData) {
      // Replace placeholder news with real web search results
      if (webSearchData.news.length > 0) {
        analysis.techNews = webSearchData.news.map(item => ({
          title: item.title,
          url: item.url,
          summary: item.description
        }));
      }

      // Replace placeholder case studies with real web search results
      if (webSearchData.caseStudies.length > 0) {
        analysis.caseStudies = webSearchData.caseStudies.map(item => ({
          title: item.title,
          url: item.url,
          summary: item.description
        }));
      }

      // Replace placeholder investor docs with real web search results
      if (webSearchData.investorDocs.length > 0) {
        analysis.investorDocs = webSearchData.investorDocs.map(item => ({
          title: item.title,
          url: item.url,
          summary: item.description
        }));
      }

      // Replace competitor mentions with real web search results (Tavily only)
      if (webSearchData.competitorMentions && webSearchData.competitorMentions.length > 0) {
        analysis.competitorMentions = webSearchData.competitorMentions.map((item: CompetitorMention) => ({
          competitorName: item.competitorName,
          mentionType: item.mentionType,
          title: item.title,
          url: item.url,
          summary: item.summary
        }));
      }

      // Replace leadership changes with real web search results (Tavily only)
      if (webSearchData.leadershipChanges && webSearchData.leadershipChanges.length > 0) {
        // Filter out irrelevant pages first
        const filteredArticles = webSearchData.leadershipChanges
          .filter((item: { title: string; url: string; description: string }) => {
            const urlLower = item.url.toLowerCase();
            return !urlLower.includes('career') && !urlLower.includes('job') && !urlLower.includes('linkedin.com/jobs');
          })
          .map((item: { title: string; url: string; description: string }) => ({
            title: item.title,
            url: item.url,
            content: item.description || ''
          }));

        // Parse articles to extract actual names and roles
        const parsedChanges = parseLeadershipArticles(filteredArticles, companyName.trim());

        if (parsedChanges.length > 0) {
          analysis.leadershipChanges = parsedChanges;
        } else {
          // Fallback: show article titles if parsing found nothing
          analysis.leadershipChanges = filteredArticles.slice(0, 6).map((item) => {
            let source = '';
            try {
              source = new URL(item.url).hostname.replace('www.', '');
            } catch {
              source = 'Source';
            }
            return {
              name: item.title,
              role: item.content?.substring(0, 150) || '',
              changeType: 'appointed' as const,
              url: item.url,
              source
            };
          });
        }
      }

      // Add web search sources to sources list
      const webSources = [
        ...webSearchData.news.map(n => n.url),
        ...webSearchData.caseStudies.map(c => c.url),
        ...webSearchData.investorDocs.map(d => d.url),
        ...webSearchData.info.sources.map(s => s.url),
        ...(webSearchData.competitorMentions || []).map((c: CompetitorMention) => c.url)
      ].filter(Boolean);

      if (webSources.length > 0) {
        analysis.sources = [...new Set([...analysis.sources, ...webSources])];
      }
    }

    // Log web search status for debugging
    if (shouldUseWebSearch) {
      console.log(`${webSearchProviderName} status:`, webSearchData ? 'SUCCESS' : `FAILED: ${webSearchError}`);
    }

    return NextResponse.json<AnalyzeResponse>({
      data: analysis,
      cached: false,
      provider: provider as ProviderName,
      webSearchUsed: shouldUseWebSearch && webSearchData !== null,
      webSearchError: webSearchError || undefined
    });
  } catch (error) {
    console.error('Analysis error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';

    // Check for common API key errors
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('invalid_api_key')) {
      return NextResponse.json<ApiError>(
        { error: 'Invalid API key. Please check your credentials.' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return NextResponse.json<ApiError>(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json<ApiError>(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
