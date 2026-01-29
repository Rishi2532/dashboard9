import AdminDashboard from './dashboard';
import ManageReports from './manage-reports';

// Admin module with sub-components
const Admin = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Admin Portal</h1>
        <p className="text-gray-600 mb-8">
          Welcome to the Maharashtra Water Dashboard administration portal. Please select an option below.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AdminCard 
            title="Dashboard"
            description="View system statistics and performance metrics"
            link="/admin/dashboard"
          />
          
          <AdminCard 
            title="Import Data"
            description="Upload and import data from Excel or CSV files"
            link="/admin/import-data"
          />
          
          <AdminCard 
            title="Manage Reports"
            description="Upload and manage Excel report files"
            link="/admin/manage-reports"
          />
          
          <AdminCard 
            title="Chlorine Data"
            description="Manage chlorine analyzer data"
            link="/admin/chlorine-import"
          />
          
          <AdminCard 
            title="Help Desk Administration"
            description="Manage support tickets and user requests"
            link="/admin/helpdesk"
          />
        </div>
      </div>
    </div>
  );
};

// Card component for admin options
const AdminCard = ({ title, description, link }: { title: string; description: string; link: string }) => {
  return (
    <a 
      href={link}
      className="block p-6 bg-white shadow-md rounded-lg hover:shadow-lg transition-shadow border border-gray-100"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </a>
  );
};

// Export main component and sub-components
Admin.Dashboard = AdminDashboard;
Admin.ManageReports = ManageReports;

export default Admin;