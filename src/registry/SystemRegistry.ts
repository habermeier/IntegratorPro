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
        title: 'Load Control Panels',
        description: 'Centralized enclosures for control and power distribution.',
        technicalDetails: 'Industrial control panels housing gateways, drivers, and circuit protection.',
        zIndex: 65,
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
        title: 'Cabling & Paths',
        description: 'Conduits, cable trays, and main trunk lines.',
        technicalDetails: 'Physical routing paths and high-capacity architectural enclosures.',
        zIndex: 50,
        layerCategory: 'technical',
        defaultVisible: false,
        iconName: 'GitBranch'
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
