import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Criterion } from '../types/mcdm';

interface HierarchyDiagramProps {
  criteria: Criterion[];
  globalWeights?: Record<string, number>;
  goalName?: string;
}

export const HierarchyDiagram: React.FC<HierarchyDiagramProps> = ({ criteria, globalWeights, goalName = "Goal" }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous diagram
    d3.select(svgRef.current).selectAll("*").remove();

    // Build tree structure
    const buildTree = (parentId?: string): any => {
      return criteria
        .filter(c => c.parentId === parentId)
        .map(c => ({
          ...c,
          children: buildTree(c.id)
        }));
    };

    const treeData = {
      name: goalName,
      isGoal: true,
      children: buildTree(undefined)
    };

    const width = 1000;
    const height = Math.max(500, criteria.length * 40);
    const margin = { top: 40, right: 150, bottom: 40, left: 150 };

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const treeLayout = d3.tree().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    const root = d3.hierarchy(treeData);
    treeLayout(root);

    // Links
    svg.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x) as any)
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Nodes
    const node = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`);

    // Node Backgrounds (Rectangles)
    node.append("rect")
      .attr("x", -60)
      .attr("y", -20)
      .attr("width", 120)
      .attr("height", 40)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", (d: any) => d.data.isGoal ? "#4f46e5" : "#ffffff")
      .attr("stroke", (d: any) => d.data.isGoal ? "#4f46e5" : "#e2e8f0")
      .attr("stroke-width", 2)
      .attr("filter", "drop-shadow(0 4px 6px rgba(0,0,0,0.05))");

    // Node Text (Name)
    node.append("text")
      .attr("dy", (d: any) => (d.data.isGoal || !d.data.weight) ? "0.35em" : "-0.2em")
      .attr("text-anchor", "middle")
      .text((d: any) => d.data.name.length > 15 ? d.data.name.substring(0, 12) + '...' : d.data.name)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("fill", (d: any) => d.data.isGoal ? "#ffffff" : "#1e293b");

    // Node Text (Weights)
    node.append("text")
      .attr("dy", "1.2em")
      .attr("text-anchor", "middle")
      .text((d: any) => {
        if (d.data.isGoal) return "";
        const local = d.data.weight ? `L:${d.data.weight.toFixed(2)}` : "";
        const global = globalWeights && globalWeights[d.data.id] ? `G:${globalWeights[d.data.id].toFixed(3)}` : "";
        return local && global ? `${local} | ${global}` : local ? local : "";
      })
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "9px")
      .attr("fill", "#64748b");

  }, [criteria, goalName, globalWeights]);

  const handleDownload = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hierarchy.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full overflow-x-auto bg-slate-50 shadow-sm rounded-2xl border border-slate-200 p-6 relative">
      <button 
        onClick={handleDownload}
        className="absolute top-4 right-4 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-600 border border-slate-200 bg-white hover:bg-slate-100 transition-all rounded-lg shadow-sm z-10"
      >
        Download SVG
      </button>
      <svg ref={svgRef} className="mx-auto w-full h-auto min-h-[400px]"></svg>
    </div>
  );
};
