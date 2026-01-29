import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { formatToIST } from "@/utils/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff, CheckCircle, AlertCircle, Settings, Zap, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { mqttTopicConfigurationFormSchema, type MqttTopicConfigurationForm } from "@shared/schema";

interface TopicStatus {
  isOnline: boolean;
  lastValue?: string;
  lastSeen?: string;
}

interface TopicSelection {
  flowMeter: boolean;
  cl: boolean;
  pressure: boolean;
}

interface AuthStatusResponse {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

const MqttTopicConfiguration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Check if user is admin
  const { data: authData } = useQuery<AuthStatusResponse>({
    queryKey: ["/api/auth/status"],
    refetchOnWindowFocus: false,
  });
  const [topicSelection, setTopicSelection] = useState<TopicSelection>({
    flowMeter: false,
    cl: false,
    pressure: false,
  });
  const [topicStatuses, setTopicStatuses] = useState<Record<string, TopicStatus>>({});

  const form = useForm<MqttTopicConfigurationForm>({
    resolver: zodResolver(mqttTopicConfigurationFormSchema),
    defaultValues: {
      region: "",
      circle: "",
      division: "",
      sub_division: "",
      block: "",
      scheme_id: "",
      scheme_name: "",
      village: "",
      reservoir: "",
      submitted_by: "",
      flow_meter_topic: "",
      cl_topic: "",
      cl_type: undefined,
      pressure_topic: "",
    },
  });

  // Watch form values for real-time monitoring
  const flowMeterTopic = form.watch("flow_meter_topic");
  const clTopic = form.watch("cl_topic");
  const pressureTopic = form.watch("pressure_topic");

  // Function to check topic status
  const checkTopicStatus = async (topicId: string): Promise<TopicStatus> => {
    if (!topicId || topicId.trim() === "") {
      return { isOnline: false };
    }
    
    try {
      const response = await fetch(`/api/topic-status/${encodeURIComponent(topicId)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch topic status");
      }
      const data = await response.json();
      return {
        isOnline: data.isOnline || false,
        lastValue: data.lastValue,
        lastSeen: data.lastSeen,
      };
    } catch (error) {
      console.error("Error checking topic status:", error);
      return { isOnline: false };
    }
  };

  // Real-time topic monitoring
  useEffect(() => {
    const checkAllTopics = async () => {
      const topics = [];
      if (topicSelection.flowMeter && flowMeterTopic) {
        topics.push({ key: "flowMeter", topic: flowMeterTopic });
      }
      if (topicSelection.cl && clTopic) {
        topics.push({ key: "cl", topic: clTopic });
      }
      if (topicSelection.pressure && pressureTopic) {
        topics.push({ key: "pressure", topic: pressureTopic });
      }

      const newStatuses: Record<string, TopicStatus> = {};
      for (const { key, topic } of topics) {
        const status = await checkTopicStatus(topic);
        newStatuses[key] = status;
      }
      setTopicStatuses(newStatuses);
    };

    if (Object.values(topicSelection).some(Boolean)) {
      checkAllTopics();
      // Set up interval for real-time monitoring
      const interval = setInterval(checkAllTopics, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [topicSelection, flowMeterTopic, clTopic, pressureTopic]);

  // Check if all selected topics are communicating
  const allTopicsCommunicating = () => {
    const selectedTopics = [];
    if (topicSelection.flowMeter && flowMeterTopic) selectedTopics.push("flowMeter");
    if (topicSelection.cl && clTopic) selectedTopics.push("cl");
    if (topicSelection.pressure && pressureTopic) selectedTopics.push("pressure");

    if (selectedTopics.length === 0) return true; // No topics selected, can submit

    return selectedTopics.every((key) => topicStatuses[key]?.isOnline);
  };

  // Submit form
  const submitMutation = useMutation({
    mutationFn: async (data: MqttTopicConfigurationForm) => {
      const response = await apiRequest("/api/mqtt-topic-config", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "MQTT topic configuration has been successfully submitted.",
      });
      form.reset({
        region: "",
        circle: "",
        division: "",
        sub_division: "",
        block: "",
        scheme_id: "",
        scheme_name: "",
        village: "",
        reservoir: "",
        submitted_by: "",
        flow_meter_topic: "",
        cl_topic: "",
        cl_type: undefined,
        pressure_topic: "",
      });
      setTopicSelection({ flowMeter: false, cl: false, pressure: false });
      setTopicStatuses({});
      queryClient.invalidateQueries({ queryKey: ["/api/mqtt-topic-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error?.message || "Failed to submit configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: MqttTopicConfigurationForm) => {
    setIsSubmitting(true);
    try {
      // Filter out empty topic fields
      const filteredData = {
        ...data,
        flow_meter_topic: topicSelection.flowMeter ? data.flow_meter_topic : undefined,
        cl_topic: topicSelection.cl ? data.cl_topic : undefined,
        cl_type: topicSelection.cl ? data.cl_type : undefined,
        pressure_topic: topicSelection.pressure ? data.pressure_topic : undefined,
      };

      await submitMutation.mutateAsync(filteredData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excel download function
  const handleExcelDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch("/api/mqtt-topic-config/export", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download Excel file");
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "mqtt-topic-configurations.xlsx";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Excel file downloaded successfully",
      });
    } catch (error) {
      console.error("Excel download error:", error);
      toast({
        title: "Error",
        description: "Failed to download Excel file",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Topic status display component
  const TopicStatusDisplay = ({ 
    topicKey, 
    topicName, 
    topicValue 
  }: { 
    topicKey: string; 
    topicName: string; 
    topicValue: string 
  }) => {
    const status = topicStatuses[topicKey];
    if (!status) return null;

    return (
      <div className="mt-2 p-3 rounded-lg border bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status.isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">{topicName}</span>
            <Badge variant={status.isOnline ? "default" : "destructive"} className="text-xs">
              {status.isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>
        {status.isOnline && status.lastValue && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            <p><strong>Latest Value:</strong> {status.lastValue}</p>
            {status.lastSeen && (
              <p><strong>Last Seen:</strong> {formatToIST(status.lastSeen)}</p>
            )}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">
          <strong>Topic:</strong> {topicValue}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="h-6 w-6" />
                MQTT Topic Configuration
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Configure MQTT topics for water infrastructure monitoring
              </p>
            </div>
            
            {/* Admin Excel Download Button */}
            {authData?.isAdmin && (
              <Button
                onClick={handleExcelDownload}
                disabled={isDownloading}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-download-excel"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isDownloading ? "Downloading..." : "Download Excel"}
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Configuration Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-region" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="circle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Circle *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-circle" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="division"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Division *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-division" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sub_division"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub Division *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-sub-division" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="block"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Block *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-block" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheme_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scheme ID *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-scheme-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheme_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scheme Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-scheme-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="village"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Village *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-village" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reservoir"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reservoir *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-reservoir" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="submitted_by"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Submitted By (Person Name) *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your full name" data-testid="input-submitted-by" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Topic Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Topic Selection (Optional)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select the topics you want to configure for monitoring
                  </p>

                  {/* Flow Meter Topic */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="flow-meter"
                        checked={topicSelection.flowMeter}
                        onCheckedChange={(checked) =>
                          setTopicSelection({ ...topicSelection, flowMeter: !!checked })
                        }
                        data-testid="checkbox-flow-meter"
                      />
                      <label htmlFor="flow-meter" className="font-medium">
                        Topic for Flow Meter
                      </label>
                    </div>
                    {topicSelection.flowMeter && (
                      <FormField
                        control={form.control}
                        name="flow_meter_topic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flow Meter Topic</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., water/flow/meter/001" data-testid="input-flow-meter-topic" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {topicSelection.flowMeter && flowMeterTopic && (
                      <TopicStatusDisplay 
                        topicKey="flowMeter" 
                        topicName="Flow Meter" 
                        topicValue={flowMeterTopic}
                      />
                    )}
                  </div>

                  {/* CL Topic */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="cl-topic"
                        checked={topicSelection.cl}
                        onCheckedChange={(checked) =>
                          setTopicSelection({ ...topicSelection, cl: !!checked })
                        }
                        data-testid="checkbox-cl"
                      />
                      <label htmlFor="cl-topic" className="font-medium">
                        Topic for CL (Chlorine)
                      </label>
                    </div>
                    {topicSelection.cl && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="cl_topic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CL Topic</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., water/chlorine/sensor/001" data-testid="input-cl-topic" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="cl_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CL Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} data-testid="select-cl-type">
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select CL Type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="RS-485">RS-485</SelectItem>
                                  <SelectItem value="4-20mA">4-20mA</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    {topicSelection.cl && clTopic && (
                      <TopicStatusDisplay 
                        topicKey="cl" 
                        topicName="Chlorine (CL)" 
                        topicValue={clTopic}
                      />
                    )}
                  </div>

                  {/* Pressure Topic */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pressure-topic"
                        checked={topicSelection.pressure}
                        onCheckedChange={(checked) =>
                          setTopicSelection({ ...topicSelection, pressure: !!checked })
                        }
                        data-testid="checkbox-pressure"
                      />
                      <label htmlFor="pressure-topic" className="font-medium">
                        Topic for Pressure
                      </label>
                    </div>
                    {topicSelection.pressure && (
                      <FormField
                        control={form.control}
                        name="pressure_topic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pressure Topic</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., water/pressure/sensor/001" data-testid="input-pressure-topic" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {topicSelection.pressure && pressureTopic && (
                      <TopicStatusDisplay 
                        topicKey="pressure" 
                        topicName="Pressure" 
                        topicValue={pressureTopic}
                      />
                    )}
                  </div>
                </div>

                {/* Communication Status Summary */}
                {Object.values(topicSelection).some(Boolean) && (
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border">
                    <div className="flex items-center gap-2 mb-2">
                      {allTopicsCommunicating() ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      )}
                      <span className="font-medium">
                        Communication Status
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {allTopicsCommunicating()
                        ? "All selected topics are communicating properly. You can submit the form."
                        : "Some selected topics are not communicating. Please ensure all topics are online before submitting."}
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting || 
                      submitMutation.isPending ||
                      (Object.values(topicSelection).some(Boolean) && !allTopicsCommunicating())
                    }
                    className="min-w-32"
                    data-testid="button-submit"
                  >
                    {(isSubmitting || submitMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isSubmitting || submitMutation.isPending ? "Submitting..." : "Submit Configuration"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MqttTopicConfiguration;