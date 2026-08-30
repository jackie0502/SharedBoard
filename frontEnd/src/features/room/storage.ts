export type RoomCredentials = {
  roomId: string;
  userName: string;
};

const LAST_ROOM_STORAGE_KEY = "sharedboard:last-room";
const ACTIVE_ROOM_STORAGE_KEY = "sharedboard:active-room";

const parseCredentials = (value: string | null): RoomCredentials | null => {
  if (!value) return null;

  try {
    const credentials = JSON.parse(value) as Partial<RoomCredentials>;
    if (typeof credentials.roomId !== "string" || typeof credentials.userName !== "string") {
      return null;
    }

    const roomId = credentials.roomId.trim();
    const userName = credentials.userName.trim();
    return roomId && userName ? { roomId, userName } : null;
  } catch {
    return null;
  }
};

export const loadLastRoom = () =>
  parseCredentials(window.localStorage.getItem(LAST_ROOM_STORAGE_KEY));

export const saveLastRoom = (credentials: RoomCredentials) =>
  window.localStorage.setItem(LAST_ROOM_STORAGE_KEY, JSON.stringify(credentials));

export const loadActiveRoom = () =>
  parseCredentials(window.sessionStorage.getItem(ACTIVE_ROOM_STORAGE_KEY));

export const saveActiveRoom = (credentials: RoomCredentials) =>
  window.sessionStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, JSON.stringify(credentials));

export const clearActiveRoom = () =>
  window.sessionStorage.removeItem(ACTIVE_ROOM_STORAGE_KEY);
