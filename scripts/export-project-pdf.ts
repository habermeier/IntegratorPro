import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportPDF(projectId: string = '270-bolla-ave') {
    console.log(`🚀 Starting PDF Export for project: ${projectId}...`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Log console messages from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // Set viewport to something large to ensure editor initializes correctly
    await page.setViewportSize({ width: 1920, height: 1080 });

    const exportUrl = `http://localhost:3002/editor/${projectId}?export=pdf`;
    console.log(`🔗 Navigating to: ${exportUrl}`);

    const exportDir = path.join(process.cwd(), 'projects', projectId, 'exports');

    // Monitor the exports directory for new files
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
    }

    const filesBefore = new Set(fs.readdirSync(exportDir));

    try {
        await page.goto(exportUrl, { waitUntil: 'networkidle' });
        // Wait for the Export Dialog to appear
        console.log('⏳ Waiting for Export Dialog...');
        await page.waitForSelector('text=Export Drawing', { timeout: 10000 });

        // Wait another second for stability
        await new Promise(r => setTimeout(r, 1000));

        // Click the "Generate PDF" button
        console.log('🚀 Clicking "Generate PDF" button...');
        await page.click('button:has-text("Generate PDF")');

        console.log('⏳ Generating PDF and uploading to server...');

        // Wait for the "Project PDF archived to server filesystem" console message
        // or just wait for a file to appear in the exports directory
        let newFile = '';
        let timeout = 120000; // 120 seconds
        let start = Date.now();

        while (Date.now() - start < timeout) {
            const filesAfter = fs.readdirSync(exportDir);
            const diff = filesAfter.filter(f => !filesBefore.has(f) && f.endsWith('.pdf'));

            if (diff.length > 0) {
                newFile = diff[0];
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        if (newFile) {
            const finalPath = path.join(exportDir, newFile);
            console.log(`✅ Success! PDF generated and saved to:`);
            console.log(`   ${finalPath}`);
        } else {
            console.error('❌ Timeout: PDF was not generated within 60 seconds.');
        }

    } catch (error) {
        console.error('❌ Export failed:', error);
    } finally {
        await browser.close();
    }
}

const projId = process.argv[2] || '270-bolla-ave';
exportPDF(projId);
