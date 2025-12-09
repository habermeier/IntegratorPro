# System Verification Plan - Data Architecture v2

## Objective
Verify that the new "Product + Instances" schema is correctly correctly reflected across all UI views (BOM, Visualizer, Floor Plan) and that new features (Data Layers) function as expected.

## Test Cases

### 1. Project Brief (BOM) - Consolidated View
**Goal**: Ensure the BOM shows Products (SKUs), not individual instances.
*   [ ] Navigate to **Project Brief** (Dashboard).
*   [ ] Find "Altronix eFlow6N".
    *   **Expect**: 1 Row.
    *   **Expect**: Quantity = 3.
    *   **Expect**: Location = "LCP-1, LCP-2".
*   [ ] Find "DALI Control Gateway".
    *   **Expect**: 1 Row.
    *   **Expect**: Quantity = 4.

### 2. Visualizer - Instance View
**Goal**: Ensure the Rack/DIN Visualizer shows *individual physical units*.
*   [ ] Navigate to **Visualizer**.
*   [ ] Locate **LCP-1** (Left Column).
*   [ ] Count "DALI Control Gateway" units on the DIN rail.
    *   **Expect**: 2 instances (Universe 1 & 2).
*   [ ] Locate **LCP-2** (Right Column, may need scroll).
*   [ ] Count "DALI Control Gateway" units.
    *   **Expect**: 2 instances (Universe 3 & 4).

### 3. Floor Plan - Data Layers
**Goal**: Verify the new "Data Overlay" controls toggle visibility of map icons.
*   [ ] Navigate to **Floor Plan**.
*   [ ] Verify the **Data Overlay** panel exists (Right side).
*   [ ] **Action**: Click "LIGHT" (Lighting) toggle to OFF.
    *   **Expect**: Lighting icons (Purple/Yellow dots) disappear.
*   [ ] **Action**: Click "LIGHT" toggle to ON.
    *   **Expect**: Lighting icons reappear.
*   [ ] **Action**: Click "SEC" (Security) toggle to OFF.
    *   **Expect**: "field-str" (Strike) or "x915" icons disappear.

### 4. Deep Linking
**Goal**: Verify clicking a BOM item navigates to its location.
*   [ ] Return to **Project Brief**.
*   [ ] Click on "UniFi Pro Max 24 PoE" row.
*   [ ] **Expect**: Application switches to **Visualizer** (or Floor Plan depending on logic).
*   [ ] **Expect**: Item is highlighted (Blue border/Flash).

## Execution Environment
*   **URL**: `http://localhost:5173`
*   **Browser**: Chrome (Headless/Agentic)
