import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  Home,
  Droplet,
  Gauge,
  FlaskConical,
  Activity,
} from "lucide-react";

interface ScopeData {
  totalSchemes: number;
  totalVillages: number;
  totalEsr: number;
  totalFlowmeterScope: number;
  totalRcaScope: number;
  totalPtScope: number;
}

function formatNumber(n: number) {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return n.toLocaleString("en-IN");
}

interface HeroTileProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  gradient: string;
  isLoading: boolean;
}

function HeroTile({ icon, label, value, gradient, isLoading }: HeroTileProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 text-white shadow-md ${gradient}`}
    >
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/85">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">
            {isLoading ? (
              <span className="inline-block h-7 w-20 animate-pulse rounded bg-white/30" />
            ) : (
              formatNumber(value)
            )}
          </p>
        </div>
        <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

interface ComponentBarProps {
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  value: number;
  total: number;
  color: string;
  isLoading: boolean;
}

function ComponentBar({
  icon,
  label,
  shortLabel,
  value,
  total,
  color,
  isLoading,
}: ComponentBarProps) {
  const percent = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-md ${color}`}
          >
            {icon}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {shortLabel}
            </p>
            <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
          </div>
        </div>
        <p className="text-lg font-bold text-gray-800">
          {isLoading ? (
            <span className="inline-block h-5 w-12 animate-pulse rounded bg-gray-200" />
          ) : (
            formatNumber(value)
          )}
        </p>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function ScopeOverview() {
  const { data, isLoading } = useQuery<ScopeData>({
    queryKey: ["/api/scheme-progress-summary/scope"],
  });

  const scope: ScopeData = data ?? {
    totalSchemes: 0,
    totalVillages: 0,
    totalEsr: 0,
    totalFlowmeterScope: 0,
    totalRcaScope: 0,
    totalPtScope: 0,
  };

  const componentsTotal =
    scope.totalFlowmeterScope + scope.totalRcaScope + scope.totalPtScope;

  return (
    <div className="flex h-full flex-col rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/60 p-3 sm:p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center text-sm sm:text-base font-semibold text-blue-800">
          <span className="mr-2 h-6 w-1.5 rounded-sm bg-blue-500" />
          Project Scope Overview
        </h2>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
          From Scheme Progress
        </span>
      </div>

      {/* Top hero tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <HeroTile
          icon={<Layers className="h-5 w-5" />}
          label="Total Schemes in Scope"
          value={scope.totalSchemes}
          gradient="bg-gradient-to-br from-blue-600 to-blue-800"
          isLoading={isLoading}
        />
        <HeroTile
          icon={<Home className="h-5 w-5" />}
          label="Total Villages"
          value={scope.totalVillages}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-700"
          isLoading={isLoading}
        />
        <HeroTile
          icon={<Droplet className="h-5 w-5" />}
          label="Total ESR (incl. GSR + MBR)"
          value={scope.totalEsr}
          gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
          isLoading={isLoading}
        />
      </div>

      {/* Components section */}
      <div className="mt-4 flex flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center text-xs sm:text-sm font-semibold text-gray-700">
            <Activity className="mr-1.5 h-4 w-4 text-purple-600" />
            Total Components in Scope
          </h3>
          <span className="text-[11px] font-semibold text-gray-500">
            {isLoading ? "—" : `${formatNumber(componentsTotal)} total`}
          </span>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-2.5">
          <ComponentBar
            icon={<Gauge className="h-4 w-4 text-white" />}
            label="Flow Meters"
            shortLabel="Flowmeter"
            value={scope.totalFlowmeterScope}
            total={componentsTotal}
            color="bg-amber-500"
            isLoading={isLoading}
          />
          <ComponentBar
            icon={<FlaskConical className="h-4 w-4 text-white" />}
            label="Residual Chlorine Analyzer"
            shortLabel="RCA"
            value={scope.totalRcaScope}
            total={componentsTotal}
            color="bg-emerald-600"
            isLoading={isLoading}
          />
          <ComponentBar
            icon={<Activity className="h-4 w-4 text-white" />}
            label="Pressure Transmitter"
            shortLabel="PT"
            value={scope.totalPtScope}
            total={componentsTotal}
            color="bg-rose-500"
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
