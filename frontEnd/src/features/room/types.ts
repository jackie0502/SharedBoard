export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type RoomMember = {
  socketId: string;
  userName: string;
};
