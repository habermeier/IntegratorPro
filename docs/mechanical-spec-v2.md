# Mechanical Air Distribution & Ventilation Goals
## Architectural linear terminals, quiet remote equipment, and local-automation integration

**Date:** January 17, 2026  
**Version:** v1.20  
**Note on automation integration:** This project uses open, vendor-neutral standards (KNX + DALI-2) as the home automation backbone. HVAC equipment must remain fully operable locally and provide a practical local interface for integration.

---

## 1. Goals (Desired Outcomes)
This document is a customer design brief describing the outcomes we want. We are flexible on brands but the following results must be achieved:

### Aesthetics and Look
- **Clean, modern architectural look:** use mud-in / plaster-in linear slots (or equivalent flush architectural terminals) for visible HVAC supplies, returns, and bathroom exhaust inlets/outlets.
- **No traditional visible grilles** in finished ceilings/walls where practical.

### Quiet Operation
- **Quiet operation:** low air velocities, acoustic treatment where needed, and vibration isolation for any attic-mounted equipment.
- **Pressure balance:** Prefer concealed transfer approaches (e.g., jump ducts with discreet terminals) instead of enlarged door undercuts.

### Efficiency and All-Electric
- **All-electric direction:** prefer heat-pump based HVAC and avoid designs that depend on fossil fuel.
- **Multi-zone comfort:** single-story home; sleeping wing and main living areas.

### Controls and Integration
- **Local-only operation:** no required vendor cloud or third-party app for normal operation.
- **Bi-directional control and telemetry:** expose meaningful command and feedback signals (not only setpoints) for advanced logic.
- **Serviceability:** filters at air handlers (not behind slots), and maintainable access for all components.

### Ventilation Systems
- **Whole-house fan:** ducted, attic-mounted, vibration-isolated, and quiet. Prefer architectural (mud-in) ceiling inlets. Variable-speed controllable (0–10V interface).
- **Attic exhaust fans (gable):** quiet models, locally controllable, interlocked with the whole-house fan.
- **Bathroom ventilation:** remote/in-attic inline fans (not ceiling-can fans), vibration-isolated. Quiet normal mode and controllable "boost" mode.

---

## 2. Suggested Technical Approaches

### 2.1 Architectural linear terminals
- **Preferred characteristics:** Mud-in / plaster-in frameless diffusers. Align slots parallel to framing bays. Low face velocities to avoid hiss.
- **Examples:** InviAir, FlowT, Pacific Register linear slot diffusers.

### 2.2 HVAC equipment strategy
- **Option A:** Premium variable-speed air-source heat pump systems (Mitsubishi Electric VRF, Daikin Fit/VRV, etc.).
- **Integration gateways:** Intesis or CoolAutomation for local bi-directional control.
- **Capabilities:** Local control of mode, setpoints, fan, and zone commands; telemetry for operating state, alarms, and faults.

### 2.3 Zoning approach
- Recommended approach for sleeping wing (including 8 ft kids-bedroom area) and main living core.
- Open to multi-unit or well-designed damper zoning.

### 2.4 Whole-house fan (ducted, architectural inlets)
- **Concept:** Fan mounted in attic feeding architectural ceiling inlets (linear slots).
- **Controls:** Variable speed via 0–10V (or equivalent). We will handle the KNX/DALI-2 interface hardware.
- **Product classes:** QuietCool or Tamarack.

### 2.5 Bathroom / laundry exhaust (remote inline, quiet + boost)
- **Approach:** remote inline fans in attic (vibration-isolated) with architectural ceiling slots.
- **Example:** Fantech FG/EC inline class.

---

## 3. Early Coordination Items
1. **Proposed zone strategy** and equipment topology for quiet + part-load efficiency.
2. **Return/transfer strategy** that preserves privacy and clean lines.
3. **Whole-house fan concept** (one vs multiple units) and coordination with gable exhaust fans.
4. **Automation integration method:** local interface choice and telemetry mapping.

---

## 4. Reference Links
- **InviAir:** Architectural frameless diffusers
- **Intesis / CoolAutomation:** Integration gateways
- **QuietCool / Tamarack:** Whole-house fans
- **Southwire DUO:** Power + control cable
- **Fantech:** Inline exhaust fans

---
*End of design brief.*