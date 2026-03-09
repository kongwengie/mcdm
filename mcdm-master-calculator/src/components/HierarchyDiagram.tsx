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

    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
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
      .attr("stroke-width", 1.5);

    // Nodes
    const node = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`);

    node.append("circle")
      .attr("r", 6)
      .attr("fill", (d: any) => d.data.isGoal ? "#4f46e5" : "#ffffff")
      .attr("stroke", "#4f46e5")
      .attr("stroke-width", 2);

    node.append("text")
      .attr("dy", ".35em")
      .attr("x", (d: any) => d.children ? -12 : 12)
      .attr("text-anchor", (d: any) => d.children ? "end" : "start")
      .text((d: any) => d.data.name)
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "10px")
      .attr("font-weight", (d: any) => d.data.isGoal ? "bold" : "normal")
      .attr("fill", "#334155");

    // Add weights if present
    node.append("text")
      .attr("dy", "1.5em")
      .attr("x", (d: any) => d.children ? -12 : 12)
      .attr("text-anchor", (d: any) => d.children ? "end" : "start")
      .text((d: any) => {
        if (d.data.isGoal) return "";
        const local = d.data.weight ? `L: ${d.data.weight.toFixed(2)}` : "";
        const global = globalWeights && globalWeights[d.data.id] ? `G: ${globalWeights[d.data.id].toFixed(3)}` : "";
        return local && global ? `(${local}, ${global})` : local ? `(${local})` : "";
      })
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "8px")
      .attr("opacity", 0.8)
      .attr("fill", "#64748b");

  }, [criteria, goalName]);

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
    <div className="w-full overflow-x-auto bg-white shadow-sm rounded-2xl border border-slate-200 p-4 relative">
      <button 
        onClick={handleDownload}
        className="absolute top-2 right-2 px-2 py-1 text-xs uppercase text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all rounded-lg"
      >
        Download SVG
      </button>
      <svg ref={svgRef} className="mx-auto"></svg>
    </div>
  );
};
