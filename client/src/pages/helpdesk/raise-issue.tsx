import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload, FileText, Phone, Mail, User, X, Clock, AlertCircle, CheckCircle, History, Plus, MapPin, AlertTriangle, MessageSquare, Paperclip, RotateCcw, Download } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const raiseIssueSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  category: z.string().min(1, "Please select a category"),
  specific_issue: z.string().min(1, "Please select a specific issue"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  level: z.string().min(1, "Please select a level"),
  region: z.string().min(1, "Please select a region"),
  circle: z.string().optional(),
  division: z.string().optional(),
  subdivision: z.string().optional(),
  block: z.string().optional(),
  scheme_id: z.string().optional(),
  scheme_name: z.string().optional(),
  village_name: z.string().optional(),
  esr_name: z.string().optional(),
  priority: z.string().optional(),
  dashboard_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  contact_name: z.string().min(1, "Contact name is required"),
  contact_phone: z.string().optional(),
  contact_email: z.string().email("Please enter a valid email address"),
}).superRefine((data, ctx) => {
  // Conditional validation based on Location Level
  if (data.level === "Scheme" || data.level === "Village" || data.level === "ESR") {
    if (!data.scheme_id || data.scheme_id.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheme ID is required for this location level",
        path: ["scheme_id"],
      });
    }
    if (!data.scheme_name || data.scheme_name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheme Name is required for this location level",
        path: ["scheme_name"],
      });
    }
  }
  
  if (data.level === "Village" || data.level === "ESR") {
    if (!data.village_name || data.village_name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Village Name is required for this location level",
        path: ["village_name"],
      });
    }
  }
  
  if (data.level === "ESR") {
    if (!data.esr_name || data.esr_name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ESR Name is required for this location level",
        path: ["esr_name"],
      });
    }
  }
});

type RaiseIssueFormData = z.infer<typeof raiseIssueSchema>;

const RaiseIssuePage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [closeReason, setCloseReason] = useState("");

  // Fetch current user details
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const form = useForm<RaiseIssueFormData>({
    resolver: zodResolver(raiseIssueSchema),
    defaultValues: {
      priority: "Medium",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      title: "",
      description: "",
      level: "",
      category: "",
      specific_issue: "",
      dashboard_url: "",
    },
  });

  // Update form values when user data is loaded
  React.useEffect(() => {
    if (currentUser && !userLoading) {
      form.setValue("contact_name", currentUser.name || "");
      form.setValue("contact_email", currentUser.email || "");
      form.setValue("contact_phone", currentUser.phone || "");
    }
  }, [currentUser, userLoading, form]);

  // Fetch categories and specific issues
  const { data: categories, isLoading: categoriesLoading } = useQuery<Record<string, string[]>>({
    queryKey: ["/api/helpdesk/categories"],
  });

  // Fetch user's tickets for history tab
  const { data: userTickets, isLoading: ticketsLoading } = useQuery<any[]>({
    queryKey: ["/api/helpdesk/tickets"],
  });

  // Watch for category changes to update specific issues
  const watchedCategory = form.watch("category");
  
  // Watch for level changes to show conditional fields
  const watchedLevel = form.watch("level");
  
  // Watch for region changes to fetch vendors
  const watchedRegion = form.watch("region");
  
  // Fetch vendors for selected region
  const { data: vendors, isLoading: vendorsLoading } = useQuery<any[]>({
    queryKey: ["/api/vendors", watchedRegion],
    queryFn: async () => {
      const response = await fetch(`/api/vendors?region=${watchedRegion}`);
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json();
    },
    enabled: !!watchedRegion,
  });

  // Helper functions for ticket display
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Open":
        return <Clock className="h-4 w-4" />;
      case "In-Progress":
        return <AlertCircle className="h-4 w-4" />;
      case "Resolved":
      case "Closed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Open":
        return "default";
      case "In-Progress":
        return "secondary";
      case "Resolved":
      case "Closed":
        return "outline";
      default:
        return "default";
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "High":
        return "destructive";
      case "Medium":
        return "default";
      case "Low":
        return "secondary";
      default:
        return "default";
    }
  };

  // Utility function to check if a ticket can be reopened or closed (within 48 hours)
  const canManageTicket = (ticket: any) => {
    if (ticket.status !== 'Resolved') return false;
    
    const resolvedDate = new Date(ticket.updated_at);
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    
    return resolvedDate >= fortyEightHoursAgo;
  };





  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/helpdesk/tickets", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create ticket");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Ticket Created Successfully!",
        description: `Your ticket ${data.ticket_id} has been submitted. You will receive an email confirmation shortly.`,
      });
      
      // Reset form
      form.reset();
      setSelectedFiles([]);
      
      // Invalidate queries to refresh ticket lists
      queryClient.invalidateQueries({ queryKey: ["/api/helpdesk/tickets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: RaiseIssueFormData) => {
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      // Append all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, value.toString());
        }
      });

      // Append multiple files if selected
      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file) => {
          formData.append("attachments", file);
        });
      }

      await createTicketMutation.mutateAsync(formData);
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Validate each file
    const validFiles: File[] = [];
    const allowedTypes = [
      "image/jpeg", 
      "image/jpg", 
      "image/png", 
      "image/gif", 
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel" // .xls
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const maxFiles = 5;

    // Check total file limit
    if (selectedFiles.length + files.length > maxFiles) {
      toast({
        title: "Too Many Files",
        description: `Maximum ${maxFiles} files allowed per ticket.`,
        variant: "destructive",
      });
      return;
    }

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: `File "${file.name}" is not supported. Please upload only JPEG, PNG, GIF, PDF, or Excel files.`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `File "${file.name}" is too large. Please upload files smaller than 10MB.`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }

    // Clear the input so the same file can be selected again
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (categoriesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Support Center
            </h1>
            <p className="text-muted-foreground">
              Get help with technical issues or submit feature requests
            </p>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">24/7 Support Available</span>
          </div>
        </div>

        <Card className="max-w-6xl mx-auto shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
          <CardContent className="p-6">
            <Tabs defaultValue="raise-issue" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 h-14 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
                <TabsTrigger 
                  value="raise-issue" 
                  className="flex items-center justify-center h-12 text-base font-medium data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-blue-300 data-[state=active]:text-blue-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Ticket
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="flex items-center justify-center h-12 text-base font-medium data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-blue-300 data-[state=active]:text-blue-700"
                >
                  <History className="h-5 w-5 mr-2" />
                  My Tickets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="raise-issue" className="space-y-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Region Selection Section */}
                <div className="space-y-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-green-800 dark:text-green-300">Location Details</h3>
                      <p className="text-sm text-green-600 dark:text-green-400">Help us identify where the issue is occurring</p>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-region">
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Amravati">Amravati</SelectItem>
                            <SelectItem value="Nashik">Nashik</SelectItem>
                            <SelectItem value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</SelectItem>
                            <SelectItem value="Nagpur">Nagpur</SelectItem>
                            <SelectItem value="Pune">Pune</SelectItem>
                            <SelectItem value="Konkan">Konkan</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Vendor Information Display */}
                  {watchedRegion && vendors && vendors.length > 0 && (
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                      <div className="flex items-center mb-3">
                        <div className="p-1.5 bg-blue-500 rounded-md mr-2">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300">
                          Region Contacts ({watchedRegion})
                        </h4>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                        The following personnel will be automatically notified when you submit this ticket:
                      </p>
                      <div className="space-y-2">
                        {vendors.map((vendor: any) => (
                          <div 
                            key={vendor.id} 
                            className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-700"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {vendor.employee_name}
                                </span>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {vendor.agency}
                                </div>
                              </div>
                              <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <Mail className="h-3 w-3 mr-1" />
                                {vendor.email}
                              </div>
                              <div className="flex items-center text-gray-600 dark:text-gray-400">
                                <Phone className="h-3 w-3 mr-1" />
                                {vendor.phone}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {watchedRegion && vendorsLoading && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-600" />
                      <span className="text-sm text-blue-700 dark:text-blue-400">Loading region contacts...</span>
                    </div>
                  )}
                </div>

                {/* Issue Details Section */}
                <div className="space-y-6 p-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-orange-800 dark:text-orange-300">Issue Information</h3>
                      <p className="text-sm text-orange-600 dark:text-orange-400">Describe the problem you're experiencing</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories && Object.keys(categories).map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="specific_issue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specific Issue *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-specific-issue">
                                <SelectValue placeholder="Select specific issue" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {watchedCategory && categories && categories[watchedCategory]?.map((issue: string) => (
                                <SelectItem key={issue} value={issue}>
                                  {issue}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue Title *</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-title"
                            placeholder="Brief summary of the issue"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-priority">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location Level *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-level">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Region">Region</SelectItem>
                              <SelectItem value="Circle">Circle</SelectItem>
                              <SelectItem value="Division">Division</SelectItem>
                              <SelectItem value="Subdivision">Subdivision</SelectItem>
                              <SelectItem value="Block">Block</SelectItem>
                              <SelectItem value="Scheme">Scheme</SelectItem>
                              <SelectItem value="Village">Village</SelectItem>
                              <SelectItem value="ESR">ESR</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Conditional Fields Based on Location Level */}
                  {(watchedLevel === "Scheme" || watchedLevel === "Village" || watchedLevel === "ESR") && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900">Scheme Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="scheme_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Scheme ID *</FormLabel>
                              <FormControl>
                                <Input
                                  data-testid="input-scheme-id"
                                  placeholder="Enter scheme ID"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="scheme_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Scheme Name *</FormLabel>
                              <FormControl>
                                <Input
                                  data-testid="input-scheme-name"
                                  placeholder="Enter scheme name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {(watchedLevel === "Village" || watchedLevel === "ESR") && (
                    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900">Village Information</h4>
                      <FormField
                        control={form.control}
                        name="village_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Village Name *</FormLabel>
                            <FormControl>
                              <Input
                                data-testid="input-village-name"
                                placeholder="Enter village name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchedLevel === "ESR" && (
                    <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <h4 className="font-medium text-orange-900">ESR Information</h4>
                      <FormField
                        control={form.control}
                        name="esr_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ESR Name *</FormLabel>
                            <FormControl>
                              <Input
                                data-testid="input-esr-name"
                                placeholder="Enter ESR name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea
                            data-testid="textarea-description"
                            placeholder="Please provide detailed description of the issue..."
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dashboard_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dashboard Link (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-dashboard-url"
                            type="url"
                            placeholder="https://example.com/dashboard/..."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide a link to the related dashboard page for admin reference
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information Section */}
                <div className="space-y-6 p-6 bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-indigo-900/10 dark:to-cyan-900/10 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-500 rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-indigo-800 dark:text-indigo-300">Contact Information</h3>
                        <p className="text-sm text-indigo-600 dark:text-indigo-400">How we can reach you for updates</p>
                      </div>
                    </div>
                    {userLoading && (
                      <div className="flex items-center text-sm text-indigo-600">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading your details...
                      </div>
                    )}
                    {currentUser && !userLoading && (
                      <div className="text-sm text-green-600 font-medium">
                        ✓ Auto-populated from your profile
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            Full Name *
                          </FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-contact-name"
                              placeholder="Your full name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            Email Address *
                          </FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-contact-email"
                              type="email"
                              placeholder="your.email@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-contact-phone"
                              placeholder="Your phone number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="space-y-6 p-6 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/10 dark:to-emerald-900/10 rounded-xl border border-teal-200 dark:border-teal-800">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-teal-500 rounded-lg">
                      <Paperclip className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-teal-800 dark:text-teal-300">File Attachments</h3>
                      <p className="text-sm text-teal-600 dark:text-teal-400">Upload screenshots, documents, or Excel files (Max 5 files, 10MB each)</p>
                    </div>
                  </div>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Click to upload or drag and drop
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            PNG, JPG, GIF, PDF, Excel (.xlsx, .xls) up to 10MB each (Max 5 files)
                          </span>
                        </label>
                        <input
                          id="file-upload"
                          data-testid="input-file-upload"
                          name="file-upload"
                          type="file"
                          multiple
                          className="sr-only"
                          accept=".jpg,.jpeg,.png,.gif,.pdf,.xlsx,.xls"
                          onChange={handleFileChange}
                        />
                      </div>
                      
                      {/* Selected Files Display */}
                      {selectedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="text-sm font-medium text-gray-700">
                            Selected Files ({selectedFiles.length}/5):
                          </div>
                          {selectedFiles.map((file, index) => (
                            <div 
                              key={index} 
                              className="flex items-center justify-between bg-gray-100 p-2 rounded text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{file.name}</span>
                                <span className="text-gray-500">
                                  ({(file.size / 1024 / 1024).toFixed(1)}MB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="h-6 w-6 p-0 hover:bg-red-100"
                                data-testid={`button-remove-file-${index}`}
                              >
                                <X className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-8">
                  <Button
                    type="submit"
                    data-testid="button-submit-ticket"
                    disabled={isSubmitting}
                    size="lg"
                    className="px-12 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-3" />
                        Creating Your Ticket...
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5 mr-3" />
                        Submit Support Ticket
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">My Tickets History</h3>
                  
                  {ticketsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Loading your tickets...</span>
                    </div>
                  ) : userTickets && Array.isArray(userTickets) && userTickets.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ticket ID</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userTickets.map((ticket: any) => (
                            <TableRow key={ticket.id}>
                              <TableCell className="font-medium">
                                {ticket.ticket_id}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{ticket.title}</div>
                                  <div className="text-sm text-gray-500 truncate max-w-xs">
                                    {ticket.description}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{ticket.category}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getPriorityVariant(ticket.priority)}>
                                  {ticket.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusVariant(ticket.status)} className="flex items-center gap-1 w-fit">
                                  {getStatusIcon(ticket.status)}
                                  {ticket.status === "Resolved" ? "Closed" : ticket.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {format(new Date(ticket.created_at), "MMM dd, yyyy")}
                              </TableCell>
                              <TableCell>
                                <Link href={`/helpdesk/ticket/${ticket.id}`}>
                                  <Button
                                    data-testid={`button-view-ticket-${ticket.id}`}
                                    variant="ghost"
                                    size="sm"
                                  >
                                    View Details
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">No tickets found. Create your first ticket using the "Raise New Issue" tab.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>


      </div>
    </DashboardLayout>
  );
};

export default RaiseIssuePage;