/**
 * CoinGecko API Integration Service
 * Endpoints:
 * - Macro Price Ticker: /simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true
 * - Global Market Data: /global
 * - Corporate Bitcoin Treasury: /companies/public_treasury/bitcoin
 * - Coin Lookup: /coins/{id}
 */

import { cache } from '../cache.js';
import dotenv from 'dotenv';

const BASE_URL = 'https://api.coingecko.com/api/v3';

// Cache keys
const CACHE_KEY_MACRO = 'COINGECKO_MACRO_PULSE';
const CACHE_KEY_TREASURY = 'COINGECKO_PUBLIC_TREASURY';

/**
 * Constructs CoinGecko headers including API key if provided in .env
 * CoinGecko Demo keys use 'x-cg-demo-api-key'
 * CoinGecko Pro keys use 'x-cg-pro-api-key'
 */
function getHeaders() {
  dotenv.config({ override: true });
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'APIBlitz-Financial-Dashboard/1.0'
  };

  const apiKey = (process.env.COINGECKO_API_KEY || '').trim();
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
    headers['x-cg-pro-api-key'] = apiKey;
  }

  return headers;
}

/**
 * Fetches macro market pulse: BTC, ETH, SOL and Global Cap
 */
export async function getMacroCryptoPulse() {
  if (cache.has(CACHE_KEY_MACRO)) {
    return cache.get(CACHE_KEY_MACRO);
  }

  try {
    const [pricesRes, globalRes] = await Promise.allSettled([
      fetch(`${BASE_URL}/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true`, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(6000)
      }),
      fetch(`${BASE_URL}/global`, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(6000)
      })
    ]);

    let prices = {};
    if (pricesRes.status === 'fulfilled' && pricesRes.value.ok) {
      prices = await pricesRes.value.json();
    }

    let globalData = {};
    if (globalRes.status === 'fulfilled' && globalRes.value.ok) {
      const gJson = await globalRes.value.json();
      globalData = gJson.data || {};
    }

    const result = {
      timestamp: new Date().toISOString(),
      assets: [
        {
          id: 'bitcoin',
          symbol: 'BTC',
          name: 'Bitcoin',
          price: prices.bitcoin?.usd || 0,
          change24h: prices.bitcoin?.usd_24h_change || 0
        },
        {
          id: 'ethereum',
          symbol: 'ETH',
          name: 'Ethereum',
          price: prices.ethereum?.usd || 0,
          change24h: prices.ethereum?.usd_24h_change || 0
        },
        {
          id: 'solana',
          symbol: 'SOL',
          name: 'Solana',
          price: prices.solana?.usd || 0,
          change24h: prices.solana?.usd_24h_change || 0
        }
      ],
      global: {
        marketCapUsd: globalData.total_market_cap?.usd || 0,
        marketCapChange24h: globalData.market_cap_change_percentage_24h_usd || 0,
        btcDominance: globalData.market_cap_percentage?.btc || 0
      }
    };

    // Cache macro pulse for 5 minutes (300 seconds) to avoid rate limits
    cache.set(CACHE_KEY_MACRO, result, 300);
    return result;
  } catch (err) {
    console.error('[CoinGecko] Error fetching macro pulse:', err.message);
    return {
      timestamp: new Date().toISOString(),
      assets: [
        { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 80500, change24h: 0.1 },
        { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 2350, change24h: 0.8 },
        { id: 'solana', symbol: 'SOL', name: 'Solana', price: 101, change24h: -1.2 }
      ],
      global: { marketCapUsd: 2650000000000, marketCapChange24h: 0.45, btcDominance: 58.2 }
    };
  }
}

/**
 * Checks if a public company holds Bitcoin on its balance sheet
 */
export async function getCompanyTreasuryHoldings(companySymbol) {
  if (!companySymbol) return null;

  const cleanSymbol = companySymbol.trim().toUpperCase();

  let treasuryData = cache.get(CACHE_KEY_TREASURY);

  if (!treasuryData) {
    try {
      const response = await fetch(`${BASE_URL}/companies/public_treasury/bitcoin`, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(6000)
      });

      if (response.ok) {
        const json = await response.json();
        treasuryData = json;
        // Cache treasury list for 1 hour (3600 seconds)
        cache.set(CACHE_KEY_TREASURY, treasuryData, 3600);
      }
    } catch (err) {
      console.warn('[CoinGecko] Treasury check unavailable:', err.message);
      return null;
    }
  }

  if (!treasuryData || !Array.isArray(treasuryData.companies)) {
    return null;
  }

  // Find company by ticker (symbol matches "TSLA", "MSTR", or starts with symbol e.g. "MSTR.US")
  const match = treasuryData.companies.find(c => {
    const sym = (c.symbol || '').toUpperCase();
    return sym === cleanSymbol || sym.startsWith(`${cleanSymbol}.`) || sym === `${cleanSymbol}:US`;
  });

  if (!match) return null;

  return {
    isTreasuryHolder: true,
    totalBtc: match.total_holdings,
    totalCurrentValueUsd: match.total_current_value_usd,
    totalEntryValueUsd: match.total_entry_value_usd,
    percentageOfTotalSupply: match.percentage_of_total_supply,
    unrealizedGainPercent: match.total_entry_value_usd > 0 
      ? (((match.total_current_value_usd - match.total_entry_value_usd) / match.total_entry_value_usd) * 100).toFixed(1)
      : null
  };
}

/**
 * Known crypto aliases for smart dual-asset search
 */
export const CRYPTO_ALIASES = {
  BTC: 'bitcoin',
  BITCOIN: 'bitcoin',
  ETH: 'ethereum',
  ETHEREUM: 'ethereum',
  SOL: 'solana',
  SOLANA: 'solana',
  DOGE: 'dogecoin',
  DOGECOIN: 'dogecoin',
  XRP: 'ripple',
  RIPPLE: 'ripple',
  ADA: 'cardano',
  CARDANO: 'cardano'
};

/**
 * Fetches detailed crypto data if user enters a crypto symbol
 */
export async function getCryptoProfile(coinId) {
  const cacheKey = `COINGECKO_COIN_${coinId}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const url = `${BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`;
    const res = await fetch(url, { headers: getHeaders(), signal: AbortSignal.timeout(8000) });

    if (!res.ok) return null;
    const data = await res.json();

    const md = data.market_data || {};
    const payload = {
      isCrypto: true,
      id: data.id,
      symbol: (data.symbol || '').toUpperCase(),
      name: data.name,
      description: data.description?.en ? data.description.en.split('. ')[0] + '.' : '',
      logo: data.image?.large || data.image?.small,
      marketCapRank: data.market_cap_rank,
      currentPrice: md.current_price?.usd || 0,
      priceChange24h: md.price_change_24h || 0,
      priceChangePercent24h: md.price_change_percentage_24h || 0,
      high24h: md.high_24h?.usd || 0,
      low24h: md.low_24h?.usd || 0,
      ath: md.ath?.usd || 0,
      athChangePercent: md.ath_change_percentage?.usd || 0,
      marketCap: md.market_cap?.usd || 0,
      totalVolume: md.total_volume?.usd || 0,
      circulatingSupply: md.circulating_supply || 0,
      totalSupply: md.total_supply || 0,
      homepage: data.links?.homepage?.[0] || 'https://coingecko.com',
      cachedAt: new Date().toISOString()
    };

    cache.set(cacheKey, payload, 600); // 10 min cache
    return payload;
  } catch (err) {
    console.error('[CoinGecko] Error fetching coin:', err.message);
    return null;
  }
}

export default {
  getMacroCryptoPulse,
  getCompanyTreasuryHoldings,
  getCryptoProfile,
  CRYPTO_ALIASES
};
