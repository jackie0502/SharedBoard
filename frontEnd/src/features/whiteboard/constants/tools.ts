import type { Tool } from "../../../types";

export type ToolDefinition = {
  tool: Tool;
  icon: string;
  label: string;
  shortcut: string;
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { tool: "select", icon: "↖", label: "選取", shortcut: "V" },
  { tool: "rect", icon: "□", label: "矩形", shortcut: "R" },
  { tool: "circle", icon: "○", label: "圓形", shortcut: "C" },
  { tool: "text", icon: "T", label: "文字", shortcut: "T" },
  { tool: "draw", icon: "✎", label: "畫筆", shortcut: "P" },
];

export const TOOL_SHORTCUTS: Record<string, Tool> = Object.fromEntries(
  TOOL_DEFINITIONS.map(({ tool, shortcut }) => [shortcut.toLowerCase(), tool]),
) as Record<string, Tool>;

export const getToolLabel = (tool: Tool) =>
  TOOL_DEFINITIONS.find((definition) => definition.tool === tool)?.label ?? tool;
