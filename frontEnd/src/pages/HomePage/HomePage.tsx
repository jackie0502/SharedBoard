import { useCallback, useEffect, useState } from "react";
import { roomApi, type RoomSummary } from "../../features/room/api";
import { loadLastRoom, type RoomCredentials } from "../../features/room/storage";

type HomePageProps = {
  initialRoomId?: string;
  onEnterRoom: (credentials: RoomCredentials) => void;
};

function HomePage({ initialRoomId, onEnterRoom }: HomePageProps) {
  const lastRoom = loadLastRoom();
  const [userName, setUserName] = useState(lastRoom?.userName ?? "");
  const [roomId, setRoomId] = useState(initialRoomId ?? lastRoom?.roomId ?? "");
  const [error, setError] = useState("");
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const refreshRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      setRooms(await roomApi.list());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "無法載入 Room List");
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    void refreshRooms();
  }, [refreshRooms]);

  const enterWithRoomId = (nextRoomId: string) => {
    const credentials = { userName: userName.trim(), roomId: nextRoomId.trim() };
    if (!credentials.userName || !credentials.roomId) {
      setError("請輸入使用者名稱與 Room ID");
      return;
    }
    onEnterRoom(credentials);
  };

  const enterRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    enterWithRoomId(roomId);
  };

  const createRoom = async () => {
    if (!userName.trim()) {
      setError("請先輸入使用者名稱");
      return;
    }
    setCreatingRoom(true);
    setError("");
    try {
      const room = await roomApi.create();
      setRoomId(room.id);
      onEnterRoom({ roomId: room.id, userName: userName.trim() });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "建立 Room 失敗");
    } finally {
      setCreatingRoom(false);
    }
  };

  const renameRoom = async (room: RoomSummary) => {
    const name = window.prompt("新的 Room 名稱", room.name)?.trim();
    if (!name || name === room.name) return;
    try {
      await roomApi.rename(room.id, name);
      await refreshRooms();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "重新命名失敗");
    }
  };

  const deleteRoom = async (room: RoomSummary) => {
    if (!window.confirm(`確定刪除「${room.name}」及其全部白板內容？`)) return;
    try {
      await roomApi.delete(room.id);
      await refreshRooms();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "刪除 Room 失敗");
    }
  };

  return (
    <main className="home-page">
      <div className="home-orb home-orb-one" />
      <div className="home-orb home-orb-two" />
      <section className="home-hero">
        <div className="home-brand">
          <span className="brand-mark">S</span>
          <span>SharedBoard</span>
        </div>
        <span className="home-eyebrow">REAL-TIME COLLABORATIVE WHITEBOARD</span>
        <h1>把想法放上白板，<br /><em>一起完成。</em></h1>
        <p>
          和團隊進入同一個 Room，即時畫圖、寫字與整理靈感。
          不需註冊，輸入名稱即可開始協作。
        </p>
        <div className="home-features" aria-label="主要功能">
          <span><b>✦</b> 即時同步</span>
          <span><b>⌁</b> 自由繪圖</span>
          <span><b>◎</b> 房間協作</span>
        </div>
      </section>

      <section className="join-card" aria-labelledby="join-title">
        <div className="join-card-heading">
          <span className="join-card-icon">↗</span>
          <div>
            <h2 id="join-title">進入協作白板</h2>
            <p>使用既有 Room ID，或建立新的房間。</p>
          </div>
        </div>
        <form onSubmit={enterRoom}>
          <label>
            你的名稱
            <input
              autoFocus
              value={userName}
              onChange={(event) => {
                setUserName(event.target.value);
                setError("");
              }}
              placeholder="例如：Kevin"
              maxLength={30}
              autoComplete="name"
            />
          </label>
          <label>
            Room ID
            <div className="room-id-field">
              <input
                value={roomId}
                onChange={(event) => {
                  setRoomId(event.target.value);
                  setError("");
                }}
                placeholder="例如：room-001"
                maxLength={50}
              />
              <button type="button" onClick={createRoom} disabled={creatingRoom}>
                {creatingRoom ? "建立中" : "建立"}
              </button>
            </div>
          </label>
          {error && <p className="join-error" role="alert">{error}</p>}
          <button className="enter-room-button" type="submit">
            進入白板 <span>→</span>
          </button>
        </form>
        <p className="join-note">進入後，將自動連線到本機協作伺服器。</p>
      </section>

      <section className="room-list-panel" aria-labelledby="room-list-title">
        <div className="room-list-heading">
          <div>
            <span className="home-eyebrow">ROOMS</span>
            <h2 id="room-list-title">最近使用的 Room</h2>
          </div>
          <button type="button" onClick={() => void refreshRooms()}>重新整理</button>
        </div>

        {loadingRooms ? (
          <p className="room-list-state">正在載入 Room…</p>
        ) : rooms.length === 0 ? (
          <p className="room-list-state">尚未建立 Room，建立第一個協作空間吧。</p>
        ) : (
          <div className="room-list-grid">
            {rooms.map((room) => (
              <article className="room-card" key={room.id}>
                <div>
                  <h3>{room.name}</h3>
                  <code>{room.id}</code>
                </div>
                <time dateTime={room.updatedAt}>
                  更新於 {new Date(room.updatedAt).toLocaleString("zh-TW")}
                </time>
                <div className="room-card-actions">
                  <button type="button" onClick={() => enterWithRoomId(room.id)}>進入</button>
                  <button type="button" onClick={() => void renameRoom(room)}>改名</button>
                  <button
                    className="room-delete-button"
                    type="button"
                    onClick={() => void deleteRoom(room)}
                  >
                    刪除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default HomePage;
