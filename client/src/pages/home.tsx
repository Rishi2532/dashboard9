import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Shield, LogIn } from "lucide-react";
import {
  Droplets,
  Activity,
  Gauge,
  Waves,
  ChevronLeft,
  ChevronRight,
  Building2,
  Home,
  Cpu,
  Server,
  Monitor,
  Bell,
  Radio,
  CheckCircle2,
  Mail,
  MessageSquare,
  TrendingUp,
  Layers,
  Users,
  ExternalLink,
} from "lucide-react";

interface RegionSummary {
  flow_meter_integrated?: number;
  rca_integrated?: number;
  pressure_transmitter_integrated?: number;
  total_villages_integrated?: number;
  total_esr_integrated?: number;
  total_schemes_integrated?: number;
  fully_completed_schemes?: number;
  fully_completed_villages?: number;
}

const carouselImages = [
  {
    url: "/images/merged-image-2025-12-16T10-48-08_processed_by_imagy.png",
  },
  {
    url: "/images/unnamed.jpg",
  },
  {
    url: "https://cdnbbsr.s3waas.gov.in/s3347665597cbfaef834886adbb848011f/uploads/2025/08/202508041754914286.jpg",
  },
  {
    url: "images/WhatsApp Image 2025-12-16 at 11.37.33.jpeg",
    title: "Real-time Monitoring at Integrated command and Control Centre",
    subtitle: " surveillance of water quality and quantity",
    titleClass: "text-xs",
  },
  {
    url: "https://images.unsplash.com/photo-1518173946687-a4c036bc0a7a?w=1200&h=400&fit=crop",
  },
];

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: regionSummary } = useQuery<RegionSummary>({
    queryKey: ["/api/regions/summary"],
  });

  const flowMeters = Number(regionSummary?.flow_meter_integrated) || 0;
  const chlorineAnalyzers = Number(regionSummary?.rca_integrated) || 0;
  const pressureTransmitters =
    Number(regionSummary?.pressure_transmitter_integrated) || 0;
  const totalSensors = flowMeters + chlorineAnalyzers + pressureTransmitters;
  const villages = regionSummary?.total_villages_integrated || 0;
  const esrs = regionSummary?.total_esr_integrated || 0;

  const totalSchemes = regionSummary?.total_schemes_integrated || 0;
  const fullyCompletedSchemes = regionSummary?.fully_completed_schemes || 0;
  const partialSchemes = totalSchemes - fullyCompletedSchemes;

  const totalVillages = regionSummary?.total_villages_integrated || 0;
  const fullyCompletedVillages = regionSummary?.fully_completed_villages || 0;
  const partialVillages = totalVillages - fullyCompletedVillages;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () =>
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  const prevSlide = () =>
    setCurrentSlide(
      (prev) => (prev - 1 + carouselImages.length) % carouselImages.length,
    );

  const stats = [
    {
      icon: Cpu,
      value: totalSensors.toLocaleString(),
      label: "IoT Sensors Deployed",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      icon: Home,
      value: villages.toLocaleString(),
      label: "Villages Covered",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      icon: Building2,
      value: esrs.toLocaleString(),
      label: "ESRs Monitored",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      icon: Users,
      value: "27.9L+",
      label: "Households Served",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  const architectureLayers = [
    {
      icon: Cpu,
      title: "Device Layer",
      items: ["Flow Meters", "Residual Chlorine Analysers", "Pressure Sensors"],
      description:
        "Sensor-enabled devices deployed across villages transmitting via MQTT protocol",
      accentColor: "border-t-blue-600",
      iconBg: "bg-blue-600",
    },
    {
      icon: Radio,
      title: "Communication Layer",
      items: ["MQTT Adapters", "Load Balancer", "Cloud Gateway"],
      description:
        "Data routing through MQTT adapters with load balancing for all villages",
      accentColor: "border-t-green-600",
      iconBg: "bg-green-600",
    },
    {
      icon: Server,
      title: "ICCC Platform",
      items: ["AVEVA PI System", "Data Analytics", "Visualization Tools"],
      description:
        "Integrated Command and Control Centre at State JJM Office, Belapur",
      accentColor: "border-t-orange-500",
      iconBg: "bg-orange-500",
    },
  ];

  const deviceBreakdown = [
    {
      icon: Waves,
      name: "Flow Meters",
      count: flowMeters.toLocaleString(),
      description: "High-precision water flow measurement",
      iconBg: "bg-blue-600",
      borderColor: "border-l-blue-600",
    },
    {
      icon: Droplets,
      name: "Residual Chlorine Analysers",
      count: chlorineAnalyzers.toLocaleString(),
      description: "Water quality monitoring (0.2-0.5 mg/L)",
      iconBg: "bg-green-600",
      borderColor: "border-l-green-600",
    },
    {
      icon: Gauge,
      name: "Pressure Transmitters",
      count: pressureTransmitters.toLocaleString(),
      description: "Network pressure monitoring (0.2-0.7 Bar)",
      iconBg: "bg-orange-500",
      borderColor: "border-l-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Light Professional Style */}
      <header className="bg-white shadow-sm border-b-4 border-orange-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <img
                src="/images/jal-jeevan-mission-logo.png"
                alt="Har Ghar Jal - Jal Jeevan Mission"
                className="h-10 sm:h-12 md:h-14"
                data-testid="img-header-logo"
              />
              <div className="hidden sm:block">
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-blue-800">
                  Maharashtra Water Infrastructure
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500">
                  Jal Jeevan Mission Initiative
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-9"
                onClick={() => setLocation("/admin")}
                data-testid="button-admin-login"
                aria-label="Admin Login"
              >
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline">Admin Login</span>
              </Button>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-9"
                onClick={() => setLocation("/user-login")}
                data-testid="button-user-login"
                aria-label="User Login"
              >
                <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="sm:hidden">Login</span>
                <span className="hidden sm:inline">User Login</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Image Carousel */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[16/7] md:aspect-[16/6] max-h-[300px] sm:max-h-[400px] md:max-h-[500px] overflow-hidden">
        {carouselImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 ease-in-out ${index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
            style={{ transition: "all 5000ms ease-in-out" }}
          >
            <img
              src={image.url}
              alt={image.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6 md:p-8 lg:p-12">
              <div className="max-w-7xl mx-auto">
                <h2
                  className={`${image.titleClass ?? "text-lg sm:text-xl md:text-2xl lg:text-4xl"} font-bold text-white mb-1 sm:mb-2 drop-shadow-lg`}
                  data-testid="text-carousel-title"
                >
                  {image.title}
                </h2>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/90 max-w-xl">
                  {image.subtitle}
                </p>
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full transition-all shadow-md"
          data-testid="button-carousel-prev"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-3 rounded-full transition-all shadow-md"
          data-testid="button-carousel-next"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-500 ${index === currentSlide ? "bg-orange-500 w-8" : "bg-white/60 w-2 hover:bg-white"}`}
              data-testid={`button-carousel-dot-${index}`}
            />
          ))}
        </div>
      </div>

      {/* Stats Banner - Light Background */}
      <div className="bg-gray-50 border-y border-gray-200 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="flex items-center gap-2 sm:gap-3 bg-white p-2 sm:p-3 rounded-lg shadow-sm border border-gray-100"
                data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`${stat.bgColor} p-2 sm:p-3 rounded-lg flex-shrink-0`}>
                  <stat.icon className={`w-4 h-4 sm:w-5 md:w-6 sm:h-5 md:h-6 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-lg sm:text-xl md:text-2xl font-bold ${stat.color} truncate`}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 truncate">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* About Section - Clean White */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12">
        <div className="grid lg:grid-cols-2 gap-6 md:gap-10 items-start">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-2 rounded-full mb-6 border border-blue-200">
              <Activity className="w-4 h-4" />
              About the Initiative
            </div>
            <h2
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-4 sm:mb-6 leading-tight"
              data-testid="text-about-title"
            >
              Transforming Rural Water Supply with{" "}
              <span className="text-blue-600">Smart Technology</span>
            </h2>
            <div className="text-gray-600 space-y-3 sm:space-y-4 leading-relaxed text-sm sm:text-base">
              <p>
                Jal Jeevan Mission (JJM) is a flagship initiative by the
                Government of India, aimed at ensuring{" "}
                <strong className="text-gray-800">"Har Ghar Jal"</strong>{" "}
                through Functional Household Tap Connections (FHTCs). The
                mission envisions every rural household having access to{" "}
                <strong className="text-gray-800">
                  55 litres per capita per day (LPCD)
                </strong>{" "}
                of prescribed quality drinking water.
              </p>
              <p>
                In Maharashtra, the State Water and Sanitation Mission (SWSM)
                implements JJM with Maharashtra Jeevan Pradhikaran (MJP) and
                Zilla Parishad (ZP) as key implementation agencies.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 sm:mt-8">
              <div className="bg-white rounded-lg p-3 sm:p-5 border border-gray-200 shadow-sm">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">1,006</div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Multi Village Schemes
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 sm:p-5 border border-gray-200 shadow-sm">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">7,830</div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">
                  Villages Under MVS
                </div>
              </div>
            </div>
          </div>

          <Card className="bg-white border border-gray-200 shadow-md overflow-hidden rounded-lg">
            <div className="bg-blue-600 px-6 py-4">
              <h3 className="font-bold text-white text-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                Primary Goals
              </h3>
            </div>
            <CardContent className="p-6">
              <ul className="space-y-3">
                {[
                  "Monitor water supply schemes effectively",
                  "Ensure adequate quantity and quality",
                  "Streamline operations across the state",
                  "Detect water shortages or contamination",
                  "Enhance efficiency and accountability",
                ].map((goal, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <span className="text-gray-700 text-sm pt-0.5">{goal}</span>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-gray-200">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">MJP Coverage</div>
                  <div className="text-xl font-bold text-gray-800">389 MVS</div>
                  <div className="text-xs text-green-600 mt-0.5">
                    6,094 villages
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-xs text-gray-500 mb-1">ZP Coverage</div>
                  <div className="text-xl font-bold text-gray-800">617 MVS</div>
                  <div className="text-xs text-green-600 mt-0.5">
                    1,736 villages
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Architecture Section - Light */}
      <div className="bg-gray-50 py-6 sm:py-8 md:py-12 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="text-center mb-6 sm:mb-8 md:mb-10">
            <div className="inline-flex items-center gap-2 bg-white text-gray-700 text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-3 sm:mb-4 border border-gray-200 shadow-sm">
              <Layers className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              System Architecture
            </div>
            <h2
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 mb-2 sm:mb-3"
              data-testid="text-architecture-title"
            >
              IoT System Architecture
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base px-2">
              SWSM's comprehensive three-layer architecture ensures reliable
              data collection, transmission, and analysis across the entire
              water distribution network.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-10">
            {architectureLayers.map((layer, index) => (
              <Card
                key={index}
                className={`overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow border-t-4 ${layer.accentColor}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`${layer.iconBg} p-2.5 rounded-lg`}>
                      <layer.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">
                        Layer {index + 1}
                      </span>
                      <h3 className="font-bold text-gray-800">{layer.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    {layer.description}
                  </p>
                  <div className="space-y-2">
                    {layer.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 text-sm text-gray-600"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ICCC Highlight - Lighter */}
          <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm border border-gray-200">
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
              <div>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="bg-blue-600 p-2 sm:p-3 rounded-lg">
                    <Monitor className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                    ICCC - Belapur
                  </h3>
                </div>
                <p className="text-gray-600 mb-4 sm:mb-5 leading-relaxed text-sm sm:text-base">
                  The Integrated Command and Control Centre (ICCC) at the State
                  JJM Office serves as the nerve center for centralized
                  monitoring, equipped with advanced hardware and AVEVA PI
                  visualization software.
                </p>
                <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                  {[
                    "State-wide View",
                    "Real-time Analytics",
                  ].map((tag, i) => (
                    <span
                      key={i}
                      className="bg-blue-50 text-blue-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm border border-blue-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* ICCC Statistics */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded border border-gray-100">
                      <span className="text-gray-500">
                        Fully Completed Schemes
                      </span>
                      <span className="text-green-600 font-bold">
                        {fullyCompletedSchemes.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded border border-gray-100">
                      <span className="text-gray-500">Partial Schemes</span>
                      <span className="text-orange-500 font-bold">
                        {partialSchemes.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded border border-gray-100">
                      <span className="text-gray-500">
                        Fully Completed Villages
                      </span>
                      <span className="text-green-600 font-bold">
                        {fullyCompletedVillages.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded border border-gray-100">
                      <span className="text-gray-500">Partial Villages</span>
                      <span className="text-orange-500 font-bold">
                        {partialVillages.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  {
                    icon: Mail,
                    label: "Email Alerts",
                    color: "text-orange-500",
                    bg: "bg-orange-50",
                  },
                  {
                    icon: MessageSquare,
                    label: "SMS Notifications",
                    color: "text-green-600",
                    bg: "bg-green-50",
                  },
                  {
                    icon: Bell,
                    label: "In-App Alerts",
                    color: "text-blue-600",
                    bg: "bg-blue-50",
                  },
                  {
                    icon: TrendingUp,
                    label: "Escalation Matrix",
                    color: "text-orange-600",
                    bg: "bg-orange-50",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`${item.bg} rounded-lg p-5 text-center border border-gray-100`}
                  >
                    <item.icon
                      className={`w-6 h-6 ${item.color} mx-auto mb-2`}
                    />
                    <div className="text-sm font-medium text-gray-700">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Devices Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-2 rounded-full mb-4 border border-green-200">
              <Cpu className="w-4 h-4" />
              IoT Devices
            </div>
            <h2
              className="text-3xl md:text-4xl font-bold text-gray-800 mb-3"
              data-testid="text-devices-title"
            >
              Smart Monitoring Devices
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Our IoT device network enables comprehensive, real-time monitoring
              of water supply quality and quantity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {deviceBreakdown.map((device, index) => (
              <Card
                key={index}
                className={`bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow border-l-4 ${device.borderColor}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`${device.iconBg} p-3 rounded-lg`}>
                      <device.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 leading-tight">
                        {device.name}
                      </h4>
                      <div className="text-3xl font-bold text-gray-800 my-2">
                        {device.count}
                      </div>
                      <p className="text-sm text-gray-500">
                        {device.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Important Links - Creative Cards with Images */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-6 sm:py-8 md:py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="text-center mb-6 sm:mb-8 md:mb-10">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              Important Links
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Access key government water management portals
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                label: "Pi Vision ",
                description: "SWSM Real Time Dashboard",
                href: "https://mahajaliot.in/PIVision/#/Displays/10102/CEREBULB_JJM_MAHARASHTRA_ENTERPRISE_LEVEL_DASHBOARD?hidetoolbar=true&hidesidebar=true&mode=kiosk",
                imageUrl: "/images/Screenshot 2025-12-18 123327.png",
              },
              {
                label: "GIS Application",
                description: "SWSM GIS Application",
                href: "https://gis.mahajaliot.in/iot/",
                imageUrl: "/images/Screenshot 2025-12-18 123801.png",
              },
              {
                label: "MQTT Dashboard",
                description: "State water sanitation mission",
                href: "https://swsm.maharashtra.gov.in/",
                imageUrl: "/images/image (2).png",
              },
            ].map((link, i) => (
              <a
                key={i}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {/* Image Background */}
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={link.imageUrl}
                    alt={link.label}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70 group-hover:from-black/50 group-hover:to-black/80 transition-all duration-300" />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 sm:p-6 text-center min-h-[180px] sm:min-h-[200px]">
                  <h4 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 text-white drop-shadow-lg">
                    {link.label}
                  </h4>
                  <p className="text-xs sm:text-sm text-white mb-3 sm:mb-4 drop-shadow-lg">
                    {link.description}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg backdrop-blur-sm text-white">
                    <span>Visit Portal</span>
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Footer - Professional Light */}
      <footer className="bg-white border-t-4 border-orange-500 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-center gap-2 sm:gap-4 text-center sm:text-left">
            <div>
              <div className="font-semibold text-gray-800 text-sm sm:text-base">
                State Water and Sanitation Mission
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                Water Supply & Sanitation Department, Govt. of Maharashtra
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-400">
              Content owned by SWSM, Maharashtra
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
