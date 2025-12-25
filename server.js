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

// Environment Detection: DEV = localhost, PROD = everything else
const IS_DEV = process.env.NODE_ENV !== 'production';
console.log(`🔧 Server mode: ${IS_DEV ? 'DEVELOPMENT (saves to base files, commits to git)' : 'PRODUCTION (saves to .local files)'}`);

const DATA_FILE = path.join(__dirname, 'layout.json');
const OVERRIDE_FILE = path.join(__dirname, 'layout.local.json');
const SCALE_FILE = path.join(__dirname, 'scale.json');
const SCALE_OVERRIDE_FILE = path.join(__dirname, 'scale.local.json');
const ELECTRICAL_OVERLAY_FILE = path.join(__dirname, 'electricalOverlay.json');
const ELECTRICAL_OVERLAY_OVERRIDE_FILE = path.join(__dirname, 'electricalOverlay.local.json');

// AI Agent Detection Patterns
// These agents need pre-rendered HTML because they can't reliably execute JavaScript
const AI_AGENTS = [
    'GoogleOther',           // Gemini Live Fetch (primary agent when users paste URLs)
    'Gemini-Deep-Research',  // Gemini Deep Research (autonomous multi-step research)
    'Google-InspectionTool', // Google Search Console testing tool
    'GPTBot',                // OpenAI (future-proofing)
    'ClaudeBot',             // Anthropic Claude (future-proofing)
    'Applebot-Extended'      // Apple Intelligence (future-proofing)
];

// Legacy crawlers and tools
const LEGACY_BOTS = [
    'googlebot',
    'crawler',
    'spider',
    'robot',
    'crawling',
    'curl',
    'wget',
    'python-requests',
    'vertex',
    'facebookexternalhit'
];

// Build combined bot detection pattern (case-insensitive)
const BOT_PATTERN = new RegExp(
    [...AI_AGENTS, ...LEGACY_BOTS].join('|'),
    'i'
);

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Helper function to create GET/POST endpoints for JSON data with override pattern
function createDataEndpoints(apiPath, baseFile, overrideFile, dataKey, displayName) {
    // GET endpoint - Read from Override if Exists, Otherwise Base
    app.get(apiPath, (req, res) => {
        try {
            const targetFile = fs.existsSync(overrideFile) ? overrideFile : baseFile;
            if (fs.existsSync(targetFile)) {
                console.log(`Loading ${displayName} from: ${path.basename(targetFile)}`);
                const data = fs.readFileSync(targetFile, 'utf8');
                res.json(JSON.parse(data));
            } else {
                res.json({ [dataKey]: [] });
            }
        } catch (err) {
            console.error(`Error reading ${displayName} data:`, err);
            res.status(500).json({ error: `Failed to read ${displayName} data` });
        }
    });

    // POST endpoint - Write to base file in DEV, override file in PROD
    app.post(apiPath, (req, res) => {
        try {
            const data = req.body[dataKey];
            const fileData = {
                [dataKey]: Array.isArray(data) ? data : []
            };

            // DEV: Write to base file (gets committed to git)
            // PROD: Write to override file (gitignored)
            const targetFile = IS_DEV ? baseFile : overrideFile;
            const targetType = IS_DEV ? 'base (committed)' : 'local (gitignored)';

            fs.writeFileSync(targetFile, JSON.stringify(fileData, null, 2));
            console.log(`✅ ${displayName} saved to ${path.basename(targetFile)} [${targetType}]`);
            res.json({ success: true, ...fileData, savedTo: targetType, file: path.basename(targetFile) });
        } catch (err) {
            console.error(`Error writing ${displayName} data:`, err);
            res.status(500).json({ error: `Failed to save ${displayName} data` });
        }
    });
}

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

// GET scale factor - Prefer Override
app.get('/api/scale', (req, res) => {
    try {
        const targetFile = fs.existsSync(SCALE_OVERRIDE_FILE) ? SCALE_OVERRIDE_FILE : SCALE_FILE;
        if (fs.existsSync(targetFile)) {
            console.log(`Loading scale from: ${path.basename(targetFile)}`);
            const data = fs.readFileSync(targetFile, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json({ scaleFactor: null });
        }
    } catch (err) {
        console.error('Error reading scale data:', err);
        res.status(500).json({ error: 'Failed to read scale data' });
    }
});

// POST scale factor - Always Write to Override
app.post('/api/scale', (req, res) => {
    try {
        const { scaleFactor } = req.body;
        if (typeof scaleFactor !== 'number' || scaleFactor <= 0) {
            return res.status(400).json({ error: 'Invalid scale factor' });
        }
        // DEV: Write to base file (committed)
        // PROD: Write to override file (local)
        const targetFile = IS_DEV ? SCALE_FILE : SCALE_OVERRIDE_FILE;
        const targetType = IS_DEV ? 'base (committed)' : 'local (gitignored)';

        fs.writeFileSync(targetFile, JSON.stringify({ scaleFactor }, null, 2));
        console.log(`✅ Scale factor saved to ${path.basename(targetFile)} [${targetType}]:`, scaleFactor);
        res.json({ success: true, scaleFactor, savedTo: targetType });
    } catch (err) {
        console.error('Error writing scale data:', err);
        res.status(500).json({ error: 'Failed to save scale data' });
    }
});

// GET electrical overlay transform - Prefer Override
app.get('/api/electrical-overlay', (req, res) => {
    try {
        const targetFile = fs.existsSync(ELECTRICAL_OVERLAY_OVERRIDE_FILE) ? ELECTRICAL_OVERLAY_OVERRIDE_FILE : ELECTRICAL_OVERLAY_FILE;
        if (fs.existsSync(targetFile)) {
            console.log(`Loading electrical overlay from: ${path.basename(targetFile)}`);
            const data = fs.readFileSync(targetFile, 'utf8');
            res.json(JSON.parse(data));
        } else {
            // Return default values if no file exists
            res.json({ scale: 1, rotation: 0, x: 0, y: 0, opacity: 0.7, locked: false });
        }
    } catch (err) {
        console.error('Error reading electrical overlay data:', err);
        res.status(500).json({ error: 'Failed to read electrical overlay data' });
    }
});

// POST electrical overlay transform - Always Write to Override
app.post('/api/electrical-overlay', (req, res) => {
    try {
        const { scale, rotation, x, y, opacity, locked } = req.body;

        // Validate inputs
        if (typeof scale !== 'number' || scale <= 0) {
            return res.status(400).json({ error: 'Invalid scale value' });
        }
        if (typeof rotation !== 'number') {
            return res.status(400).json({ error: 'Invalid rotation value' });
        }
        if (typeof x !== 'number' || typeof y !== 'number') {
            return res.status(400).json({ error: 'Invalid position values' });
        }
        if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
            return res.status(400).json({ error: 'Invalid opacity value (must be 0-1)' });
        }

        const overlayData = {
            scale,
            rotation,
            x,
            y,
            opacity,
            locked: !!locked
        };

        // Always write to the override file to prevent changing committed default
        fs.writeFileSync(ELECTRICAL_OVERLAY_OVERRIDE_FILE, JSON.stringify(overlayData, null, 2));
        console.log('Electrical overlay saved to electricalOverlay.local.json');
        res.json({ success: true, ...overlayData, savedTo: 'local' });
    } catch (err) {
        console.error('Error writing electrical overlay data:', err);
        res.status(500).json({ error: 'Failed to save electrical overlay data' });
    }
});

// Base Layer Masks endpoints
const BASE_MASKS_FILE = path.join(__dirname, 'baseMasks.json');
const BASE_MASKS_OVERRIDE_FILE = path.join(__dirname, 'baseMasks.local.json');
createDataEndpoints('/api/base-masks', BASE_MASKS_FILE, BASE_MASKS_OVERRIDE_FILE, 'masks', 'Base masks');

// Rooms endpoints
const ROOMS_FILE = path.join(__dirname, 'rooms.json');
const ROOMS_OVERRIDE_FILE = path.join(__dirname, 'rooms.local.json');
createDataEndpoints('/api/rooms', ROOMS_FILE, ROOMS_OVERRIDE_FILE, 'rooms', 'Rooms');

// Unified Polygons endpoint
const POLYGONS_FILE = path.join(__dirname, 'polygons.json');
const POLYGONS_OVERRIDE_FILE = path.join(__dirname, 'polygons.local.json');
createDataEndpoints('/api/polygons', POLYGONS_FILE, POLYGONS_OVERRIDE_FILE, 'polygons', 'Polygons');

// Settings endpoints
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const SETTINGS_OVERRIDE_FILE = path.join(__dirname, 'settings.local.json');

// Initialize settings.json if not exists
if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
        units: 'IMPERIAL',
        fastZoomMultiplier: 3,
        dataLossThreshold: 0.5
    }, null, 2));
}

// GET settings - Prefer Override
app.get('/api/settings', (req, res) => {
    try {
        const targetFile = fs.existsSync(SETTINGS_OVERRIDE_FILE) ? SETTINGS_OVERRIDE_FILE : SETTINGS_FILE;
        console.log(`Loading settings from: ${path.basename(targetFile)}`);
        const data = fs.readFileSync(targetFile, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error('Error reading settings data:', err);
        res.status(500).json({ error: 'Failed to read settings data' });
    }
});

// POST settings - Always Write to Override
app.post('/api/settings', (req, res) => {
    try {
        const newSettings = req.body;
        // Always write to the override file to prevent changing committed Base
        fs.writeFileSync(SETTINGS_OVERRIDE_FILE, JSON.stringify(newSettings, null, 2));
        console.log('Settings saved successfully to settings.local.json');
        res.json({ success: true, savedTo: 'local', settings: newSettings });
    } catch (err) {
        console.error('Error writing settings data:', err);
        res.status(500).json({ error: 'Failed to save settings data' });
    }
});

// DALI Devices endpoints
const DALI_DEVICES_FILE = path.join(__dirname, 'daliDevices.json');
const DALI_DEVICES_OVERRIDE_FILE = path.join(__dirname, 'daliDevices.local.json');
createDataEndpoints('/api/dali-devices', DALI_DEVICES_FILE, DALI_DEVICES_OVERRIDE_FILE, 'devices', 'DALI devices');

// ============================================================================
// PROJECT DATA ENDPOINTS (Monolithic Pattern with Versioning)
// ============================================================================

// GET /api/project/:projectId - Load entire project with version token
app.get('/api/project/:projectId', (req, res) => {
    try {
        const projectId = req.params.projectId;
        const projectFile = path.join(__dirname, 'projects', projectId, 'project.json');

        if (!fs.existsSync(projectFile)) {
            return res.status(404).json({ error: `Project ${projectId} not found` });
        }

        const stats = fs.statSync(projectFile);
        const versionToken = stats.mtimeMs.toString();

        console.log(`Loading project: ${projectId} [Version: ${versionToken}]`);
        const data = JSON.parse(fs.readFileSync(projectFile, 'utf8'));

        res.json({
            ...data,
            versionToken
        });
    } catch (err) {
        console.error('Error reading project data:', err);
        res.status(500).json({ error: 'Failed to read project data' });
    }
});

// POST /api/project/:projectId - Save entire project with auto-versioning and conflict check
app.post('/api/project/:projectId', (req, res) => {
    try {
        const projectId = req.params.projectId;
        const projectDir = path.join(__dirname, 'projects', projectId);
        const projectFile = path.join(projectDir, 'project.json');
        const historyDir = path.join(projectDir, '.history');

        // Versioning check (if exists)
        if (fs.existsSync(projectFile)) {
            const stats = fs.statSync(projectFile);
            const currentToken = stats.mtimeMs.toString();
            const providedToken = req.body.versionToken || req.headers['x-version-token'];

            // Allow bypass for migrations or specific force-saves
            const isForceSave = req.body.force === true;

            if (providedToken && providedToken !== currentToken && !isForceSave) {
                console.warn(`[CONFLICT] Project ${projectId} version mismatch. Client: ${providedToken}, Server: ${currentToken}`);
                return res.status(409).json({
                    error: 'Version mismatch (Optimistic Lock Conflict)',
                    serverToken: currentToken,
                    clientToken: providedToken
                });
            }
        }

        // Ensure directories exist
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }
        if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true });
        }

        // Step 1: Save current version to history (if exists)
        if (fs.existsSync(projectFile)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/\..+/, '');
            const historyFile = path.join(historyDir, `project-${timestamp}.json`);
            fs.copyFileSync(projectFile, historyFile);
            console.log(`📦 Archived to: ${path.basename(historyFile)}`);

            // Prune history to keep only the last 50 versions to prevent infinite bloat
            try {
                const historyFiles = fs.readdirSync(historyDir)
                    .filter(f => f.startsWith('project-') && f.endsWith('.json'))
                    .map(f => ({
                        name: f,
                        path: path.join(historyDir, f),
                        mtime: fs.statSync(path.join(historyDir, f)).mtimeMs
                    }))
                    .sort((a, b) => b.mtime - a.mtime);

                const MAX_HISTORY = 50;
                if (historyFiles.length > MAX_HISTORY) {
                    const toDelete = historyFiles.slice(MAX_HISTORY);
                    toDelete.forEach(file => {
                        fs.unlinkSync(file.path);
                    });
                    console.log(`♻️ Pruned ${toDelete.length} old history files`);
                }
            } catch (pruneErr) {
                console.error('Failed to prune history:', pruneErr);
            }
        }

        // Step 2: Write new project file
        // Strip the versionToken before saving if it's in the body, so it doesn't nest
        const { versionToken, ...cleanData } = req.body;
        const projectData = {
            ...cleanData,
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(projectFile, JSON.stringify(projectData, null, 2));

        // Get new token for the client
        const newStats = fs.statSync(projectFile);
        const newToken = newStats.mtimeMs.toString();

        console.log(`✅ Project ${projectId} saved successfully [New Version: ${newToken}]`);

        res.json({
            success: true,
            savedTo: projectFile,
            versionToken: newToken
        });
    } catch (err) {
        console.error('Error saving project data:', err);
        res.status(500).json({ error: 'Failed to save project data' });
    }
});

// GET /api/project/:projectId/history - List version history
app.get('/api/project/:projectId/history', (req, res) => {
    try {
        const projectId = req.params.projectId;
        const historyDir = path.join(__dirname, 'projects', projectId, '.history');

        if (!fs.existsSync(historyDir)) {
            return res.json({ versions: [] });
        }

        const files = fs.readdirSync(historyDir)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const stats = fs.statSync(path.join(historyDir, f));
                return {
                    filename: f,
                    timestamp: stats.mtime.toISOString(),
                    size: stats.size
                };
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.json({ versions: files });
    } catch (err) {
        console.error('Error reading version history:', err);
        res.status(500).json({ error: 'Failed to read version history' });
    }
});

// GET /api/project/:projectId/history/:version - Load specific version
app.get('/api/project/:projectId/history/:version', (req, res) => {
    try {
        const projectId = req.params.projectId;
        const version = req.params.version;
        const historyFile = path.join(__dirname, 'projects', projectId, '.history', version);

        if (!fs.existsSync(historyFile)) {
            return res.status(404).json({ error: `Version ${version} not found` });
        }

        const data = fs.readFileSync(historyFile, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error('Error reading version:', err);
        res.status(500).json({ error: 'Failed to read version' });
    }
});

// GET /api/projects - List all available projects
app.get('/api/projects', (req, res) => {
    try {
        const projectsDir = path.join(__dirname, 'projects');

        if (!fs.existsSync(projectsDir)) {
            return res.json({ projects: [] });
        }

        const projects = fs.readdirSync(projectsDir)
            .filter(dir => {
                const projectFile = path.join(projectsDir, dir, 'project.json');
                return fs.existsSync(projectFile);
            })
            .map(dir => {
                const projectFile = path.join(projectsDir, dir, 'project.json');
                const data = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
                return {
                    id: dir,
                    name: data.metadata?.name || dir,
                    status: data.metadata?.status || 'Unknown',
                    modified: data.timestamp || new Date(fs.statSync(projectFile).mtime).toISOString()
                };
            })
            .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

        res.json({ projects });
    } catch (err) {
        console.error('Error listing projects:', err);
        res.status(500).json({ error: 'Failed to list projects' });
    }
});

// ============================================================================
// LEGACY ENDPOINTS (for debugging and backward compatibility)
// ============================================================================

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
    const isBot = BOT_PATTERN.test(ua);

    if (isBot) {
        // Enhanced logging: identify specific agent type for monitoring
        const agentType =
            /GoogleOther/i.test(ua) ? 'Gemini-Live' :
                /Gemini-Deep-Research/i.test(ua) ? 'Gemini-Research' :
                    /Google-InspectionTool/i.test(ua) ? 'Search-Console' :
                        /googlebot/i.test(ua) ? 'Googlebot-Search' :
                            /GPTBot/i.test(ua) ? 'OpenAI-GPT' :
                                /ClaudeBot/i.test(ua) ? 'Anthropic-Claude' :
                                    /curl|wget/i.test(ua) ? 'CLI-Tool' :
                                        'Other-Bot';

        // Log with agent type and truncated UA string
        console.log(`[BOT:${agentType}] ${ua.substring(0, 80)}${ua.length > 80 ? '...' : ''}`);

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
const APP_HOST = process.env.HOST || '0.0.0.0';
app.listen(APP_PORT, APP_HOST, () => {
    console.log(`API Server running on http://${APP_HOST}:${APP_PORT}`);
});
