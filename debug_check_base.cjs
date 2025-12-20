const fs = require('fs');
const path = require('path');

const files = [
    'layout.json',
    'scale.json',
    'electricalOverlay.json',
    'rooms.json',
    'polygons.json',
    'baseMasks.json',
    'daliDevices.json'
];

console.log('--- Checking BASE JSON Files ---');

files.forEach(f => {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) {
        console.log(`[MISSING] ${f}`);
        return;
    }

    try {
        const content = fs.readFileSync(p, 'utf8');
        if (!content.trim()) {
            console.error(`[EMPTY] ${f} is empty! (Causes crash)`);
        } else {
            JSON.parse(content);
            console.log(`[OK] ${f}`);
        }
    } catch (e) {
        console.error(`[BROKEN] ${f}: ${e.message}`);
    }
});
