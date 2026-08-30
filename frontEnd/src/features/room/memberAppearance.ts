const MEMBER_COLORS = ["#7657ed", "#0ea5e9", "#16a34a", "#ea580c", "#db2777"];

export const memberColor = (socketId: string) => {
  const hash = Array.from(socketId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return MEMBER_COLORS[hash % MEMBER_COLORS.length];
};

export const memberInitial = (name: string) =>
  name.trim().charAt(0).toUpperCase() || "?";
