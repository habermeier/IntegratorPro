# Mechanical Air Distribution & Ventilation Goals
## Architectural linear terminals, quiet remote equipment, and local-automation integration

**Date:** January 17, 2026  
**Version:** v1.21  

### Revision Summary (v1.20 to v1.21)
This document has been updated to transition from a brand-flexible design brief to a prescriptive hardware specification for the Whole-House Fan (WHF) and Attic Exhaust systems. These specific models have been selected to ensure full automation compatibility with the project's DALI-2/KNX control infrastructure.

**Note on automation integration:** This project uses open, vendor-neutral standards (KNX + DALI-2) as the home automation backbone. HVAC equipment must remain fully operable locally and provide a practical local interface for integration (e.g., dry contact, 0-10V, or a documented local gateway). Electrical/control wiring and enclosure standards are defined in the companion document: “Whole-Home KNX/DALI Standard”. Owner will handle device registration, addressing, and programming.

---

## 1. Goals (Desired Outcomes)
This document is a customer design brief: it describes the outcomes we want and why they matter.

*   **Clean, modern architectural look:** use mud-in / plaster-in linear slots (or equivalent flush architectural terminals) for visible HVAC supplies, returns, and bathroom exhaust inlets/outlets.
*   **No traditional visible grilles** in finished ceilings/walls where practical; prioritize clean lines and consistent slot alignment.
*   **Quiet operation:** low air velocities, acoustic treatment where needed, and vibration isolation for any attic-mounted equipment.
*   **Closed-door comfort and pressure balance** without compromising privacy: avoid relying on enlarged door undercuts. Prefer concealed transfer approaches that match the architectural intent (e.g., jump ducts with discreet terminals, or concealed linear transfer slots).
*   **All-electric direction:** prefer heat-pump based HVAC (future solar offset) and avoid designs that depend on fossil fuel as the primary heating source.
*   **Multi-zone comfort (TBD during design):** single-story home; likely zones include a sleeping wing (including 8 ft kids-bedroom area) and main living areas, with flexibility for specialty rooms.
*   **Controls and integration are first-class goals:** the system must be fully operable locally and integrate into the home automation backbone (KNX + DALI-2).
*   **Prescriptive Ventilation Standards:** To ensure reliable variable-speed control via the automation bus, all ventilation fans (WHF, Attic, Bath) must utilize **EC Motors** with a **0–10V variable speed interface**.
*   **Smoke/Wildfire Safety Interlock:** The system must support a safety override that automatically shuts down all fresh-air ventilation and exhaust fans if outdoor PM2.5 levels exceed safety thresholds (e.g., during wildfire events).
*   **Serviceability without compromising finishes:** filters at air handlers (not behind architectural slots), and maintainable access for components that may need periodic service.

---

## 2. Suggested Technical Approaches & Prescriptive Standards

### 2.1 Architectural linear terminals (supplies, returns, transfers)
**Preferred characteristics:**
*   Mud-in / plaster-in / flush-install linear slot terminals with drywall-friendly frames (no surface flange).
*   Ability to align slots parallel to framing bays/joists and coordinate cleanly with lighting and trim.
*   Low face velocities at terminals to avoid hiss and “suction” noise, especially on returns and whole-house fan inlets.

**Examples (acceptable if they are truly mud-in / plaster-in and documented as such):**
*   **InviAir** (architectural frameless diffusers)
*   **FlowT** linear diffuser kits (mud-in/frameless style)
*   **Pacific Register** linear slot diffuser (pre-drywall / behind drywall style)

### 2.2 HVAC equipment strategy and automation integration
**Objective:** high-efficiency all-electric comfort with transparent local control and feedback for automation.
*   **Preferred Systems:** Premium variable-speed air-source heat pump systems (e.g., Mitsubishi Electric VRF or Daikin Fit/VRV).
*   **Local integration gateways:** Intesis or CoolAutomation (or equivalent), provided the interface is local and bi-directional.

### 2.3 Zoning approach (TBD)
*   Recommend an approach that is quiet, efficient at part-load, and compatible with architectural terminals.
*   Open to either multi-unit/multi-air-handler solutions or well-designed damper zoning.

### 2.4 Whole-house fan (WHF) - Prescriptive Standard
To serve the U-shaped floor plan effectively and ensure automation compatibility, the following hardware is mandated:
*   **Model:** **Two (2) QuietCool Trident Pro 7.0X** units.
*   **Configuration:** One unit per arm of the house to ensure even airflow distribution.
*   **Motor/Control:** Must be equipped with an **EC Motor** and a **0–10V variable speed interface**.
*   **Integration:** Variable speed will be driven via KNX/DALI-2 using **Sunricher SR-2401-10V** (converter) and **SR-2701S-DT7** (relay) modules.
*   **Installation:** Ducted approach with fans mounted in the attic using vibration isolation kits and architectural mud-in ceiling inlets.

### 2.5 Attic Exhaust Fans - Prescriptive Standard
Standardized gable exhaust to manage attic heat and prevent backpressure:
*   **Model:** **Four (4) QuietCool AFG PRO-3.0** gable-mounted fans.
*   **Configuration:** Two per gable end for balanced exhaust across the attic volume.
*   **Motor/Control:** **EC Motor** with **0–10V interface** for variable speed integration.
*   **Logic:** Programmed to assist WHF operation and prevent backdrafting when the house is pressurized.

### 2.6 Bathroom / Laundry Exhaust
*   **Approach:** Remote inline fans in attic (vibration-isolated) with architectural ceiling slots.
*   **Standard:** **Fantech FG/EC** inline class (or equivalent EC-motor unit).
*   **Control:** 0-10V variable speed for quiet baseline and automated "boost" modes.

---

## 3. Early Coordination Items
1.  **WHF/Attic Alignment:** Confirmation of inlet locations that align with framing and architectural intent.
2.  **Smoke Logic:** Verification of the "Recirculation Mode" pathway for HVAC when wildfire interlock is active.
3.  **Return/Transfer strategy:** Ensuring privacy and clean lines without visible grilles or door undercuts.
4.  **Automation Gateway:** Final selection of the local bi-directional gateway for the selected HVAC brand.

---

## 4. Reference Links
*   [InviAir](https://inviair.com)
*   [QuietCool Trident Pro Series](https://quietcoolsystems.com)
*   [Intesis Gateways](https://www.intesis.com)
*   [Sunricher DALI-2 Controllers](https://www.sunricher.com)
*   [Fantech EC Fans](https://www.fantech.net)

---
*End of design brief.*