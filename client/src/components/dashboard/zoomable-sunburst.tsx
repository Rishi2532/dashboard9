import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { WaterSchemeData as SharedWaterSchemeData } from "@shared/schema";

interface RegionData {
  region_id: number;
  region_name: string;
  total_schemes_integrated: number;
  fully_completed_schemes: number;
  total_villages_integrated: number;
  fully_completed_villages: number;
  total_esr_integrated: number;
  fully_completed_esr: number;
}

interface SchemeData {
  scheme_id: string;
  scheme_name: string;
  region: string;
  circle: string;
  completion_status: string;
  total_villages: number;
  completed_villages: number;
}

type WaterSchemeData = SharedWaterSchemeData;

interface HierarchyNode {
  name: string;
  value?: number;
  children?: HierarchyNode[];
}

export default function ZoomableSunburst() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: regions, isLoading: regionsLoading } = useQuery<RegionData[]>({
    queryKey: ["/api/regions"],
  });

  const { data: schemeStatus, isLoading: schemeStatusLoading } = useQuery<
    SchemeData[]
  >({
    queryKey: ["/api/scheme-status"],
  });

  const { data: waterSchemeData, isLoading: waterSchemeDataLoading } = useQuery<
    WaterSchemeData[]
  >({
    queryKey: ["/api/water-scheme-data"],
  });

  const isLoading =
    regionsLoading || schemeStatusLoading || waterSchemeDataLoading;

  const buildHierarchyData = (): HierarchyNode | null => {
    if (!regions || !schemeStatus || !waterSchemeData) return null;

    // Create scheme count maps for quick lookup
    const regionSchemeCounts = new Map([
      ["Amravati", 70],
      ["Chhatrapati Sambhajinagar", 49],
      ["Konkan", 68],
      ["Nagpur", 26],
      ["Nashik", 113],
      ["Pune", 61],
    ]);

    const circleSchemeCounts = new Map([
      ["Akola", 35],
      ["Amravati", 27],
      ["Aurangabad", 7],
      ["Ch. Sambhaji nagar", 2],
      ["Chhatrapati Sambhajinagar", 4],
      ["Latur", 18],
      ["Nanded", 14],
      ["Palghar", 3],
      ["Panvel", 33],
      ["Raigadh", 2],
      ["Ratnagiri", 1],
      ["Thane", 19],
      ["Chandrapur", 6],
      ["Nagpur", 16],
      ["Ahmednagar", 54],
      ["Jalgaon", 25],
      ["Nashik", 24],
      ["Pune", 50],
      ["Sangli", 4],
    ]);

    const getRegionLabel = (regionName: string) => {
      const clean = regionName.trim().toLowerCase();
      const displayName =
        clean === "chhatrapati sambhajinagar" ? "CSN" : regionName.trim();
      const schemeCount = regionSchemeCounts.get(regionName) || 0;
      return `${displayName} (${schemeCount})`;
    };

    const getCircleLabel = (circleName: string, regionName: string) => {
      const clean = circleName.trim().toLowerCase();
      let displayName =
        clean === "chhatrapati sambhajinagar" ? "CSN" : circleName.trim();

      // Handle NA circles by showing the count of schemes with NA circle in that region
      if (clean === "na" || clean === "" || clean === "null") {
        const regionSchemes = schemeStatus.filter(
          (s) => s.region === regionName,
        );
        const naSchemeCount = regionSchemes.filter(
          (s) =>
            !s.circle ||
            s.circle.trim() === "" ||
            s.circle.toLowerCase() === "null" ||
            s.circle.toLowerCase() === "na",
        ).length;
        return `Other Circles (${naSchemeCount})`;
      }

      const schemeCount = circleSchemeCounts.get(circleName.trim()) || 0;
      return `${displayName} (${schemeCount})`;
    };

    const root: HierarchyNode = {
      name: "Maharashtra",
      children: regions.map((region) => {
        const regionSchemes = schemeStatus.filter(
          (scheme) =>
            scheme.region === region.region_name &&
            scheme.completion_status &&
            scheme.completion_status !== "Not-Connected" &&
            scheme.completion_status.trim() !== "",
        );

        const circleGroups = d3.group(regionSchemes, (d) => {
          if (
            !d.circle ||
            d.circle.trim() === "" ||
            d.circle.toLowerCase() === "null" ||
            d.circle.toLowerCase() === "na"
          ) {
            return "Other Circles";
          }
          return d.circle.trim();
        });

        return {
          name: `Region: ${getRegionLabel(region.region_name)}`,
          children: Array.from(circleGroups, ([circleName, circleSchemes]) => {
            const completedSchemes = circleSchemes.filter(
              (s) =>
                s.completion_status === "Completed" ||
                s.completion_status === "Fully Completed",
            );
            const inProgressSchemes = circleSchemes.filter(
              (s) =>
                s.completion_status !== "Completed" &&
                s.completion_status !== "Fully Completed",
            );

            if (completedSchemes.length + inProgressSchemes.length === 0)
              return null;

            const calculateLPCDPerformance = (schemes: SchemeData[]) => {
              const schemeNames = schemes
                .map((s) => s.scheme_name)
                .filter(Boolean);
              const relevant = waterSchemeData.filter(
                (wd) => wd.scheme_name && schemeNames.includes(wd.scheme_name),
              );

              const villages = new Map();
              relevant.forEach((wd) => {
                const key = `${wd.village_name}|${wd.region}`;
                if (!villages.has(key)) {
                  villages.set(key, wd.lpcd_value_day7);
                }
              });

              let high = 0,
                low = 0;
              villages.forEach((lpcd) => {
                if (lpcd && lpcd > 55) high++;
                else if (lpcd !== undefined && lpcd !== null && lpcd >= 0)
                  low++;
              });

              return { high, low, total: high + low };
            };

            const completedLPCD = calculateLPCDPerformance(completedSchemes);
            const inProgressLPCD = calculateLPCDPerformance(inProgressSchemes);

            return {
              name: `Circle: ${getCircleLabel(circleName, region.region_name)}`,
              children: [
                {
                  name: `Fully Completed (${completedSchemes.length})`,
                  value: completedSchemes.length,
                  children:
                    completedLPCD.total > 0
                      ? [
                          ...(completedLPCD.high > 0
                            ? [
                                {
                                  name: `>55 LPCD (${completedLPCD.high})`,
                                  value: completedLPCD.high,
                                },
                              ]
                            : []),
                          ...(completedLPCD.low > 0
                            ? [
                                {
                                  name: `≤55 LPCD (${completedLPCD.low})`,
                                  value: completedLPCD.low,
                                },
                              ]
                            : []),
                        ]
                      : [{ name: `No LPCD Data`, value: 1 }],
                },
                {
                  name: `In Progress (${inProgressSchemes.length})`,
                  value: inProgressSchemes.length,
                  children:
                    inProgressLPCD.total > 0
                      ? [
                          ...(inProgressLPCD.high > 0
                            ? [
                                {
                                  name: `>55 LPCD (${inProgressLPCD.high})`,
                                  value: inProgressLPCD.high,
                                },
                              ]
                            : []),
                          ...(inProgressLPCD.low > 0
                            ? [
                                {
                                  name: `≤55 LPCD (${inProgressLPCD.low})`,
                                  value: inProgressLPCD.low,
                                },
                              ]
                            : []),
                        ]
                      : [{ name: `No LPCD Data`, value: 1 }],
                },
              ],
            };
          }).filter(Boolean) as HierarchyNode[],
        };
      }),
    };

    return root;
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || isLoading) return;

    const data = buildHierarchyData();
    if (!data) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const width = 100;
    const radius = width / 10;

    const color = d3.scaleOrdinal(
      d3.quantize(d3.interpolateRainbow, (data.children?.length || 0) + 1),
    );
    const hierarchy = d3
      .hierarchy(data)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
    type SunburstNode = d3.HierarchyRectangularNode<HierarchyNode> & {
      current?: any;
      target?: any;
    };
    const root = d3
      .partition<HierarchyNode>()
      .size([2 * Math.PI, hierarchy.height + 1])(hierarchy) as SunburstNode;
    root.each((d) => {
      (d as SunburstNode).current = d;
    });

    const arc = d3
      .arc<any>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.y0 * radius)
      .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `${-width / 2} ${-width / 2} ${width} ${width}`)
      .style("font", "0.8px sans-serif");

    function arcVisible(d: any) {
      return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }
    function labelVisible(d: any) {
      return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }
    function labelTransform(d: any) {
      const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
      const y = ((d.y0 + d.y1) / 2) * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

    const path = svg
      .append("g")
      .selectAll("path")
      .data(root.descendants().slice(1))
      .join("path")
      .attr("fill", (d) => {
        let node = d as SunburstNode;
        while (node.depth > 1 && node.parent)
          node = node.parent as SunburstNode;
        return color(node.data.name);
      })
      .attr("fill-opacity", (d) =>
        arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0,
      )
      .attr("pointer-events", (d) => (arcVisible(d.current) ? "auto" : "none"))
      .attr("d", (d) => arc(d.current));

    path
      .filter((d) => !!d.children)
      .style("cursor", "pointer")
      .on("click", clicked);
    path.append("title").text((d) =>
      d
        .ancestors()
        .map((d) => d.data.name)
        .reverse()
        .join("/"),
    );

    const label = svg
      .append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .selectAll("text")
      .data(root.descendants().slice(1))
      .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", (d) => +labelVisible(d.current))
      .attr("transform", (d) => labelTransform(d.current))
      .text((d) => d.data.name);

    const parent = svg
      .append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

    function clicked(event: any, p: any) {
      parent.datum(p.parent || root);
      root.each(
        (d) =>
          (d.target = {
            x0:
              Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) *
              2 *
              Math.PI,
            x1:
              Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) *
              2 *
              Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth),
          }),
      );
      const t = path
        .transition()
        .duration(event.altKey ? 10000 : 1500) // Slower transitions: 1.5s default, 10s with alt key
        .ease(d3.easeCubicInOut); // Smooth cubic easing
      t.tween("data", function (d: any) {
        const i = d3.interpolate(d.current, d.target);
        return function (t: number) {
          d.current = i(t);
        };
      })
        .attr("fill-opacity", (d) =>
          arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0,
        )
        .attr("pointer-events", (d) => (arcVisible(d.target) ? "auto" : "none"))
        .attrTween("d", (d) => () => arc(d.current) ?? "");
      label
        .transition()
        .duration(event.altKey ? 10000 : 1500) // Slower transitions: 1.5s default, 10s with alt key
        .ease(d3.easeCubicInOut) // Smooth cubic easing
        .attr("fill-opacity", (d) => +labelVisible(d.target))
        .attrTween("transform", (d) => () => labelTransform(d.current));
    }
  }, [isLoading, regions, schemeStatus, waterSchemeData]);

  if (isLoading) {
    return (
      <Card className="w-full max-w-sm mx-auto h-[300px] overflow-hidden">
        <CardHeader>
          <CardTitle>
            Zoomable Sunburst - Water Infrastructure Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading sunburst visualization...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          Zoomable Sunburst - Water Infrastructure Hierarchy
        </CardTitle>
        <p className="text-sm text-gray-600">
          Maharashtra → Region → Circle → Status → LPCD. Click segments to zoom.
        </p>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full flex justify-center">
          <svg ref={svgRef} className="max-w-full h-auto"></svg>
        </div>
      </CardContent>
    </Card>
  );
}
