import { SystemDefinition } from './types';

export const INITIAL_SYSTEMS: SystemDefinition[] = [
    {
        id: 'lighting',
        title: 'Lighting & Control',
        description: 'Comprehensive, sensor-driven lighting control system using DALI and KNX protocols for human-centric illumination.',
        technicalDetails: 'Features a distributed control logic using KNX Smart Switches for user interfaces and DALI-2 Gateways for precise fixture management. Logic prioritizes motion and presence sensors to minimize wall clutter, while centralized LED Drivers ensure consistent dimming performance. NEC 2023 Compliant via UL-Listed Gateway and Class 2 ECP power topology.',
        warning: 'DRAFT: Final fixture count pending layout confirmation.'
    },
    {
        id: 'heating',
        title: 'Supplemental Heating',
        description: 'Targeted radiant heating solutions for comfort in tiled areas.',
        technicalDetails: 'Controlled via KNX Heating Actuators integrating floor probes. Includes electric radiant floor mats in bathrooms and hydronic/electric towel warmers, managed by the central climate logic.'
    },
    {
        id: 'access',
        title: 'Door Access',
        description: 'Secure, keyless entry management for all perimeter doors.',
        technicalDetails: 'Utilizes IP Video Intercoms with facial recognition and NFC capabilities. Integrated with 12/24V Electric Strikes and Magnetic Locks, powered by an Access Control Power Controller, and bridged to the automation bus for SIP communication.'
    },
    {
        id: 'security',
        title: 'Security Cameras',
        description: 'High-definition video surveillance for perimeter and common area monitoring.',
        technicalDetails: 'A network of 4K PoE IP Cameras recording locally to a secure NVR. Integrates AI-driven event detection (Person/Vehicle) into the home automation bus for automation triggers.'
    },
    {
        id: 'outdoor',
        title: 'Outdoor DMX Lighting',
        description: 'Architectural 24V DC landscape and facade lighting with DMX control for dynamic color and tunable white.',
        technicalDetails: 'DMX512-based outdoor lighting system controlled via KNX-to-DMX Gateway (Weinzierl 544) in LCP-1. Utilizes hybrid daisy-chain topology: shielded Cat5e (DMX data) bundled with 14/2 or 10/2 landscape wire (24V DC power). Field fixtures include RGBW tree uplights, tunable white bollards, and linear wall grazers. Powered by Mean Well HLG-series IP67 constant voltage drivers buried in weatherproof NEMA enclosures. System supports RDM (Remote Device Management) for automated addressing. Automated based on astronomical clock, security events, and seasonal color programs.',
        warning: 'PHASED IMPLEMENTATION: Phase 1 (Immediate) = Rough-in cabling, DMX gateway, and control gear in LCP-1. Phase 2 (Future) = Fixtures and field drivers (quantities TBD based on photometric design plan).'
    },
    {
        id: 'irrigation',
        title: 'Irrigation Control',
        description: 'Smart water management for garden and foundation protection.',
        technicalDetails: 'Integration with predictive weather data to optimize watering schedules. Valve control via 24V AC actuators driven by KNX Irrigation Controllers.'
    },
    {
        id: 'hvac',
        title: 'HVAC & Environmental',
        description: 'Holistic climate and motor control including ventilation, skylights, and passive cooling.',
        technicalDetails: 'Integration of motorized Skylights, EC Exhaust Fans (0-10V), and Thermostats. Uses distributed environmental sensors (VOC, CO2, Humidity) and Presence detection to automate air exchange, exhaust, and passive cooling strategies.'
    },
    {
        id: 'infra',
        title: 'Infrastructure & Cabling',
        description: 'Core structured cabling, racks, and power distribution.',
        technicalDetails: 'includes the physical "nervous system" of the home: Southwire NEC-compliant cabling (Power+Control), KNX Bus cabling, and the Main Distribution Frame (MDF) rack components.'
    }
];
