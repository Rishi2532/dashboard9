import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export interface VillageCompletionRecord {
  village_name: string;
  scheme_id: string;
  scheme_name: string;
  fully_completion_village_status?: string;
  fully_completion_scheme_status?: string;
}

export interface VillageCompletionResponse {
  completedVillages: string[];
  inProgressVillages?: string[];
  records: VillageCompletionRecord[];
}

const normalize = (val?: string | null) =>
  (val || "")
    .replace(/[\u00A0\uFFFD\s]+/g, " ")
    .trim()
    .toLowerCase();

const isCompletedStatus = (status?: string | null): boolean => {
  const s = normalize(status);
  return s === "completed" || s === "fully completed" || s === "fully_completed";
};

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

  // Set of 3-part keys: "scheme_id|scheme_name|village_name" for completed villages
  const completedTripletsSet = useMemo(() => {
    const set = new Set<string>();
    if (data?.records) {
      data.records.forEach((r) => {
        if (r.village_name && r.scheme_id && isCompletedStatus(r.fully_completion_village_status)) {
          const v = normalize(r.village_name);
          const s = normalize(r.scheme_id);
          const sn = normalize(r.scheme_name);
          if (s && sn && v) {
            set.add(`${s}|${sn}|${v}`);
          }
        }
      });
    }
    return set;
  }, [data?.records]);

  // Set of 2-part keys: "scheme_id|village_name" for completed villages (fallback if scheme_name differs)
  const completedSchemeVillagesSet = useMemo(() => {
    const set = new Set<string>();
    if (data?.records) {
      data.records.forEach((r) => {
        if (r.village_name && r.scheme_id && isCompletedStatus(r.fully_completion_village_status)) {
          const v = normalize(r.village_name);
          const s = normalize(r.scheme_id);
          if (s && v) {
            set.add(`${s}|${v}`);
          }
        }
      });
    }
    return set;
  }, [data?.records]);

  // Fallback set of village names only (from completedVillages)
  const completedVillagesSet = useMemo(() => {
    const set = new Set<string>();
    if (data?.completedVillages) {
      data.completedVillages.forEach((name) => {
        const v = normalize(name);
        if (v) set.add(v);
      });
    }
    return set;
  }, [data?.completedVillages]);

  // Strictly matches all three: scheme_id, scheme_name, and village_name
  // from the village table where fully_completion_village_status = 'Completed'
  const isVillageCompleted = (
    villageName?: string | null,
    schemeId?: string | null,
    schemeName?: string | null,
  ): boolean => {
    if (!villageName) return false;

    const normSid = schemeId ? normalize(schemeId) : "";
    const normSname = schemeName ? normalize(schemeName) : "";

    // Handle comma-separated list of villages (e.g. in alerts progress)
    const subVillages = villageName.split(",").map((s) => normalize(s));

    for (const v of subVillages) {
      if (!v) continue;

      // 1. Strict 3-part matching: scheme_id, scheme_name, and village_name
      if (normSid && normSname && completedTripletsSet.has(`${normSid}|${normSname}|${v}`)) {
        return true;
      }
      // 2. Fallback 2-part matching: scheme_id and village_name
      if (normSid && completedSchemeVillagesSet.has(`${normSid}|${v}`)) {
        return true;
      }
      // 3. Fallback village name only if schemeId is omitted
      if (!normSid && completedVillagesSet.has(v)) {
        return true;
      }
    }

    return false;
  };

  // Matches villages where fully_completion_village_status is 'In Progress' or other than Completed
  const isVillageInProgress = (
    villageName?: string | null,
    schemeId?: string | null,
    schemeName?: string | null,
  ): boolean => {
    if (!villageName) return false;
    return !isVillageCompleted(villageName, schemeId, schemeName);
  };

  // Helper to match a record against villageFilter ('all' | 'completed' | 'in_progress')
  const matchesVillageFilter = (
    filter: "all" | "completed" | "in_progress",
    villageName?: string | null,
    schemeId?: string | null,
    schemeName?: string | null,
  ): boolean => {
    if (filter === "all") return true;
    if (filter === "completed") return isVillageCompleted(villageName, schemeId, schemeName);
    if (filter === "in_progress") return isVillageInProgress(villageName, schemeId, schemeName);
    return true;
  };

  // Deduplicated records by (scheme_id, village_name) (case-insensitive)
  const deduplicatedRecords = useMemo(() => {
    const seen = new Set<string>();
    const list: VillageCompletionRecord[] = [];
    if (data?.records) {
      data.records.forEach((r) => {
        if (r.village_name && r.scheme_id) {
          const key = `${normalize(r.scheme_id)}|${normalize(r.village_name)}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push(r);
          }
        }
      });
    }
    return list;
  }, [data?.records]);

  // Helper to deduplicate any array by (scheme_id, village_name) case-insensitively
  const deduplicateBySchemeVillage = <T extends { scheme_id?: string | null; village_name?: string | null }>(
    items: T[]
  ): T[] => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${normalize(item.scheme_id)}|${normalize(item.village_name)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  return {
    isVillageCompleted,
    isVillageInProgress,
    matchesVillageFilter,
    completedTripletsSet,
    completedSchemeVillagesSet,
    completedVillages: data?.completedVillages || [],
    inProgressVillages: data?.inProgressVillages || [],
    records: deduplicatedRecords,
    allRecords: data?.records || [],
    deduplicateBySchemeVillage,
    isLoading,
  };
}
