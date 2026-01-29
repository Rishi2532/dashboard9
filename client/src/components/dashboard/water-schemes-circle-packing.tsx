import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function WaterSchemesCirclePacking() {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Fetch all required data
  const { data: regions } = useQuery({ queryKey: ["/api/regions"] });
  const { data: schemeStatus } = useQuery({ queryKey: ["/api/scheme-status"] });
  const { data: waterSchemeData } = useQuery({ queryKey: ["/api/water-scheme-data"] });

  useEffect(() => {
    if (!svgRef.current || !regions || !schemeStatus || !waterSchemeData) return;

    const width = 800;
    const height = 600;

    // Ensure data is arrays
    const regionsArray = Array.isArray(regions) ? regions : [];
    const schemeStatusArray = Array.isArray(schemeStatus) ? schemeStatus : [];
    const waterSchemeArray = Array.isArray(waterSchemeData) ? waterSchemeData : [];

    // Build hierarchy data exactly as specified
    const hierarchyData = {
      name: "Maharashtra Water Infrastructure",
      type: 'root',
      children: regionsArray.map((region: any) => ({
        name: region.region_name || 'Unknown Region',
        type: 'region',
        children: [{
          name: "Water Schemes",
          type: 'schemes',
          children: [
            {
              name: "Fully Completed Schemes",
              type: 'completed',
              value: schemeStatusArray
                .filter((s: any) => s.region === region.region_name && s.completion_status === 'Fully Completed')
                .length
            },
            {
              name: "Villages LPCD > 55 (Not Fully Completed)",
              type: 'lpcd_high',
              value: waterSchemeArray
                .filter((w: any) => 
                  w.region === region.region_name && 
                  parseFloat(w.lpcd_value || '0') > 55 &&
                  schemeStatusArray.find((s: any) => s.scheme_id === w.scheme_id)?.completion_status !== 'Fully Completed'
                )
                .length
            }
          ]
        }]
      }))
    };

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Create hierarchy and pack layout
    const root = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.value || 10) // Default value for containers
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    const pack = d3.pack()
      .size([width, height])
      .padding(3);

    pack(root);

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("cursor", "pointer");

    // Color scheme based on type
    const getColor = (d: any) => {
      switch (d.data.type) {
        case 'root': return '#e3f2fd';
        case 'region': return '#2196f3';
        case 'schemes': return '#1976d2';
        case 'completed': return '#4caf50';
        case 'lpcd_high': return '#ff9800';
        default: return '#90caf9';
      }
    };

    // Initial zoom state
    let focus = root;
    let view: [number, number, number];

    // Create circles
    const node = svg.append("g")
      .selectAll("circle")
      .data(root.descendants().slice(1))
      .join("circle")
      .attr("fill", d => getColor(d))
      .attr("fill-opacity", 0.8)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("pointer-events", d => !d.children ? "none" : null)
      .on("mouseover", function(event, d) { 
        d3.select(this).attr("stroke-width", 3).attr("fill-opacity", 1);
        
        // Show tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0,0,0,0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("opacity", 0);

        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <strong>${d.data.name}</strong><br/>
          ${d.data.value !== undefined ? `Count: ${d.data.value}` : 'Container'}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() { 
        d3.select(this).attr("stroke-width", 2).attr("fill-opacity", 0.8);
        d3.selectAll(".tooltip").remove();
      })
      .on("click", (event: any, d: any) => {
        if (focus !== d) {
          zoom(event, d);
          event.stopPropagation();
        }
      });

    // Create labels
    const label = svg.append("g")
      .style("font", "12px sans-serif")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .selectAll("text")
      .data(root.descendants())
      .join("text")
      .style("fill-opacity", d => d.parent === root ? 1 : 0)
      .style("display", d => d.parent === root ? "inline" : "none")
      .style("fill", "#000")
      .style("font-weight", "500")
      .text(d => {
        const words = d.data.name.split(' ');
        return words.length > 2 ? words.slice(0, 2).join(' ') + '...' : d.data.name;
      });

    // Add value labels for leaf nodes
    const valueLabel = svg.append("g")
      .style("font", "14px sans-serif")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .selectAll("text")
      .data(root.descendants().filter(d => !d.children && d.data.value !== undefined))
      .join("text")
      .style("fill-opacity", d => d.parent?.parent === root ? 1 : 0)
      .style("display", d => d.parent?.parent === root ? "inline" : "none")
      .style("fill", "#fff")
      .style("font-weight", "bold")
      .attr("dy", "0.3em")
      .text((d: any) => d.data.value || 0);

    // Zoom functionality
    function zoomTo(v: [number, number, number]) {
      const k = width / v[2];
      view = v;

      label.attr("transform", (d: any) => `translate(${((d.x || 0) - v[0]) * k},${((d.y || 0) - v[1]) * k})`);
      valueLabel.attr("transform", (d: any) => `translate(${((d.x || 0) - v[0]) * k},${((d.y || 0) - v[1]) * k})`);
      node.attr("transform", (d: any) => `translate(${((d.x || 0) - v[0]) * k},${((d.y || 0) - v[1]) * k})`);
      node.attr("r", (d: any) => (d.r || 0) * k);
    }

    function zoom(event: any, d: any) {
      focus = d;
      
      const transition = svg.transition()
        .duration(750)
        .tween("zoom", () => {
          const i = d3.interpolateZoom(view, [(focus.x || 0), (focus.y || 0), (focus.r || 0) * 2]);
          return (t: number) => zoomTo(i(t));
        });

      label
        .filter(function(this: any, d: any) { 
          return d.parent === focus || this.style.display === "inline"; 
        })
        .transition(transition as any)
        .style("fill-opacity", (d: any) => d.parent === focus ? 1 : 0)
        .on("start", function(this: any, d: any) { 
          if (d.parent === focus) this.style.display = "inline"; 
        })
        .on("end", function(this: any, d: any) { 
          if (d.parent !== focus) this.style.display = "none"; 
        });

      valueLabel
        .filter(function(this: any, d: any) { 
          return d.parent?.parent === focus || this.style.display === "inline"; 
        })
        .transition(transition as any)
        .style("fill-opacity", (d: any) => d.parent?.parent === focus ? 1 : 0)
        .on("start", function(this: any, d: any) { 
          if (d.parent?.parent === focus) this.style.display = "inline"; 
        })
        .on("end", function(this: any, d: any) { 
          if (d.parent?.parent !== focus) this.style.display = "none"; 
        });
    }

    // Initialize zoom
    zoomTo([(root.x || 0), (root.y || 0), (root.r || 0) * 2]);

    // Click to zoom out
    svg.on("click", (event: any) => {
      if (focus !== root) {
        zoom(event, root);
      }
    });

  }, [regions, schemeStatus, waterSchemeData]);

  if (!regions || !schemeStatus || !waterSchemeData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Water Infrastructure Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading water infrastructure data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Water Infrastructure Hierarchy</CardTitle>
        <p className="text-sm text-muted-foreground">
          Click any circle to zoom in. Green = Fully Completed Schemes, Orange = High LPCD Villages (Not Completed)
        </p>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-hidden">
          <svg
            ref={svgRef}
            className="w-full h-auto border rounded-lg"
            style={{ maxWidth: '100%', height: '600px' }}
          />
        </div>
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span>Regions</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-700 rounded-full"></div>
            <span>Schemes Container</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Completed Schemes</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
            <span>High LPCD Villages</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}