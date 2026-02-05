# **Electrical Master Plan**

**Project Location:** 270 Bolla Ave  
**Version:** 1.3  
**Status:** Finalized Directive for Rough-In (Dual-Inverter Expansion)

**Revision Note (v1.3):** Updated to reflect the mandatory requirement for dual parallel hybrid inverters to support the 320A (400A class) service for full-house "Grid-Zero" backup. Expanded the "Energy Wall" hub zone to 72" to accommodate dual units and safety clearances.

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

## **3. The "Energy Wall" Master Plan (West Wall)**
**Logical Flow:** `Outside Grid` $\rightarrow$ `Meter` $\rightarrow$ `Main Panels` $\rightarrow$ `Solar/Battery Hub` (Left-to-Right)

This layout ensures a clean, "server-room" look with zero rework required when Phase 2 equipment arrives.

### **3.1 Zone A: Exterior (Outside Utility POC)**
*   **Smart Meter / Service Socket**: **Siemens MK0603S1400SCS** (400A Solar Load Center).
    *   **Dims:** 41.7" W x 43.7" H x 8.7" D (NEMA 3R).
*   **Emergency Disconnect**: 1x External lever (e.g., Siemens 200/320A) marked "EMERGENCY DISCONNECT, SERVICE DISCONNECT".
*   **PV Rapid Shutdown (RSD)**: 1x Red Mushroom Button marked "RAPID SHUTDOWN SWITCH FOR SOLAR PV SYSTEM".
    *   **"Firefighter Cluster"**: Both external switches (Disconnect + RSD) must be grouped together near the designated responder access point.
    *   **Total Kill Function**: The RSD button is wired to the **Inverter E-Stop** loop. Pressing it performs a "Hard Stop," cutting battery output and solar input simultaneously.
    *   **Security Strategy**: Locate behind a gated service area if possible, but *never* locked (NEC 690.12). Security cameras monitor this sensitive zone.
*   **Rough-In Policy**: Install the RSD back-box and conduit during Phase 1. If not installing the inverter immediately, a blank cover or non-functional button (labeled "FUTURE") is acceptable, but the conduit path to the future Inverter location must be established.

### **3.2 Zone B: Main Distribution (Inside - Left)**
*   **Equipment:** 2x **SPAN Smart Panel (Gen 2)**.
*   **Mounting:** Recessed/Semi-Flush with Drywall.
*   **Dimensions (Each):** 14.3" W x 39.3" H x 6.0" D.
*   **Spacing:** **4" to 6" lateral gap** between panels (Exceeds 3" min).
*   **Total Width:** ~36" total zone width.

### **3.3 Zone C: The "Inverter Hub" (Inside - Center)**
*   **Equipment:** 2x **All-In-One Hybrid Inverters** (Paralleled).
*   **Selection:** **EG4 18kPV** (Preferred "Best in Class" for Reliability/Value).
    *   *Why EG4 over Sol-Ark?* The EG4 18kPV offers superior "Grid-Zero" native integration with the EG4 PowerPro WallMount batteries (Category 5 closed-loop communication). This eliminates "finger-pointing" between inverter and battery vendors.
*   **Dimensions (Each):** 20.5" W x 34.3" H x 11.2" D.
*   **Spacing:** **12" minimum clear space** between units for thermal airflow.
*   **Layout:** Inverter 1 $\rightarrow$ 12" Gap $\rightarrow$ Inverter 2.
*   **Total Width:** ~53" minimum.

### **3.4 Zone D: Battery Bank (Inside - Bottom)**
*   **Location:** Directly BELOW Zone C (Floor to Waist).
*   **Capacity:** Reserved for Server Rack Batteries or Wall-Mount PowerPros.
*   **Keep-Out Zone:** **60" Wide x 24" Deep** (Extended off wall).
*   *Caution:* Verify 24" encroachment does not block garage vehicle doors.

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
