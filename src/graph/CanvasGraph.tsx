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
const COLOR_INDUCED = '#F43F5E';
const COLOR_COVARIATE = '#38BDF8';
const COLOR_SIGNAL = '#10B981';
const COLOR_BASE = '#191C26';
const COLOR_SELECTION = '#FFFFFF';

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

  // Animation ticker for active contagion pulse wave
  const animTimeRef = useRef(0);

  // Hierarchical Cluster Layout
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
      }
    }
  }, [selectedBorrowerId]);

  // Render Canvas (60fps)
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

    // Deep obsidian background
    ctx.fillStyle = '#090A0E';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // 1. Subtle High-Tech Dot Matrix Grid
    const dotSpacing = 36;
    const gridStartX = Math.floor((-transform.x / transform.scale) / dotSpacing) * dotSpacing - 36;
    const gridEndX = gridStartX + (width / transform.scale) + 72;
    const gridStartY = Math.floor((-transform.y / transform.scale) / dotSpacing) * dotSpacing - 36;
    const gridEndY = gridStartY + (height / transform.scale) + 72;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let gx = gridStartX; gx <= gridEndX; gx += dotSpacing) {
      for (let gy = gridStartY; gy <= gridEndY; gy += dotSpacing) {
        ctx.fillRect(gx, gy, 1.2, 1.2);
      }
    }

    // 2. Cluster Hulls
    hullsRef.current.forEach(hull => {
      if (hull.type === 'ward') {
        ctx.beginPath();
        ctx.arc(hull.cx, hull.cy, hull.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 17, 24, 0.55)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#4B5366';
        ctx.textAlign = 'center';
        ctx.fillText(hull.name.toUpperCase(), hull.cx, hull.cy - hull.radius + 22);
      } else if (hull.type === 'centre') {
        ctx.beginPath();
        ctx.arc(hull.cx, hull.cy, hull.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }
    });

    // 3. Edges with Dynamic Contagion Flow
    animTimeRef.current += 0.04;
    const timeOffset = (animTimeRef.current * 20) % 30;

    const edges = edgeListRef.current;
    for (let i = 0; i < edges.length; i++) {
      const { src, dst, kind } = edges[i];
      const isConnectedToSelected = selectedBorrowerId && (src.id === selectedBorrowerId || dst.id === selectedBorrowerId);
      const srcSnap = currentWeekSnapshots.get(src.id);
      const dstSnap = currentWeekSnapshots.get(dst.id);
      const hasContagion = (srcSnap?.latentStress ?? 0) > 0.35 && (dstSnap?.shareInduced ?? 0) > 0.3;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(dst.x, dst.y);

      if (isConnectedToSelected) {
        ctx.strokeStyle = kind === 'guarantee' ? '#FFFFFF' : 'rgba(99, 102, 241, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (hasContagion && kind === 'guarantee') {
        // Active contagion flow edge!
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 6]);
        ctx.lineDashOffset = -timeOffset;
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (kind === 'guarantee') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // 4. Nodes with Geometric Styling & Halos
    nodesRef.current.forEach(node => {
      const snapshot = currentWeekSnapshots.get(node.id);
      const isSelected = node.id === selectedBorrowerId;
      const isOrigin = node.id === cascadeOriginBorrowerId;
      const stress = snapshot?.latentStress ?? 0.1;
      const dominantType = snapshot?.dominantStressType ?? 'unflagged';

      let nodeColor = COLOR_BASE;
      let strokeColor = 'rgba(255, 255, 255, 0.12)';

      if (dominantType === 'idio') {
        nodeColor = COLOR_IDIO;
        strokeColor = 'rgba(229, 184, 92, 0.5)';
      } else if (dominantType === 'induced') {
        nodeColor = COLOR_INDUCED;
        strokeColor = 'rgba(244, 63, 94, 0.5)';
      } else if (dominantType === 'covariate') {
        nodeColor = COLOR_COVARIATE;
        strokeColor = 'rgba(56, 189, 248, 0.5)';
      }

      const r = isSelected ? 8 : dominantType !== 'unflagged' ? 6 : 4;

      ctx.save();
      ctx.translate(node.x, node.y);

      // Radial Halo on Stressed Nodes
      if (dominantType !== 'unflagged') {
        ctx.beginPath();
        ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
        ctx.fillStyle = dominantType === 'induced' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(229, 184, 92, 0.2)';
        ctx.fill();
      }

      ctx.beginPath();
      if (dominantType === 'induced') {
        // Diamond
        ctx.moveTo(0, -r * 1.3);
        ctx.lineTo(r * 1.3, 0);
        ctx.lineTo(0, r * 1.3);
        ctx.lineTo(-r * 1.3, 0);
        ctx.closePath();
      } else if (dominantType === 'covariate') {
        // Square
        ctx.rect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
      } else {
        // Circle
        ctx.arc(0, 0, r, 0, Math.PI * 2);
      }

      ctx.fillStyle = nodeColor;
      ctx.fill();

      ctx.strokeStyle = isSelected ? COLOR_SELECTION : strokeColor;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Selection Marker
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Shock Origin Pulse
      if (isOrigin) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 9, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
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
        if (screenX + 250 > rect.width) screenX = e.clientX - rect.left - 260;
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
    const newScale = Math.min(3.2, Math.max(0.35, transform.scale * zoomFactor));

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
        minHeight: '560px',
        backgroundColor: '#090A0E',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
      tabIndex={0}
      role="region"
      aria-label="Contagion Network Map"
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

      {/* Floating Modern HUD */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(14, 16, 23, 0.85)',
          padding: '6px 12px',
          borderRadius: '999px',
          border: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(16px)',
          zIndex: 10,
        }}
      >
        <button
          onClick={handleResetZoom}
          className="btn-action"
          style={{ height: '22px', fontSize: '11px', padding: '0 8px', borderRadius: '999px', border: 'none', background: 'rgba(255,255,255,0.06)' }}
          title="Reset Zoom"
        >
          Reset View
        </button>
        <span style={{ color: 'var(--border-subtle)' }}>•</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: 'var(--text-secondary)' }}>
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
        </div>
      </div>

      {/* Collision-Aware Frosted Tooltip */}
      {hoveredNode && (
        <div
          style={{
            position: 'absolute',
            left: `${hoveredNode.screenX}px`,
            top: `${hoveredNode.screenY}px`,
            width: '240px',
            backgroundColor: 'rgba(14, 16, 23, 0.95)',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px',
            padding: '12px',
            pointerEvents: 'none',
            zIndex: 20,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>
              {hoveredNode.node.borrower.displayName}
            </span>
            <span
              className="font-mono-num"
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
                    : '#fff',
              }}
            >
              {(hoveredNode.snapshot.latentStress * 100).toFixed(0)}%
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {hoveredNode.node.borrower.occupation}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {hoveredNode.node.borrower.jlgId.toUpperCase()} · DPD: {hoveredNode.snapshot.dpd}d
          </div>
          {hoveredNode.snapshot.sourceBorrowerName && (
            <div
              style={{
                fontSize: '11px',
                color: COLOR_INDUCED,
                marginTop: '8px',
                paddingTop: '6px',
                borderTop: '1px solid var(--border-subtle)',
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
