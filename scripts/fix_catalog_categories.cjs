const fs = require('fs');
const path = require('path');

const files = [
    path.join(__dirname, '..', 'catalog.json'),
    path.join(__dirname, '..', 'catalog_v2.json')
];

const updates = {
    // Fix missing Infrastructure items (Panels & Gear)
    'lcp1-enc': 'infrastructure',
    'lcp2-enc': 'infrastructure',
    'span-panel': 'infrastructure',
    'sol-ark-15k': 'infrastructure',
    'eg4-18kpv': 'infrastructure',
    'battery-bank': 'infrastructure',

    // Fix Gateway & Logic categories (Control & Logic)
    'siemens-dali-gw': 'lcps',
    'lunt-dali-010': 'lcps',
    'lunt-dali-rm8': 'lcps',

    // Revert/Fix accidental Lighting regressions
    'DMF-X2-SQ-FL': 'lighting',
    '2DS-L9-INTEGRATED': 'lighting'
};

files.forEach(file => {
    if (!fs.existsSync(file)) {
        console.log(`Skipping missing file: ${file}`);
        return;
    }

    console.log(`Processing ${path.basename(file)}...`);
    const content = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(content);
    let changed = false;

    // Helper to check and update items
    const checkUpdate = (list, type) => {
        if (!list) return;
        list.forEach(item => {
            if (updates[item.id]) {
                if (item.category !== updates[item.id]) {
                    console.log(`  [${type}] Changing ${item.id} from '${item.category || 'undefined'}' to '${updates[item.id]}'`);
                    item.category = updates[item.id];
                    changed = true;
                }
            }
        });
    };

    checkUpdate(data.registry?.loads, 'LOAD');
    checkUpdate(data.registry?.logic, 'LOGIC');
    checkUpdate(data.blueprints, 'BLUEPRINT');

    if (changed) {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        console.log(`  Saved changes to ${path.basename(file)}`);
    } else {
        console.log(`  No changes needed for ${path.basename(file)}`);
    }
});
