import { SystemDefinition } from './types';

export const INITIAL_SYSTEMS: SystemDefinition[] = [
    {
        id: 'lighting',
        title: 'Lighting & Control',
        description: 'Comprehensive, sensor-driven lighting control system using DALI and KNX protocols for human-centric illumination.',
        technicalDetails: 'Utilizes MDT KNX Glass Touch Smart switches and Lunatone DALI-2 drivers. Logic is handled centrally via the LogicMachine, prioritizing motion/presence sensors over physical switches to reduce wall clutter.'
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
        technicalDetails: 'Features Akuvox IP Door Phones (X915, E16) with facial recognition and NFC. Integrated with HES electric strikes and magnetic locks, powered by Altronix, and bridged to KNX/SIP for touch panel answering.'
    },
    {
        id: 'security',
        title: 'Security Cameras',
        description: 'High-definition video surveillance for perimeter and common area monitoring.',
        technicalDetails: 'UniFi Protect PoE cameras recording locally to the Dream Machine Pro / NVR. Integrating AI detections for "Person" and "Vehicle" events into the home automation bus.'
    },
    {
        id: 'outdoor',
        title: 'Outdoor Lighting',
        description: 'Landscape and facade lighting for aesthetics and security.',
        technicalDetails: 'Zoned low-voltage landscape lighting transformers controlled via KNX relays. Facade lighting dimmable via DALI. Automated based on astronomical clock and security events.'
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
        description: 'Holistic climate control including ventilation, skylights, and passive cooling.',
        technicalDetails: 'Integration of Velux skylights (KLF 200), Whole House Fan, and HVAC thermostat. Uses distributed environmental sensors (VOC, CO2, Humidity) to automate air exchange.'
    }
];
