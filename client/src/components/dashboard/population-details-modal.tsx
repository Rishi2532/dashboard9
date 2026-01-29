import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Droplets,
  AlertTriangle,
  MapPin,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Download,
  X,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface PopulationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardType: "total" | "with_water" | "no_water" | "lpcd_above" | "lpcd_below";
  selectedRegion?: string;
  isVillageView?: boolean;
}

interface TrendData {
  date: string;
  population: number;
  villages: number;
}

interface RegionalData {
  region: string;
  population: number;
  villages: number;
  percentage: number;
  color: string;
}

export default function PopulationDetailsModal({
  isOpen,
  onClose,
  cardType,
  selectedRegion = "all",
  isVillageView = false,
}: PopulationDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch detailed statistics based on card type
  const { data: detailStats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/water-scheme-data/detailed-stats/${cardType}`, selectedRegion],
    queryFn: async () => {
      const url = `/api/water-scheme-data/detailed-stats/${cardType}${
        selectedRegion !== "all" ? `?region=${selectedRegion}` : ""
      }`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch detailed statistics");
      return response.json();
    },
    enabled: isOpen,
  });

  // Fetch trend data for the last 30 days
  const { data: trendData, isLoading: trendLoading } = useQuery<TrendData[]>({
    queryKey: [`/api/water-scheme-data/trends/${cardType}`, selectedRegion],
    queryFn: async () => {
      const url = `/api/water-scheme-data/trends/${cardType}${
        selectedRegion !== "all" ? `?region=${selectedRegion}` : ""
      }`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch trend data");
      return response.json();
    },
    enabled: isOpen && activeTab === "trends",
  });

  // Fetch regional breakdown
  const { data: regionalData, isLoading: regionalLoading } = useQuery<RegionalData[]>({
    queryKey: [`/api/water-scheme-data/regional/${cardType}`, selectedRegion],
    queryFn: async () => {
      const url = `/api/water-scheme-data/regional/${cardType}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch regional data");
      return response.json();
    },
    enabled: isOpen && activeTab === "regional",
  });

  const getCardConfig = () => {
    const configs = {
      total: {
        title: isVillageView ? "Total Villages" : "Total Population",
        icon: isVillageView ? MapPin : Users,
        color: "from-slate-600 to-slate-800",
        description: isVillageView 
          ? "Complete overview of all villages in the water infrastructure network"
          : "Complete overview of population coverage across all regions",
      },
      with_water: {
        title: isVillageView ? "Villages with Water Supply" : "Population with Water Access",
        icon: Droplets,
        color: "from-teal-600 to-cyan-800",
        description: isVillageView
          ? "Villages currently receiving adequate water supply through the infrastructure"
          : "Population currently receiving adequate water supply through the infrastructure",
      },
      no_water: {
        title: isVillageView ? "Villages without Water" : "Population without Water Access",
        icon: AlertTriangle,
        color: "from-rose-600 to-pink-800",
        description: isVillageView
          ? "Villages currently experiencing water supply issues or outages"
          : "Population currently experiencing water supply issues or outages",
      },
      lpcd_above: {
        title: isVillageView ? "Villages with LPCD > 55" : "Population with LPCD > 55",
        icon: Droplets,
        color: "from-emerald-600 to-green-800",
        description: isVillageView
          ? "Villages meeting or exceeding the recommended 55 liters per capita per day standard"
          : "Population receiving adequate water supply (above 55 LPCD recommended standard)",
      },
      lpcd_below: {
        title: isVillageView ? "Villages with LPCD < 55" : "Population with LPCD < 55",
        icon: AlertTriangle,
        color: "from-amber-600 to-orange-800",
        description: isVillageView
          ? "Villages falling below the recommended 55 liters per capita per day standard"
          : "Population receiving insufficient water supply (below 55 LPCD recommended standard)",
      },
    };
    return configs[cardType];
  };

  const config = getCardConfig();
  const IconComponent = config.icon;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const exportData = () => {
    // Implementation for data export
    console.log("Exporting data for:", cardType);
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      y: 50,
      transition: {
        duration: 0.2,
      }
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="h-full"
            >
              {/* Header */}
              <DialogHeader className={`bg-gradient-to-r ${config.color} text-white p-6 rounded-t-lg`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <IconComponent className="h-8 w-8" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-bold">
                        {config.title}
                      </DialogTitle>
                      <p className="text-white/90 mt-1 text-sm max-w-2xl">
                        {config.description}
                      </p>
                      {selectedRegion !== "all" && (
                        <Badge variant="secondary" className="mt-2">
                          {selectedRegion} Region
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exportData}
                      className="text-white hover:bg-white/20"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="text-white hover:bg-white/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="trends" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Trends
                    </TabsTrigger>
                    <TabsTrigger value="regional" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Regional
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Analysis
                    </TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6">
                    {statsLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
                        {detailStats?.overview?.map((stat: any, index: number) => (
                          <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-900">
                                  {formatNumber(stat.value)}
                                </p>
                              </div>
                              <div className={`flex items-center gap-1 ${
                                stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {stat.change >= 0 ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                <span className="text-sm font-medium">
                                  {Math.abs(stat.change)}%
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </TabsContent>

                  {/* Trends Tab */}
                  <TabsContent value="trends" className="space-y-6">
                    {trendLoading ? (
                      <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white border rounded-lg p-6"
                      >
                        <h3 className="text-lg font-semibold mb-4">30-Day Trend Analysis</h3>
                        <ResponsiveContainer width="100%" height={400}>
                          <AreaChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip 
                              formatter={(value: number) => [formatNumber(value), isVillageView ? "Villages" : "Population"]}
                            />
                            <Area
                              type="monotone"
                              dataKey={isVillageView ? "villages" : "population"}
                              stroke="#3B82F6"
                              fill="#3B82F6"
                              fillOpacity={0.3}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </motion.div>
                    )}
                  </TabsContent>

                  {/* Regional Tab */}
                  <TabsContent value="regional" className="space-y-6">
                    {regionalLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                      >
                        {/* Pie Chart */}
                        <div className="bg-white border rounded-lg p-6">
                          <h3 className="text-lg font-semibold mb-4">Regional Distribution</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={regionalData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percentage }) => `${name}: ${percentage}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey={isVillageView ? "villages" : "population"}
                              >
                                {regionalData?.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => formatNumber(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white border rounded-lg p-6">
                          <h3 className="text-lg font-semibold mb-4">Regional Comparison</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={regionalData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="region" />
                              <YAxis />
                              <Tooltip formatter={(value: number) => formatNumber(value)} />
                              <Bar 
                                dataKey={isVillageView ? "villages" : "population"} 
                                fill="#3B82F6" 
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    )}
                  </TabsContent>

                  {/* Analysis Tab */}
                  <TabsContent value="analysis" className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white border rounded-lg p-6"
                    >
                      <h3 className="text-lg font-semibold mb-4">Key Insights & Recommendations</h3>
                      <div className="space-y-4">
                        <div className="border-l-4 border-blue-500 pl-4">
                          <h4 className="font-medium text-gray-900">Current Status</h4>
                          <p className="text-gray-600 text-sm">
                            Analysis of current {isVillageView ? "village" : "population"} coverage and performance metrics.
                          </p>
                        </div>
                        <div className="border-l-4 border-green-500 pl-4">
                          <h4 className="font-medium text-gray-900">Improvement Areas</h4>
                          <p className="text-gray-600 text-sm">
                            Identified opportunities for enhancing water infrastructure and coverage.
                          </p>
                        </div>
                        <div className="border-l-4 border-amber-500 pl-4">
                          <h4 className="font-medium text-gray-900">Action Items</h4>
                          <p className="text-gray-600 text-sm">
                            Recommended next steps for infrastructure development and maintenance.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}