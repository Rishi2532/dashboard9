import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  Droplets, 
  Shield, 
  Users,
  ArrowRight,
  Activity,
  MapPin,
  Database
} from "lucide-react";
import backgroundImage from "../../../attached_assets/image_1759735212447.png";

// Auth status response type
interface AuthStatusResponse {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export default function LoginPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check if user is already logged in
  const authStatusQuery = useQuery<AuthStatusResponse>({
    queryKey: ["/api/auth/status"],
    refetchOnWindowFocus: false,
  });

  // Effect to handle redirection if user is logged in
  useEffect(() => {
    if (authStatusQuery.data?.isLoggedIn) {
      if (authStatusQuery.data.isAdmin) {
        setLocation("/admin/dashboard");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [authStatusQuery.data, setLocation]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image with Very Light Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/25 via-blue-800/20 to-indigo-900/25"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header Logo */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6">
          <img
            src="/images/jal-jeevan-mission-logo.png"
            alt="Har Ghar Jal - Jal Jeevan Mission"
            className="h-16 md:h-20 drop-shadow-2xl"
            data-testid="img-jjm-logo"
          />
        </div>

        {/* Main Content - Centered */}
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-6xl w-full">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              
              {/* Left Side - Project Information */}
              <div className="text-white space-y-6" data-testid="section-project-info">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/30">
                    <Droplets className="w-5 h-5 text-white" />
                    <span className="text-sm font-semibold text-white">Jal Jeevan Mission Initiative</span>
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight drop-shadow-2xl" data-testid="text-project-name">
                    Maharashtra Water
                    <span className="block text-white mt-1">Infrastructure Platform</span>
                  </h1>
                  
                  <p className="text-lg md:text-xl text-white/95 font-medium drop-shadow-lg" data-testid="text-tagline">
                    Real-time IoT monitoring & AI-powered analytics for sustainable water management
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/30" data-testid="section-features">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Platform Capabilities
                  </h3>
                  <div className="space-y-2.5 text-white/95">
                    <p className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Multi-region water infrastructure monitoring across all Maharashtra divisions</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <Database className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Real-time ESR level tracking, pressure monitoring, and chlorine analysis</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <Activity className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">MQTT-based IoT sensor integration for live data collection and alerts</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <Droplets className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">AI-powered predictive analytics for water consumption and maintenance planning</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Side - Login Options */}
              <div className="flex flex-col items-center justify-center space-y-5" data-testid="section-login-options">
                <div className="text-center mb-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-2xl">Access Portal</h2>
                  <p className="text-white/90 text-sm mt-1 drop-shadow-lg">Select your role to continue</p>
                </div>

                {/* Login Cards */}
                <div className="w-full max-w-md space-y-3">
                  {/* Admin Login Card */}
                  <div 
                    className="group bg-white/95 backdrop-blur-lg rounded-xl p-5 shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] border border-white/60"
                    data-testid="card-admin-login"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">Admin Access</h3>
                        <p className="text-gray-600 text-xs">System control & data management</p>
                      </div>
                      <Button 
                        className="bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white px-6 py-2 text-sm font-semibold rounded-lg shadow-lg group-hover:shadow-xl transition-all"
                        onClick={() => setLocation("/admin")}
                        data-testid="button-admin-login"
                      >
                        Login
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
                  </div>

                  {/* User Login Card */}
                  <div 
                    className="group bg-white/95 backdrop-blur-lg rounded-xl p-5 shadow-2xl hover:shadow-blue-400/30 transition-all duration-300 hover:scale-[1.02] border border-white/60"
                    data-testid="card-user-login"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center flex-shrink-0">
                        <Users className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">User Access</h3>
                        <p className="text-gray-600 text-xs">Dashboard & analytics view</p>
                      </div>
                      <Button 
                        className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white px-6 py-2 text-sm font-semibold rounded-lg shadow-lg group-hover:shadow-xl transition-all"
                        onClick={() => setLocation("/user-login")}
                        data-testid="button-user-login"
                      >
                        Login
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Additional Links */}
                <div className="text-center space-x-4 pt-2 text-sm">
                  <button
                    onClick={() => setLocation("/register")}
                    className="text-white/90 hover:text-white transition-colors underline-offset-4 hover:underline drop-shadow font-medium"
                    data-testid="link-register"
                  >
                    Register
                  </button>
                  <span className="text-white/70">•</span>
                  <button
                    onClick={() => setLocation("/forgot-password")}
                    className="text-white/90 hover:text-white transition-colors underline-offset-4 hover:underline drop-shadow font-medium"
                    data-testid="link-forgot-password"
                  >
                    Forgot Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 py-4 border-t border-white/30 backdrop-blur-sm" data-testid="footer-branding">
          <div className="text-center">
            <p className="text-sm text-white font-medium drop-shadow">
              Powered by CSTECH AI
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
