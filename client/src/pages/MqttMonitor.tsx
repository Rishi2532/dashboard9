import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Wifi, WifiOff, Upload, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatToIST } from "@/utils/timezone";
import { useQuery } from "@tanstack/react-query";

interface TopicStatus {
  topic: string;
  status: "communicating" | "not communicated";
  last_seen: string | null;
  last_value: string | null;
}

type SensorType = "flow_meter" | "chlorine" | "pressure";
type ChlorineType = "4-20mA" | "Rs 485" | "";

export default function MqttMonitor() {
  const [topicId, setTopicId] = useState("");
  const [sensorType, setSensorType] = useState<SensorType | "">("");
  const [chlorineType, setChlorineType] = useState<ChlorineType | "">("");
  const [topicStatus, setTopicStatus] = useState<TopicStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: authStatus } = useQuery({
    queryKey: ['/api/auth/status'],
  });

  const handleCheckTopic = async () => {
    if (!topicId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a topic ID",
        variant: "destructive",
      });
      return;
    }

    if (!sensorType) {
      toast({
        title: "Error",
        description: "Please select a sensor type",
        variant: "destructive",
      });
      return;
    }

    if (sensorType === "chlorine" && !chlorineType) {
      toast({
        title: "Error",
        description: "Please select a chlorine type",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        sensor_type: sensorType,
        ...(sensorType === "chlorine" && chlorineType ? { chlorine_type: chlorineType } : {})
      });
      
      const response = await fetch(`/api/check-topic/${encodeURIComponent(topicId.trim())}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TopicStatus = await response.json();
      setTopicStatus(data);
      
      toast({
        title: "Topic Status Retrieved",
        description: `Status: ${data.status}`,
        variant: data.status === "communicating" ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error checking topic:", error);
      toast({
        title: "Error",
        description: "Failed to check topic status. Please try again.",
        variant: "destructive",
      });
      setTopicStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleCheckTopic();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Error",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/mqtt-topic-config/upload-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      toast({
        title: "Success",
        description: data.details ? 
          `Successfully imported ${data.count} configurations:\n${Object.entries(data.details).map(([server, count]) => `${server}: ${count}`).join(', ')}` :
          `Successfully imported ${data.count} MQTT topic configurations`,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error uploading Excel:", error);
      toast({
        title: "Error",
        description: "Failed to upload Excel file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/mqtt-topic-config/export');
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mqtt-topic-configurations-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Excel file downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading Excel:", error);
      toast({
        title: "Error",
        description: "Failed to download Excel file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDateTime = formatToIST;

  const getStatusBadge = (status: string) => {
    const isCommunicating = status === "communicating";
    return (
      <Badge 
        variant={isCommunicating ? "default" : "destructive"}
        className={`flex items-center gap-1 ${
          isCommunicating 
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
        }`}
      >
        {isCommunicating ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {isCommunicating ? "Communicating" : "Not Communicated"}
      </Badge>
    );
  };

  const isAdmin = (authStatus as any)?.isAdmin;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            MQTT Topic Monitor
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Check the communication status and latest values of MQTT topics
          </p>
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Controls - MQTT Configuration Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                    data-testid="input-excel-upload"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-upload-excel"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Excel
                      </>
                    )}
                  </Button>
                </div>
                <Button
                  onClick={handleDownloadExcel}
                  disabled={isDownloading}
                  variant="outline"
                  data-testid="button-download-excel"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Excel Report
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                Upload Excel file with 6 sheets named: Amravati, Nashik, Konkan, Pune, CS, and Nagpur. Each sheet should have 17 columns: Sr.No, Region, Circle, Division, Sub Division, Block, Scheme ID Name, Vendor, Village, Reservoir, Message Type, Topic For Flow Meter, Topic For CL, Type of CL, Topic For Pressure, Received Date, Date of Integration
              </p>
            </CardContent>
          </Card>
        )}

        {/* Search Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Topic Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sensor Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="sensor-type">Sensor Type</Label>
              <Select 
                value={sensorType} 
                onValueChange={(value: SensorType) => {
                  setSensorType(value);
                  if (value !== "chlorine") {
                    setChlorineType("");
                  }
                }}
              >
                <SelectTrigger id="sensor-type" data-testid="select-sensor-type">
                  <SelectValue placeholder="Select sensor type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flow_meter">Flow Meter</SelectItem>
                  <SelectItem value="chlorine">Chlorine</SelectItem>
                  <SelectItem value="pressure">Pressure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chlorine Type Selection (only shown when chlorine is selected) */}
            {sensorType === "chlorine" && (
              <div className="space-y-2">
                <Label htmlFor="chlorine-type">Chlorine Type</Label>
                <Select 
                  value={chlorineType} 
                  onValueChange={(value: ChlorineType) => setChlorineType(value)}
                >
                  <SelectTrigger id="chlorine-type" data-testid="select-chlorine-type">
                    <SelectValue placeholder="Select chlorine type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4-20mA">4-20mA</SelectItem>
                    <SelectItem value="Rs 485">Rs 485</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Topic ID Input */}
            <div className="flex gap-2">
              <Input
                data-testid="input-topic"
                type="text"
                placeholder="Enter topic ID (e.g., sensor/temperature/01)"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                data-testid="button-check"
                onClick={handleCheckTopic} 
                disabled={isLoading || !topicId.trim() || !sensorType || (sensorType === "chlorine" && !chlorineType)}
                className="min-w-[100px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Check
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Display */}
        {topicStatus && (
          <Card>
            <CardHeader>
              <CardTitle>Topic Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Topic ID */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Topic
                  </label>
                  <div 
                    data-testid="text-topic"
                    className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md font-mono text-sm break-all"
                  >
                    {topicStatus.topic}
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <div data-testid="status-badge">
                    {getStatusBadge(topicStatus.status)}
                  </div>
                </div>

                {/* Last Seen */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Seen
                  </label>
                  <div 
                    data-testid="text-lastseen"
                    className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm"
                  >
                    {formatDateTime(topicStatus.last_seen)}
                  </div>
                </div>

                {/* Last Value */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Value
                  </label>
                  <div 
                    data-testid="text-lastvalue"
                    className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm font-mono break-all"
                  >
                    {topicStatus.last_value || "No data"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>
                <strong>How to use:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Select the sensor type (Flow Meter, Chlorine, or Pressure)</li>
                <li>If Chlorine is selected, choose the chlorine type (4-20mA or Other)</li>
                <li>Enter the MQTT topic ID you want to monitor</li>
                <li>Click "Check" to retrieve the current status</li>
              </ol>
              
              <p className="mt-4">
                <strong>Communication Status Logic:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Flow Meter:</strong> Communicating if Flow_Error=0 AND Cl_Error=1</li>
                <li><strong>Chlorine (4-20mA):</strong> Communicating if (Flow_Error=1 AND Cl_Error=0) OR (both errors=1)</li>
                <li><strong>Chlorine (Rs 485):</strong> Communicating if Flow_Error=1 AND Cl_Error=0 (both=1 means not communicating)</li>
                <li><strong>Pressure:</strong> Standard 30-minute timeout check</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
