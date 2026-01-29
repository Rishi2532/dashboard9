/**
 * Helpdesk Analytics Widget
 * Displays ticket statistics and trends
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface HelpdeskAnalyticsWidgetProps {
  analytics: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    recentTrends: {
      thisWeek: number;
      lastWeek: number;
      thisMonth: number;
    };
  };
}

export default function HelpdeskAnalyticsWidget({ analytics }: HelpdeskAnalyticsWidgetProps) {
  const getTrendIcon = () => {
    const { thisWeek, lastWeek } = analytics.recentTrends;
    if (thisWeek > lastWeek) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (thisWeek < lastWeek) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendText = () => {
    const { thisWeek, lastWeek } = analytics.recentTrends;
    if (thisWeek > lastWeek) {
      const increase = ((thisWeek - lastWeek) / (lastWeek || 1) * 100).toFixed(0);
      return `${increase}% increase`;
    }
    if (thisWeek < lastWeek) {
      const decrease = ((lastWeek - thisWeek) / lastWeek * 100).toFixed(0);
      return `${decrease}% decrease`;
    }
    return "No change";
  };

  return (
    <Card className="w-full max-w-2xl shadow-lg border-2 border-indigo-100">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-100">
        <CardTitle className="text-lg font-bold text-indigo-900">
          Ticket Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-600 mb-1">Total Tickets</p>
            <p className="text-2xl font-bold text-blue-900">{analytics.total}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-xs font-semibold text-purple-600 mb-1">This Week</p>
            <p className="text-2xl font-bold text-purple-900">{analytics.recentTrends.thisWeek}</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <p className="text-xs font-semibold text-indigo-600 mb-1">This Month</p>
            <p className="text-2xl font-bold text-indigo-900">{analytics.recentTrends.thisMonth}</p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Weekly Trend</p>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className="text-xs text-gray-600">{getTrendText()}</span>
            </div>
          </div>
          <div className="flex gap-2 text-xs text-gray-600">
            <span>Last week: {analytics.recentTrends.lastWeek}</span>
            <span>→</span>
            <span>This week: {analytics.recentTrends.thisWeek}</span>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Status Breakdown</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(analytics.byStatus).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  {status === "Open" && <AlertCircle className="w-4 h-4 text-blue-600" />}
                  {status === "In Progress" && <Clock className="w-4 h-4 text-purple-600" />}
                  {(status === "Resolved" || status === "Closed") && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                  <span className="text-sm text-gray-700">{status}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Priority Distribution</p>
          <div className="space-y-2">
            {Object.entries(analytics.byPriority).map(([priority, count]) => {
              const percentage = (count / analytics.total * 100).toFixed(0);
              const colorClass =
                priority === "High"
                  ? "bg-red-500"
                  : priority === "Medium"
                  ? "bg-yellow-500"
                  : "bg-green-500";

              return (
                <div key={priority}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{priority}</span>
                    <span className="text-gray-600">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${colorClass} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {Object.keys(analytics.byCategory).length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Top Categories</p>
            <div className="space-y-1">
              {Object.entries(analytics.byCategory)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([category, count]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                  >
                    <span className="text-sm text-gray-700 truncate flex-1">{category}</span>
                    <Badge variant="secondary" className="text-xs ml-2">
                      {count}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
