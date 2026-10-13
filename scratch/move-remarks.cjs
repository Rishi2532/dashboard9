const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('client/src/pages/chlorine/DetailedChlorinePage.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

console.log('Original file size:', content.length);

const replacements = [
  // TABLE 2: lpcdDetails body
  {
    name: 'Table 2 (lpcdDetails) - Body: Move Remark to after below-55 Days',
    find: `                                      <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60 truncate">
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
                                      <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60">
                                        {item.population !== null &&`,
    replace: `                                      <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60 truncate">
                                        {item.village_name}
                                      </TableCell>
                                      <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60">
                                        {item.population !== null &&`
  },
  {
    name: 'Table 2 (lpcdDetails) - Body: Append Remark to end of row',
    find: `                                      {clickedLPCDCell.statisticType.startsWith(
                                        "below-55-",
                                      ) && (
                                        <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-bold text-rose-600 dark:text-rose-400">
                                          {item.consecutive_days || "N/A"}
                                        </TableCell>
                                      )}
                                    </TableRow>`,
    replace: `                                      {clickedLPCDCell.statisticType.startsWith(
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
  },

  // TABLE 3: schemeLpcdDetails (lines 6150-6280)
  {
    name: 'Table 3 (schemeLpcdDetails) - Header: Remove Remark between Owner and Population',
    find: `                                    <TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                      Owner
                                    </TableHead>
                                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
                                      Remark
                                    </TableHead>
                                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                      Population
                                    </TableHead>`,
    replace: `                                    <TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                      Owner
                                    </TableHead>
                                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                      Population
                                    </TableHead>`
  },
  {
    name: 'Table 3 (schemeLpcdDetails) - Header: Add Remark after Dashboard',
    find: `                                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[80px] text-center">
                                      Dashboard
                                    </TableHead>
                                  </TableRow>`,
    replace: `                                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                      Dashboard
                                    </TableHead>
                                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-4 !py-3.5 w-[150px] text-center">
                                      Remark
                                    </TableHead>
                                  </TableRow>`
  },
  {
    name: 'Table 3 (schemeLpcdDetails) - Body: Remove Remark between Owner and Population',
    find: `                                      <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
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
                                      <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60">
                                        {item.total_population?.toLocaleString() ||`,
    replace: `                                      <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
                                        {item.owner ||
                                          item.agency_type ||
                                          "N/A"}
                                      </TableCell>
                                      <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-800/60">
                                        {item.total_population?.toLocaleString() ||`
  },
  {
    name: 'Table 3 (schemeLpcdDetails) - Body: Add Remark after Dashboard',
    find: `                                      <TableCell className="!px-4 !py-3 text-center">
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
    replace: `                                      <TableCell className="!px-4 !py-3 text-center border-r border-slate-100/80 dark:border-slate-800/60">
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
  },

  // TABLE 4: pressureSensorDetails (lines 6474-6600)
  {
    name: 'Table 4 (pressureSensorDetails) - Header: Move Remark to after Actions',
    find: `                                    <TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[100px]">
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
                                    </TableHead>`,
    replace: `                                    <TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[100px]">
                                      Status
                                    </TableHead>
                                    <TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[100px]">
                                      Dashboard
                                    </TableHead>
                                    <TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[100px] border-r border-orange-200/80 dark:border-orange-800/60">
                                      Actions
                                    </TableHead>
                                    <TableHead className="!px-4 !py-2 font-bold text-orange-800 dark:text-orange-200 text-center w-[150px]">
                                      Remark
                                    </TableHead>`
  },
  {
    name: 'Table 4 (pressureSensorDetails) - Body: Move Remark to after Actions',
    find: `                                        <TableCell className="!px-4 !py-2 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
                                          {renderRemarkCell(
                                            esrIssuesMap?.get(
                                              \`\${item.scheme_id}-\${item.village_name}-\${item.esr_name}\`,
                                            ) || [],
                                            \`Remarks for \${item.esr_name}\`,
                                          )}
                                        </TableCell>
                                        <TableCell className="!px-4 !py-2 text-center">
                                          {item.dashboard_url ? (
                                            <a
                                              href={item.dashboard_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-200 dark:hover:bg-indigo-900/50 rounded-full transition-colors"
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
                                        <TableCell
                                          className={\`!px-4 !py-2 text-center sticky right-0 \${index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-orange-50/50 dark:bg-slate-800/60"} border-l border-orange-100/80 dark:border-orange-900/60\`}
                                        >
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              setSelectedSensor(item)
                                            }
                                            className="h-7 px-3 text-[11px] font-semibold bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 hover:from-orange-100 hover:to-amber-100 dark:from-orange-950 dark:to-amber-950 dark:text-orange-300 dark:hover:from-orange-900 dark:hover:to-amber-900 rounded-lg shadow-sm border border-orange-200/50 dark:border-orange-700/50"
                                            data-testid={\`button-view-details-\${index}\`}
                                          >
                                            <Eye className="h-3 w-3 mr-1" />
                                            History
                                          </Button>
                                        </TableCell>`,
    replace: `                                        <TableCell className="!px-4 !py-2 text-center">
                                          {item.dashboard_url ? (
                                            <a
                                              href={item.dashboard_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-200 dark:hover:bg-indigo-900/50 rounded-full transition-colors"
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
                                        <TableCell
                                          className={\`!px-4 !py-2 text-center \${index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-orange-50/50 dark:bg-slate-800/60"} border-r border-orange-100/80 dark:border-orange-900/60\`}
                                        >
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              setSelectedSensor(item)
                                            }
                                            className="h-7 px-3 text-[11px] font-semibold bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 hover:from-orange-100 hover:to-amber-100 dark:from-orange-950 dark:to-amber-950 dark:text-orange-300 dark:hover:from-orange-900 dark:hover:to-amber-900 rounded-lg shadow-sm border border-orange-200/50 dark:border-orange-700/50"
                                            data-testid={\`button-view-details-\${index}\`}
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
                                        </TableCell>`
  },

  // TABLE 5: dayWiseSensors in Chlorine Day-Wise (lines 7180-7300)
  {
    name: 'Table 5 (dayWiseSensors) - Header: Move Remark to end',
    find: `                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
                                               ESR Name
                                             </TableHead>
                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5 w-[150px] text-center">
                                               Remark
                                             </TableHead>
                                             {clickedDayWiseCell.metric !==`,
    replace: `                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
                                               ESR Name
                                             </TableHead>
                                             {clickedDayWiseCell.metric !==`
  },
  {
    name: 'Table 5 (dayWiseSensors) - Header: Add Remark at end',
    find: `                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
                                               {clickedDayWiseCell.metric ===
                                               "offline"
                                                 ? "Last Seen"
                                                 : "Consecutive Days"}
                                             </TableHead>
                                           </TableRow>`,
    replace: `                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5 border-r border-white/10">
                                               {clickedDayWiseCell.metric ===
                                               "offline"
                                                 ? "Last Seen"
                                                 : "Consecutive Days"}
                                             </TableHead>
                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5 w-[150px] text-center">
                                               Remark
                                             </TableHead>
                                           </TableRow>`
  },
  {
    name: 'Table 5 (dayWiseSensors) - Body: Move Remark to end',
    find: `                                                 <TableCell className="!px-3 !py-2 text-[12px]">
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
                                                 {clickedDayWiseCell.metric !==`,
    replace: `                                                 <TableCell className="!px-3 !py-2 text-[12px]">
                                                   {sensor.esr_name}
                                                 </TableCell>
                                                 {clickedDayWiseCell.metric !==`
  },
  {
    name: 'Table 5 (dayWiseSensors) - Body: Add Remark at end',
    find: `                                                 <TableCell className="!px-3 !py-2 text-[12px]">
                                                   {clickedDayWiseCell.metric ===
                                                   "offline"
                                                     ? sensor.last_seen || "N/A"
                                                     : sensor.consecutive_days ||
                                                       0}
                                                 </TableCell>
                                               </TableRow>`,
    replace: `                                                 <TableCell className="!px-3 !py-2 text-[12px] border-r border-slate-100/80 dark:border-slate-800/60">
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
  },

  // TABLE 6: pressureDayWiseSensors (lines 8270-8370)
  {
    name: 'Table 6 (pressureDayWiseSensors) - Header: Move Remark to end',
    find: `                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
                                               ESR Name
                                             </TableHead>
                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5 w-[150px] text-center">
                                               Remark
                                             </TableHead>
                                             {clickedPressureDayWiseCell.metric !==`,
    replace: `                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
                                               ESR Name
                                             </TableHead>
                                             {clickedPressureDayWiseCell.metric !==`
  },
  {
    name: 'Table 6 (pressureDayWiseSensors) - Header: Add Remark at end',
    find: `                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5">
                                               {clickedPressureDayWiseCell.metric ===
                                               "offline"
                                                 ? "Last Seen"
                                                 : "Consecutive Days"}
                                             </TableHead>
                                           </TableRow>`,
    replace: `                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5 border-r border-white/10">
                                               {clickedPressureDayWiseCell.metric ===
                                               "offline"
                                                 ? "Last Seen"
                                                 : "Consecutive Days"}
                                             </TableHead>
                                             <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-slate-100 !px-3 !py-2.5 w-[150px] text-center">
                                               Remark
                                             </TableHead>
                                           </TableRow>`
  },
  {
    name: 'Table 6 (pressureDayWiseSensors) - Body: Move Remark to end',
    find: `                                                 <TableCell className="!px-3 !py-2 text-[12px]">
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
                                                 {clickedPressureDayWiseCell.metric !==`,
    replace: `                                                 <TableCell className="!px-3 !py-2 text-[12px]">
                                                   {sensor.esr_name}
                                                 </TableCell>
                                                 {clickedPressureDayWiseCell.metric !==`
  },
  {
    name: 'Table 6 (pressureDayWiseSensors) - Body: Add Remark at end',
    find: `                                                 <TableCell className="!px-3 !py-2 text-[12px]">
                                                   {clickedPressureDayWiseCell.metric ===
                                                   "offline"
                                                     ? sensor.last_seen || "N/A"
                                                     : sensor.consecutive_days ||
                                                       0}
                                                 </TableCell>
                                               </TableRow>`,
    replace: `                                                 <TableCell className="!px-3 !py-2 text-[12px] border-r border-slate-100/80 dark:border-slate-800/60">
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
  },

  // TABLE 7: pressureRegionComparisonSensors (lines 9970-10115)
  {
    name: 'Table 7 (pressureRegionComparisonSensors) - Header: Move Remark to end',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     ESR Name
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
                                     Remark
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Status
                                   </TableHead>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     ESR Name
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Status
                                   </TableHead>`
  },
  {
    name: 'Table 7 (pressureRegionComparisonSensors) - Header: Add Remark at end',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10">
                                     Dashboard
                                   </TableHead>
                                 </TableRow>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Dashboard
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[150px] text-center">
                                     Remark
                                   </TableHead>
                                 </TableRow>`
  },
  {
    name: 'Table 7 (pressureRegionComparisonSensors) - Body: Move Remark to end',
    find: `                                       <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-orange-100/80 dark:border-orange-900/60">
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
    replace: `                                       <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-orange-100/80 dark:border-orange-900/60">
                                         {sensor.esr_name}
                                       </TableCell>
                                       <TableCell className="!px-4 !py-3 text-center border-r border-orange-100/80 dark:border-orange-900/60">`
  },
  {
    name: 'Table 7 (pressureRegionComparisonSensors) - Body: Add Remark at end',
    find: `                                       <TableCell className="!px-4 !py-3 text-center border-l border-orange-100/80 dark:border-orange-900/60">
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
    replace: `                                       <TableCell className="!px-4 !py-3 text-center border-r border-orange-100/80 dark:border-orange-900/60">
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
                                       <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
                                         {renderRemarkCell(
                                           esrIssuesMap?.get(
                                             \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
                                           ) || [],
                                           \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
                                         )}
                                       </TableCell>
                                     </TableRow>`
  },

  // TABLE 8: dayWiseSensors modal/table (lines 10206-10330)
  {
    name: 'Table 8 (dayWiseSensors modal) - Header: Move Remark to end',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     ESR Name
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
                                     Remark
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Status
                                   </TableHead>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     ESR Name
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Status
                                   </TableHead>`
  },
  {
    name: 'Table 8 (dayWiseSensors modal) - Header: Add Remark at end',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10">
                                     Dashboard
                                   </TableHead>
                                 </TableRow>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Dashboard
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-amber-50 !px-4 !py-3.5 w-[150px] text-center">
                                     Remark
                                   </TableHead>
                                 </TableRow>`
  },
  {
    name: 'Table 8 (dayWiseSensors modal) - Body: Move Remark to end',
    find: `                                       <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-amber-100/80 dark:border-amber-900/60">
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
    replace: `                                       <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-amber-100/80 dark:border-amber-900/60">
                                         {sensor.esr_name}
                                       </TableCell>
                                       <TableCell className="!px-4 !py-3 text-center border-r border-amber-100/80 dark:border-amber-900/60">`
  },
  {
    name: 'Table 8 (dayWiseSensors modal) - Body: Add Remark at end',
    find: `                                       <TableCell className="!px-4 !py-3 text-center border-l border-amber-100/80 dark:border-amber-900/60">
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
    replace: `                                       <TableCell className="!px-4 !py-3 text-center border-r border-amber-100/80 dark:border-amber-900/60">
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
                                       <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
                                         {renderRemarkCell(
                                           esrIssuesMap?.get(
                                             \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
                                           ) || [],
                                           \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
                                         )}
                                       </TableCell>
                                     </TableRow>`
  },

  // TABLE 9: pressureDayWiseSensors modal/table (lines 10425-10565)
  {
    name: 'Table 9 (pressureDayWiseSensors modal) - Header: Move Remark to end',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     ESR Name
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
                                     Remark
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Status
                                   </TableHead>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     ESR Name
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Status
                                   </TableHead>`
  },
  {
    name: 'Table 9 (pressureDayWiseSensors modal) - Header: Add Remark at end',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10">
                                     Dashboard
                                   </TableHead>
                                 </TableRow>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Dashboard
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-orange-50 !px-4 !py-3.5 w-[150px] text-center">
                                     Remark
                                   </TableHead>
                                 </TableRow>`
  },
  {
    name: 'Table 9 (pressureDayWiseSensors modal) - Body: Move Remark to end',
    find: `                                       <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-orange-100/80 dark:border-orange-900/60">
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
    replace: `                                       <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-orange-100/80 dark:border-orange-900/60">
                                         {sensor.esr_name}
                                       </TableCell>
                                       <TableCell className="!px-4 !py-3 text-center border-r border-orange-100/80 dark:border-orange-900/60">`
  },
  {
    name: 'Table 9 (pressureDayWiseSensors modal) - Body: Add Remark at end',
    find: `                                       <TableCell className="!px-4 !py-3 text-center border-l border-orange-100/80 dark:border-orange-900/60">
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
    replace: `                                       <TableCell className="!px-4 !py-3 text-center border-r border-orange-100/80 dark:border-orange-900/60">
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
                                       <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
                                         {renderRemarkCell(
                                           esrIssuesMap?.get(
                                             \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
                                           ) || [],
                                           \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
                                         )}
                                       </TableCell>
                                     </TableRow>`
  },

  // TABLE 10: regionComparisonSensors (lines 10663-10795)
  {
    name: 'Table 10 (regionComparisonSensors) - Header: Move Remark to end',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Chlorine
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
                                     Remark
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[90px] text-center border-r border-white/10">
                                     Date
                                   </TableHead>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Chlorine
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[90px] text-center border-r border-white/10">
                                     Date
                                   </TableHead>`
  },
  {
    name: 'Table 10 (regionComparisonSensors) - Header: Add Remark at end',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[80px] text-center">
                                     Dashboard
                                   </TableHead>
                                 </TableRow>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Dashboard
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-violet-50 !px-4 !py-3.5 w-[150px] text-center">
                                     Remark
                                   </TableHead>
                                 </TableRow>`
  },
  {
    name: 'Table 10 (regionComparisonSensors) - Body: Move Remark to end',
    find: `                                       <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-violet-100/80 dark:border-violet-900/60">
                                         {sensor.latest_chlorine_value !==
                                         null ? (
                                           Number(
                                             sensor.latest_chlorine_value,
                                           ).toFixed(2)
                                         ) : (
                                           <span className="text-slate-400">
                                             N/A
                                           </span>
                                         )}
                                       </TableCell>
                                       <TableCell className="!px-4 !py-3 text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-violet-100/80 dark:border-violet-900/60 max-w-[150px]">
                                         {renderRemarkCell(
                                           esrIssuesMap?.get(
                                             \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
                                           ) || [],
                                           \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
                                         )}
                                       </TableCell>
                                       <TableCell className="!px-4 !py-3 text-center text-[12px] text-slate-600 dark:text-slate-400 border-r border-violet-100/80 dark:border-violet-900/60">`,
    replace: `                                       <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-violet-100/80 dark:border-violet-900/60">
                                         {sensor.latest_chlorine_value !==
                                         null ? (
                                           Number(
                                             sensor.latest_chlorine_value,
                                           ).toFixed(2)
                                         ) : (
                                           <span className="text-slate-400">
                                             N/A
                                           </span>
                                         )}
                                       </TableCell>
                                       <TableCell className="!px-4 !py-3 text-center text-[12px] text-slate-600 dark:text-slate-400 border-r border-violet-100/80 dark:border-violet-900/60">`
  },
  {
    name: 'Table 10 (regionComparisonSensors) - Body: Add Remark at end',
    find: `                                       <TableCell className="!px-4 !py-3 text-center">
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
    replace: `                                       <TableCell className="!px-4 !py-3 text-center border-r border-violet-100/80 dark:border-violet-900/60">
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
                                       <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
                                         {renderRemarkCell(
                                           esrIssuesMap?.get(
                                             \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
                                           ) || [],
                                           \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
                                         )}
                                       </TableCell>
                                     </TableRow>`
  },

  // TABLE 11: lpcdDayWiseVillages (lines 10883-10990)
  {
    name: 'Table 11 (lpcdDayWiseVillages) - Header: Move Remark to end',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     Village
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
                                     Remark
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     LPCD
                                   </TableHead>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     Village
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     LPCD
                                   </TableHead>`
  },
  {
    name: 'Table 11 (lpcdDayWiseVillages) - Header: Add Remark at end',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[80px] text-center border-l border-white/10">
                                     Dashboard
                                   </TableHead>
                                 </TableRow>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Dashboard
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-cyan-50 !px-4 !py-3.5 w-[150px] text-center">
                                     Remark
                                   </TableHead>
                                 </TableRow>`
  },
  {
    name: 'Table 11 (lpcdDayWiseVillages) - Body: Move Remark to end',
    find: `                                       <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-cyan-100/80 dark:border-cyan-900/60 truncate">
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
    replace: `                                       <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-cyan-100/80 dark:border-cyan-900/60 truncate">
                                         {sensor.village_name}
                                       </TableCell>
                                       <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 border-r border-cyan-100/80 dark:border-cyan-900/60">`
  },
  {
    name: 'Table 11 (lpcdDayWiseVillages) - Body: Add Remark at end',
    find: `                                       <TableCell className="!px-4 !py-3 text-center border-l border-cyan-100/80 dark:border-cyan-900/60">
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
    replace: `                                       <TableCell className="!px-4 !py-3 text-center border-r border-cyan-100/80 dark:border-cyan-900/60">
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
                                       <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
                                         {renderRemarkCell(
                                           villageIssuesMap?.get(
                                             \`\${sensor.scheme_id}-\${sensor.village_name}\`,
                                           ) || [],
                                           \`Remarks for \${sensor.village_name}\`,
                                         )}
                                       </TableCell>
                                     </TableRow>`
  },

  // TABLE 12: schemeLpcdDayWiseSchemes (lines 11089-11225)
  {
    name: 'Table 12 (schemeLpcdDayWiseSchemes) - Header: Move Remark to end',
    find: `                                   <TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     Owner
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[150px] text-center border-r border-white/10">
                                     Remark
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     Block
                                   </TableHead>`,
    replace: `                                   <TableHead className="text-center font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     Owner
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                     Block
                                   </TableHead>`
  },
  {
    name: 'Table 12 (schemeLpcdDayWiseSchemes) - Header: Add Remark at end',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[80px] text-center">
                                     Dashboard
                                   </TableHead>
                                 </TableRow>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[80px] text-center border-r border-white/10">
                                     Dashboard
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[150px] text-center">
                                     Remark
                                   </TableHead>
                                 </TableRow>`
  },
  {
    name: 'Table 12 (schemeLpcdDayWiseSchemes) - Body: Move Remark to end',
    find: `                                       <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
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
                                       <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-purple-100/80 dark:border-purple-900/60">
                                         {scheme.block}
                                       </TableCell>`,
    replace: `                                       <TableCell className="!px-4 !py-3 text-[12px] text-center text-slate-700 dark:text-slate-300 border-r border-slate-100/80 dark:border-slate-900/60 font-medium truncate max-w-[150px]">
                                         {scheme.owner ||
                                           scheme.agency_type ||
                                           "N/A"}
                                       </TableCell>
                                       <TableCell className="!px-4 !py-3 text-[12px] text-slate-700 dark:text-slate-300 border-r border-purple-100/80 dark:border-purple-900/60">
                                         {scheme.block}
                                       </TableCell>`
  },
  {
    name: 'Table 12 (schemeLpcdDayWiseSchemes) - Body: Add Remark at end',
    find: `                                       <TableCell className="!px-4 !py-3 text-center">
                                         {scheme.dashboard_url && (
                                           <a
                                             href={scheme.dashboard_url}
                                             target="_blank"
                                             rel="noreferrer"
                                             className="inline-flex items-center justify-center p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                                             title="Open Dashboard"
                                             onClick={(e) => e.stopPropagation()}
                                           >
                                             <ExternalLink className="h-4 w-4" />
                                           </a>
                                         )}
                                       </TableCell>
                                     </TableRow>`,
    replace: `                                       <TableCell className="!px-4 !py-3 text-center border-r border-purple-100/80 dark:border-purple-900/60">
                                         {scheme.dashboard_url && (
                                           <a
                                             href={scheme.dashboard_url}
                                             target="_blank"
                                             rel="noreferrer"
                                             className="inline-flex items-center justify-center p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                                             title="Open Dashboard"
                                             onClick={(e) => e.stopPropagation()}
                                           >
                                             <ExternalLink className="h-4 w-4" />
                                           </a>
                                         )}
                                       </TableCell>
                                       <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
                                         {renderRemarkCell(
                                           schemeIssuesMap?.get(
                                             String(scheme.scheme_id),
                                           ) || [],
                                           \`Remarks for \${scheme.scheme_name}\`,
                                         )}
                                       </TableCell>
                                     </TableRow>`
  },

  // TABLE 13: chlorineDivisionSensors (lines 12809-12940)
  {
    name: 'Table 13 (chlorineDivisionSensors) - Header: Move Remark to after Chlorine',
    find: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-teal-50 !px-3 !py-3.5 w-[100px] border-r border-white/10">
                                     ESR Name
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-teal-50 !px-3 !py-3.5 w-[150px] text-center border-r border-white/10">
                                     Remark
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-teal-50 !px-3 !py-3.5 text-center w-[100px]">
                                     Chlorine (mg/l)
                                   </TableHead>`,
    replace: `                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-teal-50 !px-3 !py-3.5 w-[100px] border-r border-white/10">
                                     ESR Name
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-teal-50 !px-3 !py-3.5 text-center w-[100px] border-r border-white/10">
                                     Chlorine (mg/l)
                                   </TableHead>
                                   <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-teal-50 !px-3 !py-3.5 w-[150px] text-center">
                                     Remark
                                   </TableHead>`
  },
  {
    name: 'Table 13 (chlorineDivisionSensors) - Body: Move Remark to after Chlorine',
    find: `                                       <TableCell className="!px-3 !py-2.5 !text-[12px] text-slate-600 dark:text-slate-400 truncate border-r border-teal-100/80 dark:border-teal-900/60">
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
    replace: `                                       <TableCell className="!px-3 !py-2.5 !text-[12px] text-slate-600 dark:text-slate-400 truncate border-r border-teal-100/80 dark:border-teal-900/60">
                                         {sensor.esr_name}
                                       </TableCell>
                                       <TableCell className="!px-3 !py-2.5 text-center text-sm border-r border-teal-100/80 dark:border-teal-900/60">`
  },
  {
    name: 'Table 13 (chlorineDivisionSensors) - Body: Append Remark after Chlorine cell',
    find: `                                         </Badge>
                                       </TableCell>
                                     </TableRow>`,
    replace: `                                         </Badge>
                                       </TableCell>
                                       <TableCell className="!px-3 !py-2.5 !text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px] text-center">
                                         {renderRemarkCell(
                                           esrIssuesMap?.get(
                                             \`\${sensor.scheme_id}-\${sensor.village_name}-\${sensor.esr_name}\`,
                                           ) || [],
                                           \`Remarks for \${sensor.esr_name}, \${sensor.village_name}\`,
                                         )}
                                       </TableCell>
                                     </TableRow>`
  },

  // TABLE 14: comparisonDetails (Overall Region Comparison details, lines 16314-16495)
  {
    name: 'Table 14 (comparisonDetails) - Header: Remove Remark from front',
    find: `                                  {!clickedComparisonCell.isLpcd && (
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
                                  )}`,
    replace: `                                  {!clickedComparisonCell.isLpcd && (
                                    <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-purple-50 !px-4 !py-3.5 w-[100px] border-r border-white/10">
                                      ESR Name
                                    </TableHead>
                                  )}`
  },
  {
    name: 'Table 14 (comparisonDetails) - Header: Add Remark at end',
    find: `                                  {clickedComparisonCell.isLpcd ? (
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
    replace: `                                  {clickedComparisonCell.isLpcd ? (
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
  },
  {
    name: 'Table 14 (comparisonDetails) - Body: Remove Remark from front',
    find: `                                    {!clickedComparisonCell.isLpcd && (
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
                                    )}`,
    replace: `                                    {!clickedComparisonCell.isLpcd && (
                                      <TableCell className="!px-4 !py-3 text-[12px] text-slate-600 dark:text-slate-400 border-r border-purple-100/80 dark:border-purple-900/60 truncate">
                                        {item.esr_name || (
                                          <span className="text-slate-400">
                                            N/A
                                          </span>
                                        )}
                                      </TableCell>
                                    )}`
  },
  {
    name: 'Table 14 (comparisonDetails) - Body: Add Remark at end',
    find: `                                        <TableCell className="!px-4 !py-3">
                                          <span
                                            className={\`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm \${item.lpcd_value !== undefined && item.lpcd_value >= 55 ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 dark:from-blue-900/60 dark:to-indigo-900/60 dark:text-blue-300 ring-1 ring-blue-200/80 dark:ring-blue-700/60" : "bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 dark:from-orange-900/60 dark:to-amber-900/60 dark:text-orange-300 ring-1 ring-orange-200/80 dark:ring-orange-700/60"}\`}
                                          >
                                            {item.lpcd_value !== undefined
                                              ? Number(item.lpcd_value).toFixed(
                                                  2,
                                                )
                                              : "N/A"}
                                          </span>
                                        </TableCell>
                                      </>
                                    ) : (
                                      <TableCell className="!px-4 !py-3 text-center">
                                        {clickedComparisonCell.category ===
                                          "offline" ||
                                        clickedComparisonCell.category ===
                                          "offline-with-no-water" ||
                                        clickedComparisonCell.category ===
                                          "offline-with-water" ? (
                                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm bg-gradient-to-r from-red-50 to-rose-50 text-red-700 dark:from-red-900/60 dark:to-rose-900/60 dark:text-red-300 ring-1 ring-red-200/80 dark:ring-red-700/60">
                                            {item.chlorine_status}
                                          </span>
                                        ) : (
                                          <span
                                            className={\`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm \${item.chlorine_value !== undefined && item.chlorine_value >= 0.2 && item.chlorine_value <= 0.5 ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 dark:from-emerald-900/60 dark:to-green-900/60 dark:text-emerald-300 ring-1 ring-emerald-200/80 dark:ring-emerald-700/60" : "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 dark:from-red-900/60 dark:to-rose-900/60 dark:text-red-300 ring-1 ring-red-200/80 dark:ring-red-700/60"}\`}
                                          >
                                            {item.chlorine_value !== undefined
                                              ? Number(
                                                  item.chlorine_value,
                                                ).toFixed(2)
                                              : "N/A"}
                                          </span>
                                        )}
                                      </TableCell>
                                    )}
                                  </TableRow>`,
    replace: `                                        <TableCell className="!px-4 !py-3 border-r border-purple-100/80 dark:border-purple-900/60">
                                          <span
                                            className={\`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm \${item.lpcd_value !== undefined && item.lpcd_value >= 55 ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 dark:from-blue-900/60 dark:to-indigo-900/60 dark:text-blue-300 ring-1 ring-blue-200/80 dark:ring-blue-700/60" : "bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 dark:from-orange-900/60 dark:to-amber-900/60 dark:text-orange-300 ring-1 ring-orange-200/80 dark:ring-orange-700/60"}\`}
                                          >
                                            {item.lpcd_value !== undefined
                                              ? Number(item.lpcd_value).toFixed(
                                                  2,
                                                )
                                              : "N/A"}
                                          </span>
                                        </TableCell>
                                      </>
                                    ) : (
                                      <TableCell className="!px-4 !py-3 text-center border-r border-purple-100/80 dark:border-purple-900/60">
                                        {clickedComparisonCell.category ===
                                          "offline" ||
                                        clickedComparisonCell.category ===
                                          "offline-with-no-water" ||
                                        clickedComparisonCell.category ===
                                          "offline-with-water" ? (
                                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm bg-gradient-to-r from-red-50 to-rose-50 text-red-700 dark:from-red-900/60 dark:to-rose-900/60 dark:text-red-300 ring-1 ring-red-200/80 dark:ring-red-700/60">
                                            {item.chlorine_status}
                                          </span>
                                        ) : (
                                          <span
                                            className={\`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm \${item.chlorine_value !== undefined && item.chlorine_value >= 0.2 && item.chlorine_value <= 0.5 ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 dark:from-emerald-900/60 dark:to-green-900/60 dark:text-emerald-300 ring-1 ring-emerald-200/80 dark:ring-emerald-700/60" : "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 dark:from-red-900/60 dark:to-rose-900/60 dark:text-red-300 ring-1 ring-red-200/80 dark:ring-red-700/60"}\`}
                                          >
                                            {item.chlorine_value !== undefined
                                              ? Number(
                                                  item.chlorine_value,
                                                ).toFixed(2)
                                              : "N/A"}
                                          </span>
                                        )}
                                      </TableCell>
                                    )}
                                    <TableCell className="!px-4 !py-3 text-center text-[12px] font-mono font-medium text-slate-700 dark:text-slate-300 max-w-[150px]">
                                      {!clickedComparisonCell.isLpcd ? (
                                        renderRemarkCell(
                                          esrIssuesMap?.get(
                                            \`\${item.scheme_id}-\${item.village_name}-\${item.esr_name}\`,
                                          ) || [],
                                          \`Remarks for \${item.esr_name}, \${item.village_name}\`,
                                        )
                                      ) : (
                                        renderRemarkCell(
                                          villageIssuesMap?.get(
                                            \`\${item.scheme_id}-\${item.village_name}\`,
                                          ) || [],
                                          \`Remarks for \${item.village_name}\`,
                                        )
                                      )}
                                    </TableCell>
                                  </TableRow>`
  }
];

let allPassed = true;
// Standardize line endings for matching
const normalize = str => str.replace(/\r\n/g, '\n');
let normContent = normalize(content);

replacements.forEach((r, i) => {
  const findNorm = normalize(r.find);
  const replaceNorm = normalize(r.replace);
  
  const count = normContent.split(findNorm).length - 1;
  if (count === 1) {
    console.log(`[PASS] Replacement ${i + 1}: ${r.name}`);
    normContent = normContent.replace(findNorm, replaceNorm);
  } else {
    console.error(`[FAIL] Replacement ${i + 1}: ${r.name} found ${count} times!`);
    allPassed = false;
  }
});

if (allPassed) {
  // If original had \r\n, restore it
  if (content.includes('\r\n')) {
    normContent = normContent.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(targetFile, normContent, 'utf8');
  console.log('All replacements applied successfully!');
} else {
  console.error('Aborted writing due to mismatch.');
  process.exit(1);
}
