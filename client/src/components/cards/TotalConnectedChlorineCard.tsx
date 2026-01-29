import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Droplet } from "lucide-react";

interface TotalConnectedChlorineCardProps {
  totalSensors: number;
}

export function TotalConnectedChlorineCard({ totalSensors }: TotalConnectedChlorineCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-xl transition-all duration-200 border-0 overflow-hidden relative transform hover:scale-[1.02] dashboard-card">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-white"></div>
      <div className="absolute bottom-0 right-0 opacity-10">
        <Droplet className="h-24 w-24 text-teal-500" />
      </div>
      <CardContent className="relative p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full p-2 shadow-md">
            <Droplet className="h-6 w-6 text-white card-icon" />
          </div>
          <h3 className="ml-3 text-lg font-bold text-teal-800">
            Total Connected ESRs
          </h3>
        </div>
        <p className="text-5xl font-bold text-teal-600">{totalSensors}</p>
        <p className="text-sm text-teal-600/80 mt-2 font-medium">Total chlorine sensors connected</p>
      </CardContent>
    </Card>
  );
}

export default TotalConnectedChlorineCard;