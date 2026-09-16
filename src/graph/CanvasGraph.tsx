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

const COLOR_IDIO = '#E5B85C';
const COLOR_INDUCED = '#E25563';
const COLOR_COVARIATE = '#489FD1';
const COLOR_SIGNAL = '#3DD68C';
const COLOR_BASE = '#1C202C';
const COLOR_SELECTION = '#FFFFFF';
const COLOR_MUTED = '#586073';

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const nodesRef = useRef<Map<string, NodeLayout>>(new Map());
  const hullsRef = useRef<ClusterHull[]>([]);
  const edgeListRef = useRef<Array<{ src: NodeLayout; dst: NodeLayout; kind: Edge['kind']; weight: number }>>([]);

  const [hoveredNode, setHoveredNode] = useState<{
    node: NodeLayout;
    screenX: number;
    screenY: number;
    snapshot: StressSnapshot;
  } | null>(null);

  // Layout Computation
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
    }
  }, [wards, centres, jlgs, borrowers, edges]);

  // Canvas Render Loop
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

    // Subtle ambient background tone
    ctx.fillStyle = '#08090D';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // 1. Draw Wards and Centres (Clean hairline boundaries, no thick ugly panels)
    hullsRef.current.forEach(hull => {
      if (hull.type === 'ward') {
        ctx.beginPath();
        ctx.arc(hull.cx, hull.cy, hull.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 17, 23, 0.5)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(34, 38, 52, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Minimalist Ward Title
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#41485B';
        ctx.textAlign = 'center';
        ctx.fillText(hull.name.toUpperCase(), hull.cx, hull.cy - hull.radius + 22);
      } else if (hull.type === 'centre') {
        ctx.beginPath();
        ctx.arc(hull.cx, hull.cy, hull.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(34, 38, 52, 0.4)';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      } else if (hull.type === 'jlg') {
        ctx.beginPath();
        ctx.arc(hull.cx, hull.cy, hull.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });

    // 2. Draw Edges
    const edges = edgeListRef.current;
    for (let i = 0; i < edges.length; i++) {
      const { src, dst, kind } = edges[i];
      const isConnectedToSelected = selectedBorrowerId && (src.id === selectedBorrowerId || dst.id === selectedBorrowerId);

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(dst.x, dst.y);

      if (isConnectedToSelected) {
        ctx.strokeStyle = kind === 'guarantee' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(112, 100, 233, 0.5)';
        ctx.lineWidth = 1.2;
      } else if (kind === 'guarantee') {
        ctx.strokeStyle = 'rgba(34, 38, 52, 0.45)';
        ctx.lineWidth = 0.75;
      } else {
        ctx.strokeStyle = 'rgba(34, 38, 52, 0.15)';
        ctx.lineWidth = 0.5;
      }
      ctx.stroke();
    }

    // 3. Draw Nodes with Senior-Designer Precision
    nodesRef.current.forEach(node => {
      const snapshot = currentWeekSnapshots.get(node.id);
      const isSelected = node.id === selectedBorrowerId;
      const isOrigin = node.id === cascadeOriginBorrowerId;
      const stress = snapshot?.latentStress ?? 0.1;
      const dominantType = snapshot?.dominantStressType ?? 'unflagged';

      let nodeColor = COLOR_BASE;
      let strokeColor = '#2B3142';

      if (dominantType === 'idio') {
        nodeColor = COLOR_IDIO;
        strokeColor = 'rgba(229, 184, 92, 0.4)';
      } else if (dominantType === 'induced') {
        nodeColor = COLOR_INDUCED;
        strokeColor = 'rgba(226, 85, 99, 0.4)';
      } else if (dominantType === 'covariate') {
        nodeColor = COLOR_COVARIATE;
        strokeColor = 'rgba(72, 159, 209, 0.4)';
      }

      const r = isSelected ? 8 : dominantType !== 'unflagged' ? 6 : 4;

      ctx.save();
      ctx.translate(node.x, node.y);

      // Subtle ambient glow for stressed nodes
      if (dominantType !== 'unflagged') {
        ctx.beginPath();
        ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = dominantType === 'induced' ? 'rgba(226, 85, 99, 0.15)' : 'rgba(229, 184, 92, 0.15)';
        ctx.fill();
      }

      ctx.beginPath();
      if (dominantType === 'induced') {
        // Crisp Diamond
        ctx.moveTo(0, -r * 1.25);
        ctx.lineTo(r * 1.25, 0);
        ctx.lineTo(0, r * 1.25);
        ctx.lineTo(-r * 1.25, 0);
        ctx.closePath();
      } else if (dominantType === 'covariate') {
        // Crisp Square
        ctx.rect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
      } else {
        // Crisp Circle
        ctx.arc(0, 0, r, 0, Math.PI * 2);
      }

      ctx.fillStyle = nodeColor;
      ctx.fill();

      ctx.strokeStyle = isSelected ? COLOR_SELECTION : strokeColor;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Selection halo
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Cascade Origin Halo
      if (isOrigin) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(226, 85, 99, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
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
      if (dx * dx + dy * dy < 160) {
        found = node;
      }
    });

    if (found) {
      const snap = currentWeekSnapshots.get((found as NodeLayout).id);
      if (snap) {
        let screenX = e.clientX - rect.left + 16;
        let screenY = e.clientY - rect.top + 16;
        if (screenX + 240 > rect.width) screenX = e.clientX - rect.left - 250;
        if (screenY + 140 > rect.height) screenY = e.clientY - rect.top - 150;

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
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(2.8, Math.max(0.4, transform.scale * zoomFactor));

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
      if (dx * dx + dy * dy < 160) {
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
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '520px',
        backgroundColor: '#08090D',
        borderRadius: 'var(--radius-panel)',
        border: '1px solid var(--hairline)',
        overflow: 'hidden',
      }}
      tabIndex={0}
      role="region"
      aria-label="Borrower Contagion Graph"
    >
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

      {/* Floating Minimalist HUD */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(15, 17, 23, 0.8)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--hairline)',
          backdropFilter: 'blur(10px)',
          zIndex: 10,
        }}
      >
        <button
          onClick={handleResetZoom}
          className="btn-control"
          style={{ height: '24px', padding: '0 8px', fontSize: '11px', borderRadius: '999px', border: 'none', background: 'rgba(255,255,255,0.06)' }}
          title="Reset Zoom"
        >
          Reset View
        </button>
        <span style={{ color: 'var(--hairline)' }}>•</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: 'var(--ink-1)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: COLOR_IDIO }} />
            Idiosyncratic
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '7px', height: '7px', backgroundColor: COLOR_INDUCED, transform: 'rotate(45deg)', display: 'inline-block' }} />
            Induced
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '7px', height: '7px', backgroundColor: COLOR_COVARIATE }} />
            Covariate
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2B3142' }} />
            Calm
          </span>
        </div>
      </div>

      {/* Refined Frosted Tooltip */}
      {hoveredNode && (
        <div
          style={{
            position: 'absolute',
            left: `${hoveredNode.screenX}px`,
            top: `${hoveredNode.screenY}px`,
            width: '240px',
            backgroundColor: 'rgba(15, 17, 23, 0.95)',
            border: '1px solid var(--hairline)',
            borderRadius: '8px',
            padding: '12px',
            pointerEvents: 'none',
            zIndex: 20,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 600, color: 'var(--ink-0)', fontSize: '13px' }}>
              {hoveredNode.node.borrower.displayName}
            </span>
            <span
              className="mono-num"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color:
                  hoveredNode.snapshot.dominantStressType === 'induced'
                    ? COLOR_INDUCED
                    : hoveredNode.snapshot.dominantStressType === 'idio'
                    ? COLOR_IDIO
                    : hoveredNode.snapshot.dominantStressType === 'covariate'
                    ? COLOR_COVARIATE
                    : 'var(--ink-1)',
              }}
            >
              {(hoveredNode.snapshot.latentStress * 100).toFixed(0)}%
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-1)', marginTop: '2px' }}>
            {hoveredNode.node.borrower.occupation}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '4px' }}>
            {hoveredNode.node.borrower.jlgId.toUpperCase()} · DPD: {hoveredNode.snapshot.dpd}d
          </div>
          {hoveredNode.snapshot.sourceBorrowerName && (
            <div
              style={{
                fontSize: '11px',
                color: COLOR_INDUCED,
                marginTop: '8px',
                paddingTop: '6px',
                borderTop: '1px solid var(--hairline-subtle)',
              }}
            >
              Induced from {hoveredNode.snapshot.sourceBorrowerName}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
