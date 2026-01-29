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
import { Input } from "@/components/ui/input";
import { Loader2, Search, FileText, Clock, CheckCircle, AlertCircle, BarChart3, TrendingUp, Calendar } from "lucide-react";
import { HelpdeskTicket } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

const TrackTicketsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch user's tickets (or all tickets for admin)
  const { data: userStatus } = useQuery<{ isAdmin: boolean; userId?: number; isLoggedIn?: number }>({
    queryKey: ["/api/auth/status"],
  });

  const { data: rawTickets, isLoading, error } = useQuery<any[]>({
    queryKey: userStatus?.isAdmin ? ["/api/helpdesk/admin/tickets"] : ["/api/helpdesk/tickets"],
    enabled: userStatus !== undefined,
  });

  // Fetch statistics for user tickets
  const { data: userStats } = useQuery<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    pending: number;
  }>({
    queryKey: ["/api/helpdesk/user-stats"],
    enabled: userStatus !== undefined && !userStatus?.isAdmin,
  });





  // Normalize ticket data (admin endpoint returns different format)
  const tickets = rawTickets?.map((item: any) => {
    if (item.ticket) {
      // Admin format: { ticket: {...}, user: {...} }
      return { ...item.ticket, user: item.user };
    } else {
      // User format: { ...ticket }
      return item;
    }
  }) || [];

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

  // Display status for users - show "Closed" for resolved tickets if not admin
  const getDisplayStatus = (status: string) => {
    if (status === "Resolved" && !userStatus?.isAdmin) {
      return "Closed";
    }
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

  // Filter tickets based on search term
  const filteredTickets = tickets?.filter((ticket) =>
    ticket.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];



  // Calculate user statistics from tickets - show "Resolved" as "Closed" for users
  const calculateUserStats = (tickets: any[]) => {
    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'Open').length,
      inProgress: tickets.filter(t => t.status === 'In-Progress').length,
      resolved: userStatus?.isAdmin ? tickets.filter(t => t.status === 'Resolved').length : 0,
      closed: userStatus?.isAdmin ? tickets.filter(t => t.status === 'Closed').length : 
              tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length,
      pending: 0
    };
    stats.pending = stats.open + stats.inProgress;
    return stats;
  };

  const displayStats = calculateUserStats(tickets || []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your tickets...</span>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Track Support Tickets</h1>
            <p className="text-muted-foreground">
              {userStatus?.isAdmin ? "View and manage all support tickets" : "View your submitted support requests"}
            </p>
          </div>
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Statistics Cards - Show for all users */}
        {(displayStats || userStatus?.isAdmin) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardContent className="flex items-center p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Tickets</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{displayStats.total}</p>
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
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{displayStats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="flex items-center p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-500 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">In Progress</p>
                    <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{displayStats.inProgress}</p>
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
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{displayStats.resolved}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <CardContent className="flex items-center p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Closed</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{displayStats.closed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <FileText className="h-6 w-6 mr-2" />
              {userStatus?.isAdmin ? `All Tickets (${filteredTickets.length})` : `My Tickets (${filteredTickets.length})`}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {filteredTickets.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">
                  {tickets?.length === 0 ? "No tickets found. Create your first ticket!" : "No tickets match your search."}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                        <TableCell className="font-mono font-medium">
                          {ticket.ticket_id}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {ticket.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                            {ticket.region || 'Not specified'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityVariant(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(ticket.status)} className="flex items-center gap-1 w-fit">
                            {getStatusIcon(ticket.status)}
                            {getDisplayStatus(ticket.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(ticket.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link href={`/helpdesk/ticket/${ticket.id}`}>
                              <Button
                                data-testid={`button-view-ticket-${ticket.id}`}
                                variant="ghost"
                                size="sm"
                              >
                                View Details
                              </Button>
                            </Link>
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


      </div>
    </DashboardLayout>
  );
};

export default TrackTicketsPage;