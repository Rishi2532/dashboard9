import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdvancedQueryWidgetProps {
  conditions: Array<{
    metric: string;
    operator: string;
    threshold?: number;
    range?: [number, number];
  }>;
  logicalOperator: "AND" | "OR";
  results: any[];
  filters?: {
    region?: string;
    scheme?: string;
    village?: string;
  };
}

export function AdvancedQueryWidget({
  conditions,
  logicalOperator,
  results,
  filters,
}: AdvancedQueryWidgetProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Advanced Multi-Condition Query Results
            <Badge variant="secondary" className="ml-2">
              {logicalOperator}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {conditions.map((condition, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {condition.metric} {condition.operator}
                    {condition.threshold !== undefined && ` ${condition.threshold}`}
                    {condition.range && ` ${condition.range[0]}-${condition.range[1]}`}
                  </Badge>
                  {idx < conditions.length - 1 && (
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {logicalOperator}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {filters && (
              <div className="flex gap-2 text-sm text-gray-600 dark:text-gray-400">
                {filters.region && <Badge variant="secondary">Region: {filters.region}</Badge>}
                {filters.scheme && <Badge variant="secondary">Scheme: {filters.scheme}</Badge>}
                {filters.village && <Badge variant="secondary">Village: {filters.village}</Badge>}
              </div>
            )}

            <div className="mt-4">
              <p className="text-sm font-semibold mb-2">
                Found {results.length} matching results:
              </p>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {results.map((result, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(result).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>{" "}
                          <span className="text-gray-600 dark:text-gray-400">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
