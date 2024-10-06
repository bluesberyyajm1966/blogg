const simulateBtn = document.getElementById('simulateBtn');
const resultsDiv = document.getElementById('results');
const ctx = document.getElementById('stockChart').getContext('2d');
let myChart;

simulateBtn.addEventListener('click', async () => {
    const stockSymbol = document.getElementById('stockSymbol').value;
    const investmentAmount = parseFloat(document.getElementById('investmentAmount').value);
    const investmentDate = document.getElementById('investmentDate').value;

    if (!stockSymbol || isNaN(investmentAmount) || !investmentDate) {
        alert('Please enter a valid stock symbol, investment amount, and date.');
        return;
    }

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
    const volumes = [];
    const labels = [];
    let pastPrice = null;

    // Prepare data for chart and find past price
    for (let date in timeSeries) {
        labels.push(date);
        prices.push(parseFloat(timeSeries[date]["4. close"]));
        volumes.push(parseFloat(timeSeries[date]["5. volume"]));

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

    // Prepare and train the LSTM model for predictions
    await trainModel(prices, volumes);
});

// Function to prepare data and train the model
async function trainModel(prices, volumes) {
    // Normalize and prepare the data
    const sequenceLength = 5; // Using last 5 days for prediction
    const X = [];
    const Y = [];

    for (let i = sequenceLength; i < prices.length; i++) {
        const seq = [];
        for (let j = i - sequenceLength; j < i; j++) {
            seq.push([prices[j] / Math.max(...prices), volumes[j] / Math.max(...volumes)]); // Normalize prices and volumes
        }
        X.push(seq);
        Y.push(prices[i] / Math.max(...prices)); // Predict next day's price
    }

    // Convert to tensors
    const xs = tf.tensor3d(X);
    const ys = tf.tensor2d(Y, [Y.length, 1]);

    // Create and compile the LSTM model
    const model = tf.sequential();
    model.add(tf.layers.lstm({ units: 50, inputShape: [sequenceLength, 2] }));
    model.add(tf.layers.dense({ units: 1 }));
    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    // Train the model
    await model.fit(xs, ys, { epochs: 100, batchSize: 16 });

    // Predict the next price
    const lastSequence = [];
    for (let i = prices.length - sequenceLength; i < prices.length; i++) {
        lastSequence.push([prices[i] / Math.max(...prices), volumes[i] / Math.max(...volumes)]);
    }

    const prediction = model.predict(tf.tensor3d([lastSequence], [1, sequenceLength, 2]));
    const predictedPrice = prediction.dataSync()[0] * Math.max(...prices); // Convert back to original scale

    resultsDiv.innerHTML += `<p>Predicted Price: $${predictedPrice.toFixed(2)}</p>`;

    // Clean up tensors
    xs.dispose();
    ys.dispose();
    prediction.dispose();
    model.dispose();
}
