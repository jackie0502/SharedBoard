import { useState } from "react";
import { loadLastRoom, type RoomCredentials } from "../../features/room/storage";

type HomePageProps = {
  onEnterRoom: (credentials: RoomCredentials) => void;
};

function HomePage({ onEnterRoom }: HomePageProps) {
  const lastRoom = loadLastRoom();
  const [userName, setUserName] = useState(lastRoom?.userName ?? "");
  const [roomId, setRoomId] = useState(lastRoom?.roomId ?? "");
  const [error, setError] = useState("");

  const enterRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const credentials = { userName: userName.trim(), roomId: roomId.trim() };

    if (!credentials.userName || !credentials.roomId) {
      setError("請輸入使用者名稱與 Room ID");
      return;
    }

    onEnterRoom(credentials);
  };

  const createRoomId = () => {
    setRoomId(`room-${crypto.randomUUID().slice(0, 8)}`);
    setError("");
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
              <button type="button" onClick={createRoomId}>建立</button>
            </div>
          </label>
          {error && <p className="join-error" role="alert">{error}</p>}
          <button className="enter-room-button" type="submit">
            進入白板 <span>→</span>
          </button>
        </form>
        <p className="join-note">進入後，將自動連線到本機協作伺服器。</p>
      </section>
    </main>
  );
}

export default HomePage;
