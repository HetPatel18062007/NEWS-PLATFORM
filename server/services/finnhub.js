/**
 * Finnhub API Integration Service
 * Endpoints:
 * - Symbol Lookup: /search?q={query}
 * - Company Profile: /stock/profile2?symbol={symbol}
 * - Current Quote: /quote?symbol={symbol}
 * - Recommendation Trends: /stock/recommendation?symbol={symbol}
 */

const BASE_URL = 'https://finnhub.io/api/v1';

async function fetchFinnhub(endpoint, apiKey, params = {}) {
  if (!apiKey) {
    const error = new Error('MISSING_API_KEY');
    error.status = 401;
    throw error;
  }

  const queryParams = new URLSearchParams({
    token: apiKey,
    ...params
  });

  const url = `${BASE_URL}${endpoint}?${queryParams.toString()}`;

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000)
  });

  if (response.status === 429) {
    const error = new Error('Finnhub API rate limit reached (60 calls/min on free tier).');
    error.status = 429;
    throw error;
  }

  if (response.status === 401 || response.status === 403) {
    const error = new Error('Invalid or restricted Finnhub API Key.');
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`Finnhub error: ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Resolves a text search query into the best matching stock ticker
 */
export async function resolveSymbol(query, apiKey) {
  const cleanQuery = query.trim();
  const data = await fetchFinnhub('/search', apiKey, { q: cleanQuery });

  if (!data || !data.result || data.result.length === 0) {
    return null;
  }

  const qUpper = cleanQuery.toUpperCase();

  // 1. Exact symbol match
  const exactSymbol = data.result.find(item => item.symbol?.toUpperCase() === qUpper);
  if (exactSymbol) {
    return {
      symbol: exactSymbol.symbol,
      displaySymbol: exactSymbol.displaySymbol || exactSymbol.symbol,
      description: exactSymbol.description,
      type: exactSymbol.type
    };
  }

  // 2. Exact display symbol match
  const exactDisplay = data.result.find(item => item.displaySymbol?.toUpperCase() === qUpper);
  if (exactDisplay) {
    return {
      symbol: exactDisplay.symbol,
      displaySymbol: exactDisplay.displaySymbol,
      description: exactDisplay.description,
      type: exactDisplay.type
    };
  }

  // 3. Match 'Common Stock' first if possible
  const commonStock = data.result.find(item => 
    item.type && item.type.toLowerCase().includes('common') && !item.symbol.includes('.')
  );
  if (commonStock) {
    return {
      symbol: commonStock.symbol,
      displaySymbol: commonStock.displaySymbol || commonStock.symbol,
      description: commonStock.description,
      type: commonStock.type
    };
  }

  // 4. Default to first clean item
  const firstMatch = data.result[0];
  return {
    symbol: firstMatch.symbol,
    displaySymbol: firstMatch.displaySymbol || firstMatch.symbol,
    description: firstMatch.description,
    type: firstMatch.type
  };
}

/**
 * Fetches company profile 2
 */
export async function getCompanyProfile(symbol, apiKey) {
  return fetchFinnhub('/stock/profile2', apiKey, { symbol });
}

/**
 * Fetches real-time price quote
 */
export async function getStockQuote(symbol, apiKey) {
  return fetchFinnhub('/quote', apiKey, { symbol });
}

/**
 * Fetches analyst recommendation trends
 */
export async function getAnalystRecommendations(symbol, apiKey) {
  return fetchFinnhub('/stock/recommendation', apiKey, { symbol });
}

export default {
  resolveSymbol,
  getCompanyProfile,
  getStockQuote,
  getAnalystRecommendations
};
