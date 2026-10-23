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
            title="Engineers Hierarchy"
            description="View CE, SE, EE, DE/AE roster, alerts sent, last 30 logins & actions taken"
            link="/admin/users"
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

          <AdminCard 
            title="Field Issue Reports"
            description="Download all issue reports & justifications submitted by engineers across schemes, villages, and ESRs"
            link="/helpdesk/issue-reporting"
            downloadUrl="/api/issue-reporting/export-excel"
            downloadLabel="Download Excel (.xlsx)"
          />
        </div>
      </div>
    </div>
  );
};

// Card component for admin options
const AdminCard = ({ 
  title, 
  description, 
  link,
  downloadUrl,
  downloadLabel
}: { 
  title: string; 
  description: string; 
  link: string;
  downloadUrl?: string;
  downloadLabel?: string;
}) => {
  return (
    <div className="flex flex-col justify-between p-6 bg-white shadow-md rounded-lg hover:shadow-lg transition-shadow border border-gray-100">
      <div>
        <a href={link} className="hover:text-blue-600 transition-colors">
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
        </a>
        <p className="text-gray-600 mb-4">{description}</p>
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <a 
          href={link}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
        >
          Open Page &rarr;
        </a>
        {downloadUrl && (
          <a
            href={downloadUrl}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all"
          >
            <span>{downloadLabel || "Download (.xlsx)"}</span>
          </a>
        )}
      </div>
    </div>
  );
};

// Export main component and sub-components
Admin.Dashboard = AdminDashboard;
Admin.ManageReports = ManageReports;

export default Admin;