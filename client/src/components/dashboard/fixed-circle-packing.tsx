import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function FixedCirclePacking() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch scheme status data
  const { data: schemeStatus, isLoading, error } = useQuery({ 
    queryKey: ["/api/scheme-status"] 
  });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || isLoading || !schemeStatus) {
      return;
    }

    // Get container dimensions
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = Math.max(600, containerWidth * 0.75);
    const width = containerWidth;
    const height = containerHeight;

    console.log('Building circle packing with data:', schemeStatus);

    // Process data by region
    const regionStats = new Map();
    
    // Ensure schemeStatus is an array
    const schemes = Array.isArray(schemeStatus) ? schemeStatus : [];
    
    schemes.forEach((scheme: any) => {
      const region = scheme.region;
      if (!regionStats.has(region)) {
        regionStats.set(region, {
          totalSchemes: 0,
          completedSchemes: 0,
          totalVillages: 0,
          completedVillages: 0
        });
      }
      
      const stats = regionStats.get(region);
      stats.totalSchemes += 1;
      if (scheme.completion_status === 'Fully Completed') {
        stats.completedSchemes += 1;
      }
      stats.totalVillages += scheme.total_villages || 0;
      stats.completedVillages += scheme.completed_villages || 0;
    });

    console.log('Region statistics:', Array.from(regionStats.entries()));

    // Build hierarchy data
    const hierarchyData = {
      name: "Maharashtra Water Infrastructure",
      type: "root",
      children: Array.from(regionStats.entries()).map(([regionName, stats]) => ({
        name: regionName,
        type: "region",
        children: [
          {
            name: `${stats.completedSchemes} Completed Schemes`,
            type: "completed",
            value: stats.completedSchemes || 1,
            count: stats.completedSchemes
          },
          {
            name: `${stats.totalSchemes - stats.completedSchemes} In Progress`,
            type: "progress", 
            value: Math.max(1, stats.totalSchemes - stats.completedSchemes),
            count: stats.totalSchemes - stats.completedSchemes
          }
        ]
      }))
    };

    console.log('Hierarchy data:', hierarchyData);

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Create hierarchy and pack layout
    const root = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.value || 1)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    const pack = d3.pack()
      .size([width, height])
      .padding(5);

    pack(root);

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("max-width", "100%")
      .style("height", "auto");

    // Color scheme
    const getColor = (d: any) => {
      if (d.depth === 0) return 'transparent'; // Root (invisible)
      if (d.depth === 1) return '#2196f3'; // Regions (blue)
      if (d.data.type === 'completed') return '#4caf50'; // Completed (green)
      if (d.data.type === 'progress') return '#ff9800'; // In progress (orange)
      return '#90caf9';
    };

    // Create groups for each node
    const node = svg.append("g")
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

    // Add circles
    node.append("circle")
      .attr("r", (d: any) => d.r)
      .attr("fill", (d: any) => getColor(d))
      .attr("fill-opacity", (d: any) => d.depth === 0 ? 0 : 0.7)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event: any, d: any) {
        d3.select(this).attr("fill-opacity", 0.9);
      })
      .on("mouseout", function(event: any, d: any) {
        d3.select(this).attr("fill-opacity", d.depth === 0 ? 0 : 0.7);
      });

    // Add text labels
    node.append("text")
      .attr("dy", "0.3em")
      .attr("text-anchor", "middle")
      .style("font-family", "Arial, sans-serif")
      .style("font-weight", "600")
      .style("fill", "#fff")
      .style("font-size", (d: any) => {
        if (d.depth === 0) return "0px"; // Hide root text
        if (d.depth === 1) return Math.min(d.r / 4, 18) + "px"; // Region names
        return Math.min(d.r / 3, 14) + "px"; // Leaf nodes
      })
      .style("pointer-events", "none")
      .text((d: any) => {
        if (d.depth === 0) return ""; // No text for root
        if (d.depth === 1) return d.data.name; // Region name
        return d.data.name; // Count text
      })
      .each(function(d: any) {
        // Wrap text if needed for region names
        if (d.depth === 1 && d.data.name.length > 12) {
          const text = d3.select(this);
          const words = d.data.name.split(' ');
          text.text(null);
          
          words.forEach((word: string, i: number) => {
            text.append("tspan")
              .attr("x", 0)
              .attr("dy", i === 0 ? "0em" : "1.1em")
              .text(word);
          });
        }
      });

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(20, ${height - 80})`);

    const legendData = [
      { color: "#2196f3", label: "Regions" },
      { color: "#4caf50", label: "Completed Schemes" },
      { color: "#ff9800", label: "In Progress" }
    ];

    const legendItem = legend.selectAll(".legend-item")
      .data(legendData)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (d: any, i: number) => `translate(0, ${i * 20})`);

    legendItem.append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => d.color);

    legendItem.append("text")
      .attr("x", 15)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "12px")
      .style("fill", "#333")
      .text((d: any) => d.label);

  }, [schemeStatus, isLoading]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Water Infrastructure Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading visualization...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Water Infrastructure Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 p-8">
            Error loading data: {error.toString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Water Infrastructure Hierarchy</CardTitle>
        <p className="text-sm text-gray-600">
          Click any circle to zoom in. Green = Completed Schemes, Orange = In Progress
        </p>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full">
          <svg ref={svgRef}></svg>
        </div>
      </CardContent>
    </Card>
  );
}