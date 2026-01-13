# Master Ventilation Specification: Bathrooms & Laundry

**Scope:** Mechanical (HVAC), Electrical (High Voltage), and Drywall/Finish.
**Project Note:** All bathrooms utilize Remote Inline EC Motors for silent operation and variable speed control. Diffusers are frameless mud-in architectural grade (InviAir) and require precise framing and finishing.

---

## 1. Equipment Schedule

**Standardized Motor:** All locations use Fantech FG 6M EC (approx. 360 CFM, 0-10V Control).

| Location | Fan Motor | Diffuser Model | Size / Slot | Qty | Notes |
|:---|:---|:---|:---|:---:|:---|
| Primary Bath (Main) | Shared | InviAir L100 | 60" Length (1" Slot) | 1 | Center over Glass Partition. |
| Primary Bath (WC) | Shared | InviAir S100 | 6" x 6" Square | 1 | Secondary pull from same motor. |
| Bath 2 (Kids) | FG 6M EC | InviAir L100 | 48" Length (1" Slot) | 1 | Center on Tub/Toilet line. |
| Bath 3 (Ensuite) | FG 6M EC | InviAir L100 | 48" Length (1" Slot) | 1 | Parallel to Shower curtain. |
| Guest Bath | FG 6M EC | InviAir L100 | 60" Length (1" Slot) | 1 | Center of room width. |
| Laundry Room | FG 6M EC | InviAir S100 | 8" x 8" Square | 1 | Center over Cat Litter area. |
| Half Bath | FG 6M EC | InviAir S100 | 6" x 6" Square | 1 | Center of room. |

---

## 2. Mechanical BOM & Installation Details

### A. Primary Master Bath (Dual-Point Split System)
**Configuration:** One remote motor pulling from two locations (WC + Shower).

| Component | Model / Spec | Qty | Installation Notes |
|:---|:---|:---:|:---|
| **Inline Motor** | Fantech FG 6M EC | 1 | Mount in Attic/Crawlspace. EC Motor (0-10V). |
| **Silencer** | Fantech LD 6 | 1 | Install on the intake side (House side) of the fan. |
| **Backdraft Damper** | Fantech RSK 6 | 1 | Install on the exhaust side (between fan and roof cap). |
| **Splitter** | Sheet Metal Wye (6x4x4) | 1 | Wye fitting (not Tee). 6" Main inlet $\rightarrow$ Two 4" Branches. |
| **Balance Dampers** | 4-inch Manual Damper | 2 | Install one on each 4" leg. Use to balance suction. |
| **Ducting** | Insulated Flex Duct | TBD | **Critical:** Must be insulated on 4" legs to prevent sound. |
| **Plenum Connection** | 8-inch Round Collar | 1 | For Main 60" Diffuser (Use reducer at wye if necessary). |
| **Plenum Connection** | 4-inch Round Collar | 1 | For WC Square Diffuser. |

### B. Single-Point Rooms (All Other Baths)
**Configuration:** Standard single vent per room.

| Component | Model / Spec | Qty | Installation Notes |
|:---|:---|:---:|:---|
| **Inline Motor** | Fantech FG 6M EC | 1 | Mount in Attic. Same motor used for uniformity. |
| **Silencer** | Fantech LD 6 | 1 | Install on intake side. |
| **Backdraft Damper** | Fantech RSK 6 | 1 | Install on exhaust side. |
| **Ducting** | 6-inch Insulated Flex | TBD | Run 6" duct directly from silencer to diffuser plenum. |
| **Plenum Connection** | 6-inch Round Collar | 1 | Standard connection for single-room diffusers. |

---

## 3. Electrical Specification (Critical)

> ### ⚠️ ATTENTION ELECTRICIAN
> These fans utilize EC Motors with 0-10V control. To avoid pulling separate conduits, we are using **Southwire NM-B-PCS Duo™** cable which legally combines Power and Control in one jacket.

- **Cable Type:** Southwire NM-B-PCS Duo™ (12/2 Power + 16/2 Control)
- **Jacket contains:** 12 AWG Power (Yellow) + 16 AWG 0-10V Control (Purple/Gray).
- **Run Logic (Home Run Only):**
    - Pull a single continuous run from the Attic Fan Location directly to the Central Utility Panel (Low Voltage/KNX Area).
    - **DO NOT** install standard wall switches or dimmers in the bathroom. Control is automated.
- **Termination:**
    - **Fan Side:** Connect 120V to Motor Power; Connect Purple/Gray to Motor 0-10V Input.
    - **Panel Side:** Label clearly for integration (e.g., "Guest Bath Fan"). Leave 24" service loop.

---

## 4. Diffuser Placement & Finishing (Drywall/Paint)

### A. The "Joist Rule" (Linear Diffusers)
- **Plan A (Preferred):** Install linear diffusers exactly as shown on plan (e.g., centered on glass line).
- **Plan B (Joist Conflict):** If joists run perpendicular and prevent the preferred placement:
    - Rotate the diffuser 90° to run parallel between joists.
    - Offset the diffuser 12"–18" away from the Mirror/Vanity Wall (creating a "wall wash" effect).
    - **Do NOT** center a rotated diffuser in the middle of the room; it must look intentional near a wall.

### B. Primary Bath Specifics
- **Alignment:** The 60" Linear Slot must be centered exactly above the glass partition track for the shower. Use a laser level to transfer the floor track line to the ceiling.

### C. Mud-In & Paint Instructions
1. **Framing:** Frame rough openings exactly to the plenum box dimensions (InviAir boxes are narrow; do not oversize).
2. **Protection:** Keep the plastic construction cover/tape inside the black slot at all times during hanging, taping, mudding, and painting.
3. **Mudding:** Tape and mud the flange flush with the drywall. Sand smooth.
4. **Paint:** Spray or roll the diffuser face along with the ceiling.
5. **Finish:** Only remove the plastic slot protection after the final coat of paint is dry. Do not get drywall mud inside the air slot.
