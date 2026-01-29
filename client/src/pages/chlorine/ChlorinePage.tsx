import DashboardLayout from "@/components/dashboard/dashboard-layout";
import Sidebar from "@/components/dashboard/sidebar";
import ChlorineDashboard from "./ChlorineDashboard";

const ChlorinePage = () => {
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
                Chlorine Monitoring
              </h1>
              <p className="text-gray-600">
                Monitor and analyze residual chlorine levels across multiple ESRs in all
                regions
              </p> */}
            </div>
            <ChlorineDashboard />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChlorinePage;
