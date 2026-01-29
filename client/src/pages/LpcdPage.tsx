import DashboardLayout from "@/components/dashboard/dashboard-layout";
import Sidebar from "@/components/dashboard/sidebar";
import EnhancedLpcdDashboard from "./lpcd/EnhancedLpcdDashboard";

const LpcdPage = () => {
  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 px-4">
          <div className="w-full">
            {/* <div className="border-b pb-2 mb-4">
              <h1 className="text-2xl font-bold">LPCD Dashboard</h1>
            </div> */}
            <EnhancedLpcdDashboard />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LpcdPage;
