# Master Device Inventory

**Version** 1.0 · February 8, 2026

## Intent & Workflow
1. Capture every load you need to control (HVAC, fans, lights, shades, power, etc.) with product choices, links, and wiring notes.
2. Keep this file as the single source of truth; update the relevant section each time we learn something new.
3. After each iteration I will call out outstanding questions so you can answer them one by one; once clarified, we update this document.

## Categories to Cover
| Category | Scope |
| --- | --- |
| HVAC | Heat pumps, minisplits, air handlers, and any central heating/cooling units. |
| All house fans | Whole-house and attic exhaust fans. |
| Bathroom fans | Exhaust fans serving baths, laundry, and toilets. |
| Bathroom towel warmers | All electric rails. |
| Floor heater | Radiant floor or slab heater loads. |
| Ceiling lights (DALI-2) | DMF downlights and other DALI-native fixtures. |
| Ceiling fans | Big Ass Fans Haiku series or other architectural fans. |
| Future pergola heater/fan | Outdoor Haiku pair and pergola heater circuits. |
| Electric skylights | Motorized skylights + gateways/actuators. |
| Window shades (TBD) | Motorized shade pre-wire (motors TBD). |
| SPAN smart panels | Primary and sub-panels for telemetry. |
| Solar / inverters | Hybrid inverters, rapid shutdown, batteries. |
| Dumb architectural lights | Pendants, sconces, or any fixtures without embedded DALI drivers. |
| Seasonal / holiday outlets | Weatherproof outlets reserved for decorative lighting. |

## Current Device Matrix

### HVAC
| Device | Qty / Zones | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| Carrier D5CURAH60AAK outdoor + D5FUAAH60XAK indoor air-source heat pump | Main floor + bed wing | (spec PDF) `docs/SnJ/Heat Pump Spec ID5CURAH60AAK .pdf` | 60k BTU, inverter, 0–10V compatible; power lands on Sub-SPAN and integrates through LCPs. | `docs/electrical_bom_270_bolla.md:521`, `docs/SnJ/Heat Pump Spec ID5CURAH60AAK .pdf` |
| Fujitsu ASUH12KPAS minisplit + FHMA5X48LOCA fan coil | Tech room / server | `docs/SnJ/Spec Mini Split tech room.pdf`, `docs/SnJ/Fan Coil FHMA5X48LOCA.pdf` | Dedicated LCP-2 logic path with Intesis gateway; provides local server cooling. | `docs/electrical_bom_270_bolla.md:527`, `docs/SnJ/Spec Mini Split tech room.pdf` |

### All House Fans
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| QuietCool Stealth Pro 7.0X (ECM motor wide-flow) | 2 | https://quietcoolsystems.com/whole-house-fan/stealth-pro-x-whole-house-fan/ | One per arm of the U-shaped plan; DALI-2 relay/converter logic handled in the LCP but excluded here. | `docs/mechanical-ventilation-standard.md:54`, `docs/electrical_bom_270_bolla.md:177` |
| QuietCool AFG SMT PRO-3.0 gable exhaust fans | 4 | https://quietcoolsystems.com/attic-fan/smart-gable-attic-fans/ | Two per gable end for balanced attic exhaust; interconnected with WHF logic. | `docs/mechanical-ventilation-standard.md:62`, `docs/electrical_bom_270_bolla.md:184` |

### Bathroom Fans
| Device | Qty / Rooms | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| Fantech FG 6M EC inline fan + LD6 silencer + RSK6 damper | 5 dedicated rooms (Kids, Ensuite, Guest, Laundry, Half); primary bath uses shared splitter | https://www.fantech.net/en-us/products/fans-and-accessories/inline-duct-fans/fg/?sku=49900 | Uses Southwire NM-B-PCS Duo for 0-10V control; Primary bath has dual diffusers sharing a single motor (per ventilation spec). | `docs/electrical_bom_270_bolla.md:189-193`, `docs/ventilation-spec.md:10-20` |

### Bathroom Towel Warmers
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| Hudson Reed HREH06 (2-towel chrome) | 1 (primary bath) | https://www.hudsonreed.com/products/electric-towel-warmers | Large chrome rail; connected to dedicated KNX high-inrush relay. | `docs/electrical_bom_270_bolla.md:381` |
| Hudson Reed HREH02 (1-towel chrome) | 5 (secondary baths) | same link | Smaller chrome rails for guest/kids baths; grouped into a single relay bank. | `docs/electrical_bom_270_bolla.md:382` |

### Floor Heater
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| Schluter DITRA-HEAT electric warming mat & DITRA-HEAT-E-RS1 programmable thermostat | primary bath + water closet plus linear shower entry area (warm floor not inside shower) | https://www.schluter.com/schluter-us/en_US/Floor-Warming/Thermostats/Schluter®-DITRA-HEAT-E-RS1/p/DITRA_HEAT-E-RS1 | Warm floor mat system uses embedded wire under tile; thermostat is Wi-Fi/voice-enabled (Schluter app, Alexa, Google). The thermostat sits on the 240V circuit and handles GFCI/floor sensors. Because there is no native KNX interface, automation should instead control a KNX relay/contactor on the 240V feed or ingest the thermostat’s data via the Home Assistant bridge—the Schluter unit is not currently KNX compatible. | `docs/ventilation-spec.md`, `turn1search0`, `turn1search3` |

### Ceiling Lights (DALI-2)
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| DMF Lighting X-Series Square Flangeless downlight assembly | 80 (core recessed) | https://www.dmflighting.com/product/x-series/ | Includes housing (`X2NCS`), mud-in plate (`X2KSMUD`), trim (`X2TSDSWHFL`), and LED module (`XMD12930WFD`); each is DALI-2 addressable. | `docs/electrical_bom_270_bolla.md:211`, `catalog.json:650-839` |
| DMF X-Series Square Flangeless Wet | 4 (shower areas) | same link | Wet-rated trim variant (`X2TSDSWHFL-WET`). | `docs/electrical_bom_270_bolla.md:212`, `catalog.json:891-965` |

### Ceiling Fans
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| Big Ass Fans Haiku 52" aluminum (fan + light driven) | 3 | https://www.bigassfans.com/fans/haiku/ | Project standard for ceiling fans; each uses 0-10V fan and light channels via DALI-2 converters (not listed here). | `docs/electrical_bom_270_bolla.md:213`, `snapshot_bom.json:62`, `catalog.json:59` |

### Future Pergola Heaters & Fans
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| Pergola heating circuits (3 × 6 kW each) | 3 | https://bromic.com/us | Candidate: Bromic Tungsten Smart-Heat 6000W/30A (or equivalent high-power outdoor infrared heater); wiring already splits into 4 zones, so plan to control each heater via KNX relay outputs (or a KNX-to-RF gateway) with the custom RF hub providing feedback/status. | `docs/electrical_bom_270_bolla.md:332`, `docs/electrical_automation_master_plan.md:111` |
| Outdoor Haiku fans (pergola) | 2 | https://www.bigassfans.com/fans/haiku/ | Two fans pre-wired for client selection (presumed Big Ass Fans Haiku); integrate the RF fan control into KNX by mapping per-zone relays so cloud/KNX scenes can mirror the custom RF hub. | `docs/electrical_bom_270_bolla.md:333` |

### Electric Skylights
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| Velux VSE M08 (~2×4) | 1 | https://www.velux.com/products/roof-windows/solutions/smart-home | Hallway skylight (Group 1) – high-quality flush-mounted unit intended for standing-metal roof; integrating via Velux Integra gateway (KNX-compatible) for easier automation. | `docs/knx-dali-standard.md:313-319` |
| Velux VSE C01 (~2×2) | 7 | same family link | Dining (6) + Laundry (1) skylights; flush mount and call out Velux Integra (KNX-ready) controller to keep integration tight with KNX/automation. | `docs/knx-dali-standard.md:314-320` |

### Window Shades (TBD)
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| Motorized window shades (pre-wire only) | home-run cables to every window header | `can’t find / TBD` | Pre-wire uses 16/4 shielded cable (LV power+feedback) to allow Lutron/Somfy/Hunter Douglas/etc.; keep each run terminated in labeled “shade vaults” at LCPs. No line-voltage runs needed now, so future controller choices remain flexible. | `docs/electrical_bom_270_bolla.md:295`, `docs/device-system-data-models.md:802-818` |

### SPAN Smart Panels
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| SPAN Gen 2 Smart Panel (32-circuit) | 2 | https://span.io/products/main-32 | Main service panels with Ethernet telemetry; routed to automation enclosures. | `docs/electrical_bom_270_bolla.md:35`, `docs/electrical_automation_master_plan.md:55` |
| SPAN Sub-panel (16-circuit) | 1 | https://span.io/products/panel/16 | Dedicated to logic/tech room loads; part of Phase 1. | `docs/electrical_bom_270_bolla.md:36` |

### Solar / Inverters / Energy Wall
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| Hybrid inverter (EG4 18kPV / Sol-Ark 15K preferred) | 2 planned (paralleled) | https://www.eg4.com/ or https://solarkpowersystems.com | Phase 2/3 Energy Wall will house paralleled inverters with battery management; slots reserved behind SPAN panels. | `docs/electrical_automation_master_plan.md:28-64`, `catalog.json:757-774`, `snapshot_bom.json:38` |
| Battery bank (EG4 PowerPro wall mount) | 1 bank | https://www.eg4.com/ | Placed below inverter zone; size to match inverter rating. | `docs/electrical_automation_master_plan.md:64`, `catalog.json:798-800`, `snapshot_bom.json:30` |

### Dumb Architectural Lights
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| Decorative pendants (non-DALI), phase-dimmable 120V | 9 placeholder locations | `https://integratorpro.app/placeholders` | Standardize on phase-dimmable LED bulbs; install junctions sized for DALI pucks if future lighting upgrades are desired. | `docs/electrical_bom_270_bolla.md:222`, `catalog.json:723`, `snapshot_bom.json:118` |
| Wall sconces (non-DALI), phase-dimmable 120V | 12 placeholder locations | same placeholder link | Use 120V dimmable lamps now; allow future DALI integration by keeping box depth/depth and wiring cleared. | `docs/electrical_bom_270_bolla.md:233`, `catalog.json:733`, `snapshot_bom.json:126` |

### Seasonal / Holiday Outlets
| Device | Qty | Link | Notes | Source |
| --- | --- | --- | --- | --- |
| Weatherproof GFCI outlets (eave) | 2 | `can’t find / TBD` | Outdoor-rated GFCI duplex feeds, tied to KNX high-inrush relay for automated schedule control. | `docs/electrical_bom_270_bolla.md:346` |
| Weatherproof GFCI outlets (ground) | 2 | `can’t find / TBD` | Ground-level weatherproof GFCI duplex with KNX relay control; four total outlets service holiday lighting. | `docs/electrical_bom_270_bolla.md:347` |

## Outstanding Questions
None—everything in this doc now has a proposal/action. Keep me posted if you need further refinements.
