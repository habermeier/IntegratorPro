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

app.use(cors());
app.use(bodyParser.json());

// Serve static files from the React app (dist folder)
// Ensure 'dist' exists (run 'npm run build' first)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

// Initialize layout.json if not exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// GET layout
app.get('/api/layout', (req, res) => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error('Error reading layout.json:', err);
        res.status(500).json({ error: 'Failed to read layout data' });
    }
});

// POST layout
app.post('/api/layout', (req, res) => {
    try {
        const newState = req.body;
        fs.writeFileSync(DATA_FILE, JSON.stringify(newState, null, 2));
        console.log('Layout saved successfully');
        res.json({ success: true });
    } catch (err) {
        console.error('Error writing layout.json:', err);
        res.status(500).json({ error: 'Failed to save layout data' });
    }
});

// POST debug log
const LOG_FILE = path.join(__dirname, 'client_debug.log');
app.post('/api/debug-log', (req, res) => {
    try {
        const { event, details } = req.body;
        // const timestamp = new Date().toISOString();
        // const logEntry = `[${timestamp}] ${event}: ${JSON.stringify(details)}\n`;
        // fs.appendFileSync(LOG_FILE, logEntry); 
        // Disabled for production to avoid disk fill
        res.json({ success: true });
    } catch (err) {
        console.error('Error writing to debug log:', err);
        res.json({ success: false });
    }
});

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
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
