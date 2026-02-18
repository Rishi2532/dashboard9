import { Button } from "../ui/button";
import {
  Activity,
  LayoutDashboard,
  TrendingUp,
  FileBarChart,
  UserCircle,
  Settings,
  Droplet,
  LogOut,
  DropletIcon,
  Globe,
  Moon,
  Sun,
  Home,
  GitBranchPlus,
  MapPin,
  BarChart2,
  PieChart,
  Flame,
  Gauge,
  Wifi,
  Menu,
  HelpCircle,
  FileText,
  MessageSquare,
  MapPinned,
  ChevronDown,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import Sidebar from "./sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { LanguageSelectorMinimal } from "../ui/language-selector";
import { useTranslation } from "../../contexts/TranslationContext";
import { TranslatedText } from "../ui/translated-text";
import { useTheme } from "../theme/theme-provider";
import { useChatbot } from "../../contexts/ChatbotContext";

interface AuthStatusResponse {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { openChatbot } = useChatbot();

  const { data: authData } = useQuery<AuthStatusResponse>({
    queryKey: ["/api/auth/status"],
    refetchOnWindowFocus: false,
  });

  const [, setLocation] = useLocation();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      return response.json();
    },
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="sticky top-0 z-[9999] overflow-visible">
      {/* Top Bar - Government Style */}
      {/* <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 h-1"></div> */}

      {/* Main Header */}
      <div className="bg-white shadow-sm border-b-2 border-cyan-500">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Section - Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <Sidebar />
              </div>
              <div className="hidden lg:block">
                <Sidebar />
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-white rounded-lg p-1 shadow-md">
                  <img
                    src="/images/jal-jeevan-mission-logo.png"
                    alt="Jal Jeevan Mission"
                    className="h-10 w-10 object-contain"
                  />
                </div>

                <div>
                  <h1 className="font-bold text-sm sm:text-base text-gray-800 tracking-wide flex items-center gap-2">
                    <TranslatedText>
                      STATE WATER AND SANITATION MISSION
                    </TranslatedText>
                    <span className="hidden md:inline-flex px-2 py-0.5 bg-cyan-500 rounded text-[10px] font-bold text-white">
                      MAHARASHTRA
                    </span>
                  </h1>
                  <p className="text-[10px] sm:text-xs text-gray-600 hidden sm:flex items-center gap-2">
                    <TranslatedText>
                      Water Supply & Sanitation Dept., Govt. of Maharashtra
                    </TranslatedText>
                    {/* <span className="bg-teal-600 px-1.5 py-0.5 rounded text-[9px] font-medium text-white">
                      Developed by CSTECH<sup>Ai</sup>
                    </span> */}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2">
              <div className="lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-100 h-8 w-8 p-0"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>

              {authData?.isLoggedIn && !authData?.isAdmin && (
                <>
                  <Link href="/helpdesk/issue-reporting">
                    <Button
                      size="sm"
                      className="hidden sm:flex bg-cyan-500 hover:bg-cyan-600 text-white h-8 text-xs font-semibold mr-2"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Issue Reporting
                    </Button>
                  </Link>
                  <Link href="/helpdesk/raise-issue">
                    <Button
                      size="sm"
                      className="hidden sm:flex bg-cyan-500 hover:bg-cyan-600 text-white h-8 text-xs font-semibold"
                    >
                      <HelpCircle className="h-3.5 w-3.5 mr-1" />
                      Help Desk
                    </Button>
                  </Link>
                </>
              )}

              {authData?.isAdmin && (
                <>
                  <Link href="/helpdesk/track-tickets">
                    <Button
                      size="sm"
                      className="hidden sm:flex bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs font-semibold"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Track Issues
                    </Button>
                  </Link>
                  <Link href="/admin">
                    <Button
                      size="sm"
                      className="hidden sm:flex bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs font-semibold"
                    >
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      Admin
                    </Button>
                  </Link>
                </>
              )}

              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white h-8 w-8 p-0 font-semibold"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="hidden lg:block bg-cyan-500 shadow-sm">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-1 h-10">
            {/* <Link href="/home">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-blue-700 h-8 px-3 text-xs font-medium"
              >
                <Home className="h-3.5 w-3.5 mr-1.5" />
                Home
              </Button>
            </Link> */}
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black hover:bg-opacity-20 h-8 px-3 text-xs font-medium"
              >
                <BarChart2 className="h-3.5 w-3.5 mr-1.5" />
                Dashboard
              </Button>
            </Link>
            <Link href="/schemes">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black hover:bg-opacity-20 h-8 px-3 text-xs font-medium"
              >
                <GitBranchPlus className="h-3.5 w-3.5 mr-1.5" />
                Schemes
              </Button>
            </Link>

            <Link href="/chlorine/detailed">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black hover:bg-opacity-20 h-8 px-3 text-xs font-medium"
              >
                <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                Detailed Regional Statistics
              </Button>
            </Link>

            <Link href="/regions">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black hover:bg-opacity-20 h-8 px-3 text-xs font-medium"
              >
                <MapPin className="h-3.5 w-3.5 mr-1.5" />
                Regions
              </Button>
            </Link>
            <Link href="/reports">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black hover:bg-opacity-20 h-8 px-3 text-xs font-medium"
              >
                <BarChart2 className="h-3.5 w-3.5 mr-1.5" />
                Reports
              </Button>
            </Link>
            {/* <Link href="/hierarchy">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-teal-800 h-8 px-3 text-xs font-medium"
              >
                <PieChart className="h-3.5 w-3.5 mr-1.5" />
                Heatmap
              </Button>
            </Link> */}

            {/* LPCD Dropdown */}
            <div className="relative group">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black hover:bg-opacity-20 h-8 px-3 text-xs font-medium"
              >
                <Droplet className="h-3.5 w-3.5 mr-1.5" />
                LPCD
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              <div className="absolute top-full left-0 mt-0 w-36 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link href="/lpcd">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-700 hover:bg-gray-100 px-3 h-9 text-xs rounded-none rounded-t-md font-semibold"
                  >
                    <Droplet className="h-3 w-3 mr-2" />
                    Village LPCD
                  </Button>
                </Link>
                <Link href="/scheme-lpcd">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-700 hover:bg-gray-100 px-3 h-9 text-xs rounded-none rounded-b-md font-semibold"
                  >
                    <GitBranchPlus className="h-3 w-3 mr-2" />
                    Scheme LPCD
                  </Button>
                </Link>
              </div>
            </div>

            <Link href="/chlorine">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black hover:bg-opacity-20 h-8 px-3 text-xs font-medium"
              >
                <Flame className="h-3.5 w-3.5 mr-1.5" />
                Chlorine
              </Button>
            </Link>
            <Link href="/pressure">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black hover:bg-opacity-20 h-8 px-3 text-xs font-medium"
              >
                <Gauge className="h-3.5 w-3.5 mr-1.5" />
                Pressure
              </Button>
            </Link>
            <Link href="/water-consumption">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black hover:bg-opacity-20 h-8 px-3 text-xs font-medium"
              >
                <Droplet className="h-3.5 w-3.5 mr-1.5" />
                Water
              </Button>
            </Link>
            <Link href="/communication-status">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-black hover:bg-opacity-20 h-8 px-3 text-xs font-medium"
              >
                <Wifi className="h-3.5 w-3.5 mr-1.5" />
                Communication
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={openChatbot}
              className="bg-purple-600 hover:bg-purple-700 text-white h-8 px-3 text-xs font-semibold ml-2"
              data-testid="button-header-chatbot"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              जलमित्र
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t-2 border-cyan-500">
          <div className="px-4 py-2 space-y-1 max-h-[60vh] overflow-y-auto">
            <Link href="/home" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <BarChart2 className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link
              href="/chlorine/detailed"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Detailed Regional Statistics
              </Button>
            </Link>

            <Link href="/schemes" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <GitBranchPlus className="h-4 w-4 mr-2" />
                Schemes
              </Button>
            </Link>

            <Link href="/regions" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Regions
              </Button>
            </Link>
            <Link href="/reports" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <BarChart2 className="h-4 w-4 mr-2" />
                Reports
              </Button>
            </Link>
            {/* <Link href="/hierarchy" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <PieChart className="h-4 w-4 mr-2" />
                Heatmap
              </Button>
            </Link> */}
            <Link href="/lpcd" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <Droplet className="h-4 w-4 mr-2" />
                Village LPCD
              </Button>
            </Link>
            <Link
              href="/scheme-lpcd"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <GitBranchPlus className="h-4 w-4 mr-2" />
                Scheme LPCD
              </Button>
            </Link>
            <Link href="/chlorine" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <Flame className="h-4 w-4 mr-2" />
                Chlorine
              </Button>
            </Link>
            <Link href="/pressure" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <Gauge className="h-4 w-4 mr-2" />
                Pressure
              </Button>
            </Link>
            <Link
              href="/water-consumption"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <Droplet className="h-4 w-4 mr-2" />
                Water
              </Button>
            </Link>
            <Link
              href="/communication-status"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:bg-gray-100 h-10 font-semibold"
              >
                <Wifi className="h-4 w-4 mr-2" />
                Communication
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                openChatbot();
                setIsMobileMenuOpen(false);
              }}
              className="w-full justify-start text-purple-600 hover:bg-gray-100 h-10 font-semibold"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              जलमित्र
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
