import type Konva from "konva";
import { Ellipse, Line, Rect, Text } from "react-konva";
import type { Tool, WhiteboardObject } from "../../../types";

type WhiteboardObjectRendererProps = {
  object: WhiteboardObject;
  tool: Tool;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number, force?: boolean) => void;
  onTransformStart: (id: string) => void;
  onTransform: (id: string, node: Konva.Node, force?: boolean) => void;
  onUpdateObject: (id: string, changes: Partial<WhiteboardObject>) => void;
};

function WhiteboardObjectRenderer({
  object,
  tool,
  onSelect,
  onDragStart,
  onPositionChange,
  onTransformStart,
  onTransform,
  onUpdateObject,
}: WhiteboardObjectRendererProps) {
  const shared = {
    id: object.id,
    x: object.x,
    y: object.y,
    rotation: object.rotation ?? 0,
    draggable: tool === "select",
    onClick: (event: Konva.KonvaEventObject<MouseEvent>) => {
      event.cancelBubble = true;
      onSelect(object.id);
    },
    onTap: (event: Konva.KonvaEventObject<TouchEvent>) => {
      event.cancelBubble = true;
      onSelect(object.id);
    },
    onDragStart: () => onDragStart(object.id),
    onDragMove: (event: Konva.KonvaEventObject<DragEvent>) =>
      onPositionChange(object.id, event.target.x(), event.target.y()),
    onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) =>
      onPositionChange(object.id, event.target.x(), event.target.y(), true),
    onTransformStart: () => onTransformStart(object.id),
    onTransform: (event: Konva.KonvaEventObject<Event>) =>
      onTransform(object.id, event.target),
    onTransformEnd: (event: Konva.KonvaEventObject<Event>) => {
      const node = event.target;
      onTransform(object.id, node, true);
      node.scaleX(1);
      node.scaleY(1);
    },
  };

  if (object.type === "rect") {
    return (
      <Rect
        {...shared}
        width={object.width}
        height={object.height}
        fill={object.color ?? "#8b5cf6"}
        cornerRadius={12}
        shadowColor="#5b21b6"
        shadowBlur={12}
        shadowOpacity={0.16}
      />
    );
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
        onDragMove={(event) =>
          onPositionChange(
            object.id,
            event.target.x() - width / 2,
            event.target.y() - height / 2,
          )
        }
        onDragEnd={(event) =>
          onPositionChange(
            object.id,
            event.target.x() - width / 2,
            event.target.y() - height / 2,
            true,
          )
        }
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
          if (value !== null && value.trim()) {
            onUpdateObject(object.id, { text: value.trim() });
          }
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

  if (object.type === "eraser") {
    return (
      <Line
        id={object.id}
        x={object.x}
        y={object.y}
        points={object.points ?? []}
        stroke="#000000"
        strokeWidth={object.strokeWidth ?? 32}
        lineCap="round"
        lineJoin="round"
        tension={0.25}
        globalCompositeOperation="destination-out"
        listening={false}
      />
    );
  }

  return null;
}

export default WhiteboardObjectRenderer;
