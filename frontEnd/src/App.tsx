import { useState } from "react";
import {
  clearActiveRoom,
  loadActiveRoom,
  saveActiveRoom,
  saveLastRoom,
  type RoomCredentials,
} from "./features/room/storage";
import BoardPage from "./pages/BoardPage/BoardPage";
import HomePage from "./pages/HomePage/HomePage";

function App() {
  const [activeRoom, setActiveRoom] = useState<RoomCredentials | null>(loadActiveRoom);

  const enterRoom = (credentials: RoomCredentials) => {
    saveLastRoom(credentials);
    saveActiveRoom(credentials);
    setActiveRoom(credentials);
  };

  const leaveRoom = () => {
    clearActiveRoom();
    setActiveRoom(null);
  };

  return activeRoom
    ? <BoardPage initialCredentials={activeRoom} onLeaveRoom={leaveRoom} />
    : <HomePage onEnterRoom={enterRoom} />;
}

export default App;
