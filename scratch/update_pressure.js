
import fs from 'fs';

const filePath = 'c:\\Users\\HP\\dashboard9\\client\\src\\pages\\chlorine\\DetailedChlorinePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const anchor = 'data-testid="text-pressure-7day-total-all"';
const insertMarker = '                                      </div>\n                                    </div>\n                                  </div>\n                                </>';

const summaryLine = `                                      </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center justify-center gap-6 py-3 px-4 bg-orange-50/30 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/50 shadow-sm">
                                      <button
                                        onClick={() => handlePressureComparisonCellClick(
                                          "offline-with-no-water",
                                          "All Regions",
                                          "Offline with no water - All Regions",
                                        )}
                                        className="flex items-center gap-2 group hover:opacity-80 transition-all font-semibold text-gray-700 dark:text-gray-300"
                                      >
                                        <span className="text-red-500 group-hover:scale-110 transition-transform tabular-nums">
                                          {pressureOverallComparison.data.reduce((sum: number, r: any) => sum + (r.offline_with_no_water || 0), 0)}
                                        </span>
                                        <span className="text-sm">Offline with no water</span>
                                      </button>
                                      <div className="w-px h-4 bg-orange-200 dark:bg-orange-800 hidden sm:block"></div>
                                      <button
                                        onClick={() => handlePressureComparisonCellClick(
                                          "offline-with-water",
                                          "All Regions",
                                          "Offline with water (Data Loss) - All Regions",
                                        )}
                                        className="flex items-center gap-2 group hover:opacity-80 transition-all font-semibold text-gray-700 dark:text-gray-300"
                                      >
                                        <span className="text-red-600 group-hover:scale-110 transition-transform tabular-nums">
                                          {pressureOverallComparison.data.reduce((sum: number, r: any) => sum + (r.offline_with_water || 0), 0)}
                                        </span>
                                        <span className="text-sm">Offline with water (Data Loss)</span>
                                      </button>
                                      <div className="w-px h-4 bg-orange-200 dark:bg-orange-800 hidden sm:block"></div>
                                      <button
                                        onClick={() => handlePressureComparisonCellClick(
                                          "online_no_water",
                                          "All Regions",
                                          "Online with no water - All Regions",
                                        )}
                                        className="flex items-center gap-2 group hover:opacity-80 transition-all font-semibold text-gray-700 dark:text-gray-300"
                                      >
                                        <span className="text-gray-500 group-hover:scale-110 transition-transform tabular-nums">
                                          {pressureOverallComparison.data.reduce((sum: number, r: any) => sum + (r.online_no_water || 0), 0)}
                                        </span>
                                        <span className="text-sm">Online with no water</span>
                                      </button>
                                    </div>
                                  </div>
                                </>`;

// We use regex to find the insertion point after the anchor
const lines = content.split('\n');
let insertIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(anchor)) {
        // Find the next occurrence of </>
        for (let j = i; j < lines.length; j++) {
            if (lines[j].includes('</>')) {
                insertIndex = j;
                break;
            }
        }
    }
    if (insertIndex !== -1) break;
}

if (insertIndex !== -1) {
    console.log('Found insertion point at line ' + (insertIndex + 1));
    // We want to replace the closing </div> structure ending at insertIndex
    // Specifically lines index -3, -2, -1 relative to insertIndex
    
    // Instead of precise matching, let's just insert BEFORE </>
    lines.splice(insertIndex, 0, `                                    <div className="mt-4 flex flex-wrap items-center justify-center gap-6 py-3 px-4 bg-orange-50/30 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/50 shadow-sm">
                                      <button
                                        onClick={() => handlePressureComparisonCellClick(
                                          "offline-with-no-water",
                                          "All Regions",
                                          "Offline with no water - All Regions",
                                        )}
                                        className="flex items-center gap-2 group hover:opacity-80 transition-all font-semibold text-gray-700 dark:text-gray-300"
                                      >
                                        <span className="text-red-500 group-hover:scale-110 transition-transform tabular-nums">
                                          {pressureOverallComparison.data.reduce((sum: number, r: any) => sum + (r.offline_with_no_water || 0), 0)}
                                        </span>
                                        <span className="text-sm">Offline with no water</span>
                                      </button>
                                      <div className="w-px h-4 bg-orange-200 dark:bg-orange-800 hidden sm:block"></div>
                                      <button
                                        onClick={() => handlePressureComparisonCellClick(
                                          "offline-with-water",
                                          "All Regions",
                                          "Offline with water (Data Loss) - All Regions",
                                        )}
                                        className="flex items-center gap-2 group hover:opacity-80 transition-all font-semibold text-gray-700 dark:text-gray-300"
                                      >
                                        <span className="text-red-600 group-hover:scale-110 transition-transform tabular-nums">
                                          {pressureOverallComparison.data.reduce((sum: number, r: any) => sum + (r.offline_with_water || 0), 0)}
                                        </span>
                                        <span className="text-sm">Offline with water (Data Loss)</span>
                                      </button>
                                      <div className="w-px h-4 bg-orange-200 dark:bg-orange-800 hidden sm:block"></div>
                                      <button
                                        onClick={() => handlePressureComparisonCellClick(
                                          "online_no_water",
                                          "All Regions",
                                          "Online with no water - All Regions",
                                        )}
                                        className="flex items-center gap-2 group hover:opacity-80 transition-all font-semibold text-gray-700 dark:text-gray-300"
                                      >
                                        <span className="text-gray-500 group-hover:scale-110 transition-transform tabular-nums">
                                          {pressureOverallComparison.data.reduce((sum: number, r: any) => sum + (r.online_no_water || 0), 0)}
                                        </span>
                                        <span className="text-sm">Online with no water</span>
                                      </button>
                                    </div>`);
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Successfully updated file');
} else {
    console.error('Could not find insertion point');
    process.exit(1);
}
