import type { FormEvent } from "react";
import type { ConnectionStatus as ConnectionStatusValue } from "../types";
import ConnectionStatus from "./ConnectionStatus";

type RoomControlsProps = {
  connectionStatus: ConnectionStatusValue;
  socketId: string | null;
  userName: string;
  roomId: string;
  joinedUserName: string | null;
  joinedRoomId: string | null;
  roomMessage: string;
  onUserNameChange: (value: string) => void;
  onRoomIdChange: (value: string) => void;
  onJoinRoom: (event: FormEvent<HTMLFormElement>) => void;
};

function RoomControls({
  connectionStatus,
  socketId,
  userName,
  roomId,
  joinedUserName,
  joinedRoomId,
  roomMessage,
  onUserNameChange,
  onRoomIdChange,
  onJoinRoom,
}: RoomControlsProps) {
  return (
    <div className="realtime-controls">
      <ConnectionStatus status={connectionStatus} socketId={socketId} />
      <form className="room-form" onSubmit={onJoinRoom}>
        <input
          aria-label="使用者名稱"
          value={userName}
          onChange={(event) => onUserNameChange(event.target.value)}
          placeholder="使用者名稱"
          maxLength={30}
        />
        <input
          aria-label="Room ID"
          value={roomId}
          onChange={(event) => onRoomIdChange(event.target.value)}
          placeholder="Room ID"
          maxLength={50}
        />
        <button type="submit" disabled={connectionStatus !== "connected"}>
          {joinedRoomId ? "切換房間" : "加入房間"}
        </button>
      </form>
      <span className="room-message" title={roomMessage}>
        {joinedRoomId ? `${joinedUserName} · ${joinedRoomId}` : roomMessage}
      </span>
    </div>
  );
}

export default RoomControls;
