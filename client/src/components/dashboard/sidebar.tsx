import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  GitBranchPlus,
  MapPin,
  BarChart2,
  Settings,
  ShieldCheck,
  Menu,
  X,
  Droplet,
  Gauge,
  Flame,
  Wifi,
  PieChart,
  Map,
  FileText,
  HelpCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";

// Define the type for navigation items
type NavigationItem = {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  prefix?: string;
  adminOnly?: boolean;
  userOnly?: boolean;
};

const navigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Schemes", href: "/schemes", icon: GitBranchPlus },
  { name: "Regions", href: "/regions", icon: MapPin },
  // { name: "Maharashtra Map", href: "/maharashtra-map", icon: Map },
  { name: "Reports", href: "/reports", icon: BarChart2 },
  { name: "Smart Reports", href: "/smart-reports", icon: FileText },

  { name: "Village LPCD", href: "/lpcd", icon: Droplet },
  { name: "Scheme LPCD", href: "/scheme-lpcd", icon: Droplet },
  { name: "Chlorine Monitoring", href: "/chlorine", prefix: "CL" },
  { name: "Pressure Monitoring", href: "/pressure", icon: Gauge },
  { name: "Water Consumption", href: "/water-consumption", prefix: "WC" },
  { name: "Communication Status", href: "/communication", icon: Wifi },
  { name: "MQTT Topic Config", href: "/mqtt-topic-config", icon: Settings },
  { name: "MQTT Topic Config", href: "/mqtt-topic-config", icon: Settings },
  { name: "Issue Reporting", href: "/helpdesk/issue-reporting", icon: FileText, userOnly: true },
  { name: "Raise Issue", href: "/helpdesk/raise-issue", icon: FileText, userOnly: true },
  { name: "Track Tickets", href: "/helpdesk/track-tickets", icon: HelpCircle, adminOnly: true },
  // { name: "Settings", href: "/settings", icon: Settings },
];

interface AuthStatusResponse {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export default function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Check if user is admin
  const { data: authData } = useQuery<AuthStatusResponse>({
    queryKey: ["/api/auth/status"],
    refetchOnWindowFocus: false,
  });

  // Store sidebar state in localStorage to persist between page loads
  useEffect(() => {
    const storedState = localStorage.getItem("sidebarOpen");
    if (storedState !== null) {
      setIsOpen(storedState === "true");
    }
  }, []);

  // Update localStorage when sidebar state changes
  useEffect(() => {
    localStorage.setItem("sidebarOpen", isOpen.toString());
  }, [isOpen]);

  // Use the Sheet component for both mobile and desktop
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-blue-700"
          aria-label="Menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[250px] p-0 bg-blue-50 border-r border-blue-200 shadow-xl z-[10000]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="p-4 border-b border-blue-100">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-left text-blue-900">
              Navigation
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-blue-100"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4 text-blue-700" />
            </Button>
          </div>
        </SheetHeader>
        <div className="flex-1 flex flex-col pt-2 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1 py-4">
            {navigationItems.map((item) => {
              // Skip admin-only items if user is not admin
              if (item.adminOnly && !authData?.isAdmin) {
                return null;
              }

              // Skip user-only items if user is admin
              if (item.userOnly && authData?.isAdmin) {
                return null;
              }

              const isActive = location === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    isActive
                      ? "bg-blue-100 text-blue-800"
                      : "text-neutral-600 hover:bg-blue-50 hover:text-blue-800",
                    "group flex items-center px-3 py-3 text-base font-medium rounded-md",
                  )}
                >
                  {item.icon ? (
                    // Render the icon if present
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5",
                        isActive ? "text-blue-600" : "text-blue-500",
                      )}
                    />
                  ) : item.prefix ? (
                    // Render the prefix if present
                    <span
                      className={cn(
                        "mr-3 inline-flex items-center justify-center",
                        isActive ? "text-blue-600" : "text-blue-500",
                      )}
                    >
                      {item.prefix}
                    </span>
                  ) : null}
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
