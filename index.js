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

// Function to format message
function formatPriceMessage(prices) {
    if (!prices) return '❌ Error fetching prices';
    
    return `🚀 Crypto Prices Update 🚀\n
Bitcoin: $${prices.bitcoin.usd.toLocaleString()}
Ethereum: $${prices.ethereum.usd.toLocaleString()}
BNB: $${prices.binancecoin.usd.toLocaleString()}
XRP: $${prices.ripple.usd.toLocaleString()}
Cardano: $${prices.cardano.usd.toLocaleString()}
Node-Coin: $${prices.nodecoin.usd.toLocaleString()}\n
⏰ Updated at: ${new Date().toLocaleString()}`;
}

// Function to send price update
async function sendPriceUpdate() {
    const prices = await getCryptoPrices();
    const message = formatPriceMessage(prices);
    
    try {
        await bot.sendMessage(CHAT_ID, message);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Set up periodic updates (every minute)
setInterval(sendPriceUpdate, 60000);

// Basic endpoint to keep the server alive
app.get('/', (req, res) => {
    res.send('Crypto Price Bot is running!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    // Send initial price update
    sendPriceUpdate();
}); 