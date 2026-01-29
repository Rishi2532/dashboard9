import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Activity, Zap, Droplets, BarChart3, Wifi, WifiOff } from "lucide-react";

interface ESRMonitoring {
  id: number;
  region_name: string;
  circle: string;
  division: string;
  sub_division: string;
  block: string;
  scheme_id: string;
  scheme_name: string;
  village_name: string;
  esr_name: string;
  chlorine_connected: number;
  pressure_connected: number;
  flow_meter_connected: number;
  chlorine_status: string;
  pressure_status: string;
  flow_meter_status: string;
  overall_status: string;
  last_updated: string;
}

interface ESRStats {
  region_name: string;
  total_esr: number;
  online_chlorine: number;
  online_pressure: number;
  online_flow_meter: number;
  connected_chlorine: number;
  connected_pressure: number;
  connected_flow_meter: number;
}

export default function ESRDashboard() {
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: esrData, isLoading: esrLoading } = useQuery({
    queryKey: ["/api/esr", { region: selectedRegion, status: selectedStatus }],
  });

  const { data: esrStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/esr/stats"],
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return <Badge variant="default" className="bg-green-500"><Wifi className="w-3 h-3 mr-1" />Online</Badge>;
      case 'offline':
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getConnectedIcon = (connected: number) => {
    return connected === 1 ? 
      <Zap className="w-4 h-4 text-green-500" /> : 
      <div className="w-4 h-4 rounded-full bg-gray-300"></div>;
  };

  const regions = esrStats?.map((stat: ESRStats) => stat.region_name) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">ESR Monitoring Dashboard</h1>
          <p className="text-muted-foreground">Real-time monitoring of Elevated Storage Reservoirs across Maharashtra</p>
        </div>
      </div>

      {/* Regional Statistics Cards */}
      {!statsLoading && esrStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {esrStats.map((stat: ESRStats) => (
            <Card key={stat.region_name} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                  {stat.region_name}
                </CardTitle>
                <CardDescription>{stat.total_esr} ESR Locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center">
                      <Droplets className="w-4 h-4 mr-1 text-blue-400" />
                      Chlorine
                    </span>
                    <span className="text-sm font-medium">
                      {stat.online_chlorine}/{stat.connected_chlorine}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center">
                      <Activity className="w-4 h-4 mr-1 text-orange-400" />
                      Pressure
                    </span>
                    <span className="text-sm font-medium">
                      {stat.online_pressure}/{stat.connected_pressure}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm flex items-center">
                      <Zap className="w-4 h-4 mr-1 text-green-400" />
                      Flow Meter
                    </span>
                    <span className="text-sm font-medium">
                      {stat.online_flow_meter}/{stat.connected_flow_meter}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter ESR Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((region) => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Offline">Offline</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ESR Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>ESR Monitoring Details</CardTitle>
          <CardDescription>
            Detailed view of all ESR monitoring status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {esrLoading ? (
            <div className="text-center py-8">Loading ESR data...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region</TableHead>
                  <TableHead>Village</TableHead>
                  <TableHead>ESR Name</TableHead>
                  <TableHead>Sensors</TableHead>
                  <TableHead>Chlorine</TableHead>
                  <TableHead>Pressure</TableHead>
                  <TableHead>Flow Meter</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {esrData?.data?.map((esr: ESRMonitoring) => (
                  <TableRow key={esr.id}>
                    <TableCell className="font-medium">{esr.region_name}</TableCell>
                    <TableCell>{esr.village_name}</TableCell>
                    <TableCell>{esr.esr_name}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {getConnectedIcon(esr.chlorine_connected)}
                        {getConnectedIcon(esr.pressure_connected)}
                        {getConnectedIcon(esr.flow_meter_connected)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(esr.chlorine_status)}</TableCell>
                    <TableCell>{getStatusBadge(esr.pressure_status)}</TableCell>
                    <TableCell>{getStatusBadge(esr.flow_meter_status)}</TableCell>
                    <TableCell>{getStatusBadge(esr.overall_status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}