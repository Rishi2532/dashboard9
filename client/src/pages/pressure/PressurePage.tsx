import React from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import PressureDashboard from "./PressureDashboard";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import Sidebar from "@/components/dashboard/sidebar";

const PressurePage: React.FC = () => {
  const [location] = useLocation();

  return (
    <DashboardLayout>
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 px-4">
          <div className="w-full">
            <PressureDashboard />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PressurePage;
