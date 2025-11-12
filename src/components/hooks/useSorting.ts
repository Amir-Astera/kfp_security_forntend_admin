import { useState, useCallback } from "react";

type SortDirection = "asc" | "desc" | null;

export function useSorting() {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField, sortDirection]);

  const sortData = useCallback(<T extends Record<string, any>>(data: T[]): T[] => {
    if (!sortField || !sortDirection) return data;

    return [...data].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle dates in format DD.MM.YYYY
      if (typeof aVal === "string" && /^\d{2}\.\d{2}\.\d{4}/.test(aVal)) {
        const [aDay, aMonth, aYear] = aVal.split(/[\s.]/);
        const [bDay, bMonth, bYear] = bVal.split(/[\s.]/);
        aVal = new Date(`${aYear}-${aMonth}-${aDay}`).getTime();
        bVal = new Date(`${bYear}-${bMonth}-${bDay}`).getTime();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [sortField, sortDirection]);

  return {
    sortField,
    sortDirection,
    handleSort,
    sortData,
  };
}
