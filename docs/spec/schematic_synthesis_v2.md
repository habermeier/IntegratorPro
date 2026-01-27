# Hybrid AI-Algorithmic Schematic Synthesis (v2) Technical Specification

**Status**: DRAFT  
**Author**: Research Worker (Antigravity)  
**Date**: 2026-01-02  
**Task-ID**: SCH-RESEARCH-070

## 1. Executive Summary
This specification defines the architecture for a "Hybrid Engine" capable of generating professional-grade electrical schematics. The system leverages Generative AI for high-level semantic reasoning (clustering, flow, visual weight) and deterministic Algorithms for low-level precision (grid adherence, valid connectivity, design rule checks).

The core innovation is the introduction of an intermediate **"Layout Hint File" (LHF)**, a JSON/YAML-based interface that decouples the "Art" (GenAI) from the "Science" (Algorithm).

## 2. Standards & KPIs
To achieve "professional-grade" output, the system must adhere to established industry standards.

### 2.1 Relevant Standards
*   **IEEE 315 / ANSI Y32.2**: Defines graphic symbols and class designation letters. Key requirement: **Left-to-Right signal flow**, Top-to-Bottom power flow.
*   **IEC 60617**: International standard for symbols. Emphasizes vector-based representations and modular grid alignment.
*   **IPC-2612**: Requirements for electronic diagramming documentation. Defines "Completeness Grades". We target **Grade 2 (Detailed)** or higher.

### 2.2 Measurable KPIs (Definition of Done)
1.  **Grid Adherence**: 100% of component pins and wire vertices must align to the major grid (e.g., 100mil/2.54mm).
2.  **Crossing Minimization**: < 5% of nets should involve crossovers; 0% of crossovers should be ambiguous (must use "dots" for junctions).
3.  **Flow Compliance**: 90% of primary signal paths flow Left-to-Right.
4.  **Decoupling Proximity**: Decoupling capacitors must be placed within 2 grid units of their associated IC power pins.
5.  **Page Density**: Component density should be "Balanced" (not clustered in one corner), utilizing 40-70% of the page area.

## 3. Architecture Overview

```mermaid
graph TD
    A[User / Netlist] --> B(Generative AI Agent);
    B -->|Context + Netlist| C{AI Reasoning};
    C -->|Generates| D[Layout Hint File (LHF)];
    D --> E(Algorithmic Layout Engine);
    F[Component Library] --> E;
    E -->|Force-Directed + Constraints| G[Placement Solver];
    G -->|Manhattan Routing| H[Router];
    H --> I[Final Schematic (JSON/Sch)];
```

### 3.1 Roles
*   **GenAI ( The Architect )**: "Reads" the netlist to understand function. Identifies that U1 is an MCU, J1 is USB, and they should be near each other. Determines that the "Power Supply" section belongs in the top-left or bottom-left. Outputs the *Intent* via the Layout Hint File.
*   **Algorithm ( The Drafter )**: "Obeys" the hints but strictly enforces the grid. It creates the actual coordinates, draws the wires using Manhattan routing, and ensures zero connectivity errors.

## 4. The "Layout Hint File" (LHF) Schema
The LHF is the contract between GenAI and the Algorithm. It is a declarative JSON structure.

### 4.1 Schema Definition
```json
{
  "meta": {
    "version": "1.0",
    "strategy": "functional_flow_left_to_right"
  },
  "global_constraints": {
    "flow_direction": "L2R",
    "paper_size": "A3",
    "grid_size": 100
  },
  "clusters": [
    {
      "id": "cluster_power_in",
      "name": "Power Input Section",
      "components": ["J1", "F1", "D1", "C1"],
      "visual_weight": "low",
      "placement_hint": {
        "region": "top-left",
        "alignment": "vertical"
      }
    },
    {
      "id": "cluster_mcu",
      "name": "Main Processor",
      "components": ["U1", "R1", "C2", "C3", "Y1"],
      "visual_weight": "high",
      "placement_hint": {
        "relative_to": "cluster_power_in",
        "direction": "right",
        "distance": "medium"
      }
    }
  ],
  "critical_associations": [
    {
      "type": "decoupling",
      "primary": "U1",
      "satellites": ["C2", "C3"],
      "rule": "strict_proximity"
    },
    {
      "type": "differential_pair",
      "nets": ["D_P", "D_N"],
      "rule": "parallel_routing"
    }
  ]
}
```

### 4.2 Field Descriptions
*   **Clusters**: Logical groupings. The Algorithm uses these to apply "attraction forces" between components in the same cluster.
*   **Visual Weight**: Hints to the algorithm about how much whitespace to reserve. High visual weight = more isolation/whitespace.
*   **Placement Hint**: Can be absolute (`region: "top-left"`) or relational (`direction: "right"`). This solves the "Sweet Spot" problem—GenAI doesn't say "X=1500, Y=200", it says "Put the MCU to the right of the Power Supply."
*   **Critical Associations**: Explicit rules that override general force-directed placement (e.g., crystal oscillators *must* be next to the MCU).

## 5. Algorithmic Strategy (Prior Art Adaptation)

### 5.1 Modified Force-Directed Placement
We will adapt standard Fruchterman-Reingold or Kamada-Kawai algorithms with **hierarchical constraints**:
1.  **Macro-Placement**: First, treat "Clusters" as single super-nodes. Run force-directed placement on these super-nodes based on LHF `flow_direction` and `placement_hint` forces.
2.  **Micro-Placement**: Lock cluster boundaries. Run force-directed placement *inside* each cluster for individual components.
3.  **Grid Snapping (The "Annealing" Phase)**: After physical simulation properties stabilize, snap all centroids to the nearest major grid intersection.

### 5.2 Constraint-Based Routing
*   **Manhattan Routing**: All wires must be orthogonal.
*   **Channel Routing**: Reserve "channels" between clusters for main bus routing.
*   **Obstacle Avoidance**: Components act as obstacles. The router uses typical A* or maze-running algorithms with penalties for crossing other nets (via jumper/dot) vs going around.

## 6. Workflow Implementation Plan
1.  **Input Parsing**: System ingests Netlist (e.g., IPC-D-356, KiCad Netlist).
2.  **AI Analysis**:
    *   Prompt: "Analyze this netlist. Identify functional blocks (Power, RF, Digital). Create a Layout Hint File."
    *   Output: LHF JSON.
3.  **Synthesis Engine**:
    *   Load Component Bounding Boxes.
    *   Apply standard "Gravity" (Clusters attract).
    *   Apply "Wind" (Global Flow Direction applies a constant force vector L->R).
    *   Solve layout.
4.  **Routing**:
    *   Route critical nets first (diff pairs, clocks).
    *   Route power/ground.
    *   Route signals.
5.  **Render**: Output SVG/PDF + Coordinate File.

## 7. Future Considerations
*   **Feedback Loop**: If the Algorithm fails to route (congestion), it can generate an "Error Hint File" back to the GenAI: "Cluster MCU is too dense, please split or move."
*   **Style Transfer**: Using LHF `meta.strategy` to switch between "Compact/Mobile" style (dense) vs "Education/Kit" style (spacious, explanatory).
