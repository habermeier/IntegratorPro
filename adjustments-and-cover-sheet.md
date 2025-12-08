- All URL's need vetting (we have some 404's) --> I do like to use jmac.com for stuff that makes sens, but it needs to actaully go to a real product that matches
- We should think about what we show first.  Should it be the DIN Layout, The Floor Plan Map?  I don't think the Wiring Topology makes any sense right now -- we need to revisit what we really want to do with that (given the limits on time, maybe we leave it off)
- I have not tried that AI Validator, so we should probably not show that for now.
- I think we need a cover sheet (like the first section of the website) that outlines the following information:

Here is the final project brief, structured to prioritize the system's functional objectives and technical architecture, with the collaboration model detailed in the final section.

-----

# Project Brief: Automated Building Systems (ABS)

**Project Location:** 270 Bolla Ave, Alamo, CA
**Project Status:** Down-to-studs Remodel / Framing Phase

## 1\. Functional Objectives & Design Philosophy

The objective is to deploy a comprehensive, hardwired building automation system that prioritizes reliability, code compliance, and environmental intelligence. The system is designed to operate locally (offline) with a high degree of sensor-driven automation, reducing reliance on physical wall switches.

  * **Regulatory Compliance:** The system is designed to strictly adhere to **California Building Standards Code (Title 24, Part 6)** regarding lighting controls, occupancy sensing, and energy efficiency.
  * **Inspection Readiness:** The system must support a "Default State" that functions independently of advanced software layers (Home Assistant), ensuring the house passes all electrical and building inspections as a standalone entity.
  * **Sensor-Driven Environment:** The design minimizes physical wall clutter ("wall acne") by leveraging a high density of presence, lux, and environmental sensors. The primary method of interaction should be automatic (presence-based) or indirect (voice/app), with physical keypads serving as manual overrides.
  * **Environmental Safety & Air Quality:**
      * **Active Air Management:** Automated operation of motorized skylights and Whole House Fans based on internal/external temperature differentials.
      * **Safety Interlock:** Differential air pressure monitoring to prevent negative pressure hazards before fan engagement.
      * **Air Quality:** Dedicated Humidity and VOC sensors in bathrooms and laundry areas to trigger high-static pressure DC exhaust fans automatically.
  * **Ownership & Access:**
      * **Data Sovereignty:** The system will avoid cloud dependencies for critical infrastructure. Lighting, Access, and HVAC must function 100% locally.
      * **System Rights:** The Owner will retain the ETS Project File (`.knxproj`), the ETS license, and administrative credentials for all gateways to prevent vendor lock-in.

## 2\. Technical Architecture

The system architecture relies on **KNX** for the control plane (sensors, keypads, logic) and **DALI-2** for the lighting plane.

  * **Lighting Topology (DALI-2):**
      * Line voltage fixtures utilizes **DALI-2** drivers (Lunatone) for superior dimming (0.1%) and individual addressability.
      * Fixtures are wired via 5-wire cabling (Line, Neutral, Ground, DALI+, DALI-) or star-wired to central panels depending on load density.
      * **No switch loops:** All control points are low-voltage bus devices.
  * **Centralized Panels:**
      * **LCP-1 (Left Wing/Garage):** Industrial NEMA enclosure housing high-heat components (480W/150W PSUs) and garage/exterior lighting controllers.
      * **LCP-2 (Right Wing/Bedrooms):** Structured Media Center housing distribution for the right side of the residence.
      * **MDF (Main Data):** Houses the core Logic Server (Home Assistant/Unix), Network Core, and Gateway Bridges.

## 3\. Hardware Specification & Standards

The following hardware standards have been selected to meet the specific "Deep Dimming" and "Sensor Density" requirements of the project.

**Enclosures & Infrastructure**

  * **LCP-1:** Saginaw SCE-242408LP (24x24x8 NEMA). *Note: Surface mount required; 8" depth for PSU clearance.*
  * **LCP-2:** Leviton 47605-21E (21" Structured Media). *Note: Requires blocking stud bay from 18" to 14.5".*
  * **DIN Rails:** Leviton 47605-DIN vertical brackets for LCP-2.

**Lighting Control (KNX / DALI)**

  * **Gateways:** MDT SCN-DALI64.03 (4 Units Total across Universes 1-4).
  * **Drivers:** Lunatone DALI-2 PD Phase Dimmer (Retrofit Pucks) and Lunatone DALI DT8 Dimmers (High Current variants for LED Tape).
  * **Power Supplies:** Mean Well SDR-480-24 and HDR-150-24 (Dedicated 24V for lighting loads).
  * **Switched Loads:** MDT AKS-1216.03 Switch Actuator (Attic/Holiday lights).
  * **Fan Control:** Lunatone 0-10V DALI Interfaces (Panasonic Fans/Make-up Air).

**Sensors & User Interface**

  * **Keypads:** MDT Glass Push Button II Smart (Black). *Requires precise 1-gang mud ring installation.*
  * **Presence:** Steinel TruePresence (KNX & Multisensor variants) for micro-movement and VOC/CO2 detection.
  * **Closet Automation:** Recessed Reed switches wired to MDT Binary Inputs (16-fold).
  * **Environmental:** Sensirion SDP810 (Pressure) and Hydreon RG-11 (Optical Rain) for HVAC logic.

**Access & Network**

  * **Entry:** Akuvox X915 (Main) and E16 (Side) Door Phones.
  * **Locking:** HES 1006 Heavy Duty Electric Strikes (Fail Secure).
  * **Network Core:** Ubiquiti UniFi Pro Max 24 PoE.
  * **Logic Core:** ASUS NUC 13 Pro (Running Home Assistant OS).

## 4\. Collaboration Model & Scope of Work

This project utilizes a **Collaborative "Hybrid" Deployment**. The Owner is a technical professional (Software Engineer) with remodeling experience and intends to be an active participant in the physical and logical deployment of the system.

**Owner Contribution:**

  * **Labor Resource:** The Owner is willing and available to contribute approximately **80 hours (2 weeks)** of focused labor to the project.
  * **Capabilities:** Owner is proficient in low-voltage termination, DIN rail assembly, device mounting, and complex software programming.
  * **Objective:** To utilize Owner-labor to optimize the project budget and ensure the Owner possesses deep familiarity with the physical infrastructure for long-term maintenance.

**Proposed Scope of Responsibilities:**
We invite the Integrator to propose a workflow that best utilizes professional expertise alongside the Owner's availability.

| Scope Item | Suggested Lead | Collaboration Notes |
| :--- | :--- | :--- |
| **High Voltage (HV)** | **Pro / Electrician** | Strictly professional scope (Safety/Code). |
| **LV Wire Pulling** | **Pro Integrator** | Efficient rough-in is best handled by the pro team. |
| **Panel Build (LCP-1/2)** | **Joint Effort** | Owner can pre-assemble DIN rails; Pro terminates field wiring. |
| **Device Install** | **Joint Effort** | Pro handles high-volume/ladder work; Owner assists with low-level devices. |
| **Hardware Supply** | **Open** | Integrator may supply; Owner can supply specialized import items (MDT/Lunatone) if needed. |
| **Commissioning** | **Joint Effort** | **Pro:** Basic validation (lines checked, lights turn on).<br>**Owner:** Advanced logic, scenes, AI, Home Assistant integration. |


It may be wise to be able to deep link into component lists (maybe apply filter) to show what equipment I'm looking at.

