import { ReactNode } from "react";
import Header from "./header";
import RegionFilterIndicator from "@/components/chatbot/RegionFilterIndicator";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="absolute inset-0 bg-[url('/images/water-pattern.svg')] opacity-[0.03] bg-repeat z-0 pointer-events-none"></div>
      <Header />
      <main className="flex-1 pt-6 sm:pt-8 lg:pt-10 2xl:pt-12 pb-4 sm:pb-6 lg:pb-8 2xl:pb-10 overflow-auto relative z-10">
        <div className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 max-w-full lg:max-w-[90rem] 2xl:max-w-[120rem]">
          {children}
        </div>
        {/* Region Filter Indicator */}
        <RegionFilterIndicator />
      </main>

      {/* Company footer */}
      <footer className="bg-gradient-to-r from-blue-50 to-blue-100 border-t border-blue-200 py-2 relative z-10">
        <div className="w-full mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 2xl:px-10 max-w-full lg:max-w-[90rem] 2xl:max-w-[120rem]">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center mb-1 sm:mb-0">
              <img
                src="https://cstech.ai/img/logo.avif"
                alt="CS Tech AI"
                className="h-10 sm:h-12"
              />
            </div>
            <div className="text-center sm:text-right text-xs text-blue-800">
              <p className="font-medium text-base sm:text-lg">
                Designed & Developed by CSTECH<sup>Ai</sup>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
