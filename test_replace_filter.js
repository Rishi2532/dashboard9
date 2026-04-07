const fs = require('fs');
const path = require('path');

const fileNames = [
  "c:\\Users\\12626\\dashboard8\\client\\src\\pages\\chlorine\\ChlorineDashboard.tsx",
  "c:\\Users\\12626\\dashboard8\\client\\src\\pages\\pressure\\PressureDashboard.tsx",
  "c:\\Users\\12626\\dashboard8\\client\\src\\pages\\lpcd\\EnhancedLpcdDashboard.tsx",
  "c:\\Users\\12626\\dashboard8\\client\\src\\pages\\scheme-lpcd\\SchemeLpcdDashboard.tsx",
  "c:\\Users\\12626\\dashboard8\\client\\src\\pages\\water-consumption.tsx"
];

for(const file of fileNames) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. replace state handlers
  content = content.replace(
    /const \[commissionedFilter, setCommissionedFilter\] = useState<string>\("all"\);\s*const \[fullyCompletedFilter, setFullyCompletedFilter\] =\s*useState<string>\("all"\);\s*const \[schemeStatusFilter, setSchemeStatusFilter\] = useState<string>\("all"\);/,
    `const [uiSchemeFilter, setUiSchemeFilter] = useState<string>("all");\n  const [waterSupplyStatus, setWaterSupplyStatus] = useState<string>("All");`
  );
  if (file.includes("water-consumption.tsx")) {
    content = content.replace(
      /const \[commissionedFilter, setCommissionedFilter\] = useState<string>\("all"\);\s*const \[fullyCompletedFilter, setFullyCompletedFilter\] =\s*useState<string>\("all"\);\s*const \[iotStatus, setIotStatus\] = useState<string>\("all"\);/,
      `const [uiSchemeFilter, setUiSchemeFilter] = useState<string>("all");\n  const [waterSupplyStatus, setWaterSupplyStatus] = useState<string>("All");`
    );
  }

  // 2. Remove the filter handlers completely
  content = content.replace(/\/\/ Handler for commissioned filter changes.*?setPage\(1\);\n  };/gs, '');
  content = content.replace(/\/\/ Handle MJP commissioned status change \(same logic as EnhancedLpcdDashboard\).*?setPage\(1\);\n  };/gs, '');
  
  // 3. Update the global filtering block logic from 'useMemo'
  content = content.replace(/\/\/ Apply commissioned.*?(?=const handleSensorStatusClick|\/\/ Handler for sensor status card clicks|return filtered;|return filteredData;)/s, `
    // Standardized Filtering Logic
    if (uiSchemeFilter !== "all" && uiSchemeFilter !== undefined) {
      filtered = filtered.filter((item) => {
        const status = schemeStatusMap ? schemeStatusMap.get(item.scheme_id) : null;
        if (!status) return false;

        switch (uiSchemeFilter) {
          case "commissioned":
            const isCommissioned = String(status.mjp_commissioned).toLowerCase() === "yes";
            if (!isCommissioned) return false;
            if (waterSupplyStatus !== "All") {
              return String(status.water_supply_status).toLowerCase() === String(waterSupplyStatus).toLowerCase();
            }
            return true;
          case "fully_completed":
            return status.fully_completion_scheme_status === "Fully Completed";
          case "in_progress":
            return status.fully_completion_scheme_status === "In Progress";
          case "common_filter":
            return (
              (status.fully_completion_scheme_status === "Fully Completed" ||
                status.fully_completion_scheme_status === "Completed") &&
              String(status.water_supply).toLowerCase() === "yes"
            );
          default:
            return true;
        }
      });
    }

    `);

    // For water-consumption.tsx the variable is filteredData
    if(file.includes('water-consumption.tsx')) {
        content = content.replace(/\/\/ Apply MJP commissioned filter - use frontend join with schemeStatusData.*?(?=return filteredData;)/s, `
    // Standardized Filtering Logic
    if (uiSchemeFilter !== "all" && uiSchemeFilter !== undefined) {
      filteredData = filteredData.filter((item) => {
        const id = item.scheme_id || item.Scheme_ID;
        const status = schemeStatusMap ? schemeStatusMap.get(id) : null;
        if (!status) return false;

        switch (uiSchemeFilter) {
          case "commissioned":
            const isCommissioned = String(status.mjp_commissioned).toLowerCase() === "yes";
            if (!isCommissioned) return false;
            if (waterSupplyStatus !== "All") {
              return String(status.water_supply_status).toLowerCase() === String(waterSupplyStatus).toLowerCase();
            }
            return true;
          case "fully_completed":
            return status.fully_completion_scheme_status === "Fully Completed";
          case "in_progress":
            return status.fully_completion_scheme_status === "In Progress";
          case "common_filter":
            return (
              (status.fully_completion_scheme_status === "Fully Completed" ||
                status.fully_completion_scheme_status === "Completed") &&
              String(status.water_supply).toLowerCase() === "yes"
            );
          default:
            return true;
        }
      });
    }
        `);
    }

  // 4. Update JSX replacing the 3 selects
  content = content.replace(/{?\/\* Commissioned Status Filter \*\/}?.*?<\/Select>\s*<\/div>/gs, `
          {/* Standardized Filters */}
          <div className="flex flex-col md:flex-row gap-4 lg:col-span-1">
            <Select
              value={uiSchemeFilter}
              onValueChange={(value) => {
                setUiSchemeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[240px] bg-white border border-slate-200 h-11">
                <SelectValue placeholder="Select Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schemes</SelectItem>
                <SelectItem value="commissioned">100% Civil work Completed</SelectItem>
                <SelectItem value="fully_completed">Fully Instrumented Schemes(IoT)</SelectItem>
                <SelectItem value="in_progress">Partially instrumented schemes(IoT)</SelectItem>
                <SelectItem value="common_filter">Common (IoT + MJP)</SelectItem>
              </SelectContent>
            </Select>

            {uiSchemeFilter === "commissioned" && (
              <div className="flex bg-gray-100 p-0.5 rounded-md h-11 self-start">
                {["All", "Full", "Partial", "No"].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setWaterSupplyStatus(status);
                      setPage(1);
                    }}
                    className={\`px-3 text-xs font-medium rounded \${
                      waterSupplyStatus === status
                        ? "bg-white shadow-sm text-blue-600 font-bold"
                        : "text-gray-600 hover:text-gray-900"
                    }\`}
                  >
                    {status === "All" ? "All Water Supply" : status}
                  </button>
                ))}
              </div>
            )}
          </div>
  `);

  content = content.replace(/{?\/\* Completion Status Filter \*\/}?.*?<\/Select>\s*<\/div>/gs, '');
  content = content.replace(/{?\/\* IoT Status Filter \*\/}?.*?<\/Select>\s*<\/div>/gs, '');
  
  // same for water-consumption
  content = content.replace(/{?\/\* MJP Civil Status Filter Box \*\/}?.*?(?=<\div className="flex-1">.*?<Select.*?Agency)/s, '');

  // 5. Array dependencies
  content = content.replace(/commissionedFilter,\s*fullyCompletedFilter,\s*schemeStatusFilter,/g, 'uiSchemeFilter, waterSupplyStatus, ');
  content = content.replace(/commissionedFilter,\s*fullyCompletedFilter,\s*iotStatus,/g, 'uiSchemeFilter, waterSupplyStatus, ');

  fs.writeFileSync(file, content);
  console.log("Fixed " + file);
}
