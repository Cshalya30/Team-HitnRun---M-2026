import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
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
  /** When true, animate the force simulation live (boot sequence). */
  showBootAnimation?: boolean;
  /** Called when boot animation completes. */
  onBootComplete?: () => void;
}

interface ForceNode extends SimulationNodeDatum {
  id: string;
  borrower: Borrower;
}

interface ForceEdge extends SimulationLinkDatum<ForceNode> {
  kind: Edge['kind'];
  weight: number;
  srcId: string;
  dstId: string;
}

const COLOR_IDIO = '#E8C468';
const COLOR_INDUCED = '#E05A6B';
const COLOR_COVARIATE = '#4FA8D8';
const COLOR_FOCUS = '#EAEDF5'; // Neutral ink, NOT purple
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
  showBootAnimation = false,
  onBootComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasUserPannedOrZoomed = useRef(false);

  const nodesRef = useRef<ForceNode[]>([]);
  const nodeMapRef = useRef<Map<string, ForceNode>>(new Map());
  const edgeListRef = useRef<ForceEdge[]>([]);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<ForceNode>> | null>(null);
  const [simulationSettled, setSimulationSettled] = useState(false);
  const bootPhaseRef = useRef<'idle' | 'running' | 'done'>('idle');
  const bootStartTimeRef = useRef<number | null>(null);

  const [hoveredNode, setHoveredNode] = useState<{
    node: ForceNode;
    screenX: number;
    screenY: number;
    snapshot: StressSnapshot;
  } | null>(null);

  // Build force simulation from data
  useEffect(() => {
    const container = containerRef.current;
    if (!container || borrowers.length === 0) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    // Create force nodes
    const nodes: ForceNode[] = borrowers.map(b => ({
      id: b.id,
      borrower: b,
      x: undefined,
      y: undefined,
    }));

    const nodeMap = new Map<string, ForceNode>();
    for (const n of nodes) {
      nodeMap.set(n.id, n);
    }

    // Create force edges (only borrower-to-borrower edges)
    const links: ForceEdge[] = [];
    for (const e of edges) {
      if (e.dstBorrowerId && nodeMap.has(e.srcBorrowerId) && nodeMap.has(e.dstBorrowerId)) {
        links.push({
          source: e.srcBorrowerId,
          target: e.dstBorrowerId,
          kind: e.kind,
          weight: e.weight,
          srcId: e.srcBorrowerId,
          dstId: e.dstBorrowerId,
        });
      }
    }

    nodesRef.current = nodes;
    nodeMapRef.current = nodeMap;
    edgeListRef.current = links;

    // Stop any previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Create d3-force simulation
    const sim = forceSimulation<ForceNode>(nodes)
      .force('link', forceLink<ForceNode, ForceEdge>(links)
        .id(d => d.id)
        .distance(24)
        .strength(0.7))
      .force('charge', forceManyBody<ForceNode>().strength(-40))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<ForceNode>().radius(5));

    simulationRef.current = sim;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      sim.alpha(1).alphaDecay(0.02).stop();
      for (let i = 0; i < 300; i++) {
        sim.tick();
        if (sim.alpha() < 0.001) break;
      }
      setSimulationSettled(true);
      bootPhaseRef.current = 'done';
      if (onBootComplete) onBootComplete();
      return () => sim.stop();
    }

    let timer300: ReturnType<typeof setTimeout> | undefined;
    let timer1100: ReturnType<typeof setTimeout> | undefined;
    let timer1300: ReturnType<typeof setTimeout> | undefined;

    if (showBootAnimation && bootPhaseRef.current === 'idle') {
      bootStartTimeRef.current = performance.now();
      bootPhaseRef.current = 'running';
      setSimulationSettled(false);

      // t=0-300ms: nodes positioned at canvas center
      for (const n of nodes) {
        n.x = width / 2;
        n.y = height / 2;
      }

      sim.stop();

      // t=300ms: simulation runs live
      timer300 = setTimeout(() => {
        sim.alpha(1).alphaDecay(0.018).restart();
      }, 300);

      // t=1100ms: simulation reaches resting alpha
      timer1100 = setTimeout(() => {
        sim.stop();
      }, 1100);

      // t=1300ms: boot complete
      timer1300 = setTimeout(() => {
        bootPhaseRef.current = 'done';
        setSimulationSettled(true);
        if (onBootComplete) onBootComplete();
      }, 1300);
    } else {
      // Non-boot: run to convergence before first paint
      sim.alpha(1).alphaDecay(0.02).stop();
      for (let i = 0; i < 300; i++) {
        sim.tick();
        if (sim.alpha() < 0.001) break;
      }
      setSimulationSettled(true);
      bootPhaseRef.current = 'done';
    }

    return () => {
      sim.stop();
      if (timer300) clearTimeout(timer300);
      if (timer1100) clearTimeout(timer1100);
      if (timer1300) clearTimeout(timer1300);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrowers, edges, showBootAnimation]);

  // ResizeObserver: re-center forces on container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) continue;

        const sim = simulationRef.current;
        if (sim) {
          // Update forceCenter to new dimensions
          sim.force('center', forceCenter(width / 2, height / 2));
          sim.alpha(0.3).restart();
        }

        // Auto-fit if user hasn't panned
        if (!hasUserPannedOrZoomed.current) {
          fitToViewport();
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Viewport auto-fitting
  const fitToViewport = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const nodes = nodesRef.current;
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const nx = n.x ?? 0;
      const ny = n.y ?? 0;
      if (nx < minX) minX = nx;
      if (nx > maxX) maxX = nx;
      if (ny < minY) minY = ny;
      if (ny > maxY) maxY = ny;
    }

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

  // Auto-fit once simulation settles
  useEffect(() => {
    if (simulationSettled && !hasUserPannedOrZoomed.current) {
      const timer = setTimeout(fitToViewport, 50);
      return () => clearTimeout(timer);
    }
  }, [simulationSettled, fitToViewport]);

  // Re-fit when week changes (if not manually panned)
  useEffect(() => {
    if (!hasUserPannedOrZoomed.current && simulationSettled) {
      fitToViewport();
    }
  }, [currentWeek, fitToViewport, simulationSettled]);

  // Canvas render loop
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

    // Deep cockpit background: --surface-1
    ctx.fillStyle = '#12151D';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    const allEdges = edgeListRef.current;
    const nodes = nodesRef.current;

    // Build set of attribution-evidence edges for selected borrower
    const attributionEdgeSet = new Set<string>();
    if (selectedBorrowerId) {
      const selectedSnap = currentWeekSnapshots.get(selectedBorrowerId);
      if (selectedSnap && selectedSnap.sourceBorrowerId) {
        // The direct transmission source is known evidence
        attributionEdgeSet.add(`${selectedSnap.sourceBorrowerId}-${selectedBorrowerId}`);
        attributionEdgeSet.add(`${selectedBorrowerId}-${selectedSnap.sourceBorrowerId}`);
      }
      // Also include all direct guarantee edges as attribution evidence
      for (const e of allEdges) {
        const srcId = typeof e.source === 'string' ? e.source : (e.source as ForceNode).id;
        const tgtId = typeof e.target === 'string' ? e.target : (e.target as ForceNode).id;
        if (e.kind === 'guarantee' && (srcId === selectedBorrowerId || tgtId === selectedBorrowerId)) {
          attributionEdgeSet.add(`${srcId}-${tgtId}`);
        }
      }
    }

    const isBooting = bootPhaseRef.current === 'running';
    const elapsed = isBooting && bootStartTimeRef.current != null ? performance.now() - bootStartTimeRef.current : 9999;

    if (isBooting && elapsed < 300) {
      // t=0-300ms: blank canvas, nodes haven't spawned yet
      ctx.restore();
      return;
    }

    let edgeBaseOpacity = 0.10;
    if (isBooting) {
      if (elapsed < 1100) {
        edgeBaseOpacity = 0;
      } else if (elapsed < 1300) {
        edgeBaseOpacity = ((elapsed - 1100) / 200) * 0.10;
      } else {
        edgeBaseOpacity = 0.10;
      }
    }

    // Render edges
    if (edgeBaseOpacity > 0 || selectedBorrowerId) {
      for (let i = 0; i < allEdges.length; i++) {
        const e = allEdges[i];
        const src = e.source as ForceNode;
        const dst = e.target as ForceNode;
        if (src.x == null || src.y == null || dst.x == null || dst.y == null) continue;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(dst.x, dst.y);

        if (selectedBorrowerId) {
          // Selection mode: attribution edges at 70%, all others at 4%
          const edgeKey = `${src.id}-${dst.id}`;
          const edgeKeyReverse = `${dst.id}-${src.id}`;
          if (attributionEdgeSet.has(edgeKey) || attributionEdgeSet.has(edgeKeyReverse)) {
            ctx.strokeStyle = 'rgba(234, 237, 245, 0.70)';
            ctx.lineWidth = 1.75;
          } else {
            ctx.strokeStyle = 'rgba(108, 118, 137, 0.04)';
            ctx.lineWidth = 0.5;
          }
        } else {
          // Default or boot fade-in
          ctx.strokeStyle = `rgba(167, 175, 194, ${edgeBaseOpacity.toFixed(3)})`;
          ctx.lineWidth = 1.0;
        }
        ctx.stroke();
      }
    }

    // Render nodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.x == null || node.y == null) continue;

      const snapshot = currentWeekSnapshots.get(node.id);
      const isSelected = node.id === selectedBorrowerId;
      const isOrigin = node.id === cascadeOriginBorrowerId;

      const stress = snapshot?.latentStress ?? node.borrower.baselineStress;
      const shareIdio = snapshot?.shareIdio ?? 0.85;
      const shareInduced = snapshot?.shareInduced ?? 0.0;
      const shareCov = snapshot?.shareCovariate ?? 0.15;

      // Determine dominant type
      let dominantType: 'idio' | 'induced' | 'covariate' = 'idio';
      if (shareInduced > shareIdio && shareInduced > shareCov) {
        dominantType = 'induced';
      } else if (shareCov > shareIdio && shareCov > shareInduced) {
        dominantType = 'covariate';
      }

      // Radius: 3px minimum, scaled up to 9px by latent stress
      const r = Math.max(3, Math.min(9, 3 + stress * 6));

      // Semantic colour
      let color = COLOR_IDIO;
      if (dominantType === 'induced') color = COLOR_INDUCED;
      else if (dominantType === 'covariate') color = COLOR_COVARIATE;

      ctx.save();
      ctx.translate(node.x, node.y);

      ctx.beginPath();
      if (dominantType === 'induced') {
        // Equilateral triangle
        const h = r * 1.35;
        ctx.moveTo(0, -h);
        ctx.lineTo(h * 0.95, h * 0.65);
        ctx.lineTo(-h * 0.95, h * 0.65);
        ctx.closePath();
      } else if (dominantType === 'covariate') {
        // Rounded square
        const s = r * 1.5;
        ctx.rect(-s / 2, -s / 2, s, s);
      } else {
        // Circle
        ctx.arc(0, 0, r, 0, Math.PI * 2);
      }

      // Node fill
      const fillAlpha = Math.min(1.0, 0.55 + stress * 0.45);
      ctx.fillStyle = color;
      ctx.globalAlpha = fillAlpha;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Hairline border
      ctx.strokeStyle = COLOR_HAIRLINE;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Selected node: neutral focus ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = COLOR_FOCUS;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Cascade origin halo
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
    }

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

  // Pan and zoom interaction handlers
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

    let found: ForceNode | null = null;
    let minD2 = 256; // 16px hover radius

    const nodes = nodesRef.current;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.x == null || node.y == null) continue;
      const dx = node.x - mouseCanvasX;
      const dy = node.y - mouseCanvasY;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD2) {
        minD2 = d2;
        found = node;
      }
    }

    if (found) {
      const snap = currentWeekSnapshots.get(found.id);
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

    let closest: ForceNode | null = null;
    let minDistance = 256;

    const nodes = nodesRef.current;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.x == null || node.y == null) continue;
      const dx = node.x - clickCanvasX;
      const dy = node.y - clickCanvasY;
      const dist = dx * dx + dy * dy;
      if (dist < minDistance) {
        minDistance = dist;
        closest = node;
      }
    }

    if (closest) {
      onSelectBorrower(closest.id);
    }
  };

  // State 1: Loading skeleton (no shimmer)
  if (isLoading) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#12151D',
          borderRadius: 'var(--radius-panel)',
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

  // State 2: Error state
  if (hasError) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#12151D',
          borderRadius: 'var(--radius-panel)',
          border: '1px solid var(--danger)',
          padding: 'var(--space-24)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-12)',
        }}
      >
        <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 600 }}>
          Canvas Initialization Failed
        </div>
        <div style={{ color: 'var(--ink-1)', fontSize: '12px' }}>
          The force simulation could not initialize with the current dataset.
        </div>
      </div>
    );
  }

  // State 3: Empty filter
  if (emptyFilterMessage) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#12151D',
          borderRadius: 'var(--radius-panel)',
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

  // State 4: Interactive canvas
  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 'var(--radius-panel)',
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

      {/* Top left legend and reset view control */}
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
          zIndex: 'var(--z-panel)' as unknown as number,
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

      {/* Hover tooltip */}
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
            zIndex: 'var(--z-tooltip)' as unknown as number,
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
