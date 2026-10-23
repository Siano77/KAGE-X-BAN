const { 
    default: makeWASocket, 
    DisconnectReason, // Kept for import but used differently
    useMultiFileAuthState, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

// --- CONFIGURATION ---
const PROXY_FILE = 'proxies.txt';
const TARGET_NUMBER = "+2349115168787@s.whatsapp.net"; // 👈 YOUR TARGET NUMBER
const MESSAGE_TEXT = "🔥 KAGE X BAN 🔥\n\n" + 
                     "Your account has been banned by KAGE.\n" + 
                     "Contact support if this is an error.\n" + 
                     "© 2026 KAGE-X";

// --- LOAD PROXIES ---
function loadProxies() {
    try {
        const data = fs.readFileSync(PROXY_FILE, 'utf-8').trim();
        return data.split('\n').filter(line => line.trim() !== '');
    } catch (e) {
        console.log(`❌ Error loading ${PROXY_FILE}: ${e.message}`);
        return [];
    }
}

// --- MAIN BOT FUNCTION ---
async function startBot(proxyIndex = 0) {
    const proxies = loadProxies();
    const currentProxy = proxies[proxyIndex] || undefined;
    
    console.log(`🚀 Starting with Proxy #${proxyIndex + 1}/${proxies.length}...`);

    const { state, saveCreds } = await useMultiFileAuthState('./session'); 
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: P({ level: 'silent' }), 
        browser: ['KAGE-X', 'Edge', '120.0'], 
        proxy: currentProxy ? { url: currentProxy } : undefined,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log("\n📱 Scan this QR code with WhatsApp Linked Devices!");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            // FIXED: Accessing errorCode directly from the error object
            const errorCode = lastDisconnect?.error?.output?.payload?.errorCode;
            
            console.log(`❌ Connection closed. Code: ${errorCode}`);
            
            // Check if logged out specifically
            if (errorCode === 401) {
                console.log("🔑 Session invalid/Logged Out. Please delete session folder and rescan.");
                process.exit(0);
            }

            // Retry with next proxy if available
            if (proxyIndex < proxies.length - 1) {
                console.log(`🔄 Switching to Proxy #${proxyIndex + 2}...`);
                setTimeout(() => startBot(proxyIndex + 1), 2000);
            } else {
                console.log("⚠️ All proxies failed. Restarting script...");
                setTimeout(() => startBot(0), 5000);
            }
        }

              if (connection === 'open') {
            console.log("✅ Connected! Sending Ban Message...");
            sendBanMessage(sock); // 👈 REPLACED banAllContacts with sendBanMessage
        }
    });

     // --- BAN LOGIC FOR SPECIFIC NUMBER ---
    async function sendBanMessage(socket) {
        // Format the number for Baileys API
        const jid = TARGET_NUMBER.replace('+', '') + "@s.whatsapp.net";
        
        console.log(`🎯 Targeting: ${TARGET_NUMBER}`);

        try {
            await socket.sendMessage(jid, { text: MESSAGE_TEXT });
            console.log(`✅ Successfully sent ban message to ${TARGET_NUMBER}`);
        } catch (error) {
            console.error(`❌ Failed to send to ${TARGET_NUMBER}:`, error.message);
        }
    }
}

// Start the bot
console.log("[KAGE X] Loaded proxies.");
startBot(0);
