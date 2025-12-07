import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { HardwareModule, Connection } from '../types';

interface WiringDiagramProps {
  modules: HardwareModule[];
  connections: Connection[];
}

const WiringDiagram: React.FC<WiringDiagramProps> = ({ modules, connections }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || modules.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = 600; // Fixed height for now
    
    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .style("font", "12px sans-serif");

    // Prepare data
    // Expand modules by quantity for unique nodes
    const nodes: any[] = [];
    modules.forEach(m => {
        for(let i=0; i<m.quantity; i++) {
            nodes.push({
                id: `${m.id}-${i}`, // Matches visualizer ID scheme
                group: m.type,
                name: m.name,
                radius: m.mountType === 'RU' ? 20 : 10
            });
        }
    });

    // Simple auto-linking for mock visualization if no manual connections exist
    // In a real app, 'connections' prop would be robust. Here we might need to synthesize if empty.
    const links = connections.map(c => ({
        source: `${c.fromModuleId}-0`, // Default to first instance for now
        target: `${c.toModuleId}-0`,
        type: c.type
    })).filter(l => nodes.find(n => n.id === l.source) && nodes.find(n => n.id === l.target));


    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Lines
    const link = svg.append("g")
      .attr("stroke", "#64748b")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2);

    // Nodes
    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", (d: any) => {
          switch(d.group) {
              case 'NETWORK': return '#3b82f6';
              case 'CONTROLLER': return '#10b981';
              case 'POWER': return '#f59e0b';
              default: return '#64748b';
          }
      })
      .call(drag(simulation) as any);

    // Labels
    const text = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d: any) => d.name)
      .attr("x", 25)
      .attr("y", 5)
      .attr("fill", "#cbd5e1")
      .style("font-size", "10px");


    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
      
      text
        .attr("x", (d: any) => d.x + 12)
        .attr("y", (d: any) => d.y + 4);
    });

    function drag(sim: any) {
      function dragstarted(event: any) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) sim.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => {
      simulation.stop();
    };
  }, [modules, connections]);

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Wiring Topology</h3>
          <div className="flex gap-4 text-sm text-slate-400">
             <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>Network</div>
             <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span>Controller</div>
             <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span>Power</div>
          </div>
      </div>
      <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden relative shadow-inner">
        <svg ref={svgRef} className="w-full h-full cursor-move"></svg>
        {modules.length === 0 && (
             <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                 Add modules to see topology
             </div>
        )}
      </div>
    </div>
  );
};

export default WiringDiagram;
