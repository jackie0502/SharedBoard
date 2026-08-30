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

export type RemoteInteraction = RoomMember & {
  objectId: string | null;
  preview: import("../../types").WhiteboardObject | null;
  isDraft: boolean;
  updatedAt: number;
};
