
const fs = require('fs');

function auditCatalog(filename) {
    if (!fs.existsSync(filename)) {
        console.log(`${filename} not found.`);
        return;
    }
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    console.log(`--- Audit for ${filename} ---`);

    console.log('\nRegistry Loads Categories:');
    const loadCats = new Set();
    data.registry.loads.forEach(p => loadCats.add(p.category));
    console.log(Array.from(loadCats));

    console.log('\nBlueprints Categories:');
    const bpCats = new Set();
    data.blueprints.forEach(bp => bpCats.add(bp.category));
    console.log(Array.from(bpCats));

    console.log('\nBlueprints in Infrastructure/LCPS/Enclosure:');
    data.blueprints.forEach(bp => {
        if (bp.category === 'infrastructure' || bp.category === 'lcps' || bp.category === 'enclosure') {
            console.log(`- ${bp.id} (${bp.name}): ${bp.category}`);
        }
    });

    console.log('\nEnergy Wall Items Categories:');
    const energyIds = ['span-panel', 'hybrid-inverter', 'battery-bank', 'sol-ark-15k', 'eg4-18kpv', 'lcp1-enc', 'lcp2-enc'];
    data.registry.loads.forEach(p => {
        if (energyIds.includes(p.id)) {
            console.log(`- ${p.id}: ${p.category}`);
        }
    });
}

auditCatalog('catalog.json');
auditCatalog('catalog_v2.json');
