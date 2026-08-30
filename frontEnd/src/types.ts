export type Tool = "select" | "rect" | "circle" | "text" | "draw" | "eraser";

export type WhiteboardObject = {
  id: string;
  type: "rect" | "circle" | "text" | "stroke";
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  text?: string;
  points?: number[];
  color?: string;
  strokeWidth?: number;
  version: number;
};
