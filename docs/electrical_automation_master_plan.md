# **Electrical Master Plan**

**Project Location:** 270 Bolla Ave  
**Version:** 1.2  
**Status:** Finalized Directive for Rough-In

**Note on Scope:** This document defines the High-Voltage (HV) infrastructure, hardware benchmarks, and structural rough-in requirements. It is not an exhaustive list of KNX or DALI-2 programming logic or specific device-level automation scenes.

---

## **1. Project Vision & Net-Zero Objective**

The primary objective of this project is to transition 270 Bolla Ave from a standard grid-tied residence to a Net-Zero, software-defined energy environment.

To achieve this, we are executing a phased build-out that ensures the home is operational today while physically and electrically prepping for a "Grid-Zero" or "Grid-Parallel" state in Phase 2/3. This strategy influences every wiring decision—prioritizing heavy-gauge paths and smart-panel telemetry to ensure that future solar and battery storage can offset 100% of the home's annual consumption.

*   **Phase 1 (Current):** Install 320A service, three SPAN Smart Panels, and the DALI-2/KNX Load Control infrastructure. Minimal wall switches (code-required only) to maintain aesthetic while sensor technology is finalized.
*   **Phase 2 & 3 (Future):** Integration of high-capacity Hybrid Inverters, a dedicated "Battery Wall," and Solar PV arrays to reach the Net-Zero goal.

**The Goal:** Phase 1 wiring must ensure this equipment can be dropped in without tearing open walls or resizing conduits.

## **2. Solar Integration & Hybrid Inverters (Phase 2/3)**

The system is designed to be "Solar Agnostic," meaning it can support either String (DC Coupled) or Micro-inverter (AC Coupled) configurations.

*   **The All-in-One Hub:** We are benchmarking for units like the EG4 18kPV or Sol-Ark 15K. These house the Solar Charge Controllers, Battery Inverter, and Automatic Transfer Switch (ATS) in a single unit.
*   **AC Coupling (Micro-inverters):** If Enphase or similar micro-inverters are used, the PV feed will land on the "Gen Input" or "Load Side" of the Hybrid Inverter. During a grid outage, the Hybrid Inverter creates a local grid signal to keep the micro-inverters producing power.
*   **DC Coupling (Strings):** Raw DC power from the roof can land directly on the Inverter’s MPPT inputs for maximum efficiency.
*   **Safety Requirements:** Space must be reserved next to the Inverter for a Rapid Shutdown Controller and a Physical PV Disconnect (exterior or near entrance) per local fire code.

## **3. The "Energy Wall" Master Plan (Garage North Wall)**

This layout ensures a clean, "server-room" look with zero rework required when Phase 2 equipment arrives.

### **Wall Prep & Finishing**
*   **Mounting Surface:** Insulate, install 3/4" CDX plywood directly to studs, and skin with Fire-Rated Drywall.
*   **Finish:** Paint with high-durability white semi-gloss for a professional, "clean-room" aesthetic.

### **Physical Placement (Left-to-Right)**
*   **Cluster 1 (Main Panels):** Recess the two Main SPAN Panels side-by-side.
*   **Center Space (The Hub):** Leave a 48" wide clear zone to the right of the SPAN panels for the Hybrid Inverter and auxiliary safety boxes (Rapid Shutdown/Disconnect).
*   **Lower Zone (Battery Bank):** Keep the floor-to-waist area clear below the inverter zone for future Battery Racks (e.g., EG4 PowerPro or server-rack stacks).

## **4. Conduit & Infrastructure Schedule (Phase 1 Prep)**

To avoid drywall cutting in Phase 2, the following conduits must be installed during rough-in:

*   **The "Super-Conduit":** Two (2) 2.5-inch primary conduits running behind the drywall from the SPAN panels to a large junction box/gutter at the future Inverter mounting height.
*   **Solar Roof-Runs:** Two (2) 1-inch EMT conduits running from the "Inverter Zone" in the garage to the attic/roof access point for future PV strings or AC feeders.
*   **Communication Path:** One (1) 3/4-inch conduit for data/comms between the Inverter Zone and the Main SPAN panels for CT clamp monitoring.

## **5. Panel Distribution & Labeling**

We are using three SPAN Smart Panels (96 total circuits) for total telemetry.

| Panel | Location | Primary Loads |
| :--- | :--- | :--- |
| **Main SPAN #1** | Garage | EV Chargers (60A), Induction Range (50A), Ovens (50A), HVAC. |
| **Main SPAN #2** | Garage | Kitchen, Laundry, LCP-1 Feeds (inc. 3x Spares). |
| **Sub-SPAN** | North Wall | Left Wing Rooms, LCP-2 Feeds (inc. 3x Spares), Pergola (18kW). |

**Labeling Standard:** All circuits must use printed magnetic tape labels. No hand-written ink or pen on panel covers.

## **6. The "LCP Rule": Automated vs. Manual**

Loads are separated based on switching logic to maximize data density.

### **Automated via LCP-1/LCP-2**
*   **Example Loads:** All lighting/accent LEDs, QuietCool Fans, motorized skylights, and towel warmers.
*   **Attic Service Loops:** Pull three spare NM-B-PCS Duo runs from each LCP (6 total) into the attic. Coil 10–15ft of slack and terminate in labeled 4" square junction boxes.
*   **Circuit Standard:** Use 15A circuits for LCP automation feeds.

### **Bypass LCP (Direct-to-SPAN)**
*   **Manual/Always-On:** Receptacles, HVAC, and Major Appliances (Fridge, Ovens, Range).

## **7. KNX Low-Voltage Infrastructure (30V Bus)**

*   **Universal Bus Routing:** KNX Green Bus wire routed through every wall in living areas at 48" AFF.
*   **Wall Service Loops:** 24-inch loose loops at the center of every wall segment.
*   **Documentation:** Loops must be photographed and measured from fixed corners before drywall.

## **8. Life Safety & Future Additions**

*   **Fire/CO Detection:** Dedicated 15A circuit for Nest Protect units (Smoke and Carbon Monoxide sensors).
*   **Pergola Heaters (18kW):** Three 30A 240V circuits on the Sub-SPAN. Monitored for grid-blending. A standalone DALI-2 control pair from LCP-2 triggers the contactors.

## **9. Technical Standards & Summary for Electrician**

*   **Main Service:** 320A (400A Class).
*   **Sub-SPAN Feed:** #1 AWG Aluminum (SER).
*   **Box Depth:** Standardize on 4-inch square, 2-1/8" deep steel boxes for all junctions to accommodate DALI relay pucks.
*   **Rule of Flow:** If it glows, moves, or heats, it flows through an LCP. Receptacles and major appliances go Direct-to-SPAN.
