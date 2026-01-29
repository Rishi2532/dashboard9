import DashboardLayout from "@/components/dashboard/dashboard-layout";
import Sidebar from "@/components/dashboard/sidebar";
import SchemeVillageHeatmap from "@/components/dashboard/scheme-village-heatmap";

const HierarchyPage = () => {
  return (
    <DashboardLayout>
      <div className="w-full h-full">
        {/* Full width layout without sidebar constraints */}
        <div className="w-full px-2 py-2">
          <SchemeVillageHeatmap />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HierarchyPage;
