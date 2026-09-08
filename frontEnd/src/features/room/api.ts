export type RoomSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type ApiErrorBody = { message?: string };

const apiBaseUrl = import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_SOCKET_URL ??
  "http://localhost:3000";

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorBody;
    throw new Error(body.message ?? `Room API 請求失敗（${response.status}）`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const roomApi = {
  async list() {
    const response = await request<{ rooms: RoomSummary[] }>("/api/rooms");
    return response.rooms;
  },

  async create(input: { id?: string; name?: string } = {}) {
    const response = await request<{ room: RoomSummary }>("/api/rooms", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.room;
  },

  async rename(roomId: string, name: string) {
    const response = await request<{ room: RoomSummary }>(
      `/api/rooms/${encodeURIComponent(roomId)}`,
      { method: "PATCH", body: JSON.stringify({ name }) },
    );
    return response.room;
  },

  async delete(roomId: string) {
    await request<void>(`/api/rooms/${encodeURIComponent(roomId)}`, {
      method: "DELETE",
    });
  },
};
