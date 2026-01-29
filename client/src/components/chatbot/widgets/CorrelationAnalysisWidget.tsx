import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CorrelationAnalysisWidgetProps {
  metric1: string;
  metric2: string;
  correlationData: {
    coefficient: number;
    dataPoints: number;
    interpretation: string;
    direction: string;
    samples: any[];
  };
  filters?: {
    region?: string;
    scheme?: string;
    village?: string;
  };
}

export function CorrelationAnalysisWidget({
  metric1,
  metric2,
  correlationData,
  filters,
}: CorrelationAnalysisWidgetProps) {
  const getCorrelationIcon = () => {
    if (correlationData.direction === "Positive") return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (correlationData.direction === "Negative") return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-gray-500" />;
  };

  const getCorrelationColor = () => {
    const abs = Math.abs(correlationData.coefficient);
    if (abs > 0.7) return "text-green-600 dark:text-green-400";
    if (abs > 0.4) return "text-yellow-600 dark:text-yellow-400";
    if (abs > 0.2) return "text-orange-600 dark:text-orange-400";
    return "text-gray-600 dark:text-gray-400";
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Correlation Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-lg font-semibold capitalize">
                {metric1.replace(/_/g, " ")}
              </div>
              <span className="text-gray-400">vs</span>
              <div className="text-lg font-semibold capitalize">
                {metric2.replace(/_/g, " ")}
              </div>
            </div>

            {filters && (
              <div className="flex gap-2 text-sm">
                {filters.region && <Badge variant="secondary">Region: {filters.region}</Badge>}
                {filters.scheme && <Badge variant="secondary">Scheme: {filters.scheme}</Badge>}
                {filters.village && <Badge variant="secondary">Village: {filters.village}</Badge>}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {getCorrelationIcon()}
                </div>
                <div className={`text-2xl font-bold ${getCorrelationColor()}`}>
                  {correlationData.coefficient.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Coefficient</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {correlationData.dataPoints}
                </div>
                <div className="text-xs text-gray-500 mt-1">Data Points</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className={`text-sm font-semibold ${getCorrelationColor()}`}>
                  {correlationData.interpretation}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {correlationData.direction} Direction
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold mb-2">Sample Data:</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {correlationData.samples.map((sample, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-gray-800 rounded p-2 flex justify-between text-sm"
                  >
                    <span className="capitalize">
                      {sample.village_name} ({sample.region_name})
                    </span>
                    <span className="font-mono">
                      {Number(sample.metric1_value).toFixed(2)} ↔{" "}
                      {Number(sample.metric2_value).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Interpretation:</strong>{" "}
                {correlationData.coefficient > 0
                  ? `As ${metric1.replace(/_/g, " ")} increases, ${metric2.replace(/_/g, " ")} tends to ${Math.abs(correlationData.coefficient) > 0.4 ? "significantly" : "slightly"} increase.`
                  : correlationData.coefficient < 0
                    ? `As ${metric1.replace(/_/g, " ")} increases, ${metric2.replace(/_/g, " ")} tends to ${Math.abs(correlationData.coefficient) > 0.4 ? "significantly" : "slightly"} decrease.`
                    : `There is no significant relationship between ${metric1.replace(/_/g, " ")} and ${metric2.replace(/_/g, " ")}.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
