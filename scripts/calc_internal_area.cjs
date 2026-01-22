
const fs = require('fs');

const projectData = JSON.parse(fs.readFileSync('/Users/berniehabermeier/IntegratorPro/projects/270-boll-ave/project.json', 'utf8'));

// Corrected scale: px per Foot
const pxPerFoot = 51.3048;

function calculatePolygonArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
}

const rooms = projectData.floorPlan.polygons.filter(p => p.type === 'room' && p.name.toLowerCase() !== 'patio');

const categories = {
    'Living Area': ['bedroom', 'bathroom', 'kitchen', 'living room', 'dining room', 'family room', 'office', 'foyer', 'hallway', 'den', 'study'],
    'Support & Storage': ['closet', 'closet-walkin', 'pantry', 'laundry', 'utility', 'mudroom', 'tech', 'other'],
    'Unconditioned': ['garage', 'mud']
};

const results = [];

rooms.forEach(room => {
    const areaPx = calculatePolygonArea(room.points);
    const areaSqFt = areaPx / (pxPerFoot * pxPerFoot);

    let category = 'Support & Storage'; // Default for things like 'other'

    const type = room.roomType?.toLowerCase();
    if (categories['Living Area'].includes(type)) category = 'Living Area';
    else if (categories['Unconditioned'].includes(type)) category = 'Unconditioned';

    // Manual refinement
    const name = room.name.toLowerCase();
    if (name.includes('bedroom') || name.includes('bath') || name.includes('kitchen') || name.includes('living') || name.includes('dining') || name.includes('office') || name.includes('foyer') || name.includes('family')) {
        category = 'Living Area';
    } else if (name.includes('closet') || name.includes('pantry') || name.includes('laundry') || name.includes('tech') || name.includes('utility') || name.includes('linen')) {
        category = 'Support & Storage';
    } else if (name.includes('garage')) {
        category = 'Unconditioned';
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
    console.log(`| **Subtotal ${cat}** | | **${subtotal.toFixed(0)}** |`);
});

const total = results.reduce((sum, r) => sum + r.area, 0);
console.log(`\n**Internal Home Area (Excluding Patio):** ${total.toFixed(0)} sq ft`);
