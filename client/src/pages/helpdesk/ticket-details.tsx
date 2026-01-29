import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  FileText, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Loader2,
  RotateCcw,
  Settings,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  Monitor,
  Sparkles
} from "lucide-react";
import { HelpdeskTicket } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

const TicketDetailsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, params] = useRoute("/helpdesk/ticket/:id");
  const ticketId = params?.id;
  
  const [adminComments, setAdminComments] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [closeReason, setCloseReason] = useState("");

  // Fetch user status to check if admin
  const { data: userStatus } = useQuery<{ isAdmin: boolean; userId?: number; isLoggedIn?: number }>({
    queryKey: ["/api/auth/status"],
  });

  // Fetch ticket details
  const { data: ticket, isLoading, error } = useQuery<HelpdeskTicket>({
    queryKey: [`/api/helpdesk/tickets/${ticketId}`],
    enabled: !!ticketId,
  });

  // Resolve ticket mutation (admin only)
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
      
      setAdminComments("");
      queryClient.invalidateQueries({ queryKey: [`/api/helpdesk/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/helpdesk/admin/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/helpdesk/tickets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Resolution Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reopen ticket mutation
  const reopenTicketMutation = useMutation({
    mutationFn: async ({ id, reopen_reason }: { id: number; reopen_reason: string }) => {
      return apiRequest(`/api/helpdesk/tickets/${id}/reopen`, {
        method: "POST",
        body: JSON.stringify({ reopen_reason }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Ticket Reopened",
        description: "Your ticket has been reopened successfully.",
      });
      
      setReopenReason("");
      queryClient.invalidateQueries({ queryKey: [`/api/helpdesk/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/helpdesk/tickets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Reopen Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Close ticket mutation (for users to close resolved tickets)
  const closeTicketMutation = useMutation({
    mutationFn: async ({ id, close_reason }: { id: number; close_reason?: string }) => {
      return apiRequest(`/api/helpdesk/tickets/${id}/close`, {
        method: "POST",
        body: JSON.stringify({ close_reason }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Ticket Closed",
        description: "Your ticket has been closed successfully. Thank you for your feedback.",
      });
      
      setCloseReason("");
      queryClient.invalidateQueries({ queryKey: [`/api/helpdesk/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/helpdesk/tickets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Close Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleResolveTicket = () => {
    if (!ticket) return;
    
    resolveTicketMutation.mutate({
      id: ticket.id,
      admin_comments: adminComments || undefined,
    });
  };

  const handleReopenTicket = () => {
    if (!ticket || !reopenReason.trim()) return;
    
    reopenTicketMutation.mutate({
      id: ticket.id,
      reopen_reason: reopenReason.trim(),
    });
  };

  const handleCloseTicket = () => {
    if (!ticket) return;
    
    closeTicketMutation.mutate({
      id: ticket.id,
      close_reason: closeReason.trim() || undefined,
    });
  };

  // Handle file download
  const handleDownloadAttachment = (storedFilename: string, originalFilename: string) => {
    const downloadUrl = `/api/helpdesk/attachments/${storedFilename}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Open":
        return <Clock className="h-4 w-4" />;
      case "In Progress":
        return <AlertCircle className="h-4 w-4" />;
      case "Resolved":
        return <CheckCircle className="h-4 w-4" />;
      case "Closed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800";
      case "Resolved":
        return "bg-green-100 text-green-800";
      case "Closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Check if user can manage ticket (within 48 hours for resolved tickets)
  const canManageTicket = (ticket: HelpdeskTicket) => {
    if (userStatus?.isAdmin) return true;
    if (ticket.status !== "Resolved") return false;
    
    const resolvedTime = new Date(ticket.updated_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - resolvedTime.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff <= 48;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading ticket details...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !ticket) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ticket Not Found</h2>
            <p className="text-gray-600 mb-4">The ticket you're looking for doesn't exist or you don't have permission to view it.</p>
            <Link href={userStatus?.isAdmin ? "/helpdesk/track-tickets" : "/helpdesk/raise-issue"}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {userStatus?.isAdmin ? "Back to Tickets" : "Back to Helpdesk"}
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Enhanced Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={userStatus?.isAdmin ? "/helpdesk/track-tickets" : "/helpdesk/raise-issue"}>
                <Button variant="outline" size="sm" className="bg-white hover:bg-blue-50 border-blue-200">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {userStatus?.isAdmin ? "Back to Tickets" : "Back to Helpdesk"}
                </Button>
              </Link>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Ticket Details: {ticket.ticket_id}
                  </h1>
                </div>
                <p className="text-gray-600 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View and manage support ticket
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced Ticket Header */}
            <Card className="border-l-4 border-l-blue-500 shadow-md">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <Badge className={`${getStatusColor(ticket.status)} shadow-sm`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(ticket.status)}
                          <span>{ticket.status}</span>
                        </div>
                      </Badge>
                      <Badge className={`${getPriorityColor(ticket.priority || "Medium")} shadow-sm`}>
                        {ticket.priority || "Medium"} Priority
                      </Badge>
                      <Badge variant="outline" className="bg-white border-blue-200 text-blue-700">
                        {ticket.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl text-gray-900">{ticket.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Specific Issue
                  </h4>
                  <p className="text-blue-800">{ticket.specific_issue}</p>
                </div>
                
                <Separator className="bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-600" />
                    Description
                  </h4>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                  </div>
                </div>

                {ticket.dashboard_url && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                        <Monitor className="h-5 w-5 mr-2" />
                        Dashboard Access
                      </h4>
                      <p className="text-green-700 text-sm mb-3">
                        Click below to navigate to the relevant dashboard section:
                      </p>
                      <a 
                        href={ticket.dashboard_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <Button 
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                          size="sm"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Dashboard
                          <Sparkles className="h-3 w-3 ml-2" />
                        </Button>
                      </a>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Location Details */}
            {(ticket.region || ticket.level) && (
              <Card className="border-l-4 border-l-purple-500 shadow-md">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="flex items-center text-purple-900">
                    <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                    Location Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ticket.level && (
                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <span className="text-purple-600 text-sm font-medium">Level:</span>
                        <p className="font-semibold text-gray-900">{ticket.level}</p>
                      </div>
                    )}
                    {ticket.region && (
                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <span className="text-purple-600 text-sm font-medium">Region:</span>
                        <p className="font-semibold text-gray-900">{ticket.region}</p>
                      </div>
                    )}
                    {ticket.circle && (
                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <span className="text-purple-600 text-sm font-medium">Circle:</span>
                        <p className="font-semibold text-gray-900">{ticket.circle}</p>
                      </div>
                    )}
                    {ticket.division && (
                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <span className="text-purple-600 text-sm font-medium">Division:</span>
                        <p className="font-semibold text-gray-900">{ticket.division}</p>
                      </div>
                    )}
                    {ticket.subdivision && (
                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <span className="text-purple-600 text-sm font-medium">Subdivision:</span>
                        <p className="font-semibold text-gray-900">{ticket.subdivision}</p>
                      </div>
                    )}
                    {ticket.block && (
                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <span className="text-purple-600 text-sm font-medium">Block:</span>
                        <p className="font-semibold text-gray-900">{ticket.block}</p>
                      </div>
                    )}
                    {ticket.scheme_id && (
                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <span className="text-purple-600 text-sm font-medium">Scheme ID:</span>
                        <p className="font-semibold text-gray-900">{ticket.scheme_id}</p>
                      </div>
                    )}
                    {ticket.scheme_name && (
                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <span className="text-purple-600 text-sm font-medium">Scheme Name:</span>
                        <p className="font-semibold text-gray-900">{ticket.scheme_name}</p>
                      </div>
                    )}
                    {ticket.village_name && (
                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <span className="text-purple-600 text-sm font-medium">Village:</span>
                        <p className="font-semibold text-gray-900">{ticket.village_name}</p>
                      </div>
                    )}
                    {ticket.esr_name && (
                      <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                        <span className="text-purple-600 text-sm font-medium">ESR Name:</span>
                        <p className="font-semibold text-gray-900">{ticket.esr_name}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <Card className="border-l-4 border-l-orange-500 shadow-md">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
                  <CardTitle className="flex items-center text-orange-900">
                    <FileText className="h-5 w-5 mr-2 text-orange-600" />
                    Attachments ({ticket.attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ticket.attachments.map((attachment, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between bg-gradient-to-r from-white to-orange-50 p-4 rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-orange-100 p-2 rounded-lg">
                            <FileText className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-900">{attachment.original_filename}</span>
                            <p className="text-xs text-orange-600 font-medium">
                              {(attachment.file_size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                          size="sm"
                          onClick={() => handleDownloadAttachment(attachment.stored_filename, attachment.original_filename)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Enhanced Contact Information */}
            <Card className="border-l-4 border-l-indigo-500 shadow-md">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <CardTitle className="flex items-center text-indigo-900">
                  <User className="h-5 w-5 mr-2 text-indigo-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <User className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 font-medium">Name</p>
                      <span className="text-sm font-semibold text-gray-900">{ticket.contact_name}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <Mail className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 font-medium">Email</p>
                      <span className="text-sm font-semibold text-gray-900">{ticket.contact_email}</span>
                    </div>
                  </div>
                </div>
                {ticket.contact_phone && (
                  <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-100 p-2 rounded-lg">
                        <Phone className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs text-indigo-600 font-medium">Phone</p>
                        <span className="text-sm font-semibold text-gray-900">{ticket.contact_phone}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Ticket Information */}
            <Card className="border-l-4 border-l-slate-500 shadow-md">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
                <CardTitle className="flex items-center text-slate-900">
                  <Clock className="h-5 w-5 mr-2 text-slate-600" />
                  Ticket Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="bg-slate-100 p-2 rounded-lg">
                      <Clock className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Created</p>
                      <span className="text-sm font-semibold text-gray-900">
                        {format(new Date(ticket.created_at), "MMM dd, yyyy 'at' hh:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="bg-slate-100 p-2 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">Last Updated</p>
                      <span className="text-sm font-semibold text-gray-900">
                        {format(new Date(ticket.updated_at), "MMM dd, yyyy 'at' hh:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Admin Actions */}
            {userStatus?.isAdmin && ticket.status !== "Resolved" && ticket.status !== "Closed" && (
              <Card className="border-l-4 border-l-emerald-500 shadow-md">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50">
                  <CardTitle className="flex items-center text-emerald-900">
                    <Settings className="h-5 w-5 mr-2 text-emerald-600" />
                    Admin Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <label className="text-sm font-semibold text-emerald-900 mb-2 block">
                      Resolution Comments (Optional)
                    </label>
                    <Textarea
                      value={adminComments}
                      onChange={(e) => setAdminComments(e.target.value)}
                      placeholder="Provide details about how this issue was resolved..."
                      className="min-h-[100px] border-emerald-200 focus:border-emerald-400 bg-white"
                    />
                  </div>
                  
                  <Button
                    onClick={handleResolveTicket}
                    disabled={resolveTicketMutation.isPending}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
                        <Sparkles className="h-3 w-3 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Enhanced User Reopen Option */}
            {!userStatus?.isAdmin && ticket.status === "Resolved" && canManageTicket(ticket) && (
              <Card className="border-l-4 border-l-amber-500 shadow-md">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                  <CardTitle className="flex items-center text-amber-900">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
                    Issue Not Resolved?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800 font-medium">
                      If this ticket was marked as resolved but your issue persists, you can reopen it within 48 hours.
                    </p>
                  </div>
                  
                  <div className="bg-white border border-amber-200 rounded-lg p-3">
                    <label className="text-sm font-semibold text-amber-900 mb-2 block">
                      Please explain why you need to reopen this ticket <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="Describe what is still not working or what additional help you need..."
                      className="min-h-[100px] border-amber-200 focus:border-amber-400"
                    />
                  </div>
                  
                  <Button
                    onClick={handleReopenTicket}
                    disabled={reopenTicketMutation.isPending || !reopenReason.trim()}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    {reopenTicketMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Reopening...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reopen Ticket
                        <Sparkles className="h-3 w-3 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Enhanced User Close Option */}
            {!userStatus?.isAdmin && ticket.status === "Resolved" && canManageTicket(ticket) && (
              <Card className="border-l-4 border-l-green-500 shadow-md">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="flex items-center text-green-900">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    Issue Resolved?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium">
                      If your issue has been resolved and you're satisfied with the solution, you can close this ticket.
                    </p>
                  </div>
                  
                  <div className="bg-white border border-green-200 rounded-lg p-3">
                    <label className="text-sm font-semibold text-green-900 mb-2 block">
                      Additional feedback (Optional)
                    </label>
                    <Textarea
                      value={closeReason}
                      onChange={(e) => setCloseReason(e.target.value)}
                      placeholder="Any feedback about the resolution or support received..."
                      className="min-h-[80px] border-green-200 focus:border-green-400"
                    />
                  </div>
                  
                  <Button
                    onClick={handleCloseTicket}
                    disabled={closeTicketMutation.isPending}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    {closeTicketMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Closing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Close Ticket
                        <Sparkles className="h-3 w-3 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Admin Comments */}
            {ticket.admin_comments && (
              <Card className="border-l-4 border-l-cyan-500 shadow-md">
                <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50">
                  <CardTitle className="flex items-center text-cyan-900">
                    <MessageSquare className="h-5 w-5 mr-2 text-cyan-600" />
                    Admin Resolution Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-4">
                    <p className="text-cyan-800 leading-relaxed">{ticket.admin_comments}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TicketDetailsPage;