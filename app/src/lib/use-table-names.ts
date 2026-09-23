"use client";

import { useEffect, useState } from "react";

export type TableNameMap = Record<string, string>;

/** Fetches the tableId -> friendly display name map once on mount. Falls back to the raw code wherever a table has no custom name. */
export function useTableNames(): TableNameMap {
  const [map, setMap] = useState<TableNameMap>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/table-names")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const next: TableNameMap = {};
        for (const t of data.tableNames ?? []) next[t.tableId] = t.displayName;
        setMap(next);
      })
      .catch(() => {
        // no custom names available — every table just shows its raw code
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}

export function tableLabel(map: TableNameMap, tableId: string): string {
  return map[tableId] || tableId;
}
