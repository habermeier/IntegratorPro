# Development Guidelines

## ⚡ CRITICAL: Server Management

**RULE #1: DO NOT GUESS PORTS. DO NOT START DUPLICATE SERVERS.**

Before performing any browser interaction or starting `npm run dev`, you **MUST** run:

```bash
./scripts/find-active-port.sh
```

### Protocol
1. **Run Script**: Execute `./scripts/find-active-port.sh`.
2. **If Port Found** (e.g., `FOUND_PORT=3002`):
   - **USE IT**. Connect the browser tool to `http://localhost:3002`.
   - **DO NOT** run `npm run dev`.
3. **If NO Port Found** (Exit Code 1):
   - Only THEN can you run `npm run dev`.
   - Wait for the output to confirm the new port.

**VIOLATION OF THIS PROTOCOL WASTES RESOURCES AND CAUSES CONFUSION.**
