const makeWASocket = require('@whiskeysockets/baileys').default;
const { proto } = require('@whiskeysockets/baileys');
const fs = require('fs');
const pino = require('pino');

// --- KAGE X BAN CONFIGURATION ---
const SESSION_FILE = 'creds.json'; // Do not rename this
const TARGET_NUMBER = process.env.TARGET_NUMBER || '1234567890@s.whatsapp.net'; 
const MAX_THREADS = parseInt(process.env.MAX_THREADS) || 3; // Keep low for free proxies
const BASE_DELAY_MS = 12000; // Base delay between bans

// Load Proxies
let PROXY_LIST = [];
try {
    const rawProxies = fs.readFileSync('proxies.txt', 'utf-8')
        .trim()
        .split('\n')
        .filter(line => line.includes(':'));
    PROXY_LIST = rawProxies.map(p => `http://${p}`);
    console.log(`[KAGE X] Loaded ${PROXY_LIST.length} proxies.`);
} catch (e) {
    console.log("[KAGE X] No proxies found. Running on direct IP.");
}

let currentProxyIndex = 0;

function getNextProxy() {
    if (PROXY_LIST.length === 0) return undefined;
    const proxy = PROXY_LIST[currentProxyIndex];
    currentProxyIndex = (currentProxyIndex + 1) % PROXY_LIST.length;
    return proxy;
}

async function kageBanThread(threadId) {
    const proxy = getNextProxy();
    
    // Initialize Socket
    const sock = makeWASocket({
        auth: { 
            creds: require('./creds.json'), 
            keys: require('@whiskeysockets/baileys').makeAuthBuffer().keys 
        },
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['KAGE-X-BAN', 'Edge', '110.0.0'], // Custom Browser ID
        ...(proxy && { fetchUnackMessages: false, proxyUrl: proxy }) 
    });

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(`[KAGE X] Thread #${threadId} Online | Proxy: ${proxy || 'DIRECT'} | Target: ${TARGET_NUMBER}`);

    while (true) {
        try {
            // 1. Send a small dummy message to ensure account health
            await sock.sendMessage(TARGET_NUMBER, { text: 'Hi' });
            
            // 2. Human-like random delay (Jitter)
            const jitter = Math.floor(Math.random() * 5000);
            await sleep(BASE_DELAY_MS + jitter);

            // 3. THE BAN
            await sock.updateBlockStatus(TARGET_NUMBER, 'block');
            console.log(`[KAGE X] Thread #${threadId} >> TARGET BLOCKED SUCCESSFULLY`);

            // 4. Reset for next round
            await sleep(2000); 

        } catch (err) {
            console.error(`[KAGE X] Thread #${threadId} Error: ${err.message}. Rotating...`);
            currentProxyIndex = (currentProxyIndex + 1) % PROXY_LIST.length;
            await sleep(15000);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Start Threads
console.log("👁️ KAGE X BAN INITIALIZED");
for (let i = 0; i < MAX_THREADS; i++) {
    kageBanThread(i);
}
