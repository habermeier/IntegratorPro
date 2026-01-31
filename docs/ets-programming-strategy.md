# **ETS6 Programming Strategy: 270 Bolla Ave**

**Project Name:** 270 Bolla Ave  
**Draft Version:** 1.0  
**Baseline Standard:** KNX Secure (Where Supported)

---

## **1. Topology & Physical Addressing**
We will utilize a standard **3-level hierarchy** for Physical Addresses (`Area.Line.Device`).

*   **Area 1**: Main House
*   **Line 1.0**: IP Backbone (NUC, IP Router)
*   **Line 1.1**: LCP-1 (Garage)
*   **Line 1.2**: LCP-2 (Office Hub)
*   **Line 1.3**: Field Devices (Switches, Sensors)

### **Device Physical Address Allocation (Initial 64)**
| Address | Device Type | Location | Role |
| :--- | :--- | :--- | :--- |
| **1.0.0** | ABB IPR/S 3.1.1 | LCP-2 | KNX IP Router (Backbone) |
| **1.1.1** | Siemens SIE-DALI-GW | LCP-1 | DALI Gateway (Kitchen/Living) |
| **1.1.2** | MDT AKS-1216.03 | LCP-1 | Switch Actuator (Seasonal/WHF) |
| **1.2.1** | Siemens SIE-DALI-GW | LCP-2 | DALI Gateway (Master/Bedrooms) |
| **1.2.2** | MDT JAL-0810.02 | LCP-2 | Shutter Actuator (Skylights) |
| **1.2.3** | Intesis CAR-KNX | LCP-2 | HVAC Gateway (Main) |
| **1.2.4** | Intesis CAR-KNX | LCP-2 | HVAC Gateway (Bed Wing) |
| **1.2.5** | Intesis FUJ-KNX | LCP-2 | HVAC Gateway (Tech Room) |
| **1.3.1** | Basalte Deseo | Hallway | Central Climate UI |
| **1.3.2 - 1.3.13** | Basalte Sentido | Field | Room Light Switches |
| **1.3.14 - 1.3.18** | Steinel True Presence| Field | Bathroom/Laundry Sensors |

---

## **2. Group Address Strategy (Function-Based)**
We will use the **3-level structure** (`Main / Middle / Sub`) for logical communication.

*   **Main Group 0**: System / Heartbeat (Time, Alarms, Wildfire Mode)
*   **Main Group 1**: Lighting (On/Off, Dimming, Status)
*   **Main Group 2**: Climate (Setpoints, Actual Temp, Fan, Mode)
*   **Main Group 3**: Shading / Skylights (Open/Close, Position)

### **Example Climate Group Addresses**
| Address | Name | DPT | Notes |
| :--- | :--- | :--- | :--- |
| **2/0/1** | HVAC Main: Setpoint | 9.001 | Linked to Deseo & Intesis |
| **2/0/2** | HVAC Main: Actual Temp | 9.001 | Feed from Deseo/Sentido Sensor |
| **2/0/3** | HVAC Main: Operation Mode | 20.102 | Comfort/Standby/Eco |
| **2/0/10**| HVAC Main: Recirc Mode | 1.001 | Wildfire Interlock (NUC Override) |

---

## **3. HVAC Configuration Workflow (Intesis)**
To avoid manual Modbus register entry, follow this specific sequence:

1.  **Preparation**: Download **Intesis MAPS** from hms-networks.com.
2.  **Mapping**: Connect to the Intesis Gateway via USB. Select "Carrier Ion" or "Fujitsu" template. MAPS will auto-fill the register list.
3.  **KNX Export**: Click "Export to KNX" in MAPS to generate a `.knxprod` file.
4.  **ETS Import**: Import the `.knxprod` file into your ETS6 Catalog.
5.  **Linking**: In ETS, drag the communication objects (e.g., "Setpoint Temp") to the Group Addresses (e.g., `2/0/1`).

---

## **4. The "Sell-the-House" (Baseline) Handshake**
To ensure the system works without the NUC:
*   **Direct Binding**: The Basalte Deseo must be linked directly to the Intesis Gateways via Group Addresses. 
*   **No Middleware**: Lighting scenes for Sentido switches must be stored *inside* the DALI Gateway, not on the NUC. 
*   **NUC Role**: The NUC only sends "Writing" telegrams to existing group addresses to *override* the baseline.

---

## **5. Support & Disaster Recovery**
*   **Gemini Role**: I can analyze your ETS exported `.xml` or `.knxproj` data to troubleshoot linking errors or DPT mismatches.
*   **Project Backup**: Always store a current `.knxproj` backup in the `IntegratorPro/backups/ets/` directory after every download.
*   **Baseline Recovery**: In the event of a total NUC failure, the "Baseline" logic remains in the device EEPROM and will continue to function indefinitely.
