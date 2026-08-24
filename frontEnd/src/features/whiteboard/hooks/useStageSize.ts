import { useEffect, useState, type RefObject } from "react";

export type StageSize = {
  width: number;
  height: number;
};

export function useStageSize(containerRef: RefObject<HTMLDivElement | null>) {
  const [stageSize, setStageSize] = useState<StageSize>({ width: 900, height: 620 });

  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      setStageSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  return stageSize;
}
