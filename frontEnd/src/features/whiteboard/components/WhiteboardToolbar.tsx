import type { Tool } from "../../../types";
import { TOOL_DEFINITIONS } from "../constants/tools";

type WhiteboardToolbarProps = {
  tool: Tool;
  selectedId: string | null;
  drawColor: string;
  drawWidth: number;
  onToolChange: (tool: Tool) => void;
  onDrawColorChange: (color: string) => void;
  onDrawWidthChange: (width: number) => void;
  onDeleteSelected: () => void;
};

function WhiteboardToolbar({
  tool,
  selectedId,
  drawColor,
  drawWidth,
  onToolChange,
  onDrawColorChange,
  onDrawWidthChange,
  onDeleteSelected,
}: WhiteboardToolbarProps) {
  return (
    <aside className="toolbar" aria-label="白板工具列">
      {TOOL_DEFINITIONS.map((item) => (
        <button
          className={tool === item.tool ? "tool active" : "tool"}
          key={item.tool}
          onClick={() => onToolChange(item.tool)}
          title={`${item.label} (${item.shortcut})`}
        >
          <span className="tool-icon">{item.icon}</span>
          <span>{item.label}</span>
          <kbd>{item.shortcut}</kbd>
        </button>
      ))}
      {tool === "draw" && (
        <div className="draw-controls">
          <label title="畫筆顏色">
            顏色
            <input
              type="color"
              value={drawColor}
              onChange={(event) => onDrawColorChange(event.target.value)}
            />
          </label>
          <label title="畫筆粗細">
            粗細 <strong>{drawWidth}</strong>
            <input
              type="range"
              min="1"
              max="30"
              value={drawWidth}
              onChange={(event) => onDrawWidthChange(Number(event.target.value))}
            />
          </label>
        </div>
      )}
      <div className="toolbar-divider" />
      <button
        className="tool danger"
        disabled={!selectedId}
        onClick={onDeleteSelected}
      >
        <span className="tool-icon">⌫</span>
        <span>刪除</span>
        <kbd>Del</kbd>
      </button>
    </aside>
  );
}

export default WhiteboardToolbar;
