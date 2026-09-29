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
  records: VillageCompletionRecord[];
}

const normalize = (val?: string | null) =>
  (val || "")
    .replace(/[\u00A0\uFFFD\s]+/g, " ")
    .trim()
    .toLowerCase();

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

  // Set of 3-part keys: "scheme_id|scheme_name|village_name"
  const completedTripletsSet = useMemo(() => {
    const set = new Set<string>();
    if (data?.records) {
      data.records.forEach((r) => {
        if (r.village_name && r.scheme_id) {
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

  // Set of 2-part keys: "scheme_id|village_name" (for fallback if scheme_name is omitted)
  const completedSchemeVillagesSet = useMemo(() => {
    const set = new Set<string>();
    if (data?.records) {
      data.records.forEach((r) => {
        if (r.village_name && r.scheme_id) {
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

  // Strictly matches all three: scheme_id, scheme_name, and village_name
  // from the village table where fully_completion_village_status = 'Completed'
  const isVillageCompleted = (
    villageName?: string | null,
    schemeId?: string | null,
    schemeName?: string | null,
  ): boolean => {
    if (!villageName || !schemeId || !schemeName) return false;

    const normSid = normalize(schemeId);
    const normSname = normalize(schemeName);

    // Handle comma-separated list of villages (e.g. in alerts progress)
    const subVillages = villageName.split(",").map((s) => normalize(s));

    for (const v of subVillages) {
      if (!v) continue;

      // Strict 3-part matching: scheme_id, scheme_name, and village_name
      if (completedTripletsSet.has(`${normSid}|${normSname}|${v}`)) {
        return true;
      }
    }

    return false;
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
    completedTripletsSet,
    completedSchemeVillagesSet,
    completedVillages: data?.completedVillages || [],
    records: deduplicatedRecords,
    allRecords: data?.records || [],
    deduplicateBySchemeVillage,
    isLoading,
  };
}
