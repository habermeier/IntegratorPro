import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'layout.json');
const OVERRIDE_FILE = path.join(__dirname, 'layout.local.json');

app.use(cors());
app.use(bodyParser.json());

// Serve static files from the React app (dist folder)
// Ensure 'dist' exists (run 'npm run build' first)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    // Disable 'index' so that the root "/" falls through to our custom route defined below
    // This ensures specific logic (like Bot Detection) runs before serving index.html
    app.use(express.static(distPath, { index: false }));
}

// Initialize layout.json if not exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// GET layout - Prefer Override
app.get('/api/layout', (req, res) => {
    try {
        const targetFile = fs.existsSync(OVERRIDE_FILE) ? OVERRIDE_FILE : DATA_FILE;
        console.log(`Loading layout from: ${path.basename(targetFile)}`);
        const data = fs.readFileSync(targetFile, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error('Error reading layout data:', err);
        res.status(500).json({ error: 'Failed to read layout data' });
    }
});

// POST layout - Always Write to Override
app.post('/api/layout', (req, res) => {
    try {
        const newState = req.body;
        // Always write to the override file to prevent changing committed Base
        fs.writeFileSync(OVERRIDE_FILE, JSON.stringify(newState, null, 2));
        console.log('Layout saved successfully to layout.local.json');
        res.json({ success: true, savedTo: 'local' });
    } catch (err) {
        console.error('Error writing layout data:', err);
        res.status(500).json({ error: 'Failed to save layout data' });
    }
});

// POST debug log
const LOG_FILE = path.join(__dirname, 'client_debug.log');
app.post('/api/debug-log', (req, res) => {
    try {
        const { event, details } = req.body;
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${event}: ${JSON.stringify(details)}\n`;
        fs.appendFileSync(LOG_FILE, logEntry);
        // Disabled for production to avoid disk fill
        res.json({ success: true });
    } catch (err) {
        console.error('Error writing to debug log:', err);
        res.json({ success: false });
    }
});

// --- VECTORIZATION BRIDGE ---


const IMAGE_MAP = {
    'ELECTRIC': path.join(__dirname, 'images', 'electric-plan-plain-full-clean-2025-12-12.jpg'),
    'CLEAN': path.join(__dirname, 'images', 'floor-plan-clean.jpg')
};

app.post('/api/vectorize', (req, res) => {
    const { imageType } = req.body;
    const imagePath = IMAGE_MAP[imageType];

    if (!imagePath || !fs.existsSync(imagePath)) {
        console.error(`Vectorization failed: Image not found ${imagePath}`);
        return res.status(404).json({ error: 'Image file not found on server' });
    }

    const scriptPath = path.join(__dirname, 'python-worker', 'processor.py');
    const command = `python3 "${scriptPath}" --input "${imagePath}"`;

    console.log(`Running Vectorization: ${command}`);

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Vectorization Exec Error: ${error.message}`);
            return res.status(500).json({ error: 'Failed to execute vectorizer', details: stderr });
        }
        try {
            // Python script prints JSON to stdout
            const result = JSON.parse(stdout);
            res.json(result);
        } catch (parseError) {
            console.error(`Vectorization Parse Error: ${parseError.message}`, stdout);
            res.status(500).json({ error: 'Invalid output from vectorizer', output: stdout });
        }
    });
});

// --- DATA LOADING & BOM CALCULATION ---
const catalogPath = path.join(__dirname, 'catalog.json');
const layoutPath = path.join(__dirname, 'layout.json');
const layoutLocalPath = path.join(__dirname, 'layout.local.json');

function getCombinedLayout() {
    let layout = [];
    if (fs.existsSync(layoutPath)) {
        layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
    }
    if (fs.existsSync(layoutLocalPath)) {
        // Simple override strategy: local takes precedence if we were merging, 
        // but typically local *is* the full state. Use local if exists.
        layout = JSON.parse(fs.readFileSync(layoutLocalPath, 'utf8'));
    }
    return layout;
}

function getCatalog() {
    if (fs.existsSync(catalogPath)) {
        return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    }
    return [];
}

function calculateBom() {
    const layout = getCombinedLayout();
    const catalog = getCatalog();
    const catalogMap = new Map(catalog.map(i => [i.id, i]));

    // 1. Map Layout Items to Catalog
    // Consolidate by catalog ID
    const usage = new Map(); // id -> count

    layout.forEach(item => {
        // Skip non-module items (cables, walls, etc need special handling or ignored for now if not in catalog)
        // Check if item.id exists in catalog (direct match)
        if (catalogMap.has(item.id)) {
            usage.set(item.id, (usage.get(item.id) || 0) + 1);
        } else if (item.catalogId && catalogMap.has(item.catalogId)) {
            // Dynamic Instance Mapping (e.g. AI Imported Items)
            usage.set(item.catalogId, (usage.get(item.catalogId) || 0) + 1);
        } else {
            // Handle Instances (e.g. "lcp1-gw" is an instance of "siemens-dali-gw")
            // We need to look up which catalog item owns this instance.
            // This is expensive to scan every time. 
            // Faster: Check if item matches a defined instance in the catalog
            for (const [catId, catItem] of catalogMap.entries()) {
                if (catItem.instances && catItem.instances.find(inst => inst.id === item.id)) {
                    usage.set(catId, (usage.get(catId) || 0) + 1);
                    break;
                }
            }
        }
    });

    // 2. Add "Base Quantity" from Catalog (stuff not on map but in list)
    // This logic mimics ProjectBOM.tsx: "quantity" in catalog is the baseline.
    // However, if we are "live", we might want map counts.
    // For now, let's stick to the "Catalog Quantity" + "Map Deltas" or just Catalog Quantity?
    // The simplified BOM view usually just dumps the Catalog Quantity. 
    // Let's use the Catalog Quantity as the source of truth for the BOM list,
    // assuming the user keeps constants.ts updated.

    // BETTER: Just list everything in the catalog with > 0 quantity.

    const bomItems = catalog.filter(item => item.quantity > 0).map(item => ({
        name: item.name,
        qty: item.quantity,
        cost: item.cost,
        desc: item.description,
        total: item.quantity * item.cost
    }));

    return bomItems;
}

function generateDynamicBomHtml() {
    const items = calculateBom();
    const totalCost = items.reduce((sum, i) => sum + i.total, 0);

    const rows = items.map(item => `
        <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 8px;">${item.name}</td>
            <td style="padding: 8px;">${item.qty}</td>
            <td style="padding: 8px;">$${item.total.toLocaleString()}</td>
            <td style="padding: 8px; font-size: 0.8em; color: #888;">${item.desc}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Project BOM (Automated)</title>
            <meta name="description" content="Generated Project Bill of Materials">
            <style>
                body { background: #111; color: #eee; font-family: sans-serif; padding: 2em; }
                table { width: 100%; border-collapse: collapse; }
                th { text-align: left; border-bottom: 2px solid #555; padding: 10px; }
            </style>
        </head>
        <body>
            <h1>Project Bill of Materials</h1>
            <h2>Total Estimated Cost: $${totalCost.toLocaleString()}</h2>
            <table>
                <thead>
                    <tr><th>Item</th><th>Qty</th><th>Total Cost</th><th>Description</th></tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            <p style="margin-top: 2em; color: #666; font-size: 0.8em;">Generated by IntegratorPro Server &bull; ${new Date().toISOString()}</p>
        </body>
        </html>
    `;
}

// --- GLOBAL BOT DETECTION MIDDLEWARE ---
// This runs for ALL routes except /api (which we want to pass through likely? 
// Actually bots might crawl /api too, but usually we want to intercept visual navigation).
// We'll place it before the API routes just to be safe, OR wrap standard routes.
// The user wants "ALL URL's".

app.use((req, res, next) => {
    // Skip API calls from bot detection (bots shouldn't be posting to api anyway, 
    // and if they get data from api that's fine, but we care about HTML views)
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
        // Files (css, js) and API -> Skip
        return next();
    }

    const ua = req.headers['user-agent'] || '';
    const isBot = /googlebot|crawler|spider|robot|crawling|curl|wget|python|gemini|vertex|facebookexternalhit/i.test(ua);

    if (isBot) {
        console.log(`Bot Detected (${ua}). Serving Dynamic BOM.`);
        try {
            const html = generateDynamicBomHtml();
            res.send(html);
        } catch (err) {
            console.error("Error generating BOM for bot:", err);
            res.status(500).send("Server Error Generating View");
        }
    } else {
        // Humans -> React App
        next();
    }
});

// All other GET requests not handled before will return our React app
app.get(/.*/, (req, res) => {
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        res.status(404).send('App not built. Run "npm run build" first.');
    }
});

const APP_PORT = process.env.PORT || 3001;
app.listen(APP_PORT, () => {
    console.log(`API Server running on port ${APP_PORT}`);
});
