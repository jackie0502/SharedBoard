import { Ellipse, Group, Label, Rect, Tag, Text } from "react-konva";
import type { RemoteInteraction } from "../../room/types";
import { memberColor } from "../../room/memberAppearance";
import type { WhiteboardObject } from "../../../types";

type Props = {
  interactions: RemoteInteraction[];
  objects: WhiteboardObject[];
};

function getBounds(object: WhiteboardObject) {
  if (object.type === "stroke") {
    const points = (object.segments ?? [object.points ?? []]).flat();
    if (points.length < 2) return { x: object.x, y: object.y, width: 8, height: 8 };
    const xs = points.filter((_, index) => index % 2 === 0);
    const ys = points.filter((_, index) => index % 2 === 1);
    const padding = (object.strokeWidth ?? 5) / 2;
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
      x: object.x + minX - padding,
      y: object.y + minY - padding,
      width: Math.max(8, Math.max(...xs) - minX + padding * 2),
      height: Math.max(8, Math.max(...ys) - minY + padding * 2),
    };
  }

  return {
    x: object.x,
    y: object.y,
    width: Math.max(8, object.width ?? 0),
    height: Math.max(8, object.height ?? 0),
  };
}

function RemoteInteractions({ interactions = [], objects = [] }: Props) {
  return interactions.map((interaction) => {
    const object = interaction.preview ?? objects.find(({ id }) => id === interaction.objectId);
    if (!object || object.type === "eraser") return null;

    const color = memberColor(interaction.socketId);
    const { x, y, width, height } = getBounds(object);

    return (
      <Group key={interaction.socketId} listening={false}>
        {interaction.isDraft && object.type === "rect" && (
          <Rect x={x} y={y} width={width} height={height} fill={object.color} opacity={0.32} cornerRadius={12} />
        )}
        {interaction.isDraft && object.type === "circle" && (
          <Ellipse x={x + width / 2} y={y + height / 2} radiusX={width / 2} radiusY={height / 2} fill={object.color} opacity={0.32} />
        )}
        <Rect
          x={x - 4}
          y={y - 4}
          width={width + 8}
          height={height + 8}
          rotation={object.rotation ?? 0}
          stroke={color}
          strokeWidth={2}
          dash={[7, 4]}
          cornerRadius={5}
        />
        <Label x={x - 4} y={Math.max(0, y - 28)}>
          <Tag fill={color} cornerRadius={4} />
          <Text
            text={`${interaction.userName}${interaction.isDraft ? " 正在建立" : " 正在選取"}`}
            fill="#fff"
            fontSize={12}
            fontStyle="bold"
            padding={5}
          />
        </Label>
      </Group>
    );
  });
}

export default RemoteInteractions;
