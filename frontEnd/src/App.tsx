import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  clearActiveRoom,
  loadActiveRoom,
  loadLastRoom,
  saveActiveRoom,
  saveLastRoom,
  type RoomCredentials,
} from "./features/room/storage";
import BoardPage from "./pages/BoardPage/BoardPage";
import HomePage from "./pages/HomePage/HomePage";

type HomeLocationState = { roomId?: string } | null;

const roomPath = (roomId: string) => `/room/${encodeURIComponent(roomId)}`;

function HomeRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as HomeLocationState;

  const enterRoom = (credentials: RoomCredentials) => {
    saveLastRoom(credentials);
    saveActiveRoom(credentials);
    navigate(roomPath(credentials.roomId));
  };

  return <HomePage initialRoomId={state?.roomId} onEnterRoom={enterRoom} />;
}

function BoardRoute() {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const activeRoom = loadActiveRoom();
  const lastRoom = loadLastRoom();
  const userName = activeRoom?.userName ?? lastRoom?.userName;

  if (!roomId) return <Navigate to="/" replace />;
  if (!userName) return <Navigate to="/" replace state={{ roomId }} />;

  const credentials = { roomId, userName };
  const leaveRoom = () => {
    clearActiveRoom();
    navigate("/");
  };
  const handleRoomJoined = (joined: RoomCredentials) => {
    saveLastRoom(joined);
    saveActiveRoom(joined);
    if (joined.roomId !== roomId) navigate(roomPath(joined.roomId));
  };

  return (
    <BoardPage
      key={roomId}
      initialCredentials={credentials}
      onLeaveRoom={leaveRoom}
      onRoomJoined={handleRoomJoined}
    />
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/room/:roomId" element={<BoardRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
