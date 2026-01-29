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
      <div className="flex h-full">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 px-4">
          <div className="w-full">
            <div className="mb-6">
              {/* <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Pressure Monitoring
              </h1>
              <p className="text-gray-600">
                Monitor and analyze water pressure across multiple ESRs in all
                regions
              </p> */}
            </div>

            <Tabs defaultValue="dashboard" className="mb-6">
              <TabsContent value="dashboard" className="mt-0">
                <PressureDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PressurePage;
