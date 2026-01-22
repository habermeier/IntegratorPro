# Whole-Home Low-Voltage + Load-Control Installation Standard
## KNX + DALI-2 (Residential)

**Project:** Residential Retrofit/New Build (Contra Costa County, CA)  
**Document Purpose:** Single standard for boxes, cabling, mixing rules, and load-control patterns  
**Revision:** v2.1 (Programming clarifications)  
**Date:** January 21, 2026

---

## 0. Desired Outcomes and Design Rationale
This document intentionally avoids an 'approved/not approved' posture. If an alternate box/cable/device is preferred by the electrician, use the vetting checklist in Section 9 (Listing, ratings, fit, and DALI-2 Verified for any device on the DALI bus) and record the final choice in the project BOM/as-built set.

**Deviation handling:**
- **Owner:** will provide device registration, addressing, and programming/commissioning for the automation system (DALI short addresses, group/scenes, KNX programming), and will maintain the as-built documentation. **All logic and software configuration is the responsibility of the Owner.**
- **Electrician:** propose practical, code-compliant implementation details and equivalent listed products where needed; coordinate routing, box fill, conductor derating, and all line-voltage terminations. **Does NOT include system programming.**

**Roles and collaboration:**
- Standardize repeated patterns across the house (same box families, consistent labeling, repeatable LCP layout) to reduce install risk and simplify maintenance.
- Prefer DALI-2 daisy chaining/branching where it reduces copper runs and improves flexibility, while prohibiting DALI loops (no rings/meshes).
- Prefer open standards and open procurement. KNX and DALI-2 are used because they are interoperable, multi-vendor ecosystems. Lutron is not used because it is a walled garden.
- Dimming everywhere for lighting loads. Decorative fixtures with replaceable bulbs are acceptable; lamp selection can be adjusted by the Owner to achieve the desired dimming quality.
- Full home automation for all electrical loads (lighting, fans, exhaust, heaters, and other fixed equipment), with each load individually addressable and controllable.

**Desired outcomes:**
This document communicates the Owner's project goals and the preferred implementation patterns for a whole-home KNX + DALI-2 system. It is intended as an input to the electrician for (a) coordinated rough-in decisions and (b) a cost estimate. The electrician remains the expert of record for code compliance, installation methods, and final equipment selection.

---

## 1. Scope and Non-Negotiables

### 1.1 Scope
Applies to all KNX and DALI-2 load-control work in this home, including any junctions or ceiling/wall boxes that contain control modules or mixed-voltage splices.

### 1.2 Non-negotiables (Hard NO list)
- Standardize on the box family, ceiling box standard, and DUO cable method. If an alternate is proposed, validate it against Section 9 and record the decision in the project BOM.
- **No plastic boxes** at mixed-voltage load-control locations.
- **No non-fan-rated boxes** at ceiling outlets that could reasonably receive a ceiling fan now or in the future.
- **No field-created DUO bundles** (taping separate cables together). Use only listed power+control assemblies where required.
- **No DALI bus loops** (ring/mesh). Branching is allowed; closed loops are not.

---

## 2. Code Basis and Inspection Philosophy (California)
Work must pass inspection under the California Electrical Code (CEC) as adopted by the local AHJ. The licensed electrician remains responsible for final box-fill calculations, conductor derating, and enforcing the manufacturer instructions and listings for every installed component.

**Key inspection themes this standard is designed to satisfy:**
- Listed and labeled equipment used per instructions (NEC/CEC 110.3(B)).
- All junctions remain accessible (NEC/CEC 314.29).
- Appropriate separation or approved mixing method for Class 1 and Class 2/Class 3 conductors (NEC/CEC 725).
- Ceiling fan support boxes are listed and marked for fan support where applicable (NEC/CEC 314.27).

---

## 3. Box and Enclosure Standards

### 3.1 Box Standard (House Default)
To maximize consistency, serviceability, and future flexibility, standardize on roomy UL/cULus Listed steel boxes and a small set of accessories across the entire house. 
- **Default box:** Use a 4-inch square, ~2-1/8-inch deep steel box (or closest readily-available equivalent) for most junctions/rough-in locations, including in-wall (2×4 / 3.5-inch studs) and attic work.
- **Downsize by opening, not by box:** Use mud rings/plaster rings to adapt the same box to 1-gang, 2-gang, or fixture openings instead of changing box families.
- **When in doubt, add volume:** Use extension rings (or a larger box) rather than overfilling a small box.
- **Safety note:** Any ceiling outlet that may support a fan must use a listed fan-rated box appropriate for the installation.

### 3.3 Mixed-voltage boxes (line voltage + DALI/KNX in the same box)
This project allows and often requires mixed boxes (example: DUO cable in, DALI-2 relay module in-box, line-voltage load out).
- **Preferred default:** all DALI/KNX conductors present in any box that also contains line voltage are 600V-rated (or remain inside a listed 600V-rated assembly such as MC-PCS Duo).
- **Alternate:** use a listed barrier/partition system (example: RACO 885 partition cover) to separate compartments. If a listed barrier is not available for that configuration, use a separate box.
- Neat dressing, bonding/grounding, and no exposed SELV-only insulation are required in mixed boxes.

### 3.4 UL Recognized modules inside listed boxes
UL Recognized (UR) control modules are allowed only when installed inside a UL/cULus listed box per the module manufacturer instructions and Conditions of Acceptability (COA). Provide documentation to the AHJ if requested.

### 3.5 Load Control Panels (LCPs)
**Purpose:** Provide a clean, serviceable, repeatable "control node" near groups of loads (especially high-current or many LED strip loads).
**LCP requirements (Office / recessed LCP-2):**
- Max cabinet depth: 4.0 in total installed depth (3.5 in stud + 0.5 in drywall).
- Hardware mounting: All devices installed inside LCP-2 MUST be DIN-rail mountable, and shall fit within the 4.0 in depth with wiring and bend radius.
- Safety listing: Enclosure must be UL 50/50E Listed (Type 1) or equivalent; maintain line-voltage vs control separation per NEC using listed barriers/ducting as needed.
- Cable strategy: Bring HV feed(s) in, then distribute as needed. Bring DUO (power+control) or separate conductors out to loads; label every departure.

**Office LCP-2 physical constraints (between studs):** 14.5 in clear stud bay width; 39 in max height below fire-block. Recommended standard enclosure sizes:
- nVent HOFFMAN ASE24X12X4NK (24×12×4 in, Type 1, UL File E27525)
- nVent HOFFMAN ASE12X12X4 (12×12×4 in, Type 1; use as auxiliary expansion below 39 in)

---

## 4. Cable, Splices, and Labeling

### 4.1 DUO / combined power + control cable
Where power and DALI/KNX control share the same pathway or box, cable must be a listed power+control assembly.
- **Southwire MC-PCS Duo (Type MC)** for armored runs.
- **Southwire NM-B-PCS Duo (Romex)** where NM cable is permitted.
- All conductors are 600V-rated by listing.

### 4.2 Approved splice/connect methods
Use listed connectors rated for the conductor sizes and voltage present. In mixed boxes, treat all splices as 600V wiring method.

| Use case | Approved connector family | Typical conductor range | Notes |
| :--- | :--- | :--- | :--- |
| DALI/KNX pair splices | WAGO 221 series (lever nuts) | 24-12 AWG copper | 600V rated; keep DA pair together |
| Branch-circuit power splices | WAGO 221 series or wirenuts | 12/14 AWG copper | Match wire count and gauge |
| Ground/bond splices | Listed grounding pigtail + WAGO | Per EGC size | Bond box; use green screws |

### 4.3 Labeling (Required)
Label every box and every DUO cable run with printed heat-shrink or durable wrap labels.
- Branch circuit ID (panel/breaker, circuit number).
- Load served (room + device).
- DALI universe/line ID and direction (Upstream/Branch A/Branch B).

---

## 5. DALI-2 Bus Architecture and Topology

### 5.1 Design limits
- 64 addressed devices per bus.
- Bus power supply current up to 250 mA.
- Practical line length around 300 m with 16 AWG conductors.

### 5.2 Allowed vs prohibited topologies
- **Allowed:** line, tree, and star.
- **Prohibited:** any topology that creates a closed loop/ring/mesh.

### 5.3 Standard "DALI Tree Junction" node (T-junction)
**Purpose:** create a clean way to split a DALI trunk into two downstream branches.
- Use a 4-11/16 inch square steel box (RACO 254/257).
- Bring in 1 upstream DUO cable and 2 downstream DUO cables.
- Splice power conductors per normal practice.
- Splice DALI conductors DA/DA across all three cables using WAGO 221 (600V).
- **Wiring diagram (conceptual):** `[Upstream trunk]----(Node)----[Branch A]` with `[Branch B]` connected at the node.

### 5.4 Standard "DALI Tree Junction" node (4-way / X-junction)
Use when you need 3 downstream branches. Same box and method as T-junction. Avoid large stars; keep branching deliberate.

### 5.5 Loop prevention and field verification
- **As-built tree diagram:** every DALI run has exactly one upstream source.
- **Continuity sanity check:** with bus power disconnected, verify no cross-connection between branches.
- **Label audit:** every junction node has labeled branches.

---

## 6. Approved Control Hardware (Vendor-Neutral)

### 6.0 Universal Dimming Requirement
- **DALI-2 verification (required):** Any device connected to the DALI bus MUST be listed in the DiiA DALI-2 Product Database.
- **Safety listing:** Device must be UL/cULus Listed or UL Recognized (with COA).

**Table 6-1: Benchmark Lighting Control Devices**

| Category | Benchmark Device | DALI-2 (DiiA) | UL/ETL Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Phase dimming | Sunricher SR-2303SAC-HP | ID 5831 | File E477171 | Micro module; watch min-load |
| CC Driver | eldoLED SOLOdrive 360/S | ID 371 | UR Component | 0.1% class; flicker-free |
| LED Strips | Lunatone DT8 Dimmer + Mean Well PSU | ID 10471 | Verified Listed | Centralized in LCP |
| 0-10V bridge | Sunricher SR-2401-10V | ID 3065 | File E477171 | Signal-only; keep relay separate |

**Table 6-2: Power & Switching Loads**

| Category | Benchmark Device | UL Evidence | Relay Rating | Bus Load |
| :--- | :--- | :--- | :--- | :--- |
| Relay Puck | SR-2701S-DT7 | File E477171 | 4.3A Resistive | 18 mA |
| 4-ch DIN Relay | SR-2701DIN-DT7 | File E477171 | 12A per ch | 2 mA |

**Switching Module Comparison Table:**

| Category | Example model | Function | Listing | Notes |
| :--- | :--- | :--- | :--- | :--- |
| DALI-2 -> 0-10V + relay | NICOR IMS3D0-10VRLY | DT5 + DT7 | cULus Listed | Default for 0-10V |
| DALI-2 -> 0-10V + relay | LOYTEC LDALI-RM6 | DT5 + DT7 | cULus Listed | 1/2-inch nipple box mount |
| DALI-2 relay-only | Wattstopper WA-DALI-SWITCH-SO | DT7 | UL Listed | 3-channel relay |
| High-current relay | Functional Devices RIB2401B | External | UL Listed | Use for motors; 1/2-inch nipple |
| Contactor | Eaton C25 series | Contactor | UL Recognized | Use in LCP for 40-50A class |

---

## 7. Standard Installation Patterns

### 7.1 Pattern A: 0-10V dimmable driver/fixture + hard on/off
Use DALI-2 to 0-10V converter with integrated relay local to the load.

### 7.2 Pattern B: Relay-only on/off
Use DALI-2 relay module. For motors, drive a motor-rated relay (RIB) or contactor coil.

### 7.3 Pattern C: High-current loads (heaters, large motors)
Place the switching device in the nearest LCP (DIN rail). Use DALI-2 relay output to control a contactor/relay coil. **LCP depth limit is 4.0 inches.**

### 7.5 Ceiling fans and fixtures
Ceiling outlet uses the fan-rated box standard. Canopy volume must be confirmed for control modules.

### 7.6 Pattern E: LED strip lighting (DT8 tunable white)
Centralized drivers in LCP. Minimum zoning: one zone per room. Smooth dimming to low levels required.

---

## 8. HVAC Coordination
- HVAC Class 2 control wiring must not share boxes with line voltage unless 600V-rated.
- Switched line power (exhaust fans, heaters) must use rated relay/contactor.
- All HVAC-related junctions must remain accessible (do not bury in insulation).

---

## 9. Vendor and Part Vetting Process (Required)
1. **Listing status:** UL/cULus Listed preferred.
2. **Ratings:** Confirm resistive and inductive/motor ratings at 120/240/277V.
3. **Mechanical fit:** Confirm fit in approved box with bend radius.
4. **DALI-2 compatibility:** REQUIRED (DiiA entry).
5. **Open procurement:** Confirm open-market availability.
6. **Documentation packet:** Store datasheet + instructions + listing evidence.

---

## Appendix A. Field Checklists

### A1. Electrician checklist (rough-in)
- 4-11/16 inch steel boxes + listed rings/covers used.
- Fan-rated boxes at all ceiling outlets.
- 600V-rated control conductors in mixed boxes.
- DALI junction nodes labeled and accessible.

### A2. Owner/commissioning checklist
- Record DALI addresses and branch node IDs.
- Confirm bus current/address limits.
- Photo capture of every junction node before closing.

---

## 10. Model Selection (Standard Units)

This section defines specific hardware models selected as the "Project Standard." To maintain architectural consistency and minimize visual clutter, these models must be used for all repeated load types unless a specific deviation is recorded in the project BOM. This specifies the models only, not the quantities or locations.

**Programming Note:** All device addressing, bus commissioning, and logical grouping (KNX/DALI) will be performed by the Owner.

### 10.1 Recessed "Canned" Lighting (Standard Downlight)
The project standard for all recessed architectural downlighting is the **DMF X-Series**. This system is selected for its modularity and high-quality DALI-2 integration.

- **Visual Goal:** Minimize the visual aspect of the fixture on the ceiling.
- **Specified Trim:** Use the **White insert / reflector** (`X2TSDSWHFL`) to provide a clean, integrated look that minimizes the visual presence of the light aperture.
- **Specified Components:**
  - **Housing:** `X2NCS` (New Construction Square Housing).
  - **Mud-in Plate:** `X2KSMUD` (Square Flangeless Mud-In Kit).
  - **Trim:** `X2TSDSWHFL` (Square Flangeless Trim with White Insert).
  - **Light Module:** `XMD` (DALI-2 LED Module, 1250lm, 3000K, Wide Flood).

### 10.2 Ceiling Fans
The project standard for ceiling fans is the **Big Ass Fans Haiku**. 

- **Control Interface:** Every fan unit must be equipped with the **0-10V control interface** (Part Number: **010447** for current Haiku models) for variable speed and light integration. 
- **Wiring Requirements:** Two separate 0-10V analog channels are required per fan:
  - **Channel 1 (Fan Speed):** 10V = 100% speed, 0V = Off.
  - **Channel 2 (Light Intensity):** 10V = 100% brightness, 0V = Off.
- **Bridge Integration:** Both signals are bridged to the DALI-2 bus using listed DALI-to-0-10V bridges (benchmark: Lunatone/Sunricher). Note that installing the 010447 module disables the factory remote and mobile app control in favor of the automation system.
- **Specified Units (Two Versions):**
  - **Haiku (No LED Light):** Standard fan assembly. Only the Fan Speed channel is utilized.
  - **Haiku (with LED Light):** Fan assembly with integrated LED. Both Speed and Light channels are utilized.

### 10.3 Bathroom and Laundry Sensors (Environmental Multisensors)
The project standard for indoor environmental sensing and presence detection in bathrooms, toilets, and the laundry room is the **Steinel True Presence Multisensor KNX**.

- **Model Specification:** Steinel True Presence Multisensor KNX (Flush Version).
  - **Article Numbers:** #056353 (White) or #086060 (Black).
  - **Sensors:** True Presence (radar-based), VOC (odors/volatiles), CO₂, Humidity, Temperature, Air Pressure, and Brightness.
  - **Power:** Low-voltage KNX bus-powered only.
- **Visual & Mechanical Integration:**
  - **Mounting:** Flush ceiling install using standard US 4-inch round remodel boxes (or equivalent with depth ≥33 mm).
  - **Placement Logic:** Position sensors centrally or offset directly near/under the **linear architectural exhaust diffusers**. This ensures optimal capture of rising odors and humidity while assisting the airflow "updraft" sensing.
- **Specific Locations:**
  - **Master Bathroom Toilet Room:** Above/near the toilet, adjacent to the linear diffuser.
  - **Master Bathroom Main Area:** Near the shower/tub linear exhaust (radar ensures lights/fans stay on during stationary shower use).
  - **Dedicated Guest Toilets:** Above the toilet / near the linear diffuser.
  - **Laundry Room:** Positioned near the cat litter box and primary exhaust vent to handle ammonia and humidity spikes.
- **Control Logic (Ventilation Integration):**
  - **Presence Detection:** Triggers the exhaust fan to "Low/Quiet" speed.
  - **Environmental Thresholds:** High VOC, CO₂, or Humidity levels trigger the fan to "High/Boost" speed until levels return to the setpoint baseline.
- **System Architecture:**
  - Assign physical addresses hierarchically across the Load Control Panels (LCPs).
  - Share group addresses for coordinated fan control across the KNX/DALI bridge.
  - Use Line Couplers or IP Routers for reliable communication between panels.