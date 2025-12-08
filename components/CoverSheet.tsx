import React from 'react';
import { HardwareModule } from '../types';
import ProjectBOM from './ProjectBOM';
import { ViewMode } from '../types';

interface CoverSheetProps {
    modules: HardwareModule[];
    onNavigate?: (view: ViewMode) => void;
}

const CoverSheet: React.FC<CoverSheetProps> = ({ modules, onNavigate }) => {
    return (
        <div className="h-full overflow-y-auto p-8 bg-slate-950 text-slate-300 font-sans max-w-5xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-2">Project Brief: Automated Building Systems (ABS)</h1>
            <div className="flex gap-4 text-sm mb-8 text-slate-400">
                <span><strong>Location:</strong> 270 Bolla Ave, Alamo, CA</span>
                <span>•</span>
                <span><strong>Status:</strong> Down-to-studs Remodel / Framing Phase</span>
            </div>

            <section className="mb-12">
                <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-blue-900/30 pb-2">1. Functional Objectives & Design Philosophy</h2>
                <p className="mb-4">
                    The objective is to deploy a comprehensive, hardwired building automation system that prioritizes reliability,
                    code compliance, and environmental intelligence. The system is designed to operate locally (offline) with a high degree
                    of sensor-driven automation, reducing reliance on physical wall switches.
                </p>
                <div className="space-y-4">
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <h3 className="font-bold text-slate-200 mb-1">Regulatory Compliance</h3>
                        <p className="text-sm">Strict adherence to <strong>California Building Standards Code (Title 24, Part 6)</strong> (lighting controls, occupancy sensing, energy efficiency).</p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <h3 className="font-bold text-slate-200 mb-1">Inspection Readiness</h3>
                        <p className="text-sm">Support a "Default State" that functions independently of advanced software layers (Home Assistant) for inspections.</p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <h3 className="font-bold text-slate-200 mb-1">Sensor-Driven Environment</h3>
                        <p className="text-sm">Minimizes "wall acne" via high density of presence/lux/environmental sensors. Primary interaction: automatic or indirect.</p>
                    </div>
                </div>
            </section>

            <section className="mb-12">
                <h2 className="text-2xl font-bold text-emerald-400 mb-4 border-b border-emerald-900/30 pb-2">2. Technical Architecture</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <section className="mb-12">
                <h2 className="text-2xl font-bold text-amber-400 mb-4 border-b border-amber-900/30 pb-2">3. Component Standards</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6">
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <h4 className="font-bold text-slate-200">Enclosures</h4>
                        <p>Saginaw SCE-242408LP<br />Leviton 47605-21E</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <h4 className="font-bold text-slate-200">Lighting</h4>
                        <p>MDT SCN-DALI64.03<br />Lunatone D2 Dimmers</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <h4 className="font-bold text-slate-200">Sensors</h4>
                        <p>Steinel TruePresence<br />Sensirion SDP810</p>
                    </div>
                </div>

                <div className="bg-amber-900/10 border border-amber-900/30 p-4 rounded-lg">
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
            </section>

            <section className="mb-12">
                <h2 className="text-2xl font-bold text-purple-400 mb-4 border-b border-purple-900/30 pb-2">4. Collaboration Model</h2>
                <div className="bg-slate-900/50 p-6 rounded-xl border border-dashed border-slate-700">
                    <p className="mb-4">
                        <strong>"Hybrid" Deployment:</strong> The Owner (Software Engineer) will contribute ~80 hours (2 weeks) of labor.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-800">
                                <tr>
                                    <th className="px-4 py-2">Scope Item</th>
                                    <th className="px-4 py-2">Lead</th>
                                    <th className="px-4 py-2">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                <tr className="bg-slate-900/30">
                                    <td className="px-4 py-2 font-medium">High Voltage (HV)</td>
                                    <td className="px-4 py-2 text-orange-400">Pro / Electrician</td>
                                    <td className="px-4 py-2">Safety/Code Strict.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 font-medium">LV Wire Pulling</td>
                                    <td className="px-4 py-2 text-blue-400">Pro Integrator</td>
                                    <td className="px-4 py-2">Efficient rough-in.</td>
                                </tr>
                                <tr className="bg-slate-900/30">
                                    <td className="px-4 py-2 font-medium">Panel Build</td>
                                    <td className="px-4 py-2 text-purple-400">Joint Effort</td>
                                    <td className="px-4 py-2">Owner: Assembly / Pro: Termination.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 font-medium">Commissioning</td>
                                    <td className="px-4 py-2 text-purple-400">Joint Effort</td>
                                    <td className="px-4 py-2">Owner: Logic/AI/Home Assistant.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="mb-12">
                <h2 className="text-2xl font-bold text-blue-400 mb-4 border-b border-blue-900/30 pb-2">5. Sourcing Strategy</h2>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <p className="mb-4 text-sm text-slate-400">
                        To streamline procurement, equipment has been consolidated to three primary reputable vendors.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-950 p-3 rounded border border-slate-800">
                            <h4 className="font-bold text-white mb-1">1. JMAC Supply</h4>
                            <p className="text-xs text-slate-500 mb-2">US-based Security & Low Voltage Distributor.</p>
                            <ul className="text-xs text-slate-400 list-disc pl-4">
                                <li>Saginaw Enclosures</li>
                                <li>Leviton Panels</li>
                                <li>HES Strikes & Altronix</li>
                                <li>Belden Cabling</li>
                            </ul>
                        </div>
                        <div className="bg-slate-950 p-3 rounded border border-slate-800">
                            <h4 className="font-bold text-white mb-1">2. Amazon</h4>
                            <p className="text-xs text-slate-500 mb-2">IT Hardware & Commodity Power.</p>
                            <ul className="text-xs text-slate-400 list-disc pl-4">
                                <li>ASUS NUC (Server)</li>
                                <li>Mean Well PSUs</li>
                                <li>Ubiquiti Networking</li>
                                <li>Velux KLF 200</li>
                            </ul>
                        </div>
                        <div className="bg-slate-950 p-3 rounded border border-slate-800">
                            <h4 className="font-bold text-white mb-1">3. KNX Supply (USA)</h4>
                            <p className="text-xs text-slate-500 mb-2">Domestic Distributor (Miami, FL).</p>
                            <ul className="text-xs text-slate-400 list-disc pl-4">
                                <li>MDT (KNX)</li>
                                <li>Lunatone (DALI)</li>
                                <li>Steinel (Sensors)</li>
                            </ul>
                        </div>
                        <div className="bg-slate-950 p-3 rounded border border-slate-800">
                            <h4 className="font-bold text-white mb-1">4. Akuvox Dealer</h4>
                            <p className="text-xs text-slate-500 mb-2">Authorized Akuvox Distributor.</p>
                            <ul className="text-xs text-slate-400 list-disc pl-4">
                                <li>Door Phones (X915, E16)</li>
                                <li>Intercom Licensing</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-12">
                <h2 className="text-2xl font-bold text-red-400 mb-4 border-b border-red-900/30 pb-2">6. Ownership Requirements</h2>
                <div className="bg-slate-900/50 p-6 rounded-xl border border-dashed border-red-900/30">
                    <p className="mb-4 text-sm text-slate-300">
                        Final payment is contingent upon the handover of the following items. These components constitute "System Ownership" and must transfer with the property title upon sale.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-950 p-4 rounded border border-slate-800">
                            <h4 className="font-bold text-red-300 mb-1">1. Hardware License (Dongle)</h4>
                            <p className="text-sm text-slate-400">
                                The physical KNX USB Interface (or "Dongle") is a licensed asset owned by the homeowner. It must remain on-site in the MDF rack.
                            </p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded border border-slate-800">
                            <h4 className="font-bold text-red-300 mb-1">2. Master Data File (.knxproj)</h4>
                            <p className="text-sm text-slate-400">
                                The unencrypted project file containing all programming, logic, and device parameters.
                                <br /><em className="text-red-400/80">Requirement: Must be emailed to owner after every major revision.</em>
                            </p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded border border-slate-800">
                            <h4 className="font-bold text-red-300 mb-1">3. Administrative Passwords</h4>
                            <ul className="list-disc list-inside text-sm text-slate-400">
                                <li><strong>Project Password:</strong> Required to edit the .knxproj file.</li>
                                <li><strong>BCU Keys:</strong> Device-level passwords required to reprogram switches.</li>
                            </ul>
                        </div>
                        <div className="bg-slate-950 p-4 rounded border border-slate-800">
                            <h4 className="font-bold text-red-300 mb-1">4. Transferability</h4>
                            <p className="text-sm text-slate-400">
                                All items above are considered fixtures of the home (like a boiler manual) and must be transferable to any future qualified integrator.
                            </p>
                        </div>
                    </div>
                </div>
            </section>


            <section className="mb-12">
                <h2 className="text-2xl font-bold text-slate-200 mb-6">7. Field & Rough-in Requirements</h2>
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-3">Device / Item</th>
                                <th className="px-6 py-3">Mounting & Dimensions</th>
                                <th className="px-6 py-3">Installation Notes</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {modules.filter(m => !['MDF', 'LCP-1'].includes(m.location)).map(m => (
                                <tr key={m.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-white">{m.name}</div>
                                        <div className="text-xs text-slate-500">{m.manufacturer} • {m.location}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                            {m.dimensions ? `${m.dimensions.width}"x${m.dimensions.height}"x${m.dimensions.depth}"` : m.mountType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {m.notes ? (
                                            <span className="text-amber-500/90 text-xs flex items-start gap-1">
                                                <span className="mt-0.5">•</span> {m.notes}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600 italic">--</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {onNavigate && (
                                            <button
                                                onClick={() => onNavigate('DASHBOARD')}
                                                className="text-xs text-blue-400 hover:text-blue-300 font-medium hover:underline"
                                            >
                                                View in BOM &rarr;
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-12">
                <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-2">
                    <h2 className="text-2xl font-bold text-slate-200">8. Budget & Equipment Overview</h2>
                    <div className="text-xs text-slate-500">
                        See "Bill of Materials" tab for full details
                    </div>
                </div>

                <ProjectBOM modules={modules} summaryOnly={true} />

                <div className="mt-6 flex justify-center">
                    <div className="text-center p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                        <p className="text-slate-400 text-sm mb-2">Detailed line-item pricing and part numbers are available in the full Bill of Materials view.</p>
                        {onNavigate && (
                            <button
                                onClick={() => onNavigate('DASHBOARD')}
                                className="text-blue-400 text-xs font-bold uppercase tracking-wider hover:text-blue-300 transition-colors"
                            >
                                &larr; Go to Bill of Materials
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default CoverSheet;
