const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3005;
const DATA_FILE = path.join(__dirname, 'layout.json');

app.use(cors());
app.use(bodyParser.json());

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

app.listen(PORT, () => {
    console.log(`API Server running on http://localhost:${PORT}`);
});
