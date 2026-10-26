import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Search,
  ChevronDown,
  Check,
  Edit3,
  LogOut,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// -------------------------------------------------------------
// Interfaces
// -------------------------------------------------------------
export interface SchemeOperatorRecord {
  id: number;
  region: string;
  circle?: string;
  division?: string;
  sub_division?: string;
  block?: string;
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  reservoir_name?: string;
  operated_by: string;
  operator_name: string;
  operator_email?: string;
  operator_number: string;
  ee_name: string;
  ee_email: string;
  ee_number: string;
  chief_se_name: string;
  chief_se_number: string;
  created_at?: string;
  updated_at?: string;
}

interface SchemeOption {
  scheme_name: string;
  scheme_id: string;
}

// -------------------------------------------------------------
// Searchable Combobox Component (Matching Screenshot)
// -------------------------------------------------------------
interface SearchableDropdownProps {
  label: string;
  required?: boolean;
  placeholder: string;
  options: string[] | { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

function SearchableDropdown({
  label,
  required = true,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  loading = false,
  emptyMessage = 'No options found',
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize options to { label, value }
  const normalizedOptions = useMemo(() => {
    return options.map((opt) =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt
    );
  }, [options]);

  // Filtered options based on user typing
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(term)
    );
  }, [normalizedOptions, searchTerm]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="block text-sm font-semibold text-slate-800 mb-1.5">
        {label} {required && <span className="text-red-500 font-bold">*</span>}
      </label>

      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setSearchTerm('');
          }
        }}
        className={`flex items-center justify-between w-full h-11 px-3.5 bg-white border rounded-lg shadow-xs cursor-pointer transition-all ${
          disabled
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-100'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          {isOpen ? (
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent border-none outline-none text-sm text-slate-800 placeholder-slate-400"
            />
          ) : (
            <span
              className={`text-sm truncate ${
                selectedOption ? 'text-slate-900 font-medium' : 'text-slate-400'
              }`}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl py-1 text-sm">
          {loading ? (
            <div className="px-4 py-3 text-center text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span>Loading...</span>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-center text-slate-400">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Main Admin2FormPage Component
// -------------------------------------------------------------
export default function Admin2FormPage() {
  const { user, role, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Selection states
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedScheme, setSelectedScheme] = useState<string>('');

  // Editable records state for the selected scheme
  const [records, setRecords] = useState<SchemeOperatorRecord[]>([]);
  // Original untouched records to track dirty state
  const [originalRecords, setOriginalRecords] = useState<SchemeOperatorRecord[]>([]);
  // Active editing cells tracker (cell key = `${id}-${field}`)
  // Edit is only available after clicking on the EDIT button
  const [editingCells, setEditingCells] = useState<Record<string, boolean>>({});

  const isCellEditing = (id: number, field: string): boolean => {
    return Boolean(editingCells[`${id}-${field}`]);
  };

  const toggleCellEdit = (id: number, field: string) => {
    const key = `${id}-${field}`;
    setEditingCells((prev) => {
      const willEdit = !prev[key];
      if (willEdit) {
        setTimeout(() => {
          const inputEl = document.getElementById(key);
          if (inputEl) {
            inputEl.focus();
            if ('select' in inputEl && typeof inputEl.select === 'function') {
              inputEl.select();
            }
          }
        }, 50);
      }
      return { ...prev, [key]: willEdit };
    });
  };

  // -------------------------------------------------------------
  // 1. Fetch Regions
  // -------------------------------------------------------------
  const { data: regionsData, isLoading: isLoadingRegions } = useQuery<{
    success: boolean;
    regions: string[];
  }>({
    queryKey: ['/api/admin2/operator-details/regions'],
    queryFn: async () => {
      const res = await fetch('/api/admin2/operator-details/regions');
      if (!res.ok) throw new Error('Failed to load regions');
      return res.json();
    },
  });
  const regionsList = regionsData?.regions || [];

  // -------------------------------------------------------------
  // 2. Fetch Schemes for Selected Region
  // -------------------------------------------------------------
  const { data: schemesData, isLoading: isLoadingSchemes } = useQuery<{
    success: boolean;
    schemes: SchemeOption[];
  }>({
    queryKey: ['/api/admin2/operator-details/schemes', selectedRegion],
    queryFn: async () => {
      if (!selectedRegion) return { success: true, schemes: [] };
      const res = await fetch(
        `/api/admin2/operator-details/schemes?region=${encodeURIComponent(
          selectedRegion
        )}`
      );
      if (!res.ok) throw new Error('Failed to load schemes');
      return res.json();
    },
    enabled: Boolean(selectedRegion),
  });
  const schemesList = schemesData?.schemes || [];

  // -------------------------------------------------------------
  // 3. Fetch Village Operator Records for Selected Region & Scheme
  // -------------------------------------------------------------
  const {
    data: recordsData,
    isLoading: isLoadingRecords,
    refetch: refetchRecords,
  } = useQuery<{
    success: boolean;
    records: SchemeOperatorRecord[];
  }>({
    queryKey: [
      '/api/admin2/operator-details/records',
      selectedRegion,
      selectedScheme,
    ],
    queryFn: async () => {
      if (!selectedRegion || !selectedScheme)
        return { success: true, records: [] };
      const res = await fetch(
        `/api/admin2/operator-details/records?region=${encodeURIComponent(
          selectedRegion
        )}&scheme_name=${encodeURIComponent(selectedScheme)}`
      );
      if (!res.ok) throw new Error('Failed to load operator records');
      return res.json();
    },
    enabled: Boolean(selectedRegion && selectedScheme),
  });

  // Sync loaded records into local editable state
  useEffect(() => {
    if (recordsData?.records) {
      setRecords(recordsData.records);
      setOriginalRecords(JSON.parse(JSON.stringify(recordsData.records)));
    } else {
      setRecords([]);
      setOriginalRecords([]);
    }
  }, [recordsData]);

  // Handle Region Change
  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    setSelectedScheme('');
    setRecords([]);
    setOriginalRecords([]);
    setEditingCells({});
  };

  // Handle Scheme Change
  const handleSchemeChange = (newScheme: string) => {
    setSelectedScheme(newScheme);
    setEditingCells({});
  };

  // Update cell field in records state
  const handleCellChange = (
    id: number,
    field: keyof SchemeOperatorRecord,
    value: string
  ) => {
    setRecords((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // Determine if a cell has unsaved modifications
  const isFieldModified = (id: number, field: keyof SchemeOperatorRecord): boolean => {
    const current = records.find((r) => r.id === id);
    const original = originalRecords.find((r) => r.id === id);
    if (!current || !original) return false;
    return (current[field] || '') !== (original[field] || '');
  };

  // Has any unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (records.length !== originalRecords.length) return true;
    return JSON.stringify(records) !== JSON.stringify(originalRecords);
  }, [records, originalRecords]);

  // -------------------------------------------------------------
  // Save Records Mutation
  // -------------------------------------------------------------
  const saveMutation = useMutation({
    mutationFn: async (updatedRecords: SchemeOperatorRecord[]) => {
      const res = await fetch('/api/admin2/operator-details/records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: updatedRecords }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save operator details');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Changes Saved Successfully',
        description:
          data.message ||
          'Scheme operator details have been updated in scheme_operator_details.',
      });
      setOriginalRecords(JSON.parse(JSON.stringify(records)));
      setEditingCells({});
      refetchRecords();
    },
    onError: (err: any) => {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save operator details',
        variant: 'destructive',
      });
    },
  });

  const handleSaveInfo = () => {
    if (!selectedRegion || !selectedScheme) {
      toast({
        title: 'Selection Required',
        description: 'Please select both Region and Scheme before saving.',
        variant: 'destructive',
      });
      return;
    }
    if (records.length === 0) {
      toast({
        title: 'No Records',
        description: 'No village operator records to save.',
        variant: 'destructive',
      });
      return;
    }
    saveMutation.mutate(records);
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/jal-jeevan-mission-logo.png"
              alt="Jal Jeevan Mission"
              className="h-10 sm:h-11 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="border-l border-slate-200 pl-3">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Admin Portal - Scheme Operator Management
                </h1>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Jal Jeevan Mission Maharashtra • Scheme Operator Details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-8 px-3 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 flex items-center gap-1.5 font-medium transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1420px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Filter and Action Card (Matches Screenshot) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
            {/* Region Select */}
            <div className="md:col-span-5">
              <SearchableDropdown
                label="Region"
                required={true}
                placeholder="Search and select region..."
                options={regionsList}
                value={selectedRegion}
                onChange={handleRegionChange}
                loading={isLoadingRegions}
              />
            </div>

            {/* Scheme Select */}
            <div className="md:col-span-5">
              <SearchableDropdown
                label="Scheme"
                required={true}
                placeholder="Search and select scheme..."
                options={schemesList.map((s) => ({
                  label: s.scheme_name,
                  value: s.scheme_name,
                }))}
                value={selectedScheme}
                onChange={handleSchemeChange}
                disabled={!selectedRegion}
                loading={isLoadingSchemes}
                emptyMessage={
                  selectedRegion
                    ? 'No schemes found in operator details'
                    : 'Select region first'
                }
              />
            </div>

            {/* Save Info Button */}
            <div className="md:col-span-2">
              <Button
                onClick={handleSaveInfo}
                disabled={saveMutation.isPending || !selectedRegion || !selectedScheme}
                className="w-full h-11 bg-[#0052cc] hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Info</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Unsaved changes notification badge */}
          {hasUnsavedChanges && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 bg-amber-50/60 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You have unsaved edits in the table below. Click "Save Info" to store them in scheme_operator_details.</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRecords(JSON.parse(JSON.stringify(originalRecords)))}
                className="h-6 px-2 text-xs text-amber-800 hover:bg-amber-100"
              >
                Discard Edits
              </Button>
            </div>
          )}
        </div>

        {/* Table Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {isLoadingRecords ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Loading village operator details...</p>
            </div>
          ) : !selectedRegion || !selectedScheme ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2.5 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-700">No Scheme Selected</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md">
                Please search and select a <strong>Region</strong> and <strong>Scheme</strong> above to view and edit its operator details.
              </p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2.5 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-700">No Records Found</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md">
                No village records were found in <code>scheme_operator_details</code> for <strong>"{selectedScheme}"</strong>.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                {/* Table Header: Light Mint Green (#E6F4EA) matching user mockup */}
                <thead>
                  <tr className="bg-[#E6F4EA] border-b border-[#cce8d4] text-[#1e4620] text-xs font-semibold tracking-wide">
                    <th className="py-3.5 px-3 text-center whitespace-nowrap min-w-[50px] border-r border-[#d4edda]">
                      Sr. No.
                    </th>
                    <th className="py-3.5 px-3 whitespace-nowrap min-w-[130px] border-r border-[#d4edda]">
                      Village Name
                    </th>
                    <th className="py-3.5 px-3 whitespace-nowrap min-w-[120px] border-r border-[#d4edda]">
                      Operated By
                    </th>
                    <th className="py-3.5 px-3 whitespace-nowrap min-w-[170px] border-r border-[#d4edda]">
                      Operator Name
                    </th>
                    <th className="py-3.5 px-3 whitespace-nowrap min-w-[150px] border-r border-[#d4edda]">
                      Mobile No.
                    </th>
                    <th className="py-3.5 px-3 whitespace-nowrap min-w-[170px] border-r border-[#d4edda]">
                      Executive Engg.
                    </th>
                    {/* User requirement: also add email option besides Executive Engg */}
                    <th className="py-3.5 px-3 whitespace-nowrap min-w-[210px] border-r border-[#d4edda] bg-[#ddf0e2]">
                      Executive Engg. Email
                    </th>
                    <th className="py-3.5 px-3 whitespace-nowrap min-w-[150px] border-r border-[#d4edda]">
                      Mobile No.
                    </th>
                    <th className="py-3.5 px-3 whitespace-nowrap min-w-[170px] border-r border-[#d4edda]">
                      Chief Engg/SE ZP
                    </th>
                    <th className="py-3.5 px-3 whitespace-nowrap min-w-[150px]">
                      Mobile No.
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {records.map((row, index) => {
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* 1. Sr. No. */}
                        <td className="py-3 px-3 text-center font-medium text-slate-500 whitespace-nowrap border-r border-slate-100">
                          {index + 1}
                        </td>

                        {/* 2. Village Name */}
                        <td className="py-3 px-3 border-r border-slate-100">
                          <input
                            type="text"
                            value={row.village_name || ''}
                            readOnly
                            className="w-full bg-[#f8fafc] border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 font-medium cursor-default outline-none shadow-2xs"
                          />
                        </td>

                        {/* 3. Operated By (e.g. MJP) + Orange EDIT Button */}
                        <td className="py-3 px-3 border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`${row.id}-operated_by`}
                              type="text"
                              value={row.operated_by || ''}
                              readOnly={!isCellEditing(row.id, 'operated_by')}
                              onChange={(e) =>
                                handleCellChange(row.id, 'operated_by', e.target.value)
                              }
                              className={`w-full rounded-md px-2.5 py-1.5 text-xs outline-none transition-all shadow-2xs ${
                                isCellEditing(row.id, 'operated_by')
                                  ? 'bg-white border-2 border-blue-500 ring-2 ring-blue-100 text-slate-900 cursor-text'
                                  : 'bg-[#f8fafc] border border-slate-200 text-slate-700 cursor-not-allowed select-none'
                              } ${
                                isFieldModified(row.id, 'operated_by')
                                  ? 'border-amber-400 bg-amber-50/40'
                                  : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => toggleCellEdit(row.id, 'operated_by')}
                              className={`shrink-0 border active:scale-95 font-bold text-[11px] px-2 py-1 rounded transition-colors shadow-2xs cursor-pointer ${
                                isCellEditing(row.id, 'operated_by')
                                  ? 'bg-[#d97706] text-white border-[#b45309] hover:bg-[#b45309]'
                                  : 'bg-[#fff5ea] text-[#d97706] border-[#fbd38d] hover:bg-[#ffedd5]'
                              }`}
                              title={
                                isCellEditing(row.id, 'operated_by')
                                  ? 'Click to lock editing'
                                  : 'Click to edit Operated By'
                              }
                            >
                              {isCellEditing(row.id, 'operated_by') ? 'DONE' : 'EDIT'}
                            </button>
                          </div>
                        </td>

                        {/* 4. Operator Name + Blue EDIT Button */}
                        <td className="py-3 px-3 border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`${row.id}-operator_name`}
                              type="text"
                              value={row.operator_name || ''}
                              readOnly={!isCellEditing(row.id, 'operator_name')}
                              onChange={(e) =>
                                handleCellChange(row.id, 'operator_name', e.target.value)
                              }
                              className={`w-full rounded-md px-2.5 py-1.5 text-xs outline-none transition-all shadow-2xs ${
                                isCellEditing(row.id, 'operator_name')
                                  ? 'bg-white border-2 border-blue-500 ring-2 ring-blue-100 text-slate-900 cursor-text'
                                  : 'bg-[#f8fafc] border border-slate-200 text-slate-700 cursor-not-allowed select-none'
                              } ${
                                isFieldModified(row.id, 'operator_name')
                                  ? 'border-amber-400 bg-amber-50/40'
                                  : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => toggleCellEdit(row.id, 'operator_name')}
                              className={`shrink-0 border active:scale-95 font-bold text-[11px] px-2 py-1 rounded transition-colors shadow-2xs cursor-pointer ${
                                isCellEditing(row.id, 'operator_name')
                                  ? 'bg-[#1a73e8] text-white border-[#1557b0] hover:bg-[#1557b0]'
                                  : 'bg-[#ebf3ff] text-[#1a73e8] border-[#bfdbfe] hover:bg-[#dbeafe]'
                              }`}
                              title={
                                isCellEditing(row.id, 'operator_name')
                                  ? 'Click to lock editing'
                                  : 'Click to edit Operator Name'
                              }
                            >
                              {isCellEditing(row.id, 'operator_name') ? 'DONE' : 'EDIT'}
                            </button>
                          </div>
                        </td>

                        {/* 5. Operator Mobile No. + Orange EDIT Button */}
                        <td className="py-3 px-3 border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`${row.id}-operator_number`}
                              type="text"
                              value={row.operator_number || ''}
                              readOnly={!isCellEditing(row.id, 'operator_number')}
                              onChange={(e) =>
                                handleCellChange(row.id, 'operator_number', e.target.value)
                              }
                              className={`w-full rounded-md px-2.5 py-1.5 text-xs outline-none transition-all shadow-2xs ${
                                isCellEditing(row.id, 'operator_number')
                                  ? 'bg-white border-2 border-blue-500 ring-2 ring-blue-100 text-slate-900 cursor-text'
                                  : 'bg-[#f8fafc] border border-slate-200 text-slate-700 cursor-not-allowed select-none'
                              } ${
                                isFieldModified(row.id, 'operator_number')
                                  ? 'border-amber-400 bg-amber-50/40'
                                  : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => toggleCellEdit(row.id, 'operator_number')}
                              className={`shrink-0 border active:scale-95 font-bold text-[11px] px-2 py-1 rounded transition-colors shadow-2xs cursor-pointer ${
                                isCellEditing(row.id, 'operator_number')
                                  ? 'bg-[#d97706] text-white border-[#b45309] hover:bg-[#b45309]'
                                  : 'bg-[#fff5ea] text-[#d97706] border-[#fbd38d] hover:bg-[#ffedd5]'
                              }`}
                              title={
                                isCellEditing(row.id, 'operator_number')
                                  ? 'Click to lock editing'
                                  : 'Click to edit Operator Phone'
                              }
                            >
                              {isCellEditing(row.id, 'operator_number') ? 'DONE' : 'EDIT'}
                            </button>
                          </div>
                        </td>

                        {/* 6. Executive Engg. + Blue EDIT Button */}
                        <td className="py-3 px-3 border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`${row.id}-ee_name`}
                              type="text"
                              value={row.ee_name || ''}
                              readOnly={!isCellEditing(row.id, 'ee_name')}
                              onChange={(e) =>
                                handleCellChange(row.id, 'ee_name', e.target.value)
                              }
                              className={`w-full rounded-md px-2.5 py-1.5 text-xs outline-none transition-all shadow-2xs ${
                                isCellEditing(row.id, 'ee_name')
                                  ? 'bg-white border-2 border-blue-500 ring-2 ring-blue-100 text-slate-900 cursor-text'
                                  : 'bg-[#f8fafc] border border-slate-200 text-slate-700 cursor-not-allowed select-none'
                              } ${
                                isFieldModified(row.id, 'ee_name')
                                  ? 'border-amber-400 bg-amber-50/40'
                                  : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => toggleCellEdit(row.id, 'ee_name')}
                              className={`shrink-0 border active:scale-95 font-bold text-[11px] px-2 py-1 rounded transition-colors shadow-2xs cursor-pointer ${
                                isCellEditing(row.id, 'ee_name')
                                  ? 'bg-[#1a73e8] text-white border-[#1557b0] hover:bg-[#1557b0]'
                                  : 'bg-[#ebf3ff] text-[#1a73e8] border-[#bfdbfe] hover:bg-[#dbeafe]'
                              }`}
                              title={
                                isCellEditing(row.id, 'ee_name')
                                  ? 'Click to lock editing'
                                  : 'Click to edit Executive Engineer'
                              }
                            >
                              {isCellEditing(row.id, 'ee_name') ? 'DONE' : 'EDIT'}
                            </button>
                          </div>
                        </td>

                        {/* 7. Executive Engg. Email (Added per user request) + Blue EDIT Button */}
                        <td className="py-3 px-3 border-r border-slate-100 bg-blue-50/20">
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`${row.id}-ee_email`}
                              type="email"
                              value={row.ee_email || ''}
                              readOnly={!isCellEditing(row.id, 'ee_email')}
                              placeholder="engineer@email.com"
                              onChange={(e) =>
                                handleCellChange(row.id, 'ee_email', e.target.value)
                              }
                              className={`w-full rounded-md px-2.5 py-1.5 text-xs outline-none transition-all shadow-2xs ${
                                isCellEditing(row.id, 'ee_email')
                                  ? 'bg-white border-2 border-blue-500 ring-2 ring-blue-100 text-slate-900 cursor-text'
                                  : 'bg-[#f8fafc] border border-slate-200 text-slate-700 cursor-not-allowed select-none'
                              } ${
                                isFieldModified(row.id, 'ee_email')
                                  ? 'border-amber-400 bg-amber-50/40'
                                  : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => toggleCellEdit(row.id, 'ee_email')}
                              className={`shrink-0 border active:scale-95 font-bold text-[11px] px-2 py-1 rounded transition-colors shadow-2xs cursor-pointer ${
                                isCellEditing(row.id, 'ee_email')
                                  ? 'bg-[#1a73e8] text-white border-[#1557b0] hover:bg-[#1557b0]'
                                  : 'bg-[#ebf3ff] text-[#1a73e8] border-[#bfdbfe] hover:bg-[#dbeafe]'
                              }`}
                              title={
                                isCellEditing(row.id, 'ee_email')
                                  ? 'Click to lock editing'
                                  : 'Click to edit Executive Engineer Email'
                              }
                            >
                              {isCellEditing(row.id, 'ee_email') ? 'DONE' : 'EDIT'}
                            </button>
                          </div>
                        </td>

                        {/* 8. Executive Engg. Mobile No. + Orange EDIT Button */}
                        <td className="py-3 px-3 border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`${row.id}-ee_number`}
                              type="text"
                              value={row.ee_number || ''}
                              readOnly={!isCellEditing(row.id, 'ee_number')}
                              onChange={(e) =>
                                handleCellChange(row.id, 'ee_number', e.target.value)
                              }
                              className={`w-full rounded-md px-2.5 py-1.5 text-xs outline-none transition-all shadow-2xs ${
                                isCellEditing(row.id, 'ee_number')
                                  ? 'bg-white border-2 border-blue-500 ring-2 ring-blue-100 text-slate-900 cursor-text'
                                  : 'bg-[#f8fafc] border border-slate-200 text-slate-700 cursor-not-allowed select-none'
                              } ${
                                isFieldModified(row.id, 'ee_number')
                                  ? 'border-amber-400 bg-amber-50/40'
                                  : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => toggleCellEdit(row.id, 'ee_number')}
                              className={`shrink-0 border active:scale-95 font-bold text-[11px] px-2 py-1 rounded transition-colors shadow-2xs cursor-pointer ${
                                isCellEditing(row.id, 'ee_number')
                                  ? 'bg-[#d97706] text-white border-[#b45309] hover:bg-[#b45309]'
                                  : 'bg-[#fff5ea] text-[#d97706] border-[#fbd38d] hover:bg-[#ffedd5]'
                              }`}
                              title={
                                isCellEditing(row.id, 'ee_number')
                                  ? 'Click to lock editing'
                                  : 'Click to edit Executive Engineer Phone'
                              }
                            >
                              {isCellEditing(row.id, 'ee_number') ? 'DONE' : 'EDIT'}
                            </button>
                          </div>
                        </td>

                        {/* 9. Chief Engg/SE ZP + Blue EDIT Button */}
                        <td className="py-3 px-3 border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`${row.id}-chief_se_name`}
                              type="text"
                              value={row.chief_se_name || ''}
                              readOnly={!isCellEditing(row.id, 'chief_se_name')}
                              onChange={(e) =>
                                handleCellChange(row.id, 'chief_se_name', e.target.value)
                              }
                              className={`w-full rounded-md px-2.5 py-1.5 text-xs outline-none transition-all shadow-2xs ${
                                isCellEditing(row.id, 'chief_se_name')
                                  ? 'bg-white border-2 border-blue-500 ring-2 ring-blue-100 text-slate-900 cursor-text'
                                  : 'bg-[#f8fafc] border border-slate-200 text-slate-700 cursor-not-allowed select-none'
                              } ${
                                isFieldModified(row.id, 'chief_se_name')
                                  ? 'border-amber-400 bg-amber-50/40'
                                  : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => toggleCellEdit(row.id, 'chief_se_name')}
                              className={`shrink-0 border active:scale-95 font-bold text-[11px] px-2 py-1 rounded transition-colors shadow-2xs cursor-pointer ${
                                isCellEditing(row.id, 'chief_se_name')
                                  ? 'bg-[#1a73e8] text-white border-[#1557b0] hover:bg-[#1557b0]'
                                  : 'bg-[#ebf3ff] text-[#1a73e8] border-[#bfdbfe] hover:bg-[#dbeafe]'
                              }`}
                              title={
                                isCellEditing(row.id, 'chief_se_name')
                                  ? 'Click to lock editing'
                                  : 'Click to edit Chief Engineer / SE'
                              }
                            >
                              {isCellEditing(row.id, 'chief_se_name') ? 'DONE' : 'EDIT'}
                            </button>
                          </div>
                        </td>

                        {/* 10. Chief Engg Mobile No. + Orange EDIT Button */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              id={`${row.id}-chief_se_number`}
                              type="text"
                              value={row.chief_se_number || ''}
                              readOnly={!isCellEditing(row.id, 'chief_se_number')}
                              onChange={(e) =>
                                handleCellChange(row.id, 'chief_se_number', e.target.value)
                              }
                              className={`w-full rounded-md px-2.5 py-1.5 text-xs outline-none transition-all shadow-2xs ${
                                isCellEditing(row.id, 'chief_se_number')
                                  ? 'bg-white border-2 border-blue-500 ring-2 ring-blue-100 text-slate-900 cursor-text'
                                  : 'bg-[#f8fafc] border border-slate-200 text-slate-700 cursor-not-allowed select-none'
                              } ${
                                isFieldModified(row.id, 'chief_se_number')
                                  ? 'border-amber-400 bg-amber-50/40'
                                  : ''
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => toggleCellEdit(row.id, 'chief_se_number')}
                              className={`shrink-0 border active:scale-95 font-bold text-[11px] px-2 py-1 rounded transition-colors shadow-2xs cursor-pointer ${
                                isCellEditing(row.id, 'chief_se_number')
                                  ? 'bg-[#d97706] text-white border-[#b45309] hover:bg-[#b45309]'
                                  : 'bg-[#fff5ea] text-[#d97706] border-[#fbd38d] hover:bg-[#ffedd5]'
                              }`}
                              title={
                                isCellEditing(row.id, 'chief_se_number')
                                  ? 'Click to lock editing'
                                  : 'Click to edit Chief Engineer Phone'
                              }
                            >
                              {isCellEditing(row.id, 'chief_se_number') ? 'DONE' : 'EDIT'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer Summary & Actions */}
          {records.length > 0 && (
            <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">
                  Total Villages in Scheme:
                </span>
                <Badge variant="secondary" className="font-mono text-xs font-bold px-2 py-0.5">
                  {records.length}
                </Badge>
                {hasUnsavedChanges && (
                  <span className="text-amber-600 font-medium ml-2">
                    • Pending unsaved changes
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  onClick={handleSaveInfo}
                  disabled={saveMutation.isPending}
                  size="sm"
                  className="bg-[#0052cc] hover:bg-blue-700 text-white font-semibold text-xs px-4 h-8 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Info</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
