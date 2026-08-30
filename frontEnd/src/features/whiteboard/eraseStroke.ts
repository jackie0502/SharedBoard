import type { WhiteboardObject } from "../../types";

type Point = { x: number; y: number };

const sampleSegment = (points: number[], spacing = 2) => {
  if (points.length < 4) return points;
  const sampled = [points[0], points[1]];

  for (let index = 2; index < points.length; index += 2) {
    const startX = points[index - 2];
    const startY = points[index - 1];
    const endX = points[index];
    const endY = points[index + 1];
    const distance = Math.hypot(endX - startX, endY - startY);
    const steps = Math.max(1, Math.ceil(distance / spacing));

    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps;
      sampled.push(
        startX + (endX - startX) * ratio,
        startY + (endY - startY) * ratio,
      );
    }
  }

  return sampled;
};

export const eraseStrokeAlongPath = (
  stroke: WhiteboardObject,
  from: Point,
  to: Point,
  eraserSize: number,
) => {
  if (stroke.type !== "stroke") return null;

  const eraserPath = sampleSegment([from.x, from.y, to.x, to.y]);
  const radius = eraserSize / 2 + (stroke.strokeWidth ?? 5) / 2;
  const radiusSquared = radius * radius;
  const sourceSegments = stroke.segments ?? [stroke.points ?? []];
  const nextSegments: number[][] = [];
  let changed = false;

  for (const source of sourceSegments) {
    const sampled = sampleSegment(source);
    let current: number[] = [];

    for (let index = 0; index < sampled.length; index += 2) {
      const localX = sampled[index];
      const localY = sampled[index + 1];
      const boardX = localX + stroke.x;
      const boardY = localY + stroke.y;
      let erased = false;

      for (let eraserIndex = 0; eraserIndex < eraserPath.length; eraserIndex += 2) {
        const dx = boardX - eraserPath[eraserIndex];
        const dy = boardY - eraserPath[eraserIndex + 1];
        if (dx * dx + dy * dy <= radiusSquared) {
          erased = true;
          changed = true;
          break;
        }
      }

      if (erased) {
        if (current.length >= 4) nextSegments.push(current);
        current = [];
      } else {
        current.push(localX, localY);
      }
    }

    if (current.length >= 4) nextSegments.push(current);
  }

  return changed ? nextSegments : null;
};
