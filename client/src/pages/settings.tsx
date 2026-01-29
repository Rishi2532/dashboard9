import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Configure dashboard preferences and account settings
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            This feature is under development and will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-700">
            The settings section will allow you to customize your dashboard experience:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-neutral-600">
            <li>User profile management</li>
            <li>Notification preferences</li>
            <li>Dashboard display options</li>
            <li>Data refresh intervals</li>
            <li>Export formats and preferences</li>
          </ul>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
