# Research Result: Hybrid AI-Algorithmic Schematic Synthesis

**Task-ID**: SCH-RESEARCH-070  
**Status**: COMPLETE  
**Date**: 2026-01-02  
**Deliverable**: [docs/spec/schematic_synthesis_v2.md](file:///home/bernie/IntegratorPro/docs/spec/schematic_synthesis_v2.md)

## Executive Summary
We have successfully defined the architecture for a hybrid schematic generation engine. The core finding is that GenAI should not attempt to generate coordinates directly. Instead, it should act as an "Architect" producing a **Layout Hint File (LHF)**, which a deterministic "Draftsman" algorithm then uses to place components and route wires along a valid grid.

## Key Findings

### 1. Standards & KPIs
To meet "professional-grade" expectations, the engine must adhere to:
*   **IEEE 315**: Strict Left-to-Right signal flow.
*   **Grid Adherence**: 100% major grid alignment for pins/wires.
*   **Crossing Minimization**: <5% net crossovers.
*   **Decoupling**: Strict proximity (within 2 grid units) for decoupling capacitors.

### 2. Architecture: The "Sweet Spot"
The "Sweet Spot" for AI integration is **Intent Extraction**, not Coordinate Calculation.
*   **GenAI Role**: Semantic clustering (e.g., "Power Section", "MCU Block"), relative placement hints ("Place Power block to the left of MCU"), and visual weight assignment.
*   **Algorithm Role**: Force-directed placement (using GenAI clusters as super-nodes), grid snapping, and Manhattan routing.

### 3. The Layout Hint File (LHF)
We defined a JSON schema that serves as the interface. It allows GenAI to express high-level intents like:
```json
{
  "placement_hint": { "relative_to": "cluster_power", "direction": "right" },
  "critical_associations": [ { "type": "decoupling", "rule": "strict_proximity" } ]
}
```

## Next Steps
1.  **Prototype Parser**: Build a simple script to parse the LHF JSON.
2.  **Algorithm Spike**: Implement a basic force-directed solver that respects "Cluster" boundaries.
3.  **GenAI Prompt**: Develop the system prompt that converts a simple Netlist into an LHF.
