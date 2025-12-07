import fs from 'fs';

const logPath = 'client_debug.log';

try {
    const data = fs.readFileSync(logPath, 'utf8');
    const lines = data.split('\n').filter(l => l.trim());

    let rawEvents = [];
    let libEvents = [];
    let renders = 0;

    lines.forEach(line => {
        // Line format: [ISO] EVENT_NAME: JSON
        const match = line.match(/\[(.*?)\] (.*?): (.*)/);
        if (!match) return;

        const [_, timestamp, event, jsonStr] = match;

        if (event === '1_RAW_WINDOW_WHEEL') {
            try { rawEvents.push(JSON.parse(jsonStr)); } catch (e) { }
        }
        if (event === '2_LIBRARY_ONWHEEL') {
            try { libEvents.push(JSON.parse(jsonStr)); } catch (e) { }
        }
        if (event === 'FRAME_RENDER') {
            renders++;
        }
    });

    console.log("--- ANALYSIS REPORT ---");
    console.log(`Total Lines: ${lines.length}`);
    console.log(`Raw Inputs: ${rawEvents.length}`);
    console.log(`Render Frames: ${renders}`);

    if (rawEvents.length > 0) {
        const last10 = rawEvents.slice(-10);
        console.log("\nLast 10 RAW INPUTS:");
        last10.forEach((e, i) => console.log(`  ${i}: DeltaY=${e.deltaY.toFixed(2)} Mode=${e.deltaMode}`));

        const maxDelta = Math.max(...rawEvents.map(e => Math.abs(e.deltaY)));
        console.log(`\nMAX DELTA Y: ${maxDelta.toFixed(2)}`);

        // Count high frequency
        const highdeltas = rawEvents.filter(e => Math.abs(e.deltaY) > 50).length;
        console.log(`High Delta Events (>50): ${highdeltas}`);
    }

} catch (e) {
    console.error("Error reading log:", e.message);
}
