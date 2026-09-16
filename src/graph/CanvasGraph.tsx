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
}

interface NodeLayout {
  id: string;
  x: number;
  y: number;
  radius: number;
  borrower: Borrower;
}

interface ClusterHull {
  name: string;
  type: 'jlg' | 'centre' | 'ward';
  cx: number;
  cy: number;
  radius: number;
}

const COLOR_IDIO = '#E8C468';
const COLOR_INDUCED = '#E05A6B';
const COLOR_COVARIATE = '#4FA8D8';
const COLOR_SIGNAL = '#7BE0B0';
const COLOR_BASE = '#1A1F2B';
const COLOR_FOCUS = '#8B7CFF';
const COLOR_HAIRLINE = '#242B3A';
const COLOR_INK_2 = '#6C7689';

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasPannedOrZoomed = useRef(false);

  const nodesRef = useRef<Map<string, NodeLayout>>(new Map());
  const hullsRef = useRef<ClusterHull[]>([]);
  const edgeListRef = useRef<Array<{ src: NodeLayout; dst: NodeLayout; kind: Edge['kind']; weight: number }>>([]);

  const [hoveredNode, setHoveredNode] = useState<{
    node: NodeLayout;
    screenX: number;
    screenY: number;
    snapshot: StressSnapshot;
  } | null>(null);

  // 1. Cluster Layout Generation (Flower / Ring structures by JLG and Centre)
  useEffect(() => {
    const nodeMap = new Map<string, NodeLayout>();
    const hulls: ClusterHull[] = [];

    const universeWidth = 1400;
    const universeHeight = 900;
    const centerX = universeWidth / 2;
    const centerY = universeHeight / 2;

    const wardOffsets = [
      { x: centerX - 340, y: centerY - 210 },
      { x: centerX + 340, y: centerY - 210 },
      { x: centerX - 340, y: centerY + 210 },
      { x: centerX + 340, y: centerY + 210 },
    ];

    wards.forEach((ward, wIdx) => {
      const wardPos = wardOffsets[wIdx] || { x: centerX, y: centerY };
      hulls.push({
        name: ward.name,
        type: 'ward',
        cx: wardPos.x,
        cy: wardPos.y,
        radius: 295,
      });

      const wardCentres = centres.filter(c => c.wardId === ward.id);
      const centreRadiusX = 185;
      const centreRadiusY = 135;

      wardCentres.forEach((centre, cIdx) => {
        const cAngle = (cIdx / wardCentres.length) * Math.PI * 2 - Math.PI / 2;
        const cX = wardPos.x + Math.cos(cAngle) * centreRadiusX;
        const cY = wardPos.y + Math.sin(cAngle) * centreRadiusY;

        hulls.push({
          name: centre.name,
          type: 'centre',
          cx: cX,
          cy: cY,
          radius: 76,
        });

        const centreJlgs = jlgs.filter(j => j.centreId === centre.id);
        const jlgRadius = 38;

        centreJlgs.forEach((jlg, jIdx) => {
          const jAngle = (jIdx / centreJlgs.length) * Math.PI * 2;
          const jX = cX + Math.cos(jAngle) * jlgRadius;
          const jY = cY + Math.sin(jAngle) * jlgRadius;

          hulls.push({
            name: jlg.name,
            type: 'jlg',
            cx: jX,
            cy: jY,
            radius: 24,
          });

          // Flower ring of 5 borrowers per JLG
          const members = borrowers.filter(b => b.jlgId === jlg.id);
          const memberRadius = 14;

          members.forEach((borrower, mIdx) => {
            const mAngle = (mIdx / members.length) * Math.PI * 2 - Math.PI / 2;
            const bX = jX + Math.cos(mAngle) * memberRadius;
            const bY = jY + Math.sin(mAngle) * memberRadius;

            nodeMap.set(borrower.id, {
              id: borrower.id,
              x: bX,
              y: bY,
              radius: 5,
              borrower,
            });
          });
        });
      });
    });

    nodesRef.current = nodeMap;
    hullsRef.current = hulls;

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

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = rect.width / universeWidth;
      const scaleY = rect.height / universeHeight;
      const initialScale = Math.min(scaleX, scaleY) * 0.96;
      setTransform({
        x: (rect.width - universeWidth * initialScale) / 2,
        y: (rect.height - universeHeight * initialScale) / 2,
        scale: initialScale,
      });
      hasPannedOrZoomed.current = false;
    }
  }, [wards, centres, jlgs, borrowers, edges]);

  // Center on Selected Borrower
  useEffect(() => {
    if (selectedBorrowerId && containerRef.current) {
      const node = nodesRef.current.get(selectedBorrowerId);
      if (node) {
        const rect = containerRef.current.getBoundingClientRect();
        setTransform(prev => ({
          ...prev,
          x: rect.width / 2 - node.x * prev.scale,
          y: rect.height / 2 - node.y * prev.scale,
        }));
        hasPannedOrZoomed.current = true;
      }
    }
  }, [selectedBorrowerId]);

  // 2. Render Canvas (60fps)
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

    // Canvas surface background: #12151D (--surface-1)
    ctx.fillStyle = '#12151D';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // 2.1 Cluster Hulls (flower/ring structure)
    hullsRef.current.forEach(hull => {
      if (hull.type === 'ward') {
        ctx.beginPath();
        ctx.arc(hull.cx, hull.cy, hull.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(11, 13, 18, 0.4)';
        ctx.fill();
        ctx.strokeStyle = COLOR_HAIRLINE;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.fillStyle = COLOR_INK_2;
        ctx.textAlign = 'center';
        ctx.fillText(hull.name.toUpperCase(), hull.cx, hull.cy - hull.radius + 20);
      } else if (hull.type === 'centre') {
        ctx.beginPath();
        ctx.arc(hull.cx, hull.cy, hull.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(36, 43, 58, 0.5)';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      } else if (hull.type === 'jlg') {
        ctx.beginPath();
        ctx.arc(hull.cx, hull.cy, hull.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(36, 43, 58, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });

    // 2.2 Edges
    const edges = edgeListRef.current;
    for (let i = 0; i < edges.length; i++) {
      const { src, dst, kind } = edges[i];
      const isConnectedToSelected = selectedBorrowerId && (src.id === selectedBorrowerId || dst.id === selectedBorrowerId);

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(dst.x, dst.y);

      if (isConnectedToSelected) {
        ctx.strokeStyle = kind === 'guarantee' ? '#EAEDF5' : 'rgba(139, 124, 255, 0.6)';
        ctx.lineWidth = 1.5;
      } else if (kind === 'guarantee') {
        ctx.strokeStyle = 'rgba(36, 43, 58, 0.5)';
        ctx.lineWidth = 0.8;
      } else {
        ctx.strokeStyle = 'rgba(36, 43, 58, 0.2)';
        ctx.lineWidth = 0.5;
      }
      ctx.stroke();
    }

    // 2.3 Nodes: Color + Shape Pairing (Part 5)
    nodesRef.current.forEach(node => {
      const snapshot = currentWeekSnapshots.get(node.id);
      const isSelected = node.id === selectedBorrowerId;
      const isOrigin = node.id === cascadeOriginBorrowerId;
      const stress = snapshot?.latentStress ?? 0.1;
      const dominantType = snapshot?.dominantStressType ?? 'unflagged';

      let nodeColor = COLOR_BASE;
      if (dominantType === 'idio') nodeColor = COLOR_IDIO;
      else if (dominantType === 'induced') nodeColor = COLOR_INDUCED;
      else if (dominantType === 'covariate') nodeColor = COLOR_COVARIATE;

      // Size scaled to stress magnitude (capped between 4px and 9px)
      const r = Math.max(4, Math.min(9, 4 + stress * 5));

      ctx.save();
      ctx.translate(node.x, node.y);

      ctx.beginPath();
      if (dominantType === 'induced') {
        // Triangle (▲) for Induced
        const h = r * 1.3;
        ctx.moveTo(0, -h);
        ctx.lineTo(h, h * 0.7);
        ctx.lineTo(-h, h * 0.7);
        ctx.closePath();
      } else if (dominantType === 'covariate') {
        // Square (■) for Covariate
        ctx.rect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
      } else {
        // Circle (●) for Idiosyncratic or Unflagged
        ctx.arc(0, 0, r, 0, Math.PI * 2);
      }

      ctx.fillStyle = nodeColor;
      ctx.fill();

      // Hairline border
      ctx.strokeStyle = COLOR_HAIRLINE;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Selected Node: Persistent Ring in --focus (#8B7CFF), never a color change!
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = COLOR_FOCUS;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Cascade Origin Halo
      if (isOrigin) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
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

  // Pan and Zoom
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
      hasPannedOrZoomed.current = true;
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
    nodesRef.current.forEach(node => {
      const dx = node.x - mouseCanvasX;
      const dy = node.y - mouseCanvasY;
      if (dx * dx + dy * dy < 144) {
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
    hasPannedOrZoomed.current = true;
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(3.0, Math.max(0.35, transform.scale * zoomFactor));

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
    const mouseCanvasX = (e.clientX - rect.left - transform.x) / transform.scale;
    const mouseCanvasY = (e.clientY - rect.top - transform.y) / transform.scale;

    let selected: NodeLayout | null = null;
    nodesRef.current.forEach(node => {
      const dx = node.x - mouseCanvasX;
      const dy = node.y - mouseCanvasY;
      if (dx * dx + dy * dy < 144) {
        selected = node;
      }
    });

    if (selected) {
      onSelectBorrower((selected as NodeLayout).id);
    }
  };

  const handleResetZoom = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const universeWidth = 1400;
      const universeHeight = 900;
      const scaleX = rect.width / universeWidth;
      const scaleY = rect.height / universeHeight;
      const initialScale = Math.min(scaleX, scaleY) * 0.96;
      setTransform({
        x: (rect.width - universeWidth * initialScale) / 2,
        y: (rect.height - universeHeight * initialScale) / 2,
        scale: initialScale,
      });
      hasPannedOrZoomed.current = false;
    }
  };

  // State 1: Error fallback table (never blank)
  if (hasError) {
    return (
      <div
        className="surface-panel"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '520px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-12)',
          color: 'var(--ink-0)',
        }}
      >
        <div style={{ color: 'var(--danger)', fontWeight: 600 }}>Graph Canvas Initialization Error</div>
        <p style={{ fontSize: '12px', color: 'var(--ink-1)' }}>
          The interactive visualization canvas could not be loaded. Displaying tabular fallback of active portfolio:
        </p>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table className="tremor-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Borrower</th>
                <th>Centre</th>
                <th>Stress Score</th>
              </tr>
            </thead>
            <tbody>
              {borrowers.slice(0, 15).map(b => (
                <tr key={b.id} onClick={() => onSelectBorrower(b.id)} style={{ cursor: 'pointer' }}>
                  <td className="tabular-num">{b.id.toUpperCase()}</td>
                  <td>{b.displayName}</td>
                  <td>{b.centreId}</td>
                  <td className="tabular-num">{((currentWeekSnapshots.get(b.id)?.latentStress ?? 0) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // State 2: Empty Filter State
  if (emptyFilterMessage) {
    return (
      <div
        className="surface-panel"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '520px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
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

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '520px',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-flat)',
        overflow: 'hidden',
        zIndex: 'var(--z-panel)',
      }}
      tabIndex={0}
      role="region"
      aria-label="Contagion Network Map"
      onKeyDown={e => {
        if (!selectedBorrowerId && borrowers.length > 0) {
          onSelectBorrower(borrowers[0].id);
          return;
        }
        const currentIdx = borrowers.findIndex(b => b.id === selectedBorrowerId);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIdx = (currentIdx + 1) % borrowers.length;
          onSelectBorrower(borrowers[nextIdx].id);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIdx = (currentIdx - 1 + borrowers.length) % borrowers.length;
          onSelectBorrower(borrowers[prevIdx].id);
        }
      }}
    >
      {/* Loading Skeleton: static, faded node field, no shimmer (Part 4.3) */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'var(--surface-1)',
            opacity: 0.5,
            zIndex: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: 'var(--ink-2)', fontSize: '12px' }}>Loading network topology...</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {/* Top-Left Legend Row & Reset View Control (Part 4.3 & Part 5) */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--space-12)',
          left: 'var(--space-12)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-12)',
          backgroundColor: 'var(--surface-3)',
          padding: '4px var(--space-8)',
          borderRadius: 'var(--radius-control)',
          border: '1px solid var(--hairline)',
          zIndex: 'var(--z-panel)',
        }}
      >
        <button
          className="btn-secondary"
          onClick={handleResetZoom}
          style={{ height: '24px', padding: '0 var(--space-8)', fontSize: '11px' }}
          title="Reset Zoom"
          aria-label="Reset View"
        >
          Reset View
        </button>

        <span style={{ color: 'var(--hairline)' }}>|</span>

        {/* Text-plus-swatch Legend with Shape Glyphs (Part 5) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-12)', fontSize: '11px', color: 'var(--ink-1)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: COLOR_IDIO, fontSize: '12px' }}>●</span>
            Idiosyncratic
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: COLOR_INDUCED, fontSize: '10px' }}>▲</span>
            Induced
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: COLOR_COVARIATE, fontSize: '10px' }}>■</span>
            Covariate
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--ink-2)', fontSize: '12px' }}>●</span>
            Unflagged
          </span>
        </div>
      </div>

      {/* Lightweight Hover Tooltip (Part 4.3) */}
      {hoveredNode && (
        <div
          style={{
            position: 'absolute',
            left: `${hoveredNode.screenX}px`,
            top: `${hoveredNode.screenY}px`,
            width: '210px',
            backgroundColor: 'var(--surface-3)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-control)',
            padding: 'var(--space-8)',
            pointerEvents: 'none',
            zIndex: 'var(--z-tooltip)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 500, color: 'var(--ink-0)', fontSize: '12px' }}>
              {hoveredNode.node.borrower.displayName}
            </span>
            <span className="tabular-num" style={{ fontSize: '11px', color: 'var(--ink-0)', fontWeight: 600 }}>
              {(hoveredNode.snapshot.latentStress * 100).toFixed(1)}%
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-1)', marginTop: '2px' }}>
            {hoveredNode.node.borrower.jlgId.toUpperCase()} · {hoveredNode.node.borrower.occupation}
          </div>
        </div>
      )}
    </div>
  );
};
