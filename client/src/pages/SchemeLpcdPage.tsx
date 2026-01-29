import DashboardLayout from "@/components/dashboard/dashboard-layout";
import Sidebar from "@/components/dashboard/sidebar";
import SchemeLpcdDashboard from "./scheme-lpcd/SchemeLpcdDashboard";

const SchemeLpcdPage = () => {
  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 px-4">
          <div className="w-full">
            <SchemeLpcdDashboard />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SchemeLpcdPage;