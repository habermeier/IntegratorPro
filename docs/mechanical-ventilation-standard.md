# Mechanical Air Distribution & Ventilation Goals
## Architectural linear terminals, quiet remote equipment, and local-automation integration

**Date:** January 17, 2026  
**Version:** v1.20  

**Note on automation integration:** This project uses open, vendor-neutral standards (KNX + DALI-2) as the home automation backbone. HVAC equipment must remain fully operable locally and provide a practical local interface for integration (e.g., dry contact, 0-10V, or a documented local gateway). Electrical/control wiring and enclosure standards are defined in the companion document: “Whole-Home KNX/DALI Standard v1.20”. Owner will handle device registration, addressing, and programming.

---

## 1. Goals (Desired Outcomes)
This document is a customer design brief: it describes the outcomes we want and why they matter. We are flexible on the specific brands and implementation details, and we welcome your recommendations as long as the end results below are achieved.

*   **Clean, modern architectural look:** use mud-in / plaster-in linear slots (or equivalent flush architectural terminals) for visible HVAC supplies, returns, and bathroom exhaust inlets/outlets.
*   **No traditional visible grilles** in finished ceilings/walls where practical; prioritize clean lines and consistent slot alignment.
*   **Quiet operation:** low air velocities, acoustic treatment where needed, and vibration isolation for any attic-mounted equipment.
*   **Closed-door comfort and pressure balance** without compromising privacy: avoid relying on enlarged door undercuts. Prefer concealed transfer approaches that match the architectural intent (e.g., jump ducts with discreet terminals, or concealed linear transfer slots).
*   **All-electric direction:** prefer heat-pump based HVAC (future solar offset) and avoid designs that depend on fossil fuel as the primary heating source.
*   **Multi-zone comfort (TBD during design):** single-story home; likely zones include a sleeping wing (including 8 ft kids-bedroom area) and main living areas, with flexibility for specialty rooms. We would like your recommendation on a practical zone map.
*   **Controls and integration are first-class goals (not an afterthought):** the system must be fully operable locally and integrate into the home automation backbone (KNX + DALI-2; see the companion electrical standard).
*   **Local-only operation:** no required vendor cloud, no required third-party app for normal operation, and no mandatory internet connectivity.
*   **Bi-directional control and telemetry:** expose meaningful command and feedback signals (not only setpoints) so we can implement advanced logic (e.g., forecast-based pre-cooling, demand optimization, scene integration).
*   **Serviceability without compromising finishes:** filters at air handlers (not behind architectural slots), and maintainable access for components that may need periodic service.
*   **Whole-house fan:** ducted, attic-mounted, vibration-isolated, and quiet. Prefer architectural (mud-in) ceiling inlets that maintain clean lines while supporting high airflow without audible “suction” noise. We also want the whole-house fan system to be locally automation-controllable (e.g., via KNX/DALI-2 on our side, typically through a 0–10V or equivalent interface).
*   **Attic exhaust fans (gable):** if installed, prefer quiet models that are locally controllable and can be coordinated/interlocked with the whole-house fan and HVAC (local-only; no cloud/app dependency).
*   **Bathroom ventilation:** remote/in-attic inline fans (not ceiling-can fans), vibration-isolated and acoustically treated. We intentionally prefer “over-capable” ventilation with a quiet normal mode and a controllable boost mode for fast odor/humidity clearing, while keeping ceiling slots sized appropriately to avoid noise.

---

## 2. Suggested Technical Approaches (Examples; Brand-Flexible)
The items below are examples of approaches that appear to match the goals. Please propose your preferred equipment and details if you have better options, and let us know early if any tradeoffs are required.

### 2.1 Architectural linear terminals (supplies, returns, transfers)
**Preferred characteristics:**
*   Mud-in / plaster-in / flush-install linear slot terminals with drywall-friendly frames (no surface flange).
*   Ability to align slots parallel to framing bays/joists and coordinate cleanly with lighting and trim.
*   Low face velocities at terminals to avoid hiss and “suction” noise, especially on returns and whole-house fan inlets.

**Examples (acceptable if they are truly mud-in / plaster-in and documented as such):**
*   **InviAir** (architectural frameless diffusers) – reference aesthetic/approach; equivalents are acceptable.
*   **FlowT** linear diffuser kits (mud-in/frameless style)
*   **Pacific Register** linear slot diffuser (pre-drywall / behind drywall style)

**Note:** Commercial linear-slot families may be acceptable only when ordered with a true plaster/mud-in frame detail that matches the architectural intent and is shown on the cut sheet.

### 2.2 HVAC equipment strategy and automation integration
**Objective:** high-efficiency all-electric comfort with transparent local control and feedback for automation.
*   **Option A (often best fit):** Premium variable-speed air-source heat pump systems with strong local integration pathways.
*   **Examples:** Mitsubishi Electric (ducted/VRF families) or Daikin (Fit/VRV families), or equivalent high-quality inverter systems.
*   **Why:** mature variable-speed control, quiet operation, strong part-load efficiency, and realistic integration options via local gateways when needed.
*   **Local integration gateways (examples):** Intesis or CoolAutomation (or equivalent), provided the interface is local and bi-directional.

**Integration capabilities we care about (examples; propose alternatives if you prefer):**
*   Local control of mode, setpoints, fan, and zone commands (where zoned).
*   Local telemetry for operating state (heating/cooling/idle/defrost), fan status/speed, alarms/faults, and relevant zone state.
*   No mandatory cloud or app dependency for normal operation; internet connectivity should be optional and disable-able.

### 2.3 Zoning approach (TBD)
We are not prescribing the final zone map yet. Please recommend an approach that is quiet, efficient at part-load, and compatible with architectural terminals.
*   Likely example zones in this single-story home: sleeping wing (including 8 ft kids-bedroom area) and main living core, with optional specialty rooms if warranted.
*   We are open to either multi-unit/multi-air-handler solutions or well-designed damper zoning, as long as comfort and noise goals are met.

### 2.4 Whole-house fan (ducted, architectural inlets)
We prefer a ducted whole-house fan approach: fan mounted in attic with vibration isolation, feeding one or more architectural ceiling inlets (linear slots) sized for quiet high airflow. Controls should be local and automation-ready; we are looking for a variable-speed control interface (0–10V or equivalent) so the system can be driven from KNX/DALI-2 via local interface hardware.
*   We are open to one large system or multiple smaller systems; please advise what best fits the floor plan and noise goals.
*   **Controls:** prefer variable speed via 0–10V (or equivalent) and a local/offline control pathway. We will handle the KNX/DALI-2 interface hardware details; the key is that the fan system supports robust local control and predictable behavior.
*   **Coordination:** if gable attic exhaust fans are included, we would like the ability to coordinate/interlock them with the whole-house fan (e.g., assist exhaust when needed, avoid conflicting operation).
*   **Example product classes (ducted):** QuietCool (ducted families) or Tamarack (or equivalent).

### 2.5 Bathroom / laundry exhaust (remote inline, quiet + boost)
*   **Approach:** remote inline fans in attic (vibration-isolated), with appropriately sized architectural ceiling slots, quiet baseline operation, and boost capability.
*   **Example:** Fantech FG/EC inline class, or equivalent.
*   **Control:** prefer variable speed (0-10V or equivalent) and integration-friendly control signals compatible with the home automation plan.

---

## 3. Early Coordination Items (to avoid surprises)
We would appreciate your recommendations and any early flags on the following items:
1.  Proposed zone strategy and equipment topology that best meets quiet + part-load efficiency goals.
2.  Return/transfer strategy that preserves privacy and clean architectural lines (no enlarged door gaps; no visible classic grilles).
3.  Whole-house fan concept (one vs multiple units), inlet locations that align with framing and architectural intent, expected noise/airflow performance, and how (if applicable) gable attic exhaust fans will be coordinated/interlocked.
4.  Automation integration method: local interface choice, exposed controls/telemetry, and how it ties into KNX + DALI-2 (directly or via gateway).

---

## 4. Reference Links (Examples; equivalents acceptable)
*   [InviAir](https://inviair.com)
*   [FlowT linear kits](https://flowt.io)
*   [Pacific Register linear slot diffuser](https://www.pacificregister.com)
*   [Intesis gateways](https://www.intesis.com)
*   [CoolAutomation gateways](https://coolautomation.com)
*   [QuietCool](https://quietcoolsystems.com)
*   [Tamarack](https://tamtech.com)
*   [Southwire DUO (power + control in one cable)](https://www.southwire.com)
*   Local control interfaces (KNX/DALI-2 → 0–10V / relay), as needed
*   [Fantech](https://www.fantech.net)

---
*End of design brief.*
