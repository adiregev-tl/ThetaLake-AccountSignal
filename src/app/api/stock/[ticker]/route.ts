import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from '@/types/api';

const YAHOO_CHART_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Valid ranges and their corresponding intervals
const RANGE_CONFIG: Record<string, { interval: string; label: string }> = {
  '1d': { interval: '5m', label: '1 Day' },
  '5d': { interval: '15m', label: '5 Days' },
  '1mo': { interval: '1h', label: '1 Month' },
  'ytd': { interval: '1d', label: 'Year to Date' },
  '1y': { interval: '1d', label: '1 Year' },
  '2y': { interval: '1wk', label: '2 Years' },
  '5y': { interval: '1wk', label: '5 Years' },
};

export interface StockDataWithHistory {
  ticker: string;
  companyName: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  marketState: string;
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  avgVolume: number;
  // Calculated metrics
  marketCap?: number;
  history: {
    timestamps: number[];
    prices: number[];
    range: string;
    rangeLabel: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get('range') || '1y';

  if (!ticker) {
    return NextResponse.json<ApiError>(
      { error: 'Ticker is required' },
      { status: 400 }
    );
  }

  // Validate range
  const rangeConfig = RANGE_CONFIG[range];
  if (!rangeConfig) {
    return NextResponse.json<ApiError>(
      { error: `Invalid range. Valid ranges: ${Object.keys(RANGE_CONFIG).join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    // Fetch both daily data (for current price/change) and historical data in parallel
    const [dailyResponse, historyResponse] = await Promise.all([
      fetch(
        `${YAHOO_CHART_API}/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
        { headers, next: { revalidate: 60 } }
      ),
      fetch(
        `${YAHOO_CHART_API}/${encodeURIComponent(ticker)}?interval=${rangeConfig.interval}&range=${range}`,
        { headers, next: { revalidate: 300 } }
      )
    ]);

    if (!dailyResponse.ok) {
      throw new Error('Failed to fetch stock data');
    }

    const [dailyData, historyData] = await Promise.all([
      dailyResponse.json(),
      historyResponse.ok ? historyResponse.json() : null
    ]);

    const dailyResult = dailyData.chart?.result?.[0];
    const historyResult = historyData?.chart?.result?.[0];

    if (!dailyResult) {
      return NextResponse.json<ApiError>(
        { error: 'Ticker not found' },
        { status: 404 }
      );
    }

    const meta = dailyResult.meta;

    // Get history data
    const historyIndicators = historyResult?.indicators?.quote?.[0];
    const timestamps = historyResult?.timestamp || [];
    const closePrices = historyIndicators?.close || [];

    // Filter out null values
    const validHistory: { timestamps: number[]; prices: number[] } = {
      timestamps: [],
      prices: []
    };

    for (let i = 0; i < timestamps.length; i++) {
      if (closePrices[i] !== null && closePrices[i] !== undefined) {
        validHistory.timestamps.push(timestamps[i] * 1000);
        validHistory.prices.push(closePrices[i]);
      }
    }

    // Calculate daily change
    const previousClose = meta.chartPreviousClose || meta.previousClose || 0;
    const currentPrice = meta.regularMarketPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    // Estimate market cap from available data (price * estimated shares)
    // This is a rough estimate - actual market cap requires fundamentals data
    let marketCap: number | undefined;
    if (meta.regularMarketVolume && meta.regularMarketPrice) {
      // We can't calculate market cap without shares outstanding
      // Leave as undefined - will show N/A
      marketCap = undefined;
    }

    const stockData: StockDataWithHistory = {
      ticker: meta.symbol,
      companyName: meta.longName || meta.shortName || meta.symbol,
      price: currentPrice,
      previousClose: previousClose,
      change: change,
      changePercent: changePercent,
      currency: meta.currency,
      marketState: meta.marketState,
      dayHigh: meta.regularMarketDayHigh || 0,
      dayLow: meta.regularMarketDayLow || 0,
      dayOpen: dailyResult.indicators?.quote?.[0]?.open?.[0] || meta.regularMarketPrice,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
      volume: meta.regularMarketVolume || 0,
      avgVolume: meta.averageDailyVolume10Day || 0,
      marketCap: marketCap,
      history: {
        ...validHistory,
        range: range,
        rangeLabel: rangeConfig.label
      }
    };

    return NextResponse.json(stockData);
  } catch (error) {
    console.error('Stock API error:', error);
    return NextResponse.json<ApiError>(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
