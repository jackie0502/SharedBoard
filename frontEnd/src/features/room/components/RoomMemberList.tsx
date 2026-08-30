import type { RoomMember } from "../types";

type RoomMemberListProps = {
  members: RoomMember[];
  currentSocketId: string | null;
};

const MEMBER_COLORS = ["#7657ed", "#0ea5e9", "#16a34a", "#ea580c", "#db2777"];

const memberColor = (socketId: string) => {
  const hash = Array.from(socketId).reduce((total, character) => total + character.charCodeAt(0), 0);
  return MEMBER_COLORS[hash % MEMBER_COLORS.length];
};

const memberInitial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

function RoomMemberList({ members, currentSocketId }: RoomMemberListProps) {
  if (members.length === 0) return null;

  const visibleMembers = members.slice(0, 3);
  const remainingCount = members.length - visibleMembers.length;

  return (
    <details className="room-members">
      <summary aria-label={`房間成員 ${members.length} 人`}>
        <span className="member-avatars" aria-hidden="true">
          {visibleMembers.map((member) => (
            <span
              className="member-avatar"
              key={member.socketId}
              style={{ backgroundColor: memberColor(member.socketId) }}
            >
              {memberInitial(member.userName)}
            </span>
          ))}
          {remainingCount > 0 && <span className="member-avatar member-more">+{remainingCount}</span>}
        </span>
        <span>{members.length} 人在線</span>
        <span className="member-chevron">⌄</span>
      </summary>
      <div className="member-popover">
        <strong>房間成員</strong>
        <ul>
          {members.map((member) => {
            const isCurrentUser = member.socketId === currentSocketId;
            return (
              <li key={member.socketId}>
                <span
                  className="member-avatar"
                  style={{ backgroundColor: memberColor(member.socketId) }}
                >
                  {memberInitial(member.userName)}
                </span>
                <span className="member-name" title={member.userName}>{member.userName}</span>
                {isCurrentUser && <small>你</small>}
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

export default RoomMemberList;
