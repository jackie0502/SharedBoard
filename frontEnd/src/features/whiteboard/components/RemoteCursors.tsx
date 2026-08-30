import { Group, Line, Rect, Text } from "react-konva";
import { memberColor } from "../../room/memberAppearance";
import type { RemoteCursor } from "../../room/types";

type RemoteCursorsProps = {
  cursors: RemoteCursor[];
};

function RemoteCursors({ cursors }: RemoteCursorsProps) {
  return cursors.map((cursor) => {
    const color = memberColor(cursor.socketId);
    const labelWidth = Math.max(48, Math.min(140, cursor.userName.length * 13 + 18));

    return (
      <Group key={cursor.socketId} x={cursor.x} y={cursor.y} listening={false}>
        <Line
          points={[0, 0, 2, 20, 7, 15, 12, 24, 17, 21, 12, 13, 21, 12]}
          closed
          fill={color}
          stroke="#ffffff"
          strokeWidth={2}
          shadowColor="#252238"
          shadowBlur={5}
          shadowOpacity={0.2}
        />
        <Rect
          x={15}
          y={21}
          width={labelWidth}
          height={24}
          fill={color}
          cornerRadius={7}
          shadowColor="#252238"
          shadowBlur={6}
          shadowOpacity={0.15}
        />
        <Text
          x={23}
          y={27}
          width={labelWidth - 16}
          text={cursor.userName}
          fill="#ffffff"
          fontFamily="system-ui, sans-serif"
          fontSize={11}
          fontStyle="bold"
          ellipsis
          wrap="none"
        />
      </Group>
    );
  });
}

export default RemoteCursors;
