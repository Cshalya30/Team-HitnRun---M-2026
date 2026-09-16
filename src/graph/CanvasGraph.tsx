import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Borrower,
  Centre,
  Edge,
  JLG,
  StressSnapshot,
  Ward,
} from '../engine/types';

interface CanvasGraphProps {
  wards: Ward[];
  centres: Centre[];
  jlgs: JLG[];
  borrowers: Borrower[];
  edges: Edge[];
  currentWeekSnapshots: Map<string, StressSnapshot>;
  selectedBorrowerId: string | null;
  onSelectBorrower: (id: string) => void;
  cascadeOriginBorrowerId: string | null;
  isLoading?: boolean;
  hasError?: boolean;
  emptyFilterMessage?: string | null;
  onClearFilter?: () => void;
  currentWeek?: number;
}

interface NodeLayout {
  id: string;
  x: number;
  y: number;
  borrower: Borrower;
}

const COLOR_IDIO = '#E8C468';
const COLOR_INDUCED = '#E05A6B';
const COLOR_COVARIATE = '#4FA8D8';
const COLOR_FOCUS = '#8B7CFF';
const COLOR_HAIRLINE = '#242B3A';

export const CanvasGraph: React.FC<CanvasGraphProps> = ({
  wards,
  centres,
  jlgs,
  borrowers,
  edges,
  currentWeekSnapshots,
  selectedBorrowerId,
  onSelectBorrower,
  cascadeOriginBorrowerId,
  isLoading = false,
  hasError = false,
  emptyFilterMessage = null,
  onClearFilter,
  currentWeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasUserPannedOrZoomed = useRef(false);

  const nodesRef = useRef<Map<string, NodeLayout>>(new Map());
  const boundsRef = useRef({ minX: 0, minY: 0, maxX: 1200, maxY: 800 });
  const edgeListRef = useRef<Array<{ src: NodeLayout; dst: NodeLayout; kind: Edge['kind']; weight: number }>>([]);

  const [hoveredNode, setHoveredNode] = useState<{
    node: NodeLayout;
    screenX: number;
    screenY: number;
    snapshot: StressSnapshot;
  } | null>(null);

  // 1. Data-bound Node Layout Generation (425 distinct nodes in cluster topology)
  useEffect(() => {
    const nodeMap = new Map<string, NodeLayout>();

    // Space wards evenly in 2x2 quadrants to fill canvas viewport naturally
    const wardCenters: Record<string, { cx: number; cy: number }> = {
      'w-01': { cx: 320, cy: 240 }, // Dharavi East (Top-Left)
      'w-02': { cx: 880, cy: 240 }, // Kurla West (Top-Right)
      'w-03': { cx: 320, cy: 620 }, // Govandi North (Bottom-Left)
      'w-04': { cx: 880, cy: 620 }, // Chembur South (Bottom-Right)
    };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    wards.forEach(ward => {
      const wCenter = wardCenters[ward.id] || { cx: 600, cy: 400 };
      const wardCentres = centres.filter(c => c.wardId === ward.id);

      wardCentres.forEach((centre, cIdx) => {
        // Distribute 6 centres in an ellipse around ward center
        const cAngle = (cIdx / wardCentres.length) * Math.PI * 2 - Math.PI / 2;
        const cX = wCenter.cx + Math.cos(cAngle) * 165;
        const cY = wCenter.cy + Math.sin(cAngle) * 115;

        const centreJlgs = jlgs.filter(j => j.centreId === centre.id);
        centreJlgs.forEach((jlg, jIdx) => {
          // Distribute JLGs around each centre
          const jAngle = (jIdx / centreJlgs.length) * Math.PI * 2;
          const jX = cX + Math.cos(jAngle) * 44;
          const jY = cY + Math.sin(jAngle) * 44;

          // 5 borrowers per JLG arranged in a distinct ring (radius 18px)
          const members = borrowers.filter(b => b.jlgId === jlg.id);
          members.forEach((borrower, mIdx) => {
            const mAngle = (mIdx / members.length) * Math.PI * 2 - Math.PI / 2;
            const bX = jX + Math.cos(mAngle) * 18;
            const bY = jY + Math.sin(mAngle) * 18;

            if (bX < minX) minX = bX;
            if (bX > maxX) maxX = bX;
            if (bY < minY) minY = bY;
            if (bY > maxY) maxY = bY;

            nodeMap.set(borrower.id, {
              id: borrower.id,
              x: bX,
              y: bY,
              borrower,
            });
          });
        });
      });
    });

    nodesRef.current = nodeMap;
    boundsRef.current = { minX, minY, maxX, maxY };

    // Resolve Guarantee Edges
    const resolvedEdges: Array<{ src: NodeLayout; dst: NodeLayout; kind: Edge['kind']; weight: number }> = [];
    edges.forEach(e => {
      if (e.dstBorrowerId) {
        const src = nodeMap.get(e.srcBorrowerId);
        const dst = nodeMap.get(e.dstBorrowerId);
        if (src && dst) {
          resolvedEdges.push({ src, dst, kind: e.kind, weight: e.weight });
        }
      }
    });
    edgeListRef.current = resolvedEdges;
  }, [wards, centres, jlgs, borrowers, edges]);

  // 2. Viewport Auto-Fitting (Part 4 of bugfix: 40px padding, no dead space)
  const fitToViewport = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const { minX, minY, maxX, maxY } = boundsRef.current;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    if (contentW <= 0 || contentH <= 0) return;

    const padding = 40;
    const scale = Math.min(
      (rect.width - padding * 2) / contentW,
      (rect.height - padding * 2) / contentH
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      scale,
      x: rect.width / 2 - centerX * scale,
      y: rect.height / 2 - centerY * scale,
    });
    hasUserPannedOrZoomed.current = false;
  }, []);

  // Auto-fit on initial mount, window resize, and when week changes (if not panned)
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToViewport();
    }, 50);
    return () => clearTimeout(timer);
  }, [fitToViewport]);

  useEffect(() => {
    if (!hasUserPannedOrZoomed.current) {
      fitToViewport();
    }
  }, [currentWeek, fitToViewport]);

  // 3. Render Canvas (60fps, crisp DPI)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Deep cockpit background: #12151D (--surface-1)
    ctx.fillStyle = '#12151D';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // 3.1 Guarantee Edges (Part 3: 8-15% default, 60%+ along selected borrower path)
    const allEdges = edgeListRef.current;
    for (let i = 0; i < allEdges.length; i++) {
      const { src, dst, kind } = allEdges[i];
      const isConnectedToSelected = selectedBorrowerId && (src.id === selectedBorrowerId || dst.id === selectedBorrowerId);

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(dst.x, dst.y);

      if (isConnectedToSelected) {
        // Boost opacity to 85%+ on edges connected to selected borrower
        ctx.strokeStyle = 'rgba(234, 237, 245, 0.85)';
        ctx.lineWidth = 1.75;
      } else if (kind === 'guarantee') {
        // Default guarantee edge: 12% opacity hairline
        ctx.strokeStyle = 'rgba(167, 175, 194, 0.12)';
        ctx.lineWidth = 1.0;
      } else {
        // Subtle income & social cross-group ties
        ctx.strokeStyle = 'rgba(108, 118, 137, 0.04)';
        ctx.lineWidth = 0.5;
      }
      ctx.stroke();
    }

    // 3.2 Borrowers (Part 2: 425 data-bound nodes, min radius 3px to 9px by stress, circle/triangle/square)
    nodesRef.current.forEach(node => {
      const snapshot = currentWeekSnapshots.get(node.id);
      const isSelected = node.id === selectedBorrowerId;
      const isOrigin = node.id === cascadeOriginBorrowerId;

      const stress = snapshot?.latentStress ?? node.borrower.baselineStress;
      const shareIdio = snapshot?.shareIdio ?? 0.85;
      const shareInduced = snapshot?.shareInduced ?? 0.0;
      const shareCov = snapshot?.shareCovariate ?? 0.15;

      // Determine Dominant Shape
      let dominantType: 'idio' | 'induced' | 'covariate' = 'idio';
      if (shareInduced > shareIdio && shareInduced > shareCov) {
        dominantType = 'induced';
      } else if (shareCov > shareIdio && shareCov > shareInduced) {
        dominantType = 'covariate';
      }

      // Radius: strictly minimum 3px, scaled up to 9px by latent stress
      const r = Math.max(3, Math.min(9, 3 + stress * 6));

      // Semantic Color Selection
      let color = COLOR_IDIO;
      if (dominantType === 'induced') color = COLOR_INDUCED;
      else if (dominantType === 'covariate') color = COLOR_COVARIATE;

      ctx.save();
      ctx.translate(node.x, node.y);

      ctx.beginPath();
      if (dominantType === 'induced') {
        // Equilateral triangle (▲)
        const h = r * 1.35;
        ctx.moveTo(0, -h);
        ctx.lineTo(h * 0.95, h * 0.65);
        ctx.lineTo(-h * 0.95, h * 0.65);
        ctx.closePath();
      } else if (dominantType === 'covariate') {
        // Rounded square (■)
        const s = r * 1.5;
        ctx.rect(-s / 2, -s / 2, s, s);
      } else {
        // Circle (●)
        ctx.arc(0, 0, r, 0, Math.PI * 2);
      }

      // Fully visible node fill (minimum 0.55 opacity even when calm, 1.0 when stressed)
      const fillAlpha = Math.min(1.0, 0.55 + stress * 0.45);
      ctx.fillStyle = color;
      ctx.globalAlpha = fillAlpha;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Hairline border
      ctx.strokeStyle = COLOR_HAIRLINE;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Selected Node: Persistent Ring in --focus (#8B7CFF), never a color change
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = COLOR_FOCUS;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Cascade Origin Halo if applicable
      if (isOrigin) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
        ctx.strokeStyle = COLOR_INDUCED;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    });

    ctx.restore();
  }, [transform, currentWeekSnapshots, selectedBorrowerId, cascadeOriginBorrowerId]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderCanvas();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas]);

  // Pan and Zoom Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingRef.current) {
      hasUserPannedOrZoomed.current = true;
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      }));
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseCanvasX = (e.clientX - rect.left - transform.x) / transform.scale;
    const mouseCanvasY = (e.clientY - rect.top - transform.y) / transform.scale;

    let found: NodeLayout | null = null;
    let minD2 = 256; // 16px hover radius

    nodesRef.current.forEach(node => {
      const dx = node.x - mouseCanvasX;
      const dy = node.y - mouseCanvasY;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD2) {
        minD2 = d2;
        found = node;
      }
    });

    if (found) {
      const snap = currentWeekSnapshots.get((found as NodeLayout).id);
      if (snap) {
        let screenX = e.clientX - rect.left + 16;
        let screenY = e.clientY - rect.top + 16;
        if (screenX + 220 > rect.width) screenX = e.clientX - rect.left - 230;
        if (screenY + 100 > rect.height) screenY = e.clientY - rect.top - 110;

        setHoveredNode({
          node: found,
          screenX,
          screenY,
          snapshot: snap,
        });
      }
    } else {
      setHoveredNode(null);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    hasUserPannedOrZoomed.current = true;
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(3.5, Math.max(0.25, transform.scale * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform(prev => ({
      scale: newScale,
      x: mouseX - (mouseX - prev.x) * (newScale / prev.scale),
      y: mouseY - (mouseY - prev.y) * (newScale / prev.scale),
    }));
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickCanvasX = (e.clientX - rect.left - transform.x) / transform.scale;
    const clickCanvasY = (e.clientY - rect.top - transform.y) / transform.scale;

    let closest: NodeLayout | null = null;
    let minDistance = 256;

    nodesRef.current.forEach(node => {
      const dx = node.x - clickCanvasX;
      const dy = node.y - clickCanvasY;
      const dist = dx * dx + dy * dy;
      if (dist < minDistance) {
        minDistance = dist;
        closest = node;
      }
    });

    if (closest) {
      onSelectBorrower((closest as NodeLayout).id);
    }
  };

  // State 1: Loading Skeleton (no shimmer)
  if (isLoading) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#12151D',
          borderRadius: 'var(--radius-table)',
          border: '1px solid var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-2)',
          fontSize: '12px',
        }}
      >
        Initializing network canvas topology...
      </div>
    );
  }

  // State 2: Error State
  if (hasError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#12151D',
          borderRadius: 'var(--radius-table)',
          border: '1px solid var(--danger)',
          padding: 'var(--space-24)',
          overflowY: 'auto',
        }}
      >
        <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Canvas Initialization Failed
        </div>
        <table className="dense-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Borrower</th>
              <th>Ward</th>
            </tr>
          </thead>
          <tbody>
            {borrowers.slice(0, 10).map(b => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.displayName}</td>
                <td>{b.wardId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // State 3: Empty Filter State
  if (emptyFilterMessage) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#12151D',
          borderRadius: 'var(--radius-table)',
          border: '1px solid var(--hairline)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-12)',
        }}
      >
        <div style={{ color: 'var(--ink-1)', fontSize: '13px' }}>{emptyFilterMessage}</div>
        {onClearFilter && (
          <button className="btn-secondary" onClick={onClearFilter}>
            Clear Filter
          </button>
        )}
      </div>
    );
  }

  // State 4: Interactive Canvas Viewport
  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 'var(--radius-table)',
        border: '1px solid var(--hairline)',
        backgroundColor: '#12151D',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: isDraggingRef.current ? 'grabbing' : 'grab',
        }}
      />

      {/* Top Left Legend & Reset View Control */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--space-12)',
          left: 'var(--space-12)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-8)',
          backgroundColor: 'rgba(18, 21, 29, 0.90)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-control)',
          border: '1px solid var(--hairline)',
          fontSize: '11px',
          zIndex: 'var(--z-panel)' as any,
          userSelect: 'none',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--ink-1)' }}>
          <span style={{ color: COLOR_IDIO, fontSize: '9px' }}>●</span> Idiosyncratic
        </span>
        <span style={{ color: 'var(--hairline)' }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--ink-1)' }}>
          <span style={{ color: COLOR_INDUCED, fontSize: '9px' }}>▲</span> Induced
        </span>
        <span style={{ color: 'var(--hairline)' }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--ink-1)' }}>
          <span style={{ color: COLOR_COVARIATE, fontSize: '9px' }}>■</span> Covariate
        </span>

        <button
          className="btn-ghost"
          onClick={fitToViewport}
          style={{
            marginLeft: 'var(--space-4)',
            height: '20px',
            padding: '0 6px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-control)',
          }}
          title="Reset canvas viewport to fit all nodes"
        >
          Reset View
        </button>
      </div>

      {/* Hover Tooltip (z-index 40) */}
      {hoveredNode && (
        <div
          style={{
            position: 'absolute',
            left: `${hoveredNode.screenX}px`,
            top: `${hoveredNode.screenY}px`,
            pointerEvents: 'none',
            backgroundColor: 'var(--surface-3)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-control)',
            padding: 'var(--space-8) var(--space-12)',
            fontSize: '11px',
            lineHeight: 1.4,
            zIndex: 'var(--z-tooltip)' as any,
            boxShadow: 'rgba(0,0,0,0.2) 0px 2px 10px 0px',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--ink-0)' }}>
            {hoveredNode.node.borrower.displayName} ({hoveredNode.node.id.toUpperCase()})
          </div>
          <div style={{ color: 'var(--ink-1)', fontSize: '10px' }}>
            {hoveredNode.node.borrower.occupation} · Cycle {hoveredNode.node.borrower.loanCycle}
          </div>
          <div style={{ marginTop: '4px', display: 'flex', gap: 'var(--space-8)' }} className="tabular-num">
            <span style={{ color: hoveredNode.snapshot.latentStress >= 0.35 ? 'var(--induced)' : 'var(--ink-0)' }}>
              Stress: {(hoveredNode.snapshot.latentStress * 100).toFixed(1)}%
            </span>
            <span style={{ color: 'var(--ink-2)' }}>
              DPD: {hoveredNode.snapshot.dpd}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
