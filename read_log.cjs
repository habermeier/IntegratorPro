const fs = require('fs');
const path = require('path');

const logPath = path.join(process.cwd(), 'client_debug.log');

if (fs.existsSync(logPath)) {
    const data = fs.readFileSync(logPath, 'utf8');
    const lines = data.split('\n');
    console.log(lines.slice(-50).join('\n'));
} else {
    console.log('No client_debug.log found');
}
