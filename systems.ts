import { SystemDefinition } from './types';

export const INITIAL_SYSTEMS: SystemDefinition[] = [
    {
        id: 'lighting',
        title: 'Lighting & Control',
        description: 'Comprehensive, sensor-driven lighting control system using DALI and KNX protocols for human-centric illumination.',
        technicalDetails: 'Features a distributed control logic using KNX Smart Switches for user interfaces and DALI-2 Gateways for precise fixture management. Logic prioritizes motion and presence sensors to minimize wall clutter, while centralized LED Drivers ensure consistent dimming performance.'
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
        title: 'Outdoor Lighting',
        description: 'Landscape and facade lighting for aesthetics and security.',
        technicalDetails: 'Zoned low-voltage landscape lighting transformers controlled via KNX relays. Facade lighting dimmable via DALI drivers. Automated based on astronomical clock and security events.'
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
        technicalDetails: 'Integration of motorized Skylights, Whole House Fans, and Thermostats. Uses distributed environmental sensors (VOC, CO2, Humidity) to automate air exchange and passive cooling strategies.'
    }
];
