import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MapPin,
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  CheckCircle2,
  Clock,
  RotateCcw,
  Send,
  Lock,
  Layers,
  FileText,
  LogOut,
  ShieldCheck,
  Search,
  Download,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface SchemeOption {
  scheme_name: string;
  scheme_id: string;
}

interface Admin2SubmissionRecord {
  id: number;
  region: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_name: string;
  scheme_id: string;
  engineer_name: string;
  engineer_email: string;
  engineer_mobile: string;
  engineer_designation: string;
  agency_name: string;
  handover_status: string;
  creator_username?: string | null;
  created_at: string;
}

const AGENCY_OPTIONS = [
  'MJP',
  'ZP',
  'ZP-Shikarsamiti',
  'Gram Panchayat (GP)',
  'Contractor',
] as const;

const HANDOVER_OPTIONS = ['Handed Over', 'Not Handed Over'] as const;

const isNA = (val?: string | null): boolean => {
  if (!val) return true;
  const clean = val.trim().toUpperCase();
  return ['NA', 'N/A', 'NULL', '-', '--', 'NONE'].includes(clean);
};

export default function Admin2FormPage() {
  const { user, role, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // -------------------------------------------------------------
  // Form State: Section A (Location & Scheme)
  // -------------------------------------------------------------
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedCircle, setSelectedCircle] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedSubDivision, setSelectedSubDivision] = useState<string>('');
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [selectedSchemeName, setSelectedSchemeName] = useState<string>('');
  const [schemeId, setSchemeId] = useState<string>('');

  // -------------------------------------------------------------
  // Form State: Section B (Engineer Details)
  // -------------------------------------------------------------
  const [engineerName, setEngineerName] = useState<string>('');
  const [engineerEmail, setEngineerEmail] = useState<string>('');
  const [engineerMobile, setEngineerMobile] = useState<string>('');
  const [engineerDesignation, setEngineerDesignation] = useState<string>('');

  // -------------------------------------------------------------
  // Form State: Section C (Agency Details)
  // -------------------------------------------------------------
  const [agencyName, setAgencyName] = useState<string>('');

  // -------------------------------------------------------------
  // Form State: Section D (Handover Status)
  // -------------------------------------------------------------
  const [handoverStatus, setHandoverStatus] = useState<string>('');

  // Table search & filter state
  const [submissionSearch, setSubmissionSearch] = useState<string>('');

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // -------------------------------------------------------------
  // Cascading Queries & Filtered Lists (No NA options)
  // -------------------------------------------------------------
  // 1. Regions
  const { data: regionsData, isLoading: isLoadingRegions } = useQuery<{ success: boolean; regions: string[] }>({
    queryKey: ['/api/admin2/locations/regions'],
    queryFn: async () => {
      const res = await fetch('/api/admin2/locations/regions');
      if (!res.ok) throw new Error('Failed to load regions');
      return res.json();
    },
  });
  const regionsList = (regionsData?.regions || []).filter((r) => !isNA(r));

  // 2. Circles (dependent on region)
  const { data: circlesData, isLoading: isLoadingCircles } = useQuery<{ success: boolean; circles: string[] }>({
    queryKey: ['/api/admin2/locations/circles', selectedRegion],
    queryFn: async () => {
      if (!selectedRegion) return { success: true, circles: [] };
      const res = await fetch(`/api/admin2/locations/circles?region=${encodeURIComponent(selectedRegion)}`);
      if (!res.ok) throw new Error('Failed to load circles');
      return res.json();
    },
    enabled: Boolean(selectedRegion),
  });
  const circlesList = (circlesData?.circles || []).filter((c) => !isNA(c));

  // 3. Divisions (dependent on region and circle)
  const { data: divisionsData, isLoading: isLoadingDivisions } = useQuery<{ success: boolean; divisions: string[] }>({
    queryKey: ['/api/admin2/locations/divisions', selectedRegion, selectedCircle],
    queryFn: async () => {
      if (!selectedRegion || !selectedCircle) return { success: true, divisions: [] };
      const res = await fetch(
        `/api/admin2/locations/divisions?region=${encodeURIComponent(selectedRegion)}&circle=${encodeURIComponent(selectedCircle)}`
      );
      if (!res.ok) throw new Error('Failed to load divisions');
      return res.json();
    },
    enabled: Boolean(selectedRegion && selectedCircle),
  });
  const divisionsList = (divisionsData?.divisions || []).filter((d) => !isNA(d));

  // 4. Sub-Divisions (dependent on region, circle, division)
  const { data: subDivisionsData, isLoading: isLoadingSubDivisions } = useQuery<{ success: boolean; subDivisions: string[] }>({
    queryKey: ['/api/admin2/locations/sub-divisions', selectedRegion, selectedCircle, selectedDivision],
    queryFn: async () => {
      if (!selectedRegion || !selectedCircle || !selectedDivision) return { success: true, subDivisions: [] };
      const res = await fetch(
        `/api/admin2/locations/sub-divisions?region=${encodeURIComponent(selectedRegion)}&circle=${encodeURIComponent(
          selectedCircle
        )}&division=${encodeURIComponent(selectedDivision)}`
      );
      if (!res.ok) throw new Error('Failed to load sub-divisions');
      return res.json();
    },
    enabled: Boolean(selectedRegion && selectedCircle && selectedDivision),
  });
  const subDivisionsList = (subDivisionsData?.subDivisions || []).filter((s) => !isNA(s));

  // 5. Blocks (dependent on region, circle, division, sub-division)
  const { data: blocksData, isLoading: isLoadingBlocks } = useQuery<{ success: boolean; blocks: string[] }>({
    queryKey: ['/api/admin2/locations/blocks', selectedRegion, selectedCircle, selectedDivision, selectedSubDivision],
    queryFn: async () => {
      if (!selectedRegion || !selectedCircle || !selectedDivision)
        return { success: true, blocks: [] };
      let url = `/api/admin2/locations/blocks?region=${encodeURIComponent(selectedRegion)}&circle=${encodeURIComponent(
        selectedCircle
      )}&division=${encodeURIComponent(selectedDivision)}`;
      if (selectedSubDivision && !isNA(selectedSubDivision)) {
        url += `&subDivision=${encodeURIComponent(selectedSubDivision)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load blocks');
      return res.json();
    },
    enabled: Boolean(
      selectedRegion &&
      selectedCircle &&
      selectedDivision &&
      (subDivisionsList.length === 0 || selectedSubDivision)
    ),
  });
  const blocksList = (blocksData?.blocks || []).filter((b) => !isNA(b));

  // 6. Schemes (dependent on selected hierarchy)
  const { data: schemesData, isLoading: isLoadingSchemes } = useQuery<{ success: boolean; schemes: SchemeOption[] }>({
    queryKey: [
      '/api/admin2/locations/schemes',
      selectedRegion,
      selectedCircle,
      selectedDivision,
      selectedSubDivision,
      selectedBlock,
    ],
    queryFn: async () => {
      if (!selectedRegion || !selectedCircle || !selectedDivision) {
        return { success: true, schemes: [] };
      }
      let url = `/api/admin2/locations/schemes?region=${encodeURIComponent(selectedRegion)}&circle=${encodeURIComponent(
        selectedCircle
      )}&division=${encodeURIComponent(selectedDivision)}`;
      if (selectedSubDivision && !isNA(selectedSubDivision)) {
        url += `&subDivision=${encodeURIComponent(selectedSubDivision)}`;
      }
      if (selectedBlock && !isNA(selectedBlock)) {
        url += `&block=${encodeURIComponent(selectedBlock)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load schemes');
      return res.json();
    },
    enabled: Boolean(
      selectedRegion &&
      selectedCircle &&
      selectedDivision &&
      (subDivisionsList.length === 0 || selectedSubDivision) &&
      (blocksList.length === 0 || selectedBlock)
    ),
  });
  const schemesList = (schemesData?.schemes || []).filter(
    (s) => !isNA(s.scheme_name) && !isNA(s.scheme_id)
  );

  // -------------------------------------------------------------
  // Cascading Reset Handlers
  // -------------------------------------------------------------
  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    setSelectedCircle('');
    setSelectedDivision('');
    setSelectedSubDivision('');
    setSelectedBlock('');
    setSelectedSchemeName('');
    setSchemeId('');
    if (errors.region) setErrors((prev) => ({ ...prev, region: '' }));
  };

  const handleCircleChange = (newCircle: string) => {
    setSelectedCircle(newCircle);
    setSelectedDivision('');
    setSelectedSubDivision('');
    setSelectedBlock('');
    setSelectedSchemeName('');
    setSchemeId('');
    if (errors.circle) setErrors((prev) => ({ ...prev, circle: '' }));
  };

  const handleDivisionChange = (newDivision: string) => {
    setSelectedDivision(newDivision);
    setSelectedSubDivision('');
    setSelectedBlock('');
    setSelectedSchemeName('');
    setSchemeId('');
    if (errors.division) setErrors((prev) => ({ ...prev, division: '' }));
  };

  const handleSubDivisionChange = (newSubDivision: string) => {
    setSelectedSubDivision(newSubDivision);
    setSelectedBlock('');
    setSelectedSchemeName('');
    setSchemeId('');
    if (errors.sub_division) setErrors((prev) => ({ ...prev, sub_division: '' }));
  };

  const handleBlockChange = (newBlock: string) => {
    setSelectedBlock(newBlock);
    setSelectedSchemeName('');
    setSchemeId('');
    if (errors.block) setErrors((prev) => ({ ...prev, block: '' }));
  };

  const handleSchemeChange = (newSchemeName: string) => {
    setSelectedSchemeName(newSchemeName);
    const matched = schemesList.find((s) => s.scheme_name === newSchemeName);
    setSchemeId(matched ? matched.scheme_id : '');
    if (errors.scheme_name) setErrors((prev) => ({ ...prev, scheme_name: '' }));
    if (errors.scheme_id) setErrors((prev) => ({ ...prev, scheme_id: '' }));
  };

  // -------------------------------------------------------------
  // Form Reset
  // -------------------------------------------------------------
  const handleResetForm = () => {
    setSelectedRegion('');
    setSelectedCircle('');
    setSelectedDivision('');
    setSelectedSubDivision('');
    setSelectedBlock('');
    setSelectedSchemeName('');
    setSchemeId('');
    setEngineerName('');
    setEngineerEmail('');
    setEngineerMobile('');
    setEngineerDesignation('');
    setAgencyName('');
    setHandoverStatus('');
    setErrors({});
    toast({
      title: 'Form Reset',
      description: 'All input fields and selections have been cleared.',
    });
  };

  // -------------------------------------------------------------
  // Form Validation
  // -------------------------------------------------------------
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedRegion.trim()) newErrors.region = 'Region is required';
    if (!selectedCircle.trim()) newErrors.circle = 'Circle is required';
    if (!selectedDivision.trim()) newErrors.division = 'Division is required';
    if (subDivisionsList.length > 0 && !selectedSubDivision.trim()) {
      newErrors.sub_division = 'Sub-Division is required';
    }
    if (blocksList.length > 0 && !selectedBlock.trim()) {
      newErrors.block = 'Block is required';
    }
    if (!selectedSchemeName.trim()) newErrors.scheme_name = 'Scheme Name is required';
    if (!schemeId.trim()) newErrors.scheme_id = 'Scheme ID is required';

    if (!engineerName.trim()) newErrors.engineer_name = 'Engineer Name is required';
    if (!engineerEmail.trim()) {
      newErrors.engineer_email = 'Engineer Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(engineerEmail.trim())) {
      newErrors.engineer_email = 'Please enter a valid email address';
    }

    if (!engineerMobile.trim()) {
      newErrors.engineer_mobile = 'Engineer Mobile is required';
    } else if (!/^[0-9]{10}$/.test(engineerMobile.trim())) {
      newErrors.engineer_mobile = 'Mobile number must be exactly 10 digits';
    }

    if (!engineerDesignation.trim()) newErrors.engineer_designation = 'Engineer Designation is required';
    if (!agencyName.trim()) newErrors.agency_name = 'Agency Name is required';
    if (!handoverStatus.trim()) newErrors.handover_status = 'Handover Status is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // -------------------------------------------------------------
  // Submissions Query & Mutation
  // -------------------------------------------------------------
  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery<{
    success: boolean;
    count: number;
    submissions: Admin2SubmissionRecord[];
  }>({
    queryKey: ['/api/admin2/submissions'],
    queryFn: async () => {
      const res = await fetch('/api/admin2/submissions');
      if (!res.ok) throw new Error('Failed to load submissions');
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/admin2/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit form');
      }
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: '✅ Submission Successful',
        description: `Scheme handover record for "${data.submission.scheme_name}" has been saved. A confirmation email has been dispatched to the registered email with CCs.`,
      });
      // Invalidate queries to refresh persisted records table
      queryClient.invalidateQueries({ queryKey: ['/api/admin2/submissions'] });
      // Reset form fields
      handleResetForm();
    },
    onError: (err: any) => {
      toast({
        title: 'Submission Error',
        description: err.message || 'An error occurred while saving the submission.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Every field is required. Please check and correct the highlighted fields.',
        variant: 'destructive',
      });
      return;
    }

    submitMutation.mutate({
      region: selectedRegion.trim(),
      circle: selectedCircle.trim(),
      division: selectedDivision.trim(),
      sub_division: selectedSubDivision.trim() || 'General',
      block: selectedBlock.trim() || 'General',
      scheme_name: selectedSchemeName.trim(),
      scheme_id: schemeId.trim(),
      engineer_name: engineerName.trim(),
      engineer_email: engineerEmail.trim().toLowerCase(),
      engineer_mobile: engineerMobile.trim(),
      engineer_designation: engineerDesignation.trim(),
      agency_name: agencyName,
      handover_status: handoverStatus,
    });
  };

  // -------------------------------------------------------------
  // Filtered Submissions Table Data
  // -------------------------------------------------------------
  const submissionsList = submissionsData?.submissions || [];
  const filteredSubmissions = submissionsList.filter((item) => {
    const term = submissionSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      item.scheme_name?.toLowerCase().includes(term) ||
      item.scheme_id?.toLowerCase().includes(term) ||
      item.region?.toLowerCase().includes(term) ||
      item.circle?.toLowerCase().includes(term) ||
      item.division?.toLowerCase().includes(term) ||
      item.block?.toLowerCase().includes(term) ||
      item.engineer_name?.toLowerCase().includes(term) ||
      item.agency_name?.toLowerCase().includes(term) ||
      item.handover_status?.toLowerCase().includes(term)
    );
  });

  // Export Submissions to Excel
  const handleExportExcel = () => {
    if (submissionsList.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'There are no submitted records to export.',
        variant: 'destructive',
      });
      return;
    }

    const exportRows = submissionsList.map((item, index) => ({
      'Sr. No.': index + 1,
      'Region': item.region,
      'Circle': item.circle,
      'Division': item.division,
      'Sub-Division': item.sub_division,
      'Block': item.block,
      'Scheme Name': item.scheme_name,
      'Scheme ID': item.scheme_id,
      'Engineer Name': item.engineer_name,
      'Engineer Email': item.engineer_email,
      'Engineer Mobile': item.engineer_mobile,
      'Engineer Designation': item.engineer_designation,
      'Agency Name': item.agency_name,
      'Handover Status': item.handover_status,
      'Submitted By': item.creator_username || 'Admin2',
      'Submission Timestamp': new Date(item.created_at).toLocaleString('en-IN'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Admin2_Submissions');
    XLSX.writeFile(workbook, `Admin2_Scheme_Handover_Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`);

    toast({
      title: 'Excel Export Completed',
      description: `Exported ${exportRows.length} records to Excel successfully.`,
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/admin');
    } catch (err) {
      console.error('Logout error:', err);
      setLocation('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-sm px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/jal-jeevan-mission-logo.png"
              alt="Jal Jeevan Mission"
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm"
              onError={(e) => {
                // Fallback text if logo file is loading
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="border-l border-slate-300 dark:border-slate-700 pl-3">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-blue-900 dark:text-blue-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  MVS Owner Form
                </h1>
                {/* <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 font-mono text-[11px] font-semibold">
                  Handover Entry
                </Badge> */}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Jal Jeevan Mission Maharashtra
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {user?.name || user?.username || 'Admin2 User'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Role: {role || 'admin2'}
              </span> */}
            {/* </div> */}

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-8 px-3 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/50 flex items-center gap-1.5 font-medium transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-8 space-y-8">
        {/* Intro Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-700 text-white rounded-2xl p-6 sm:p-8 shadow-lg shadow-blue-500/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 pointer-events-none transform skew-x-12"></div>
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-semibold text-blue-100 tracking-wide uppercase">

            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              JJM SWSM MVS Scheme owner details
            </h2>
            {/* <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Select the cascading administrative location to identify the scheme, enter the designated field engineer
              credentials, select the implementing agency, and declare the scheme handover status.
            </p> */}
          </div>
        </div>

        {/* Dedicated Entry Form Card */}
        <Card className="border border-slate-200/90 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    Scheme owner Information Form
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    All fields marked with <span className="text-rose-500 font-semibold">*</span> are mandatory and strictly validated.
                  </CardDescription>
                </div>
              </div>

              {/* <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Auto Scheme ID Mapping
                </Badge>
              </div> */}
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-8">
            <form onSubmit={handleSubmit} id="admin2-handover-form" className="space-y-8">
              {/* SECTION A: LOCATION & SCHEME DETAILS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm">
                    1
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Location and Scheme Details
                  </h3>
                  <span className="text-[11px] text-slate-400 font-normal ml-auto">
                    Cascading Dropdown Hierarchy
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* 1. Region */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dropdown-region" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>1. Region <span className="text-rose-500">*</span></span>
                      {isLoadingRegions && <span className="text-[10px] text-blue-500 animate-pulse">Loading...</span>}
                    </Label>
                    <select
                      id="dropdown-region"
                      value={selectedRegion}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      className={`w-full h-10 rounded-lg border bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 font-medium transition-all ${errors.region ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      <option value="">-- Select Region --</option>
                      {regionsList.map((reg) => (
                        <option key={reg} value={reg}>
                          {reg}
                        </option>
                      ))}
                    </select>
                    {errors.region && <p className="text-[11px] text-rose-500">{errors.region}</p>}
                  </div>

                  {/* 2. Circle */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dropdown-circle" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>2. Circle <span className="text-rose-500">*</span></span>
                      {isLoadingCircles && <span className="text-[10px] text-blue-500 animate-pulse">Loading...</span>}
                    </Label>
                    <select
                      id="dropdown-circle"
                      value={selectedCircle}
                      onChange={(e) => handleCircleChange(e.target.value)}
                      disabled={!selectedRegion || isLoadingCircles}
                      className={`w-full h-10 rounded-lg border bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 font-medium transition-all disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed ${errors.circle ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      <option value="">
                        {!selectedRegion ? '-- Select Region First --' : '-- Select Circle --'}
                      </option>
                      {circlesList.map((circ) => (
                        <option key={circ} value={circ}>
                          {circ}
                        </option>
                      ))}
                    </select>
                    {errors.circle && <p className="text-[11px] text-rose-500">{errors.circle}</p>}
                  </div>

                  {/* 3. Division */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dropdown-division" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>3. Division <span className="text-rose-500">*</span></span>
                      {isLoadingDivisions && <span className="text-[10px] text-blue-500 animate-pulse">Loading...</span>}
                    </Label>
                    <select
                      id="dropdown-division"
                      value={selectedDivision}
                      onChange={(e) => handleDivisionChange(e.target.value)}
                      disabled={!selectedCircle || isLoadingDivisions}
                      className={`w-full h-10 rounded-lg border bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 font-medium transition-all disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed ${errors.division ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      <option value="">
                        {!selectedCircle ? '-- Select Circle First --' : '-- Select Division --'}
                      </option>
                      {divisionsList.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                    </select>
                    {errors.division && <p className="text-[11px] text-rose-500">{errors.division}</p>}
                  </div>

                  {/* 4. Sub-Division */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dropdown-sub-division" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>4. Sub-Division {subDivisionsList.length > 0 && <span className="text-rose-500">*</span>}</span>
                      {isLoadingSubDivisions && <span className="text-[10px] text-blue-500 animate-pulse">Loading...</span>}
                    </Label>
                    <select
                      id="dropdown-sub-division"
                      value={selectedSubDivision}
                      onChange={(e) => handleSubDivisionChange(e.target.value)}
                      disabled={!selectedDivision || isLoadingSubDivisions || subDivisionsList.length === 0}
                      className={`w-full h-10 rounded-lg border bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 font-medium transition-all disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed ${errors.sub_division ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      <option value="">
                        {!selectedDivision
                          ? '-- Select Division First --'
                          : subDivisionsList.length === 0
                            ? '-- Not Applicable / None --'
                            : '-- Select Sub-Division --'}
                      </option>
                      {subDivisionsList.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                    {errors.sub_division && <p className="text-[11px] text-rose-500">{errors.sub_division}</p>}
                  </div>

                  {/* 5. Block */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dropdown-block" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>5. Block {blocksList.length > 0 && <span className="text-rose-500">*</span>}</span>
                      {isLoadingBlocks && <span className="text-[10px] text-blue-500 animate-pulse">Loading...</span>}
                    </Label>
                    <select
                      id="dropdown-block"
                      value={selectedBlock}
                      onChange={(e) => handleBlockChange(e.target.value)}
                      disabled={
                        !selectedDivision ||
                        (subDivisionsList.length > 0 && !selectedSubDivision) ||
                        isLoadingBlocks ||
                        blocksList.length === 0
                      }
                      className={`w-full h-10 rounded-lg border bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 font-medium transition-all disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed ${errors.block ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      <option value="">
                        {!selectedDivision
                          ? '-- Select Division First --'
                          : subDivisionsList.length > 0 && !selectedSubDivision
                            ? '-- Select Sub-Division First --'
                            : blocksList.length === 0
                              ? '-- Not Applicable / None --'
                              : '-- Select Block --'}
                      </option>
                      {blocksList.map((blk) => (
                        <option key={blk} value={blk}>
                          {blk}
                        </option>
                      ))}
                    </select>
                    {errors.block && <p className="text-[11px] text-rose-500">{errors.block}</p>}
                  </div>

                  {/* 6. Scheme Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dropdown-scheme-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>6. Scheme Name <span className="text-rose-500">*</span></span>
                      {isLoadingSchemes && <span className="text-[10px] text-blue-500 animate-pulse">Loading...</span>}
                    </Label>
                    <select
                      id="dropdown-scheme-name"
                      value={selectedSchemeName}
                      onChange={(e) => handleSchemeChange(e.target.value)}
                      disabled={
                        !selectedDivision ||
                        (subDivisionsList.length > 0 && !selectedSubDivision) ||
                        (blocksList.length > 0 && !selectedBlock) ||
                        isLoadingSchemes
                      }
                      className={`w-full h-10 rounded-lg border bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 font-medium transition-all disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed ${errors.scheme_name ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      <option value="">
                        {!selectedDivision
                          ? '-- Select Division First --'
                          : subDivisionsList.length > 0 && !selectedSubDivision
                            ? '-- Select Sub-Division First --'
                            : blocksList.length > 0 && !selectedBlock
                              ? '-- Select Block First --'
                              : '-- Select Scheme Name --'}
                      </option>
                      {schemesList.map((sch) => (
                        <option key={sch.scheme_name} value={sch.scheme_name}>
                          {sch.scheme_name}
                        </option>
                      ))}
                    </select>
                    {errors.scheme_name && <p className="text-[11px] text-rose-500">{errors.scheme_name}</p>}
                  </div>
                </div>

                {/* 7. Scheme ID (Auto-populated & Read-only) */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="max-w-md space-y-1.5">
                    <Label htmlFor="input-scheme-id" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>7. Scheme ID (Auto-populated, Read-only) <span className="text-rose-500">*</span></span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="input-scheme-id"
                        value={schemeId}
                        readOnly

                        className="h-10 text-xs font-mono font-bold bg-slate-100/90 dark:bg-slate-800/90 text-blue-700 dark:text-blue-300 border-slate-300 dark:border-slate-700 cursor-not-allowed pr-10"
                      />
                      <div className="absolute right-3 top-3 text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                    </div>
                    {errors.scheme_id && <p className="text-[11px] text-rose-500">{errors.scheme_id}</p>}
                    {/* <p className="text-[11px] text-slate-400">
                      This ID is directly fetched from the official water scheme master records.
                    </p> */}
                  </div>
                </div>
              </div>

              {/* SECTION B: ENGINEER DETAILS */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-sm">
                    2
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600" />
                    Engineer Details
                  </h3>
                  {/* <span className="text-[11px] text-slate-400 font-normal ml-auto">
                    Field In-Charge Credentials
                  </span> */}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Engineer Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="input-engineer-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Engineer Name <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        id="input-engineer-name"
                        placeholder="e.g., Rajesh Sharma"
                        value={engineerName}
                        onChange={(e) => {
                          setEngineerName(e.target.value);
                          if (errors.engineer_name) setErrors((prev) => ({ ...prev, engineer_name: '' }));
                        }}
                        className={`h-10 text-xs pl-9 ${errors.engineer_name ? 'border-rose-500 ring-1 ring-rose-500' : ''
                          }`}
                      />
                    </div>
                    {errors.engineer_name && <p className="text-[11px] text-rose-500">{errors.engineer_name}</p>}
                  </div>

                  {/* Engineer Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="input-engineer-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Engineer Email <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        id="input-engineer-email"
                        type="email"
                        placeholder="e.g., engineer@mjp.gov.in"
                        value={engineerEmail}
                        onChange={(e) => {
                          setEngineerEmail(e.target.value);
                          if (errors.engineer_email) setErrors((prev) => ({ ...prev, engineer_email: '' }));
                        }}
                        className={`h-10 text-xs pl-9 ${errors.engineer_email ? 'border-rose-500 ring-1 ring-rose-500' : ''
                          }`}
                      />
                    </div>
                    {errors.engineer_email && <p className="text-[11px] text-rose-500">{errors.engineer_email}</p>}
                  </div>

                  {/* Engineer Mobile */}
                  <div className="space-y-1.5">
                    <Label htmlFor="input-engineer-mobile" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Engineer Mobile Number <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        id="input-engineer-mobile"
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={engineerMobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          setEngineerMobile(val);
                          if (errors.engineer_mobile) setErrors((prev) => ({ ...prev, engineer_mobile: '' }));
                        }}
                        className={`h-10 text-xs pl-9 ${errors.engineer_mobile ? 'border-rose-500 ring-1 ring-rose-500' : ''
                          }`}
                      />
                    </div>
                    {errors.engineer_mobile && <p className="text-[11px] text-rose-500">{errors.engineer_mobile}</p>}
                  </div>

                  {/* Engineer Designation (User enters free text) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="input-engineer-designation" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Engineer Designation <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        id="input-engineer-designation"
                        placeholder="Enter designation (e.g., Executive Engineer)"
                        value={engineerDesignation}
                        onChange={(e) => {
                          setEngineerDesignation(e.target.value);
                          if (errors.engineer_designation) setErrors((prev) => ({ ...prev, engineer_designation: '' }));
                        }}
                        className={`h-10 text-xs pl-9 ${errors.engineer_designation ? 'border-rose-500 ring-1 ring-rose-500' : ''
                          }`}
                      />
                    </div>
                    {errors.engineer_designation && <p className="text-[11px] text-rose-500">{errors.engineer_designation}</p>}
                  </div>
                </div>
              </div>

              {/* SECTION C & D: AGENCY DETAILS & HANDOVER STATUS */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-sm">
                    3
                  </span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Agency & Handover Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
                  {/* Agency Name Dropdown */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dropdown-agency-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Agency Name <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      id="dropdown-agency-name"
                      value={agencyName}
                      onChange={(e) => {
                        setAgencyName(e.target.value);
                        if (errors.agency_name) setErrors((prev) => ({ ...prev, agency_name: '' }));
                      }}
                      className={`w-full h-10 rounded-lg border bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 font-medium transition-all ${errors.agency_name ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      <option value="">-- Select Agency Name --</option>
                      {AGENCY_OPTIONS.map((agency) => (
                        <option key={agency} value={agency}>
                          {agency}
                        </option>
                      ))}
                    </select>
                    {errors.agency_name && <p className="text-[11px] text-rose-500">{errors.agency_name}</p>}
                    {/* <p className="text-[11px] text-slate-400">
                      Implementing agency responsible for operation & maintenance.
                    </p> */}
                  </div>

                  {/* Handover Status Dropdown */}
                  <div className="space-y-1.5">
                    <Label htmlFor="dropdown-handover-status" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Handover Status <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      id="dropdown-handover-status"
                      value={handoverStatus}
                      onChange={(e) => {
                        setHandoverStatus(e.target.value);
                        if (errors.handover_status) setErrors((prev) => ({ ...prev, handover_status: '' }));
                      }}
                      className={`w-full h-10 rounded-lg border bg-white px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-slate-100 font-medium transition-all ${errors.handover_status ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      <option value="">-- Select Handover Status --</option>
                      {HANDOVER_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    {errors.handover_status && <p className="text-[11px] text-rose-500">{errors.handover_status}</p>}
                    {/* <p className="text-[11px] text-slate-400">
                      Current legal and operational handover milestone.
                    </p> */}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetForm}
                  disabled={submitMutation.isPending}
                  className="w-full sm:w-auto h-11 px-6 text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>Reset Form</span>
                </Button>

                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="w-full sm:w-auto h-11 px-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {submitMutation.isPending ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Submitting to Database...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Scheme Details</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Persisted Submissions Table Card */}
        <Card className="border border-slate-200/90 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 p-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Recent Submissions History
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 ml-2 font-mono">
                    {submissionsList.length} Total Records
                  </Badge>
                </CardTitle>
                {/* <CardDescription className="text-xs text-slate-500 mt-1">
                  Persisted records stored in the dedicated <code className="font-mono text-blue-600">admin2_submissions</code> database table.
                </CardDescription> */}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search by scheme, engineer, agency..."
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                    className="h-8 text-xs pl-8 bg-white dark:bg-slate-950"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="h-8 px-3 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/60">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300">Scheme Info</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hierarchy</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300">Engineer Details</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300">Agency</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300">Handover Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300">Submitted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSubmissions ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-xs text-slate-400">
                        <RotateCcw className="w-5 h-5 mx-auto animate-spin mb-2 text-blue-500" />
                        Loading submitted records from database...
                      </TableCell>
                    </TableRow>
                  ) : filteredSubmissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-xs text-slate-400">
                        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                        {submissionSearch ? 'No submissions match your search.' : 'No submissions found in the database yet. Fill out the form above to record the first submission.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubmissions.map((row) => (
                      <TableRow key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <TableCell className="py-3">
                          <div className="font-semibold text-xs text-slate-900 dark:text-white">
                            {row.scheme_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-400">ID:</span>
                            <code className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                              {row.scheme_id}
                            </code>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 text-xs">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {row.region} &bull; {row.circle}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {row.division} &bull; {row.sub_division} &bull; {row.block}
                          </div>
                        </TableCell>

                        <TableCell className="py-3 text-xs">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {row.engineer_name}
                          </div>
                          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                            {row.engineer_designation}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                            <span>{row.engineer_email}</span>
                            <span>&bull;</span>
                            <span>{row.engineer_mobile}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 font-semibold text-[11px]">
                            {row.agency_name}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge
                            className={
                              row.handover_status === 'Handed Over'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold'
                                : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-xs font-semibold'
                            }
                          >
                            {row.handover_status === 'Handed Over' ? (
                              <CheckCircle2 className="w-3 h-3 mr-1 inline text-emerald-600" />
                            ) : (
                              <Clock className="w-3 h-3 mr-1 inline text-amber-600" />
                            )}
                            {row.handover_status}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 text-[11px] text-slate-500 font-mono">
                          <div>{new Date(row.created_at).toLocaleDateString('en-IN')}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(row.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {row.creator_username && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              by: {row.creator_username}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
