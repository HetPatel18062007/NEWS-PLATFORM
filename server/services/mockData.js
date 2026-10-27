export const mockCompanies = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    profile: {
      country: 'US',
      currency: 'USD',
      estimateCurrency: 'USD',
      exchange: 'NASDAQ NMS - GLOBAL MARKET',
      finnhubIndustry: 'Technology',
      ipo: '1980-12-12',
      logo: 'https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.svg',
      marketCapitalization: 3450210,
      name: 'Apple Inc',
      phone: '14089961010',
      shareOutstanding: 15300.2,
      ticker: 'AAPL',
      weburl: 'https://www.apple.com/'
    },
    quote: {
      c: 228.45,
      d: 3.15,
      dp: 1.40,
      h: 230.10,
      l: 226.30,
      o: 226.80,
      pc: 225.30,
      t: Math.floor(Date.now() / 1000)
    },
    recommendations: [
      {
        buy: 28,
        hold: 12,
        period: '2026-10-01',
        sell: 3,
        strongBuy: 15,
        strongSell: 0,
        symbol: 'AAPL'
      }
    ],
    news: [
      {
        title: 'Apple Expands On-Device AI Intelligence Architecture to Global Markets',
        description: 'Apple accelerates deployment of next-generation silicon and machine learning optimizations across its unified ecosystem.',
        url: 'https://news.google.com',
        image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=600&q=80',
        publishedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        source: { name: 'TechCrunch' }
      },
      {
        title: 'Wall Street Analysts Upgrade Tech Giant Price Targets Following Services Growth',
        description: 'Record App Store and cloud subscription earnings drive institutional momentum as quarterly outlook exceeds forecasts.',
        url: 'https://news.google.com',
        image: 'https://images.unsplash.com/photo-1591696205602-2f950c417cb9?auto=format&fit=crop&w=600&q=80',
        publishedAt: new Date(Date.now() - 3600000 * 7).toISOString(),
        source: { name: 'Bloomberg' }
      },
      {
        title: 'Supply Chain Resiliency Highlights Strategic Advantage for Fiscal Year',
        description: 'Manufacturing diversification and high-margin product cadence continue to insulate bottom-line performance.',
        url: 'https://news.google.com',
        image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
        publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        source: { name: 'Reuters' }
      }
    ]
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    profile: {
      country: 'US',
      currency: 'USD',
      exchange: 'NASDAQ NMS - GLOBAL MARKET',
      finnhubIndustry: 'Automotive',
      ipo: '2010-06-29',
      logo: 'https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/TSLA.svg',
      marketCapitalization: 792400,
      name: 'Tesla Inc',
      shareOutstanding: 3180.5,
      ticker: 'TSLA',
      weburl: 'https://www.tesla.com/'
    },
    quote: {
      c: 248.80,
      d: -4.20,
      dp: -1.66,
      h: 254.10,
      l: 246.50,
      o: 252.30,
      pc: 253.00,
      t: Math.floor(Date.now() / 1000)
    },
    recommendations: [
      {
        buy: 18,
        hold: 16,
        period: '2026-10-01',
        sell: 8,
        strongBuy: 9,
        strongSell: 4,
        symbol: 'TSLA'
      }
    ],
    news: [
      {
        title: 'Tesla Scales Autonomous Fleet Testing Across Multiple Metros',
        description: 'New full self-driving beta telemetry indicates significant reduction in disengagements per thousand highway miles.',
        url: 'https://news.google.com',
        image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=600&q=80',
        publishedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        source: { name: 'CNBC' }
      },
      {
        title: 'Energy Storage Deployments Surge 40% Year-over-Year',
        description: 'Megapack utility projects generate higher margin recurring revenues, balancing electric vehicle gross margins.',
        url: 'https://news.google.com',
        image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
        publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        source: { name: 'Electrek' }
      }
    ]
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    profile: {
      country: 'US',
      currency: 'USD',
      exchange: 'NASDAQ NMS - GLOBAL MARKET',
      finnhubIndustry: 'Semiconductors',
      ipo: '1999-01-22',
      logo: 'https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/NVDA.svg',
      marketCapitalization: 3205000,
      name: 'NVIDIA Corp',
      shareOutstanding: 24500,
      ticker: 'NVDA',
      weburl: 'https://www.nvidia.com/'
    },
    quote: {
      c: 135.20,
      d: 4.80,
      dp: 3.68,
      h: 136.50,
      l: 131.00,
      o: 131.50,
      pc: 130.40,
      t: Math.floor(Date.now() / 1000)
    },
    recommendations: [
      {
        buy: 36,
        hold: 4,
        period: '2026-10-01',
        sell: 0,
        strongBuy: 22,
        strongSell: 0,
        symbol: 'NVDA'
      }
    ],
    news: [
      {
        title: 'Hyperscalers Deepen Next-Gen Blackwell Architecture Commitments',
        description: 'Data center spending remains aggressive as enterprise AI workload transformations continue unabated.',
        url: 'https://news.google.com',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
        publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        source: { name: 'Wall Street Journal' }
      }
    ]
  }
};

export function getMockReport(query) {
  const qUpper = query.trim().toUpperCase();
  let matchedKey = Object.keys(mockCompanies).find(
    k => k === qUpper || mockCompanies[k].name.toUpperCase().includes(qUpper)
  );

  if (!matchedKey) {
    matchedKey = 'AAPL'; // default fallback for demonstration
  }

  const base = mockCompanies[matchedKey];
  return {
    ...base,
    isDemo: true,
    demoNotice: 'Running with sample dataset. Add your free Finnhub & GNews API keys to .env to fetch live live market data.'
  };
}
