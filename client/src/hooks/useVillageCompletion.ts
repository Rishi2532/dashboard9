import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export interface VillageCompletionRecord {
  village_name: string;
  scheme_id: string;
  fully_completion_village_status: string;
}

export interface VillageCompletionResponse {
  completedVillages: string[];
  records: VillageCompletionRecord[];
}

export function useVillageCompletion() {
  const { data, isLoading } = useQuery<VillageCompletionResponse>({
    queryKey: ["/api/village-completion-status"],
    queryFn: async () => {
      const res = await fetch("/api/village-completion-status");
      if (!res.ok) throw new Error("Failed to fetch village completion status");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const completedVillageNamesSet = useMemo(() => {
    const set = new Set<string>();
    if (data?.completedVillages) {
      data.completedVillages.forEach((name) => {
        if (name) set.add(name.trim().toLowerCase());
      });
    }
    return set;
  }, [data?.completedVillages]);

  const completedSchemeVillagesSet = useMemo(() => {
    const set = new Set<string>();
    if (data?.records) {
      data.records.forEach((r) => {
        if (r.village_name) {
          const v = r.village_name.trim().toLowerCase();
          const s = (r.scheme_id || "").trim().toLowerCase();
          if (s) set.add(`${s}|${v}`);
          set.add(v);
        }
      });
    }
    return set;
  }, [data?.records]);

  // Checks whether a village (and optional scheme) has fully_completion_village_status = 'Completed' in village table
  const isVillageCompleted = (
    villageName?: string | null,
    schemeId?: string | null,
  ): boolean => {
    if (!villageName) return false;

    // Handle comma-separated list of villages (e.g. in alerts progress)
    const subVillages = villageName.split(",").map((s) => s.trim().toLowerCase());
    const sid = (schemeId || "").trim().toLowerCase();

    for (const v of subVillages) {
      if (!v) continue;
      if (sid && completedSchemeVillagesSet.has(`${sid}|${v}`)) {
        return true;
      }
      if (completedVillageNamesSet.has(v)) {
        return true;
      }
    }

    return false;
  };

  return {
    isVillageCompleted,
    completedVillageNamesSet,
    completedSchemeVillagesSet,
    completedVillages: data?.completedVillages || [],
    isLoading,
  };
}
