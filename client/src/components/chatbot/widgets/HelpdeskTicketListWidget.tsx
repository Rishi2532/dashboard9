/**
 * Helpdesk Ticket List Widget
 * Displays a list of user's tickets with filtering
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, AlertCircle, ChevronRight } from "lucide-react";

interface Ticket {
  ticket_id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

interface HelpdeskTicketListWidgetProps {
  tickets: Ticket[];
  title?: string;
  onTicketClick?: (ticketId: string) => void;
}

export default function HelpdeskTicketListWidget({ 
  tickets, 
  title = "Your Tickets",
  onTicketClick 
}: HelpdeskTicketListWidgetProps) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Open":
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      case "In Progress":
        return <Clock className="w-4 h-4 text-purple-600" />;
      case "Resolved":
      case "Closed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (tickets.length === 0) {
    return (
      <Card className="w-full max-w-2xl shadow-lg border-2 border-indigo-100">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-100">
          <CardTitle className="text-lg font-bold text-indigo-900">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-6">
          <div className="text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No tickets found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl shadow-lg border-2 border-indigo-100">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-indigo-900">{title}</CardTitle>
          <Badge variant="secondary" className="text-sm">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <div
                key={ticket.ticket_id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  onTicketClick ? "cursor-pointer" : ""
                }`}
                onClick={() => onTicketClick?.(ticket.ticket_id)}
                data-testid={`ticket-item-${ticket.ticket_id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(ticket.status)}
                      <span className="font-mono text-sm font-semibold text-indigo-600">
                        {ticket.ticket_id}
                      </span>
                      <Badge className={`${getPriorityColor(ticket.priority)} text-xs px-2 py-0.5`}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1 truncate">
                      {ticket.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{ticket.category}</span>
                      <span>•</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {onTicketClick && (
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
