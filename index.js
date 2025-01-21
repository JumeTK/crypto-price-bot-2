require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Telegram bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const CHAT_ID = process.env.CHAT_ID;

// Function to fetch crypto prices
async function getCryptoPrices() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: 'bitcoin,ethereum,binancecoin,ripple,cardano,nodecoin',
                vs_currencies: 'usd'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching prices:', error);
        return null;
    }
}

// Function to format message with copyable prices
function formatPriceMessage(prices) {
    if (!prices) return '❌ Error fetching prices';
    
    return `🚀 Crypto Prices Update 🚀\n
Bitcoin: \`$${prices.bitcoin.usd.toLocaleString()}\`
Ethereum: \`$${prices.ethereum.usd.toLocaleString()}\`
BNB: \`$${prices.binancecoin.usd.toLocaleString()}\`
XRP: \`$${prices.ripple.usd.toLocaleString()}\`
Cardano: \`$${prices.cardano.usd.toLocaleString()}\`
Node-Coin: \`$${prices.nodecoin.usd.toLocaleString()}\`\n
⏰ Updated at: ${new Date().toLocaleString()}`;
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