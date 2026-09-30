import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Download,
  Search,
  Gauge,
  Droplets,
  Layers,
  X,
  Building,
  CheckCircle2,
  Clock,
} from "lucide-react";

export interface MissingSchemeRecord {
  scheme_id: string;
  scheme_name: string;
  region: string;
  circle?: string;
  division?: string;
  sub_division?: string;
  block?: string;
  agency_type?: string;
  water_supply?: string | null;
  water_supply_status?: string | null;
  fully_completion_scheme_status?: string | null;
  pressure_transmitter_connected?: number;
  residual_chlorine_analyzer_connected?: number;
  flow_meters_connected?: number;
  total_number_of_esr?: number;
  reason?: string;
}

interface MissingSchemesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensorType: "pressure" | "chlorine";
  filterLabel: string;
  qualifyingCount: number;
  presentCount: number;
  missingSchemes: MissingSchemeRecord[];
}

export const MissingSchemesModal: React.FC<MissingSchemesModalProps> = ({
  isOpen,
  onClose,
  sensorType,
  filterLabel,
  qualifyingCount,
  presentCount,
  missingSchemes,
}) => {
  const [search, setSearch] = useState("");

  const sensorName = sensorType === "pressure" ? "Pressure Transmitters" : "Residual Chlorine Analyzers";
  const sensorShortName = sensorType === "pressure" ? "Pressure" : "Chlorine";

  const filteredSchemes = useMemo(() => {
    if (!search.trim()) return missingSchemes;
    const query = search.toLowerCase().trim();
    return missingSchemes.filter(
      (s) =>
        s.scheme_id?.toLowerCase().includes(query) ||
        s.scheme_name?.toLowerCase().includes(query) ||
        s.region?.toLowerCase().includes(query) ||
        s.circle?.toLowerCase().includes(query) ||
        s.division?.toLowerCase().includes(query) ||
        s.block?.toLowerCase().includes(query),
    );
  }, [missingSchemes, search]);

  const handleExportCsv = () => {
    if (filteredSchemes.length === 0) return;

    const headers = [
      "Sr No",
      "Scheme ID",
      "Scheme Name",
      "Region",
      "Circle",
      "Division",
      "Block",
      "Agency Type",
      "Civil Complete",
      "Water Supply Status",
      "IoT Status",
      "Flow Meters",
      "Residual Chlorine Analyzers",
      "Pressure Transmitters",
      "Reason",
    ];

    const rows = filteredSchemes.map((s, index) => [
      index + 1,
      `"${s.scheme_id || ""}"`,
      `"${(s.scheme_name || "").replace(/"/g, '""')}"`,
      `"${s.region || ""}"`,
      `"${s.circle || ""}"`,
      `"${s.division || ""}"`,
      `"${s.block || ""}"`,
      `"${s.agency_type || ""}"`,
      `"${s.water_supply || "No"}"`,
      `"${s.water_supply_status || "N/A"}"`,
      `"${s.fully_completion_scheme_status || "N/A"}"`,
      s.flow_meters_connected || 0,
      s.residual_chlorine_analyzer_connected || 0,
      s.pressure_transmitter_connected || 0,
      `"${(s.reason || "0 sensors connected in IoT master").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Missing_${sensorShortName}_Schemes_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white shadow-2xl rounded-xl border border-slate-200">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm ${
                  sensorType === "pressure"
                    ? "bg-amber-100 text-amber-700 border border-amber-300"
                    : "bg-teal-100 text-teal-700 border border-teal-300"
                }`}
              >
                {sensorType === "pressure" ? (
                  <Gauge className="h-5 w-5" />
                ) : (
                  <Droplets className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>Schemes Without {sensorName}</span>
                  <Badge
                    variant="outline"
                    className="bg-amber-100 text-amber-800 border-amber-300 font-bold px-2 py-0.5 text-xs"
                  >
                    {missingSchemes.length} Scheme{missingSchemes.length !== 1 ? "s" : ""}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Schemes qualifying under the <span className="font-semibold text-slate-700">"{filterLabel}"</span> filter from the master scheme database that currently have no {sensorShortName.toLowerCase()} data.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-200/70">
            <div className="bg-white/80 backdrop-blur rounded-lg p-2.5 border border-slate-200 text-center shadow-xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Qualifying in Master</div>
              <div className="text-lg font-extrabold text-blue-700">{qualifyingCount}</div>
            </div>
            <div className="bg-white/80 backdrop-blur rounded-lg p-2.5 border border-slate-200 text-center shadow-xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Present With {sensorShortName}</div>
              <div className="text-lg font-extrabold text-emerald-700">{presentCount}</div>
            </div>
            <div className="bg-amber-50/80 backdrop-blur rounded-lg p-2.5 border border-amber-200 text-center shadow-xs">
              <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Missing {sensorShortName} Sensors</div>
              <div className="text-lg font-extrabold text-amber-700">{missingSchemes.length}</div>
            </div>
          </div>
        </DialogHeader>

        {/* Search & Actions Bar */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scheme name, ID, region, district..."
              className="pl-9 h-9 text-xs bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={filteredSchemes.length === 0}
            className="h-9 text-xs gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV ({filteredSchemes.length})</span>
          </Button>
        </div>

        {/* Content Table */}
        <ScrollArea className="flex-1 max-h-[50vh] p-5">
          {filteredSchemes.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2 opacity-60" />
              <p className="font-medium text-sm">No schemes match your search criteria</p>
              <p className="text-xs text-slate-400 mt-0.5">Try searching with a different term</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Scheme ID & Name</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-center">Civil & IoT Status</th>
                    <th className="py-2.5 px-3 text-center">Connected Sensors</th>
                    <th className="py-2.5 px-3">Diagnostic Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSchemes.map((s, index) => (
                    <tr
                      key={`${s.scheme_id}-${index}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {s.scheme_name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                            {s.scheme_id}
                          </span>
                          {s.agency_type && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              • {s.agency_type}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-800">{s.region}</div>
                        <div className="text-[11px] text-slate-500">
                          {[s.circle, s.block].filter(Boolean).join(" • ")}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex flex-col gap-1 items-center">
                          {s.water_supply === "Yes" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Civil Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              Civil Pending
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-medium">
                            {s.fully_completion_scheme_status || "Unknown IoT"}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-2 justify-center font-mono text-[11px]">
                          <span
                            title="Flow Meters"
                            className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-bold"
                          >
                            FM: {s.flow_meters_connected ?? 0}
                          </span>
                          <span
                            title="Chlorine Analyzers"
                            className={`px-1.5 py-0.5 rounded font-bold border ${
                              sensorType === "chlorine" && (s.residual_chlorine_analyzer_connected ?? 0) === 0
                                ? "bg-red-100 text-red-800 border-red-300"
                                : "bg-teal-50 text-teal-800 border-teal-200"
                            }`}
                          >
                            Cl: {s.residual_chlorine_analyzer_connected ?? 0}
                          </span>
                          <span
                            title="Pressure Transmitters"
                            className={`px-1.5 py-0.5 rounded font-bold border ${
                              sensorType === "pressure" && (s.pressure_transmitter_connected ?? 0) === 0
                                ? "bg-red-100 text-red-800 border-red-300"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            PT: {s.pressure_transmitter_connected ?? 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50/90 border border-amber-200/80 px-2 py-0.8 rounded-md font-medium leading-tight">
                          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                          <span>{s.reason || `0 ${sensorShortName} Transmitters connected`}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-700">{filteredSchemes.length}</span> of{" "}
            <span className="font-bold text-slate-700">{missingSchemes.length}</span> schemes missing {sensorShortName.toLowerCase()} data
          </div>
          <Button size="sm" variant="default" onClick={onClose} className="h-8 text-xs px-4">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
