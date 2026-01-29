import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function WorkingCirclePacking() {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Fetch all required data
  const { data: regions, isLoading: regionsLoading, error: regionsError } = useQuery({ queryKey: ["/api/regions"] });
  const { data: schemeStatus, isLoading: schemeStatusLoading, error: schemeStatusError } = useQuery({ queryKey: ["/api/scheme-status"] });
  const { data: waterSchemeData, isLoading: waterSchemeDataLoading, error: waterSchemeDataError } = useQuery({ queryKey: ["/api/water-scheme-data"] });

  // Debug logging
  console.log('Circle Packing Data Debug:', {
    regions: { data: regions, loading: regionsLoading, error: regionsError },
    schemeStatus: { data: schemeStatus, loading: schemeStatusLoading, error: schemeStatusError },
    waterSchemeData: { data: waterSchemeData, loading: waterSchemeDataLoading, error: waterSchemeDataError }
  });

  useEffect(() => {
    if (!svgRef.current || regionsLoading || schemeStatusLoading || waterSchemeDataLoading || !regions || !schemeStatus || !waterSchemeData) {
      return;
    }

    const width = 800;
    const height = 600;

    // Ensure data is arrays
    const regionsArray = Array.isArray(regions) ? regions : [];
    const schemeStatusArray = Array.isArray(schemeStatus) ? schemeStatus : [];
    const waterSchemeArray = Array.isArray(waterSchemeData) ? waterSchemeData : [];

    // Build hierarchy data with actual counts
    const hierarchyData = {
      name: "Maharashtra Water Infrastructure",
      children: regionsArray.map((region: any) => {
        // Count completed schemes for this region
        const completedSchemes = schemeStatusArray.filter((s: any) => 
          s.region === region.region_name && 
          s.completion_status === 'Fully Completed'
        ).length;

        // Count villages with LPCD > 55 for this region
        const highLpcdVillages = waterSchemeArray.filter((w: any) => {
          const lpcdValues = [
            parseFloat(w.lpcd_value_day1 || '0'),
            parseFloat(w.lpcd_value_day2 || '0'),
            parseFloat(w.lpcd_value_day3 || '0'),
            parseFloat(w.lpcd_value_day4 || '0'),
            parseFloat(w.lpcd_value_day5 || '0'),
            parseFloat(w.lpcd_value_day6 || '0'),
            parseFloat(w.lpcd_value_day7 || '0')
          ];
          const maxLpcd = Math.max(...lpcdValues);
          return w.region === region.region_name && maxLpcd > 55;
        }).length;

        return {
          name: region.region_name,
          children: [
            {
              name: `Completed Schemes: ${completedSchemes}`,
              value: completedSchemes || 1,
              type: 'completed'
            },
            {
              name: `High LPCD Villages: ${highLpcdVillages}`,
              value: highLpcdVillages || 1,
              type: 'lpcd_high'
            }
          ]
        };
      })
    };

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Create hierarchy and pack layout
    const root: any = d3.hierarchy(hierarchyData)
      .sum((d: any) => d.value || 1)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    const pack = d3.pack()
      .size([width, height])
      .padding(3);

    pack(root);

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("cursor", "pointer");

    // Color scheme
    const getColor = (d: any) => {
      if (d.depth === 0) return '#e3f2fd'; // Root
      if (d.depth === 1) return '#2196f3'; // Regions
      if (d.data.type === 'completed') return '#4caf50'; // Green for completed
      if (d.data.type === 'lpcd_high') return '#ff9800'; // Orange for high LPCD
      return '#90caf9';
    };

    // Initial zoom state
    let focus = root;
    let view = [root.x || 0, root.y || 0, (root.r || 0) * 2];

    // Create circles
    const node = svg.append("g")
      .selectAll("circle")
      .data(root.descendants().slice(1))
      .join("circle")
      .attr("fill", (d: any) => getColor(d))
      .attr("fill-opacity", 0.8)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("pointer-events", (d: any) => !d.children ? "none" : null)
      .on("mouseover", function(event: any, d: any) { 
        d3.select(this).attr("stroke-width", 3).attr("fill-opacity", 1);
        
        // Simple tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "d3-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0,0,0,0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", "1000")
          .style("opacity", 0);

        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<strong>${d.data.name}</strong>`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() { 
        d3.select(this).attr("stroke-width", 2).attr("fill-opacity", 0.8);
        d3.selectAll(".d3-tooltip").remove();
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
      .style("fill-opacity", (d: any) => d.parent === root ? 1 : 0)
      .style("display", (d: any) => d.parent === root ? "inline" : "none")
      .style("fill", "#000")
      .style("font-weight", "500")
      .text((d: any) => {
        if (d.depth <= 1) {
          const words = d.data.name.split(' ');
          return words.length > 2 ? words.slice(0, 2).join(' ') + '...' : d.data.name;
        }
        return d.data.name;
      });

    // Zoom functionality
    function zoomTo(v: any) {
      const k = width / v[2];
      view = v;

      label.attr("transform", (d: any) => `translate(${((d.x || 0) - v[0]) * k},${((d.y || 0) - v[1]) * k})`);
      node.attr("transform", (d: any) => `translate(${((d.x || 0) - v[0]) * k},${((d.y || 0) - v[1]) * k})`);
      node.attr("r", (d: any) => (d.r || 0) * k);
    }

    function zoom(event: any, d: any) {
      focus = d;
      
      const transition = svg.transition().duration(750);
      const targetView: [number, number, number] = [d.x || 0, d.y || 0, (d.r || 0) * 2];
      const i = d3.interpolateZoom(view as [number, number, number], targetView);
      
      transition.tween("zoom", () => {
        return (t: number) => zoomTo(i(t));
      });

      label
        .filter((d: any) => d.parent === focus || d.parent === focus.parent)
        .transition(transition as any)
        .style("fill-opacity", (d: any) => d.parent === focus ? 1 : 0);
    }

    // Initialize zoom
    const initialView: [number, number, number] = [root.x || 0, root.y || 0, (root.r || 0) * 2];
    zoomTo(initialView);

    // Click to zoom out
    svg.on("click", (event: any) => {
      if (focus !== root) {
        zoom(event, root);
      }
    });

  }, [regions, schemeStatus, waterSchemeData, regionsLoading, schemeStatusLoading, waterSchemeDataLoading]);

  if (regionsLoading || schemeStatusLoading || waterSchemeDataLoading) {
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

  if (!regions || !schemeStatus || !waterSchemeData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Water Infrastructure Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-muted-foreground">
                Data Status: 
                Regions: {regions ? '✓' : '✗'} | 
                Schemes: {schemeStatus ? '✓' : '✗'} | 
                Water Data: {waterSchemeData ? '✓' : '✗'}
              </p>
              {(regionsError || schemeStatusError || waterSchemeDataError) && (
                <p className="text-red-500 text-sm mt-2">
                  Errors: {[regionsError, schemeStatusError, waterSchemeDataError].filter(Boolean).map(e => e?.message).join(', ')}
                </p>
              )}
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
          Click any circle to zoom in. Green = Completed Schemes, Orange = High LPCD Villages
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