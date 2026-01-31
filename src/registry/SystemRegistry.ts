/**
 * System Registry
 * 
 * The single source of truth for all technical systems and layers in IntegratorPro.
 * Merges UI metadata (titles, descriptions) with technical configuration (layers, zIndex).
 */

export interface SystemConfig {
    id: string;
    title: string;
    description: string;
    technicalDetails: string;
    warning?: string;
    zIndex: number;
    layerCategory: 'technical' | 'foundation' | 'utility';
    defaultVisible: boolean;
    iconName?: string;
    documentation?: string; // Path to reference docs (e.g. 'docs/ventilation-spec.md')
}

export const SYSTEM_REGISTRY: SystemConfig[] = [
    {
        id: 'lighting',
        title: 'Lighting & Control',
        description: 'Comprehensive, sensor-driven lighting control system using DALI and KNX protocols.',
        technicalDetails: 'Distributed KNX switches and DALI-2 gateways for precise fixture management.',
        zIndex: 90,
        layerCategory: 'technical',
        defaultVisible: true,
        iconName: 'Lamp'
    },
    {
        id: 'sensors',
        title: 'Environmental Sensors',
        description: 'Presence, light, and climate monitoring.',
        technicalDetails: 'KNX-based presence sensors and VOC/CO2/Humidity monitors.',
        zIndex: 80,
        layerCategory: 'technical',
        defaultVisible: false,
        iconName: 'Activity'
    },
    {
        id: 'security',
        title: 'Security & Surveillance',
        description: 'IP cameras and facial recognition intercoms.',
        technicalDetails: '4K PoE cameras and Akuvox video intercoms.',
        zIndex: 75,
        layerCategory: 'technical',
        defaultVisible: false,
        iconName: 'Shield'
    },
    {
        id: 'network',
        title: 'Network Infrastructure',
        description: 'Structured cabling and wireless access points.',
        technicalDetails: 'UniFi OS based network with WiFi 6 APs and Cat6a cabling.',
        zIndex: 70,
        layerCategory: 'technical',
        defaultVisible: false,
        iconName: 'Wifi'
    },
    {
        id: 'lcps',
        title: 'Control & Logic',
        description: 'Internal electrical gear, gateways, PSU hubs, and control modules.',
        technicalDetails: 'DIN-rail mounted components, KNX/DALI gateways, and low-voltage power supplies housed within LCPs.',
        zIndex: 66,
        layerCategory: 'technical',
        defaultVisible: false,
        iconName: 'Cpu'
    },
    {
        id: 'hvac',
        title: 'HVAC & Climate',
        description: 'Smart thermostats and ventilation control.',
        technicalDetails: 'KNX heating actuators and motorized window/skylight control.',
        zIndex: 60,
        layerCategory: 'technical',
        defaultVisible: false,
        iconName: 'Thermometer',
        documentation: 'docs/ventilation-spec.md'
    },
    {
        id: 'receptacles',
        title: 'Power Outlets',
        description: 'Class 1 and Class 2 power delivery points.',
        technicalDetails: 'Smart outlets and dedicated Class 2 power distribution for low-voltage devices.',
        zIndex: 55,
        layerCategory: 'technical',
        defaultVisible: false,
        iconName: 'Zap'
    },
    {
        id: 'infrastructure',
        title: 'Panels & Gear',
        description: 'Main service panels, LCPs, inverters, battery banks, and critical pathways.',
        technicalDetails: 'Smart panels (SPAN), hybrid inverters, LCP enclosures, and high-capacity architectural pathways.',
        zIndex: 65,
        layerCategory: 'technical',
        defaultVisible: true,
        iconName: 'Cpu'
    },
    {
        id: 'furniture',
        title: 'Furniture & Layout',
        description: 'Key furniture items for layout context.',
        technicalDetails: '3D furniture models used to check sensor coverage and lighting placement.',
        zIndex: 45,
        layerCategory: 'technical',
        defaultVisible: false,
        iconName: 'Layout'
    }
];

export const getSystemById = (id: string) => SYSTEM_REGISTRY.find(s => s.id === id);
