import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  Search,
  Users,
  Mail,
  MessageSquare,
  AlertTriangle,
  Droplets,
  Gauge,
  WifiOff,
  Phone,
  RefreshCw,
  Building2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface SchemeInfo {
  scheme_id: string;
  scheme_name: string;
  region?: string;
  district?: string;
  ee_civil_name?: string;
  ee_civil_email?: string;
  ee_civil_mobile?: string;
  ee_mech_name?: string;
  ee_mech_email?: string;
  ee_mech_mobile?: string;
  de_ae_civil_name?: string;
  de_ae_civil_email?: string;
  de_ae_civil_mobile?: string;
  de_ae_mech_name?: string;
  de_ae_mech_email?: string;
  de_ae_mech_mobile?: string;
  se_name?: string;
  se_email?: string;
  se_mobile?: string;
  chief_engineer_name?: string;
  chief_engineer_email?: string;
  chief_engineer_mobile?: string;
}

interface DayData {
  day_date: string;
  formatted_date: string;
  lpcd_email: number;
  lpcd_sms: number;
  lpcd_sms_delivered: number;
  chlorine_email: number;
  chlorine_sms: number;
  chlorine_sms_delivered: number;
  pressure_email: number;
  pressure_sms: number;
  pressure_sms_delivered: number;
  offline_email: number;
  offline_sms: number;
  offline_sms_delivered: number;
  total_email: number;
  total_sms: number;
  total_sms_delivered: number;
}

interface WeeklyTotals {
  lpcd_email: number;
  lpcd_sms: number;
  lpcd_sms_delivered: number;
  chlorine_email: number;
  chlorine_sms: number;
  chlorine_sms_delivered: number;
  pressure_email: number;
  pressure_sms: number;
  pressure_sms_delivered: number;
  offline_email: number;
  offline_sms: number;
  offline_sms_delivered: number;
  total_email: number;
  total_sms: number;
  total_sms_delivered: number;
}

export default function AlertsWeeklyPage() {
  const [, setLocation] = useLocation();
  const [schemes, setSchemes] = useState<SchemeInfo[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('20027978');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [statusData, setStatusData] = useState<{
    scheme: SchemeInfo;
    days: DayData[];
    totals: WeeklyTotals;
  } | null>(null);

  // Fetch all schemes list
  useEffect(() => {
    fetch('/api/alerts-progress/weekly-schemes')
      .then((res) => res.json())
      .then((data: SchemeInfo[]) => {
        if (Array.isArray(data)) {
          setSchemes(data);
          // If default not found, pick the first one
          if (data.length > 0 && !data.some((s) => s.scheme_id === '20027978')) {
            setSelectedSchemeId(data[0].scheme_id);
          }
        }
      })
      .catch((err) => console.error('Failed to load schemes:', err));
  }, []);

  // Fetch weekly status for selected scheme
  const fetchWeeklyStatus = (id: string) => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/alerts-progress/weekly-status/${encodeURIComponent(id)}`)
      .then((res) => res.json())
      .then((data) => {
        setStatusData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load weekly status:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedSchemeId) {
      fetchWeeklyStatus(selectedSchemeId);
    }
  }, [selectedSchemeId]);

  // Filter schemes for autocomplete search
  const filteredSchemes = useMemo(() => {
    if (!searchQuery.trim()) return schemes.slice(0, 15);
    const q = searchQuery.toLowerCase();
    return schemes.filter(
      (s) =>
        (s.scheme_name && s.scheme_name.toLowerCase().includes(q)) ||
        (s.scheme_id && s.scheme_id.toLowerCase().includes(q)) ||
        (s.region && s.region.toLowerCase().includes(q))
    );
  }, [schemes, searchQuery]);

  const schemeInfo = statusData?.scheme;
  const days = statusData?.days || [];
  const totals = statusData?.totals;

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs">
          <p className="font-semibold text-slate-200 border-b border-slate-700 pb-1 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex justify-between items-center gap-4 py-0.5">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation('/alerts-progress')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-medium border border-white/20 text-white"
                title="Return to Alerts Progress"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Alerts Progress
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                  <span>Weekly Scheme Alerts & Performance</span>
                </h1>
                <p className="text-xs text-indigo-200 mt-0.5">
                  7-Day trend of Email alerts & SMS dispatches by parameter
                </p>
              </div>
            </div>

            {/* Scheme Search & Selector Bar */}
            <div className="flex items-center gap-2 relative">
              <div className="relative w-72 md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search scheme name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-800/90 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery.trim() && (
                  <div className="absolute left-0 right-0 mt-1 bg-white text-slate-900 rounded-lg shadow-2xl border border-slate-200 max-h-60 overflow-y-auto z-50 text-xs divide-y divide-slate-100">
                    {filteredSchemes.length === 0 ? (
                      <div className="p-3 text-slate-500 text-center">No matching scheme found</div>
                    ) : (
                      filteredSchemes.map((s) => (
                        <button
                          key={s.scheme_id}
                          onClick={() => {
                            setSelectedSchemeId(s.scheme_id);
                            setSearchQuery('');
                          }}
                          className="w-full text-left p-2.5 hover:bg-blue-50 flex flex-col transition-colors"
                        >
                          <span className="font-semibold text-slate-800">{s.scheme_name}</span>
                          <span className="text-[11px] text-slate-500">ID: {s.scheme_id} • Region: {s.region || 'N/A'}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => fetchWeeklyStatus(selectedSchemeId)}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white"
                title="Refresh Status"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Scheme Information & Hierarchy Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Scheme ID: {schemeInfo?.scheme_id || selectedSchemeId}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  Region: {schemeInfo?.region || 'Maharashtra'}
                </span>
                {schemeInfo?.district && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    District: {schemeInfo.district}
                  </span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mt-2 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-600" />
                {schemeInfo?.scheme_name || 'Selected Water Scheme'}
              </h2>
            </div>

            {/* Quick Scheme Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="scheme-select" className="text-xs font-medium text-slate-500">Select Scheme:</label>
              <select
                id="scheme-select"
                value={selectedSchemeId}
                onChange={(e) => setSelectedSchemeId(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {schemes.map((s) => (
                  <option key={s.scheme_id} value={s.scheme_id}>
                    {s.scheme_name} ({s.scheme_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Engineers Hierarchy Section */}
          <div className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
              <Users className="w-4 h-4 text-indigo-600" />
              Assigned Engineers & Hierarchy (Field to Executive)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* 1. DE/AE (Civil) */}
              <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/80 hover:border-blue-300 transition-colors">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 mb-1.5">
                  DE / AE (Civil)
                </span>
                <p className="text-xs font-semibold text-slate-800 truncate" title={schemeInfo?.de_ae_civil_name || '-'}>
                  {schemeInfo?.de_ae_civil_name || '-'}
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.de_ae_civil_mobile || '-'}>
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{schemeInfo?.de_ae_civil_mobile || '-'}</span>
                  </p>
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.de_ae_civil_email || '-'}>
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{schemeInfo?.de_ae_civil_email || '-'}</span>
                  </p>
                </div>
              </div>

              {/* 2. DE/AE (Mech) */}
              <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/80 hover:border-blue-300 transition-colors">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 mb-1.5">
                  DE / AE (Mech)
                </span>
                <p className="text-xs font-semibold text-slate-800 truncate" title={schemeInfo?.de_ae_mech_name || '-'}>
                  {schemeInfo?.de_ae_mech_name || '-'}
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.de_ae_mech_mobile || '-'}>
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{schemeInfo?.de_ae_mech_mobile || '-'}</span>
                  </p>
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.de_ae_mech_email || '-'}>
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{schemeInfo?.de_ae_mech_email || '-'}</span>
                  </p>
                </div>
              </div>

              {/* 3. EE (Civil) */}
              <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/80 hover:border-indigo-300 transition-colors">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 mb-1.5">
                  EE (Civil)
                </span>
                <p className="text-xs font-semibold text-slate-800 truncate" title={schemeInfo?.ee_civil_name || '-'}>
                  {schemeInfo?.ee_civil_name || '-'}
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.ee_civil_mobile || '-'}>
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{schemeInfo?.ee_civil_mobile || '-'}</span>
                  </p>
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.ee_civil_email || '-'}>
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{schemeInfo?.ee_civil_email || '-'}</span>
                  </p>
                </div>
              </div>

              {/* 4. EE (Mech) */}
              <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/80 hover:border-indigo-300 transition-colors">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 mb-1.5">
                  EE (Mech)
                </span>
                <p className="text-xs font-semibold text-slate-800 truncate" title={schemeInfo?.ee_mech_name || '-'}>
                  {schemeInfo?.ee_mech_name || '-'}
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.ee_mech_mobile || '-'}>
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{schemeInfo?.ee_mech_mobile || '-'}</span>
                  </p>
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.ee_mech_email || '-'}>
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{schemeInfo?.ee_mech_email || '-'}</span>
                  </p>
                </div>
              </div>

              {/* 5. SE */}
              <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/80 hover:border-purple-300 transition-colors">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 mb-1.5">
                  Superintending Eng (SE)
                </span>
                <p className="text-xs font-semibold text-slate-800 truncate" title={schemeInfo?.se_name || '-'}>
                  {schemeInfo?.se_name || '-'}
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.se_mobile || '-'}>
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{schemeInfo?.se_mobile || '-'}</span>
                  </p>
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.se_email || '-'}>
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{schemeInfo?.se_email || '-'}</span>
                  </p>
                </div>
              </div>

              {/* 6. Chief Engineer */}
              <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/80 hover:border-amber-300 transition-colors">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 mb-1.5">
                  Chief Engineer (CE)
                </span>
                <p className="text-xs font-semibold text-slate-800 truncate" title={schemeInfo?.chief_engineer_name || '-'}>
                  {schemeInfo?.chief_engineer_name || '-'}
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.chief_engineer_mobile || '-'}>
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{schemeInfo?.chief_engineer_mobile || '-'}</span>
                  </p>
                  <p className="flex items-center gap-1 truncate" title={schemeInfo?.chief_engineer_email || '-'}>
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{schemeInfo?.chief_engineer_email || '-'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Summary Metric Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">LPCD (7 Days)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-800">{totals?.lpcd_email || 0} Alerts</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {totals?.lpcd_sms || 0} SMS ({totals?.lpcd_sms_delivered || 0} Delivered)
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chlorine (7 Days)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-800">{totals?.chlorine_email || 0} Alerts</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {totals?.chlorine_sms || 0} SMS ({totals?.chlorine_sms_delivered || 0} Delivered)
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pressure (7 Days)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-800">{totals?.pressure_email || 0} Alerts</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {totals?.pressure_sms || 0} SMS ({totals?.pressure_sms_delivered || 0} Delivered)
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <WifiOff className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Offline Sensors (7 Days)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-800">{totals?.offline_email || 0} Alerts</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {totals?.offline_sms || 0} SMS ({totals?.offline_sms_delivered || 0} Delivered)
              </p>
            </div>
          </div>
        </div>

        {/* 4 Separate Parameter Graphs: LPCD, Chlorine, Pressure, Offline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graph 1: Low LPCD Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">1. Low LPCD Alerts (7 Days)</h4>
                  <p className="text-[11px] text-slate-500">Daily SMS Dispatched vs. Email Alerts</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                  Total SMS: {totals?.lpcd_sms || 0}
                </span>
              </div>
            </div>

            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="formatted_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="lpcd_sms" name="SMS Dispatched" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lpcd_email" name="Email Alerts" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 2: Residual Chlorine Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">2. Residual Chlorine Alerts (7 Days)</h4>
                  <p className="text-[11px] text-slate-500">Daily SMS Dispatched vs. Email Alerts</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                  Total SMS: {totals?.chlorine_sms || 0}
                </span>
              </div>
            </div>

            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="formatted_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="chlorine_sms" name="SMS Dispatched" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="chlorine_email" name="Email Alerts" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 3: Low Pressure Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">3. Low Pressure Alerts (7 Days)</h4>
                  <p className="text-[11px] text-slate-500">Daily SMS Dispatched vs. Email Alerts</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
                  Total SMS: {totals?.pressure_sms || 0}
                </span>
              </div>
            </div>

            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="formatted_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="pressure_sms" name="SMS Dispatched" fill="#d97706" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pressure_email" name="Email Alerts" fill="#fcd34d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 4: Offline Sensors Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">4. Offline Sensors Alerts (7 Days)</h4>
                  <p className="text-[11px] text-slate-500">Daily SMS Dispatched vs. Email Alerts</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded">
                  Total SMS: {totals?.offline_sms || 0}
                </span>
              </div>
            </div>

            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="formatted_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="offline_sms" name="SMS Dispatched" fill="#e11d48" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="offline_email" name="Email Alerts" fill="#fda4af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 7-Day Day-by-Day Detailed Log Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Day-by-Day Alert & Dispatch Audit Log (Past 7 Days)
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total 7-Day SMS Dispatches: {totals?.total_sms || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3 text-center border-l border-slate-200 bg-blue-50/50">LPCD SMS</th>
                  <th className="py-3 px-3 text-center bg-blue-50/50">LPCD Email</th>
                  <th className="py-3 px-3 text-center border-l border-slate-200 bg-emerald-50/50">Chlorine SMS</th>
                  <th className="py-3 px-3 text-center bg-emerald-50/50">Chlorine Email</th>
                  <th className="py-3 px-3 text-center border-l border-slate-200 bg-amber-50/50">Pressure SMS</th>
                  <th className="py-3 px-3 text-center bg-amber-50/50">Pressure Email</th>
                  <th className="py-3 px-3 text-center border-l border-slate-200 bg-rose-50/50">Offline SMS</th>
                  <th className="py-3 px-3 text-center bg-rose-50/50">Offline Email</th>
                  <th className="py-3 px-4 text-center border-l border-slate-200 bg-slate-100/70 font-bold">Total SMS</th>
                  <th className="py-3 px-4 text-center bg-slate-100/70 font-bold">Total Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {days.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      {row.formatted_date}
                    </td>

                    {/* LPCD */}
                    <td className="py-3 px-3 text-center border-l border-slate-100 font-medium text-blue-700 bg-blue-50/20">
                      {row.lpcd_sms > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-blue-100 font-bold">{row.lpcd_sms}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center bg-blue-50/20 text-slate-700 font-medium">
                      {row.lpcd_email}
                    </td>

                    {/* Chlorine */}
                    <td className="py-3 px-3 text-center border-l border-slate-100 font-medium text-emerald-700 bg-emerald-50/20">
                      {row.chlorine_sms > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 font-bold">{row.chlorine_sms}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center bg-emerald-50/20 text-slate-700 font-medium">
                      {row.chlorine_email}
                    </td>

                    {/* Pressure */}
                    <td className="py-3 px-3 text-center border-l border-slate-100 font-medium text-amber-700 bg-amber-50/20">
                      {row.pressure_sms > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 font-bold">{row.pressure_sms}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center bg-amber-50/20 text-slate-700 font-medium">
                      {row.pressure_email}
                    </td>

                    {/* Offline */}
                    <td className="py-3 px-3 text-center border-l border-slate-100 font-medium text-rose-700 bg-rose-50/20">
                      {row.offline_sms > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 font-bold">{row.offline_sms}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center bg-rose-50/20 text-slate-700 font-medium">
                      {row.offline_email}
                    </td>

                    {/* Totals */}
                    <td className="py-3 px-4 text-center border-l border-slate-200 bg-slate-50/60 font-bold text-slate-900">
                      {row.total_sms}
                    </td>
                    <td className="py-3 px-4 text-center bg-slate-50/60 font-bold text-slate-700">
                      {row.total_email}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 text-slate-800 font-bold border-t-2 border-slate-300">
                <tr>
                  <td className="py-3 px-4 uppercase text-[11px] tracking-wider">7-Day Total</td>
                  <td className="py-3 px-3 text-center border-l border-slate-200 text-blue-800">{totals?.lpcd_sms || 0}</td>
                  <td className="py-3 px-3 text-center text-blue-800">{totals?.lpcd_email || 0}</td>
                  <td className="py-3 px-3 text-center border-l border-slate-200 text-emerald-800">{totals?.chlorine_sms || 0}</td>
                  <td className="py-3 px-3 text-center text-emerald-800">{totals?.chlorine_email || 0}</td>
                  <td className="py-3 px-3 text-center border-l border-slate-200 text-amber-800">{totals?.pressure_sms || 0}</td>
                  <td className="py-3 px-3 text-center text-amber-800">{totals?.pressure_email || 0}</td>
                  <td className="py-3 px-3 text-center border-l border-slate-200 text-rose-800">{totals?.offline_sms || 0}</td>
                  <td className="py-3 px-3 text-center text-rose-800">{totals?.offline_email || 0}</td>
                  <td className="py-3 px-4 text-center border-l border-slate-200 text-slate-900 bg-slate-200/60">{totals?.total_sms || 0}</td>
                  <td className="py-3 px-4 text-center text-slate-900 bg-slate-200/60">{totals?.total_email || 0}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
