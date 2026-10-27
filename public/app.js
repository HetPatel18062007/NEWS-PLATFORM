/**
 * APIBlitz — Financial Intelligence Dashboard
 * Client-Side Application Logic
 */

// Application State
const rawSaved = localStorage.getItem('apiblitz_discord_webhook') || '';
const initialWebhook = rawSaved.includes('discord.com/channels/') ? '' : rawSaved;
if (rawSaved && !initialWebhook) {
  localStorage.removeItem('apiblitz_discord_webhook');
}

const state = {
  currentReport: null,
  isLoading: false,
  hasDiscordConfigured: false,
  savedWebhook: initialWebhook
};

// DOM Element References
const elements = {
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('companySearchInput'),
  searchSubmitBtn: document.getElementById('searchSubmitBtn'),
  quickChips: document.querySelectorAll('.quick-chip'),
  
  systemStatusPill: document.getElementById('systemStatusPill'),
  statusLabel: document.getElementById('statusLabel'),
  demoNoticeBanner: document.getElementById('demoNoticeBanner'),
  demoNoticeText: document.getElementById('demoNoticeText'),

  // CoinGecko Pulse & Treasury
  cryptoPulseTrack: document.getElementById('cryptoPulseTrack'),
  cryptoTreasurySection: document.getElementById('cryptoTreasurySection'),
  treasuryHoldingsPill: document.getElementById('treasuryHoldingsPill'),
  treasuryCurrentVal: document.getElementById('treasuryCurrentVal'),
  treasuryEntryVal: document.getElementById('treasuryEntryVal'),
  treasuryGainVal: document.getElementById('treasuryGainVal'),
  treasurySupplyVal: document.getElementById('treasurySupplyVal'),

  skeletonLoader: document.getElementById('skeletonLoader'),
  resultsDashboard: document.getElementById('resultsDashboard'),
  errorState: document.getElementById('errorState'),
  errorTitle: document.getElementById('errorTitle'),
  errorMessage: document.getElementById('errorMessage'),
  errorRetryBtn: document.getElementById('errorRetryBtn'),

  // Header card elements
  companyLogo: document.getElementById('companyLogo'),
  companyName: document.getElementById('companyName'),
  stockSymbolBadge: document.getElementById('stockSymbolBadge'),
  cacheIndicator: document.getElementById('cacheIndicator'),
  companyIndustry: document.getElementById('companyIndustry'),
  companyExchange: document.getElementById('companyExchange'),
  companyCountry: document.getElementById('companyCountry'),
  companyWebsiteLink: document.getElementById('companyWebsiteLink'),
  
  // Price elements
  stockCurrentPrice: document.getElementById('stockCurrentPrice'),
  priceDeltaPill: document.getElementById('priceDeltaPill'),
  deltaIcon: document.getElementById('deltaIcon'),
  deltaAbsolute: document.getElementById('deltaAbsolute'),
  deltaPercent: document.getElementById('deltaPercent'),

  // Metrics elements
  metricMarketCap: document.getElementById('metricMarketCap'),
  metricDayRange: document.getElementById('metricDayRange'),
  metricOpen: document.getElementById('metricOpen'),
  metricPrevClose: document.getElementById('metricPrevClose'),

  // Analyst ratings elements
  totalAnalystsBadge: document.getElementById('totalAnalystsBadge'),
  chartSkeleton: document.getElementById('chartSkeleton'),
  analystChartImg: document.getElementById('analystChartImg'),
  countStrongBuy: document.getElementById('countStrongBuy'),
  countBuy: document.getElementById('countBuy'),
  countHold: document.getElementById('countHold'),
  countSell: document.getElementById('countSell'),
  countStrongSell: document.getElementById('countStrongSell'),

  // Profile properties
  propShares: document.getElementById('propShares'),
  propCurrency: document.getElementById('propCurrency'),
  propExchange: document.getElementById('propExchange'),
  propIpo: document.getElementById('propIpo'),

  // News elements
  newsStatusPill: document.getElementById('newsStatusPill'),
  newsWarningBanner: document.getElementById('newsWarningBanner'),
  newsWarningText: document.getElementById('newsWarningText'),
  newsGrid: document.getElementById('newsGrid'),
  newsEmptyState: document.getElementById('newsEmptyState'),

  // Discord Modal elements
  openDiscordModalBtn: document.getElementById('openDiscordModalBtn'),
  directDiscordPushBtn: document.getElementById('directDiscordPushBtn'),
  discordModal: document.getElementById('discordModal'),
  closeDiscordModalBtn: document.getElementById('closeDiscordModalBtn'),
  cancelDiscordBtn: document.getElementById('cancelDiscordBtn'),
  sendDiscordBtn: document.getElementById('sendDiscordBtn'),
  discordBtnText: document.getElementById('discordBtnText'),
  discordWebhookInput: document.getElementById('discordWebhookInput'),
  discordStatusMsg: document.getElementById('discordStatusMsg'),

  toastContainer: document.getElementById('toastContainer')
};

/**
 * Toast Notification Utility
 */
function showToast(message, type = 'success', duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠️'}</span>
    <span>${message}</span>
  `;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Number Formatter Utilities
 */
function formatCurrency(val, currency = 'USD') {
  if (val === undefined || val === null || isNaN(val)) return '--';
  return Number(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatLargeNumber(val) {
  if (!val || isNaN(val)) return 'N/A';
  if (val >= 1000000) {
    return `$${(val / 1000000).toFixed(2)}T`;
  }
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(2)}B`;
  }
  return `$${val.toFixed(2)}M`;
}

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * System Status Poller
 */
async function checkSystemStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return;
    const data = await res.json();

    state.hasDiscordConfigured = Boolean(data.config?.discordConfigured);
    
    const keyCount = (data.config.finnhubConfigured ? 1 : 0) + (data.config.gnewsConfigured ? 1 : 0);
    const keyLabel = keyCount === 2 ? 'Live APIs Connected' : keyCount === 1 ? 'Partial Live API' : 'Demo Dataset';
    const cacheCount = data.cacheStats?.keys || 0;

    elements.statusLabel.textContent = `${keyLabel} • ${cacheCount} Cached`;
  } catch (err) {
    elements.statusLabel.textContent = 'Server Online';
  }
}

/**
 * CoinGecko Macro Crypto Pulse Poller
 */
async function fetchCryptoPulse() {
  if (!elements.cryptoPulseTrack) return;
  try {
    const res = await fetch('/api/crypto/pulse');
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !json.data) return;

    const { assets, global } = json.data;
    let html = `<div class="pulse-item"><span class="pulse-badge">COINGECKO PULSE</span></div>`;

    if (Array.isArray(assets)) {
      assets.forEach(a => {
        const isUp = a.change24h >= 0;
        html += `
          <div class="pulse-item">
            <span class="pulse-sym">${a.symbol}</span>
            <span class="pulse-val">$${formatCurrency(a.price)}</span>
            <span class="pulse-delta ${isUp ? 'pulse-up' : 'pulse-down'}">${isUp ? '+' : ''}${a.change24h.toFixed(2)}%</span>
          </div>
          <div class="pulse-divider"></div>
        `;
      });
    }

    if (global && global.marketCapUsd) {
      const gCapFormatted = formatLargeNumber(global.marketCapUsd / 1000000);
      const isUp = (global.marketCapChange24h || 0) >= 0;
      html += `
        <div class="pulse-item">
          <span>Global Cap:</span>
          <span class="pulse-val">${gCapFormatted}</span>
          <span class="pulse-delta ${isUp ? 'pulse-up' : 'pulse-down'}">${isUp ? '+' : ''}${(global.marketCapChange24h || 0).toFixed(2)}%</span>
        </div>
        <div class="pulse-divider"></div>
        <div class="pulse-item">
          <span>BTC Dominance:</span>
          <span class="pulse-val">${(global.btcDominance || 0).toFixed(1)}%</span>
        </div>
      `;
    }

    elements.cryptoPulseTrack.innerHTML = html;
  } catch (err) {
    console.warn('Failed to load crypto pulse:', err);
  }
}

/**
 * Main Data Fetching Pipeline
 */
async function executeCompanyLookup(query) {
  if (!query || state.isLoading) return;

  state.isLoading = true;
  elements.searchSubmitBtn.disabled = true;
  elements.searchSubmitBtn.innerHTML = `<span>Searching...</span>`;

  // UI state toggling
  elements.errorState.classList.add('hidden');
  elements.resultsDashboard.classList.add('hidden');
  elements.skeletonLoader.classList.remove('hidden');

  try {
    const response = await fetch(`/api/company-report?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || `No company found for "${query}"`);
    }

    state.currentReport = data;
    renderDashboard(data);
    checkSystemStatus(); // refresh cache pill
  } catch (err) {
    renderError(err.message);
  } finally {
    state.isLoading = false;
    elements.searchSubmitBtn.disabled = false;
    elements.searchSubmitBtn.innerHTML = `
      <span>Analyze</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    `;
    elements.skeletonLoader.classList.add('hidden');
  }
}

/**
 * Render Dashboard Elements
 */
function renderDashboard(data) {
  const { symbol, name, profile, quote, analystRatings, news, newsWarning, isDemo, demoNotice, fromCache } = data;

  // 1. Demo & Cache Badges
  if (isDemo) {
    elements.demoNoticeBanner.classList.remove('hidden');
    elements.demoNoticeText.textContent = demoNotice || 'Running in Demo Mode. Connect your Finnhub and GNews keys for live stock data.';
  } else {
    elements.demoNoticeBanner.classList.add('hidden');
  }

  if (fromCache) {
    elements.cacheIndicator.classList.remove('hidden');
  } else {
    elements.cacheIndicator.classList.add('hidden');
  }

  // 2. Company Identity
  elements.companyName.textContent = name || symbol;
  elements.stockSymbolBadge.textContent = symbol;
  elements.companyIndustry.textContent = profile?.finnhubIndustry || 'General';
  elements.companyExchange.textContent = profile?.exchange || 'US Market';
  elements.companyCountry.textContent = profile?.country || 'Global';

  if (profile?.logo) {
    elements.companyLogo.src = profile.logo;
    elements.companyLogo.alt = `${name} Logo`;
  } else {
    elements.companyLogo.src = 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png';
  }

  if (profile?.weburl) {
    elements.companyWebsiteLink.href = profile.weburl;
    elements.companyWebsiteLink.classList.remove('hidden');
  } else {
    elements.companyWebsiteLink.classList.add('hidden');
  }

  // 3. Stock Price & Intraday Delta
  const price = quote?.c ?? 0;
  const change = quote?.d ?? 0;
  const percentChange = quote?.dp ?? 0;
  const isPositive = percentChange >= 0;

  elements.stockCurrentPrice.textContent = formatCurrency(price);
  elements.deltaAbsolute.textContent = `${isPositive ? '+' : ''}${change.toFixed(2)}`;
  elements.deltaPercent.textContent = `${isPositive ? '+' : ''}${percentChange.toFixed(2)}%`;
  elements.deltaIcon.textContent = isPositive ? '▲' : '▼';

  elements.priceDeltaPill.className = `delta-pill ${isPositive ? 'delta-positive' : 'delta-negative'}`;

  // 4. Fundamental Financial Metrics
  elements.metricMarketCap.textContent = formatLargeNumber(profile?.marketCapitalization);
  elements.metricDayRange.textContent = `$${formatCurrency(quote?.l)} - $${formatCurrency(quote?.h)}`;
  elements.metricOpen.textContent = `$${formatCurrency(quote?.o)}`;
  elements.metricPrevClose.textContent = `$${formatCurrency(quote?.pc)}`;

  // Profile properties
  elements.propShares.textContent = profile?.shareOutstanding ? `${Number(profile.shareOutstanding).toLocaleString()}M` : 'N/A';
  elements.propCurrency.textContent = profile?.currency || 'USD';
  elements.propExchange.textContent = profile?.exchange || 'N/A';
  elements.propIpo.textContent = profile?.ipo || 'N/A';

  // 4b. Corporate Crypto Treasury Holdings (CoinGecko)
  if (data.cryptoTreasury && data.cryptoTreasury.isTreasuryHolder) {
    elements.cryptoTreasurySection.classList.remove('hidden');
    elements.treasuryHoldingsPill.textContent = `${Number(data.cryptoTreasury.totalBtc).toLocaleString()} BTC Held`;
    elements.treasuryCurrentVal.textContent = `$${formatCurrency(data.cryptoTreasury.totalCurrentValueUsd)}`;
    elements.treasuryEntryVal.textContent = data.cryptoTreasury.totalEntryValueUsd ? `$${formatCurrency(data.cryptoTreasury.totalEntryValueUsd)}` : 'N/A';

    if (data.cryptoTreasury.unrealizedGainPercent) {
      elements.treasuryGainVal.textContent = `${Number(data.cryptoTreasury.unrealizedGainPercent) >= 0 ? '+' : ''}${data.cryptoTreasury.unrealizedGainPercent}%`;
      elements.treasuryGainVal.className = `t-val ${Number(data.cryptoTreasury.unrealizedGainPercent) >= 0 ? 't-gain' : 't-loss'}`;
    } else {
      elements.treasuryGainVal.textContent = 'N/A';
    }

    elements.treasurySupplyVal.textContent = `${data.cryptoTreasury.percentageOfTotalSupply}%`;
  } else {
    elements.cryptoTreasurySection.classList.add('hidden');
  }

  // 5. Analyst Recommendations & QuickChart
  renderAnalystRecommendations(analystRatings);

  // 6. News Coverage
  renderNews(news, newsWarning);

  // Show the assembled dashboard
  elements.resultsDashboard.classList.remove('hidden');
  elements.resultsDashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Render Analyst Consensus & QuickChart Image
 */
function renderAnalystRecommendations(ratings) {
  const latest = ratings?.latest;

  if (!latest) {
    elements.totalAnalystsBadge.textContent = 'No Ratings';
    elements.chartSkeleton.textContent = 'Analyst recommendation data not available for this ticker.';
    elements.analystChartImg.classList.add('hidden');
    elements.countStrongBuy.textContent = '0';
    elements.countBuy.textContent = '0';
    elements.countHold.textContent = '0';
    elements.countSell.textContent = '0';
    elements.countStrongSell.textContent = '0';
    return;
  }

  const { strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0 } = latest;
  const total = strongBuy + buy + hold + sell + strongSell;

  elements.totalAnalystsBadge.textContent = `${total} Wall Street Analysts`;
  elements.countStrongBuy.textContent = strongBuy;
  elements.countBuy.textContent = buy;
  elements.countHold.textContent = hold;
  elements.countSell.textContent = sell;
  elements.countStrongSell.textContent = strongSell;

  if (ratings.chartUrl) {
    elements.chartSkeleton.classList.remove('hidden');
    elements.analystChartImg.classList.add('hidden');

    elements.analystChartImg.onload = () => {
      elements.chartSkeleton.classList.add('hidden');
      elements.analystChartImg.classList.remove('hidden');
    };

    elements.analystChartImg.onerror = () => {
      elements.chartSkeleton.textContent = 'Chart preview rendered via QuickChart';
    };

    elements.analystChartImg.src = ratings.chartUrl;
  }
}

/**
 * Render News Grid (GNews API)
 */
function renderNews(articles, warning) {
  elements.newsGrid.innerHTML = '';

  if (warning) {
    elements.newsWarningBanner.classList.remove('hidden');
    elements.newsWarningText.textContent = warning;
  } else {
    elements.newsWarningBanner.classList.add('hidden');
  }

  if (!Array.isArray(articles) || articles.length === 0) {
    elements.newsStatusPill.textContent = '0 Articles';
    elements.newsEmptyState.classList.remove('hidden');
    return;
  }

  elements.newsEmptyState.classList.add('hidden');
  elements.newsStatusPill.textContent = `${articles.length} Recent Articles`;

  articles.forEach(article => {
    const card = document.createElement('article');
    card.className = 'news-card';

    const sourceName = article.source?.name || 'Financial News';
    const fallbackImage = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80';
    const thumbUrl = article.image || fallbackImage;

    card.innerHTML = `
      <div class="news-thumb-wrapper">
        <img src="${thumbUrl}" alt="${article.title}" class="news-thumb" loading="lazy" onerror="this.src='${fallbackImage}'">
        <span class="news-source-tag">${sourceName}</span>
      </div>
      <div class="news-content">
        <div class="news-date">${timeAgo(article.publishedAt)}</div>
        <h4 class="news-title">${article.title}</h4>
        <p class="news-desc">${article.description || 'Click below to read full article coverage.'}</p>
        <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-link">
          Read Story ↗
        </a>
      </div>
    `;

    elements.newsGrid.appendChild(card);
  });
}

/**
 * Render Error State
 */
function renderError(message) {
  elements.errorState.classList.remove('hidden');
  elements.errorMessage.textContent = message || 'Unable to locate financial profile for this query.';
}

/**
 * Discord Export Webhook Modal Actions
 */
function openDiscordModal() {
  if (!state.currentReport) {
    showToast('Please search for a company first before exporting to Discord.', 'error');
    return;
  }

  // Clear any channel links from input
  if (state.savedWebhook && state.savedWebhook.includes('discord.com/channels/')) {
    state.savedWebhook = '';
    localStorage.removeItem('apiblitz_discord_webhook');
  }

  elements.discordWebhookInput.value = state.savedWebhook;
  elements.discordStatusMsg.className = 'alert-box hidden';
  elements.discordStatusMsg.textContent = '';

  if (state.hasDiscordConfigured) {
    elements.discordWebhookInput.placeholder = 'Using DISCORD_WEBHOOK_URL from .env (or paste a custom webhook)';
  } else {
    elements.discordWebhookInput.placeholder = 'https://discord.com/api/webhooks/...';
  }

  elements.discordModal.classList.remove('hidden');
}

function closeDiscordModal() {
  elements.discordModal.classList.add('hidden');
}

async function handleDiscordExport() {
  let webhookUrl = elements.discordWebhookInput.value.trim();

  // If user pasted a channel link (e.g. https://discord.com/channels/...)
  if (webhookUrl.includes('discord.com/channels/')) {
    if (state.hasDiscordConfigured) {
      // Gracefully fall back to .env webhook
      webhookUrl = '';
      elements.discordWebhookInput.value = '';
      showToast('Detected Discord channel page link. Using valid webhook from .env instead!', 'success');
    } else {
      elements.discordStatusMsg.className = 'alert-box alert-error';
      elements.discordStatusMsg.textContent = '⚠️ That is a Discord Channel page link (discord.com/channels/...), NOT a Webhook URL! In Discord, go to: Channel Settings ➔ Integrations ➔ Webhooks ➔ Copy Webhook URL (starts with https://discord.com/api/webhooks/...).';
      elements.discordStatusMsg.classList.remove('hidden');
      return;
    }
  }

  if (!webhookUrl && !state.hasDiscordConfigured) {
    elements.discordStatusMsg.className = 'alert-box alert-error';
    elements.discordStatusMsg.textContent = 'Please enter a valid Discord Webhook URL (starts with https://discord.com/api/webhooks/...).';
    elements.discordStatusMsg.classList.remove('hidden');
    return;
  }

  if (webhookUrl && !webhookUrl.includes('discord.com/api/webhooks/')) {
    elements.discordStatusMsg.className = 'alert-box alert-error';
    elements.discordStatusMsg.textContent = 'Invalid format. A Discord Webhook URL must start with: https://discord.com/api/webhooks/...';
    elements.discordStatusMsg.classList.remove('hidden');
    return;
  }

  // Only persist valid webhook URLs
  if (webhookUrl && webhookUrl.includes('api/webhooks/')) {
    localStorage.setItem('apiblitz_discord_webhook', webhookUrl);
    state.savedWebhook = webhookUrl;
  }

  elements.sendDiscordBtn.disabled = true;
  elements.discordBtnText.textContent = 'Posting to Discord...';
  elements.discordStatusMsg.classList.add('hidden');

  try {
    const res = await fetch('/api/export/discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report: state.currentReport,
        webhookUrl: webhookUrl
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to dispatch report to Discord Webhook.');
    }

    elements.discordStatusMsg.className = 'alert-box alert-success';
    elements.discordStatusMsg.textContent = '✓ Summary report and chart successfully sent to your Discord channel!';
    elements.discordStatusMsg.classList.remove('hidden');

    showToast(`Summary for ${state.currentReport.symbol} posted to Discord!`, 'success');

    setTimeout(() => {
      closeDiscordModal();
    }, 1800);
  } catch (err) {
    elements.discordStatusMsg.className = 'alert-box alert-error';
    elements.discordStatusMsg.textContent = err.message;
    elements.discordStatusMsg.classList.remove('hidden');
    showToast(err.message, 'error');
  } finally {
    elements.sendDiscordBtn.disabled = false;
    elements.discordBtnText.textContent = 'Send Webhook Now';
  }
}

/**
 * Event Listeners Initialization
 */
function initEventListeners() {
  // Search Form Submit
  elements.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = elements.searchInput.value.trim();
    if (query) {
      executeCompanyLookup(query);
    }
  });

  // Quick Trending Picks
  elements.quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const symbol = chip.getAttribute('data-symbol');
      elements.searchInput.value = symbol;
      executeCompanyLookup(symbol);
    });
  });

  // Retry Button
  elements.errorRetryBtn.addEventListener('click', () => {
    elements.errorState.classList.add('hidden');
    elements.searchInput.focus();
  });

  // Discord Modal Triggers
  elements.openDiscordModalBtn.addEventListener('click', openDiscordModal);
  elements.directDiscordPushBtn.addEventListener('click', openDiscordModal);
  elements.closeDiscordModalBtn.addEventListener('click', closeDiscordModal);
  elements.cancelDiscordBtn.addEventListener('click', closeDiscordModal);
  elements.sendDiscordBtn.addEventListener('click', handleDiscordExport);

  // Close modal when clicking outside
  elements.discordModal.addEventListener('click', (e) => {
    if (e.target === elements.discordModal) {
      closeDiscordModal();
    }
  });
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  checkSystemStatus();
  fetchCryptoPulse();
  // Poll crypto pulse every 60s
  setInterval(fetchCryptoPulse, 60000);
  // Automatically load initial high-profile ticker
  executeCompanyLookup('Tesla');
});
