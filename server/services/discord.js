/**
 * Discord Webhook Alerting & Export Service
 * Formats structured stock reports into high-fidelity Discord embed messages.
 */

export async function sendDiscordSummary(webhookUrl, report) {
  if (!webhookUrl) {
    throw new Error('Discord Webhook URL is required.');
  }

  const { symbol, name, profile, quote, analystRatings, news } = report;
  const isPositive = (quote?.dp ?? 0) >= 0;
  const embedColor = isPositive ? 0x10B981 : 0xEF4444; // Green vs Red

  // Format market cap
  let marketCapStr = 'N/A';
  if (profile?.marketCapitalization) {
    marketCapStr = `$${(profile.marketCapitalization / 1000).toFixed(2)}B USD`;
  }

  // Top news bullet points
  let newsDescription = '';
  if (Array.isArray(news) && news.length > 0) {
    const topArticles = news.slice(0, 3);
    newsDescription = '\n\n**Recent News Headlines:**\n' + 
      topArticles.map(a => `• [${a.title.slice(0, 85)}${a.title.length > 85 ? '...' : ''}](${a.url}) - *${a.source?.name || 'Source'}*`).join('\n');
  }

  // Build the embed object
  const embed = {
    title: `📈 Market Summary: ${name || symbol} (${symbol})`,
    url: profile?.weburl || `https://finance.yahoo.com/quote/${symbol}`,
    description: `${profile?.finnhubIndustry ? `**Industry:** ${profile.finnhubIndustry} | ` : ''}**Exchange:** ${profile?.exchange || 'US Market'}${newsDescription}`,
    color: embedColor,
    fields: [
      {
        name: '💵 Current Price',
        value: quote?.c ? `**$${quote.c.toFixed(2)}** (${isPositive ? '+' : ''}${quote.dp?.toFixed(2)}%)` : 'N/A',
        inline: true
      },
      {
        name: '📊 Day Range',
        value: (quote?.l && quote?.h) ? `$${quote.l.toFixed(2)} - $${quote.h.toFixed(2)}` : 'N/A',
        inline: true
      },
      {
        name: '🏦 Market Cap',
        value: marketCapStr,
        inline: true
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'APIBlitz Financial Intelligence Dashboard',
      icon_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135706.png'
    }
  };

  // Add logo thumbnail if available
  if (profile?.logo) {
    embed.thumbnail = { url: profile.logo };
  }

  // Add analyst consensus ratings
  if (analystRatings?.latest) {
    const r = analystRatings.latest;
    embed.fields.push({
      name: '🎯 Analyst Recommendations',
      value: `🟢 Buy: **${(r.strongBuy || 0) + (r.buy || 0)}** | 🟡 Hold: **${r.hold || 0}** | 🔴 Sell: **${(r.sell || 0) + (r.strongSell || 0)}**`,
      inline: false
    });
  }

  // Add QuickChart static chart as embed image
  if (analystRatings?.chartUrl) {
    embed.image = { url: analystRatings.chartUrl };
  }

  const payload = {
    username: 'APIBlitz Market Bot',
    avatar_url: 'https://cdn-icons-png.flaticon.com/512/2920/2920349.png',
    embeds: [embed]
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Discord Webhook responded with status ${response.status}: ${errorBody}`);
  }

  return { success: true };
}

export default {
  sendDiscordSummary
};
