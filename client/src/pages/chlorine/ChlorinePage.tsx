import DashboardLayout from "@/components/dashboard/dashboard-layout";
import Sidebar from "@/components/dashboard/sidebar";
import ChlorineDashboard from "./ChlorineDashboard";

const ChlorinePage = () => {
  return (
    <DashboardLayout>
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 px-4">
          <div className="w-full">
            <ChlorineDashboard />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChlorinePage;
