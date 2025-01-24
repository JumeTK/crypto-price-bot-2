require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Telegram bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const CHAT_ID = process.env.CHAT_ID;

// Function to fetch crypto prices and market caps
async function getCryptoPrices() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: 'bitcoin,ethereum,not-pixel,ripple,cardano,nodecoin',
                vs_currencies: 'usd',
                include_market_cap: true
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching prices:', error);
        return null;
    }
}

// Function to format large numbers (billions/millions)
function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) {
        return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
        return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
        return `$${(marketCap / 1e6).toFixed(2)}M`;
    } else {
        return `$${marketCap.toLocaleString()}`;
    }
}

// Function to format message with copyable prices, market caps, and username
function formatPriceMessage(prices) {
    if (!prices) return '❌ Error fetching prices';
    
    return `🚀 *Crypto Prices Update* 🚀\n
*Bitcoin*
Price: \`$${prices.bitcoin.usd.toLocaleString()}\`
Market Cap: \`${formatMarketCap(prices.bitcoin.usd_market_cap)}\`

*Ethereum*
Price: \`$${prices.ethereum.usd.toLocaleString()}\`
Market Cap: \`${formatMarketCap(prices.ethereum.usd_market_cap)}\`

*PX*
Price: \`$${prices['not-pixel'].usd.toLocaleString()}\`
Market Cap: \`${formatMarketCap(prices['not-pixel'].usd_market_cap)}\`

*XRP*
Price: \`$${prices.ripple.usd.toLocaleString()}\`
Market Cap: \`${formatMarketCap(prices.ripple.usd_market_cap)}\`

*Cardano*
Price: \`$${prices.cardano.usd.toLocaleString()}\`
Market Cap: \`${formatMarketCap(prices.cardano.usd_market_cap)}\`

*Node-Coin*
Price: \`$${prices.nodecoin.usd.toLocaleString()}\`
Market Cap: \`${formatMarketCap(prices.nodecoin.usd_market_cap)}\`\n
⏰ Updated at: ${new Date().toLocaleString()}\n
📱 *Join us on Telegram*: trumpXbtc24
💬 *Contact for queries*: nastydeed`;
}

// Update the sendTelegramMessage function to enable Markdown parsing
async function sendTelegramMessage(message, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await bot.sendMessage(CHAT_ID, message, {
                parse_mode: 'Markdown'
            });
            return result;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// Endpoint to trigger price update
app.get('/api/update', async (req, res) => {
    try {
        console.log('Fetching crypto prices...');
        const prices = await getCryptoPrices();
        
        if (prices?.error) {
            return res.status(429).json({ success: false, error: prices.error });
        }
        
        console.log('Prices received:', prices);
        const message = formatPriceMessage(prices);
        console.log('Formatted message:', message);
        
        const result = await sendTelegramMessage(message);
        console.log('Telegram response:', result);
        
        res.json({ 
            success: true, 
            message: 'Price update sent successfully',
            prices: prices,
            telegramResponse: result 
        });
    } catch (error) {
        console.error('Detailed error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack,
            botToken: process.env.TELEGRAM_BOT_TOKEN ? 'Token exists' : 'No token',
            chatId: process.env.CHAT_ID ? 'Chat ID exists' : 'No chat ID'
        });
    }
});

// Add a test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        environment: {
            botToken: process.env.TELEGRAM_BOT_TOKEN ? 'Token exists' : 'No token',
            chatId: process.env.CHAT_ID ? 'Chat ID exists' : 'No chat ID',
            port: process.env.PORT || 3000
        }
    });
});

// Basic endpoint to keep the server alive
app.get('/', (req, res) => {
    res.send('Crypto Price Bot is running!');
});

// Export the Express app
module.exports = app;

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    // Send initial price update
    getCryptoPrices().then(prices => {
        const message = formatPriceMessage(prices);
        bot.sendMessage(CHAT_ID, message);
    });
}); 