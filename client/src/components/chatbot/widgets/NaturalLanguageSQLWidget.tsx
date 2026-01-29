import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Database, CheckCircle2, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NaturalLanguageSQLWidgetProps {
  query: string;
  sql: string;
  results: any[];
  explanation?: string;
  success: boolean;
  error?: string;
  rowCount?: number;
  truncated?: boolean;
}

export function NaturalLanguageSQLWidget({
  query,
  sql,
  results,
  explanation,
  success,
  error,
  rowCount = 0,
  truncated = false,
}: NaturalLanguageSQLWidgetProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Natural Language SQL Query
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Your Question</Badge>
            </div>
            <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded-lg italic">
              "{query}"
            </p>
          </div>

          {explanation && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Explanation</Badge>
              </div>
              <p className="text-sm bg-white dark:bg-gray-800 p-3 rounded-lg">
                {explanation}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <Badge variant="outline">Generated SQL</Badge>
            </div>
            <ScrollArea className="h-32">
              <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                {sql}
              </pre>
            </ScrollArea>
          </div>

          {success ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">
                  Results ({rowCount} rows{truncated ? ", truncated to 1000" : ""})
                </Badge>
              </div>
              
              {results.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {results.map((row, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(row).map(([key, value]) => (
                            <div key={key} className="flex flex-col">
                              <span className="font-medium text-gray-500 dark:text-gray-400 text-xs capitalize">
                                {key.replace(/_/g, " ")}
                              </span>
                              <span className="text-gray-900 dark:text-gray-100">
                                {value !== null && value !== undefined ? String(value) : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded-lg">
                  No results found.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20">
                  Error
                </Badge>
              </div>
              <p className="text-sm bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-lg">
                {error || "Unknown error occurred"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
