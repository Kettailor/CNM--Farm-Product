import type { WarehouseType } from "@/lib/warehouse-types";

export type WarehouseIconName =
  | "warehouse"
  | "plus"
  | "edit"
  | "trash"
  | "save"
  | "close"
  | "search"
  | "tools"
  | "chemical"
  | "feed"
  | "product"
  | "back"
  | "menu"
  | "overview"
  | "warning";

export function iconForType(type: WarehouseType): WarehouseIconName {
  if (type === "cong_cu") return "tools";
  if (type === "hoa_chat") return "chemical";
  if (type === "thuc_an") return "feed";
  return "product";
}

export default function WarehouseIcon({ name }: { name: WarehouseIconName }) {
  switch (name) {
    case "warehouse":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 20V9l9-5 9 5v11" />
          <path d="M7 20v-8h10v8" />
          <path d="M9 16h6M9 12h6" />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "edit":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 19 4.4-1.1L19 8.3 15.7 5 6.1 14.6 5 19Z" />
          <path d="m14.5 6.2 3.3 3.3" />
        </svg>
      );
    case "trash":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7h12" />
          <path d="M9 7V5h6v2" />
          <path d="m9 10 .5 9h5l.5-9" />
        </svg>
      );
    case "save":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 4h12l2 2v14H5V4Z" />
          <path d="M8 4v6h8V4M8 17h8" />
        </svg>
      );
    case "close":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "tools":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m14 7 3-3 3 3-3 3" />
          <path d="M4 20 14.5 9.5" />
          <path d="m8 4 12 12-4 4L4 8l4-4Z" />
        </svg>
      );
    case "chemical":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 2.6 4h8.8A3 3 0 0 0 19 17l-5-9V3" />
          <path d="M8 15h8" />
        </svg>
      );
    case "feed":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 5h10l2 16H5L7 5Z" />
          <path d="M9 9h6M9 13h6" />
          <path d="M8 5 9 3h6l1 2" />
        </svg>
      );
    case "product":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m4 8 8-4 8 4-8 4-8-4Z" />
          <path d="M4 8v8l8 4 8-4V8" />
          <path d="M12 12v8" />
        </svg>
      );
    case "back":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 7 5 12l5 5" />
          <path d="M5 12h14" />
        </svg>
      );
    case "menu":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 7h14M5 12h14M5 17h14" />
        </svg>
      );
    case "warning":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4 3 20h18L12 4Z" />
          <path d="M12 9v5M12 17h.01" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16v13H4z" />
          <path d="M8 7V4h8v3" />
        </svg>
      );
  }
}
