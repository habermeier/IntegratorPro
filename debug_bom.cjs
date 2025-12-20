const fs = require('fs');
const path = require('path');

const layoutPath = path.join(process.cwd(), 'layout.json');
const layoutLocalPath = path.join(process.cwd(), 'layout.local.json');
const catalogPath = path.join(process.cwd(), 'catalog.json');

function getCombinedLayout() {
    let layout = [];
    if (fs.existsSync(layoutPath)) {
        layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
    }
    if (fs.existsSync(layoutLocalPath)) {
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
    const usage = new Map();

    layout.forEach(item => {
        if (catalogMap.has(item.id)) {
            usage.set(item.id, (usage.get(item.id) || 0) + 1);
        } else if (item.catalogId && catalogMap.has(item.catalogId)) {
            usage.set(item.catalogId, (usage.get(item.catalogId) || 0) + 1);
        } else {
            for (const [catId, catItem] of catalogMap.entries()) {
                if (catItem.instances && catItem.instances.find(inst => inst.id === item.id)) {
                    usage.set(catId, (usage.get(catId) || 0) + 1);
                    break;
                }
            }
        }
    });

    const bomItems = catalog.filter(item => item.quantity > 0).map(item => ({
        name: item.name,
        qty: item.quantity,
        cost: item.cost,
        desc: item.description,
        total: item.quantity * item.cost
    }));

    return bomItems;
}

try {
    console.log('Testing BOM Calculation...');
    const items = calculateBom();
    console.log(`Success! Generated ${items.length} items.`);
} catch (e) {
    console.error('CRASHED:', e);
}
