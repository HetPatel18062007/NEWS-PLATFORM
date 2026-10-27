/**
 * GNews API Integration Service
 * Endpoint: https://gnews.io/api/v4/search
 */

const BASE_URL = 'https://gnews.io/api/v4/search';

export async function fetchCompanyNews(companyQuery, apiKey, maxResults = 5) {
  if (!apiKey) {
    return {
      articles: [],
      warning: 'GNEWS_API_KEY is missing. Add it to your .env file to enable live news.'
    };
  }

  try {
    const params = new URLSearchParams({
      q: `"${companyQuery.trim()}"`,
      lang: 'en',
      max: String(maxResults),
      apikey: apiKey
    });

    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (response.status === 429) {
      console.warn('GNews daily request limit reached (100 reqs/day on free tier).');
      return {
        articles: [],
        warning: 'GNews API daily free rate limit exceeded (100 requests/day).'
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        articles: [],
        warning: 'Invalid or expired GNews API Key.'
      };
    }

    if (!response.ok) {
      return {
        articles: [],
        warning: `GNews fetch failed with status ${response.status}.`
      };
    }

    const data = await response.json();
    return {
      articles: Array.isArray(data.articles) ? data.articles : [],
      warning: null
    };
  } catch (err) {
    console.error('Error fetching company news from GNews:', err.message);
    return {
      articles: [],
      warning: 'News retrieval temporarily unavailable.'
    };
  }
}

export default {
  fetchCompanyNews
};
