import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculatePercentage,
  SchemeCompletionStatus,
  getStatusColorClass,
  getStatusDisplayName,
  getAgencyByRegion,
} from "@/lib/utils";
import { SchemeStatus } from "@/types";

interface SchemeDetailsModalProps {
  scheme: SchemeStatus | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SchemeDetailsModal({
  scheme,
  isOpen,
  onClose,
}: SchemeDetailsModalProps) {
  console.log(
    "SchemeDetailsModal opening with scheme:",
    scheme,
    "isOpen:",
    isOpen,
  );
  const [blocks, setBlocks] = useState<string[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [currentScheme, setCurrentScheme] = useState<SchemeStatus | null>(
    scheme,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setCurrentScheme(scheme);
    if (scheme) {
      console.log("SchemeDetailsModal - Scheme updated:", scheme.scheme_name);

      // If we have a block in the scheme, set it as the initial selected block
      if (scheme.block) {
        setSelectedBlock(scheme.block);
      }

      // First check if there are multiple blocks
      const checkBlocks = async () => {
        try {
          console.log("Checking blocks for scheme:", scheme.scheme_name);
          const hasMultipleBlocks = await fetchBlocks(scheme.scheme_name);

          console.log("hasMultipleBlocks result:", hasMultipleBlocks, "for scheme:", scheme.scheme_name);

          if (hasMultipleBlocks) {
            // If there are multiple blocks, default to showing the aggregate view
            console.log("Setting to All Blocks view for:", scheme.scheme_name);
            setSelectedBlock("All Blocks");
            await fetchAggregatedData(scheme.scheme_name);
          } else {
            // Otherwise, keep the current block
            if (scheme.block) {
              console.log("Setting to single block view:", scheme.block);
              setSelectedBlock(scheme.block);
            } else {
              console.log("No block in scheme, using first block from fetch result");
              // If no block in the scheme but we got blocks from API
              const blocks = await fetch(`/api/schemes/blocks/${encodeURIComponent(scheme.scheme_name)}`).then(res => res.json());
              if (blocks && blocks.length > 0 && blocks[0]) {
                setSelectedBlock(blocks[0]);
              }
            }
          }
        } catch (error) {
          console.error("Error in checkBlocks:", error);
          // Fallback to scheme's block
          if (scheme.block) {
            console.log("Using scheme's block as fallback after error:", scheme.block);
            setSelectedBlock(scheme.block);
          }
        }
      };

      checkBlocks();
    }
  }, [scheme]);

  const fetchBlocks = async (schemeName: string) => {
    try {
      setIsLoading(true);
      console.log("Fetching blocks for scheme:", schemeName);
      const response = await fetch(
        `/api/schemes/blocks/${encodeURIComponent(schemeName)}`,
      );
      if (response.ok) {
        const blocksData = await response.json();
        console.log("Fetched blocks for scheme:", schemeName, blocksData);

        // Filter out any empty or null blocks
        const validBlocks = blocksData.filter((block: string) => block && block.trim() !== '');
        setBlocks(validBlocks);

        // Return true if we have multiple blocks
        const hasMultipleBlocks = validBlocks.length > 1;

        if (hasMultipleBlocks) {
          console.log(
            "Multiple blocks found:",
            validBlocks.length,
            "Fetching aggregated data first",
          );
          // Always start with All Blocks view for multi-block schemes
          setSelectedBlock("All Blocks");
        } else {
          console.log("Only one block found, but will still show dropdown for consistency");
          // Ensure we set the selected block to the current one
          if (validBlocks.length === 1) {
            setSelectedBlock(validBlocks[0]);
          } else if (scheme && scheme.block) {
            // If API returned no blocks but we have a block in the scheme
            setSelectedBlock(scheme.block);
          }
        }

        return hasMultipleBlocks;
      } else {
        console.error("Error response when fetching blocks:", response.status);
        // If API call fails but we have a scheme with a block, use that
        if (scheme && scheme.block) {
          console.log("Using scheme's block as fallback:", scheme.block);
          setBlocks([scheme.block]);
          setSelectedBlock(scheme.block);
        }
      }
    } catch (error) {
      console.error("Error fetching blocks:", error);
      // Fallback to scheme's block if available
      if (scheme && scheme.block) {
        console.log("Using scheme's block as fallback after error:", scheme.block);
        setBlocks([scheme.block]);
        setSelectedBlock(scheme.block);
      }
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const fetchAggregatedData = async (schemeName: string) => {
    try {
      setIsLoading(true);
      console.log("Fetching aggregated data for scheme:", schemeName);
      const response = await fetch(
        `/api/schemes/aggregate/${encodeURIComponent(schemeName)}`,
      );
      if (response.ok) {
        const aggregatedScheme = await response.json();
        console.log("Fetched aggregated data:", aggregatedScheme);
        setCurrentScheme(aggregatedScheme);
        setSelectedBlock("All Blocks");
      } else {
        console.error(
          "Error response when fetching aggregated data:",
          response.status,
        );
      }
    } catch (error) {
      console.error("Error fetching aggregated data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockChange = async (blockValue: string) => {
    if (!scheme) return;

    console.log("Changing block to:", blockValue, "for scheme:", scheme.scheme_name);
    setSelectedBlock(blockValue);

    try {
      setIsLoading(true);

      // If "All Blocks" is selected, use the dedicated aggregated endpoint
      if (blockValue === "All Blocks") {
        console.log("Fetching aggregated data for:", scheme.scheme_name);
        await fetchAggregatedData(scheme.scheme_name);
        return; // Exit early as fetchAggregatedData handles all the state updates
      }

      // For specific blocks, use the by-name endpoint
      console.log(`Fetching data for specific block ${blockValue} for scheme:`, scheme.scheme_name);
      const response = await fetch(
        `/api/schemes/by-name/${encodeURIComponent(scheme.scheme_name)}?block=${encodeURIComponent(blockValue)}`,
      );

      if (response.ok) {
        const schemeData = await response.json();
        console.log("Fetched scheme for block:", blockValue, schemeData);

        // The server now always returns a single object for a specific block
        if (schemeData && typeof schemeData === "object") {
          // Update the current scheme with the block-specific data
          setCurrentScheme(schemeData);
          console.log("Updated current scheme to:", schemeData);
        } else {
          console.error(`No scheme found for block: ${blockValue}`);
        }
      } else {
        console.error(`Failed to fetch data for block ${blockValue}: ${response.status}`);
        // In case of error, fall back to the original scheme data
        setCurrentScheme(scheme);
      }
    } catch (error) {
      console.error("Error fetching scheme by block:", error);
      // In case of error, fall back to the original scheme data
      setCurrentScheme(scheme);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentScheme) return null;

  // Handle field names from the database
  const totalVillages = currentScheme.number_of_village || 0;
  const villagesIntegrated = currentScheme.total_villages_integrated || 0;
  const totalEsr = currentScheme.total_number_of_esr || 0;
  const esrIntegrated = currentScheme.total_esr_integrated || 0;

  const villagesIntegratedPercent = calculatePercentage(
    villagesIntegrated,
    totalVillages,
  );

  const fullyCompletedVillagesPercent = calculatePercentage(
    currentScheme.fully_completed_villages,
    totalVillages,
  );

  const esrIntegratedPercent = calculatePercentage(esrIntegrated, totalEsr);

  const fullyCompletedEsrPercent = calculatePercentage(
    currentScheme.no_fully_completed_esr,
    totalEsr,
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl bg-white border-2 border-blue-100 rounded-xl max-h-[80vh] overflow-y-auto mt-6">
        <DialogHeader className="bg-blue-50 -mx-6 -mt-6 mb-2 px-4 py-3 rounded-t-xl border-b border-blue-100">
          <DialogTitle className="text-md font-semibold text-blue-800">
            <span className="flex items-center break-words">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-blue-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="break-all">{currentScheme.scheme_name}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {/* Scheme Info */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-neutral-200 mb-3">
            <h4 className="text-xs font-medium text-neutral-700 mb-2">
              Scheme Information
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Scheme ID
                </h4>
                <p className="text-xs text-neutral-900 bg-gray-100 rounded px-2 py-1 mt-1 inline-block font-mono">
                  {currentScheme.scheme_id || "N/A"}
                </p>
              </div>
              {/* Sr. No. removed as requested */}
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Agency</h4>
                <p className="text-xs text-neutral-900">
                  {getAgencyByRegion(currentScheme.region)}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Total Villages
                </h4>
                <p className="text-xs text-neutral-900">
                  {currentScheme.number_of_village || 0}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Total ESR
                </h4>
                <p className="text-xs text-neutral-900">
                  {currentScheme.total_number_of_esr || 0}
                </p>
              </div>
              {currentScheme.dashboard_url && (
                <div>
                  <a
                    href={currentScheme.dashboard_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <h4 className="text-xs font-medium text-blue-500 hover:underline cursor-pointer flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                      PI Vision Dashboard
                    </h4>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-neutral-200 mb-3">
            <h4 className="text-xs font-medium text-neutral-700 mb-2">
              Location Information
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Region</h4>
                <p className="text-xs text-neutral-900">
                  {currentScheme.region || "N/A"}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Circle</h4>
                <p className="text-xs text-neutral-900">
                  {!currentScheme.circle ||
                    currentScheme.circle === "Circle" ||
                    currentScheme.circle === "N/A" ? (
                    <span className="text-gray-400 italic">Not specified</span>
                  ) : (
                    currentScheme.circle
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Division
                </h4>
                <p className="text-xs text-neutral-900">
                  {!currentScheme.division ||
                    currentScheme.division === "Division" ||
                    currentScheme.division === "N/A" ? (
                    <span className="text-gray-400 italic">Not specified</span>
                  ) : (
                    currentScheme.division
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Sub Division
                </h4>
                <p className="text-xs text-neutral-900">
                  {!currentScheme.sub_division ||
                    currentScheme.sub_division === "Sub Division" ||
                    currentScheme.sub_division === "N/A" ? (
                    <span className="text-gray-400 italic">Not specified</span>
                  ) : (
                    currentScheme.sub_division
                  )}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">Block</h4>
                {/* Always render block dropdown - even for single block schemes to maintain UI consistency */}
                <div className="mt-1">
                  <Select
                    value={selectedBlock}
                    onValueChange={handleBlockChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full text-xs h-7">
                      <SelectValue placeholder="Select Block" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Always show the "All Blocks" option if we have any blocks */}
                      {blocks && blocks.length > 0 && (
                        <SelectItem key="all-blocks" value="All Blocks">
                          All Blocks (Combined)
                        </SelectItem>
                      )}
                      {blocks && blocks.length > 0 ? (
                        blocks.map((block: string) => (
                          <SelectItem key={block} value={block}>
                            {block || "Not specified"}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem key={currentScheme.block || "default"} value={currentScheme.block || ""}>
                          {currentScheme.block || "Not specified"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {/* Aggregation indicator */}
                  {selectedBlock === "All Blocks" && blocks && blocks.length > 1 && (
                    <div className="mt-1 text-xs bg-blue-50 border border-blue-200 rounded-md px-2 py-1 text-blue-600">
                      Showing combined data across all blocks
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-white p-3 rounded-lg shadow-sm border border-neutral-200 mb-3">
            <h4 className="text-xs font-medium text-neutral-700 mb-2">
              Status Information
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Integration Status
                </h4>
                <p className="mt-1">
                  <span
                    className={`px-2 py-1 inline-flex items-center justify-center text-xs font-medium rounded-md ${getStatusColorClass((currentScheme.fully_completion_scheme_status || "Not-Connected") as SchemeCompletionStatus)}`}
                  >
                    {getStatusDisplayName(
                      (currentScheme.fully_completion_scheme_status ||
                        "Not-Connected") as SchemeCompletionStatus,
                    )}
                  </span>
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-neutral-500">
                  Functional Status
                </h4>
                <p className="mt-1">
                  <span
                    className={`px-2 py-1 inline-flex items-center justify-center text-xs font-medium rounded-md ${currentScheme.scheme_functional_status === "Functional"
                      ? "bg-green-100 text-green-800"
                      : currentScheme.scheme_functional_status === "Non-Functional"
                        ? "bg-red-100 text-red-800"
                        : "bg-orange-100 text-orange-800"
                      }`}
                  >
                    {currentScheme.scheme_functional_status || "Partial"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Progress Charts in a more compact grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {/* Village Status Card */}
            <div className="bg-white p-2 rounded-lg shadow-sm border border-neutral-200">
              <h4 className="text-xs font-medium text-neutral-700 mb-1">
                Village Integration
              </h4>
              <div className="bg-neutral-50 rounded-lg p-2">
                {/* Villages integrated */}
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-neutral-500">
                    Villages integrated
                  </span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {villagesIntegrated} / {totalVillages}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${isNaN(villagesIntegratedPercent) ? 0 : villagesIntegratedPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right text-blue-700">
                  {isNaN(villagesIntegratedPercent) ? "0" : villagesIntegratedPercent}%
                </div>

                {/* Fully completed villages */}
                <div className="flex justify-between mb-1 mt-2">
                  <span className="text-xs text-neutral-500">
                    Fully completed villages
                  </span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {currentScheme.fully_completed_villages || 0} /{" "}
                    {totalVillages}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${isNaN(fullyCompletedVillagesPercent) ? 0 : fullyCompletedVillagesPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right text-green-700">
                  {isNaN(fullyCompletedVillagesPercent) ? "0" : fullyCompletedVillagesPercent}%
                </div>
              </div>
            </div>

            {/* ESR Status Card */}
            <div className="bg-white p-2 rounded-lg shadow-sm border border-neutral-200">
              <h4 className="text-xs font-medium text-neutral-700 mb-1 flex items-center">
                <img
                  src="/images/esr-water-tank.png"
                  alt="ESR"
                  className="h-4 w-4 mr-1"
                />
                ESR Integration
              </h4>
              <div className="bg-neutral-50 rounded-lg p-2">
                {/* ESR integrated */}
                <div className="flex justify-between mb-1 mt-2">
                  <span className="text-xs text-neutral-500">
                    ESR integrated
                  </span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {esrIntegrated} / {totalEsr}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${isNaN(esrIntegratedPercent) ? 0 : esrIntegratedPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right text-purple-700">
                  {isNaN(esrIntegratedPercent) ? "0" : esrIntegratedPercent}%
                </div>

                {/* Fully completed ESR */}
                <div className="flex justify-between mb-1 mt-2">
                  <span className="text-xs text-neutral-500">
                    Fully completed ESR
                  </span>
                  <span className="text-xs font-semibold text-neutral-700">
                    {currentScheme.no_fully_completed_esr || 0} / {totalEsr}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${isNaN(fullyCompletedEsrPercent) ? 0 : fullyCompletedEsrPercent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-right text-green-700">
                  {isNaN(fullyCompletedEsrPercent) ? "0" : fullyCompletedEsrPercent}%
                </div>
              </div>
            </div>
          </div>

          {/* Component Integration - Simplified Card View */}
          <div className="mb-3 bg-white p-2 rounded-lg shadow-sm border border-neutral-200">
            <h4 className="text-xs font-medium text-neutral-700 mb-1">
              Component Integration
            </h4>
            <div className="grid grid-cols-3 gap-2 p-2 bg-neutral-50 rounded-lg">
              <div className="bg-white p-2 rounded border border-neutral-100 text-center">
                <div className="text-xs text-neutral-500 mb-1">Flow Meters</div>
                <div className="font-semibold text-blue-600">
                  {currentScheme.flow_meters_connected ||
                    currentScheme.flow_meters_connected ||
                    0}
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-neutral-100 text-center">
                <div className="text-xs text-neutral-500 mb-1">
                  Pressure Transmitters
                </div>
                <div className="font-semibold text-blue-600">
                  {currentScheme.pressure_transmitter_connected || 0}
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-neutral-100 text-center">
                <div className="text-xs text-neutral-500 mb-1">
                  Residual Chlorine Analyzers
                </div>
                <div className="font-semibold text-blue-600">
                  {currentScheme.residual_chlorine_analyzer_connected || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-blue-50 -mx-6 -mb-6 mt-6 px-6 py-4 rounded-b-xl border-t border-blue-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border-blue-200 hover:border-blue-300 transition-colors duration-150"
          >
            Close Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
