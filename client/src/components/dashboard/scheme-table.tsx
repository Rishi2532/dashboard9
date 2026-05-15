import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getStatusColorClass,
  getStatusDisplayName,
  SchemeCompletionStatus,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SchemeStatus } from "@/types";
import { Search, ExternalLink } from "lucide-react";
import { useDashboardTracking } from "@/hooks/use-dashboard-tracking";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface SchemeTableProps {
  schemes: SchemeStatus[];
  isLoading: boolean;
  onViewDetails: (scheme: SchemeStatus) => void;
  onNavigateToDetails?: (scheme: SchemeStatus) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  onFilteredSchemesChange?: (filteredSchemes: SchemeStatus[]) => void;
  selectedRegion?: string;
  defaultCommissionedFilter?: string;
}

export default function SchemeTable({
  schemes,
  isLoading,
  onViewDetails,
  onNavigateToDetails,
  statusFilter = "all",
  onStatusFilterChange,
  onFilteredSchemesChange,
  selectedRegion = "all",
  defaultCommissionedFilter = "all",
}: SchemeTableProps) {
  const { trackSchemeDataLinkClick } = useDashboardTracking();
  const [searchTerm, setSearchTerm] = useState("");
  const [schemeIdSearch, setSchemeIdSearch] = useState("");
  const [localStatusFilter, setLocalStatusFilter] =
    useState<string>(statusFilter);
  const [commissionedFilter, setCommissionedFilter] = useState<string>(defaultCommissionedFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch region summary data (region-specific or overall)
  const { data: regionSummary } = useQuery({
    queryKey: ["/api/regions/summary", selectedRegion],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRegion && selectedRegion !== "all") {
        params.append("region", selectedRegion);
      }
      const url = `/api/regions/summary${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch region summary");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  }) as { data: any };

  // If statusFilter prop changes, update local state
  useEffect(() => {
    setLocalStatusFilter(statusFilter);
  }, [statusFilter]);

  // Make filter states globally accessible for export function
  useEffect(() => {
    // Add filter states to the window object for the export function to use
    (window as any).schemeTableFilters = {
      statusFilter: localStatusFilter,
      commissionedFilter,
    };
  }, [localStatusFilter, commissionedFilter]);

  // Ensure schemes is an array before filtering
  const schemesArray = Array.isArray(schemes) ? schemes : [];

  // Filter schemes by scheme name, scheme ID, and all filter options
  const filteredSchemes = schemesArray.filter((scheme) => {
    const matchesNameSearch =
      searchTerm === "" ||
      scheme.scheme_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesIdSearch =
      schemeIdSearch === "" ||
      (scheme.scheme_id &&
        scheme.scheme_id.toLowerCase().includes(schemeIdSearch.toLowerCase()));

    const matchesStatusFilter =
      localStatusFilter === "all" ||
      (localStatusFilter === "Connected"
        ? scheme.fully_completion_scheme_status !== "Not-Connected"
        : scheme.fully_completion_scheme_status === localStatusFilter);

    const matchesCommissionedFilter =
      commissionedFilter === "all" ||
      (commissionedFilter === "Water Supply"
        ? scheme.water_supply === "Yes"
        : scheme.mjp_commissioned === commissionedFilter);

    return (
      matchesNameSearch &&
      matchesIdSearch &&
      matchesStatusFilter &&
      matchesCommissionedFilter
    );
  });

  // Notify parent component whenever filtered schemes change
  useEffect(() => {
    if (onFilteredSchemesChange) {
      onFilteredSchemesChange(filteredSchemes);
    }
  }, [filteredSchemes, onFilteredSchemesChange]);

  // Reset pagination to page 1 when any filter or search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, schemeIdSearch, localStatusFilter, commissionedFilter, schemes]);
  const totalPages = Math.ceil(filteredSchemes.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSchemes.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Helper function to calculate percentage
  const calcPercentage = (
    value: number | undefined | null,
    total: number | undefined | null,
  ): number => {
    if (!value || !total || total === 0) return 0;
    return Number(((value / total) * 100).toFixed(2));
  };

  // Calculate totals from filtered schemes
  const overallTotals = useMemo(() => {
    return filteredSchemes.reduce<{
      totalVillages: number;
      integratedVillages: number;
      totalFullyCompletedVillages: number;
      totalEsr: number;
      integratedEsr: number;
      totalFullyCompletedEsr: number;
    }>(
      (acc, scheme) => {
        acc.totalVillages += scheme.number_of_village || 0;
        acc.integratedVillages += scheme.total_villages_integrated || 0;
        acc.totalFullyCompletedVillages += scheme.fully_completed_villages || 0;
        acc.totalEsr += scheme.total_number_of_esr || 0;
        acc.integratedEsr += scheme.total_esr_integrated || 0;
        acc.totalFullyCompletedEsr += scheme.no_fully_completed_esr || 0;
        return acc;
      },
      {
        totalVillages: 0,
        integratedVillages: 0,
        totalFullyCompletedVillages: 0,
        totalEsr: 0,
        integratedEsr: 0,
        totalFullyCompletedEsr: 0,
      }
    );
  }, [filteredSchemes]);

  return (
    <Card className="bg-white shadow mb-8">
      <CardHeader className="px-3 py-3 sm:px-4 sm:py-5 lg:px-6 lg:py-6 xl:px-8 xl:py-6 flex flex-col sm:flex-row justify-between items-start space-y-4 sm:space-y-0">
        {/* Left side: Title + Description + Search bars */}
        <div className="flex flex-col space-y-3 sm:space-y-4 w-full sm:w-1/2">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl font-medium text-neutral-900">
                {commissionedFilter === "all" 
                  ? "All Water Schemes" 
                  : commissionedFilter === "Water Supply" 
                    ? "Schemes with 100% Civil Work Completion" 
                    : `${commissionedFilter} Schemes`}
              </CardTitle>
              <span className="px-3 py-1 bg-blue-100 rounded-full text-blue-800 text-sm font-medium">
                {filteredSchemes.length} schemes found
              </span>
            </div>
            <CardDescription className="mt-1 max-w-2xl text-xs sm:text-sm lg:text-base text-neutral-500">
              Details of water schemes and their current status
            </CardDescription>
          </div>

          {/* Search bars */}
          <div className="flex flex-col md:flex-row gap-3 w-full">
            <div className="relative w-full sm:w-64 xl:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                id="schemeSearch"
                placeholder="Search scheme name..."
                className="pl-9 w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10 lg:h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative w-full sm:w-40 xl:w-44">
              <Input
                id="schemeIdSearch"
                placeholder="Scheme ID..."
                className="w-full text-xs sm:text-sm lg:text-base h-9 sm:h-10 lg:h-11 font-mono"
                value={schemeIdSearch}
                onChange={(e) => setSchemeIdSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          {/* Centered Dashboard Integration container */}
          <div className="flex justify-center w-full sm:w-auto">
            <div className="border border-gray-200 bg-sky-50 rounded-2xl px-4 py-4 shadow-sm w-full sm:w-72">
              <h2 className="text-center font-semibold text-sm sm:text-base mb-4">
                Dashboard Integration
              </h2>
              <Select
                value={localStatusFilter}
                onValueChange={(value) => {
                  setLocalStatusFilter(value);
                  setCurrentPage(1);
                  if (onStatusFilterChange) onStatusFilterChange(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-full h-12 text-base">
                  <SelectValue placeholder="IoT Integration Status" />
                </SelectTrigger>
                <SelectContent className="text-base">
                  <SelectItem
                    value="all"
                    className="flex justify-center text-center w-full"
                  >
                    IoT Integration Status
                  </SelectItem>

                  <SelectItem value="Connected" className="text-center">
                    Connected
                  </SelectItem>
                  <SelectItem value="Not-Connected" className="text-center">
                    Not Connected
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 py-0">
        <div className="border-t border-neutral-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-blue-50">
                <TableRow className="scheme-item">
                  <TableHead className="w-[12%] text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-800 font-semibold border-b border-blue-200 text-center">
                    <div className="flex justify-center">Scheme ID</div>
                  </TableHead>
                  <TableHead className="w-[20%] text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-800 font-semibold border-b border-blue-200 text-center">
                    <div className="flex justify-center">Scheme Name</div>
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-800 font-semibold border-b border-blue-200 text-center">
                    <div className="flex justify-center">Region</div>
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-black font-semibold border-b border-blue-200 text-center">
                    <div className="flex justify-center">Block</div>
                  </TableHead>

                  <TableHead className="text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-800 font-semibold border-b border-blue-200 text-center">
                    <div className="flex justify-center">
                      No. of Villages
                      {/* <span className="px-3 py-1 bg-green-100 rounded-full text-green-800 text-sm font-medium ml-2">
                        {overallTotals.integratedVillages}/
                        {overallTotals.totalVillages}
                      </span> */}
                    </div>
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-800 font-semibold border-b border-blue-200 text-center">
                    <div className="flex justify-center">
                      ESR{" "}
                      {/* <span className="px-3 py-1 bg-purple-100 rounded-full text-purple-800 text-sm font-medium ml-2">
                        {overallTotals.integratedEsr}/
                        {overallTotals.totalEsr}
                      </span> */}
                    </div>
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-800 font-semibold border-b border-blue-200 text-center">
                    <div className="flex justify-center">IoT Work Status</div>
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm lg:text-base p-2 sm:p-3 lg:p-4 xl:p-5 text-blue-800 font-semibold border-b border-blue-200 text-center">
                    <div className="flex justify-center">Action</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={8}>
                        <div className="animate-pulse h-4 sm:h-6 lg:h-8 bg-gray-200 rounded"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-4 sm:py-6 lg:py-8 text-xs sm:text-sm lg:text-base text-neutral-500"
                    >
                      No schemes found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((scheme) => (
                    <TableRow
                      key={`${scheme.scheme_id}-${scheme.block || "default"}`}
                      className="scheme-item hover:bg-blue-50"
                    >
                      <TableCell className="font-medium p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base border-b border-gray-100 text-center">
                        <div className="flex justify-center">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-mono">
                            {scheme.scheme_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base border-b border-gray-100 text-center">
                        <div className="flex justify-center">
                          <span className="inline-block text-center">
                            {scheme.scheme_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base text-center border-b border-gray-100">
                        <div className="flex justify-center">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                            {scheme.region}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base text-center border-b border-gray-100">
                        <div className="flex justify-center">
                          <span className="px-2 py-1  text-black-700 rounded-md">
                            {scheme.block || (
                              <span className="text-gray-400 italic">
                                No block
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base text-center border-b border-gray-100">
                        <div className="flex items-center justify-center">
                          <span className="font-medium">
                            {scheme.fully_completed_villages || 0}
                          </span>
                          <span className="text-neutral-400 mx-1">/</span>
                          <span>{scheme.number_of_village || 0}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{
                              width: `${calcPercentage(
                                scheme.fully_completed_villages,
                                scheme.number_of_village,
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base text-center border-b border-gray-100">
                        <div className="flex items-center justify-center">
                          <span className="font-medium">
                            {scheme.no_fully_completed_esr || 0}
                          </span>
                          <span className="text-neutral-400 mx-1">/</span>
                          <span className="text-purple-600 font-medium">
                            {scheme.total_number_of_esr || 0}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-purple-500 h-1.5 rounded-full"
                            style={{
                              width: `${calcPercentage(
                                scheme.no_fully_completed_esr,
                                scheme.total_number_of_esr,
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </TableCell>
                      <TableCell className="p-2 sm:p-3 lg:p-4 xl:p-5 text-xs sm:text-sm lg:text-base text-center border-b border-gray-100">
                        <div className="flex justify-center">
                          <span
                            className={`px-3 py-1.5 inline-flex items-center justify-center text-xs lg:text-sm font-medium rounded-md ${getStatusColorClass(
                              (scheme.fully_completion_scheme_status ||
                                "Not-Connected") as SchemeCompletionStatus,
                            )}`}
                          >
                            {getStatusDisplayName(
                              (scheme.fully_completion_scheme_status ||
                                "Not-Connected") as SchemeCompletionStatus,
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center p-1 sm:p-3 lg:p-4 xl:p-5 border-b border-gray-100">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border-blue-200 hover:border-blue-300 transition-colors duration-150 text-xs sm:text-sm h-8 sm:h-9 font-medium"
                            onClick={() => onViewDetails(scheme)}
                          >
                            View Details
                          </Button>
                          {onNavigateToDetails && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white hover:bg-green-50 text-green-700 hover:text-green-800 border-green-200 hover:border-green-300 transition-colors duration-150 text-xs sm:text-sm h-8 sm:h-9 font-medium"
                              onClick={() => onNavigateToDetails(scheme)}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Full Details
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="py-3 sm:py-4 lg:py-5 xl:py-6 px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-center sm:justify-between border-t border-neutral-200">
              <div className="hidden sm:block">
                <p className="text-xs sm:text-sm lg:text-base text-neutral-700">
                  Showing{" "}
                  <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredSchemes.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{filteredSchemes.length}</span>{" "}
                  results
                </p>
              </div>
              <div className="text-xs sm:text-sm text-center sm:text-left mt-2 sm:mt-0 block sm:hidden">
                Page {currentPage} of {totalPages}
              </div>
              <Pagination className="mt-2 sm:mt-0">
                <PaginationContent className="flex items-center gap-1 sm:gap-0">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) handlePageChange(currentPage - 1);
                      }}
                      className={`h-8 w-8 sm:h-9 sm:w-auto lg:h-10 xl:h-12 p-0 sm:p-2 lg:p-3 flex items-center justify-center text-xs sm:text-sm lg:text-base ${currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : ""
                        }`}
                    />
                  </PaginationItem>

                  {/* On mobile, simplify to just show current page indicator */}
                  <div className="sm:hidden flex items-center justify-center">
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => e.preventDefault()}
                        isActive={true}
                        className="h-8 w-8 p-0 flex items-center justify-center"
                      >
                        {currentPage}
                      </PaginationLink>
                    </PaginationItem>
                  </div>

                  {/* On desktop, show more page numbers */}
                  <div className="hidden sm:flex">
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;

                      // For large screens, show more page numbers
                      const shouldShowOnLarge =
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 &&
                          pageNumber <= currentPage + 1);

                      // Add more page numbers for 2xl screens with a CSS approach instead of JS
                      const shouldShowOnExtraLarge =
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 3 &&
                          pageNumber <= currentPage + 3);

                      // Show first page, current page, last page, and pages around current page
                      if (
                        shouldShowOnLarge ||
                        (shouldShowOnExtraLarge && !shouldShowOnLarge)
                      ) {
                        const isExtraLargeOnly =
                          shouldShowOnExtraLarge && !shouldShowOnLarge;
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(pageNumber);
                              }}
                              isActive={pageNumber === currentPage}
                              className={`h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 xl:h-12 xl:w-12 flex items-center justify-center text-xs sm:text-sm lg:text-base ${isExtraLargeOnly ? "hidden 2xl:flex" : ""
                                }`}
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }

                      // Show ellipsis after first page and before last page if there are more pages
                      if (
                        (pageNumber === 2 && currentPage > 3) ||
                        (pageNumber === totalPages - 1 &&
                          currentPage < totalPages - 2)
                      ) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationEllipsis className="h-8 sm:h-9 lg:h-10 xl:h-12 text-xs sm:text-sm lg:text-base" />
                          </PaginationItem>
                        );
                      }

                      return null;
                    })}
                  </div>

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages)
                          handlePageChange(currentPage + 1);
                      }}
                      className={`h-8 w-8 sm:h-9 sm:w-auto lg:h-10 xl:h-12 p-0 sm:p-2 lg:p-3 flex items-center justify-center text-xs sm:text-sm lg:text-base ${currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                        }`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
