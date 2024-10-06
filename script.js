const simulateBtn = document.getElementById('simulateBtn');
const resultsDiv = document.getElementById('results');
const ctx = document.getElementById('stockChart').getContext('2d');
let myChart;

simulateBtn.addEventListener('click', async () => {
    const stockSymbol = document.getElementById('stockSymbol').value;
    const investmentAmount = parseFloat(document.getElementById('investmentAmount').value);
    const investmentDate = document.getElementById('investmentDate').value;

    // Validate input
    if (!stockSymbol || isNaN(investmentAmount) || !investmentDate) {
        alert('Please enter a valid stock symbol, investment amount, and date.');
        return;
    }

    // Show loading indicator
    document.getElementById('loadingIndicator').style.display = 'block';

    try {
        // Fetch current price
        const currentPriceResponse = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stockSymbol}&apikey=YOUR_API_KEY`);
        const currentPriceData = await currentPriceResponse.json();
        const currentPrice = parseFloat(currentPriceData["Global Quote"]["05. price"]);

        if (!currentPrice) {
            alert('Could not retrieve data for the given stock symbol.');
            return;
        }

        // Fetch historical data (last 30 days)
        const historicalResponse = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stockSymbol}&apikey=YOUR_API_KEY`);
        const historicalData = await historicalResponse.json();
        const timeSeries = historicalData["Time Series (Daily)"];

        const prices = [];
        const labels = [];
        let pastPrice = null;

        // Prepare data for chart and find past price
        for (let date in timeSeries) {
            labels.push(date);
            prices.push(parseFloat(timeSeries[date]["4. close"]));

            // Check for past investment price
            if (date === investmentDate) {
                pastPrice = parseFloat(timeSeries[date]["4. close"]);
            }

            if (labels.length === 30) break; // Get last 30 days
        }

        if (pastPrice === null) {
            alert('No data found for the selected investment date.');
            return;
        }

        // Reverse the labels and prices to show from oldest to newest
        labels.reverse();
        prices.reverse();

        // Create or update chart
        if (myChart) {
            myChart.destroy();
        }

        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Stock Price',
                    data: prices,
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

        // Calculate profit/loss
        const sharesPurchased = investmentAmount / pastPrice;
        const currentInvestmentValue = sharesPurchased * currentPrice;
        const profitLoss = currentInvestmentValue - investmentAmount;

        // Show results
        resultsDiv.innerHTML = `
            <p>Current Price: $${currentPrice.toFixed(2)}</p>
            <p>Shares Purchased: ${sharesPurchased.toFixed(2)}</p>
            <p>Investment Price on ${investmentDate}: $${pastPrice.toFixed(2)}</p>
            <p>Current Investment Value: $${currentInvestmentValue.toFixed(2)}</p>
            <p>Profit/Loss: $${profitLoss.toFixed(2)}</p>
        `;
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('An error occurred while fetching data. Please try again later.');
    } finally {
        // Hide loading indicator
        document.getElementById('loadingIndicator').style.display = 'none';
    }
});
