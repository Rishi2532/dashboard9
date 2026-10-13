const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('client/src/pages/chlorine/DetailedChlorinePage.tsx');
let raw = fs.readFileSync(targetPath, 'utf8');
const isCRLF = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

function makeFlexibleRegex(pattern) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flexible = escaped.replace(/\s+/g, '\\s+');
  return new RegExp(flexible);
}

const ops = [];

function addOp(name, search, replace) {
  ops.push({ name, search, replace });
}

// -------------------------------------------------------------
// TABLE 2: lpcdDetails Body (Header already has Remark at end)
// Lines 5253-5332
// -------------------------------------------------------------
addOp(
  'Table 2 Body: Remove Remark between village and population',
  `<TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60 truncate">
    {item.village_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60 max-w-[150px]">
    {renderRemarkCell(
      villageIssuesMap?.get(
        \`\${item.scheme_id}-\${item.village_name}\`,
      ) || [],
      \`Remarks for \${item.village_name}\`,
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60">`,
  `<TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60 truncate">
    {item.village_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60">`
);

addOp(
  'Table 2 Body: Add Remark at end of row',
  `{clickedLPCDCell.statisticType.startsWith(
    "below-55-",
  ) && (
    <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-bold text-rose-600 dark:text-rose-400">
      {item.consecutive_days || "N/A"}
    </TableCell>
  )}
</TableRow>`,
  `{clickedLPCDCell.statisticType.startsWith(
    "below-55-",
  ) && (
    <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-bold text-rose-600 dark:text-rose-400 border-r border-slate-100/80 dark:border-slate-800/60">
      {item.consecutive_days || "N/A"}
    </TableCell>
  )}
  <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
    {renderRemarkCell(
      villageIssuesMap?.get(
        \`\${item.scheme_id}-\${item.village_name}\`,
      ) || [],
      \`Remarks for \${item.village_name}\`,
    )}
  </TableCell>
</TableRow>`
);

// -------------------------------------------------------------
// TABLE 3: schemeLpcdDetails (Lines 6160-6269)
// -------------------------------------------------------------
addOp(
  'Table 3 Header: Move Remark to end',
  `<TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[100px] border-r border-white/10">
    Owner
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
    Remark
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    Population
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[70px] text-center border-r border-white/10">
    Villages
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    LPCD
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[80px] text-center">
    Dashboard
  </TableHead>
</TableRow>`,
  `<TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[100px] border-r border-white/10">
    Owner
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    Population
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[70px] text-center border-r border-white/10">
    Villages
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    LPCD
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    Dashboard
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[150px] text-center">
    Remark
  </TableHead>
</TableRow>`
);

addOp(
  'Table 3 Body: Move Remark to end',
  `<TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
    {item.owner ||
      item.agency_type ||
      "N/A"}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60 max-w-[150px]">
    {renderRemarkCell(
      schemeIssuesMap?.get(
        String(item.scheme_id),
      ) || [],
      \`Remarks for \${item.scheme_name}\`,
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60">`,
  `<TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
    {item.owner ||
      item.agency_type ||
      "N/A"}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60">`
);

addOp(
  'Table 3 Body: Add Remark after Dashboard',
  `<TableCell className="!px-4 !py-3 text-center">
    {item.dashboard_url ? (
      <a
        href={item.dashboard_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 rounded text-[11px] font-medium"
      >
        <ExternalLink className="h-3 w-3" />
        View
      </a>
    ) : (
      <span className="text-slate-400 text-[11px]">
        -
      </span>
    )}
  </TableCell>
</TableRow>`,
  `<TableCell className="!px-4 !py-3 text-center border-r border-slate-100/80 dark:border-slate-800/60">
    {item.dashboard_url ? (
      <a
        href={item.dashboard_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 rounded text-[11px] font-medium"
      >
        <ExternalLink className="h-3 w-3" />
        View
      </a>
    ) : (
      <span className="text-slate-400 text-[11px]">
        -
      </span>
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
    {renderRemarkCell(
      schemeIssuesMap?.get(
        String(item.scheme_id),
      ) || [],
      \`Remarks for \${item.scheme_name}\`,
    )}
  </TableCell>
</TableRow>`
);

// -------------------------------------------------------------
// TABLE 4: pressureSensorDetails (Lines 6483-6601)
// -------------------------------------------------------------
addOp(
  'Table 4 Header: Move Remark after Actions',
  `<TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[100px]">
    Status
  </TableHead>
  <TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[150px]">
    Remark
  </TableHead>
  <TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[100px]">
    Dashboard
  </TableHead>
  <TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[100px] sticky right-0 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 z-10 border-l border-orange-200/80 dark:border-orange-800/60">
    Actions
  </TableHead>
</TableRow>`,
  `<TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[100px]">
    Status
  </TableHead>
  <TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[100px]">
    Dashboard
  </TableHead>
  <TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[100px] sticky right-0 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 z-10 border-l border-orange-200/80 dark:border-orange-800/60 border-r border-orange-200/80 dark:border-orange-800/60">
    Actions
  </TableHead>
  <TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[150px]">
    Remark
  </TableHead>
</TableRow>`
);

addOp(
  'Table 4 Body: Remove Remark between Status and Dashboard',
  `<TableCell className="!px-4 !py-2 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${item.scheme_id}-\${item.village_name}-\${item.esr_name}\`,
      ) || [],
      \`Remarks for \${item.esr_name}\`,
    )}
  </TableCell>
  <TableCell className="!px-4 !py-2 text-center">
    {item.dashboard_url ? (`,
  `<TableCell className="!px-4 !py-2 text-center">
    {item.dashboard_url ? (`
);

addOp(
  'Table 4 Body: Add Remark after Actions',
  `<Button
    variant="ghost"
    size="sm"
    onClick={() =>
      setSelectedSensor(item)
    }
    className="h-7 px-3 text-[11px] font-semibold bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 hover:from-orange-100 hover:to-amber-100 dark:from-orange-950 dark:to-amber-950 dark:text-orange-300 dark:hover:from-orange-900 dark:hover:to-amber-900 rounded-lg shadow-sm border border-orange-200/50 dark:border-orange-700/50"
  >
    <Eye className="h-3 w-3 mr-1" />
    History
  </Button>
</TableCell>
</TableRow>`,
  `<Button
    variant="ghost"
    size="sm"
    onClick={() =>
      setSelectedSensor(item)
    }
    className="h-7 px-3 text-[11px] font-semibold bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 hover:from-orange-100 hover:to-amber-100 dark:from-orange-950 dark:to-amber-950 dark:text-orange-300 dark:hover:from-orange-900 dark:hover:to-amber-900 rounded-lg shadow-sm border border-orange-200/50 dark:border-orange-700/50"
  >
    <Eye className="h-3 w-3 mr-1" />
    History
  </Button>
</TableCell>
<TableCell className="!px-4 !py-2 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
  {renderRemarkCell(
    esrIssuesMap?.get(
      \`\${item.scheme_id}-\${item.village_name}-\${item.esr_name}\`,
    ) || [],
    \`Remarks for \${item.esr_name}\`,
  )}
</TableCell>
</TableRow>`
);

// -------------------------------------------------------------
// TABLE 5: dayWiseSensors (Lines 7196-7286)
// Distinguish with {clickedDayWiseCell.metric !== "offline" && (
// -------------------------------------------------------------
addOp(
  'Table 5 Header: Move Remark to end',
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
    ESR Name
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5 w-[150px] text-center">
    Remark
  </TableHead>
  {clickedDayWiseCell.metric !== "offline" && (`,
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
    ESR Name
  </TableHead>
  {clickedDayWiseCell.metric !== "offline" && (`
);

addOp(
  'Table 5 Header: Add Remark at end',
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
    {clickedDayWiseCell.metric ===
    "offline"
      ? "Last Seen"
      : "Consecutive Days"}
  </TableHead>
</TableRow>`,
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
    {clickedDayWiseCell.metric ===
    "offline"
      ? "Last Seen"
      : "Consecutive Days"}
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5 w-[150px] text-center">
    Remark
  </TableHead>
</TableRow>`
);

addOp(
  'Table 5 Body: Move Remark to end',
  `<TableCell className="!px-3 !py-2 text-[12px]">
    {sensor.esr_name}
  </TableCell>
  <TableCell className="!px-3 !py-2 text-[12px] max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
  {clickedDayWiseCell.metric !== "offline" && (`,
  `<TableCell className="!px-3 !py-2 text-[12px]">
    {sensor.esr_name}
  </TableCell>
  {clickedDayWiseCell.metric !== "offline" && (`
);

addOp(
  'Table 5 Body: Add Remark at end',
  `<TableCell className="!px-3 !py-2 text-[12px]">
    {clickedDayWiseCell.metric ===
    "offline"
      ? sensor.last_seen || "N/A"
      : sensor.consecutive_days ||
        0}
  </TableCell>
</TableRow>`,
  `<TableCell className="!px-3 !py-2 text-[12px]">
    {clickedDayWiseCell.metric ===
    "offline"
      ? sensor.last_seen || "N/A"
      : sensor.consecutive_days ||
        0}
  </TableCell>
  <TableCell className="!px-3 !py-2 text-[12px] max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
</TableRow>`
);

// -------------------------------------------------------------
// TABLE 6: pressureDayWiseSensors (Lines 8270-8359)
// Distinguish with {clickedPressureDayWiseCell.metric !== "offline" && (
// -------------------------------------------------------------
addOp(
  'Table 6 Header: Move Remark to end',
  `ESR Name
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5 w-[150px] text-center">
    Remark
  </TableHead>
  {clickedPressureDayWiseCell.metric !== "offline" && (`,
  `ESR Name
  </TableHead>
  {clickedPressureDayWiseCell.metric !== "offline" && (`
);

addOp(
  'Table 6 Header: Add Remark at end',
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
    {clickedPressureDayWiseCell.metric ===
    "offline"
      ? "Last Seen"
      : "Consecutive Days"}
  </TableHead>
</TableRow>`,
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
    {clickedPressureDayWiseCell.metric ===
    "offline"
      ? "Last Seen"
      : "Consecutive Days"}
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5 w-[150px] text-center">
    Remark
  </TableHead>
</TableRow>`
);

addOp(
  'Table 6 Body: Move Remark to end',
  `<TableCell className="!px-3 !py-2 text-[12px]">
    {sensor.esr_name}
  </TableCell>
  <TableCell className="!px-3 !py-2 text-[12px] max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
  {clickedPressureDayWiseCell.metric !== "offline" && (`,
  `<TableCell className="!px-3 !py-2 text-[12px]">
    {sensor.esr_name}
  </TableCell>
  {clickedPressureDayWiseCell.metric !== "offline" && (`
);

addOp(
  'Table 6 Body: Add Remark at end',
  `<TableCell className="!px-3 !py-2 text-[12px]">
    {clickedPressureDayWiseCell.metric ===
    "offline"
      ? sensor.last_seen || "N/A"
      : sensor.consecutive_days ||
        0}
  </TableCell>
</TableRow>`,
  `<TableCell className="!px-3 !py-2 text-[12px]">
    {clickedPressureDayWiseCell.metric ===
    "offline"
      ? sensor.last_seen || "N/A"
      : sensor.consecutive_days ||
        0}
  </TableCell>
  <TableCell className="!px-3 !py-2 text-[12px] max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
</TableRow>`
);

// -------------------------------------------------------------
// TABLE 7: pressureRegionComparisonSensors (Lines 9986-10107)
// Distinguish with pressureRegionComparisonSensors
// -------------------------------------------------------------
addOp(
  'Table 7 Header: Move Remark to end',
  `pressureRegionComparisonSensors &&
  pressureRegionComparisonSensors.data.length > 0 ? (
  <div className="overflow-x-auto max-h-[450px] overflow-y-auto border border-orange-200/60 dark:border-orange-800/60 rounded-xl m-3 shadow-sm">
    <Table className="min-w-max">
      <TableHeader className="sticky top-0 z-10">
        <TableRow className="bg-orange-800 dark:bg-orange-900">
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Region
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Division
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[90px] border-r border-white/10">
            Scheme ID
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[140px] border-r border-white/10">
            Scheme Name
          </TableHead>
          <TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Owner
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Village
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            ESR Name
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
            Remark
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
            Status
          </TableHead>`,
  `pressureRegionComparisonSensors &&
  pressureRegionComparisonSensors.data.length > 0 ? (
  <div className="overflow-x-auto max-h-[450px] overflow-y-auto border border-orange-200/60 dark:border-orange-800/60 rounded-xl m-3 shadow-sm">
    <Table className="min-w-max">
      <TableHeader className="sticky top-0 z-10">
        <TableRow className="bg-orange-800 dark:bg-orange-900">
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Region
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Division
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[90px] border-r border-white/10">
            Scheme ID
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[140px] border-r border-white/10">
            Scheme Name
          </TableHead>
          <TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Owner
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Village
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            ESR Name
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
            Status
          </TableHead>`
);

addOp(
  'Table 7 Header: Add Remark at end',
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[70px] text-center">
    Days
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10">
    Dashboard
  </TableHead>
</TableRow>
</TableHeader>
<TableBody>
{pressureRegionComparisonSensors.data.map(`,
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[70px] text-center">
    Days
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10 border-r border-white/10">
    Dashboard
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[150px] text-center">
    Remark
  </TableHead>
</TableRow>
</TableHeader>
<TableBody>
{pressureRegionComparisonSensors.data.map(`
);

addOp(
  'Table 7 Body: Move Remark to end',
  `data-testid={\`row-pressure-comparison-sensor-\${idx}\`}
>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60 font-medium">
    {sensor.region}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.division}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-semibold text-orange-600 dark:text-orange-400 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.scheme_id}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-semibold text-slate-800 dark:text-slate-200 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.scheme_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
    {sensor.owner ||
      sensor.agency_type ||
      "N/A"}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.village_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.esr_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60 max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center border-r border-orange-100/80 dark:border-orange-900/60">`,
  `data-testid={\`row-pressure-comparison-sensor-\${idx}\`}
>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60 font-medium">
    {sensor.region}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.division}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-semibold text-orange-600 dark:text-orange-400 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.scheme_id}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-semibold text-slate-800 dark:text-slate-200 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.scheme_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
    {sensor.owner ||
      sensor.agency_type ||
      "N/A"}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.village_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.esr_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center border-r border-orange-100/80 dark:border-orange-900/60">`
);

addOp(
  'Table 7 Body: Add Remark at end of row',
  `<TableCell className="!px-4 !py-3 text-center border-l border-orange-100/80 dark:border-orange-900/60">
    {sensor.dashboard_url && (
      <a
        href={sensor.dashboard_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors shadow-sm"
        title="Open Dashboard"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    )}
  </TableCell>
</TableRow>
),
)}
</TableBody>
</Table>
</div>
) : (
<div className="text-center py-12">
  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
  <p className="text-gray-500">No sensors found</p>`,
  `<TableCell className="!px-4 !py-3 text-center border-l border-orange-100/80 dark:border-orange-900/60 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.dashboard_url && (
      <a
        href={sensor.dashboard_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors shadow-sm"
        title="Open Dashboard"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
</TableRow>
),
)}
</TableBody>
</Table>
</div>
) : (
<div className="text-center py-12">
  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
  <p className="text-gray-500">No sensors found</p>`
);

// -------------------------------------------------------------
// TABLE 8: dayWiseSensors modal (Lines 10219-10321)
// -------------------------------------------------------------
addOp(
  'Table 8 Header: Move Remark to end',
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
    ESR Name
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
    Remark
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    Status
  </TableHead>`,
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
    ESR Name
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    Status
  </TableHead>`
);

addOp(
  'Table 8 Header: Add Remark at end',
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10">
    Dashboard
  </TableHead>
</TableRow>`,
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10 border-r border-white/10">
    Dashboard
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[150px] text-center">
    Remark
  </TableHead>
</TableRow>`
);

addOp(
  'Table 8 Body: Move Remark to end',
  `<TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-amber-100/80 dark:border-amber-900/60">
    {sensor.esr_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-amber-100/80 dark:border-amber-900/60 max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center border-r border-amber-100/80 dark:border-amber-900/60">`,
  `<TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-amber-100/80 dark:border-amber-900/60">
    {sensor.esr_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center border-r border-amber-100/80 dark:border-amber-900/60">`
);

addOp(
  'Table 8 Body: Add Remark at end',
  `<TableCell className="!px-4 !py-3 text-center border-l border-amber-100/80 dark:border-amber-900/60">
    {sensor.dashboard_url && (
      <a
        href={sensor.dashboard_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors shadow-sm"
        title="Open Dashboard"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    )}
  </TableCell>
</TableRow>`,
  `<TableCell className="!px-4 !py-3 text-center border-l border-amber-100/80 dark:border-amber-900/60 border-r border-amber-100/80 dark:border-amber-900/60">
    {sensor.dashboard_url && (
      <a
        href={sensor.dashboard_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors shadow-sm"
        title="Open Dashboard"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
</TableRow>`
);

// -------------------------------------------------------------
// TABLE 9: pressureDayWiseSensors modal (Lines 10438-10563)
// -------------------------------------------------------------
addOp(
  'Table 9 Header: Move Remark to end',
  `pressureDayWiseSensors &&
  pressureDayWiseSensors.data.length > 0 ? (
  <div className="overflow-x-auto max-h-[450px] overflow-y-auto border border-orange-200/60 dark:border-orange-800/60 rounded-xl m-3 shadow-sm">
    <Table className="min-w-max">
      <TableHeader className="sticky top-0 z-10">
        <TableRow className="bg-orange-800 dark:bg-orange-900">
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Region
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Division
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[90px] border-r border-white/10">
            Scheme ID
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[140px] border-r border-white/10">
            Scheme Name
          </TableHead>
          <TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Owner
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Village
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            ESR Name
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
            Remark
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
            Status
          </TableHead>`,
  `pressureDayWiseSensors &&
  pressureDayWiseSensors.data.length > 0 ? (
  <div className="overflow-x-auto max-h-[450px] overflow-y-auto border border-orange-200/60 dark:border-orange-800/60 rounded-xl m-3 shadow-sm">
    <Table className="min-w-max">
      <TableHeader className="sticky top-0 z-10">
        <TableRow className="bg-orange-800 dark:bg-orange-900">
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Region
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Division
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[90px] border-r border-white/10">
            Scheme ID
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[140px] border-r border-white/10">
            Scheme Name
          </TableHead>
          <TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Owner
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            Village
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
            ESR Name
          </TableHead>
          <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
            Status
          </TableHead>`
);

addOp(
  'Table 9 Header: Add Remark at end',
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[70px] text-center">
    Days
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10">
    Dashboard
  </TableHead>
</TableRow>
</TableHeader>
<TableBody>
{pressureDayWiseSensors.data.map(`,
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[70px] text-center">
    Days
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10 border-r border-white/10">
    Dashboard
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[150px] text-center">
    Remark
  </TableHead>
</TableRow>
</TableHeader>
<TableBody>
{pressureDayWiseSensors.data.map(`
);

addOp(
  'Table 9 Body: Move Remark to end',
  `data-testid={\`row-pressure-daywise-sensor-\${idx}\`}
>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60 font-medium">
    {sensor.region}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.division}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-semibold text-orange-700 dark:text-orange-400 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.scheme_id}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-semibold text-slate-800 dark:text-slate-200 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.scheme_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
    {sensor.owner ||
      sensor.agency_type ||
      "N/A"}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.village_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.esr_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60 max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center border-r border-orange-100/80 dark:border-orange-900/60">`,
  `data-testid={\`row-pressure-daywise-sensor-\${idx}\`}
>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60 font-medium">
    {sensor.region}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.division}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-semibold text-orange-700 dark:text-orange-400 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.scheme_id}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-semibold text-slate-800 dark:text-slate-200 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.scheme_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
    {sensor.owner ||
      sensor.agency_type ||
      "N/A"}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.village_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.esr_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center border-r border-orange-100/80 dark:border-orange-900/60">`
);

addOp(
  'Table 9 Body: Add Remark at end',
  `<TableCell className="!px-4 !py-3 text-center border-l border-orange-100/80 dark:border-orange-900/60">
    {sensor.dashboard_url && (
      <a
        href={sensor.dashboard_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors shadow-sm"
        title="Open Dashboard"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    )}
  </TableCell>
</TableRow>
),
)}
</TableBody>
</Table>
</div>
) : (
<div className="text-center py-12">
  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
  <p className="text-gray-500">No sensors found</p>
</div>
)}
</CardContent>
</Card>
)}

{/* LPCD Day-Wise Clicked Sensor List */}`,
  `<TableCell className="!px-4 !py-3 text-center border-l border-orange-100/80 dark:border-orange-900/60 border-r border-orange-100/80 dark:border-orange-900/60">
    {sensor.dashboard_url && (
      <a
        href={sensor.dashboard_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors shadow-sm"
        title="Open Dashboard"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
</TableRow>
),
)}
</TableBody>
</Table>
</div>
) : (
<div className="text-center py-12">
  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
  <p className="text-gray-500">No sensors found</p>
</div>
)}
</CardContent>
</Card>
)}

{/* LPCD Day-Wise Clicked Sensor List */}`
);

// -------------------------------------------------------------
// TABLE 10: regionComparisonSensors (Lines 10682-10783)
// -------------------------------------------------------------
addOp(
  'Table 10 Header: Move Remark to end',
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    Chlorine
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
    Remark
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[90px] text-center border-r border-white/10">
    Date
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[70px] text-center border-r border-white/10">
    Days
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[80px] text-center">
    Dashboard
  </TableHead>
</TableRow>`,
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    Chlorine
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[90px] text-center border-r border-white/10">
    Date
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[70px] text-center border-r border-white/10">
    Days
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    Dashboard
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[150px] text-center">
    Remark
  </TableHead>
</TableRow>`
);

addOp(
  'Table 10 Body: Move Remark to end',
  `<TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-violet-100/80 dark:border-violet-900/60 max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center text-[12px] text-slate-600 dark:text-slate-400 border-r border-violet-100/80 dark:border-violet-900/60">`,
  `<TableCell className="!px-4 !py-3 text-center text-[12px] text-slate-600 dark:text-slate-400 border-r border-violet-100/80 dark:border-violet-900/60">`
);

addOp(
  'Table 10 Body: Add Remark at end',
  `<TableCell className="!px-4 !py-3 text-center border-l border-violet-100/80 dark:border-violet-900/60">
    {sensor.dashboard_url && (
      <a
        href={sensor.dashboard_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors shadow-sm"
        title="Open Dashboard"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    )}
  </TableCell>
</TableRow>
),
)}
</TableBody>
</Table>
</div>
) : (
<div className="text-center py-12">
  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
  <p className="text-gray-500">No sensors found</p>`,
  `<TableCell className="!px-4 !py-3 text-center border-l border-violet-100/80 dark:border-violet-900/60 border-r border-violet-100/80 dark:border-violet-900/60">
    {sensor.dashboard_url && (
      <a
        href={sensor.dashboard_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors shadow-sm"
        title="Open Dashboard"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
</TableRow>
),
)}
</TableBody>
</Table>
</div>
) : (
<div className="text-center py-12">
  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
  <p className="text-gray-500">No sensors found</p>`
);

// -------------------------------------------------------------
// TABLE 11: lpcdDayWiseVillages (Lines 10893-10982)
// -------------------------------------------------------------
addOp(
  'Table 11 Header: Move Remark to end',
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
    Village
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
    Remark
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    LPCD
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[70px] text-center">
    Days
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10">
    Dashboard
  </TableHead>
</TableRow>`,
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
    Village
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    LPCD
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[70px] text-center">
    Days
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10 border-r border-white/10">
    Dashboard
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[150px] text-center">
    Remark
  </TableHead>
</TableRow>`
);

addOp(
  'Table 11 Body: Move Remark to end',
  `<TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-cyan-100/80 dark:border-cyan-900/60 truncate">
    {sensor.village_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-cyan-100/80 dark:border-cyan-900/60 max-w-[150px]">
    {renderRemarkCell(
      villageIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}\`,
      ) || [],
      \`Remarks for \${sensor.village_name}\`,
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-cyan-100/80 dark:border-cyan-900/60">`,
  `<TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-cyan-100/80 dark:border-cyan-900/60 truncate">
    {sensor.village_name}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-cyan-100/80 dark:border-cyan-900/60">`
);

addOp(
  'Table 11 Body: Add Remark at end',
  `<TableCell className="!px-4 !py-3 text-center border-l border-cyan-100/80 dark:border-cyan-900/60">
    {(sensor as any).dashboard_url ? (
      <a
        href={(sensor as any).dashboard_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center p-1.5 text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:text-cyan-200 dark:hover:bg-cyan-900/50 rounded-full transition-colors"
        title="Open Dashboard"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    ) : (
      <span className="text-slate-400">
        -
      </span>
    )}
  </TableCell>
</TableRow>`,
  `<TableCell className="!px-4 !py-3 text-center border-l border-cyan-100/80 dark:border-cyan-900/60 border-r border-cyan-100/80 dark:border-cyan-900/60">
    {(sensor as any).dashboard_url ? (
      <a
        href={(sensor as any).dashboard_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center p-1.5 text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:text-cyan-200 dark:hover:bg-cyan-900/50 rounded-full transition-colors"
        title="Open Dashboard"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    ) : (
      <span className="text-slate-400">
        -
      </span>
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
    {renderRemarkCell(
      villageIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}\`,
      ) || [],
      \`Remarks for \${sensor.village_name}\`,
    )}
  </TableCell>
</TableRow>`
);

// -------------------------------------------------------------
// TABLE 12: schemeLpcdDayWiseSchemes (Lines 11096-11222)
// -------------------------------------------------------------
addOp(
  'Table 12 Header: Move Remark to end',
  `<TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
    Owner
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
    Remark
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
    Block
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    LPCD
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[70px] text-center">
    Days
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[80px] text-center">
    Dashboard
  </TableHead>
</TableRow>`,
  `<TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
    Owner
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
    Block
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    LPCD
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[70px] text-center border-r border-white/10">
    Days
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
    Dashboard
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[150px] text-center">
    Remark
  </TableHead>
</TableRow>`
);

addOp(
  'Table 12 Body: Move Remark to end',
  `<TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
    {scheme.owner ||
      scheme.agency_type ||
      "N/A"}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-purple-100/80 dark:border-purple-900/60 max-w-[150px]">
    {renderRemarkCell(
      schemeIssuesMap?.get(
        String(scheme.scheme_id),
      ) || [],
      \`Remarks for \${scheme.scheme_name}\`,
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-purple-100/80 dark:border-purple-900/60">`,
  `<TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
    {scheme.owner ||
      scheme.agency_type ||
      "N/A"}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-purple-100/80 dark:border-purple-900/60">`
);

addOp(
  'Table 12 Body: Add Remark at end',
  `<TableCell className="!px-4 !py-3 text-center">
    {scheme.dashboard_url ? (
      <a
        href={scheme.dashboard_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-200 dark:hover:bg-purple-900/50 rounded-full transition-colors"
        title="Open Dashboard"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    ) : (
      <span className="text-slate-400">
        -
      </span>
    )}
  </TableCell>
</TableRow>`,
  `<TableCell className="!px-4 !py-3 text-center border-r border-purple-100/80 dark:border-purple-900/60">
    {scheme.dashboard_url ? (
      <a
        href={scheme.dashboard_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-200 dark:hover:bg-purple-900/50 rounded-full transition-colors"
        title="Open Dashboard"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    ) : (
      <span className="text-slate-400">
        -
      </span>
    )}
  </TableCell>
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
    {renderRemarkCell(
      schemeIssuesMap?.get(
        String(scheme.scheme_id),
      ) || [],
      \`Remarks for \${scheme.scheme_name}\`,
    )}
  </TableCell>
</TableRow>`
);

// -------------------------------------------------------------
// TABLE 13: chlorineDivisionSensors (Lines 12826-12929)
// -------------------------------------------------------------
addOp(
  'Table 13 Header: Move Remark after Chlorine',
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-teal-50 !px-3 !py-3.5 w-[150px] text-center border-r border-white/10">
    Remark
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-teal-50 !px-3 !py-3.5 text-center w-[100px]">
    Chlorine (mg/l)
  </TableHead>
</TableRow>`,
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-teal-50 !px-3 !py-3.5 text-center w-[100px] border-r border-white/10">
    Chlorine (mg/l)
  </TableHead>
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-teal-50 !px-3 !py-3.5 w-[150px] text-center">
    Remark
  </TableHead>
</TableRow>`
);

addOp(
  'Table 13 Body: Move Remark after Chlorine',
  `<TableCell className="!px-3 !py-2.5 !text-[12px] text-slate-600 dark:text-slate-400 truncate border-r border-teal-100/80 dark:border-teal-900/60">
    {sensor.esr_name}
  </TableCell>
  <TableCell className="!px-3 !py-2.5 !text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-teal-100/80 dark:border-teal-900/60 max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
      ) || [],
      \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
    )}
  </TableCell>
  <TableCell className="!px-3 !py-2.5 text-center text-sm">`,
  `<TableCell className="!px-3 !py-2.5 !text-[12px] text-slate-600 dark:text-slate-400 truncate border-r border-teal-100/80 dark:border-teal-900/60">
    {sensor.esr_name}
  </TableCell>
  <TableCell className="!px-3 !py-2.5 text-center text-sm border-r border-teal-100/80 dark:border-teal-900/60">`
);

addOp(
  'Table 13 Body: Add Remark after Chlorine cell',
  `{sensor.latest_chlorine_value !== null
    ? Number(
        sensor.latest_chlorine_value,
      ).toFixed(2)
    : "N/A"}
</Badge>
</TableCell>
</TableRow>`,
  `{sensor.latest_chlorine_value !== null
    ? Number(
        sensor.latest_chlorine_value,
      ).toFixed(2)
    : "N/A"}
</Badge>
</TableCell>
<TableCell className="!px-3 !py-2.5 !text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
  {renderRemarkCell(
    esrIssuesMap?.get(
      \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
    ) || [],
    \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
  )}
</TableCell>
</TableRow>`
);

// -------------------------------------------------------------
// TABLE 14: comparisonDetails (Lines 16308-16488)
// -------------------------------------------------------------
addOp(
  'Table 14 Header: Move Remark to end of row',
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[130px] border-r border-white/10">
    Village Name
  </TableHead>
  {!clickedComparisonCell.isLpcd && (
    <>
      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
        ESR Name
      </TableHead>
      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
        Remark
      </TableHead>
    </>
  )}
  {clickedComparisonCell.isLpcd && (
    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
      Remark
    </TableHead>
  )}
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[180px] border-r border-white/10">`,
  `<TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[130px] border-r border-white/10">
    Village Name
  </TableHead>
  {!clickedComparisonCell.isLpcd && (
    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
      ESR Name
    </TableHead>
  )}
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[180px] border-r border-white/10">`
);

addOp(
  'Table 14 Header: Add Remark at end of row',
  `{clickedComparisonCell.isLpcd ? (
    <>
      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 text-center w-[100px] border-r border-white/10">
        Population
      </TableHead>
      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 text-center w-[80px]">
        LPCD
      </TableHead>
    </>
  ) : (
    <>
      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 text-center w-[100px]">
        {clickedComparisonCell.category ===
          "offline" ||
        clickedComparisonCell.category ===
          "offline-with-no-water" ||
        clickedComparisonCell.category ===
          "offline-with-water"
          ? "Status"
          : "Chlorine (mg/l)"}
      </TableHead>
    </>
  )}
</TableRow>`,
  `{clickedComparisonCell.isLpcd ? (
    <>
      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 text-center w-[100px] border-r border-white/10">
        Population
      </TableHead>
      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 text-center w-[80px] border-r border-white/10">
        LPCD
      </TableHead>
    </>
  ) : (
    <>
      <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 text-center w-[100px] border-r border-white/10">
        {clickedComparisonCell.category ===
          "offline" ||
        clickedComparisonCell.category ===
          "offline-with-no-water" ||
        clickedComparisonCell.category ===
          "offline-with-water"
          ? "Status"
          : "Chlorine (mg/l)"}
      </TableHead>
    </>
  )}
  <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 text-center w-[150px]">
    Remark
  </TableHead>
</TableRow>`
);

addOp(
  'Table 14 Body: Move Remark from start',
  `<TableCell className="!px-4 !py-3 text-[12px] font-semibold text-slate-800 dark:text-slate-200 border-r border-purple-100/80 dark:border-purple-900/60 truncate">
    {item.village_name}
  </TableCell>
  {!clickedComparisonCell.isLpcd && (
    <>
      <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-purple-100/80 dark:border-purple-900/60 truncate">
        {item.esr_name || (
          <span className="text-slate-400">
            N/A
          </span>
        )}
      </TableCell>
      <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-purple-100/80 dark:border-purple-900/60 max-w-[150px]">
        {renderRemarkCell(
          esrIssuesMap?.get(
            \`\${item.scheme_id}-\${item.village_name}-\${item.esr_name}\`,
          ) || [],
          \`Remarks for \${item.esr_name}, \${item.village_name}\`,
        )}
      </TableCell>
    </>
  )}
  {clickedComparisonCell.isLpcd && (
    <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-purple-100/80 dark:border-purple-900/60 max-w-[150px]">
      {renderRemarkCell(
        villageIssuesMap?.get(
          \`\${item.scheme_id}-\${item.village_name}\`,
        ) || [],
        \`Remarks for \${item.village_name}\`,
      )}
    </TableCell>
  )}
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-purple-100/80 dark:border-purple-900/60 truncate">`,
  `<TableCell className="!px-4 !py-3 text-[12px] font-semibold text-slate-800 dark:text-slate-200 border-r border-purple-100/80 dark:border-purple-900/60 truncate">
    {item.village_name}
  </TableCell>
  {!clickedComparisonCell.isLpcd && (
    <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-purple-100/80 dark:border-purple-900/60 truncate">
      {item.esr_name || (
        <span className="text-slate-400">
          N/A
        </span>
      )}
    </TableCell>
  )}
  <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-purple-100/80 dark:border-purple-900/60 truncate">`
);

addOp(
  'Table 14 Body: Add Remark at end of row',
  `)}
  </TableCell>
)}
</TableRow>`,
  `)}
  </TableCell>
)}
{!clickedComparisonCell.isLpcd ? (
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
    {renderRemarkCell(
      esrIssuesMap?.get(
        \`\${item.scheme_id}-\${item.village_name}-\${item.esr_name}\`,
      ) || [],
      \`Remarks for \${item.esr_name}, \${item.village_name}\`,
    )}
  </TableCell>
) : (
  <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
    {renderRemarkCell(
      villageIssuesMap?.get(
        \`\${item.scheme_id}-\${item.village_name}\`,
      ) || [],
      \`Remarks for \${item.village_name}\`,
    )}
  </TableCell>
)}
</TableRow>`
);

// -------------------------------------------------------------
// EXECUTE WITH FLEXIBLE REGEX
// -------------------------------------------------------------
let success = true;
ops.forEach((op, index) => {
  const re = makeFlexibleRegex(op.search);
  const matches = content.match(new RegExp(re.source, 'g'));
  if (matches && matches.length === 1) {
    content = content.replace(re, op.replace);
    console.log(`[PASS] Op ${index + 1}: ${op.name}`);
  } else {
    console.log(`[FAIL] Op ${index + 1}: ${op.name} (found ${matches ? matches.length : 0} times)`);
    success = false;
  }
});

if (success) {
  const finalContent = isCRLF ? content.replace(/\n/g, '\r\n') : content;
  fs.writeFileSync(targetPath, finalContent, 'utf8');
  console.log('Successfully wrote updated DetailedChlorinePage.tsx!');
} else {
  console.log('Aborting write due to matching failure.');
  process.exit(1);
}
