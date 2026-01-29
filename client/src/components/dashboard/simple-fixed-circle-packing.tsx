import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface SchemeData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  completion_status: string;
  total_villages: number;
  completed_villages: number;
}

export default function SimpleFixedCirclePacking() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch scheme status data
  const { data: schemeStatus, isLoading, error } = useQuery<SchemeData[]>({ 
    queryKey: ["/api/scheme-status"] 
  });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || isLoading || !schemeStatus || !Array.isArray(schemeStatus)) {
      return;
    }

    console.log('Circle Packing - Raw scheme data:', schemeStatus.length, 'records');

    // Get container dimensions
    const containerWidth = containerRef.current.offsetWidth;
    const width = Math.max(800, containerWidth);
    const height = 600;

    // Process data by region
    const regionStats = new Map<string, {
      totalSchemes: number;
      completedSchemes: number;
      inProgressSchemes: number;
    }>();
    
    schemeStatus.forEach((scheme: SchemeData) => {
      const region = scheme.region || 'Unknown';
      if (!regionStats.has(region)) {
        regionStats.set(region, {
          totalSchemes: 0,
          completedSchemes: 0,
          inProgressSchemes: 0
        });
      }
      
      const stats = regionStats.get(region)!;
      stats.totalSchemes += 1;
      
      if (scheme.completion_status === 'Fully Completed') {
        stats.completedSchemes += 1;
      } else {
        stats.inProgressSchemes += 1;
      }
    });

    console.log('Region statistics:', Array.from(regionStats.entries()));

    // Build hierarchy data - simpler structure
    const hierarchyData = {
      name: "Maharashtra Water Infrastructure",
      children: Array.from(regionStats.entries()).map(([regionName, stats]) => ({
        name: regionName,
        children: [
          {
            name: `${stats.completedSchemes} Completed`,
            value: Math.max(1, stats.completedSchemes),
            type: "completed"
          },
          {
            name: `${stats.inProgressSchemes} In Progress`,
            value: Math.max(1, stats.inProgressSchemes),
            type: "progress"
          }
        ]
      }))
    };

    console.log('Hierarchy data structure:', hierarchyData);

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Create hierarchy and pack layout
    const root = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.value || 1)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    const pack = d3.pack<any>()
      .size([width, height])
      .padding(8);

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
      if (d.depth === 1) return '#1976d2'; // Regions (blue)
      if (d.data.type === 'completed') return '#388e3c'; // Completed (green)
      if (d.data.type === 'progress') return '#f57c00'; // In progress (orange)
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
      .attr("fill-opacity", (d: any) => d.depth === 0 ? 0 : 0.8)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer");

    // Add text labels with better sizing and positioning
    node.filter((d: any) => d.depth > 0) // Only show text for non-root nodes
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .style("font-family", "Arial, sans-serif")
      .style("font-weight", "600")
      .style("fill", "#fff")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)")
      .style("font-size", (d: any) => {
        const minSize = 10;
        const maxSize = d.depth === 1 ? 16 : 14;
        const size = Math.min(maxSize, Math.max(minSize, d.r / 4));
        return size + "px";
      })
      .style("pointer-events", "none")
      .text((d: any) => {
        if (d.depth === 1) {
          // Region names - show region name
          return d.data.name;
        } else {
          // Leaf nodes - show count and type
          return d.data.name;
        }
      })
      .call((text: any) => {
        // Wrap long text for region names
        text.each(function(d: any) {
          if (d.depth === 1 && d.data.name.length > 10) {
            const words = d.data.name.split(' ');
            if (words.length > 1) {
              const textElement = d3.select(this);
              textElement.text(null);
              
              words.forEach((word: string, i: number) => {
                textElement.append("tspan")
                  .attr("x", 0)
                  .attr("dy", i === 0 ? "0em" : "1.1em")
                  .text(word);
              });
            }
          }
        });
      });

    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(20, ${height - 100})`);

    const legendData = [
      { color: "#1976d2", label: "Regions" },
      { color: "#388e3c", label: "Completed Schemes" },
      { color: "#f57c00", label: "In Progress" }
    ];

    const legendItem = legend.selectAll(".legend-item")
      .data(legendData)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (_: any, i: number) => `translate(0, ${i * 22})`);

    legendItem.append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => d.color);

    legendItem.append("text")
      .attr("x", 18)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "13px")
      .style("font-weight", "500")
      .style("fill", "#333")
      .text((d: any) => d.label);

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("font-family", "Arial, sans-serif")
      .style("font-size", "18px")
      .style("font-weight", "600")
      .style("fill", "#1976d2")
      .text("Water Infrastructure Hierarchy");

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
          Circle size represents the number of schemes. Green = Completed, Orange = In Progress
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