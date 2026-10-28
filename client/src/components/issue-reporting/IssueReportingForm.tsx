import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    ChevronRight,
    History,
    FileEdit,
    CheckCircle,
    Clock,
    Check,
    ChevronsUpDown,
    Search,
    FileWarning,
    FileSpreadsheet,
    Download,
    Wrench,
    Building2,
    X,
    Calendar,
} from "lucide-react";
import { exportIssueReportsToExcel, downloadAllIssueReportsBackend } from "@/lib/issue-reports-export";
import { IssueDetailsRemarksModal } from "@/components/issue-reporting/IssueDetailsRemarksModal";
import { getIstDateStr, formatReadableDate, evaluateIssueDeadline } from "@shared/issue-deadline-utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    useFormField,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";



// Agency Issue Options
const AGENCY_ISSUE_OPTIONS = [
    "Flow meter faulty or requires maintenance.",
    "Flow meter not transmitting data or communication failure.",
    "Residual chlorine sensor faulty or requires maintenance.",
    "Residual chlorine sensor not transmitting data or communication failure.",
    "Pressure sensor faulty or requires maintenance.",
    "Pressure sensor not transmitting data or communication failure.",
    "Residual chlorine sensor is offline or not transmitting data.",
    "Solar panel or battery is not supplying sufficient power.",
    "SIM card or network connectivity is unavailable.",
    "Sensor cable is damaged, disconnected, or stolen.",
    "Firmware or sensor integration requires an update.",
    "Meter or sensor installation is incomplete.",
    "Other",
] as const;

// Department Issue Options
const DEPARTMENT_ISSUE_OPTIONS = [
    "Electricity supply is disconnected due to pending bills.",
    "Pipeline leakage or damage requiring necessary repairs.",
    "Water availability is low due to reduced source water level.",
    "The scheme is operated by the Gram Panchayat or local authority.",
    "Scheme handover to the responsible authority is pending.",
    "The water supply scheme has not been fully commissioned.",
    "Scheme survey, ESR/GSR, or population records require correction.",
    "Departmental intervention is required to restore scheme operation.",
    "The site run and trial process is pending.",
    "Other",
] as const;

// Helper to strip Verified text, tick mark, and cross mark, leaving only the value
function cleanStatusValue(status: string | undefined): string {
    if (!status) return "";
    return status
        .replace(/\[VERIFIED\]\s*/gi, "")
        .replace(/(?:Not\s+)?Achieved:\s*/gi, "")
        .replace(/Sufficient\s*\(([^)]+)\)/gi, "$1")
        .replace(/Low Water\s*\(([^)]+)\)/gi, "$1")
        .replace(/^Status:\s*/gi, "")
        .replace(/[✅❌⚠️]/g, "")
        .trim();
}

// Validation schema
const issueFormSchema = z.object({
    problem_level: z.enum(["Scheme", "Village", "ESR"]),
    region: z.string().min(1, "Region is required"),
    scheme_id: z.string().min(1, "Scheme is required"),
    scheme_name: z.string().min(1, "Scheme name is required"),
    village_name: z.string().optional(),
    esr_name: z.string().optional(),
    status_value: z.string().min(1, "Status value is required"),
    reason: z.string().optional(),
    agency_issue_type: z.string().optional(),
    agency_issue_other: z.string().optional(),
    department_issue_type: z.string().optional(),
    department_issue_other: z.string().optional(),
    expected_resolution_date: z.string().optional(),
    sensor_type: z.string().optional(),
}).superRefine((data, ctx) => {
    // 1. Manual entry is required when Other is selected for Agency
    if (data.agency_issue_type === "Other") {
        if (!data.agency_issue_other || !data.agency_issue_other.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["agency_issue_other"],
                message: "Please describe the custom agency issue.",
            });
        }
    }

    // 2. Manual entry is required when Other is selected for Department
    if (data.department_issue_type === "Other") {
        if (!data.department_issue_other || !data.department_issue_other.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["department_issue_other"],
                message: "Please describe the custom department issue.",
            });
        }
    }

    // 3. User must select at least one issue option (Agency or Department)
    const hasAgency = !!data.agency_issue_type && data.agency_issue_type.trim().length > 0;
    const hasDept = !!data.department_issue_type && data.department_issue_type.trim().length > 0;
    if (!hasAgency && !hasDept) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["agency_issue_type"],
            message: "Please select at least one Agency or Department issue.",
        });
    }
});

type IssueFormValues = z.infer<typeof issueFormSchema>;

interface Scheme {
    scheme_id: string;
    scheme_name: string;
    region: string;
}

interface Village {
    village_name: string;
}

interface ESR {
    esr_name: string;
}

interface IssueReport {
    id: number;
    problem_level: string;
    region: string;
    scheme_id: string;
    scheme_name: string;
    village_name?: string;
    esr_name?: string;
    status_value: string;
    reason: string;
    agency_issue?: string;
    department_issue?: string;
    sensor_type?: string;
    status: "Active" | "Resolved";
    resolution_remark?: string;
    expected_resolution_date?: string | null;
    created_at: string;
    resolved_at?: string;
    creator_name?: string;
}

interface SearchableSelectProps {
    options: { value: string; label: string }[];
    value?: string;
    onChange: (value: string) => void;
    placeholder: string;
    isLoading?: boolean;
    isDisabled?: boolean;
    id?: string;
    name?: string;
}

const SearchableSelect = React.forwardRef<HTMLButtonElement, SearchableSelectProps & Omit<React.ComponentPropsWithoutRef<'button'>, 'onChange'>>(
    ({ options, value, onChange, placeholder, isLoading, isDisabled, id, name, ...htmlProps }, ref) => {
        const field = useFormField();
        const formItemId = field.formItemId || id;

        // Debug logging
        useEffect(() => {
            console.log(`[SearchableSelect] Mounted: ${name || formItemId}`, { value, optionsCount: options?.length });
        }, []);

        const [open, setOpen] = useState(false);
        const [search, setSearch] = useState("");
        const buttonRef = React.useRef<HTMLButtonElement>(null);

        // Forward external ref and internal ref
        React.useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement);

        if (!Array.isArray(options)) {
            console.error('[SearchableSelect] options is not an array:', options);
            return <div className="text-red-500">Error: Invalid options</div>;
        }

        const filtered = options.filter(opt => {
            if (!opt || typeof opt.value !== 'string' || typeof opt.label !== 'string') return false;
            if (!search) return true;
            const s = search.toLowerCase();
            return opt.label.toLowerCase().includes(s) || opt.value.toLowerCase().includes(s);
        });

        const displayLabel = value
            ? (options.find(o => o && o.value === value)?.label || placeholder)
            : placeholder;

        return (
            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        ref={buttonRef}
                        id={formItemId}
                        name={name}
                        {...htmlProps}
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between border-blue-200 bg-white hover:bg-blue-50/50"
                        disabled={isDisabled || isLoading}
                    >
                        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                            <Search className="h-3 w-3 text-neutral-400 shrink-0" />
                            <span className="truncate">{displayLabel}</span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            id={`${id || name || "search"}-input`}
                            name={`${name || id || "search"}-input`}
                            placeholder="Search..."
                            value={search}
                            onValueChange={setSearch}
                        />

                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-y-auto">
                                {filtered.map((opt) => (
                                    <CommandItem
                                        key={opt.value}
                                        value={opt.value}
                                        onSelect={() => {
                                            onChange(opt.value);
                                            setOpen(false);
                                            setSearch("");
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === opt.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {opt.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        );
    }
);

SearchableSelect.displayName = "SearchableSelect";

export default function IssueReportingForm() {
    const { toast } = useToast();
    const { user, isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("report");
    const [selectedRegion, setSelectedRegion] = useState<string>("All Regions");

    console.log("[IssueReportingForm] Rendering", { activeTab, selectedRegion });

    const form = useForm<IssueFormValues>({
        resolver: zodResolver(issueFormSchema),
        defaultValues: {
            problem_level: "Scheme",
            region: "",
            scheme_id: "",
            scheme_name: "",
            village_name: "",
            esr_name: "",
            status_value: "Pending",
            reason: "",
            agency_issue_type: "",
            agency_issue_other: "",
            department_issue_type: "",
            department_issue_other: "",
            expected_resolution_date: "",
        },
    });

    const watchLevel = form.watch("problem_level");
    const watchSchemeId = form.watch("scheme_id");
    const watchSchemeName = form.watch("scheme_name");
    const watchVillageName = form.watch("village_name");
    const watchEsrName = form.watch("esr_name");
    const watchAgencyType = form.watch("agency_issue_type");
    const watchDepartmentType = form.watch("department_issue_type");

    // Queries
    const { data: schemes, isLoading: isLoadingSchemes } = useQuery<Scheme[]>({
        queryKey: ["/api/issue-reporting/schemes"],
        queryFn: () => apiRequest("/api/issue-reporting/schemes"),
    });

    const { data: villages, isLoading: isLoadingVillages } = useQuery<Village[]>({
        queryKey: ["/api/issue-reporting/villages", watchSchemeId],
        queryFn: () => apiRequest(`/api/issue-reporting/villages/${encodeURIComponent(watchSchemeId || "")}`),
        enabled: !!watchSchemeId,
    });

    const { data: esrs, isLoading: isLoadingEsrs } = useQuery<ESR[]>({
        queryKey: ["/api/issue-reporting/esrs", watchSchemeId, watchVillageName, watchSchemeName],
        queryFn: () => {
            const params = new URLSearchParams();
            if (watchSchemeId) params.append("schemeId", watchSchemeId);
            if (watchVillageName) params.append("villageName", watchVillageName);
            if (watchSchemeName) params.append("schemeName", watchSchemeName);
            const url = `/api/issue-reporting/esrs?${params.toString()}`;
            console.log(`Fetching ESRs from: ${url}`);
            return apiRequest(url);
        },
        enabled: !!watchSchemeId && !!watchVillageName,
    });

    const { data: currentStatus, isFetching: isFetchingStatus } = useQuery<{ status: string; value: any; should_require_reason: boolean }>({
        queryKey: ["/api/issue-reporting/status", watchLevel, watchSchemeId, watchVillageName, watchEsrName],
        queryFn: () => {
            const params = new URLSearchParams({
                level: watchLevel,
                schemeId: watchSchemeId,
            });
            if (watchVillageName) params.append("villageName", watchVillageName);
            if (watchEsrName) params.append("esrName", watchEsrName);
            return apiRequest(`/api/issue-reporting/status?${params.toString()}`);
        },
        enabled: !!watchSchemeId && (watchLevel === "Scheme" || (watchLevel === "Village" && !!watchVillageName) || (watchLevel === "ESR" && !!watchEsrName)),
    });

    const { data: regions, isLoading: isLoadingRegions } = useQuery<{ region: string }[]>({
        queryKey: ["issue-reporting", "regions"],
        queryFn: () => apiRequest("/api/issue-reporting/regions"),
    });

    const { data: issuesList, isLoading: isLoadingIssues, refetch: refetchIssues, isFetching: isFetchingIssues } = useQuery<IssueReport[]>({
        queryKey: ["issue-reporting", "list", selectedRegion],
        queryFn: () => {
            console.log("[IssueReporting] Fetching issues list for region:", selectedRegion);
            const params = new URLSearchParams();
            if (selectedRegion && selectedRegion !== "All Regions") {
                params.append("region", selectedRegion);
            }
            return apiRequest(`/api/issue-reporting/list?${params.toString()}`);
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    useEffect(() => {
        if (issuesList) {
            console.log("[IssueReporting] issuesList updated:", issuesList.length, "items");
        }
    }, [issuesList]);

    // Download issues to Excel handler
    const handleDownloadExcel = async (exportAll: boolean = false) => {
        try {
            if (exportAll || (isAdmin && selectedRegion === "All Regions")) {
                downloadAllIssueReportsBackend(selectedRegion !== "All Regions" ? selectedRegion : undefined);
                toast({
                    title: "Downloading Excel",
                    description: "Preparing and downloading all issue reports...",
                });
                return;
            }

            if (issuesList && issuesList.length > 0) {
                exportIssueReportsToExcel(
                    issuesList,
                    selectedRegion && selectedRegion !== "All Regions"
                        ? `MJP_Issue_Reports_${selectedRegion.replace(/\s+/g, "_")}`
                        : "MJP_Issue_Reports"
                );
                toast({
                    title: "Excel Downloaded",
                    description: `Exported ${issuesList.length} issue report(s).`,
                });
            } else {
                toast({
                    title: "No Issues Found",
                    description: "There are no reported issues in this view to download.",
                    variant: "destructive"
                });
            }
        } catch (error: any) {
            console.error("Export error:", error);
            toast({
                title: "Export Failed",
                description: error?.message || "Failed to export issue reports.",
                variant: "destructive"
            });
        }
    };

    // Mutations
    const submitMutation = useMutation({
        mutationFn: (values: any) =>
            apiRequest("/api/issue-reporting/submit", {
                method: "POST",
                body: JSON.stringify(values),
            }),
        onSuccess: async () => {
            console.log("[IssueReporting] Submission successful. Invalidating queries...");
            toast({
                title: "Issue Reported",
                description: "The issue report has been saved successfully.",
            });
            form.reset({
                problem_level: watchLevel, // Keep current level
                scheme_id: watchSchemeId,   // Keep current scheme
                scheme_name: form.getValues("scheme_name"),
                region: form.getValues("region"),
                village_name: watchLevel === "Scheme" ? "" : watchVillageName,
                esr_name: watchLevel === "ESR" ? "" : watchEsrName,
                status_value: "Pending",
                reason: "",
                agency_issue_type: "",
                agency_issue_other: "",
                department_issue_type: "",
                department_issue_other: "",
                expected_resolution_date: "",
            });

            await queryClient.resetQueries({ queryKey: ["issue-reporting", "list"] });
            await queryClient.resetQueries({ queryKey: ["issue-reporting", "regions"] }); // Refresh regions list too
            await queryClient.refetchQueries({ queryKey: ["issue-reporting", "list"] });
            // Immediately update all dashboard pages (LPCD, Water, Pressure, Chlorine)
            await queryClient.invalidateQueries({ queryKey: ["/api/issue-reporting/active"] });
            setActiveTab("list");
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to submit report",
                variant: "destructive",
            });
        },
    });

    // State for modal dialog showing Issue Details & Remarks History with Action Taken & Expected Resolution Date
    const [modalIssue, setModalIssue] = useState<IssueReport | null>(null);

    // Effects
    useEffect(() => {
        if (currentStatus) {
            console.log("[IssueReporting] currentStatus received:", currentStatus);
            const rawStatus = currentStatus.status ? String(currentStatus.status) : "";
            const safeStatus = cleanStatusValue(rawStatus) || (currentStatus.value !== undefined ? `${currentStatus.value} LPCD` : "");

            form.setValue("status_value", safeStatus);
        }
    }, [currentStatus, form]);

    const onSchemeChange = (schemeId: string) => {
        try {
            if (!schemeId || !schemes || schemes.length === 0) {
                console.warn('[IssueReporting] onSchemeChange called with invalid data:', { schemeId, hasSchemes: !!schemes });
                return;
            }

            const scheme = schemes.find(s => s.scheme_id === schemeId);
            if (scheme) {
                form.setValue("scheme_id", scheme.scheme_id);
                form.setValue("scheme_name", scheme.scheme_name);
                form.setValue("region", scheme.region);
                form.setValue("village_name", "");
                form.setValue("esr_name", "");
            } else {
                console.warn('[IssueReporting] Scheme not found:', schemeId);
            }
        } catch (error) {
            console.error('[IssueReporting] Error in onSchemeChange:', error);
        }
    };

    const onSchemeNameChange = (schemeName: string) => {
        try {
            if (!schemeName || !schemes || schemes.length === 0) {
                console.warn('[IssueReporting] onSchemeNameChange called with invalid data:', { schemeName, hasSchemes: !!schemes });
                return;
            }

            const scheme = schemes.find(s => s.scheme_name === schemeName);
            if (scheme) {
                form.setValue("scheme_id", scheme.scheme_id);
                form.setValue("scheme_name", scheme.scheme_name);
                form.setValue("region", scheme.region);
                form.setValue("village_name", "");
                form.setValue("esr_name", "");
            } else {
                console.warn('[IssueReporting] Scheme not found by name:', schemeName);
            }
        } catch (error) {
            console.error('[IssueReporting] Error in onSchemeNameChange:', error);
        }
    };

    const onSubmit = (values: IssueFormValues) => {
        const effectiveAgency = values.agency_issue_type === "Other"
            ? (values.agency_issue_other?.trim() || "")
            : (values.agency_issue_type || "");

        const effectiveDepartment = values.department_issue_type === "Other"
            ? (values.department_issue_other?.trim() || "")
            : (values.department_issue_type || "");

        const parts = [];
        if (effectiveAgency) parts.push(`[Agency]: ${effectiveAgency}`);
        if (effectiveDepartment) parts.push(`[Department]: ${effectiveDepartment}`);
        const reasonText = parts.join(" | ") || "Issue reported";

        submitMutation.mutate({
            problem_level: values.problem_level,
            region: values.region,
            scheme_id: values.scheme_id,
            scheme_name: values.scheme_name,
            village_name: values.village_name || undefined,
            esr_name: values.esr_name || undefined,
            status_value: values.status_value,
            sensor_type: values.sensor_type || undefined,
            agency_issue: effectiveAgency || undefined,
            department_issue: effectiveDepartment || undefined,
            reason: reasonText,
            expected_resolution_date: values.expected_resolution_date?.trim() || undefined,
        });
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-blue-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900 tracking-tight">Reason for Non-Compliance</h1>
                    <p className="text-blue-600 mt-1">Structured repository for supply-related discrepancies</p>
                </div>
                {user && (
                    <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium text-blue-700">
                            Reporting as: <span className="font-bold">{user.name || user.username}</span>
                        </span>
                    </div>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-14 bg-blue-50/50 p-1 mb-6 rounded-lg border border-blue-100">
                    <TabsTrigger
                        value="report"
                        className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm h-full text-base font-medium transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <FileWarning className="h-5 w-5" />
                            Report New Issue
                        </div>
                    </TabsTrigger>
                    <TabsTrigger
                        value="list"
                        className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm h-full text-base font-medium transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Active Issues
                        </div>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="report" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                    <Card className="border-blue-100 shadow-md overflow-hidden">
                        <CardHeader className="bg-blue-50/30 border-b border-blue-100 pb-4">
                            <CardTitle className="text-xl text-blue-800 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Issue Reporting
                            </CardTitle>
                            <CardDescription className="text-blue-600/80">
                                Select the hierarchy level and provide rationales for non-achievement.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="problem_level"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-blue-900 font-semibold">Problem Level</FormLabel>
                                                    <Select
                                                        name="problem_level"
                                                        onValueChange={(val) => {
                                                            field.onChange(val);
                                                            form.setValue("scheme_id", "");
                                                            form.setValue("scheme_name", "");
                                                            form.setValue("village_name", "");
                                                            form.setValue("esr_name", "");
                                                        }}
                                                        defaultValue={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger id="problem_level" className="border-blue-200">
                                                                <SelectValue placeholder="Select level" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Scheme">Scheme Level</SelectItem>
                                                            <SelectItem value="Village">Village Level</SelectItem>
                                                            <SelectItem value="ESR">ESR Level</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Scheme ID Selection (Searchable) */}
                                        <FormField
                                            control={form.control}
                                            name="scheme_id"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col mt-2">
                                                    <FormLabel className="mb-1">Scheme ID</FormLabel>
                                                    <FormControl>
                                                        <SearchableSelect
                                                            ref={field.ref}
                                                            name="scheme_id"
                                                            options={(schemes || []).filter(s => s && s.scheme_id).map(s => ({ value: s.scheme_id, label: s.scheme_id }))}
                                                            value={field.value}
                                                            onChange={onSchemeChange}
                                                            placeholder="Search Scheme ID"
                                                            isLoading={isLoadingSchemes}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Scheme Name Selection (Searchable) */}
                                        <FormField
                                            control={form.control}
                                            name="scheme_name"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col mt-2 md:col-span-2">
                                                    <FormLabel className="mb-1">Scheme Name</FormLabel>
                                                    <FormControl>
                                                        <SearchableSelect
                                                            ref={field.ref}
                                                            name="scheme_name"
                                                            options={(schemes || []).filter(s => s && s.scheme_name).map(s => ({ value: s.scheme_name, label: s.scheme_name }))}
                                                            value={field.value}
                                                            onChange={onSchemeNameChange}
                                                            placeholder="Search Scheme Name"
                                                            isLoading={isLoadingSchemes}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Dynamic Village Selection (Searchable) */}
                                        {(watchLevel === "Village" || watchLevel === "ESR") && (
                                            <FormField
                                                control={form.control}
                                                name="village_name"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col mt-2">
                                                        <FormLabel className="mb-1">Select Village</FormLabel>
                                                        <FormControl>
                                                            <SearchableSelect
                                                                ref={field.ref}
                                                                name="village_name"
                                                                options={(villages || []).filter(v => v && v.village_name).map(v => ({ value: v.village_name, label: v.village_name }))}
                                                                value={field.value}
                                                                onChange={(val) => {
                                                                    field.onChange(val);
                                                                    form.setValue("esr_name", "");
                                                                }}
                                                                placeholder={!watchSchemeId ? "Select Scheme first" : "Search Village"}
                                                                isLoading={isLoadingVillages}
                                                                isDisabled={!watchSchemeId}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {/* Dynamic ESR Selection (Searchable) */}
                                        {watchLevel === "ESR" && (
                                            <FormField
                                                control={form.control}
                                                name="esr_name"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col mt-2">
                                                        <FormLabel className="mb-1">Select ESR</FormLabel>
                                                        <FormControl>
                                                            <SearchableSelect
                                                                ref={field.ref}
                                                                name="esr_name"
                                                                options={(esrs || []).filter(e => e && e.esr_name).map(e => ({ value: e.esr_name, label: e.esr_name }))}
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                                placeholder={!watchVillageName ? "Select Village first" : "Search ESR"}
                                                                isLoading={isLoadingEsrs}
                                                                isDisabled={!watchVillageName}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {/* Sensor Selection for ESR Level */}
                                        {watchLevel === "ESR" && (
                                            <FormField
                                                control={form.control}
                                                name="sensor_type"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col mt-2">
                                                        <FormLabel className="mb-1">Sensor Type (Optional)</FormLabel>
                                                        <FormControl>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <SelectTrigger className="border-blue-200 focus:ring-blue-500">
                                                                    <SelectValue placeholder="Select Sensor Type" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Flow Meter">Flow Meter</SelectItem>
                                                                    <SelectItem value="PT">PT (Pressure Transmitter)</SelectItem>
                                                                    <SelectItem value="RCS">RCS (Residual Chlorine Sensor)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                    </div>

                                    {/* Status Display */}
                                    {watchSchemeId && currentStatus && (
                                        <div className={`p-4 rounded-lg flex items-center justify-between border-l-4 ${currentStatus.should_require_reason === false ? "bg-green-50 border-green-500 text-green-700" : "bg-red-50 border-red-500 text-red-700"}`}>
                                            <div>
                                                <p className="text-xs uppercase font-bold opacity-70">Current System Reading</p>
                                                <p className="text-lg font-bold">{cleanStatusValue(currentStatus.status)}</p>
                                            </div>
                                            {isFetchingStatus && <Loader2 className="h-5 w-5 animate-spin opacity-50" />}
                                        </div>
                                    )}



                                    {/* Issue Selection Sections: Agency Issue Options & Department Issue Options */}
                                    {currentStatus && (
                                        <div className="space-y-6 pt-2">
                                            {/* Section 1: Agency Issue Options */}
                                            <div className="p-5 bg-gradient-to-br from-blue-50/40 via-white to-blue-50/20 rounded-xl border border-blue-200/80 shadow-xs space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                                                            <Wrench className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-bold text-blue-950">Agency Issue Options</h3>
                                                            <p className="text-xs text-blue-600/80">Select an agency/sensor-related discrepancy</p>
                                                        </div>
                                                    </div>
                                                    {watchAgencyType && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                form.setValue("agency_issue_type", "");
                                                                form.setValue("agency_issue_other", "");
                                                                form.clearErrors(["agency_issue_type", "agency_issue_other"]);
                                                            }}
                                                            className="h-7 px-2.5 text-xs text-neutral-500 hover:text-red-600 hover:bg-red-50 gap-1"
                                                            title="Clear Agency Issue selection"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                            Clear
                                                        </Button>
                                                    )}
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name="agency_issue_type"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <Select
                                                                name="agency_issue_type"
                                                                value={field.value || ""}
                                                                onValueChange={(val) => {
                                                                    field.onChange(val);
                                                                    form.clearErrors("agency_issue_type");
                                                                    if (val !== "Other") {
                                                                        form.setValue("agency_issue_other", "");
                                                                        form.clearErrors("agency_issue_other");
                                                                    }
                                                                }}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger id="agency_issue_dropdown" className="border-blue-200 bg-white min-h-[42px] focus:ring-blue-500 text-left">
                                                                        <SelectValue placeholder="Select an Agency Issue..." />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="max-h-72">
                                                                    {AGENCY_ISSUE_OPTIONS.map((opt) => (
                                                                        <SelectItem key={opt} value={opt} className="py-2 text-sm">
                                                                            {opt}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                {/* Revealed Textbox when Other is selected */}
                                                {watchAgencyType === "Other" && (
                                                    <FormField
                                                        control={form.control}
                                                        name="agency_issue_other"
                                                        render={({ field }) => (
                                                            <FormItem className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <FormLabel className="text-xs font-semibold text-neutral-700 flex items-center justify-between">
                                                                    <span>Describe Agency Issue <span className="text-red-500">*</span></span>
                                                                    <span className="text-xs text-neutral-400 font-normal">Manual Entry</span>
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Textarea
                                                                        id="agency_issue_other"
                                                                        placeholder="Enter detailed description of the agency issue..."
                                                                        className="min-h-[90px] border-blue-200 bg-white focus-visible:ring-blue-500 resize-y"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </div>

                                            {/* Section 2: Department Issue Options */}
                                            <div className="p-5 bg-gradient-to-br from-indigo-50/40 via-white to-indigo-50/20 rounded-xl border border-indigo-200/80 shadow-xs space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                                                            <Building2 className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-bold text-indigo-950">Department Issue Options</h3>
                                                            <p className="text-xs text-indigo-600/80">Select a department/civil-related discrepancy</p>
                                                        </div>
                                                    </div>
                                                    {watchDepartmentType && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                form.setValue("department_issue_type", "");
                                                                form.setValue("department_issue_other", "");
                                                                form.clearErrors(["department_issue_type", "department_issue_other"]);
                                                            }}
                                                            className="h-7 px-2.5 text-xs text-neutral-500 hover:text-red-600 hover:bg-red-50 gap-1"
                                                            title="Clear Department Issue selection"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                            Clear
                                                        </Button>
                                                    )}
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name="department_issue_type"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <Select
                                                                name="department_issue_type"
                                                                value={field.value || ""}
                                                                onValueChange={(val) => {
                                                                    field.onChange(val);
                                                                    form.clearErrors("department_issue_type");
                                                                    if (val !== "Other") {
                                                                        form.setValue("department_issue_other", "");
                                                                        form.clearErrors("department_issue_other");
                                                                    }
                                                                }}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger id="department_issue_dropdown" className="border-indigo-200 bg-white min-h-[42px] focus:ring-indigo-500 text-left">
                                                                        <SelectValue placeholder="Select a Department Issue..." />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="max-h-72">
                                                                    {DEPARTMENT_ISSUE_OPTIONS.map((opt) => (
                                                                        <SelectItem key={opt} value={opt} className="py-2 text-sm">
                                                                            {opt}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                {/* Revealed Textbox when Other is selected */}
                                                {watchDepartmentType === "Other" && (
                                                    <FormField
                                                        control={form.control}
                                                        name="department_issue_other"
                                                        render={({ field }) => (
                                                            <FormItem className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <FormLabel className="text-xs font-semibold text-neutral-700 flex items-center justify-between">
                                                                    <span>Describe Department Issue <span className="text-red-500">*</span></span>
                                                                    <span className="text-xs text-neutral-400 font-normal">Manual Entry</span>
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Textarea
                                                                        id="department_issue_other"
                                                                        placeholder="Enter detailed description of the department issue..."
                                                                        className="min-h-[90px] border-indigo-200 bg-white focus-visible:ring-indigo-500 resize-y"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {currentStatus && (
                                        <div className="p-5 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 rounded-xl border border-amber-200/80 shadow-xs space-y-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-amber-950">Expected Resolution Date</h3>
                                                    <p className="text-xs text-amber-600/80">Specify target deadline by which this issue should be resolved</p>
                                                </div>
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name="expected_resolution_date"
                                                render={({ field }) => (
                                                    <FormItem className="pt-1">
                                                        <FormControl>
                                                            <Input
                                                                type="date"
                                                                min={getIstDateStr()}
                                                                className="bg-white border-amber-200 focus-visible:ring-amber-500 max-w-sm"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}

                                    {currentStatus && (
                                        <Button
                                            type="submit"
                                            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg"
                                            disabled={submitMutation.isPending || !form.watch("status_value")}
                                        >
                                            {submitMutation.isPending ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Justification...</>
                                            ) : (
                                                "Submit Issue Report"
                                            )}
                                        </Button>
                                    )}
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="list">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="w-full sm:w-64">
                                <Select value={selectedRegion} onValueChange={setSelectedRegion} name="region_filter">
                                    <SelectTrigger id="region_filter" className="w-full bg-white border-blue-200">
                                        <SelectValue placeholder="Filter by Region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All Regions">All Regions</SelectItem>
                                        {regions?.map((r) => (
                                            <SelectItem key={r.region} value={r.region}>
                                                {r.region}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {isAdmin && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-semibold text-xs py-1">
                                    Admin: Viewing All Submissions
                                </Badge>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadExcel(false)}
                                className="text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs cursor-pointer"
                                title="Download currently displayed issues to Excel (.xlsx)"
                            >
                                <FileSpreadsheet className="h-3.5 w-3.5 text-white" />
                                <span>Download Issues (.xlsx)</span>
                            </Button>

                            {isAdmin && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadExcel(true)}
                                    className="text-xs gap-1.5 font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs cursor-pointer"
                                    title="Download complete database of all issue reports across all regions (.xlsx)"
                                >
                                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>Download All (DB)</span>
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetchIssues()}
                                disabled={isFetchingIssues}
                                className="text-xs gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                                <Loader2 className={cn("h-3 w-3", isFetchingIssues && "animate-spin")} />
                                {isFetchingIssues ? "Refreshing..." : "Refresh"}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {isLoadingIssues ? (
                            <div className="flex justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            </div>
                        ) : issuesList?.length === 0 ? (
                            <div className="bg-white p-12 rounded-lg border border-dashed border-neutral-300 text-center">
                                <p className="text-neutral-500">No reported issues found.</p>
                            </div>
                        ) : (
                            issuesList?.map((issue) => (
                                <IssueItem
                                    key={issue.id}
                                    issue={issue}
                                    onOpenDetails={() => setModalIssue(issue)}
                                />
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modal Dialog for Issue Details & Remarks History with Action Taken & Expected Resolution Date */}
            {modalIssue && (
                <IssueDetailsRemarksModal
                    open={Boolean(modalIssue)}
                    onOpenChange={(open) => !open && setModalIssue(null)}
                    title={`Remarks/Issues for ${modalIssue.village_name || modalIssue.scheme_name} (${modalIssue.scheme_name})`}
                    issues={[modalIssue]}
                    selectedIssueId={modalIssue.id}
                    isIssueReportingPage={true}
                    onIssueUpdated={() => {
                        queryClient.invalidateQueries({ queryKey: ["issue-reporting", "list"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/issue-reporting/all"] });
                    }}
                />
            )}
        </div>
    );
}

function IssueItem({ issue, onOpenDetails }: { issue: IssueReport; onOpenDetails: () => void }) {
    const deadline = evaluateIssueDeadline(issue.expected_resolution_date);

    return (
        <Card className={`border-l-4 ${issue.status === "Resolved" ? "border-l-green-500 bg-green-50/10" : "border-l-amber-500 bg-white"} shadow-xs hover:shadow-md transition-all duration-200`}>
            <CardContent className="p-5">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-3 flex-1">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <Badge variant={issue.status === "Resolved" ? "default" : "secondary"}
                                    className={`${issue.status === "Resolved" ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"} px-3 py-1 text-sm font-medium border-0`}
                                >
                                    {issue.status === "Resolved" ? (
                                        <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Resolved</>
                                    ) : (
                                        <><AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Active Issue</>
                                    )}
                                </Badge>
                                <span className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(issue.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-2">
                            <div>
                                <h4 className="text-sm text-neutral-500 font-medium mb-0.5">Affected Scheme</h4>
                                <p className="text-base font-semibold text-blue-900">{issue.scheme_name}</p>
                                <p className="text-xs text-blue-400 font-mono">{issue.scheme_id}</p>
                            </div>

                            {(issue.problem_level === "Village" || issue.problem_level === "ESR") && (
                                <div>
                                    <h4 className="text-sm text-neutral-500 font-medium mb-0.5">Location</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-neutral-700 font-medium">
                                            {issue.village_name}
                                        </span>
                                        {issue.esr_name && (
                                            <>
                                                <ChevronsUpDown className="w-3 h-3 text-neutral-300 rotate-90" />
                                                <span className="text-sm text-neutral-700 font-medium">
                                                    {issue.esr_name}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 mt-2">
                            {issue.agency_issue && (
                                <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-100">
                                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-blue-700 font-bold mb-1">
                                        <Wrench className="h-3.5 w-3.5" />
                                        Agency Issue
                                    </div>
                                    <p className="text-sm font-medium text-neutral-850">{issue.agency_issue}</p>
                                </div>
                            )}
                            {issue.department_issue && (
                                <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100">
                                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-700 font-bold mb-1">
                                        <Building2 className="h-3.5 w-3.5" />
                                        Department Issue
                                    </div>
                                    <p className="text-sm font-medium text-neutral-850">{issue.department_issue}</p>
                                </div>
                            )}
                            {!issue.agency_issue && !issue.department_issue && issue.reason && (
                                <div className="bg-neutral-50 p-3 rounded-md border border-neutral-100">
                                    <h4 className="text-xs uppercase tracking-wider text-neutral-400 font-bold mb-1.5">Issue Reason</h4>
                                    <p className="text-neutral-700 italic">"{issue.reason}"</p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-neutral-400 pt-2 border-t border-dashed border-neutral-100">
                            <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                Created By: {issue.creator_name || "Unknown"}
                            </span>

                            {/* Expected Resolution Date info badge */}
                            <div className="flex items-center gap-1.5 ml-auto">
                                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                <span className="font-medium text-slate-600">Expected Resolution:</span>
                                <span className="font-bold text-slate-800">
                                    {deadline.formattedDate || "Not Set"}
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${deadline.status === "overdue"
                                        ? "bg-red-100 text-red-700 border border-red-200"
                                        : deadline.status === "due_today"
                                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                                            : deadline.status === "upcoming"
                                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                : "bg-slate-100 text-slate-600 border border-slate-200"
                                        }`}
                                >
                                    {deadline.statusLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Taken & Issue Details Trigger Button (Replaces Mark as Resolved) */}
                    <div className="md:w-60 flex-shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-neutral-100 pt-4 md:pt-0 md:pl-6 space-y-2">
                        <Button
                            onClick={onOpenDetails}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs text-xs"
                            size="sm"
                        >
                            <Wrench className="w-4 h-4 mr-2" />
                            Action Taken & Details
                        </Button>
                        <p className="text-[11px] text-center text-neutral-400">
                            Record actions & view expected date
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
