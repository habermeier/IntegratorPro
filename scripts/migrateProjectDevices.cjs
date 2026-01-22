const fs = require('fs');
const path = require('path');

const PROJECT_PATH = path.join(__dirname, '../projects/270-boll-ave/project.json');

function migrateL9toL12() {
    console.log('--- Project Migration: L9 -> L12 ---');

    if (!fs.existsSync(PROJECT_PATH)) {
        console.error('Error: Project file not found at', PROJECT_PATH);
        process.exit(1);
    }

    const rawData = fs.readFileSync(PROJECT_PATH, 'utf8');
    const project = JSON.parse(rawData);

    let symbolCount = 0;
    let customTypeCount = 0;

    // 1. Traverse Layers for placed symbols
    if (project.floorPlan && project.floorPlan.layers) {
        project.floorPlan.layers.forEach(layer => {
            if (layer.content && layer.content.symbols) {
                layer.content.symbols.forEach(symbol => {
                    if (symbol.productId === '2DS-L9') {
                        symbol.productId = '2DS-L12';
                        symbol.type = '2DS-L12'; // Usually matches type
                        symbolCount++;

                        // Update metadata if exists
                        if (symbol.metadata) {
                            if (symbol.metadata.productId === '2DS-L9') symbol.metadata.productId = '2DS-L12';
                            if (symbol.metadata.shorthand === '2DS-L9') symbol.metadata.shorthand = '2DS-L12';
                        }
                    }
                });
            }
        });
    }

    // 2. Traverse Custom Types (Blueprints)
    if (project.customTypes) {
        project.customTypes.forEach(ct => {
            if (ct.id === 'custom-2ds-l9') {
                ct.id = 'custom-2ds-l12';
                customTypeCount++;
            }
            if (ct.productId === '2DS-L9') ct.productId = '2DS-L12';
            if (ct.name === '2DS-L9') ct.name = '2DS-L12';

            // Fix descriptions/metadata strings
            if (ct.description) {
                ct.description = ct.description.replace(/2DS-L9/g, '2DS-L12');
            }
        });
    }

    // 3. Global String Cleanup for internal references (shorthands, IDs)
    // We'll do a final pass on the stringified version for safety if needed, 
    // but the object traversal above is the "correct" way.

    fs.writeFileSync(PROJECT_PATH, JSON.stringify(project, null, 2));

    console.log(`Success!`);
    console.log(`- Updated ${symbolCount} placed symbols.`);
    console.log(`- Updated ${customTypeCount} custom type definitions.`);
    console.log('-----------------------------------');
}

migrateL9toL12();
