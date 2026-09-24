import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Shield,
  ShieldCheck,
  Award,
  Crown,
  Building2,
  Mail,
  Phone,
  Clock,
  Activity,
  Bell,
  Search,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Filter,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Laptop,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  MapPin,
  TrendingUp,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Smartphone,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface LoginSession {
  id: number;
  user_id?: number;
  username: string;
  login_time: string;
  logout_time?: string | null;
  session_duration?: number | null;
  session_duration_formatted?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_active?: boolean;
}

interface ActionItem {
  id: string;
  type: 'alert_acknowledged' | 'issue_resolved' | 'issue_reported' | 'user_activity' | 'sms_sent';
  category: string;
  title: string;
  description: string;
  timestamp: string;
  meta?: Record<string, any>;
}

interface EngineerHierarchyItem {
  key: string;
  rank: number; // 1: CE, 2: SE, 3: EE, 4: DE/AE
  level: 'CE' | 'SE' | 'EE' | 'DE/AE';
  position_title: string;
  name: string;
  email: string;
  phone: string;
  user_id: number | null;
  username: string | null;
  is_registered: boolean;
  regions: string[];
  districts: string[];
  divisions: string[];
  schemes: string[];
  schemes_count: number;
  alerts_sent_count: number;
  alerts_acknowledged_count: number;
  acknowledgement_rate: number;
  sms_sent_count: number;
  total_logins_recorded: number;
  last_login_at: string | null;
  last_30_logins: LoginSession[];
  actions_taken: ActionItem[];
  actions_count: number;
}

interface HierarchyResponse {
  success: boolean;
  kpis: {
    total_engineers: number;
    ce_count: number;
    se_count: number;
    ee_count: number;
    de_ae_count: number;
    registered_count: number;
    total_alerts_sent: number;
    total_alerts_acknowledged: number;
    total_sms_sent: number;
    total_actions_taken: number;
  };
  engineers: EngineerHierarchyItem[];
}

function parseUserAgent(ua: string | null | undefined): { browser: string; os: string } {
  if (!ua) return { browser: 'Unknown Browser', os: 'Unknown OS' };
  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  let browser = 'Unknown Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  return { browser, os };
}

function formatISTDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function getRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return formatISTDateTime(dateStr);
  } catch {
    return dateStr;
  }
}

export default function EngineersHierarchyPage() {
  const { toast } = useToast();
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'CE' | 'SE' | 'EE' | 'DE/AE'>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REGISTERED' | 'ROSTER_ONLY'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [selectedLoginsEngineer, setSelectedLoginsEngineer] = useState<EngineerHierarchyItem | null>(null);
  const [selectedActionsEngineer, setSelectedActionsEngineer] = useState<EngineerHierarchyItem | null>(null);
  const [actionCategoryFilter, setActionCategoryFilter] = useState<string>('ALL');

  // SMS Gateway Tester Modal States
  const [testSmsOpen, setTestSmsOpen] = useState(false);
  const [testSmsMobile, setTestSmsMobile] = useState('');
  const [testSmsTemplate, setTestSmsTemplate] = useState<'PRESSURE_LOW' | 'CHLORINE_HIGH' | 'CHLORINE_LOW' | 'LPCD_LOW'>('PRESSURE_LOW');
  const [testSmsScheme, setTestSmsScheme] = useState('7940695');
  const [testSmsValue, setTestSmsValue] = useState('0.15');
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<any>(null);

  const handleSendTestSms = async () => {
    const cleanMobile = testSmsMobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      toast({
        title: 'Invalid Mobile Number',
        description: 'Please enter a valid 10-digit mobile number.',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingSms(true);
    setTestSmsResult(null);

    try {
      const res = await fetch('/api/admin/engineers/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanMobile,
          templateType: testSmsTemplate,
          scheme: testSmsScheme.trim() || '7940695',
          value: testSmsValue.trim() || (testSmsTemplate === 'PRESSURE_LOW' ? '0.15' : '0.1'),
        }),
      });

      const json = await res.json();
      setTestSmsResult(json);

      if (json.success) {
        toast({
          title: 'SMS Sent Successfully',
          description: `Gateway delivered to ${cleanMobile} (Status: ${json.gatewayStatus ?? 200})`,
        });
      } else {
        toast({
          title: 'Gateway Response Received',
          description: json.message || `Gateway returned status ${json.gatewayStatus ?? 'error'}`,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      setTestSmsResult({ success: false, error: err.message });
      toast({
        title: 'SMS Dispatch Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsTestingSms(false);
    }
  };

  // Fetch hierarchy data
  const { data, isLoading, error, refetch, isFetching } = useQuery<HierarchyResponse>({
    queryKey: ['/api/admin/engineers/hierarchy'],
    queryFn: async () => {
      const res = await fetch('/api/admin/engineers/hierarchy', {
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Failed to load hierarchy data: ${res.statusText}`);
      }
      return res.json();
    },
    refetchInterval: 60000,
  });

  const engineers = data?.engineers || [];
  const kpis = data?.kpis;

  // Extract distinct regions for filter dropdown
  const allRegions = useMemo(() => {
    const set = new Set<string>();
    for (const eng of engineers) {
      for (const r of eng.regions) {
        if (r) set.add(r.trim());
      }
    }
    return Array.from(set).sort();
  }, [engineers]);

  // Filtered engineers list
  const filteredEngineers = useMemo(() => {
    return engineers.filter((eng) => {
      // Tier filter
      if (tierFilter !== 'ALL' && eng.level !== tierFilter) return false;

      // Status filter
      if (statusFilter === 'REGISTERED' && !eng.is_registered) return false;
      if (statusFilter === 'ROSTER_ONLY' && eng.is_registered) return false;

      // Region filter
      if (regionFilter !== 'ALL' && !eng.regions.includes(regionFilter)) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = eng.name.toLowerCase().includes(q);
        const matchEmail = eng.email.toLowerCase().includes(q);
        const matchPhone = eng.phone.toLowerCase().includes(q);
        const matchUsername = (eng.username || '').toLowerCase().includes(q);
        const matchTitle = eng.position_title.toLowerCase().includes(q);
        const matchSchemes = eng.schemes.some((s) => s.toLowerCase().includes(q));
        const matchDistricts = eng.districts.some((d) => d.toLowerCase().includes(q));
        if (!matchName && !matchEmail && !matchPhone && !matchUsername && !matchTitle && !matchSchemes && !matchDistricts) {
          return false;
        }
      }

      return true;
    });
  }, [engineers, tierFilter, statusFilter, regionFilter, searchTerm]);

  // Group filtered engineers by Tier
  const groupedEngineers = useMemo(() => {
    const ceList = filteredEngineers.filter((e) => e.level === 'CE');
    const seList = filteredEngineers.filter((e) => e.level === 'SE');
    const eeList = filteredEngineers.filter((e) => e.level === 'EE');
    const deaeList = filteredEngineers.filter((e) => e.level === 'DE/AE');
    return [
      {
        rank: 1,
        level: 'CE' as const,
        title: 'Chief Engineer (CE)',
        subtitle: 'Apex Regional & Zonal Leadership',
        badgeColor: 'from-purple-600 to-indigo-700 text-white',
        borderAccent: 'border-purple-200 dark:border-purple-900',
        items: ceList,
      },
      {
        rank: 2,
        level: 'SE' as const,
        title: 'Superintending Engineer (SE)',
        subtitle: 'Circle Jurisdiction & Oversight',
        badgeColor: 'from-blue-600 to-cyan-700 text-white',
        borderAccent: 'border-blue-200 dark:border-blue-900',
        items: seList,
      },
      {
        rank: 3,
        level: 'EE' as const,
        title: 'Executive Engineer (EE Civil & Mech)',
        subtitle: 'Division Executive & Project In-Charge',
        badgeColor: 'from-teal-600 to-emerald-700 text-white',
        borderAccent: 'border-teal-200 dark:border-teal-900',
        items: eeList,
      },
      {
        rank: 4,
        level: 'DE/AE' as const,
        title: 'Deputy / Assistant Engineer (DE / AE Civil & Mech)',
        subtitle: 'Sub-Division Execution & Monitoring',
        badgeColor: 'from-amber-600 to-orange-700 text-white',
        borderAccent: 'border-amber-200 dark:border-amber-900',
        items: deaeList,
      },
    ];
  }, [filteredEngineers]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast({
      title: 'Copied to Clipboard',
      description: `${label}: ${text}`,
    });
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Helper for designation styling
  const getPositionBadge = (level: string) => {
    switch (level) {
      case 'CE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm">
            <Crown className="w-3.5 h-3.5" /> Chief Engineer (CE)
          </span>
        );
      case 'SE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm">
            <Award className="w-3.5 h-3.5" /> Superintending Engineer (SE)
          </span>
        );
      case 'EE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" /> Executive Engineer (EE)
          </span>
        );
      case 'DE/AE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm">
            <Shield className="w-3.5 h-3.5" /> Deputy / Assistant Engineer (DE/AE)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/admin/dashboard">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800 p-0 h-8 px-2 -ml-2 text-xs">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Admin Portal
                  </Button>
                </Link>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Administrator Access Only
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                Engineers Hierarchy & Operational Directory
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Position-wise roster (CE, SE, EE, DE/AE), notification alerts sent, last 30 login sessions, and recorded operational actions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTestSmsResult(null);
                  setTestSmsOpen(true);
                }}
                className="bg-purple-950/80 border-purple-600/60 text-purple-200 hover:bg-purple-900 hover:text-white text-xs h-8 shadow-sm"
              >
                <Smartphone className="w-3.5 h-3.5 mr-1.5 text-purple-300" />
                Test SMS Gateway
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-0.5 flex items-center">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-7 px-2.5 text-xs"
                >
                  <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Grid
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-7 px-2.5 text-xs"
                >
                  <TableIcon className="w-3.5 h-3.5 mr-1" /> Table
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Engineers</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {kpis?.total_engineers ?? '—'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600 dark:text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                  {kpis?.ce_count ?? 0} CE
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                  {kpis?.se_count ?? 0} SE
                </span>
                <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold border border-teal-200">
                  {kpis?.ee_count ?? 0} EE
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                  {kpis?.de_ae_count ?? 0} DE/AE
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Registered Accounts</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {kpis?.registered_count ?? '—'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Active portal user credentials
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Alerts Delivered</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {kpis?.total_alerts_sent ?? '—'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Acknowledged: <strong>{kpis?.total_alerts_acknowledged ?? 0}</strong></span>
                <span className="text-blue-600 font-semibold">
                  {kpis && kpis.total_alerts_sent > 0
                    ? `${Math.round((kpis.total_alerts_acknowledged / kpis.total_alerts_sent) * 100)}% ack rate`
                    : '0% rate'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">SMS Dispatched</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {kpis?.total_sms_sent ?? '—'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                DLT-compliant alert dispatches
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Operational Actions</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {kpis?.total_actions_taken ?? '—'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                Total acks & resolution remarks logged
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 mb-6 bg-white dark:bg-slate-900">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search by engineer name, email, phone, username, region or scheme..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm h-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Region Filter */}
              <div className="w-full md:w-48">
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Regions</SelectItem>
                    {allRegions.map((reg) => (
                      <SelectItem key={reg} value={reg}>
                        {reg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-44">
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="Account Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Accounts</SelectItem>
                    <SelectItem value="REGISTERED">Registered Only</SelectItem>
                    <SelectItem value="ROSTER_ONLY">Roster Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Position Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
                <SlidersHorizontal className="w-3 h-3" /> Position:
              </span>
              <Button
                variant={tierFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTierFilter('ALL')}
                className="h-8 text-xs font-semibold shrink-0"
              >
                All Positions ({engineers.length})
              </Button>
              <Button
                variant={tierFilter === 'CE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTierFilter('CE')}
                className={`h-8 text-xs font-semibold shrink-0 ${tierFilter === 'CE' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'text-purple-700 dark:text-purple-400'}`}
              >
                <Crown className="w-3 h-3 mr-1" />
                Chief Engineer ({kpis?.ce_count ?? 0})
              </Button>
              <Button
                variant={tierFilter === 'SE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTierFilter('SE')}
                className={`h-8 text-xs font-semibold shrink-0 ${tierFilter === 'SE' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-blue-700 dark:text-blue-400'}`}
              >
                <Award className="w-3 h-3 mr-1" />
                Superintending Engineer ({kpis?.se_count ?? 0})
              </Button>
              <Button
                variant={tierFilter === 'EE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTierFilter('EE')}
                className={`h-8 text-xs font-semibold shrink-0 ${tierFilter === 'EE' ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'text-teal-700 dark:text-teal-400'}`}
              >
                <ShieldCheck className="w-3 h-3 mr-1" />
                Executive Engineer ({kpis?.ee_count ?? 0})
              </Button>
              <Button
                variant={tierFilter === 'DE/AE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTierFilter('DE/AE')}
                className={`h-8 text-xs font-semibold shrink-0 ${tierFilter === 'DE/AE' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-amber-700 dark:text-amber-400'}`}
              >
                <Shield className="w-3 h-3 mr-1" />
                Deputy / Asst. Engineer ({kpis?.de_ae_count ?? 0})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 text-center">
            <RefreshCw className="w-10 h-10 text-cyan-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              Loading hierarchy records, logins, and operational metrics...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/30 p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-red-800 dark:text-red-200">Unable to load engineer hierarchy</h3>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{(error as Error).message}</p>
            <Button onClick={() => refetch()} variant="outline" className="mt-4 border-red-300 text-red-700">
              Try Again
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredEngineers.length === 0 && (
          <Card className="p-12 text-center border-slate-200 dark:border-slate-800">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No engineers match your filters</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Try adjusting your search keywords, hierarchy level, or region filter to view engineer profiles.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setTierFilter('ALL');
                setRegionFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="mt-4"
            >
              Reset All Filters
            </Button>
          </Card>
        )}

        {/* Main Engineer Display: Grouped by Tier */}
        {!isLoading && !error && filteredEngineers.length > 0 && viewMode === 'grid' && (
          <div className="space-y-8">
            {groupedEngineers.map((group) => {
              if (group.items.length === 0) return null;
              return (
                <div key={group.level} className="space-y-3">
                  {/* Position Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200 dark:border-slate-800 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${group.badgeColor}`}>
                        {group.level}
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {group.title}
                        </h2>
                        <p className="text-xs text-slate-500">{group.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                      {group.items.length} {group.items.length === 1 ? 'Officer' : 'Officers'}
                    </span>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map((eng) => (
                      <Card
                        key={eng.key}
                        className="overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all bg-white dark:bg-slate-900 flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Top Strip */}
                          <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  {getPositionBadge(eng.level)}
                                </div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                                  {eng.name}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {eng.position_title}
                                </p>
                              </div>

                              <div>
                                {eng.is_registered ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] font-semibold border border-emerald-300">
                                    @{eng.username}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-slate-400 text-[10px]">
                                    Roster Only
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Contact Details */}
                            <div className="mt-3 space-y-1 text-xs">
                              {eng.email ? (
                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 group">
                                  <a
                                    href={`mailto:${eng.email}`}
                                    className="flex items-center gap-1.5 hover:text-blue-600 truncate font-medium"
                                    title={`Send email to ${eng.email}`}
                                  >
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{eng.email}</span>
                                  </a>
                                  <button
                                    onClick={() => copyToClipboard(eng.email, 'Email')}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded ml-1"
                                    title="Copy email"
                                  >
                                    {copiedText === eng.email ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-400 italic">
                                  <Mail className="w-3.5 h-3.5 shrink-0" /> No email registered
                                </div>
                              )}

                              {eng.phone ? (
                                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                  <a
                                    href={`tel:${eng.phone}`}
                                    className="flex items-center gap-1.5 hover:text-blue-600 font-medium"
                                  >
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{eng.phone}</span>
                                  </a>
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      onClick={() => {
                                        setTestSmsMobile(eng.phone);
                                        setTestSmsResult(null);
                                        setTestSmsOpen(true);
                                      }}
                                      className="text-purple-600 hover:text-purple-800 dark:text-purple-400 p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-950/50"
                                      title={`Test SMS to ${eng.phone}`}
                                    >
                                      <Smartphone className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(eng.phone, 'Phone')}
                                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                      title="Copy phone"
                                    >
                                      {copiedText === eng.phone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Jurisdiction Details */}
                          <div className="p-4 py-3 border-b border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
                            <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <div className="leading-snug">
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                  {eng.regions.length > 0 ? eng.regions.join(', ') : 'Maharashtra'}
                                </span>
                                {eng.districts.length > 0 && (
                                  <span className="text-slate-500"> • {eng.districts.slice(0, 3).join(', ')}</span>
                                )}
                              </div>
                            </div>

                            {/* Schemes count and SMS badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                                {eng.schemes_count} {eng.schemes_count === 1 ? 'Scheme' : 'Schemes'} Assigned
                              </span>
                              <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
                                <Smartphone className="w-3 h-3 text-indigo-500" />
                                {eng.sms_sent_count ?? 0} SMS Dispatched
                              </span>
                            </div>

                            {/* Alerts Delivered KPI Bar */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-500 flex items-center gap-1">
                                  <Bell className="w-3.5 h-3.5 text-blue-500" /> Alerts Sent:
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {eng.alerts_sent_count} ({eng.alerts_acknowledged_count} acked)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${Math.min(eng.acknowledgement_rate, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Buttons Footer: Last 30 Logins & Actions Taken */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLoginsEngineer(eng)}
                            className="h-9 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="truncate">Last 30 Logins ({eng.total_logins_recorded})</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedActionsEngineer(eng);
                              setActionCategoryFilter('ALL');
                            }}
                            className="h-9 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Activity className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="truncate">Actions ({eng.actions_count})</span>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View Mode */}
        {!isLoading && !error && filteredEngineers.length > 0 && viewMode === 'table' && (
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow>
                    <TableHead className="w-16">Designation</TableHead>
                    <TableHead>Engineer Name & Title</TableHead>
                    <TableHead>Email & Phone</TableHead>
                    <TableHead>Region & Jurisdiction</TableHead>
                    <TableHead className="text-center">Alerts Sent</TableHead>
                    <TableHead className="text-center">SMS Sent</TableHead>
                    <TableHead className="text-center">Total Logins</TableHead>
                    <TableHead className="text-center">Actions Taken</TableHead>
                    <TableHead className="text-right">Inspection</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEngineers.map((eng) => (
                    <TableRow key={eng.key} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            eng.level === 'CE'
                              ? 'border-purple-300 text-purple-700 bg-purple-50 font-bold'
                              : eng.level === 'SE'
                              ? 'border-blue-300 text-blue-700 bg-blue-50 font-bold'
                              : eng.level === 'EE'
                              ? 'border-teal-300 text-teal-700 bg-teal-50 font-bold'
                              : 'border-amber-300 text-amber-700 bg-amber-50 font-bold'
                          }
                        >
                          {eng.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900 dark:text-white">{eng.name}</div>
                        <div className="text-xs text-slate-500">{eng.position_title}</div>
                        {eng.is_registered && (
                          <span className="text-[10px] text-emerald-600 font-semibold">@{eng.username}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {eng.email ? (
                            <a href={`mailto:${eng.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" /> {eng.email}
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No email</span>
                          )}
                          {eng.phone && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <a href={`tel:${eng.phone}`} className="text-slate-600 dark:text-slate-300 hover:underline flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> {eng.phone}
                              </a>
                              <button
                                onClick={() => {
                                  setTestSmsMobile(eng.phone);
                                  setTestSmsResult(null);
                                  setTestSmsOpen(true);
                                }}
                                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 p-0.5 rounded"
                                title={`Test SMS to ${eng.phone}`}
                              >
                                <Smartphone className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {eng.regions.length > 0 ? eng.regions.join(', ') : 'Maharashtra'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {eng.schemes_count} {eng.schemes_count === 1 ? 'Scheme' : 'Schemes'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {eng.alerts_sent_count} ({eng.alerts_acknowledged_count} ack)
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Smartphone className="w-3 h-3 text-indigo-500" />
                          {eng.sms_sent_count ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {eng.total_logins_recorded} sessions
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {eng.actions_count} logged
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLoginsEngineer(eng)}
                          className="h-8 px-2 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                          title="View Last 30 Logins"
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" /> Logins
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedActionsEngineer(eng);
                            setActionCategoryFilter('ALL');
                          }}
                          className="h-8 px-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50"
                          title="View Actions Taken"
                        >
                          <Activity className="w-3.5 h-3.5 mr-1" /> Actions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* ========================================================================= */}
      {/* LAST 30 LOGINS MODAL DIALOG                                              */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(selectedLoginsEngineer)}
        onOpenChange={(open) => !open && setSelectedLoginsEngineer(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 bg-white dark:bg-slate-900">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50 font-bold">
                    {selectedLoginsEngineer?.position_title || selectedLoginsEngineer?.level}
                  </Badge>
                  {selectedLoginsEngineer?.is_registered ? (
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                      Account: @{selectedLoginsEngineer.username}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Unregistered Profile
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Last 30 Login Sessions: {selectedLoginsEngineer?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Chronological session logs recorded for {selectedLoginsEngineer?.email || selectedLoginsEngineer?.name}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Sessions List Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-3">
            {selectedLoginsEngineer && selectedLoginsEngineer.last_30_logins.length === 0 ? (
              <div className="text-center py-12">
                <Laptop className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No Login Activity Recorded Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {selectedLoginsEngineer.is_registered
                    ? `User '@${selectedLoginsEngineer.username}' has not initiated a portal session recently.`
                    : 'This engineer does not yet have an active login credential configured.'}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/90 text-xs">
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Login Time (IST)</TableHead>
                      <TableHead>Duration / Logout</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Browser & Platform</TableHead>
                      <TableHead className="text-right">Session Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {selectedLoginsEngineer?.last_30_logins.map((session, index) => {
                      const ua = parseUserAgent(session.user_agent);
                      return (
                        <TableRow key={session.id || index} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <TableCell className="font-bold text-slate-400">
                            #{index + 1}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatISTDateTime(session.login_time)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {session.session_duration_formatted || (session.session_duration ? `${session.session_duration}s` : 'Active')}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-slate-500 whitespace-nowrap">
                            {session.ip_address || '—'}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                              <Laptop className="w-3 h-3 text-slate-400" />
                              {ua.browser} on {ua.os}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {session.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Now
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Completed
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing up to 30 most recent sessions
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLoginsEngineer(null)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ACTIONS TAKEN TIMELINE DIALOG                                             */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(selectedActionsEngineer)}
        onOpenChange={(open) => !open && setSelectedActionsEngineer(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 bg-white dark:bg-slate-900">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50 font-bold">
                    {selectedActionsEngineer?.position_title || selectedActionsEngineer?.level}
                  </Badge>
                  <Badge className="bg-amber-100 text-amber-800 text-xs">
                    {selectedActionsEngineer?.actions_count} Operational Actions
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-600" />
                  Actions Taken: {selectedActionsEngineer?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Audit trail of alert acknowledgements, problem resolutions, and operational updates.
                </DialogDescription>
              </div>
            </div>

            {/* Filter Pills inside Action Modal */}
            <div className="flex items-center gap-1.5 pt-3 flex-wrap">
              <Button
                variant={actionCategoryFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActionCategoryFilter('ALL')}
                className="h-7 text-[11px] px-2.5"
              >
                All ({selectedActionsEngineer?.actions_taken.length || 0})
              </Button>
              <Button
                variant={actionCategoryFilter === 'alert_acknowledged' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActionCategoryFilter('alert_acknowledged')}
                className="h-7 text-[11px] px-2.5 text-blue-700 dark:text-blue-400"
              >
                Alert Acks ({selectedActionsEngineer?.actions_taken.filter((a) => a.type === 'alert_acknowledged').length || 0})
              </Button>
              <Button
                variant={actionCategoryFilter === 'sms_sent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActionCategoryFilter('sms_sent')}
                className="h-7 text-[11px] px-2.5 text-indigo-700 dark:text-indigo-400"
              >
                SMS Dispatched ({selectedActionsEngineer?.actions_taken.filter((a) => a.type === 'sms_sent').length || 0})
              </Button>
              <Button
                variant={actionCategoryFilter === 'issue_resolved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActionCategoryFilter('issue_resolved')}
                className="h-7 text-[11px] px-2.5 text-emerald-700 dark:text-emerald-400"
              >
                Resolutions ({selectedActionsEngineer?.actions_taken.filter((a) => a.type === 'issue_resolved').length || 0})
              </Button>
            </div>
          </DialogHeader>

          {/* Actions Timeline List */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {selectedActionsEngineer && selectedActionsEngineer.actions_taken.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No Actions Recorded</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  No alert acknowledgements, SMS dispatches, or issue resolutions are recorded in the audit log for this engineer yet.
                </p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-6">
                {selectedActionsEngineer?.actions_taken
                  .filter((act) => actionCategoryFilter === 'ALL' || act.type === actionCategoryFilter)
                  .map((action, idx) => {
                    return (
                      <div key={action.id || idx} className="relative pl-6">
                        {/* Dot Icon */}
                        <div
                          className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-white ${
                            action.type === 'alert_acknowledged'
                              ? 'bg-blue-600'
                              : action.type === 'sms_sent'
                              ? 'bg-indigo-600'
                              : action.type === 'issue_resolved'
                              ? 'bg-emerald-600'
                              : action.type === 'issue_reported'
                              ? 'bg-amber-600'
                              : 'bg-slate-600'
                          }`}
                        >
                          {action.type === 'alert_acknowledged' && <CheckCircle2 className="w-4 h-4" />}
                          {action.type === 'sms_sent' && <Smartphone className="w-4 h-4" />}
                          {action.type === 'issue_resolved' && <Check className="w-4 h-4" />}
                          {action.type === 'issue_reported' && <AlertTriangle className="w-4 h-4" />}
                          {action.type === 'user_activity' && <Activity className="w-4 h-4" />}
                        </div>

                        {/* Action Card */}
                        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                            <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                              {action.title}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                              {formatISTDateTime(action.timestamp)} ({getRelativeTime(action.timestamp)})
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                            {action.description}
                          </p>

                          {/* Meta pill badges */}
                          {action.meta && (
                            <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[10px]">
                              {action.meta.mobile && (
                                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold">
                                  Mobile: {action.meta.mobile}
                                </span>
                              )}
                              {action.meta.template_name && (
                                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {action.meta.template_name}
                                </span>
                              )}
                              {action.meta.ticket_id && (
                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold">
                                  Ticket #{action.meta.ticket_id}
                                </span>
                              )}
                              {action.meta.scheme_id && (
                                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">
                                  Scheme ID: {action.meta.scheme_id}
                                </span>
                              )}
                              {action.meta.alert_type && (
                                <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-semibold">
                                  {action.meta.alert_type}
                                </span>
                              )}
                              {action.meta.esr_name && (
                                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                  ESR: {action.meta.esr_name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing recorded acknowledgement & resolution audit history
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedActionsEngineer(null)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* TEST SMS GATEWAY MODAL DIALOG                                             */}
      {/* ========================================================================= */}
      <Dialog open={testSmsOpen} onOpenChange={setTestSmsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
          <DialogHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Smartping DLT SMS Gateway Tester
                </DialogTitle>
                <DialogDescription className="text-xs text-purple-200/80 mt-0.5">
                  Trigger live Airtel DLT-compliant Marathi SMS messages via server backend.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 text-xs">
            {/* Gateway Configuration Audit Card */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3.5 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Gateway URL:</span>
                <code className="text-slate-600 dark:text-slate-400 font-mono">https://pgapi.smartping.ai/fe/api/v1/send</code>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Sender ID (Header):</span>
                <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold font-mono">MJPIOT</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">PE ID (Principal Entity):</span>
                <code className="text-slate-600 dark:text-slate-400 font-mono">1001861588684954918</code>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">API Username:</span>
                <code className="text-slate-600 dark:text-slate-400 font-mono">CSTECH.trans</code>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-300">
                <Shield className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                <span>Backend dispatches from server IP. IP whitelisting configured in Cyfuture Smartping.</span>
              </div>
            </div>

            {/* Recipient Mobile */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Recipient Mobile Number (10 digits)</span>
                <span className="text-[10px] text-slate-400">e.g. 9876543210</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">+91</span>
                <Input
                  type="text"
                  value={testSmsMobile}
                  onChange={(e) => setTestSmsMobile(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  className="pl-12 text-xs font-mono h-9"
                  maxLength={12}
                />
              </div>
            </div>

            {/* DLT Template Selector */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Select DLT Approved Template
              </label>
              <Select
                value={testSmsTemplate}
                onValueChange={(val: any) => {
                  setTestSmsTemplate(val);
                  if (val === 'PRESSURE_LOW') setTestSmsValue('0.15');
                  if (val === 'CHLORINE_HIGH') setTestSmsValue('0.65');
                  if (val === 'CHLORINE_LOW') setTestSmsValue('0.10');
                  if (val === 'LPCD_LOW') setTestSmsValue('38');
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESSURE_LOW">
                    Pressure Low (&lt; 0.2 bar) — ID: 1077305300036737013
                  </SelectItem>
                  <SelectItem value="CHLORINE_HIGH">
                    Residual Chlorine High (&gt; 0.5 mg/l) — ID: 1077159330036594383
                  </SelectItem>
                  <SelectItem value="CHLORINE_LOW">
                    Residual Chlorine Low (&lt; 0.2 mg/l) — ID: 1077438200031589278
                  </SelectItem>
                  <SelectItem value="LPCD_LOW">
                    LPCD Low (&lt; 55 LPCD) — ID: 1077387830035602945
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Template Variables */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Scheme Name / ID ({'{#var#}'} 1)
                </label>
                <Input
                  type="text"
                  value={testSmsScheme}
                  onChange={(e) => setTestSmsScheme(e.target.value)}
                  placeholder="e.g. 7940695"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Sensor Value ({'{#var#}'} 2)
                </label>
                <Input
                  type="text"
                  value={testSmsValue}
                  onChange={(e) => setTestSmsValue(e.target.value)}
                  placeholder={testSmsTemplate === 'PRESSURE_LOW' ? '0.15' : testSmsTemplate === 'LPCD_LOW' ? '38' : '0.10'}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Live Rendered Template Preview */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Exact DLT SMS Text Preview (Marathi)</span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Approved DLT Template
                </span>
              </label>
              <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                {testSmsTemplate === 'PRESSURE_LOW' && (
                  <>सूचना: JJM MVS <strong className="text-purple-700 dark:text-purple-300">{testSmsScheme || '{scheme}'}</strong> अंतर्गत ESR-1 च्या वितरण व्यवस्थेतील Pressure Sensor नुसार पाण्याचा दाब 0.2 bar पेक्षा कमी असून सध्याचा दाब <strong className="text-purple-700 dark:text-purple-300">{testSmsValue || '0.15'}</strong> bar इतका आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा</>
                )}
                {testSmsTemplate === 'CHLORINE_HIGH' && (
                  <>सूचना: JJM MVS <strong className="text-purple-700 dark:text-purple-300">{testSmsScheme || '{scheme}'}</strong> अंतर्गत ESR-1 मध्ये Residual Chlorine ची मात्रा 0.5 mg/l पेक्षा जास्त असून सध्याची मात्रा <strong className="text-purple-700 dark:text-purple-300">{testSmsValue || '0.65'}</strong> mg/l इतकी आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा</>
                )}
                {testSmsTemplate === 'CHLORINE_LOW' && (
                  <>सूचना: JJM MVS <strong className="text-purple-700 dark:text-purple-300">{testSmsScheme || '{scheme}'}</strong> अंतर्गत ESR-1 मध्ये Residual Chlorine ची मात्रा 0.2 mg/l पेक्षा कमी असून सध्याची मात्रा <strong className="text-purple-700 dark:text-purple-300">{testSmsValue || '0.10'}</strong> mg/l इतकी आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा</>
                )}
                {testSmsTemplate === 'LPCD_LOW' && (
                  <>सूचना: JJM MVS <strong className="text-purple-700 dark:text-purple-300">{testSmsScheme || '{scheme}'}</strong> अंतर्गत पाणीपुरवठ्याचा दर 55 LPCD पेक्षा कमी असून सध्याचा पाणीपुरवठ्याचा दर <strong className="text-purple-700 dark:text-purple-300">{testSmsValue || '38'}</strong> LPCD आहे. तपासून त्वरित कार्यवाही करावी. – मजीप्रा</>
                )}
              </div>
            </div>

            {/* Test Result Display */}
            {testSmsResult && (
              <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${testSmsResult.success ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200' : 'bg-red-50 dark:bg-red-950/30 border-red-300 text-red-900 dark:text-red-200'}`}>
                <div className="flex items-center gap-2 font-bold">
                  {testSmsResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                  <span>{testSmsResult.success ? 'Gateway Dispatched Successfully' : 'Gateway Returned Response'}</span>
                </div>
                {testSmsResult.gatewayStatus !== undefined && (
                  <div className="font-medium">
                    HTTP Gateway Status: <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-white/70 dark:bg-black/40">{testSmsResult.gatewayStatus}</span>
                  </div>
                )}
                {testSmsResult.gatewayResponse && (
                  <div className="font-mono text-[11px] bg-white/80 dark:bg-black/50 p-2.5 rounded border break-all leading-normal">
                    {testSmsResult.gatewayResponse}
                  </div>
                )}
                {testSmsResult.error && (
                  <div className="text-[11px] text-red-700 dark:text-red-300 font-medium">{testSmsResult.error}</div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Triggers POST /api/admin/engineers/test-sms
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestSmsOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleSendTestSms}
                disabled={isTestingSms || !testSmsMobile}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
              >
                {isTestingSms ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Sending via Server...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Send Test SMS
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
