#!/usr/bin/env node

/**
 * Migration Script: Consolidate Individual JSON Files → Monolithic project.json
 *
 * This script reads existing data files:
 * - layout.json, scale.json, polygons.json, electricalOverlay.json,
 *   daliDevices.json, settings.json
 *
 * And consolidates them into a single project.json with the structure:
 * projects/270-boll-ave/project.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Configuration
const PROJECT_ID = '270-boll-ave';
const PROJECT_NAME = '270 Boll Ave';

// Source files (prefer .local.json if exists, otherwise use base)
const sourceFiles = {
    layout: { base: 'layout.json', override: 'layout.local.json', default: [] },
    scale: { base: 'scale.json', override: 'scale.local.json', default: { scaleFactor: null } },
    polygons: { base: 'polygons.json', override: 'polygons.local.json', default: { polygons: [] } },
    electricalOverlay: { base: 'electricalOverlay.json', override: 'electricalOverlay.local.json', default: { scale: 1, rotation: 0, x: 0, y: 0, opacity: 0.7, locked: false } },
    daliDevices: { base: 'daliDevices.json', override: 'daliDevices.local.json', default: { devices: [] } },
    settings: { base: 'settings.json', override: 'settings.local.json', default: { units: 'IMPERIAL' } }
};

// Target directory
const projectDir = path.join(rootDir, 'projects', PROJECT_ID);
const projectFile = path.join(projectDir, 'project.json');
const historyDir = path.join(projectDir, '.history');

/**
 * Read JSON file with fallback
 */
function readJsonFile(baseFile, overrideFile, defaultValue) {
    const basePath = path.join(rootDir, baseFile);
    const overridePath = path.join(rootDir, overrideFile);

    // Try override first (local changes)
    if (fs.existsSync(overridePath)) {
        console.log(`  ✓ Reading: ${overrideFile}`);
        try {
            return JSON.parse(fs.readFileSync(overridePath, 'utf8'));
        } catch (err) {
            console.warn(`  ⚠ Error reading ${overrideFile}, trying base...`);
        }
    }

    // Try base file
    if (fs.existsSync(basePath)) {
        console.log(`  ✓ Reading: ${baseFile}`);
        try {
            return JSON.parse(fs.readFileSync(basePath, 'utf8'));
        } catch (err) {
            console.warn(`  ⚠ Error reading ${baseFile}, using default`);
        }
    }

    // Use default
    console.log(`  - Using default for ${baseFile}`);
    return defaultValue;
}

/**
 * Main migration logic
 */
function migrate() {
    console.log('🚀 Starting Data Migration to Monolithic Project Pattern...\n');

    // Create directories
    console.log('📁 Creating project directory structure...');
    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
        console.log(`  ✓ Created: ${projectDir}`);
    } else {
        console.log(`  - Already exists: ${projectDir}`);
    }

    if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
        console.log(`  ✓ Created: ${historyDir}/.history`);
    } else {
        console.log(`  - Already exists: ${historyDir}/.history`);
    }

    // Read all source data
    console.log('\n📖 Reading source data files...');
    const layout = readJsonFile(
        sourceFiles.layout.base,
        sourceFiles.layout.override,
        sourceFiles.layout.default
    );

    const scale = readJsonFile(
        sourceFiles.scale.base,
        sourceFiles.scale.override,
        sourceFiles.scale.default
    );

    const polygonsData = readJsonFile(
        sourceFiles.polygons.base,
        sourceFiles.polygons.override,
        sourceFiles.polygons.default
    );

    const electricalOverlay = readJsonFile(
        sourceFiles.electricalOverlay.base,
        sourceFiles.electricalOverlay.override,
        sourceFiles.electricalOverlay.default
    );

    const daliDevicesData = readJsonFile(
        sourceFiles.daliDevices.base,
        sourceFiles.daliDevices.override,
        sourceFiles.daliDevices.default
    );

    const settings = readJsonFile(
        sourceFiles.settings.base,
        sourceFiles.settings.override,
        sourceFiles.settings.default
    );

    // Build monolithic project structure
    console.log('\n🔧 Building monolithic project structure...');
    const now = new Date().toISOString();
    const project = {
        version: '1.0',
        timestamp: now,
        metadata: {
            name: PROJECT_NAME,
            status: 'Draft',
            created: now,
            modified: now
        },
        floorPlan: {
            scale: scale,
            layout: Array.isArray(layout) ? layout : [],
            polygons: polygonsData.polygons || [],
            electricalOverlay: electricalOverlay
        },
        furniture: [],  // Empty for now, will be populated by device placement system
        devices: daliDevicesData.devices || [],
        cables: [],     // Empty for now
        lcps: [],       // Empty for now
        settings: settings
    };

    // Write project.json
    console.log('\n💾 Writing consolidated project file...');
    fs.writeFileSync(projectFile, JSON.stringify(project, null, 2));
    console.log(`  ✅ Created: projects/${PROJECT_ID}/project.json`);

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`  - Polygons migrated: ${project.floorPlan.polygons.length}`);
    console.log(`  - Layout modules: ${project.floorPlan.layout.length}`);
    console.log(`  - Scale factor: ${project.floorPlan.scale.scaleFactor || 'not set'}`);
    console.log(`  - DALI devices: ${project.devices.length}`);
    console.log(`  - Settings: ${JSON.stringify(project.settings)}`);

    console.log('\n✅ Migration Complete!');
    console.log('\nNext steps:');
    console.log('  1. Verify data in projects/270-boll-ave/project.json');
    console.log('  2. Start dev server: npm run dev');
    console.log('  3. Test load/save functionality');
    console.log('  4. Verify version history (.history/ folder)');
    console.log('\nOld JSON files have been preserved. Delete them only after verifying migration.');
}

// Run migration
try {
    migrate();
} catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
}
