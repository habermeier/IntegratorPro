import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// --- BOM SNAPSHOT FOR AI / NO-JS TOOLS ---
const SNAPSHOT_FILE = path.join(__dirname, 'bom.snapshot.json');

// 1. Receive calculated BOM from Client
app.post('/api/snapshot-bom', (req, res) => {
    try {
        const bomData = req.body; // Expects { calculatedCost: 123, items: [...] }
        fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(bomData, null, 2));
        console.log('BOM Snapshot updated');
        res.json({ success: true });
    } catch (err) {
        console.error('Snapshot failed', err);
        res.status(500).json({ error: 'Failed to save snapshot' });
    }
});

// 2. Helper to Generate HTML (Shared)
const generateBomHtml = () => {
    if (!fs.existsSync(SNAPSHOT_FILE)) {
        return '<html><body><h1>No Snapshot Available</h1><p>Please open the Dashboard in a browser first to generate the data.</p></body></html>';
    }
    const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));

    // Generate Simple Table
    const rows = data.items.map(item => `
        <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 8px;">${item.name}</td>
            <td style="padding: 8px;">${item.quantity}</td>
            <td style="padding: 8px;">$${Number(item.total).toLocaleString()}</td>
            <td style="padding: 8px; font-size: 0.8em; color: #888;">${item.description}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Project BOM (Static)</title>
            <meta name="description" content="Static Bill of Materials View for Project IntegratorPro">
            <style>
                body { font-family: monospace; background: #0f172a; color: #e2e8f0; padding: 20px; }
                table { width: 100%; border-collapse: collapse; text-align: left; }
                th { border-bottom: 2px solid #64748b; padding: 10px; }
                .summary { margin-bottom: 20px; padding: 10px; border: 1px solid #334155; }
            </style>
        </head>
        <body>
            <h1>Project IntegratorPro BOM</h1>
            <div class="summary">
                <strong>Total Cost:</strong> $${Number(data.totalCost).toLocaleString()} <br/>
                <strong>Total Power:</strong> ${data.totalPower} W <br/>
                <strong>Last Updated:</strong> ${new Date().toISOString()}
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Total Cost</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </body>
        </html>
    `;
};

// 3. Serve Static HTML (Explicit)
app.get('/bom-view', (req, res) => {
    try {
        res.send(generateBomHtml());
    } catch (err) {
        res.status(500).send('Error rendering BOM view');
    }
});

// All other GET requests not handled before will return our React app
app.get(/.*/, (req, res) => {
    const ua = req.headers['user-agent'] || '';
    const isBot = /googlebot|crawler|spider|robot|crawling|curl|wget|python|gemini|vertex/i.test(ua);

    if (isBot) {
        console.log(`Bot Detected (${ua}). Serving Static BOM.`);
        try {
            res.send(generateBomHtml());
            return;
        } catch (e) {
            console.error("Failed to serve static BOM to bot", e);
            // Fallback to app
        }
    }

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
