
const fs = require('fs');

const projectData = JSON.parse(fs.readFileSync('/Users/berniehabermeier/IntegratorPro/projects/270-boll-ave/project.json', 'utf8'));

const pxPerMeter = projectData.floorPlan.layout.find(l => l.id === 'map-calibration')?.pxPerMeter || 51.3048;
const calibrationIsMetric = false; // The 51.3 factor is actually PxPerFoot for this project

function calculatePolygonArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
}

const rooms = projectData.floorPlan.polygons.filter(p => p.type === 'room');

const categories = {
    'Heated/Living Area': ['bedroom', 'bathroom', 'kitchen', 'living room', 'dining room', 'family room', 'office', 'foyer', 'hallway', 'den', 'study'],
    'Utility & Storage': ['closet', 'closet-walkin', 'pantry', 'laundry', 'utility', 'mudroom', 'closet'],
    'Unconditioned/Exterior': ['garage', 'patio', 'deck', 'porch', 'other']
};

const results = [];

rooms.forEach(room => {
    const areaPx = calculatePolygonArea(room.points);
    let areaSqFt;

    if (calibrationIsMetric) {
        const areaM2 = areaPx / (pxPerMeter * pxPerMeter);
        areaSqFt = areaM2 * 10.7639;
    } else {
        // Calibration factor is actually PxPerFoot
        areaSqFt = areaPx / (pxPerMeter * pxPerMeter);
    }

    let category = 'Uncategorized';
    if (categories['Heated/Living Area'].includes(room.roomType?.toLowerCase())) category = 'Heated/Living Area';
    else if (categories['Utility & Storage'].includes(room.roomType?.toLowerCase())) category = 'Utility & Storage';
    else if (categories['Unconditioned/Exterior'].includes(room.roomType?.toLowerCase())) category = 'Unconditioned/Exterior';

    // Manual overrides based on common names if roomType is generic
    const name = room.name.toLowerCase();
    if (name.includes('bedroom') || name.includes('bath') || name.includes('kitchen') || name.includes('living') || name.includes('dining') || name.includes('office') || name.includes('foyer')) {
        category = 'Heated/Living Area';
    } else if (name.includes('closet') || name.includes('pantry') || name.includes('laundry')) {
        category = 'Utility & Storage';
    } else if (name.includes('garage') || name.includes('patio')) {
        category = 'Unconditioned/Exterior';
    }

    results.push({ name: room.name, id: room.id, type: room.roomType, area: areaSqFt, category });
});

// Group by category
const grouped = {};
results.forEach(r => {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
});

Object.keys(grouped).forEach(cat => {
    console.log(`\n### ${cat}`);
    console.log('| Room Name | Room Type | Area (sq ft) |');
    console.log('| :--- | :--- | :--- |');
    let subtotal = 0;
    grouped[cat].sort((a, b) => b.area - a.area).forEach(r => {
        console.log(`| ${r.name} | ${r.type} | ${r.area.toFixed(0)} |`);
        subtotal += r.area;
    });
    console.log(`| **Total ${cat}** | | **${subtotal.toFixed(0)}** |`);
});

const total = results.reduce((sum, r) => sum + r.area, 0);
console.log(`\n**Grand Total Area:** ${total.toFixed(0)} sq ft`);
