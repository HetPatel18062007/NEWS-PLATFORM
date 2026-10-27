/**
 * QuickChart API Service
 * Generates static chart images representing analyst recommendation trends.
 */

export function generateAnalystChartUrl(recommendation) {
  if (!recommendation) {
    return null;
  }

  const { strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0 } = recommendation;
  const total = strongBuy + buy + hold + sell + strongSell;

  if (total === 0) {
    return null;
  }

  // Chart.js configuration optimized for QuickChart renderer
  const chartConfig = {
    type: 'doughnut',
    data: {
      labels: ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'],
      datasets: [
        {
          data: [strongBuy, buy, hold, sell, strongSell],
          backgroundColor: [
            '#059669', // Strong Buy - Emerald
            '#10B981', // Buy - Mint Green
            '#F59E0B', // Hold - Amber
            '#EF4444', // Sell - Coral Red
            '#991B1B'  // Strong Sell - Dark Crimson
          ],
          borderColor: '#18181B', // Dark border matching background
          borderWidth: 3,
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      cutoutPercentage: 65,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            fontColor: '#E4E4E7',
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            boxWidth: 14,
            padding: 12
          }
        },
        title: {
          display: true,
          text: `Consensus: ${total} Analysts`,
          fontColor: '#A1A1AA',
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          padding: 8
        }
      }
    }
  };

  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encodedConfig}&bkg=%2318181B&w=480&h=260&devicePixelRatio=2`;
}

export default {
  generateAnalystChartUrl
};
