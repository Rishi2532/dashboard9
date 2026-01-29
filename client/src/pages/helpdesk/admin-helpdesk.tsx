import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  Search, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Filter,
  User,
  Calendar,
  Download,
  BarChart3,
  TrendingUp
} from "lucide-react";
import { HelpdeskTicket } from "@shared/schema";
import { format } from "date-fns";

interface TicketWithUser {
  ticket: HelpdeskTicket & {
    attachments?: Array<{
      id: number;
      original_filename: string;
      stored_filename: string;
      file_size: number;
    }>;
  };
  user: {
    id: number;
    username: string;
    name: string;
  };
}

const AdminHelpdeskPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  
  // Selected ticket for details/editing
  const [selectedTicket, setSelectedTicket] = useState<TicketWithUser | null>(null);
  const [adminComments, setAdminComments] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");

  // Handle file download
  const handleDownloadAttachment = (storedFilename: string, originalFilename: string) => {
    const downloadUrl = `/api/helpdesk/attachments/${storedFilename}`;
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Build query parameters
  const queryParams = new URLSearchParams();
  
  // Apply tab-based status filtering
  const tabStatusFilter = activeTab === "pending" ? "Open,In-Progress" : "Resolved";
  queryParams.set("status", tabStatusFilter);
  
  if (categoryFilter !== "all") queryParams.set("category", categoryFilter);
  if (regionFilter !== "all") queryParams.set("region", regionFilter);
  if (fromDate) queryParams.set("fromDate", fromDate);
  if (toDate) queryParams.set("toDate", toDate);
  if (searchTerm) queryParams.set("search", searchTerm);

  // Fetch statistics
  const { data: stats } = useQuery<{
    total: number;
    pending: number;
    open: number;
    inProgress: number;
    resolved: number;
    high: number;
    medium: number;
    low: number;
    recent: number;
  }>({
    queryKey: ["/api/helpdesk/stats"],
  });

  // Fetch all tickets (admin view)
  const { data: tickets, isLoading, error } = useQuery<TicketWithUser[]>({
    queryKey: ["/api/helpdesk/admin/tickets", activeTab, queryParams.toString()],
    queryFn: () => {
      const url = `/api/helpdesk/admin/tickets${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return fetch(url).then(res => res.json());
    },
  });

  // Filter tickets for the current tab
  const filteredTickets = tickets?.filter(ticket => {
    if (activeTab === "pending") {
      return ticket.ticket.status === "Open" || ticket.ticket.status === "In-Progress";
    } else {
      return ticket.ticket.status === "Resolved" || ticket.ticket.status === "Closed";
    }
  }) || [];

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, updateData }: { id: number; updateData: any }) => {
      return apiRequest(`/api/helpdesk/tickets/${id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Ticket Updated",
        description: "The ticket has been successfully updated.",
      });
      
      // Reset form and close dialog
      setSelectedTicket(null);
      setAdminComments("");
      setTicketStatus("");
      
      // Refresh tickets list
      queryClient.invalidateQueries({ queryKey: ["/api/helpdesk/admin/tickets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Resolve ticket mutation
  const resolveTicketMutation = useMutation({
    mutationFn: async ({ id, admin_comments }: { id: number; admin_comments?: string }) => {
      return apiRequest(`/api/helpdesk/tickets/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ admin_comments }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Ticket Resolved",
        description: "The ticket has been resolved and user has been notified via email.",
      });
      
      // Reset form and close dialog
      setSelectedTicket(null);
      setAdminComments("");
      setTicketStatus("");
      
      // Refresh tickets list
      queryClient.invalidateQueries({ queryKey: ["/api/helpdesk/admin/tickets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Resolution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateTicket = () => {
    if (!selectedTicket) return;

    const updateData: any = {};
    if (ticketStatus && ticketStatus !== selectedTicket.ticket.status) {
      updateData.status = ticketStatus;
    }
    if (adminComments && adminComments !== selectedTicket.ticket.admin_comments) {
      updateData.admin_comments = adminComments;
    }

    if (Object.keys(updateData).length === 0) {
      toast({
        title: "No Changes",
        description: "No changes detected to update.",
        variant: "destructive",
      });
      return;
    }

    updateTicketMutation.mutate({
      id: selectedTicket.ticket.id,
      updateData,
    });
  };

  const handleResolveTicket = () => {
    if (!selectedTicket) return;

    resolveTicketMutation.mutate({
      id: selectedTicket.ticket.id,
      admin_comments: adminComments || undefined,
    });
  };

  const openTicketDetails = (ticketWithUser: TicketWithUser) => {
    setSelectedTicket(ticketWithUser);
    setTicketStatus(ticketWithUser.ticket.status);
    setAdminComments(ticketWithUser.ticket.admin_comments || "");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Open":
        return <Clock className="h-4 w-4" />;
      case "In-Progress":
        return <AlertCircle className="h-4 w-4" />;
      case "Resolved":
        return <CheckCircle className="h-4 w-4" />;
      case "Closed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Display status for admin (show "Closed" instead of "Resolved")
  const getDisplayStatus = (status: string) => {
    return status;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Open":
        return "default";
      case "In-Progress":
        return "secondary";
      case "Resolved":
        return "outline";
      case "Closed":
        return "destructive";
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tickets...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <p className="text-red-600">Failed to load tickets. Please try again.</p>
            </CardContent>
          </Card>
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
            <h1 className="text-3xl font-bold">Helpdesk Administration</h1>
            <p className="text-muted-foreground">
              Manage and resolve support tickets from users
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardContent className="flex items-center p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Issues</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
              <CardContent className="flex items-center p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Pending</p>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardContent className="flex items-center p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Resolved</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.resolved}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <CardContent className="flex items-center p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">This Week</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.recent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs for Pending/Resolved */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Pending Tickets ({tickets?.filter(t => t.ticket.status === "Open" || t.ticket.status === "In-Progress").length || 0})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Closed Tickets ({tickets?.filter(t => t.ticket.status === "Resolved" || t.ticket.status === "Closed").length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Filter className="h-5 w-5 mr-2" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                data-testid="input-search-admin-tickets"
                placeholder="Search by ticket ID, title, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In-Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Technical Issue">Technical Issue</SelectItem>
                  <SelectItem value="Data Issue">Data Issue</SelectItem>
                  <SelectItem value="Access Issue">Access Issue</SelectItem>
                  <SelectItem value="Feature Request">Feature Request</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger data-testid="select-region-filter">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="Nashik">Nashik</SelectItem>
                  <SelectItem value="Pune">Pune</SelectItem>
                  <SelectItem value="Konkan">Konkan</SelectItem>
                  <SelectItem value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</SelectItem>
                  <SelectItem value="Amravati">Amravati</SelectItem>
                  <SelectItem value="Nagpur">Nagpur</SelectItem>
                </SelectContent>
              </Select>

              <Input
                data-testid="input-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From Date"
              />

              <Input
                data-testid="input-to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To Date"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardContent className="p-0">
            {!filteredTickets || filteredTickets.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No tickets found matching the current filters.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticketWithUser) => (
                      <TableRow 
                        key={ticketWithUser.ticket.id}
                        data-testid={`row-admin-ticket-${ticketWithUser.ticket.id}`}
                      >
                        <TableCell className="font-mono font-medium">
                          {ticketWithUser.ticket.ticket_id}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {ticketWithUser.ticket.title}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ticketWithUser.user?.name || ticketWithUser.user?.username || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticketWithUser.ticket.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityVariant(ticketWithUser.ticket.priority)}>
                            {ticketWithUser.ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(ticketWithUser.ticket.status)} className="flex items-center gap-1 w-fit">
                            {getStatusIcon(ticketWithUser.ticket.status)}
                            {getDisplayStatus(ticketWithUser.ticket.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {ticketWithUser.ticket.level}
                          {ticketWithUser.ticket.region && ` - ${ticketWithUser.ticket.region}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(ticketWithUser.ticket.created_at), "MMM dd")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              data-testid={`button-manage-ticket-${ticketWithUser.ticket.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => openTicketDetails(ticketWithUser)}
                            >
                              Manage
                            </Button>
                            {ticketWithUser.ticket.status !== "Resolved" && (
                              <Button
                                data-testid={`button-quick-resolve-${ticketWithUser.ticket.id}`}
                                variant="outline"
                                size="sm"
                                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                onClick={() => {
                                  resolveTicketMutation.mutate({
                                    id: ticketWithUser.ticket.id,
                                    admin_comments: "Ticket resolved by admin"
                                  });
                                }}
                                disabled={resolveTicketMutation.isPending}
                              >
                                {resolveTicketMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                                Resolve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Management Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-admin-ticket-details">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Manage Ticket: {selectedTicket?.ticket.ticket_id}
              </DialogTitle>
            </DialogHeader>
            
            {selectedTicket && (
              <div className="space-y-6">
                {/* Current Status */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded">
                  <Badge variant={getStatusVariant(selectedTicket.ticket.status)} className="flex items-center gap-1">
                    {getStatusIcon(selectedTicket.ticket.status)}
                    {getDisplayStatus(selectedTicket.ticket.status)}
                  </Badge>
                  <Badge variant={getPriorityVariant(selectedTicket.ticket.priority)}>
                    {selectedTicket.ticket.priority} Priority
                  </Badge>
                  <Badge variant="outline">{selectedTicket.ticket.category}</Badge>
                </div>

                {/* User & Issue Information */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Issue Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Title</label>
                        <p className="font-medium">{selectedTicket.ticket.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Specific Issue</label>
                        <p>{selectedTicket.ticket.specific_issue}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">User Information</h4>
                    <div className="space-y-2">
                      <div><span className="text-gray-500">User:</span> {selectedTicket.user?.name || selectedTicket.user?.username}</div>
                      <div><span className="text-gray-500">Contact:</span> {selectedTicket.ticket.contact_name}</div>
                      <div><span className="text-gray-500">Email:</span> {selectedTicket.ticket.contact_email}</div>
                      {selectedTicket.ticket.contact_phone && (
                        <div><span className="text-gray-500">Phone:</span> {selectedTicket.ticket.contact_phone}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded mt-1">
                    {selectedTicket.ticket.description}
                  </p>
                </div>

                {/* Dashboard Link */}
                {selectedTicket.ticket.dashboard_url && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dashboard Link</label>
                    <div className="mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedTicket.ticket.dashboard_url!, '_blank')}
                        className="flex items-center gap-2"
                        data-testid="button-dashboard-link"
                      >
                        <FileText className="h-4 w-4" />
                        Open Dashboard
                      </Button>
                    </div>
                  </div>
                )}

                {/* Location Information */}
                {(selectedTicket.ticket.region || selectedTicket.ticket.circle || selectedTicket.ticket.division || selectedTicket.ticket.subdivision || selectedTicket.ticket.block || selectedTicket.ticket.scheme_id || selectedTicket.ticket.scheme_name || selectedTicket.ticket.village_name || selectedTicket.ticket.esr_name) && (
                  <div>
                    <h4 className="font-medium mb-2">Location Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-gray-500">Level:</span> {selectedTicket.ticket.level}</div>
                      {selectedTicket.ticket.region && <div><span className="text-gray-500">Region:</span> {selectedTicket.ticket.region}</div>}
                      {selectedTicket.ticket.circle && <div><span className="text-gray-500">Circle:</span> {selectedTicket.ticket.circle}</div>}
                      {selectedTicket.ticket.division && <div><span className="text-gray-500">Division:</span> {selectedTicket.ticket.division}</div>}
                      {selectedTicket.ticket.subdivision && <div><span className="text-gray-500">Subdivision:</span> {selectedTicket.ticket.subdivision}</div>}
                      {selectedTicket.ticket.block && <div><span className="text-gray-500">Block:</span> {selectedTicket.ticket.block}</div>}
                    </div>
                    
                    {/* Scheme Information */}
                    {(selectedTicket.ticket.scheme_id || selectedTicket.ticket.scheme_name) && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="font-medium text-blue-900 mb-2">Scheme Information</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {selectedTicket.ticket.scheme_id && <div><span className="text-gray-500">Scheme ID:</span> {selectedTicket.ticket.scheme_id}</div>}
                          {selectedTicket.ticket.scheme_name && <div><span className="text-gray-500">Scheme Name:</span> {selectedTicket.ticket.scheme_name}</div>}
                        </div>
                      </div>
                    )}
                    

                    {/* Village Information */}
                    {selectedTicket.ticket.village_name && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <h5 className="font-medium text-green-900 mb-2">Village Information</h5>
                        <div className="text-sm">
                          <div><span className="text-gray-500">Village Name:</span> {selectedTicket.ticket.village_name}</div>
                        </div>
                      </div>
                    )}

                    {/* ESR Information */}
                    {selectedTicket.ticket.esr_name && (
                      <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <h5 className="font-medium text-orange-900 mb-2">ESR Information</h5>
                        <div className="text-sm">
                          <div><span className="text-gray-500">ESR Name:</span> {selectedTicket.ticket.esr_name}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* File Attachments */}
                {selectedTicket.ticket.attachments && selectedTicket.ticket.attachments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">
                      Attachments ({selectedTicket.ticket.attachments.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedTicket.ticket.attachments.map((attachment: any, index: number) => (
                        <div 
                          key={attachment.id || index}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">{attachment.original_filename}</span>
                            <span className="text-gray-500">
                              ({(attachment.file_size / 1024 / 1024).toFixed(1)}MB)
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadAttachment(attachment.stored_filename, attachment.original_filename)}
                            className="flex items-center gap-1"
                            data-testid={`button-admin-download-attachment-${index}`}
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Backward compatibility for old single attachment format */}
                {selectedTicket.ticket.attachment_filename && selectedTicket.ticket.attachment_path && !selectedTicket.ticket.attachments && (
                  <div>
                    <h4 className="font-medium mb-2">Attachment</h4>
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        {selectedTicket.ticket.attachment_filename}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadAttachment(
                          selectedTicket.ticket.attachment_path!.split('/').pop()!,
                          selectedTicket.ticket.attachment_filename!
                        )}
                        className="flex items-center gap-1"
                        data-testid="button-admin-download-attachment-old"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}

                {/* Management Actions */}
                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-medium">Update Ticket</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-2">Status</label>
                      <Select value={ticketStatus} onValueChange={setTicketStatus}>
                        <SelectTrigger data-testid="select-update-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="In-Progress">In Progress</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-2">Admin Comments</label>
                    <Textarea
                      data-testid="textarea-admin-comments"
                      placeholder="Add comments for the user..."
                      value={adminComments}
                      onChange={(e) => setAdminComments(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedTicket(null)}
                      data-testid="button-cancel-update"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateTicket}
                      disabled={updateTicketMutation.isPending}
                      data-testid="button-update-ticket"
                    >
                      {updateTicketMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Updating...
                        </>
                      ) : (
                        "Update Ticket"
                      )}
                    </Button>
                    {selectedTicket?.ticket.status !== "Resolved" && (
                      <Button
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleResolveTicket}
                        disabled={resolveTicketMutation.isPending}
                        data-testid="button-resolve-ticket"
                      >
                        {resolveTicketMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Resolve Ticket
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="text-xs text-gray-500 border-t pt-3">
                  <div>Created: {format(new Date(selectedTicket.ticket.created_at), "PPpp")}</div>
                  <div>Last Updated: {format(new Date(selectedTicket.ticket.updated_at), "PPpp")}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminHelpdeskPage;