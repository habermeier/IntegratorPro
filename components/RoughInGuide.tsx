import React from 'react';
import { HardwareModule, ViewMode, MountType, ConnectionType } from '../types';
import { Hammer, AlertCircle, ClipboardList, Ruler, Wrench, ListOrdered } from 'lucide-react';

interface RoughInGuideProps {
    modules: HardwareModule[];
    onNavigate: (mode: ViewMode | 'COVER_SHEET', itemId?: string) => void;
    highlightedModuleId?: string | null;
}

const RoughInGuide: React.FC<RoughInGuideProps> = ({ modules, onNavigate, highlightedModuleId }) => {
    const playbookRules = [
        { label: 'Topology', detail: 'Ceiling/attic spine. Drop down to each switch; keep bus continuous.' },
        { label: 'Pass-through', detail: '4-wire passthrough at every box (Red/Black + Yellow/White) to preserve redundancy.' },
        { label: 'Grounding', detail: 'Float the box for KNX/SELV terminations. Only bond at the main panel.' },
        { label: 'Slack', detail: 'Leave 12" of service loop in every box; tape over the ring after photos.' }
    ];

    const spacingGuidelines = [
        { label: 'Switch Height', detail: '48" AFF (US standard). For European feel, 42" is acceptable—be consistent per floor.' },
        { label: 'Horizontal', detail: 'Keep 2" minimum from door casing; align multiple gangs to a common centerline.' },
        { label: 'Stud Bay', detail: 'Center boxes in bay; use nail plates anywhere cable is <1.25" from stud face.' },
        { label: 'Ceiling Devices', detail: 'Maintain 18" minimum from supply diffusers; 6" away from can light trims.' },
        { label: 'Low/High Voltage', detail: 'Separate Class 2 (KNX/DALI) from 120V by 6" min inside cavities; never share knockouts.' }
    ];

    const hardwareKit = [
        { component: 'Deep 4" Metal Box', part: 'Raco 232', note: '2-1/8" depth; room for service loops and stiff bus cable.' },
        { component: 'Adjustable Mud Ring', part: 'Raco 768AMR', note: 'Adjusts 1/2"–1-3/8" to cover drywall depth variance.' },
        { component: 'Snap-in Bushing', part: 'Arlington 4400', note: 'Protects KNX/DALI cable from metal knockout edges.' },
        { component: 'Nail Plates', part: 'Standard FHA', note: 'Use anywhere cable passes through studs or plates.' },
        { component: 'KNX Bus Cable', part: 'J-Y(St)Y 2x2x0.8 (Green)', note: 'Use shielded 2-pair; no Cat6 substitutions.' },
        { component: 'Wago KNX Blocks', part: '243-211 (Red/Black) + 243-212 (Yellow/White)', note: 'Snap together to keep bus + spare pair continuous.' }
    ];

    const installerSteps = [
        'Mount deep 4" boxes plumb; use adjustable mud rings and set final depth after drywall.',
        'Punch a single knockout, insert the bushing, and pull KNX/DALI cable with a gentle radius.',
        'Leave 12" slack; strip jacket, then cut and tape the drain wire so it floats in the box.',
        'Land Red/Black on device or Wago 243-211; keep Yellow/White continuous on 243-212.',
        'Label the box (zone + universe), take a photo, then tape over the ring to keep mud out.'
    ];

    const specialtyTopics = [
        {
            title: 'Bathrooms & Laundry (Fans / Humidity)',
            bullets: [
                'Use the DALI-to-0-10V interface for bath exhaust; label the drop by room before drywall.',
                'Mount fan switches at 48" AFF; keep bus cable 6" away from 120V fan feeds inside the wall.',
                'Add 12" slack at the ceiling box if a humidity or motion sensor is planned for future.'
            ]
        },
        {
            title: 'Closets & Pantry',
            bullets: [
                'Pull KNX bus to every closet switch even if occupancy is planned; future-proofs for scenes.',
                'Maintain 6" horizontal separation from closet light junction boxes to avoid AC coupling noise.',
                'Note door swing and place switches on the latch side for clear access.'
            ]
        },
        {
            title: 'Windows / Shades / Skylights',
            bullets: [
                'Run KNX to window zones for keypad or contact integration; keep spare Yellow/White pair continuous.',
                'For skylights, leave labeled pigtails coiled in the curb box; tape drain wire, float the box.',
                'Document cable paths around windows with photos before insulation (helps shade motor retrofit).'
            ]
        }
    ];

    // Auto-scroll Effect
    React.useEffect(() => {
        if (highlightedModuleId) {
            const el = document.getElementById(`rough-row-${highlightedModuleId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightedModuleId]);

    const isKnx = (m: HardwareModule) =>
        (m.requiresBus || []).includes(ConnectionType.KNX) ||
        (m.genericRole || '').toLowerCase().includes('knx') ||
        m.name.toLowerCase().includes('knx');

    const isDali = (m: HardwareModule) =>
        (m.requiresBus || []).includes(ConnectionType.DALI) ||
        (m.genericRole || '').toLowerCase().includes('dali') ||
        m.name.toLowerCase().includes('dali');

    const isFieldMounted = (m: HardwareModule) =>
        m.mountType !== MountType.DIN_RAIL && m.mountType !== MountType.RACK_UNIT;

    const cablingSections = [
        {
            title: 'KNX Bus',
            ok: [
                'Daisy-chain / pass-through only. No loops or stubs.',
                'Use 4-wire (Red/Black + Yellow/White) with Wago 243 blocks at every box.',
                'Drain wire is cut and taped; box floats. Bushing on every knockout.'
            ],
            avoid: [
                'No star/loop topologies.',
                'Do not share knockouts with 120V or staple with Romex.',
                'Do not cut the spare pair; always keep Yellow/White continuous.'
            ],
            junction: 'Inline Wago 243-211 (bus) + 243-212 (aux) inside 4" box; maintain color order.'
        },
        {
            title: 'DALI',
            ok: [
                'Bus daisy-chain is preferred; avoid rings.',
                'Maintain 6"+ separation from mains; use bushings on metal knockouts.',
                '12" slack at each fixture can; tag with Universe/Channel when known.'
            ],
            avoid: [
                'No loops; avoid sharing stud holes with Romex.',
                'Do not bundle tightly with KNX in the same knockout.',
                'Do not exceed recommended run lengths without gauge check.'
            ],
            junction: 'Use Wago 221/222 or fixture whip junctions; keep polarity consistent though DALI is polarity agnostic.'
        },
        {
            title: 'CAT6 / CAT6a',
            ok: [
                'Home run to patch panel; label both ends.',
                'Respect bend radius and pull tension; Velcro (no zip ties) in bundles.',
                'Keep 12"+ from parallel 120V runs; cross at 90° when needed.'
            ],
            avoid: [
                'No kinks, staples, or tight 90s.',
                'Do not mix riser with plenum areas.',
                'Avoid sharing conduit with AC unless rated separation is maintained.'
            ],
            junction: 'No mid-span splices. Use keystones/patch panels only.'
        },
        {
            title: 'Fiber (SM/MM)',
            ok: [
                'Pull in micro-duct or flexible innerduct; cap ends immediately.',
                'Observe 30 mm+ bend radius (check cable spec).',
                'Leave 3–5m service loops at racks/IDF and neatly coil.'
            ],
            avoid: [
                'No hard bends, crushing, or cable ties pulled tight.',
                'Keep away from sharp metal edges; always use bushings/duct.',
                'Do not uncap in dusty environments.'
            ],
            junction: 'No field splices in walls. Terminate in enclosures or patch panels; use factory pigtails or pre-terminated ends.'
        }
    ];

    const sections = [
        {
            id: 'knx',
            title: 'KNX Field & Switches',
            description: 'Bus cabling, keypads, sensors, and pass-through blocks. Focus: continuous 4-wire and floated metal boxes.',
            predicate: (m: HardwareModule) => isKnx(m) && isFieldMounted(m),
            notes: [
                'Always pass Red/Black + Yellow/White through every box; do not cut the spare pair.',
                'Float the metal box; drain wire is taped and not bonded.'
            ]
        },
        {
            id: 'dali',
            title: 'DALI Fixtures & Drops',
            description: 'Fixture rough-in and ceiling pulls for DALI. Drivers stay centralized; ceiling devices get slack and separation.',
            predicate: (m: HardwareModule) => isDali(m) && isFieldMounted(m),
            notes: [
                'Keep 6"+ separation from line-voltage runs; avoid sharing stud holes with Romex.',
                'Leave 12" slack at each fixture can; tag with Universe/Channel if known.'
            ]
        },
        {
            id: 'lcp1',
            title: 'LCP-1 (Lighting Control Panel 1)',
            description: 'DIN gear, gateways, and power for primary floor. Verify gutter space and Class 2 separation.',
            predicate: (m: HardwareModule) => (m.location || '').toUpperCase() === 'LCP-1'
        },
        {
            id: 'lcp2',
            title: 'LCP-2 (Lighting Control Panel 2)',
            description: 'DIN gear for upper/secondary zones. Mirror labeling and channel map from LCP-1.',
            predicate: (m: HardwareModule) => (m.location || '').toUpperCase() === 'LCP-2'
        },
        {
            id: 'tech',
            title: 'Tech Room / MDF',
            description: 'Head-end terminations, IP uplinks, and service loops for diagnostics.',
            predicate: (m: HardwareModule) => {
                const loc = (m.location || '').toUpperCase();
                return loc === 'MDF' || loc === 'TECH ROOM' || loc === 'IDF' || loc === 'RACK';
            }
        }
    ];

    return (
        <div className="space-y-4 md:space-y-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 md:p-6 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center mb-2 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <Hammer className="mr-2 text-amber-500" />
                            Field & Rough-in Requirements
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Installation guide for electricians and low-voltage technicians.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 md:p-6 shadow-lg space-y-3">
                    <div className="flex items-center gap-2 text-white font-semibold">
                        <ClipboardList className="text-amber-500" size={18} />
                        Rough-in Playbook
                    </div>
                    <p className="text-sm text-slate-400">
                        Hand this to the field crew before pulling cable. Emphasizes continuity, redundancy, and drywall-proof mounting.
                    </p>
                    <div className="space-y-2">
                        {playbookRules.map(rule => (
                            <div key={rule.label} className="flex items-start gap-2 text-sm text-slate-200">
                                <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] uppercase tracking-wide text-amber-400">
                                    {rule.label}
                                </span>
                                <span className="text-slate-300">{rule.detail}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 md:p-6 shadow-lg space-y-3">
                    <div className="flex items-center gap-2 text-white font-semibold">
                        <Ruler className="text-amber-500" size={18} />
                        Spacing & Mounting
                    </div>
                    <p className="text-sm text-slate-400">
                        Lock these in before drywall. Consistent heights and separations avoid rework and inspector callbacks.
                    </p>
                    <div className="space-y-2">
                        {spacingGuidelines.map(item => (
                            <div key={item.label} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className="w-32 text-xs font-semibold text-amber-400">{item.label}</span>
                                <span className="flex-1">{item.detail}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 md:p-6 shadow-lg space-y-3">
                    <div className="flex items-center gap-2 text-white font-semibold">
                        <Wrench className="text-amber-500" size={18} />
                        Field Hardware Kit
                    </div>
                    <p className="text-sm text-slate-400">
                        Order this kit for rough-in day. Covers drywall depth uncertainty and protects bus cabling.
                    </p>
                    <div className="overflow-hidden rounded-lg border border-slate-800">
                        <table className="w-full text-sm text-slate-300">
                            <tbody className="divide-y divide-slate-800">
                                {hardwareKit.map(item => (
                                    <tr key={item.part}>
                                        <td className="px-3 py-2 font-semibold text-white">{item.component}</td>
                                        <td className="px-3 py-2 text-amber-400 whitespace-nowrap">{item.part}</td>
                                        <td className="px-3 py-2 text-slate-400">{item.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
            </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 md:p-6 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 text-white font-semibold">
                        <Hammer className="text-amber-500" size={18} />
                        Cabling Standards (By Technology)
                    </div>
                    <p className="text-sm text-slate-400 max-w-2xl">
                        What is OK vs. not OK for each medium. Print and pin in the tech room for the pull crew.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {cablingSections.map(section => (
                        <div key={section.title} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
                            <div className="text-sm font-semibold text-white">{section.title}</div>
                            <div className="space-y-2">
                                <div className="text-[11px] font-semibold text-emerald-300">OK</div>
                                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                    {section.ok.map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <div className="text-[11px] font-semibold text-rose-300">Avoid</div>
                                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                    {section.avoid.map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[11px] font-semibold text-amber-300">Junction / Termination</div>
                                <p className="text-xs text-slate-300 leading-relaxed">{section.junction}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 md:p-6 shadow-lg space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold">
                    <ListOrdered className="text-amber-500" size={18} />
                    Installer Checklist (Post on Site)
                </div>
                <p className="text-sm text-slate-400">
                    Sequential rough-in steps to avoid drywall rework and KNX bus noise issues.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-200">
                    {installerSteps.map(step => (
                        <li key={step} className="ml-1 leading-relaxed text-slate-300">{step}</li>
                    ))}
                </ol>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 md:p-6 shadow-lg space-y-4">
                <div className="flex items-center gap-2 text-white font-semibold">
                    <Hammer className="text-amber-500" size={18} />
                    Specialty Areas (Bathrooms, Closets, Windows)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {specialtyTopics.map(topic => (
                        <div key={topic.title} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                            <div className="text-sm font-semibold text-white">{topic.title}</div>
                            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                {topic.bullets.map(item => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {sections.map(section => {
                const sectionModules = modules.filter(section.predicate);
                return (
                    <div key={section.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4 md:p-6 shadow-lg space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                                <div className="text-white font-semibold text-lg">{section.title}</div>
                                <p className="text-sm text-slate-400">{section.description}</p>
                            </div>
                            {section.notes && (
                                <div className="flex flex-wrap gap-2">
                                    {section.notes.map(note => (
                                        <span key={note} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[11px] text-amber-400">
                                            {note}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {sectionModules.length === 0 ? (
                            <div className="text-sm text-slate-500">No devices mapped to this section yet.</div>
                        ) : (
                            <>
                                <div className="md:hidden grid grid-cols-1 gap-3">
                                    {sectionModules.map(m => (
                                        <div
                                            key={m.id}
                                            id={`rough-row-${m.id}`}
                                            onClick={() => window.location.hash = `#rough-in/${m.id}`}
                                            className={`rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2 transition-colors cursor-pointer ${highlightedModuleId === m.id ? 'bg-amber-900/20 border-amber-500' : 'hover:bg-slate-800/50'}`}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <div className="text-white font-medium">{m.name}</div>
                                                    <div className="text-xs text-slate-500">{m.manufacturer}</div>
                                                </div>
                                                <span className="px-2 py-1 bg-slate-800 rounded text-xs border border-slate-700">
                                                    {m.mountType.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400">Location: <span className="text-white">{m.location || '—'}</span></div>
                                            <div className="flex items-start text-xs text-amber-500/90 leading-relaxed">
                                                <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                                {m.notes || 'Standard Installation'}
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-slate-300">
                                                <span className="font-mono text-white">Qty: {m.quantity}</span>
                                                <button
                                                    onClick={() => onNavigate('VISUALIZER', m.id)}
                                                    className="text-blue-400 hover:text-white hover:underline"
                                                >
                                                    View in Rack
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-400">
                                        <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500 border-b border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Device / Model</th>
                                                <th className="px-4 py-3">Mounting</th>
                                                <th className="px-4 py-3">Location</th>
                                                <th className="px-4 py-3">Install Notes</th>
                                                <th className="px-4 py-3 text-right">Qty</th>
                                                <th className="px-4 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {sectionModules.map(m => (
                                                <tr
                                                    key={m.id}
                                                    id={`rough-row-${m.id}`}
                                                    onClick={() => window.location.hash = `#rough-in/${m.id}`}
                                                    className={`transition-colors cursor-pointer ${highlightedModuleId === m.id ? 'bg-amber-900/20 border-l-4 border-l-amber-500' : 'hover:bg-slate-800/50'}`}
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-white">{m.name}</div>
                                                        <div className="text-xs text-slate-500">{m.manufacturer}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 bg-slate-800 rounded text-xs border border-slate-700">
                                                            {m.mountType.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-white">{m.location || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-start text-xs text-amber-500/90 max-w-lg leading-relaxed">
                                                            <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                                            {m.notes || 'Standard Installation'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-white">{m.quantity}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => onNavigate('VISUALIZER', m.id)}
                                                            className="text-xs text-blue-400 hover:text-white hover:underline"
                                                        >
                                                            View in Rack
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default RoughInGuide;
