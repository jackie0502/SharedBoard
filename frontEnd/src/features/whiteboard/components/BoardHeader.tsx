import RoomControls from "../../room/components/RoomControls";
import type { ConnectionStatus } from "../../room/types";

type BoardHeaderProps = {
  connectionStatus: ConnectionStatus;
  socketId: string | null;
  userName: string;
  roomId: string;
  joinedUserName: string | null;
  joinedRoomId: string | null;
  roomMessage: string;
  objectCount: number;
  onUserNameChange: (value: string) => void;
  onRoomIdChange: (value: string) => void;
  onJoinRoom: React.FormEventHandler<HTMLFormElement>;
};

function BoardHeader(props: BoardHeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">S</span>
        <span>SharedBoard</span>
      </div>
      <RoomControls {...props} />
      <div className="object-count">{props.objectCount} 個物件</div>
    </header>
  );
}

export default BoardHeader;
