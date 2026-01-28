
const fs = require('fs');

const projectData = JSON.parse(fs.readFileSync('/Users/berniehabermeier/IntegratorPro/projects/270-boll-ave/project.json', 'utf8'));

const pxPerMeter = projectData.floorPlan.layout.find(l => l.id === 'map-calibration')?.pxPerMeter || 51.3048;

function calculatePolygonArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
}

const garage = projectData.floorPlan.polygons.find(p => p.name === 'Main');
if (garage) {
    const areaPx = calculatePolygonArea(garage.points);
    console.log(`Garage area in pixels: ${areaPx}`);
    console.log(`pxPerMeter: ${pxPerMeter}`);
    const areaM2 = areaPx / (pxPerMeter * pxPerMeter);
    console.log(`Area in m2: ${areaM2}`);
    const areaSqFt = areaM2 * 10.7639;
    console.log(`Area in sqft (m2 * 10.7639): ${areaSqFt}`);
    const areaSqFtDirect = areaPx / (pxPerMeter * pxPerMeter);
    console.log(`Area if pxPerMeter was actually pxPerFoot: ${areaSqFtDirect}`);
}
