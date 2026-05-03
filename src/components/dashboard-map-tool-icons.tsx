export type ToolbarAction = "add" | "undo" | "clear";

export const toolbarButtonStyle = {
  borderRadius: 999,
};

export const toolbarIconMap: Record<ToolbarAction, string> = {
  add: "+",
  undo: "↶",
  clear: "×",
};

export const toolbarTooltipMap: Record<ToolbarAction, string> = {
  add: "Bật chế độ thêm điểm",
  undo: "Hoàn tác điểm cuối",
  clear: "Xóa toàn bộ điểm",
};
