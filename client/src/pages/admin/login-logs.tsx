import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, User, Clock, Globe, Monitor, ChevronDown, ChevronRight, Download, Eye, FileText, Filter, Database, Map } from "lucide-react";
import { format } from "date-fns";
import { useEnhancedActivityTracker } from "@/hooks/use-enhanced-activity-tracker";

interface UserLoginLog {
  id: number;
  user_id: number;
  username: string;
  user_name: string | null;
  login_time: string;
  logout_time: string | null;
  session_duration: number | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  is_active: boolean | null;
  activities?: UserActivity[];
}

interface UserActivity {
  id: number;
  user_id: number;
  username: string;
  session_id: string;
  activity_type: string;
  activity_description: string;
  file_name: string | null;
  file_type: string | null;
  page_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  metadata: any;
}

export default function LoginLogsPage() {
  const { logPageVisit } = useEnhancedActivityTracker();
  const [limit, setLimit] = useState(50);
  const [userIdFilter, setUserIdFilter] = useState("");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Track page visit on component mount
  useEffect(() => {
    logPageVisit("Admin User Activity Logs");
  }, [logPageVisit]);

  // Auto session closure on window/tab close
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // Send logout request when user closes window/tab without logging out
      navigator.sendBeacon('/api/auth/logout', new FormData());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Log activity when user switches away from the page
        fetch('/api/auth/log-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activity_type: 'page_visibility',
            activity_description: 'User switched away from page or minimized window',
            page_url: window.location.href
          })
        }).catch(() => {}); // Silent fail
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/auth/login-logs', limit, userIdFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (userIdFilter) {
        params.append('userId', userIdFilter);
      }
      
      const response = await fetch(`/api/auth/login-logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch login logs');
      }
      return response.json();
    },
  });

  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const formatUserAgent = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown';
    
    // Extract browser info from user agent
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Login Logs</h1>
          <p className="text-muted-foreground">Monitor user authentication activity</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Filter Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">User ID Filter</label>
              <Input
                placeholder="Enter user ID to filter..."
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
              />
            </div>
            <div className="w-32">
              <label className="text-sm font-medium">Limit</label>
              <Input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                min="1"
                max="1000"
              />
            </div>
            <Button 
              onClick={() => refetch()} 
              className="h-10"
            >
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Login Activity ({logs.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading login logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No login logs found</p>
              <p className="text-sm">Login activity will appear here once users start logging in</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Login Time</TableHead>
                    <TableHead>Logout Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>Session</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: UserLoginLog) => (
                    <>
                      <TableRow key={log.id} className="group">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{log.user_name || log.username}</div>
                            <div className="text-sm text-muted-foreground">
                              @{log.username} (ID: {log.user_id})
                            </div>
                            {log.activities && log.activities.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => log.session_id && toggleSessionExpansion(log.session_id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  {expandedSessions.has(log.session_id || '') ? (
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 mr-1" />
                                  )}
                                  {log.activities.length} activities
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {format(new Date(log.login_time), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(log.login_time), 'hh:mm:ss a')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.logout_time ? (
                            <div className="space-y-1">
                              <div className="font-medium">
                                {format(new Date(log.logout_time), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(log.logout_time), 'hh:mm:ss a')}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Still active
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.session_duration ? (
                            <div className="text-sm">
                              {Math.floor(log.session_duration / 60)}m {log.session_duration % 60}s
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              -
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.is_active ? "default" : "secondary"}>
                            {log.is_active ? "Active" : "Ended"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">
                              {log.ip_address || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary">
                              {formatUserAgent(log.user_agent)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs text-muted-foreground max-w-20 truncate">
                            {log.session_id ? log.session_id.substring(0, 8) + '...' : 'N/A'}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* User Activities Collapsible Row */}
                      {log.session_id && expandedSessions.has(log.session_id) && log.activities && log.activities.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-0">
                            <div className="p-4 space-y-3">
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                User Activities During This Session
                              </h4>
                              <div className="space-y-2">
                                {log.activities.map((activity) => (
                                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {activity.activity_type === 'file_download' ? (
                                        <Download className="h-4 w-4 text-blue-500" />
                                      ) : activity.activity_type === 'data_export' ? (
                                        <Database className="h-4 w-4 text-purple-500" />
                                      ) : activity.activity_type === 'page_visit' ? (
                                        <Eye className="h-4 w-4 text-green-500" />
                                      ) : activity.activity_type === 'filter_applied' || activity.activity_type === 'scheme_filter' || activity.activity_type === 'region_filter' ? (
                                        <Filter className="h-4 w-4 text-orange-500" />
                                      ) : activity.activity_type === 'dashboard_access' ? (
                                        <Map className="h-4 w-4 text-indigo-500" />
                                      ) : (
                                        <FileText className="h-4 w-4 text-gray-500" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <p className="font-medium text-sm">
                                            {activity.activity_description}
                                          </p>
                                          {activity.file_name && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                              <strong>File:</strong> {activity.file_name}
                                              {activity.file_type && ` (${activity.file_type})`}
                                            </p>
                                          )}
                                          {activity.page_url && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                              <strong>Page:</strong> {activity.page_url}
                                            </p>
                                          )}
                                          {activity.metadata && (
                                            <div className="text-sm text-muted-foreground mt-1 space-y-1">
                                              {activity.metadata.filter_applied && (
                                                <p><strong>Filter:</strong> {activity.metadata.filter_applied}</p>
                                              )}
                                              {activity.metadata.export_format && (
                                                <p><strong>Format:</strong> {activity.metadata.export_format}</p>
                                              )}
                                              {activity.metadata.data_count && (
                                                <p><strong>Records:</strong> {activity.metadata.data_count}</p>
                                              )}
                                              {activity.metadata.scheme_filter && (
                                                <p><strong>Scheme:</strong> {activity.metadata.scheme_filter}</p>
                                              )}
                                              {activity.metadata.region_filter && (
                                                <p><strong>Region:</strong> {activity.metadata.region_filter}</p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground ml-4">
                                          {format(new Date(activity.timestamp), 'HH:mm:ss')}
                                        </div>
                                      </div>
                                      <div className="flex gap-2 mt-2">
                                        <Badge 
                                          variant={
                                            activity.activity_type === 'file_download' ? "default" :
                                            activity.activity_type === 'data_export' ? "secondary" :
                                            activity.activity_type === 'page_visit' ? "outline" :
                                            activity.activity_type.includes('filter') ? "destructive" :
                                            "outline"
                                          }
                                          className="text-xs"
                                        >
                                          {activity.activity_type.replace('_', ' ')}
                                        </Badge>
                                        {activity.activity_type === 'data_export' && activity.metadata?.record_count && (
                                          <Badge variant="outline" className="text-xs">
                                            {activity.metadata.record_count} records
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}