import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
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

interface HierarchyNode {
  name: string;
  value?: number;
  type?: string;
  children?: HierarchyNode[];
}

interface RegionData {
  region_id: number;
  region_name: string;
  F;
  total_schemes_integrated: number;
  fully_completed_schemes: number;
  total_villages_integrated: number;
  fully_completed_villages: number;
  total_esr_integrated: number;
  fully_completed_esr: number;
}

export default function ZoomableCirclePacking() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentNode, setCurrentNode] = useState<any>(null);

  // Fetch regions data which has the correct scheme counts
  const {
    data: regions,
    isLoading,
    error,
  } = useQuery<RegionData[]>({
    queryKey: ["/api/regions"],
  });

  useEffect(() => {
    if (
      !svgRef.current ||
      !containerRef.current ||
      isLoading ||
      !regions ||
      !Array.isArray(regions)
    ) {
      return;
    }

    // Container dimensions
    const containerWidth = containerRef.current.offsetWidth;
    const width = Math.max(800, containerWidth);
    const height = 600;
    const margin = 20;

    // Build hierarchy using correct regions data
    const hierarchyData: HierarchyNode = {
      name: "Maharashtra",
      children: regions
        .map((region: RegionData) => {
          const completedSchemes = region.fully_completed_schemes;
          const inProgressSchemes =
            region.total_schemes_integrated - region.fully_completed_schemes;

          return {
            name: region.region_name,
            children: [
              ...(completedSchemes > 0
                ? [
                    {
                      name: completedSchemes.toString(),
                      value: completedSchemes,
                      type: "completed",
                    },
                  ]
                : []),
              ...(inProgressSchemes > 0
                ? [
                    {
                      name: inProgressSchemes.toString(),
                      value: inProgressSchemes,
                      type: "progress",
                    },
                  ]
                : []),
            ],
          };
        })
        .filter((region) => region.children.length > 0),
    };

    // Clear previous chart
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Set up SVG
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("background", "linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)")
      .style("border-radius", "12px");

    // Create hierarchy
    const root = d3
      .hierarchy(hierarchyData)
      .sum((d: any) => d.value || 0)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    // Pack layout
    const pack = d3
      .pack<HierarchyNode>()
      .size([width - margin * 2, height - margin * 2])
      .padding(6);

    pack(root);

    // Color scale
    const colorScale = (d: d3.HierarchyCircularNode<HierarchyNode>) => {
      if (d.depth === 0) return "#4fc3f7"; // Root - light blue
      if (d.depth === 1) return "#29b6f6"; // Regions - medium blue
      if (d.data.type === "completed") return "#4caf50"; // Completed - green
      if (d.data.type === "progress") return "#ff9800"; // In progress - orange
      return "#90caf9"; // Default - light blue
    };

    // Create container group
    const container = svg
      .append("g")
      .attr("transform", `translate(${margin}, ${margin})`);

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on("zoom", (event) => {
        container.attr(
          "transform",
          `translate(${margin + event.transform.x}, ${margin + event.transform.y}) scale(${event.transform.k})`,
        );
      });

    svg.call(zoom);

    // Create nodes
    const nodes = container
      .selectAll("g")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`)
      .style("cursor", "pointer");

    // Add circles with improved interaction
    nodes
      .append("circle")
      .attr("r", (d: any) => d.r)
      .style("fill", (d: any) => colorScale(d))
      .style("stroke", "#fff")
      .style("stroke-width", 2)
      .style("opacity", 0.8)
      .on("mouseover", function (event, d: any) {
        d3.select(this)
          .style("opacity", 1)
          .style("stroke-width", 3)
          .style("filter", "drop-shadow(0px 2px 6px rgba(0,0,0,0.3))");

        // Show tooltip-like information
        if (d.depth === 1) {
          const region = regions?.find((r) => r.region_name === d.data.name);
          if (region) {
            console.log(
              `${region.region_name}: ${region.fully_completed_schemes}/${region.total_schemes_integrated} schemes completed`,
            );
          }
        }
      })
      .on("mouseout", function (event, d: any) {
        d3.select(this)
          .style("opacity", 0.8)
          .style("stroke-width", 2)
          .style("filter", "none");
      })
      .on("click", function (event, d: any) {
        event.stopPropagation();
        zoomToNode(d);
      });

    // Add scheme count numbers only (clean display)
    nodes
      .filter((d: any) => !d.children) // Only leaf nodes (scheme counts)
      .append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("font-size", (d: any) => {
        if (d.r < 15) return "0px";
        if (d.r < 25) return "12px";
        if (d.r < 40) return "16px";
        return "20px";
      })
      .style("font-weight", "bold")
      .style("fill", "#fff")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.5)")
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text((d: any) => d.data.name);

    // Add creative region labels with better positioning
    nodes
      .filter((d: any) => d.depth === 1)
      .append("text")
      .attr("dy", (d: any) => (d.r > 80 ? "-0.8em" : "0em"))
      .attr("text-anchor", "middle")
      .style("font-size", (d: any) => {
        if (d.r < 50) return "0px";
        if (d.r < 80) return "11px";
        return "13px";
      })
      .style("font-weight", "600")
      .style("fill", "#fff")
      .style("text-shadow", "1px 1px 3px rgba(0,0,0,0.7)")
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text((d: any) => {
        // Creative short names for regions
        const regionShortNames: { [key: string]: string } = {
          Nagpur: "NAGPUR",
          Pune: "PUNE",
          Nashik: "NASHIK",
          Amravati: "AMRAVATI",
          Konkan: "KONKAN",
          "Chhatrapati Sambhajinagar": "CSN",
        };
        return (
          regionShortNames[d.data.name] ||
          d.data.name.substring(0, 3).toUpperCase()
        );
      });

    // Zoom to node function
    function zoomToNode(d: d3.HierarchyCircularNode<HierarchyNode>) {
      const scale = Math.min(width, height) / (d.r * 2.2);
      const x = -d.x * scale + width / 2;
      const y = -d.y * scale + height / 2;

      svg
        .transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(x - margin, y - margin).scale(scale),
        );

      setCurrentNode(d);
    }

    // Initialize with root view
    setCurrentNode(root);

    // Reset zoom on background click
    svg.on("click", () => {
      svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
      setCurrentNode(root);
    });
  }, [regions, isLoading]);

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
          Circle size represents the number of schemes. Green = Completed,
          Orange = In Progress. Click to zoom.
        </p>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full relative">
          <svg
            ref={svgRef}
            className="w-full border rounded-lg shadow-lg"
          ></svg>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
              <span>Regions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Completed Schemes</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span>In Progress Schemes</span>
            </div>
          </div>

          {/* Current view indicator */}
          {currentNode && (
            <div className="mt-2 text-center text-sm text-gray-500">
              Current view: {currentNode.data.name}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
