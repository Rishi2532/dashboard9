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
    FileWarning
} from "lucide-react";
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
    sensor_type: z.string().optional(),
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
    sensor_type?: string;
    status: "Active" | "Resolved";
    resolution_remark?: string;
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
    const { user } = useAuth();
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
        },
    });

    const watchLevel = form.watch("problem_level");
    const watchSchemeId = form.watch("scheme_id");
    const watchSchemeName = form.watch("scheme_name");
    const watchVillageName = form.watch("village_name");
    const watchEsrName = form.watch("esr_name");

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

    // Mutations
    const submitMutation = useMutation({
        mutationFn: (values: IssueFormValues) =>
            apiRequest("/api/issue-reporting/submit", {
                method: "POST",
                body: JSON.stringify(values),
            }),
        onSuccess: async () => {
            console.log("[IssueReporting] Submission successful. Invalidating queries...");
            toast({
                title: "Issue Reported",
                description: "The justification has been saved successfully.",
            });
            form.reset({
                problem_level: watchLevel, // Keep current level
                scheme_id: watchSchemeId,   // Keep current scheme
                scheme_name: form.getValues("scheme_name"),
                region: form.getValues("region"),
                village_name: watchLevel === "Scheme" ? "" : watchVillageName,
                esr_name: watchLevel === "ESR" ? "" : watchEsrName,
                reason: "",
            });

            await queryClient.resetQueries({ queryKey: ["issue-reporting", "list"] });
            await queryClient.resetQueries({ queryKey: ["issue-reporting", "regions"] }); // Refresh regions list too
            await queryClient.refetchQueries({ queryKey: ["issue-reporting", "list"] });
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

    const resolveMutation = useMutation({
        mutationFn: ({ id, remark }: { id: number; remark: string }) =>
            apiRequest(`/api/issue-reporting/resolve/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ resolution_remark: remark }),
            }),
        onSuccess: async (updatedData: IssueReport) => {
            console.log("[IssueReporting] Resolve successful:", updatedData.id, updatedData.status);
            toast({
                title: "Issue Resolved",
                description: "The issue has been marked as resolved.",
            });

            // Force refetch list
            await queryClient.resetQueries({ queryKey: ["issue-reporting", "list"] });
            await queryClient.refetchQueries({ queryKey: ["issue-reporting", "list"] });
        },
    });

    // Effects
    useEffect(() => {
        if (currentStatus) {
            console.log("[IssueReporting] currentStatus received:", currentStatus);
            // Ensure we never pass undefined/null to setValue
            const safeStatus = currentStatus.status ? String(currentStatus.status) : "";
            const safeValue = currentStatus.value ? String(currentStatus.value) : "";

            form.setValue("status_value", safeStatus);
            // We might also want to keep the raw value access if needed, but form expects string
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
        submitMutation.mutate(values);
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
                            Active Issues & Resolution
                        </div>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="report" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                    <Card className="border-blue-100 shadow-md overflow-hidden">
                        <CardHeader className="bg-blue-50/30 border-b border-blue-100 pb-4">
                            <CardTitle className="text-xl text-blue-800 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Submit Justification
                            </CardTitle>
                            <CardDescription className="text-blue-600/80">
                                Select the hierarchy level and provide rationales for non-achievement.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))} className="space-y-6">
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
                                            <div className="flex items-center gap-3">
                                                {currentStatus.should_require_reason === false ? (
                                                    <CheckCircle2 className="h-5 w-5" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5" />
                                                )}
                                                <div>
                                                    <p className="text-xs uppercase font-bold opacity-70">Current System Reading</p>
                                                    <p className="text-lg font-bold">{currentStatus.status}</p>
                                                </div>
                                            </div>
                                            {isFetchingStatus && <Loader2 className="h-5 w-5 animate-spin opacity-50" />}
                                        </div>
                                    )}

                                    {/* Justification Textarea - Always show if status is loaded */}
                                    {currentStatus && (
                                        <FormField
                                            control={form.control}
                                            name="reason"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Reason for Non-Achievement / Issue</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Provide a detailed explanation. (Source failure, Pipeline damage, Power outage, etc.)"
                                                            className="min-h-[120px] border-blue-200 focus:ring-blue-500"
                                                            {...field}
                                                            required
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
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
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                        <div className="w-full sm:w-64">
                            <Select value={selectedRegion} onValueChange={setSelectedRegion} name="region_filter">
                                <SelectTrigger id="region_filter" className="w-full border-blue-200">
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
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetchIssues()}
                            disabled={isFetchingIssues}
                            className="text-xs gap-2"
                        >
                            <Loader2 className={cn("h-3 w-3", isFetchingIssues && "animate-spin")} />
                            {isFetchingIssues ? "Refreshing..." : "Refresh List"}
                        </Button>
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
                                    key={`${issue.id}-${issue.status}-${issue.resolved_at}`} // Key by status to force fresh mount on resolve
                                    issue={issue}
                                    onResolve={(remark) => resolveMutation.mutate({ id: issue.id, remark })}
                                    isResolving={resolveMutation.isPending}
                                />
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}


function IssueItem({ issue, onResolve, isResolving }: { issue: IssueReport; onResolve: (remark: string) => void; isResolving: boolean }) {
    const [showResolve, setShowResolve] = useState(false);
    const [remark, setRemark] = useState("");

    // Reset local state when issue resolves
    useEffect(() => {
        if (issue.status === "Resolved") {
            setShowResolve(false);
            setRemark("");
        }
    }, [issue.status]);

    return (
        <Card className={`border-l-4 ${issue.status === "Resolved" ? "border-l-green-500 bg-green-50/10" : "border-l-amber-500 bg-white"} shadow-sm hover:shadow-md transition-all duration-200`}>
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

                        <div className="bg-neutral-50 p-3 rounded-md border border-neutral-100 mt-2">
                            <h4 className="text-xs uppercase tracking-wider text-neutral-400 font-bold mb-1.5">Issue Reason</h4>
                            <p className="text-neutral-700 italic">"{issue.reason}"</p>
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400 pt-2 border-t border-dashed border-neutral-100">
                            <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                Created By: {issue.creator_name || "Unknown"}
                            </span>
                            {issue.resolved_at && (
                                <span className="flex items-center gap-1 ml-auto">
                                    Resolved on {new Date(issue.resolved_at).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>

                    {!issue.resolved_at && (
                        <div className="md:w-64 flex-shrink-0 flex flex-col justify-center border-t md:border-t-0 md:border-l border-neutral-100 pt-4 md:pt-0 md:pl-6">
                            {!showResolve ? (
                                <Button
                                    onClick={() => setShowResolve(true)}
                                    className="w-full bg-white border-2 border-green-600 text-green-700 hover:bg-green-50 font-semibold shadow-sm"
                                    variant="outline"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Mark as Resolved
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-neutral-600 ml-1">Resolution Verification</label>
                                        <Textarea
                                            id={`resolution-${issue.id}`}
                                            name="resolution_remark"
                                            value={remark}
                                            onChange={(e) => setRemark(e.target.value)}
                                            placeholder="Describe how this was resolved..."
                                            className="min-h-[80px] text-sm resize-none focus-visible:ring-green-500 border-green-200"
                                            autoFocus
                                        />

                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                                            onClick={() => setShowResolve(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                            onClick={() => onResolve(remark)}
                                            disabled={!remark.trim() || isResolving}
                                        >
                                            {isResolving ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                "Confirm"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
