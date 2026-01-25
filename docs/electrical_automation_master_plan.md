# **Electrical & Automation Master Plan: Phased Build-Out**

**Project Location:** 270 Bolla Ave

**Status:** Finalized Directive for Rough-In

**Note on Scope:** This document is intended to define the High-Voltage (HV) infrastructure, panel distribution, and structural rough-in requirements. It is not an exhaustive list of KNX or DALI-2 programming or device-level requirements.

## **1\. Project Vision & Phasing Strategy**

The home is transitioning from a standard grid-tied residence to a software-defined, battery-first environment. We are executing this in stages to ensure the home is operational now while making future high-power upgrades effortless.

* **Phase 1 (Current):** Install 320A service, three SPAN Smart Panels, and the DALI-2/KNX Load Control infrastructure. We will have minimal wall switches (only what is strictly required by code) to maintain a clean aesthetic while sensor technology is finalized.  
* **Phase 2 & 3 (Future):** Integration of a high-capacity Hybrid Inverter, a dedicated "Battery Wall," and Solar PV arrays.

**The Goal:** Phase 1 wiring must ensure this equipment can be dropped in without tearing open walls or resizing conduits.

## **2\. Garage Infrastructure (The "Energy Hub")**

Strategic use of garage wall space is critical. We are planning a dedicated **"Energy Wall"** (approximately 48" x 60") for the future inverter and solar equipment, plus a separate **"Battery Wall"** area.

### **Wall Prep & Finishing**

* **Reinforced Mounting Surface:** Fully insulate, drywall, and paint the North wall of the garage.  
* **Plywood Backing:** Before drywall installation, install 3/4-inch CDX Plywood backing directly to the studs.  
* **Rationale:** This allows for secure mounting of the heavy Inverter (\~120 lbs) and future Battery stacks anywhere on the wall without being limited by stud locations, ensuring a professional, finished look.

### **Conduit & Wiring Prep**

* **Conduit Upsizing:** Use 2.5-inch primary conduits between the panels and the future inverter location to allow for effortless pulling of heavy-gauge wire later.  
* **Sub-Panel Feeder:** For the 100A feed to the North Wall (Sub-SPAN), use \#1 AWG Aluminum (SER).  
* **Main Service Entry:** The 320A (400A Class) service feeds the main panels. In Phase 2, this will pass through the Hybrid Inverter as the primary power mixer.

## **3\. Panel Distribution & Labeling**

We are using three SPAN Smart Panels (96 total circuits) to ensure total telemetry.

| Panel | Location | Primary Loads |
| :---- | :---- | :---- |
| **Main SPAN \#1** | Garage | EV Chargers (60A), Induction Range (50A), Ovens (50A), HVAC. |
| **Main SPAN \#2** | Garage | Kitchen, Laundry, **LCP-1 Feeds (inc. 3x Spares)**. |
| **Sub-SPAN** | North Wall | Left Wing Rooms, **LCP-2 Feeds (inc. 3x Spares)**, Pergola (18kW). |

**Labeling Standard:** All circuits in all panels must be labeled using **printed magnetic tape labels**. Hand-written ink or pen on the panel covers is prohibited.

## **4\. The "LCP Rule": Automated vs. Manual**

To maximize data density, loads are separated based on how they are switched.

### **Automated via LCP-1/LCP-2 (Example Loads)**

Generally, any load that glows, moves, or heats (and lacks internal logic) is a candidate for LCP integration.

* **Required Loads:** All lighting/accent LEDs, QuietCool Fans, motorized skylights, and towel warmers.  
* **Attic Service Loops (Future Proofing):** Pull **three spare NM-B-PCS Duo (14/2 \+ DALI pair)** runs from each LCP (**6 total**) into the attic space.  
  * **Execution:** Coil 10–15 feet of slack in a central, accessible attic location.  
  * **Termination:** Per code, these must be terminated in a labeled 4-inch square junction box with a cover. Do not leave "loose" ends outside of a box.  
* **Circuit Standard:** Use 15 Amp circuits for LCP automation feeds. This facilitates the use of Southwire NM-B-PCS Duo.

### **Bypass LCP (Direct to SPAN)**

Only "always-on" loads or those with internal controls:

* Receptacles.  
* HVAC.  
* Major Appliances (Fridge, Ovens, Range, etc.).

## **5\. KNX Low-Voltage Infrastructure (30V Bus)**

The control layer for the home utilizes a 30V KNX bus. To support a "minimalist switch" aesthetic today while allowing for full manual control tomorrow, we are implementing a "Wall-Tap" service loop strategy.

* **Universal Bus Routing:** The KNX Green Bus wire must be routed through **every wall** in every living area at a standard switch height (typically 48" AFF).  
* **Wall Service Loops:** At the center of every wall segment (or designated entry points), provide a 24-inch service loop coiled loosely behind the drywall.  
* **Tapping Logic:** Loops must not be pulled tight. They should have enough slack to be fished or pulled to a different location on that same wall segment if a switch is added later.  
* **Documentation:** The exact location of these loops must be photographed and measured from a fixed point (e.g., corner or door frame) before drywall installation to ensure they can be located via magnet or measurement.

## **6\. Life Safety & Future Additions**

* **Fire/CO Detection:** A separate, dedicated 15A circuit for Nest Protect units (Smoke/CO/![][image1]) throughout the house.  
* **Pergola Heaters (18kW):** Three 30A 240V circuits landed on the Sub-SPAN. These are monitored for grid-blending but are not routed through the lighting LCPs. A standalone DALI-2 control pair will be pulled from LCP-2 to trigger the contactors.  
* **Trash Compactor:** Removed from scope. (Circuit \#13 from original Right Wing notes is deleted).

## **7\. Technical Standards for the Team**

* **Strict Load Separation:** Receptacles and Lighting must never share a circuit.  
* **No Switch Legs:** Do not pull traditional switch-leg wires to every wall. Install only the minimum code-required switches.  
* **Box Depth:** Standardize on 4-inch square, 2-1/8" deep steel boxes for all junctions to accommodate DALI relay pucks.  
* **Conduit Hub:** Ensure all 2.5-inch conduits terminate in a large junction box or "gutter" near the future inverter location for easy Phase 2 integration.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAYCAYAAACWTY9zAAAB/0lEQVR4Xu2WzStEYRTGRyx8laRpar7uNJOyUZIF8g/IioW1lIVsbG2kKTvKQkopCwshZSPKzh9gYeljJQkbFhrfPGfmvDo93bkzlCzMr05z7/Occ9/zvve9904oVOE/EI/HY6lUahKxnEwm0073PK/X5vmBmg7krSDmcFrD/o/AxdYQH4hTxAAabMXvEuIK0SMe1zgwgX34OUS/nCcSiS4cvyAuOPdbaEPv6XS6iT2swpT4+D1mLxaLtWjtPHuCepeslwUKX4NWQ9ABhqwWjUbrteFNq1vgZyUHK9rMXiAoupNC3LY69ix+jUN789MtaKhPJzXBXlHQTLvO+IQ9hhvAgNNaO2N1BjmDumI77BXFzdhvX5VCVyFwtQSv8ITKBBbYK0q5F/ej3FqXh8ba2CtKuRdncFuGtbbkq4DHQIO1nu5rxKzNdVSrec0Gw82bDb1ndQb+ouZljXZkjl/Q6IY7/0KLAlcMhd2IEda19ox1i+Y8shYOhxvl2L0frZ8H4rka1ewpsqo3LAqlJgXvOcgX4O8inljPowO8hqg5aJ2IW6tZ3Bsft3WVrCq5XlCtQ+ojkUgD618g4UAblHjQAcc4j9GNLN9DeeoOtaFcJpNJcC6DvPufvKZ+lVThm5v/54EGt8j+G9DIOmJUHijEuEcPx59htoyLbc6pUOE3+QQuj63JW7iPLgAAAABJRU5ErkJggg==>