# IntegratorPro

System planning and documentation suite for building automation projects.

## Features

- **Project Brief**: Comprehensive project overview and functional objectives
- **Systems Overview**: Hardware catalog and system architecture
- **Rack & DIN Layout**: Visual layout of control panels and DIN rail modules
- **Floor Plan Map**: Interactive floor plan with scale tool and cable run measurement
- **Bill of Materials**: Automated BOM generation with cost tracking
- **Rough-in Guide**: Installation guidance and wiring specifications

## Development

```bash
# Install dependencies
npm install

# Run development server (Vite frontend + Express backend)
npm run dev

# Run production server
npm start

# Build for production
npm run build
```

## Architecture

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Express + Node.js
- **Data Storage**: JSON files with base + local override pattern
  - `layout.json` / `layout.local.json` - Module placement
  - `scale.json` / `scale.local.json` - Floor plan scale factor
  - `cableRuns.json` / `cableRuns.local.json` - Cable run measurements

## Project Structure

```
IntegratorPro/
├── components/          # React components
├── requirements/        # Feature requirements and specifications
├── catalog.json         # Hardware catalog
├── constants.ts         # System constants and configuration
├── server.js           # Express API server
└── vite.config.ts      # Vite build configuration
```

## Requirements

Requirements and feature specifications are maintained in `/requirements/floorplan-annotation.md`.

## License

Private project for 270 Bolla Ave, Alamo, CA
