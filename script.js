const simulateBtn = document.getElementById('simulateBtn');
const resultsDiv = document.getElementById('results');
const ctx = document.getElementById('stockChart').getContext('2d');
let myChart;

simulateBtn.addEventListener('click', async () => {
    const stockSymbol = document.getElementById('stockSymbol').value;
    const investmentAmount = parseFloat(document.getElementById('investmentAmount').value);
    
    if (!stockSymbol || isNaN(investmentAmount)) {
        alert('Please enter a valid stock symbol and investment amount.');
        return;
    }

    // Fetch current price
    const currentPriceResponse = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=API_KEY`);
    const currentPriceData = await currentPriceResponse.json();
    const currentPrice = parseFloat(currentPriceData["Global Quote"]["05. price"]);

    if (!currentPrice) {
        alert('Could not retrieve data for the given stock symbol.');
        return;
    }

    const sharesPurchased = investmentAmount / currentPrice;

    // Fetch historical data (last 30 days)
    const historicalResponse = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stockSymbol}&apikey=API_KEY`);
    const historicalData = await historicalResponse.json();

    const timeSeries = historicalData["Time Series (Daily)"];
    const prices = [];
    const labels = [];

    // Prepare data for chart
    for (let date in timeSeries) {
        labels.push(date);
        prices.push(parseFloat(timeSeries[date]["4. close"]));
        if (labels.length === 30) break; // Get last 30 days
    }

    // Create or update chart
    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.reverse(),
            datasets: [{
                label: 'Stock Price',
                data: prices.reverse(),
                borderColor: '#06d6a0',
                borderWidth: 2,
                fill: false,
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: '#e0e0e0'
                    },
                    ticks: {
                        color: '#333'
                    }
                },
                x: {
                    grid: {
                        color: '#e0e0e0'
                    },
                    ticks: {
                        color: '#333'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#333'
                    }
                }
            }
        }
    });

    // Calculate past investment
    const pastInvestmentValue = sharesPurchased * prices[prices.length - 1];
    const profitLoss = pastInvestmentValue - investmentAmount;

    // Show results
    resultsDiv.classList.add('fade-in');
    resultsDiv.innerHTML = `
        <p>Current Price: $${currentPrice.toFixed(2)}</p>
        <p>Shares Purchased: ${sharesPurchased.toFixed(2)}</p>
        <p>Past Investment Value: $${pastInvestmentValue.toFixed(2)}</p>
        <p>Profit/Loss: $${profitLoss.toFixed(2)}</p>
    `;
});
