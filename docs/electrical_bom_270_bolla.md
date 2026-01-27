# **Project Bill of Materials (BOM) - 270 Boll Ave**

**Project Name:** 270 Boll Ave  
**Document Type:** Integrated Systems Specification  
**Integrator Draft:** v1.2 (Standardized Infrastructure)

---

## **Revision History**
| Version | Date | Description | Status |
| :--- | :--- | :--- | :--- |
| v1.0 | 2026-01-26 | Initial Draft (Core Infrastructure) | Archived |
| v1.1 | 2026-01-27 | Panel Consolidation & Door Entry Re-Spec | Archived |
| v1.2 | 2026-01-27 | Unified DC Security Island & Environmental Hub | **Current** |

---

## **1. Project Objectives & System Organization**
The automation system at 270 Boll Ave is designed for maximum reliability, security hardening, and high-fidelity environmental control. The architecture is organized into three localized **Load Control Panels (LCPs)** to minimize home-run copper and isolate failure domains:

*   **LCP-1 (Garage)**: The "Power Hub" for central living areas, kitchen lighting, and high-inrush holiday circuits.
*   **LCP-2 (Office 2)**: The "Environmental Hub" and Master Wing controller. Houses weather station logic, PM2.5 wildfire interlocks, and master bedroom lighting.
*   **LCP-3 (Tech Room)**: The "Security Island." A 100% battery-backed, DC-powered enclosure that manages 3D face recognition and entry without cloud dependency.

**Core Standards**: All lighting is **DALI-2** (addressable). All logic and switching is **KNX** (distributed). Infrastructure is "Future-Proofed" via stealth pre-wiring for window shades and seasonal exterior lighting.

---

## **Section 1: High-Voltage (HV) Infrastructure**
*Main Service & Smart Panel Telemetry*

| Part ID | Manufacturer | Description | Qty | Location | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SPAN-GEN2 | SPAN | Smart Panel Gen 2 (32-Circuit) | 2 | Garage | Main Service (Side-by-side) |
| SPAN-SUB | SPAN | Smart Panel Gen 2 (32-Circuit) | 1 | North Wall | Sub-Panel for Left Wing |
| SER-1-AL | Generic | #1 AWG Aluminum SER Cable | - | Field | Sub-SPAN Feed from Main |
| NM-B-12/2 | Southwire | 12/2 Romex (High Current Loads) | - | Field | Direct to SPAN (Fridge, Range, etc) |

---

## **Section 2: Load Control Panel 1 (LCP-1) (Garage) - Kitchen/Main Hub**
*The automation core for the central living areas.*

| Part ID | Manufacturer | Description | Qty | MPN | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SAG-24H2408 | Saginaw | 24x24x8 NEMA 4/12 Enclosure | 1 | SCE-24H2408LP | Hinged Cover |
| MW-SDR-480 | Mean Well | 480W 24V DC PSU (UL 508) | 1 | SDR-480-24 | Main Logic Power |
| ABB-KNX-PS | ABB | KNX Power Supply 640mA | 1 | SV/S 30.640.5.1 | Powers Line 1.1 |
| ABB-LK-S | ABB | KNX Line Coupler | 1 | LK/S 4.2 | Connects 1.1 to Backbone |
| PHX-CBM-E4 | Phoenix Contact | Electronic Circuit Protector | 1 | CBM E4 24DC | NEC Class 2 Compliance |
| SIE-DALI-GW | Siemens | KNX/DALI Gateway Twin | 1 | N 141/03 | Universes 1 & 2 |
| ELD-PWR-100 | eldoLED | 100W DALI-2 LED Driver | 6 | 1060/A | Garage/Kitchen/Living Tape |
| LUN-DALI-010 | Lunatone | DALI 0-10V PWM Interface | 1 | 86458668 | Powder Room Fan Control |

---

## **Section 3: Load Control Panel 2 (LCP-2) (Office 2) - Master Wing Hub**
*The automation core for the Master Bedroom, Bedrooms 3/4, and local environmental logic.*

| Part ID | Manufacturer | Description | Qty | MPN | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| HOF-ASE24X12X4 | nVent HOFFMAN | **Automation Enclosure** (24x12x4) | 1 | ASE24X12X4NK | LCP-2 Top Box (DIN Rail) |
| HOF-ASE12X12X4 | nVent HOFFMAN | **Network/Aux Enclosure** (12x12x4) | 1 | ASE12X12X4 | LCP-2 Bottom Box (Switches) |
| ONL-FAC-201 | OnLogic | **Industrial DIN-Rail PC** | 1 | FR201 | **Master Logic Controller** (LCP-2) |
| ABB-KNX-PS | ABB | KNX Power Supply 640mA | 1 | SV/S 30.640.5.1 | Powers Line 1.2 |
| ABB-LK-S | ABB | KNX Line Coupler | 1 | LK/S 4.2 | Connects 1.2 to Backbone |
| SIE-DALI-GW | Siemens | KNX/DALI Gateway Twin | 1 | N 141/03 | Universes 3 & 4 |
| ELD-PWR-100 | eldoLED | 100W DALI-2 LED Driver | 6 | 1060/A | Master Bed Accent/Coves |
| LUN-DALI-010 | Lunatone | DALI 0-10V PWM Interface | 4 | 86458668 | Bath/Laundry Fan Controls |

---

## **Section 3.1: Load Control Panel 3 (LCP-3) (Tech Room) - Door Entry MDF**
*The centralized "Security Island" - 100% DC-backed for maximum uptime.*

| Part ID | Manufacturer | Description | Qty | MPN | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SAG-24H2408 | Saginaw | 24x24x8 NEMA Enclosure | 1 | SCE-24H2408LP | Hinged Cover (Security MDF) |
| ALT-EFLOW104N| Altronix | 10A Power Supply/Charger | 1 | eFlow104N | **System Core**: Managed DC Rail |
| BATT-12AH | Yuasa | 12V 12Ah SLA Battery | 2 | NP12-12 | 24V String (Powers NUC/Switch/Locks) |
| MW-DDR-60G-19| Mean Well | 24V to 19V DC-DC Converter | 1 | DDR-60G-19 | DIN-Rail Power for NUC |
| ASUS-NUC-13 | ASUS | NUC 13 Pro (i5, 16GB RAM) | 1 | NUC13ANKi5 | **Security Brain** (SDMC Server) |
| TPL-ISC1008P | TP-Link | Industrial 8-Port PoE+ Switch | 1 | TL-ISC1008P | DC-Input (12-55V) PoE Source |
| AKU-SR01 | Akuvox | Secure Relay Module | 4 | SR01 | DIN-Rail Mounted via Clips |
| ABB-BIN-16 | ABB | 16-fold Binary Input | 1 | BE/S 4.20.2.1 | Security/Status Monitoring |

---

## **Section 4: KNX Infrastructure (Field)**
*User Interfaces and Sensors*

### **4.1 Backbone & IP Connectivity**
| Part ID | Manufacturer | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- |
| ABB-IPS-S | ABB | KNX IP Interface Secure | 1 | IPS/S 3.1.1 (In LCP-2) - High-Speed Logic Link |
| ABB-USB-S | ABB | KNX USB Interface | 1 | USB/S 1.2 (In LCP-2) - Local Diagnostic Backup |
| ABB-PS-160 | ABB | KNX Power Supply 160mA | 1 | Powers the Main Backbone Line |

### **4.2 Sensors (Environmental & Presence)**
| Product ID | Manufacturer | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- |
| STE-TP-KNX | Steinel | True Presence Multisensor KNX | 4 | Primary Bath, Guest, Bath 3, Laundry |
| ABB-BIN-16 | ABB | 16-fold Binary Input | 2 | Door/Window Contacts (In LCPs) |

### **4.2 User Interfaces & Cabling**
| Part ID | Manufacturer | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- |
| BAS-SENT-4 | Basalte | Sentido (4-Button) Switch | 12 | Minimal code-required placement |
| BAS-BUS-COU | Basalte | KNX Bus Coupler for Sentido | 12 | Required for switch connection |
| CAB-KNX-G | Unitronic | KNX Green Bus Cable (UL) | 1 | 1000ft Spool |
| WAG-KNX-CONN | Wago | KNX Push-Wire Connectors | 2 | Red/Black (Boxes of 50) |

---

## **Section 5: Network & AI Compute (Office 2 / MDF Hub)**
*Secondary compute and data storage in rack.*

| Part ID | Manufacturer | Description | Qty | MPN | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ASUS-NUC-AI | ASUS | NUC 13 Pro (i7, 32GB RAM) | 1 | NUC13ANKi7 | **AI Compute Node** (Pattern Learning/LLM) |
| SSD-990-4TB | Samsung | 990 Pro 4TB NVMe SSD | 1 | MZ-V9P4T0BW | High-endurance for AI/Logging |
| UI-SW-PRO-24 | Ubiquiti | UniFi Pro Max 24 PoE | 1 | USW-Pro-Max-24-PoE | Core PoE Backbone |
| UI-CAM-G5P | Ubiquiti | G5 Professional 4K Camera | 12 | UVC-G5-Pro | |
| CYB-PDU-1U | CyberPower | 1U Rack PDU | 1 | | Powers Server & Network Gear |
| APC-UPS-1500 | APC | Smart-UPS 1500VA | 1 | SMT1500C | Backup for Linux Box & AI Nodes |

---

## **Section 6: Ventilation & Fans**
*Whole-House, Attic, and Bathroom Exhaust (EC Motors + DALI-2 Control)*

### **6.1 Whole-House Fans (WHF)**
| Part ID | Manufacturer | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- |
| QC-TRI-7.0X | QuietCool | Trident Pro 7.0X (EC Motor) | 2 | 1 per arm of U-shape |
| SUN-2701S-DT7| Sunricher | DALI-2 Relay Puck | 2 | Power On/Off (In LCP-1/2) |
| SUN-2401-10V | Sunricher | DALI to 0-10V Signal Converter | 2 | Variable Speed Control |

### **6.2 Attic Exhaust Fans**
| Part ID | Manufacturer | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- |
| QC-AFG-3.0 | QuietCool | AFG PRO-3.0 Gable Fan | 4 | 2 per gable end |
| SUN-2701S-DT7| Sunricher | DALI-2 Relay Puck | 4 | Power On/Off |
| SUN-2401-10V | Sunricher | DALI to 0-10V Signal Converter | 4 | Variable Speed Control |

### **6.3 Bathroom & Laundry Exhaust**
| Location | Fan Motor | Silencer | Backdraft Damper | Diffuser (InviAir) |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Bath** | Fantech FG 6M EC (Shared) | Fantech LD 6 | RSK 6 | L100 (60") + S100 (6") |
| **Bath 2 (Kids)** | Fantech FG 6M EC | Fantech LD 6 | RSK 6 | L100 (48") |
| **Bath 3 (Ens)** | Fantech FG 6M EC | Fantech LD 6 | RSK 6 | L100 (48") |
| **Guest Bath** | Fantech FG 6M EC | Fantech LD 6 | RSK 6 | L100 (60") |
| **Laundry Room** | Fantech FG 6M EC | Fantech LD 6 | RSK 6 | S100 (8") |
| **Half Bath** | Fantech FG 6M EC | Fantech LD 6 | RSK 6 | S100 (6") |

### **6.4 Environmental AI Inputs**
| Part ID | Manufacturer | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- |
| STE-TP-KNX | Steinel | True Presence Multisensor KNX | 4 | Primary, Guest, Bath 3, Laundry |
| WAR-WETH-PRO | Warema | KNX Weather Station Pro | 1 | Outdoor (North Wall) |
| TEM-PM25 | Temco | Outdoor PM2.5 Sensor (Modbus) | 1 | Wildfire Smoke Interlock |
| MDT-SCN-MB | MDT | KNX/Modbus Gateway | 1 | Bridge for PM2.5 Data |

---

## **Section 7: Field Devices - Lighting (DALI-2)**
*Based on current floor plan placements.*

| Product ID | Manufacturer | Description | Qty | Type | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| DMF-X2-SQ-FL | DMF Lighting | X-Series Square Flangeless | 80 | Recessed | Modular: Housing + Trim + LED |
| DMF-X2-WET | DMF Lighting | X-Series Sq Flangeless (Wet) | 4 | Recessed | 1 per Full Bath (Shower/Tub) |
| BAF-HAIKU-52 | Big Ass Fans | Haiku 52" Aluminum | 3 | Fan+Light | DALI 0-10V Int (010447) |
| CAB-NM-PCS | Southwire | Romex PCS Duo (14/2 + 16/2) | 3 | Spools | Power+Control for Lights & Fans |

---

## **Section 8: Bulk Infrastructure & Consumables**

| Item | Manufacturer | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- |
| CAB-KNX-G | Unitronic | KNX Green Bus Cable (UL) | TBD | See Routing Notes Below |
| CAB-CAT6-RIS | TrueCable | Cat6 Riser (Bulk) | TBD | |
| CAB-16/4-SHLD| Generic | 16/4 Shielded (Shade Pre-wire) | TBD | Home-run to LCP-1/2 |
| BOX-SQ-4IN | Generic | 4" Square Steel Box (2-1/8" D) | - | Deep boxes for DALI pucks |
| BOX-FIRE-PAD | STI | SpecSeal Putty Pad | 1 | Required for Garage Intercom |
| CON-EMT-1IN | Generic | 1" EMT Conduit | 2 | Solar Roof-Runs |
| CON-EMT-2.5IN| Generic | 2.5" EMT Conduit | 2 | Energy Wall Super-Conduit |

---

## **Section 9: Door Entry & Access Control (Akuvox)**
*3D Face Recognition & SIP Intercom System*

| Part ID | Manufacturer | Description | Qty | MPN | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AKU-X915S | Akuvox | 8" 3D Face Recognition Intercom | 1 | X915S | **Front Door** (Flush Mount) |
| AKU-E16C | Akuvox | 5" 3D Face Recognition Intercom | 3 | E16C | Garage Man, Side Door, Laundry Door |
| AKU-E16-HOOD | Akuvox | Sun Shield / Rain Hood | 1 | E16-A05H | For **Garage Man Door** (North Facing) |
| AKU-S567G | Akuvox | 10" Android 12 Indoor Monitor | 1 | S567G | **Hallway Tablet** (Main Control) |
| HES-1006 | HES | Heavy Duty Electric Strike | 4 | 1006-CS | 24V DC, Fail-Secure |
| AKU-SR01 | Akuvox | Secure Relay Module | 4 | SR01 | (Qty in Section 3.1) |

---

## **Section 10: Motorized Skylights & HVAC Integration**
*Centralized 24V DC Actuation & Climate Bridging*

| Part ID | Manufacturer | Description | Qty | MPN | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| MDT-JAL-0810 | MDT | 8-fold Shutter Actuator (24V DC) | 1 | JAL-0810.02 | **Skylights Only** |
| INT-MOD-KNX | Intesis | HVAC Modbus to KNX Gateway | 1 | INKNXMBM100 | Bridge for AC/Heat Recirculation |
| MW-MDR-100-24| Mean Well | 100W 24V DC DIN-Rail PSU | 1 | MDR-100-24 | Dedicated Power for Skylight Motors |
| WAR-WETH-PRO | Warema | KNX Weather Station Pro | 1 | #2064965 | **Home-runs to LCP-2** |
| TEM-PM25 | Temco | Outdoor PM2.5 Sensor (Modbus) | 1 | OAL-PM2.5 | **Home-runs to LCP-2** |

---

## **Section 11: Routing & Pro-Integrator Notes**

### **11.1 KNX Bus Topology (Redundant Loop Strategy)**
*   **Perimeter Run**: Route KNX Green Bus through all habitable walls at **48" AFF** (Switch Height).
*   **Ceiling/Attic Spine**: Provide a central bus run through the attic with drops to all bathroom sensor locations.
*   **Hardened Loop**: All major bus segments must be pulled as a **"Terminated Loop"**. Run the cable from the LCP, through the zone, and back to the LCP. **CRITICAL**: Only one end is to be connected to the bus power supply; the return tail must be labeled and capped. 

### **11.2 LCP Service Spares & Pre-Wire**
*   **Window Shades (Pre-Wire)**: Pull **16/4 Shielded Cable** from LCP-1/2 to every window header. Terminate in "Router & Rescue" vaults per *window-shade-wiring-prep.md*. Coil 3ft of slack in LCP, label, and do not terminate.
*   **LCP-1 (Garage)**: Pull **3x Spare Service Loops** (120V HV In + DUO Control Out) into the attic. 
*   **LCP-2 (Office 2)**: Pull **3x Spare Service Loops** (120V HV In + DUO Control Out) into the attic. **Environmental Hub**: Weather station and PM2.5 sensors terminate here.

### **11.3 Box & Finish Standards**
*   **Deep Boxes**: Standardize on 2-1/8" deep steel boxes to allow for DALI relay pucks and KNX pigtail service loops.
*   **Floating Shields**: Drain wires on the KNX bus should be cut and taped at the device end; bond only at the LCP ground rail to prevent ground loops.

### **11.4 Security Puck (SR01) Placement**
*   **Anti-Tamper Protocol**: All **Akuvox SR01** security relays must be centralized in **LCP-3** (Tech Room). 
*   **NO LOCAL LOGIC**: Under no circumstances should the relay be placed near the door terminal. The connection from door to panel is RS485 encrypted data only. This prevents "paperclip" attacks on the lock hardware.
*   **Mounting**: All pucks to be DIN-rail mounted using official clips. Label each with the corresponding door name.

---

## **Section 12: Patio Infrastructure (Pre-Wire Only)**
*High-Current Heating & Outdoor Fan Control*

| Part ID | Manufacturer | Description | Qty | Notes |
| :--- | :--- | :--- | :--- | :--- |
| CAB-10/3-NM | Southwire | 10/3 Romex (30A 240V) | 3 | Home-run from **Sub-SPAN** to Heater J-Box |
| CAB-NM-PCS | Southwire | Romex PCS Duo (14/2 + 16/2) | 2 | Home-run from **LCP-2** to Patio Fans |
| CAB-DALI-G | Generic | 18/2 Shielded (DALI Bus) | 1 | Home-run from **LCP-2** to Heater J-Box |

### **12.1 Patio Implementation Notes**
*   **Heaters (18kW Plan)**: Pull 3x 30A dedicated circuits. Control is via DALI-2 relay/contactor logic (hardware deferred).
*   **Fans**: Pull power + control (Duo) for 2x Outdoor Haiku fans.
*   **Surge Protection**: All outdoor data/bus lines must include a DIN-rail surge protector at the LCP entry point.

---

## **Section 13: Known Missing & Future-Phase TBDs**

### **13.1 Aesthetic & Decorative Lighting (Pending Selection)**
*   **Chandeliers / Pendants**: Dining, Entry, and Kitchen Island fixtures are TBD. **Requirement**: All decorative junction boxes must be 2-1/8" deep to accommodate DALI-2 relay/dimmer pucks.
*   **Vanity Sconces**: All bathroom vanity lighting locations and fixtures are TBD.
*   **Outdoor Architectural Sconces**: Front entry and perimeter wall sconces are TBD.

### **13.2 Seasonal & Holiday Lighting (KNX Controlled)**
*   **Eave Outlets**: 2x Weatherproof outlets mounted under the roof eaves (North/South peaks) for Christmas/Holiday lighting. Home-run to **LCP-1**.
*   **Ground Seasonal Outlets**: 2x Weatherproof outlets at ground level (Front/Side) for seasonal displays. Home-run to **LCP-1**.
*   **Control Logic**: These 4 outlets must be terminated on a **KNX High-Inrush Relay Actuator** in LCP-1 for automated seasonal scheduling.

### **13.3 Exterior Infrastructure (Future Wiring)**
*   **Landscape Spine**: Pull 1" EMT conduit from Garage (LCP-1) to an external NEMA-3R landscape junction box for future landscape lighting expansion.
*   **Under-Awning Future-Proofing**: Pull **14/2 Southwire Duo** to 4 corners of the exterior roofline for future architectural accent lighting. 
*   **Security Camera Drops**: Ensure all 12 Ubiquiti camera locations (Section 5) have Cat6 home-runs to the Tech Room (LCP-3).

### **13.4 Closet & Storage Automation (WIC / Linen / Pantry)**
*   **Reed Switches (Primary)**: Install recessed magnetic contact switches (e.g., Tane Pill-V) in all closet door frames. Home-run 18/2 to the nearest LCP Binary Input.
*   **Stealth mmWave Pre-Wire**: Pull a KNX Bus "tail" to the center ceiling of each WIC and Linen closet. Coil 2ft of slack **above the drywall** (Stealth Vault). 
*   **Future sensor**: Prepared for **Creatrol 24G/60G mmWave** hidden installation (drywall penetration mode).
*   **Requirement**: NO physical light switches are to be installed in closets or small storage areas. Lighting must be 100% sensor/contact driven.
