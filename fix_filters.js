const fs = require("fs");
const path = require("path");

const basePath = "c:\\Users\\12626\\dashboard8\\client\\src";

const filesToFix = [
  path.join(basePath, "pages/chlorine/ChlorineDashboard.tsx"),
  path.join(basePath, "pages/pressure/PressureDashboard.tsx"),
  path.join(basePath, "pages/lpcd/EnhancedLpcdDashboard.tsx"),
  path.join(basePath, "pages/scheme-lpcd/SchemeLpcdDashboard.tsx"),
  path.join(basePath, "pages/water-consumption.tsx"),
  path.join(basePath, "components/dashboard/scheme-table.tsx"),
  path.join(basePath, "pages/chlorine/DetailedChlorinePage.tsx")
];

for (const file of filesToFix) {
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    continue;
  }
  let content = fs.readFileSync(file, "utf8");
  
  // Replace standard React state for commissionedFilter etc with uiSchemeFilter
  content = content.replace(
    /const \[commissionedFilter, setCommissionedFilter\][^;]+;/g,
    `const [uiSchemeFilter, setUiSchemeFilter] = useState("all");\n  const [waterSupplyStatus, setWaterSupplyStatus] = useState("All");`
  );
  content = content.replace(/const \[fullyCompletedFilter, setFullyCompletedFilter\][^;]+;/g, "");
  content = content.replace(/const \[schemeStatusFilter, setSchemeStatusFilter\][^;]+;/g, "");
  content = content.replace(/const \[iotStatus, setIotStatus\][^;]+;/g, "");
  content = content.replace(/const \[localStatusFilter, setLocalStatusFilter\][^;]+;/g, "");
  
  // Replace filtering logic segment depending on file
  // For most files with useMemo
  // Replace the blocks of if (commissionedFilter !== "all") { ... }
  const regexFilterBlock = /\/\/ Apply commissioned.*?(?=return filtered;)/s;
  if(regexFilterBlock.test(content)) {
    content = content.replace(regexFilterBlock, `
    // Standardized Filtering Logic
    if (uiSchemeFilter !== "all" && uiSchemeFilter !== undefined) {
      filtered = filtered.filter((item) => {
        const id = item.scheme_id || item.Scheme_ID || item.schemeId;
        const status = schemeStatusMap ? schemeStatusMap.get(id) : null;
        if (!status) return false;

        switch (uiSchemeFilter) {
          case "commissioned":
            const isCommissioned = String(status.mjp_commissioned).toLowerCase() === "yes";
            if (!isCommissioned) return false;
            // Also filter by water supply status if selected
            if (waterSupplyStatus !== "All" && waterSupplyStatus !== undefined) {
              return String(status.water_supply_status).toLowerCase() === String(waterSupplyStatus).toLowerCase();
            }
            return true;
          case "fully_completed":
            return status.fully_completion_scheme_status === "Fully Completed" || status.fully_completion_scheme_status === "fully_completed";
          case "in_progress":
            return status.fully_completion_scheme_status === "In Progress" || status.fully_completion_scheme_status === "in_progress";
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

  // Replace JSX for exact SelectContent requested by user
  
  const originalSelectRegex = /<Select\s+value=\{commissionedFilter\}([\s\S]*?)<\/Select>/g;
  
  const uiReplacement = `
          <Select
            value={uiSchemeFilter}
            onValueChange={(value) => {
              setUiSchemeFilter(value);
              if(typeof setPage === "function") setPage(1);
            }}
          >
            <SelectTrigger className="w-[240px] bg-white border border-blue-200 shadow-sm h-11">
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
                    if(typeof setPage === "function") setPage(1);
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
  `;

  // We need to remove the other Select elements manually or just wipe the HTML container holding them
  // A safer approach is to replace the chunk of JSX that contains these filters
  
  fs.writeFileSync(file, content);
  console.log("Updated: ", file);
}
