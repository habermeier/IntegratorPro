import React from 'react';
import { HardwareModule } from '../types';
import ProjectBOM from './ProjectBOM';
import { ViewMode } from '../types';
import { PREFERRED_VENDORS } from '../constants';

interface CoverSheetProps {
    modules: HardwareModule[];
    onNavigate?: (mode: ViewMode | 'COVER_SHEET', itemId?: string) => void;
    highlightedModuleId?: string | null;
}

const CoverSheet: React.FC<CoverSheetProps> = ({ modules, onNavigate, highlightedModuleId }) => {

    // Auto-scroll logic for text sections
    React.useEffect(() => {
        if (highlightedModuleId) {
            // Check if it's a section or module
            const el = document.getElementById(highlightedModuleId) || document.getElementById(`row-${highlightedModuleId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightedModuleId]);

    return (
        <div className="p-0 md:p-8 bg-slate-950 text-slate-300 font-sans max-w-5xl mx-auto">
            <h1 id="header-brief" className="hidden md:block text-4xl font-bold text-white mb-2">Project Brief</h1>

            <div className="flex flex-col md:flex-row gap-2 md:gap-4 text-xs md:text-sm mb-6 md:mb-8 text-slate-400 bg-slate-900/50 p-2 md:p-0 rounded-lg md:bg-transparent">
                <div className="flex justify-between md:justify-start gap-2">
                    <span className="font-bold text-slate-500 md:text-slate-400">Location:</span>
                    <span>270 Bolla Ave, Alamo, CA</span>
                </div>
                <span className="hidden md:inline">•</span>
                <div className="flex justify-between md:justify-start gap-2">
                    <span className="font-bold text-slate-500 md:text-slate-400">Status:</span>
                    <span className="text-emerald-400 font-medium">Down-to-studs Remodel / Framing Phase</span>
                </div>
            </div>

            <section id="section-objectives" className={`mb-4 md:mb-12 transition-all duration-500 py-4 md:p-6 rounded-none md:rounded-xl ${highlightedModuleId === 'section-objectives' ? 'bg-blue-900/40 border-l-2 md:border-2 border-blue-500/50' : 'border-b md:border border-slate-900/50 md:border-transparent'}`}>
                <h2
                    onClick={() => window.location.hash = '#project-brief/section-objectives'}
                    className="px-4 md:px-0 text-xl md:text-2xl font-bold text-blue-400 mb-2 md:mb-3 border-b border-blue-900/30 pb-2 cursor-pointer hover:text-blue-300 transition-colors"
                >
                    1. Functional Objectives
                </h2>
                <p className="px-4 md:px-0 mb-4 text-sm md:text-base leading-relaxed text-slate-400">
                    The objective is to deploy a comprehensive, hardwired building automation system that prioritizes reliability,
                    code compliance, and environmental intelligence.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-3 divide-y divide-slate-800 md:divide-y-0">
                    <div className="bg-transparent md:bg-slate-900 p-4 md:p-3 rounded-none md:rounded-lg border-0 md:border border-slate-800">
                        <h3 className="font-bold text-slate-200 mb-1 text-sm">Regulatory Compliance</h3>
                        <p className="text-xs text-slate-500 md:text-slate-400">Adherence to <strong>Title 24, Part 6</strong>.</p>
                    </div>
                    <div className="bg-transparent md:bg-slate-900 p-4 md:p-3 rounded-none md:rounded-lg border-0 md:border border-slate-800">
                        <h3 className="font-bold text-slate-200 mb-1 text-sm">Inspection Readiness</h3>
                        <p className="text-xs text-slate-500 md:text-slate-400">"Default State" independent of HA.</p>
                    </div>
                    <div className="bg-transparent md:bg-slate-900 p-4 md:p-3 rounded-none md:rounded-lg border-0 md:border border-slate-800">
                        <h3 className="font-bold text-slate-200 mb-1 text-sm">Sensor-Driven</h3>
                        <p className="text-xs text-slate-500 md:text-slate-400">Minimizes "wall acne".</p>
                    </div>
                </div>

                <div className="mt-6 bg-red-900/20 border border-red-900/40 p-4 rounded-lg">
                    <h3 className="font-bold text-red-200 mb-2 flex items-center gap-2">
                        <span>🛡️</span> NEC 2023 Compliance Strategy (Approved)
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                        Adopts the <strong>"Golden Route"</strong> methodology for US Code Compliance (NEC 2023 / UL 508A).
                        The architecture utilizes <strong>UL-Listed Siemens KNX Gateways</strong> and <strong>eldoLED Drivers</strong> to eliminate "Red Tag" risks at the source.
                        Crucially, power distribution uses active <strong>Electronic Circuit Protectors (Phoenix Contact CBM)</strong> to strictly limit all field wiring to &lt;100W Class 2 standards foundation-wide.
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed mt-2 pt-2 border-t border-red-900/30">
                        <strong>Wiring Strategy:</strong> To adhere to California/NEC separation rules while minimizing labor, we utilize <strong>Southwire MC-PCS Duo</strong> (or Romex PCS Duo). This "Compliance Hack" bundles Class 1 Power (12/2) and Class 2 Control (16/2 shielded) in a single jacket, allowing legal single-pull installation for all DALI/0-10V fixtures.
                    </p>
                </div>
            </section>

            <section id="section-architecture" className={`mb-4 md:mb-12 transition-all duration-500 py-4 md:p-6 rounded-none md:rounded-xl ${highlightedModuleId === 'section-architecture' ? 'bg-emerald-900/40 border-l-2 md:border-2 border-emerald-500/50' : 'border-b md:border border-slate-900/50 md:border-transparent'}`}>
                <h2
                    onClick={() => window.location.hash = '#project-brief/section-architecture'}
                    className="px-4 md:px-0 text-2xl font-bold text-emerald-400 mb-4 border-b border-emerald-900/30 pb-2 cursor-pointer hover:text-emerald-300 transition-colors"
                >
                    2. Technical Architecture
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 md:px-0">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">Lighting Topology (DALI-2 / KNX)</h3>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-400">
                            <li>Line voltage fixtures utilize <strong>DALI-2 drivers</strong> (Lunatone) for 0.1% dimming.</li>
                            <li>5-wire cabling (Line, Neutral, Ground, DALI+, DALI-).</li>
                            <li><strong>No switch loops:</strong> All control points are low-voltage bus devices.</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">Centralized Panels</h3>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-400">
                            <li><strong>LCP-1 (Left Wing/Garage):</strong> NEMA enclosure (Saginaw 24x24x8). High-heat/Exterior.</li>
                            <li><strong>LCP-2 (Right Wing/Bedrooms):</strong> Structured Media Center (Leviton 21").</li>
                            <li><strong>MDF (Main Data):</strong> Logic Server, Network Core, Gateway Bridges.</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section id="section-standards" className={`mb-4 md:mb-12 transition-all duration-500 py-4 md:p-6 rounded-none md:rounded-xl ${highlightedModuleId === 'section-standards' ? 'bg-amber-900/40 border-l-2 md:border-2 border-amber-500/50' : 'border-b md:border border-slate-900/50 md:border-transparent'}`}>
                <h2
                    onClick={() => window.location.hash = '#project-brief/section-standards'}
                    className="px-4 md:px-0 text-2xl font-bold text-amber-400 mb-4 border-b border-amber-900/30 pb-2 cursor-pointer hover:text-amber-300 transition-colors"
                >
                    3. Component Standards
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-4 text-sm mb-6 divide-y divide-slate-800 md:divide-y-0 text-slate-400">
                    <div className="bg-transparent md:bg-slate-900 p-4 md:p-3 rounded-none md:rounded border-0 md:border border-slate-800">
                        <h4 className="font-bold text-slate-200 text-sm">Enclosures</h4>
                        <p className="text-xs">Saginaw / Leviton</p>
                    </div>
                    <div className="bg-transparent md:bg-slate-900 p-4 md:p-3 rounded-none md:rounded border-0 md:border border-slate-800">
                        <h4 className="font-bold text-slate-200 text-sm">Lighting</h4>
                        <p className="text-xs">MDT / Lunatone</p>
                    </div>
                    <div className="bg-transparent md:bg-slate-900 p-4 md:p-3 rounded-none md:rounded border-0 md:border border-slate-800">
                        <h4 className="font-bold text-slate-200 text-sm">Sensors</h4>
                        <p className="text-xs">Steinel / ABB Inputs</p>
                    </div>
                </div>

                <div className="px-4 md:px-0">
                    <div className="bg-transparent md:bg-amber-900/10 border-0 md:border border-amber-900/30 p-0 md:p-4 rounded-none md:rounded-lg">
                        <h3 className="font-bold text-amber-400 mb-2">Panel Assembly Preferences</h3>
                        <p className="text-sm text-slate-300 mb-2">
                            To ensure the highest quality and cleanliness for the home, we have a strong preference for the following assembly standards:
                        </p>
                        <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                            <li><strong>Off-Site Build:</strong> Ideally, panels would be pre-assembled and bench-tested in a clean shop environment rather than built on-site.</li>
                            <li><strong>Dust Control:</strong> Delivering pre-wired panels helps keep the mechanical room free of drilling debris and metal shavings.</li>
                            <li><strong>Wire Management:</strong> We prefer Panduit wire ducting and velcro straps (over zip ties) for a clean, serviceable finish.</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section id="section-collaboration" className={`mb-4 md:mb-12 transition-all duration-500 py-4 md:p-6 rounded-none md:rounded-xl ${highlightedModuleId === 'section-collaboration' ? 'bg-purple-900/40 border-l-2 md:border-2 border-purple-500/50' : 'border-b md:border border-slate-900/50 md:border-transparent'}`}>
                <h2
                    onClick={() => window.location.hash = '#project-brief/section-collaboration'}
                    className="px-4 md:px-0 text-2xl font-bold text-purple-400 mb-4 border-b border-purple-900/30 pb-2 cursor-pointer hover:text-purple-300 transition-colors"
                >
                    4. Collaboration Model
                </h2>
                <div className="bg-transparent md:bg-slate-900/50 p-0 md:p-6 rounded-none md:rounded-xl border-0 md:border border-dashed border-slate-700 px-4 md:px-6">
                    <p className="mb-4">
                        <strong>Flexible Collaboration Model:</strong> The Owner (Software Engineer) has significant hands-on home improvement experience (framing modifications, window casing, hardwood flooring, stair building) and is willing to contribute labor where helpful.
                    </p>
                    <p className="mb-4 text-xs text-slate-400">
                        The following breakdown is a proposed guideline. The Owner is flexible and open to the Integrator's workflow recommendations.
                    </p>
                    {/* Mobile: Vertical List (No Scroll) */}
                    <div className="block md:hidden space-y-4">
                        {[
                            { scope: 'High Voltage (HV)', approach: 'Pro / Electrician', notes: 'Professional scope (Safety/Code).', color: 'text-orange-400' },
                            { scope: 'Panel Build', approach: 'Pro Integrator', notes: 'Owner prefers Pro to handle physical build.', color: 'text-blue-400' },
                            { scope: 'LV Wire Pulling', approach: 'Joint / Flexible', notes: 'Owner willing to assist with drilling/pulling.', color: 'text-purple-400' },
                            { scope: 'Device Registration', approach: 'Owner', notes: 'Bench registration/labeling pre-install.', color: 'text-purple-400' },
                            { scope: 'Commissioning', approach: 'Joint / Flexible', notes: 'Owner leads Logic/AI; Pro validates electrical.', color: 'text-purple-400' }
                        ].map((item, idx) => (
                            <div key={idx} className="border-b border-slate-800/50 pb-3 mb-3 last:border-0 hover:bg-slate-900/30 -mx-4 px-4 py-2">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="font-bold text-slate-200 text-sm">{item.scope}</h4>
                                    <span className={`text-xs font-bold ${item.color}`}>{item.approach}</span>
                                </div>
                                <p className="text-xs text-slate-500">{item.notes}</p>
                            </div>
                        ))}
                    </div>

                    {/* Desktop: Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-800">
                                <tr>
                                    <th className="px-4 py-2">Scope Item</th>
                                    <th className="px-4 py-2">Collaboration Approach</th>
                                    <th className="px-4 py-2">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                <tr className="bg-slate-900/30">
                                    <td className="px-4 py-2 font-medium">High Voltage (HV)</td>
                                    <td className="px-4 py-2 text-orange-400">Pro / Electrician</td>
                                    <td className="px-4 py-2">Professional scope (Safety/Code).</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 font-medium">Panel Build (Physical)</td>
                                    <td className="px-4 py-2 text-blue-400">Pro Integrator</td>
                                    <td className="px-4 py-2">Owner prefers Pro to handle physical build; Owner willing to assist.</td>
                                </tr>
                                <tr className="bg-slate-900/30">
                                    <td className="px-4 py-2 font-medium">LV Wire Pulling</td>
                                    <td className="px-4 py-2 text-purple-400">Joint / Flexible</td>
                                    <td className="px-4 py-2">Owner is capable and willing to assist with drilling/pulling.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 font-medium">Device Registration</td>
                                    <td className="px-4 py-2 text-purple-400">Owner</td>
                                    <td className="px-4 py-2">Bench registration/labeling pre-install.</td>
                                </tr>
                                <tr className="bg-slate-900/30">
                                    <td className="px-4 py-2 font-medium">Commissioning</td>
                                    <td className="px-4 py-2 text-purple-400">Joint / Flexible</td>
                                    <td className="px-4 py-2">Owner interested in leading Logic/AI/HA; Pro to validate electrical function.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section id="section-sourcing" className={`mb-4 md:mb-12 transition-all duration-500 py-4 md:p-6 rounded-none md:rounded-xl ${highlightedModuleId === 'section-sourcing' ? 'bg-blue-900/40 border-l-2 md:border-2 border-blue-500/50' : 'border-b md:border border-slate-900/50 md:border-transparent'}`}>
                <h2
                    onClick={() => window.location.hash = '#project-brief/section-sourcing'}
                    className="px-4 md:px-0 text-2xl font-bold text-blue-400 mb-4 border-b border-blue-900/30 pb-2 cursor-pointer hover:text-blue-300 transition-colors"
                >
                    5. Sourcing Strategy
                </h2>
                <div className="px-4 md:px-0 bg-transparent md:bg-slate-900/50 p-0 md:p-4 rounded-none md:rounded-xl border-0 md:border border-slate-700">
                    <p className="mb-4 text-base md:text-sm text-slate-400 hidden md:block">
                        To streamline procurement, equipment has been consolidated to reputable vendors, prioritizing those with strong US presence and UL-compliance documentation.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-4 border-t border-slate-800 md:border-0 divide-y divide-slate-800 md:divide-y-0 text-slate-400">
                        {PREFERRED_VENDORS.map((vendor) => (
                            <div key={vendor.id} className="bg-transparent md:bg-slate-950 p-4 md:p-3 rounded-none md:rounded border-0 md:border border-slate-800 md:border-slate-800 flex flex-col h-full -mx-4 px-4 md:mx-0">
                                <div className="flex items-center justify-between mb-2 md:mb-1">
                                    <h4 className="font-bold text-white text-base md:text-sm truncate pr-1">{vendor.name}</h4>
                                    {vendor.tier === 1 && <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-1 py-0.5 rounded uppercase tracking-wider font-bold shrink-0">Prime</span>}
                                </div>
                                <p className="text-sm md:text-xs text-slate-500 mb-2 md:mb-1 leading-tight line-clamp-2 md:line-clamp-none min-h-[0]">{vendor.description}</p>
                                <ul className="hidden md:block text-[10px] md:text-xs text-slate-400 list-disc pl-3 mb-2 flex-1 leading-tight">
                                    {vendor.items.slice(0, 2).map((item, idx) => (
                                        <li key={idx} className="truncate">{item}</li>
                                    ))}
                                </ul>
                                {vendor.url && (
                                    <a
                                        href={vendor.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm md:text-xs text-blue-400 hover:text-blue-300 hover:underline mt-auto pt-2 md:pt-1 md:border-t border-slate-800/50 block w-full text-left md:text-right"
                                    >
                                        Link &rarr;
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="section-ownership" className={`mb-4 md:mb-12 transition-all duration-500 py-4 md:p-6 rounded-none md:rounded-xl ${highlightedModuleId === 'section-ownership' ? 'bg-slate-800/60 border-l-2 md:border-2 border-slate-500/50' : 'border-b md:border border-slate-900/50 md:border-transparent'}`}>
                <h2
                    onClick={() => window.location.hash = '#project-brief/section-ownership'}
                    className="px-4 md:px-0 text-2xl font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2 cursor-pointer hover:text-white transition-colors"
                >
                    6. Ownership & Handoff Guidelines
                </h2>
                <div className="bg-transparent md:bg-slate-900/50 p-0 md:p-6 rounded-none md:rounded-xl border-0 md:border border-dashed border-slate-700 px-4 md:px-6">
                    <p className="mb-4 text-sm text-slate-300">
                        The Owner's goal is to ensure the system is maintainable and transferrable, treating the automation infrastructure as a fixed asset of the home.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6 divide-y divide-slate-800 md:divide-y-0">
                        <div className="bg-transparent md:bg-slate-950 p-4 rounded-none md:rounded border-0 md:border border-slate-800">
                            <h4 className="font-bold text-slate-200 mb-1">1. Hardware License (Dongle)</h4>
                            <p className="text-sm text-slate-400">
                                The physical KNX USB Interface is a licensed asset and should remain on-site in the MDF rack.
                            </p>
                        </div>
                        <div className="bg-transparent md:bg-slate-950 p-4 rounded-none md:rounded border-0 md:border border-slate-800">
                            <h4 className="font-bold text-slate-200 mb-1">2. Master Data File (.knxproj)</h4>
                            <p className="text-sm text-slate-400">
                                The unencrypted project file containing all programming, logic, and device parameters.
                                <br /><em className="text-blue-400/80">Goal: Emailed to owner after every major revision.</em>
                            </p>
                        </div>
                        <div className="bg-transparent md:bg-slate-950 p-4 rounded-none md:rounded border-0 md:border border-slate-800">
                            <h4 className="font-bold text-slate-200 mb-1">3. Administrative Passwords</h4>
                            <ul className="list-disc list-inside text-sm text-slate-400">
                                <li><strong>Project Password:</strong> Required to edit the .knxproj file.</li>
                                <li><strong>BCU Keys:</strong> Device-level passwords required to reprogram switches.</li>
                            </ul>
                        </div>
                        <div className="bg-transparent md:bg-slate-950 p-4 rounded-none md:rounded border-0 md:border border-slate-800">
                            <h4 className="font-bold text-slate-200 mb-1">4. Transferability</h4>
                            <p className="text-sm text-slate-400">
                                All items above are considered fixtures of the home (like a boiler manual) and should be transferable to any future qualified integrator.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-12 py-4 md:p-6 rounded-none md:rounded-xl border-b md:border border-slate-900/50 md:border-transparent">
                <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-2 px-4 md:px-0">
                    <h2 className="text-2xl font-bold text-slate-200">7. Budget & Equipment Overview</h2>
                    <div className="text-xs text-slate-500">
                        See "Bill of Materials" tab for full details
                    </div>
                </div>

                <ProjectBOM modules={modules} summaryOnly={true} highlightedModuleId={highlightedModuleId} linkPrefix="project-brief" />



            </section>
        </div>
    );
};

export default CoverSheet;
