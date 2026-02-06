---
description: Generate a high-resolution architectural PDF for a project.
---

This workflow automates the generation of a 300 DPI PDF export, saving it directly to the project's `exports/` directory on the filesystem.

### Prerequisites
- The development server must be running on port 3002 (`npm run dev`).

### Steps

1. **Trigger Generation**
   Run the following command to trigger the headless export (requires `playwright` or `puppeteer`, but we can also use a simple curl if the server supports it, however the current implementation requires a browser to render Three.js).
   
   Alternatively, simply open this URL in your browser:
   `http://localhost:3002/editor/[PROJECT_ID]?export=pdf`
   (Example: http://localhost:3002/editor/270-bolla-ave?export=pdf)

2. **Wait for Archiving**
   The editor will automatically:
   - Calculate the project bounding box.
   - Render a high-res image.
   - Construct the architectural PDF.
   - **Upload the file back to the server.**

3. **Locate the File**
   The generated PDF will be saved at:
   `/Users/berniehabermeier/IntegratorPro/projects/[PROJECT_ID]/exports/[FILENAME].pdf`

// turbo
4. **List Generated PDFs**
   Run this command to see the latest exports for 270 Bolla Ave:
   ```bash
   ls -lat /Users/berniehabermeier/IntegratorPro/projects/270-bolla-ave/exports/
   ```

### Troubleshooting
- **Rendering Timeout**: For extremely large projects, the browser may take up to 20 seconds to generate the high-res buffer.
- **Port Conflict**: Ensure no other process is using port 3002.
