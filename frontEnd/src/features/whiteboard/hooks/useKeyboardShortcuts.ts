import { useEffect } from "react";
import type { Tool } from "../../../types";
import { TOOL_SHORTCUTS } from "../constants/tools";

type KeyboardShortcutOptions = {
  selectedId: string | null;
  onDelete: (id: string) => void;
  onToolChange: (tool: Tool) => void;
  onClearSelection: () => void;
};

export function useKeyboardShortcuts({
  selectedId,
  onDelete,
  onToolChange,
  onClearSelection,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        onDelete(selectedId);
        return;
      }

      if (event.target instanceof HTMLInputElement) return;
      const nextTool = TOOL_SHORTCUTS[event.key.toLowerCase()];
      if (nextTool) onToolChange(nextTool);
      if (event.key === "Escape") onClearSelection();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, onDelete, onToolChange, onClearSelection]);
}
