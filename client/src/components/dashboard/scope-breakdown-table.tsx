import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";

interface ScopeData {
  region: string;
  total_schemes: number;
  integrated_schemes: number;
  civil_100: number;
  operational: number;
  non_operational: number;
  fully_completed_schemes: number;
  total_villages: number;
  villages_operational: number;
  villages_non_operational: number;
  integrated_villages: number;
}

interface ScopeBreakdownTableProps {
  data: ScopeData[];
  isLoading: boolean;
}

export default function ScopeBreakdownTable({ data, isLoading }: ScopeBreakdownTableProps) {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-blue-800 font-medium animate-pulse">Loading Scope Statistics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-600 shadow-xl overflow-hidden bg-white/90 backdrop-blur-md rounded-2xl transition-all duration-300 hover:shadow-2xl">
      <CardHeader className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4">
        <CardTitle className="text-white flex items-center gap-2 text-lg font-bold tracking-tight">
          <LayoutDashboard className="w-5 h-5" />
          Regional Scope Statistics Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="border-collapse w-full min-w-[1100px] border border-slate-600">
            <TableHeader>
              <TableRow className="bg-slate-100 hover:bg-slate-100">
                <TableHead rowSpan={2} className="border border-slate-600 text-blue-900 font-black text-center uppercase tracking-tighter text-xs px-2 py-3 w-[50px] align-bottom">Sr. No</TableHead>
                <TableHead rowSpan={2} className="border border-slate-600 text-blue-900 font-black text-center uppercase tracking-tighter text-xs px-4 py-3 min-w-[150px] align-bottom">Region</TableHead>
                <TableHead colSpan={5} className="border border-slate-600 text-blue-900 font-black text-center uppercase tracking-widest text-xs px-2 py-2 bg-blue-50/50">SCHEMES</TableHead>
                <TableHead colSpan={4} className="border border-slate-600 text-blue-900 font-black text-center uppercase tracking-widest text-xs px-2 py-2 bg-indigo-50/50">VILLAGES</TableHead>
              </TableRow>
              <TableRow className="bg-slate-100 border-b-2 border-slate-600 hover:bg-slate-100">
                <TableHead className="border border-slate-600 text-blue-900 font-bold text-center text-[10px] py-3 align-bottom">Total Schemes</TableHead>
                <TableHead className="border border-slate-600 text-blue-900 font-bold text-center text-[10px] py-3 align-bottom">IoT Integrated Schemes</TableHead>
                <TableHead className="border border-slate-600 text-blue-900 font-bold text-center text-[10px] py-3 align-bottom">100% Civil Work Completed</TableHead>
                <TableHead className="border border-slate-600 text-blue-800 font-bold text-center text-[10px] py-2 align-bottom">Operational</TableHead>
                <TableHead className="border border-slate-600 text-blue-800 font-bold text-center text-[10px] py-2 align-bottom">Non-Operational/Partial</TableHead>
                <TableHead className="border border-slate-600 text-blue-900 font-bold text-center text-[10px] py-3 align-bottom">Total Villages</TableHead>
                <TableHead className="border border-slate-600 text-blue-900 font-bold text-center text-[10px] py-3 align-bottom">IoT Integrated Villages</TableHead>
                <TableHead className="border border-slate-600 text-blue-800 font-bold text-center text-[10px] py-2 align-bottom">Operational</TableHead>
                <TableHead className="border border-slate-600 text-blue-800 font-bold text-center text-[10px] py-2 align-bottom">Non-Operational/Partial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => {
                const isTotal = row.region === "Total";
                // Original Logic:
                // Schemes: Operational = based on water_supply_status 'Full' (from backend)
                const schemesOperational = row.operational;
                const schemesNonOp = row.non_operational;
                
                // Villages: Operational = based on fully_completed_villages (from backend)
                const villagesOperational = row.villages_operational;
                const villagesNonOp = row.villages_non_operational;

                return (
                  <TableRow
                    key={index}
                    className={`
                      transition-all duration-200 group border-b border-slate-600
                      ${isTotal ? "bg-blue-100 hover:bg-blue-200" : index % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50 hover:bg-slate-100"}
                    `}
                  >
                    <TableCell className={`border border-slate-600 text-center font-medium align-bottom py-3 ${isTotal ? "text-blue-900" : "text-slate-600"}`}>
                      {isTotal ? "" : index + 1}
                    </TableCell>
                    <TableCell className={`border border-slate-600 text-left font-bold align-bottom py-3 ${isTotal ? "text-blue-900 text-center text-lg font-black" : "text-blue-900"}`}>
                      {row.region}
                    </TableCell>
                    <TableCell className={`border border-slate-600 text-center font-bold align-bottom py-3 ${isTotal ? "text-slate-900 text-lg" : "text-slate-800"}`}>
                      {row.total_schemes.toLocaleString()}
                    </TableCell>
                    <TableCell className={`border border-slate-600 text-center font-bold align-bottom py-3 ${isTotal ? "text-blue-900 text-lg" : "text-blue-700"}`}>
                      {row.integrated_schemes.toLocaleString()}
                    </TableCell>
                    <TableCell className={`border border-slate-600 text-center font-bold align-bottom py-3 ${isTotal ? "text-emerald-900 text-lg font-black" : "text-emerald-700"}`}>
                      {row.civil_100.toLocaleString()}
                    </TableCell>
                    <TableCell className={`border border-slate-600 text-center font-bold align-bottom py-3 ${isTotal ? "text-blue-900 text-lg font-black" : "text-blue-600"}`}>
                      {schemesOperational.toLocaleString()}
                    </TableCell>
                    <TableCell className={`border border-slate-600 text-center font-bold align-bottom py-3 ${isTotal ? "text-orange-900 text-lg font-black" : "text-orange-600"}`}>
                      {schemesNonOp.toLocaleString()}
                    </TableCell>
                    <TableCell className={`border border-slate-600 text-center font-bold align-bottom py-3 ${isTotal ? "text-slate-900 text-lg font-black" : "text-slate-800"}`}>
                      {row.total_villages.toLocaleString()}
                    </TableCell>
                    <TableCell className={`border border-slate-600 text-center font-bold align-bottom py-3 ${isTotal ? "text-indigo-900 text-lg font-black" : "text-indigo-700"}`}>
                      {row.integrated_villages.toLocaleString()}
                    </TableCell>
                    <TableCell className={`border border-slate-600 text-center font-bold align-bottom py-3 ${isTotal ? "text-blue-900 text-lg font-black" : "text-blue-600"}`}>
                      {villagesOperational.toLocaleString()}
                    </TableCell>
                    <TableCell className={`border border-slate-600 text-center font-bold align-bottom py-3 ${isTotal ? "text-orange-900 text-lg font-black" : "text-orange-600"}`}>
                      {villagesNonOp.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
