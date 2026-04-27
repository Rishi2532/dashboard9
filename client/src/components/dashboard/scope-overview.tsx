import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  Home,
  Droplet,
  Gauge,
  FlaskConical,
  Activity,
  Cpu,
} from "lucide-react";

interface ScopeData {
  totalSchemes: number;
  totalVillages: number;
  totalEsr: number;
  totalFlowmeterScope: number;
  totalRcaScope: number;
  totalPtScope: number;
  flowmeterIntegrated: number;
  rcaIntegrated: number;
  ptIntegrated: number;
}

function formatNumber(n: number) {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return n.toLocaleString("en-IN");
}

interface HeroTileProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  value: number;
  gradient: string;
  isLoading: boolean;
}

function HeroTile({
  icon,
  label,
  sublabel,
  value,
  gradient,
  isLoading,
}: HeroTileProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 text-white shadow-md ${gradient}`}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/85">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold leading-none sm:text-3xl">
            {isLoading ? (
              <span className="inline-block h-7 w-20 animate-pulse rounded bg-white/30" />
            ) : (
              formatNumber(value)
            )}
          </p>
          {sublabel && (
            <p className="mt-1 text-[10px] font-medium text-white/80">
              {sublabel}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface ComponentRowProps {
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  scope: number;
  accent: string;
  text: string;
  isLoading: boolean;
}

function ComponentRow({
  icon,
  label,
  shortLabel,
  scope,
  accent,
  text,
  isLoading,
}: ComponentRowProps) {
  return (
    <div
      className={`group relative flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white p-3.5 shadow-sm transition hover:shadow-md`}
    >
      {/* left accent stripe */}
      <span
        className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${accent}`}
      />
      <div className="flex min-w-0 items-center gap-3 pl-1.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent} shadow-sm`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-bold uppercase tracking-wide ${text}`}>
            {shortLabel}
          </p>
          <p className="truncate text-[11px] text-gray-500">{label}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 leading-none">
          In Scope
        </p>
        <p className="text-2xl font-extrabold text-gray-900 leading-tight">
          {isLoading ? (
            <span className="inline-block h-7 w-16 animate-pulse rounded bg-gray-200" />
          ) : (
            formatNumber(scope)
          )}
        </p>
      </div>
    </div>
  );
}

interface ScopeOverviewProps {
  selectedRegion?: string;
  schemeView?: string;
}

export default function ScopeOverview({
  selectedRegion = "all",
  schemeView = "ALL",
}: ScopeOverviewProps) {
  const params = new URLSearchParams();
  if (selectedRegion && selectedRegion !== "all")
    params.set("region", selectedRegion);
  if (schemeView) params.set("view", schemeView);
  const qs = params.toString();
  const queryUrl = qs
    ? `/api/scheme-progress-summary/scope?${qs}`
    : `/api/scheme-progress-summary/scope`;
  const { data, isLoading } = useQuery<ScopeData>({
    queryKey: [queryUrl],
  });

  const scope: ScopeData = data ?? {
    totalSchemes: 0,
    totalVillages: 0,
    totalEsr: 0,
    totalFlowmeterScope: 0,
    totalRcaScope: 0,
    totalPtScope: 0,
    flowmeterIntegrated: 0,
    rcaIntegrated: 0,
    ptIntegrated: 0,
  };

  const componentsTotal =
    scope.totalFlowmeterScope + scope.totalRcaScope + scope.totalPtScope;

  const isAll = !selectedRegion || selectedRegion === "all";
  const isInstrumented = (schemeView || "ALL").toUpperCase() === "INSTRUMENTED";

  return (
    <div className="flex h-full flex-col rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/60 p-3 sm:p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center text-sm sm:text-base font-bold text-blue-900">
            <span className="mr-2 h-6 w-1.5 rounded-sm bg-blue-500" />
            Project Scope Overview
          </h2>
          <p className="ml-3.5 mt-0.5 text-[11px] text-gray-500">
            What's planned, where it's deployed, and how much is integrated.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            {isAll ? "All Regions" : selectedRegion}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${isInstrumented
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-600"
              }`}
          >
            {isInstrumented ? "100% Civil Completed" : "All Schemes"}
          </span>
        </div>
      </div>

      {/* Section: Project Scope (totals) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
            Project Scope
          </p>
          <span className="h-px flex-1 mx-2 bg-gradient-to-r from-blue-200 to-transparent" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <HeroTile
            icon={<Layers className="h-5 w-5" />}
            label="Schemes in Scope"
            sublabel="Water supply schemes"
            value={scope.totalSchemes}
            gradient="bg-gradient-to-br from-blue-600 to-blue-800"
            isLoading={isLoading}
          />
          <HeroTile
            icon={<Home className="h-5 w-5" />}
            label="Villages Covered"
            sublabel="Across all schemes"
            value={scope.totalVillages}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-700"
            isLoading={isLoading}
          />
          <HeroTile
            icon={<Droplet className="h-5 w-5" />}
            label="ESR + GSR + MBR"
            sublabel="Storage reservoirs"
            value={scope.totalEsr}
            gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Section: Monitoring Components */}
      <div className="mt-4 flex flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Monitoring Components
            </p>
            <span className="h-px w-6 bg-gradient-to-r from-purple-200 to-transparent" />
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-[11px] font-semibold text-gray-700">
              {isLoading
                ? "—"
                : `${formatNumber(componentsTotal)} total in scope`}
            </span>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-2.5">
          <ComponentRow
            icon={<Gauge className="h-5 w-5 text-white" />}
            label="Flow Meters"
            shortLabel="Flowmeter"
            scope={scope.totalFlowmeterScope}
            accent="bg-amber-500"
            text="text-amber-700"
            isLoading={isLoading}
          />
          <ComponentRow
            icon={<FlaskConical className="h-5 w-5 text-white" />}
            label="Residual Chlorine Analyzer"
            shortLabel="RCA"
            scope={scope.totalRcaScope}
            accent="bg-emerald-600"
            text="text-emerald-700"
            isLoading={isLoading}
          />
          <ComponentRow
            icon={<Activity className="h-5 w-5 text-white" />}
            label="Pressure Transmitter"
            shortLabel="PT"
            scope={scope.totalPtScope}
            accent="bg-rose-500"
            text="text-rose-700"
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
