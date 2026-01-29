import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Gauge } from "lucide-react";

interface TotalConnectedPressureCardProps {
  totalSensors: number;
}

export function TotalConnectedPressureCard({ totalSensors }: TotalConnectedPressureCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative transform hover:scale-[1.02] dashboard-card">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white"></div>
      <div className="absolute bottom-0 right-0 opacity-10">
        <Gauge className="h-24 w-24 text-blue-500" />
      </div>
      <CardContent className="relative p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full p-2 shadow-md">
            <Gauge className="h-6 w-6 text-white card-icon" />
          </div>
          <h3 className="ml-3 text-lg font-bold text-blue-800">
            Total Connected ESRs
          </h3>
        </div>
        <p className="text-5xl font-bold text-blue-600">{totalSensors}</p>
        <p className="text-sm text-blue-600/80 mt-2 font-medium">Total pressure sensors connected</p>
      </CardContent>
    </Card>
  );
}

export default TotalConnectedPressureCard;