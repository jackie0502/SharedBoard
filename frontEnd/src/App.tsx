import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Ellipse, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import type { Tool, WhiteboardObject } from "./types";

const TOOL_LABELS: { tool: Tool; icon: string; label: string; shortcut: string }[] = [
  { tool: "select", icon: "↖", label: "選取", shortcut: "V" },
  { tool: "rect", icon: "□", label: "矩形", shortcut: "R" },
  { tool: "circle", icon: "○", label: "圓形", shortcut: "C" },
  { tool: "text", icon: "T", label: "文字", shortcut: "T" },
  { tool: "draw", icon: "✎", label: "畫筆", shortcut: "P" },
];

const objectName = (type: WhiteboardObject["type"]) =>
  ({ rect: "矩形", circle: "圓形", text: "文字", stroke: "筆畫" })[type];

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const drawingIdRef = useRef<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 900, height: 620 });
  const [tool, setTool] = useState<Tool>("select");
  const [objects, setObjects] = useState<WhiteboardObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawColor, setDrawColor] = useState("#202431");
  const [drawWidth, setDrawWidth] = useState(5);

  const selectedObject = objects.find((object) => object.id === selectedId);

  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      setStageSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = transformer?.getStage();
    const node = selectedId ? stage?.findOne(`#${selectedId}`) : undefined;
    transformer?.nodes(node ? [node] : []);
    transformer?.getLayer()?.batchDraw();
  }, [selectedId, objects]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        setObjects((current) => current.filter((object) => object.id !== selectedId));
        setSelectedId(null);
        return;
      }
      if (event.target instanceof HTMLInputElement) return;
      const shortcuts: Record<string, Tool> = { v: "select", r: "rect", c: "circle", t: "text", p: "draw" };
      const nextTool = shortcuts[event.key.toLowerCase()];
      if (nextTool) setTool(nextTool);
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  const updateObject = (id: string, changes: Partial<WhiteboardObject>) => {
    setObjects((current) =>
      current.map((object) =>
        object.id === id ? { ...object, ...changes, version: object.version + 1 } : object,
      ),
    );
  };

  const createObject = (x: number, y: number) => {
    if (tool === "select") {
      setSelectedId(null);
      return;
    }
    const id = crypto.randomUUID();
    const common = { id, x, y, version: 1 };
    const next: WhiteboardObject =
      tool === "rect"
        ? { ...common, type: "rect", width: 150, height: 100, color: "#8b5cf6" }
        : tool === "circle"
          ? { ...common, type: "circle", width: 120, height: 120, color: "#22c55e" }
          : { ...common, type: "text", width: 180, height: 44, text: "雙擊編輯文字", color: "#202431" };
    setObjects((current) => [...current, next]);
    setSelectedId(id);
    setTool("select");
  };

  const startDrawing = (stage: Konva.Stage) => {
    const position = stage.getPointerPosition();
    if (!position) return;
    const id = crypto.randomUUID();
    drawingIdRef.current = id;
    setSelectedId(null);
    setObjects((current) => [
      ...current,
      {
        id,
        type: "stroke",
        x: 0,
        y: 0,
        points: [position.x, position.y],
        color: drawColor,
        strokeWidth: drawWidth,
        version: 1,
      },
    ]);
  };

  const continueDrawing = (stage: Konva.Stage) => {
    const id = drawingIdRef.current;
    const position = stage.getPointerPosition();
    if (!id || !position) return;
    setObjects((current) =>
      current.map((object) =>
        object.id === id
          ? { ...object, points: [...(object.points ?? []), position.x, position.y] }
          : object,
      ),
    );
  };

  const finishDrawing = () => {
    const id = drawingIdRef.current;
    if (!id) return;
    drawingIdRef.current = null;
    setObjects((current) =>
      current.map((object) => object.id === id ? { ...object, version: object.version + 1 } : object),
    );
  };

  const renderObject = (object: WhiteboardObject) => {
    const shared = {
      id: object.id,
      key: object.id,
      x: object.x,
      y: object.y,
      draggable: tool === "select",
      onClick: (event: Konva.KonvaEventObject<MouseEvent>) => {
        event.cancelBubble = true;
        setSelectedId(object.id);
      },
      onTap: (event: Konva.KonvaEventObject<TouchEvent>) => {
        event.cancelBubble = true;
        setSelectedId(object.id);
      },
      onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) =>
        updateObject(object.id, { x: event.target.x(), y: event.target.y() }),
      onTransformEnd: (event: Konva.KonvaEventObject<Event>) => {
        const node = event.target;
        const width = Math.max(20, (object.width ?? 100) * node.scaleX());
        const height = Math.max(20, (object.height ?? 100) * node.scaleY());
        node.scaleX(1);
        node.scaleY(1);
        updateObject(object.id, { x: node.x(), y: node.y(), width, height, rotation: node.rotation() });
      },
    };

    if (object.type === "rect") {
      return <Rect {...shared} width={object.width} height={object.height} fill={object.color ?? "#8b5cf6"} cornerRadius={12} shadowColor="#5b21b6" shadowBlur={12} shadowOpacity={0.16} />;
    }
    if (object.type === "circle") {
      const width = object.width ?? 120;
      const height = object.height ?? 120;
      return (
        <Ellipse
          {...shared}
          x={object.x + width / 2}
          y={object.y + height / 2}
          radiusX={width / 2}
          radiusY={height / 2}
          fill={object.color ?? "#22c55e"}
          shadowColor="#15803d"
          shadowBlur={12}
          shadowOpacity={0.16}
          onDragEnd={(event) =>
            updateObject(object.id, {
              x: event.target.x() - width / 2,
              y: event.target.y() - height / 2,
            })
          }
          onTransformEnd={(event) => {
            const node = event.target;
            const nextWidth = Math.max(20, width * node.scaleX());
            const nextHeight = Math.max(20, height * node.scaleY());
            node.scaleX(1);
            node.scaleY(1);
            updateObject(object.id, {
              x: node.x() - nextWidth / 2,
              y: node.y() - nextHeight / 2,
              width: nextWidth,
              height: nextHeight,
              rotation: node.rotation(),
            });
          }}
        />
      );
    }
    if (object.type === "text") {
      return (
        <Text
          {...shared}
          text={object.text}
          width={object.width}
          height={object.height}
          fontSize={24}
          fontFamily="system-ui, sans-serif"
          fill={object.color ?? "#202431"}
          verticalAlign="middle"
          onDblClick={() => {
            const value = window.prompt("請輸入文字", object.text);
            if (value !== null && value.trim()) updateObject(object.id, { text: value.trim() });
          }}
        />
      );
    }
    if (object.type === "stroke") {
      return (
        <Line
          {...shared}
          points={object.points ?? []}
          stroke={object.color ?? "#202431"}
          strokeWidth={object.strokeWidth ?? 5}
          lineCap="round"
          lineJoin="round"
          tension={0.25}
          hitStrokeWidth={Math.max(12, object.strokeWidth ?? 5)}
        />
      );
    }
    return null;
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">S</span><span>SharedBoard</span></div>
        <div className="mode-pill"><span className="status-dot" />單機模式</div>
        <div className="object-count">{objects.length} 個物件</div>
      </header>

      <section className="workspace">
        <aside className="toolbar" aria-label="白板工具列">
          {TOOL_LABELS.map((item) => (
            <button
              className={tool === item.tool ? "tool active" : "tool"}
              key={item.tool}
              onClick={() => setTool(item.tool)}
              title={`${item.label} (${item.shortcut})`}
            >
              <span className="tool-icon">{item.icon}</span><span>{item.label}</span><kbd>{item.shortcut}</kbd>
            </button>
          ))}
          {tool === "draw" && (
            <div className="draw-controls">
              <label title="畫筆顏色">
                顏色
                <input type="color" value={drawColor} onChange={(event) => setDrawColor(event.target.value)} />
              </label>
              <label title="畫筆粗細">
                粗細 <strong>{drawWidth}</strong>
                <input type="range" min="1" max="30" value={drawWidth} onChange={(event) => setDrawWidth(Number(event.target.value))} />
              </label>
            </div>
          )}
          <div className="toolbar-divider" />
          <button
            className="tool danger"
            disabled={!selectedId}
            onClick={() => {
              setObjects((current) => current.filter((object) => object.id !== selectedId));
              setSelectedId(null);
            }}
          ><span className="tool-icon">⌫</span><span>刪除</span><kbd>Del</kbd></button>
        </aside>

        <div className="board-wrap" ref={containerRef}>
          {objects.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">✦</div>
              <h1>開始你的白板</h1>
              <p>從左側選擇一個工具，然後點擊畫布建立物件。</p>
            </div>
          )}
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={(event) => {
              if (event.target !== event.target.getStage()) return;
              if (tool === "draw") {
                startDrawing(event.target.getStage()!);
                return;
              }
              const position = event.target.getStage()?.getPointerPosition();
              if (position) createObject(position.x, position.y);
            }}
            onMouseMove={(event) => {
              if (tool === "draw") continueDrawing(event.target.getStage()!);
            }}
            onMouseUp={finishDrawing}
            onMouseLeave={finishDrawing}
            onTouchStart={(event) => {
              if (tool === "draw" && event.target === event.target.getStage()) startDrawing(event.target.getStage()!);
            }}
            onTouchMove={(event) => {
              if (tool === "draw") continueDrawing(event.target.getStage()!);
            }}
            onTouchEnd={finishDrawing}
          >
            <Layer>
              {objects.map(renderObject)}
              <Transformer
                ref={transformerRef}
                rotateEnabled={selectedObject?.type !== "stroke"}
                resizeEnabled={selectedObject?.type !== "stroke"}
                flipEnabled={false}
                borderStroke="#6d4aff"
                anchorFill="#ffffff"
                anchorStroke="#6d4aff"
                anchorSize={9}
                boundBoxFunc={(oldBox, newBox) =>
                  Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20 ? oldBox : newBox
                }
              />
            </Layer>
          </Stage>
          <div className="board-hint">
            {tool === "select" ? "點選物件進行移動或縮放" : `點擊畫布建立${TOOL_LABELS.find((item) => item.tool === tool)?.label}`}
          </div>
        </div>

        <aside className="inspector">
          <h2>屬性</h2>
          {selectedObject ? (
            <div className="property-card">
              <span className="type-badge">{objectName(selectedObject.type)}</span>
              <label className="color-property">
                顏色
                <span className="color-input-wrap">
                  <input
                    type="color"
                    value={selectedObject.color ?? "#202431"}
                    onChange={(event) => updateObject(selectedObject.id, { color: event.target.value })}
                  />
                  <code>{selectedObject.color ?? "#202431"}</code>
                </span>
              </label>
              {selectedObject.type === "stroke" && (
                <label className="width-property">
                  粗細 <strong>{selectedObject.strokeWidth ?? 5}</strong>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={selectedObject.strokeWidth ?? 5}
                    onChange={(event) => updateObject(selectedObject.id, { strokeWidth: Number(event.target.value) })}
                  />
                </label>
              )}
              <label>X<input type="number" value={Math.round(selectedObject.x)} onChange={(e) => updateObject(selectedObject.id, { x: Number(e.target.value) })} /></label>
              <label>Y<input type="number" value={Math.round(selectedObject.y)} onChange={(e) => updateObject(selectedObject.id, { y: Number(e.target.value) })} /></label>
              <p className="version">版本 {selectedObject.version}</p>
            </div>
          ) : (
            <div className="no-selection"><span>◇</span><p>尚未選取物件</p><small>點擊畫布上的物件查看屬性</small></div>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;
