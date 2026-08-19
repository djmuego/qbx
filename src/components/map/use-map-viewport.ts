import { useCallback, useEffect, useRef, useState } from 'react';

const PAD = 40;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 4;

export interface MapViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export function useMapViewport(bounds: { lengthM: number; widthM: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState<MapViewportState>({ zoom: 1, panX: 0, panY: 0 });
  const panDrag = useRef<{ startX: number; startY: number; origPanX: number; origPanY: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitPpm = size.w > 0 && size.h > 0
    ? Math.min((size.w - PAD * 2) / Math.max(bounds.lengthM, 0.1), (size.h - PAD * 2) / Math.max(bounds.widthM, 0.1))
    : 72;

  const ppm = fitPpm * viewport.zoom;
  const svgW = PAD * 2 + bounds.lengthM * ppm;
  const svgH = PAD * 2 + bounds.widthM * ppm;

  const fitToRoom = useCallback(() => {
    setViewport({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  const zoomBy = useCallback((delta: number, anchorX?: number, anchorY?: number) => {
    setViewport((v) => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * (delta > 0 ? 1.12 : 0.89)));
      if (anchorX == null || anchorY == null || !containerRef.current) {
        return { ...v, zoom: nextZoom };
      }
      const rect = containerRef.current.getBoundingClientRect();
      const relX = anchorX - rect.left - v.panX;
      const relY = anchorY - rect.top - v.panY;
      const ratio = nextZoom / v.zoom;
      return {
        zoom: nextZoom,
        panX: v.panX - relX * (ratio - 1),
        panY: v.panY - relY * (ratio - 1),
      };
    });
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      zoomBy(-e.deltaY, e.clientX, e.clientY);
    },
    [zoomBy],
  );

  const startPan = useCallback((clientX: number, clientY: number) => {
    panDrag.current = { startX: clientX, startY: clientY, origPanX: viewport.panX, origPanY: viewport.panY };
  }, [viewport.panX, viewport.panY]);

  const movePan = useCallback((clientX: number, clientY: number) => {
    const d = panDrag.current;
    if (!d) return;
    setViewport((v) => ({
      ...v,
      panX: d.origPanX + (clientX - d.startX),
      panY: d.origPanY + (clientY - d.startY),
    }));
  }, []);

  const endPan = useCallback(() => {
    panDrag.current = null;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let lastPinchDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (lastPinchDist > 0) {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const delta = dist - lastPinchDist;
        zoomBy(delta * 0.008, midX, midY);
      }
      lastPinchDist = dist;
    };
    const onTouchEnd = () => {
      lastPinchDist = 0;
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoomBy]);

  return {
    containerRef,
    ppm,
    fitPpm,
    svgW,
    svgH,
    PAD,
    viewport,
    fitToRoom,
    onWheel,
    startPan,
    movePan,
    endPan,
    zoomBy,
  };
}

export { PAD as MAP_VIEWPORT_PAD };
