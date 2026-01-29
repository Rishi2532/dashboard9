/**
 * Helpdesk Ticket Widget
 * Displays ticket information and allows quick actions
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, MapPin, Phone, Mail, Calendar } from "lucide-react";

interface HelpdeskTicketWidgetProps {
  ticket: {
    ticket_id: string;
    title: string;
    category: string;
    specific_issue: string;
    description: string;
    priority: string;
    status: string;
    region?: string;
    circle?: string;
    division?: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
    created_at: string;
    updated_at: string;
  };
  onAction?: (action: string, ticketId: string) => void;
}

export default function HelpdeskTicketWidget({ ticket, onAction }: HelpdeskTicketWidgetProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "In Progress":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "Resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "Closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Open":
        return <AlertCircle className="w-4 h-4" />;
      case "In Progress":
        return <Clock className="w-4 h-4" />;
      case "Resolved":
      case "Closed":
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl shadow-lg border-2 border-indigo-100">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-indigo-900 mb-2">
              {ticket.ticket_id}
            </CardTitle>
            <h3 className="text-md font-semibold text-gray-800 mb-2">{ticket.title}</h3>
          </div>
          <div className="flex flex-col gap-2 ml-4">
            <Badge className={`${getPriorityColor(ticket.priority)} border px-3 py-1`}>
              {ticket.priority} Priority
            </Badge>
            <Badge className={`${getStatusColor(ticket.status)} border px-3 py-1 flex items-center gap-1`}>
              {getStatusIcon(ticket.status)}
              {ticket.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1">Category</p>
            <p className="text-sm text-gray-800">{ticket.category}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1">Specific Issue</p>
            <p className="text-sm text-gray-800">{ticket.specific_issue}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-600 mb-1">Description</p>
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
            {ticket.description}
          </p>
        </div>

        {(ticket.region || ticket.circle || ticket.division) && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500 mt-1" />
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">Location</p>
              <p className="text-sm text-gray-800">
                {[ticket.region, ticket.circle, ticket.division].filter(Boolean).join(" → ")}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-gray-500 mt-1" />
            <div>
              <p className="text-xs font-semibold text-gray-600">Contact</p>
              <p className="text-sm text-gray-800">{ticket.contact_name}</p>
              <p className="text-xs text-gray-600">{ticket.contact_email}</p>
            </div>
          </div>
          {ticket.contact_phone && (
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-500 mt-1" />
              <div>
                <p className="text-xs font-semibold text-gray-600">Phone</p>
                <p className="text-sm text-gray-800">{ticket.contact_phone}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-200">
          <Calendar className="w-4 h-4" />
          <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
        </div>

        {onAction && ticket.status === "Resolved" && (
          <div className="flex gap-2 pt-3 border-t border-gray-200">
            <Button
              data-testid={`button-reopen-${ticket.ticket_id}`}
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onAction("reopen", ticket.ticket_id)}
            >
              Reopen Ticket
            </Button>
            <Button
              data-testid={`button-close-${ticket.ticket_id}`}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onAction("close", ticket.ticket_id)}
            >
              Mark as Closed
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
