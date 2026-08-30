export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type RoomMember = {
  socketId: string;
  userName: string;
};

export type RemoteCursor = RoomMember & {
  x: number;
  y: number;
  updatedAt: number;
};
