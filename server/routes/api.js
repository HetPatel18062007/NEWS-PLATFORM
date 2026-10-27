import express from 'express';
import dotenv from 'dotenv';
import { cache } from '../cache.js';
import { resolveSymbol, getCompanyProfile, getStockQuote, getAnalystRecommendations } from '../services/finnhub.js';
import { fetchCompanyNews } from '../services/gnews.js';
import { generateAnalystChartUrl } from '../services/quickchart.js';
import { sendDiscordSummary } from '../services/discord.js';
import { getMockReport } from '../services/mockData.js';
import { 
  getMacroCryptoPulse, 
  getCompanyTreasuryHoldings, 
  getCryptoProfile, 
  CRYPTO_ALIASES 
} from '../services/coingecko.js';

const router = express.Router();

/**
 * GET /api/crypto/pulse
 * Macro digital asset pulse powered by CoinGecko (BTC, ETH, SOL, Global Cap)
 */
router.get('/crypto/pulse', async (req, res) => {
  try {
    const pulse = await getMacroCryptoPulse();
    res.json({
      success: true,
      data: pulse
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/company-report?q={query}
 * Core unified data aggregation pipeline with 15-30 min caching,
 * CoinGecko Corporate Treasury integration, and direct crypto mode.
 */
router.get('/company-report', async (req, res) => {
  // Re-read .env to catch any new keys added without needing a server restart
  dotenv.config({ override: true });

  const query = (req.query.q || '').trim();

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'BAD_REQUEST',
      message: 'Query parameter "q" is required (e.g. ?q=Apple, ?q=TSLA, or ?q=BTC)'
    });
  }

  const cleanUpper = query.toUpperCase();
  const cacheKey = `REPORT_${cleanUpper}`;

  // 1. Cache Check
  if (cache.has(cacheKey)) {
    const cachedData = cache.get(cacheKey);
    return res.json({
      ...cachedData,
      fromCache: true
    });
  }

  const finnhubKey = process.env.FINNHUB_API_KEY;
  const gnewsKey = process.env.GNEWS_API_KEY;

  // 2. CoinGecko Direct Crypto Search Detection
  const coinId = CRYPTO_ALIASES[cleanUpper];
  if (coinId) {
    console.log(`[Dashboard] Crypto asset detected: "${query}" -> CoinGecko ID: ${coinId}`);
    try {
      const [cryptoData, newsData] = await Promise.allSettled([
        getCryptoProfile(coinId),
        fetchCompanyNews(coinId, gnewsKey, 6)
      ]);

      const coin = cryptoData.status === 'fulfilled' ? cryptoData.value : null;
      const news = newsData.status === 'fulfilled' ? newsData.value : { articles: [] };

      if (coin) {
        // QuickChart visualization for 24h vs ATH comparison
        const chartConfig = {
          type: 'bar',
          data: {
            labels: ['24h Low', 'Current', '24h High', 'ATH'],
            datasets: [{
              label: 'USD Price',
              data: [coin.low24h, coin.currentPrice, coin.high24h, coin.ath],
              backgroundColor: ['#F59E0B', '#10B981', '#38BDF8', '#6366F1'],
              borderRadius: 6
            }]
          },
          options: {
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: `${coin.name} ($${coin.symbol}) Price Range Benchmark`,
                fontColor: '#E2E8F0'
              }
            },
            scales: {
              yAxes: [{ ticks: { fontColor: '#94A3B8' }, gridLines: { color: 'rgba(255,255,255,0.05)' } }],
              xAxes: [{ ticks: { fontColor: '#E2E8F0' } }]
            }
          }
        };

        const encoded = encodeURIComponent(JSON.stringify(chartConfig));
        const chartUrl = `https://quickchart.io/chart?c=${encoded}&bkg=%2318181B&w=480&h=260&devicePixelRatio=2`;

        const cryptoPayload = {
          success: true,
          isCrypto: true,
          symbol: coin.symbol,
          name: coin.name,
          profile: {
            name: coin.name,
            ticker: coin.symbol,
            currency: 'USD',
            exchange: 'Global Crypto Network',
            finnhubIndustry: 'Decentralized Digital Asset',
            country: 'Global',
            weburl: coin.homepage,
            logo: coin.logo,
            marketCapitalization: coin.marketCap / 1000000,
            shareOutstanding: coin.circulatingSupply / 1000000
          },
          quote: {
            c: coin.currentPrice,
            d: coin.priceChange24h,
            dp: coin.priceChangePercent24h,
            h: coin.high24h,
            l: coin.low24h,
            o: coin.currentPrice - coin.priceChange24h,
            pc: coin.currentPrice - coin.priceChange24h
          },
          analystRatings: {
            latest: null,
            chartUrl: chartUrl,
            cryptoMetrics: {
              rank: coin.marketCapRank,
              ath: coin.ath,
              athChangePercent: coin.athChangePercent,
              volume24h: coin.totalVolume
            }
          },
          news: news.articles || [],
          newsWarning: news.warning || null,
          cachedAt: new Date().toISOString(),
          fromCache: false
        };

        cache.set(cacheKey, cryptoPayload, 300); // 5 min crypto cache
        return res.json(cryptoPayload);
      }
    } catch (cErr) {
      console.error('[Dashboard] Error in crypto route:', cErr);
    }
  }

  // 3. Demo fallback if API key is not configured yet
  if (!finnhubKey) {
    console.log(`[Dashboard] FINNHUB_API_KEY not found. Serving high-fidelity demo data for: "${query}"`);
    const mockData = getMockReport(query);
    const chartUrl = generateAnalystChartUrl(mockData.recommendations[0]);
    const treasury = await getCompanyTreasuryHoldings(mockData.symbol);

    const payload = {
      success: true,
      symbol: mockData.symbol,
      name: mockData.name,
      profile: mockData.profile,
      quote: mockData.quote,
      analystRatings: {
        latest: mockData.recommendations[0],
        chartUrl: chartUrl,
        history: mockData.recommendations
      },
      cryptoTreasury: treasury,
      news: mockData.news,
      newsWarning: null,
      isDemo: true,
      demoNotice: mockData.demoNotice,
      cachedAt: new Date().toISOString(),
      fromCache: false
    };

    cache.set(cacheKey, payload, 300);
    return res.json(payload);
  }

  try {
    // 4. Step 1: Symbol Resolution via Finnhub
    const resolved = await resolveSymbol(query, finnhubKey);

    if (!resolved || !resolved.symbol) {
      return res.status(404).json({
        success: false,
        error: 'SYMBOL_NOT_FOUND',
        message: `No active stock ticker found matching "${query}". Please check the spelling or ticker.`
      });
    }

    const { symbol, description } = resolved;
    const companyDisplayName = description || symbol;

    // 5. Step 2: Parallel Fetching (Finnhub + GNews + CoinGecko Treasury)
    const [profileRes, quoteRes, recRes, newsRes, treasuryRes] = await Promise.allSettled([
      getCompanyProfile(symbol, finnhubKey),
      getStockQuote(symbol, finnhubKey),
      getAnalystRecommendations(symbol, finnhubKey),
      fetchCompanyNews(companyDisplayName, gnewsKey, 6),
      getCompanyTreasuryHoldings(symbol)
    ]);

    const profile = profileRes.status === 'fulfilled' ? profileRes.value : {};
    const quote = quoteRes.status === 'fulfilled' ? quoteRes.value : null;
    const recommendations = recRes.status === 'fulfilled' && Array.isArray(recRes.value) ? recRes.value : [];
    const newsData = newsRes.status === 'fulfilled' ? newsRes.value : { articles: [], warning: 'Failed to retrieve news.' };
    const treasuryData = treasuryRes.status === 'fulfilled' ? treasuryRes.value : null;

    // 6. Step 3: QuickChart synthesis
    const latestRec = recommendations.length > 0 ? recommendations[0] : null;
    const chartUrl = generateAnalystChartUrl(latestRec);

    // 7. Step 4: Consolidated Response Structure
    const finalReport = {
      success: true,
      symbol: symbol,
      name: profile.name || companyDisplayName,
      profile: {
        ...profile,
        currency: profile.currency || 'USD',
        exchange: profile.exchange || 'US Exchange',
        finnhubIndustry: profile.finnhubIndustry || 'Diversified'
      },
      quote: quote || { c: 0, d: 0, dp: 0, h: 0, l: 0, o: 0, pc: 0 },
      analystRatings: {
        latest: latestRec,
        chartUrl: chartUrl,
        history: recommendations
      },
      cryptoTreasury: treasuryData, // CoinGecko Treasury Holdings
      news: newsData.articles || [],
      newsWarning: newsData.warning || null,
      isDemo: false,
      cachedAt: new Date().toISOString(),
      fromCache: false
    };

    // 8. Store in Cache (15 - 30 minutes TTL)
    cache.set(cacheKey, finalReport);
    cache.set(`REPORT_${symbol.toUpperCase()}`, finalReport);

    return res.json(finalReport);
  } catch (error) {
    console.error('[Dashboard Pipeline Error]:', error);

    // If Finnhub rate limited or 401 error, fallback to demo data with notice
    if (error.status === 429 || error.status === 401) {
      console.warn('API error encountered. Falling back to demo data for user experience.');
      const mockData = getMockReport(query);
      const chartUrl = generateAnalystChartUrl(mockData.recommendations[0]);
      const treasury = await getCompanyTreasuryHoldings(mockData.symbol);

      return res.json({
        success: true,
        symbol: mockData.symbol,
        name: mockData.name,
        profile: mockData.profile,
        quote: mockData.quote,
        analystRatings: {
          latest: mockData.recommendations[0],
          chartUrl: chartUrl,
          history: mockData.recommendations
        },
        cryptoTreasury: treasury,
        news: mockData.news,
        newsWarning: `External API notice: ${error.message}`,
        isDemo: true,
        demoNotice: `External API ${error.status === 429 ? 'Rate Limit Reached' : 'Authentication Error'}. Showing cached sample report.`,
        cachedAt: new Date().toISOString(),
        fromCache: false
      });
    }

    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'An unexpected error occurred while aggregating financial data.'
    });
  }
});

/**
 * POST /api/export/discord
 * Dispatches financial summary embed to Discord Webhook
 */
router.post('/export/discord', async (req, res) => {
  dotenv.config({ override: true });
  const { report, webhookUrl } = req.body;

  if (!report || !report.symbol) {
    return res.status(400).json({
      success: false,
      error: 'BAD_REQUEST',
      message: 'Valid company report payload is required to export to Discord.'
    });
  }

  let inputUrl = (webhookUrl || '').trim();
  const envUrl = (process.env.DISCORD_WEBHOOK_URL || '').trim();

  // If user passed a channel URL (https://discord.com/channels/...) instead of a webhook, check if .env has a real webhook
  let targetUrl = inputUrl;
  if (inputUrl.includes('discord.com/channels/')) {
    if (envUrl && envUrl.includes('api/webhooks')) {
      console.log('[Discord] User provided channel URL in UI. Falling back to valid DISCORD_WEBHOOK_URL from .env');
      targetUrl = envUrl;
    } else {
      return res.status(400).json({
        success: false,
        error: 'INVALID_WEBHOOK_FORMAT',
        message: 'The URL entered is a Discord Channel link (discord.com/channels/...), NOT an API Webhook URL. Please create a Webhook in Channel Settings ➔ Integrations ➔ Webhooks ➔ Copy Webhook URL (starts with https://discord.com/api/webhooks/).'
      });
    }
  } else if (!targetUrl && envUrl) {
    targetUrl = envUrl;
  }

  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_WEBHOOK',
      message: 'No Discord Webhook URL provided. Please enter one in the export dialog or set DISCORD_WEBHOOK_URL in .env'
    });
  }

  if (!targetUrl.includes('discord.com/api/webhooks/')) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_WEBHOOK_URL',
      message: 'Invalid Discord Webhook format. A Discord Webhook URL must start with: https://discord.com/api/webhooks/'
    });
  }

  try {
    await sendDiscordSummary(targetUrl, report);
    return res.json({
      success: true,
      message: `Report for ${report.name || report.symbol} was successfully posted to Discord!`
    });
  } catch (err) {
    console.error('Discord export error:', err);
    return res.status(502).json({
      success: false,
      error: 'DISCORD_ERROR',
      message: err.message || 'Failed to dispatch embed to Discord Webhook.'
    });
  }
});

/**
 * GET /api/status
 * Health check & environmental capabilities inspection
 */
router.get('/status', (req, res) => {
  dotenv.config({ override: true });
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    config: {
      finnhubConfigured: Boolean(process.env.FINNHUB_API_KEY),
      gnewsConfigured: Boolean(process.env.GNEWS_API_KEY),
      coingeckoConfigured: Boolean(process.env.COINGECKO_API_KEY),
      discordConfigured: Boolean(process.env.DISCORD_WEBHOOK_URL),
      cacheTTLSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '1200', 10)
    },
    cacheStats: cache.getStats()
  });
});

export default router;
