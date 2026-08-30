import RoomControls from "../../room/components/RoomControls";
import type { ConnectionStatus } from "../../room/types";
import type { RoomMember } from "../../room/types";
import RoomMemberList from "../../room/components/RoomMemberList";

type BoardHeaderProps = {
  connectionStatus: ConnectionStatus;
  socketId: string | null;
  userName: string;
  roomId: string;
  joinedUserName: string | null;
  joinedRoomId: string | null;
  roomMessage: string;
  objectCount: number;
  roomMembers: RoomMember[];
  onUserNameChange: (value: string) => void;
  onRoomIdChange: (value: string) => void;
  onJoinRoom: React.FormEventHandler<HTMLFormElement>;
  onLeaveRoom: () => void;
};

function BoardHeader(props: BoardHeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">S</span>
        <span>SharedBoard</span>
      </div>
      <RoomControls {...props} />
      <div className="header-actions">
        <RoomMemberList members={props.roomMembers} currentSocketId={props.socketId} />
        <span className="object-count">{props.objectCount} 個物件</span>
        <button className="leave-room-button" type="button" onClick={props.onLeaveRoom}>
          返回首頁
        </button>
      </div>
    </header>
  );
}

export default BoardHeader;
