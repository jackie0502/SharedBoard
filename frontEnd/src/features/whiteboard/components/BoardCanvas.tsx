import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import type Konva from "konva";
import { Circle, Layer, Stage, Transformer } from "react-konva";
import type { Tool, WhiteboardObject } from "../../../types";
import { getToolLabel } from "../constants/tools";
import type { StageSize } from "../hooks/useStageSize";

type BoardCanvasProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  stageSize: StageSize;
  tool: Tool;
  objects: WhiteboardObject[];
  selectedId: string | null;
  selectedObject?: WhiteboardObject;
  eraserSize: number;
  eraserPosition: { x: number; y: number } | null;
  renderObject: (object: WhiteboardObject) => ReactNode;
  onPointerDown: (stage: Konva.Stage) => void;
  onPointerMove: (stage: Konva.Stage) => void;
  onPointerUp: () => void;
};

function BoardCanvas({
  containerRef,
  stageSize,
  tool,
  objects,
  selectedId,
  selectedObject,
  eraserSize,
  eraserPosition,
  renderObject,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: BoardCanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = transformer?.getStage();
    const node = selectedId ? stage?.findOne(`#${selectedId}`) : undefined;
    transformer?.nodes(node ? [node] : []);
    transformer?.getLayer()?.batchDraw();
  }, [selectedId, objects]);

  const handlePointerDown = (target: Konva.Node) => {
    const stage = target.getStage();
    if (!stage || (tool !== "eraser" && target !== stage)) return;
    onPointerDown(stage);
  };

  const handlePointerMove = (target: Konva.Node) => {
    const stage = target.getStage();
    if (stage) onPointerMove(stage);
  };

  return (
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
        onMouseDown={(event) => handlePointerDown(event.target)}
        onMouseMove={(event) => handlePointerMove(event.target)}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={(event) => handlePointerDown(event.target)}
        onTouchMove={(event) => handlePointerMove(event.target)}
        onTouchEnd={onPointerUp}
      >
        <Layer>
          {objects.map(renderObject)}
          {tool === "eraser" && eraserPosition && (
            <Circle
              x={eraserPosition.x}
              y={eraserPosition.y}
              radius={eraserSize / 2}
              fill="rgba(255, 255, 255, 0.72)"
              stroke="#ef4444"
              strokeWidth={1.5}
              dash={[5, 4]}
              listening={false}
            />
          )}
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
              Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20
                ? oldBox
                : newBox
            }
          />
        </Layer>
      </Stage>
      <div className="board-hint">
        {tool === "select"
          ? "點選物件進行移動或縮放"
          : tool === "rect" || tool === "circle"
            ? `在畫布上拖曳以建立${getToolLabel(tool)}`
            : tool === "eraser"
              ? "拖過畫筆筆畫以刪除整筆"
            : `點擊畫布建立${getToolLabel(tool)}`}
      </div>
    </div>
  );
}

export default BoardCanvas;
