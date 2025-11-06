import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface SortableTableHeadProps {
  field: string;
  label: string;
  sortField: string | null;
  sortDirection: "asc" | "desc" | null;
  onSort: (field: string) => void;
}

export function SortableTableHead({
  field,
  label,
  sortField,
  sortDirection,
  onSort,
}: SortableTableHeadProps) {
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors group whitespace-nowrap"
    >
      {label}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="w-4 h-4" />
        ) : (
          <ArrowDown className="w-4 h-4" />
        )
      ) : (
        <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
      )}
    </button>
  );
}
