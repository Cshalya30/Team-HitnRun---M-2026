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
const COLOR_HAIRLINE = '#222836';

export const CanvasGraph: React.FC<CanvasGraphProps> = ({
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
  const isBootingRef = useRef(false);

  // RAF render scheduling
  const renderScheduledRef = useRef(false);
  const hoverCheckPendingRef = useRef(false);

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
    const width = rect.width || 900;
    const height = rect.height || 650;

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

    // Filter to guarantee edges and deduplicate undirected (srcId < dstId) for maximum performance
    const links: ForceEdge[] = [];
    for (const e of edges) {
      if (
        e.dstBorrowerId &&
        e.kind === 'guarantee' &&
        e.srcBorrowerId < e.dstBorrowerId &&
        nodeMap.has(e.srcBorrowerId) &&
        nodeMap.has(e.dstBorrowerId)
      ) {
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

    // Create highly-optimized d3-force simulation
    const sim = forceSimulation<ForceNode>(nodes)
      .force(
        'link',
        forceLink<ForceNode, ForceEdge>(links)
          .id(d => d.id)
          .distance(24)
          .strength(0.7)
      )
      .force(
        'charge',
        forceManyBody<ForceNode>()
          .strength(-28)
          .distanceMax(120)
          .theta(0.9)
      )
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<ForceNode>().radius(4.5));

    simulationRef.current = sim;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      sim.alpha(1).alphaDecay(0.04).stop();
      for (let i = 0; i < 50; i++) {
        sim.tick();
        if (sim.alpha() < 0.005) break;
      }
      setSimulationSettled(true);
      bootPhaseRef.current = 'done';
      isBootingRef.current = false;
      if (onBootComplete) onBootComplete();
      return () => sim.stop();
    }

    let timer300: ReturnType<typeof setTimeout> | undefined;
    let timer1100: ReturnType<typeof setTimeout> | undefined;
    let timer1300: ReturnType<typeof setTimeout> | undefined;

    if (showBootAnimation && bootPhaseRef.current === 'idle') {
      bootStartTimeRef.current = performance.now();
      bootPhaseRef.current = 'running';
      isBootingRef.current = true;
      setSimulationSettled(false);

      // t=0-300ms: nodes at canvas center
      for (const n of nodes) {
        n.x = width / 2;
        n.y = height / 2;
      }

      sim.stop();

      // t=300ms: simulation runs live
      timer300 = setTimeout(() => {
        sim.alpha(1).alphaDecay(0.022).restart();
      }, 300);

      // t=1100ms: simulation reaches resting alpha
      timer1100 = setTimeout(() => {
        sim.stop();
      }, 1100);

      // t=1300ms: boot complete
      timer1300 = setTimeout(() => {
        bootPhaseRef.current = 'done';
        isBootingRef.current = false;
        setSimulationSettled(true);
        if (onBootComplete) onBootComplete();
      }, 1300);
    } else {
      // Non-boot: settle rapidly within 50 ticks
      sim.alpha(1).alphaDecay(0.04).stop();
      for (let i = 0; i < 50; i++) {
        sim.tick();
        if (sim.alpha() < 0.005) break;
      }
      setSimulationSettled(true);
      bootPhaseRef.current = 'done';
      isBootingRef.current = false;
    }

    return () => {
      sim.stop();
      if (timer300) clearTimeout(timer300);
      if (timer1100) clearTimeout(timer1100);
      if (timer1300) clearTimeout(timer1300);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borrowers, edges, showBootAnimation]);

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

  // ResizeObserver: re-center forces on container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) continue;

        const sim = simulationRef.current;
        if (sim) {
          sim.force('center', forceCenter(width / 2, height / 2));
        }

        if (!hasUserPannedOrZoomed.current) {
          fitToViewport();
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [fitToViewport]);

  // Auto-fit once simulation settles
  useEffect(() => {
    if (simulationSettled && !hasUserPannedOrZoomed.current) {
      const timer = setTimeout(fitToViewport, 30);
      return () => clearTimeout(timer);
    }
  }, [simulationSettled, fitToViewport]);

  // High-visibility focus: when selectedBorrowerId changes, center & zoom smoothly onto target borrower
  useEffect(() => {
    if (!selectedBorrowerId || !simulationSettled) return;
    const targetNode = nodeMapRef.current.get(selectedBorrowerId);
    if (!targetNode || targetNode.x == null || targetNode.y == null) return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const targetScale = 2.4;
    setTransform({
      scale: targetScale,
      x: rect.width / 2 - targetNode.x * targetScale,
      y: rect.height / 2 - targetNode.y * targetScale,
    });
    hasUserPannedOrZoomed.current = true;
  }, [selectedBorrowerId, simulationSettled]);

  // High-performance batched canvas rendering
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

    const isLightMode = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';

    // Canvas Background: Actual Pitch Black (#000000) or Clean White (#FFFFFF)
    ctx.fillStyle = isLightMode ? '#FFFFFF' : '#000000';
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
        attributionEdgeSet.add(`${selectedSnap.sourceBorrowerId}-${selectedBorrowerId}`);
        attributionEdgeSet.add(`${selectedBorrowerId}-${selectedSnap.sourceBorrowerId}`);
      }
      for (let i = 0; i < allEdges.length; i++) {
        const e = allEdges[i];
        if (e.srcId === selectedBorrowerId || e.dstId === selectedBorrowerId) {
          attributionEdgeSet.add(`${e.srcId}-${e.dstId}`);
        }
      }
    }

    const isBooting = isBootingRef.current;
    const elapsed =
      isBooting && bootStartTimeRef.current != null
        ? performance.now() - bootStartTimeRef.current
        : 9999;

    if (isBooting && elapsed < 300) {
      // t=0-300ms: blank canvas
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

    // 1. Batched Edges Rendering (Draws 10,000+ links in exactly 2 GPU draw calls)
    if (edgeBaseOpacity > 0 || selectedBorrowerId) {
      const normalOpacity = selectedBorrowerId ? 0.03 : edgeBaseOpacity;
      const edgeRgb = isLightMode ? '0, 0, 0' : '255, 255, 255';
      ctx.strokeStyle = `rgba(${edgeRgb}, ${normalOpacity.toFixed(3)})`;
      ctx.lineWidth = selectedBorrowerId ? 0.5 : 0.8;
      ctx.beginPath();

      const highlightedEdges: ForceEdge[] = [];

      for (let i = 0; i < allEdges.length; i++) {
        const e = allEdges[i];
        const src = e.source as ForceNode;
        const dst = e.target as ForceNode;
        if (src.x == null || src.y == null || dst.x == null || dst.y == null) continue;

        if (selectedBorrowerId) {
          const edgeKey = `${src.id}-${dst.id}`;
          const edgeKeyReverse = `${dst.id}-${src.id}`;
          if (attributionEdgeSet.has(edgeKey) || attributionEdgeSet.has(edgeKeyReverse)) {
            highlightedEdges.push(e);
            continue;
          }
        }

        ctx.moveTo(src.x, src.y);
        ctx.lineTo(dst.x, dst.y);
      }
      ctx.stroke();

      // Highlighted attribution evidence edges (high contrast white in dark, dark slate in light)
      if (highlightedEdges.length > 0) {
        ctx.strokeStyle = isLightMode ? '#0F172A' : '#FFFFFF';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let i = 0; i < highlightedEdges.length; i++) {
          const e = highlightedEdges[i];
          const src = e.source as ForceNode;
          const dst = e.target as ForceNode;
          if (src.x == null || src.y == null || dst.x == null || dst.y == null) continue;
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(dst.x, dst.y);
        }
        ctx.stroke();
      }
    }

    // 2. Batched Nodes Rendering
    let selectedNode: ForceNode | null = null;
    let originNode: ForceNode | null = null;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.x == null || node.y == null) continue;

      if (node.id === selectedBorrowerId) {
        selectedNode = node;
        continue;
      }
      if (node.id === cascadeOriginBorrowerId) {
        originNode = node;
        continue;
      }

      const snapshot = currentWeekSnapshots.get(node.id);
      const stress = snapshot?.latentStress ?? node.borrower.baselineStress;
      const shareIdio = snapshot?.shareIdio ?? 0.85;
      const shareInduced = snapshot?.shareInduced ?? 0.0;
      const shareCov = snapshot?.shareCovariate ?? 0.15;

      let dominantType: 'idio' | 'induced' | 'covariate' = 'idio';
      if (shareInduced > shareIdio && shareInduced > shareCov) {
        dominantType = 'induced';
      } else if (shareCov > shareIdio && shareCov > shareInduced) {
        dominantType = 'covariate';
      }

      const r = Math.max(2.5, Math.min(8, 2.5 + stress * 5));
      let color = COLOR_IDIO;
      if (dominantType === 'induced') color = COLOR_INDUCED;
      else if (dominantType === 'covariate') color = COLOR_COVARIATE;

      ctx.beginPath();
      if (dominantType === 'induced') {
        const h = r * 1.35;
        ctx.moveTo(node.x, node.y - h);
        ctx.lineTo(node.x + h * 0.95, node.y + h * 0.65);
        ctx.lineTo(node.x - h * 0.95, node.y + h * 0.65);
        ctx.closePath();
      } else if (dominantType === 'covariate') {
        const s = r * 1.5;
        ctx.rect(node.x - s / 2, node.y - s / 2, s, s);
      } else {
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      }

      ctx.fillStyle = color;
      ctx.globalAlpha = Math.min(1.0, 0.5 + stress * 0.5);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      ctx.strokeStyle = COLOR_HAIRLINE;
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }

    // 3. Highlighted Cascade Origin Node (Lakshmi R. b-411)
    if (originNode && originNode.x != null && originNode.y != null && originNode.id !== selectedBorrowerId) {
      const snap = currentWeekSnapshots.get(originNode.id);
      const r = Math.max(6, Math.min(11, 5 + (snap?.latentStress ?? 0.8) * 6));

      // Origin Dashed Halo
      ctx.beginPath();
      ctx.arc(originNode.x, originNode.y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = COLOR_INDUCED;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(originNode.x, originNode.y, r, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_INDUCED;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Floating Origin Callout Pill
      const label = `${originNode.borrower.displayName} (${originNode.id.toUpperCase()}) · Source`;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      const tw = ctx.measureText(label).width;
      const boxW = tw + 14;
      const boxH = 20;
      const boxX = originNode.x - boxW / 2;
      const boxY = originNode.y - r - boxH - 6;

      ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.98)' : 'rgba(0, 0, 0, 0.9)';
      ctx.strokeStyle = COLOR_INDUCED;
      ctx.lineWidth = 1;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = isLightMode ? '#0F172A' : '#FFFFFF';
      ctx.fillText(label, boxX + 7, boxY + 14);
    }

    // 4. Highlighted Selected Borrower (Sunita K. b-413) with Double Ring and prominent floating badge
    if (selectedNode && selectedNode.x != null && selectedNode.y != null) {
      const snap = currentWeekSnapshots.get(selectedNode.id);
      const isInduced = snap?.dominantStressType === 'induced';
      const r = Math.max(7, Math.min(12, 6 + (snap?.latentStress ?? 0.5) * 6));

      // Outer focus glow ring (bright white in dark, dark slate in light)
      ctx.beginPath();
      ctx.arc(selectedNode.x, selectedNode.y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = isLightMode ? '#0F172A' : '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Second soft ring
      ctx.beginPath();
      ctx.arc(selectedNode.x, selectedNode.y, r + 9, 0, Math.PI * 2);
      ctx.strokeStyle = isLightMode ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Node Body
      ctx.beginPath();
      ctx.arc(selectedNode.x, selectedNode.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isInduced ? COLOR_INDUCED : COLOR_IDIO;
      ctx.fill();
      ctx.strokeStyle = isLightMode ? '#0F172A' : '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Prominent Floating Nameplate Badge
      const nameText = `${selectedNode.borrower.displayName} (${selectedNode.id.toUpperCase()})`;
      const subText = snap
        ? `Stress: ${(snap.latentStress * 100).toFixed(0)}% · ${(snap.shareInduced * 100).toFixed(0)}% Induced (from ${snap.sourceBorrowerName || 'Peer'})`
        : 'Selected Borrower';

      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      const w1 = ctx.measureText(nameText).width;
      ctx.font = '10px "Inter", sans-serif';
      const w2 = ctx.measureText(subText).width;
      const badgeW = Math.max(w1, w2) + 20;
      const badgeH = 34;
      const badgeX = selectedNode.x - badgeW / 2;
      const badgeY = selectedNode.y - r - badgeH - 12;

      ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.98)' : 'rgba(0, 0, 0, 0.95)';
      ctx.strokeStyle = isLightMode ? '#0F172A' : '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      // Downward pointer
      ctx.beginPath();
      ctx.moveTo(selectedNode.x - 5, badgeY + badgeH);
      ctx.lineTo(selectedNode.x + 5, badgeY + badgeH);
      ctx.lineTo(selectedNode.x, badgeY + badgeH + 6);
      ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.98)' : 'rgba(0, 0, 0, 0.95)';
      ctx.fill();

      // Badge texts in high-contrast
      ctx.fillStyle = isLightMode ? '#0F172A' : '#FFFFFF';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText(nameText, badgeX + 10, badgeY + 14);

      ctx.fillStyle = isInduced ? COLOR_INDUCED : (isLightMode ? '#475569' : '#E2E8F0');
      ctx.font = '10px "Inter", sans-serif';
      ctx.fillText(subText, badgeX + 10, badgeY + 27);
    }

    ctx.restore();
  }, [transform, currentWeekSnapshots, selectedBorrowerId, cascadeOriginBorrowerId]);

  // Request Render: redraws immediately when state changes or when theme changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    const handleTheme = () => renderCanvas();
    window.addEventListener('themechange', handleTheme);
    return () => window.removeEventListener('themechange', handleTheme);
  }, [renderCanvas]);

  // Animation loop: ONLY active during the 1.3s boot sequence or during active dragging
  useEffect(() => {
    let animId: number;
    const isBooting = isBootingRef.current;
    if (!isBooting) return;

    const loop = () => {
      renderCanvas();
      if (isBootingRef.current) {
        animId = requestAnimationFrame(loop);
      }
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas, simulationSettled]);

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

    // Throttle hover checks using requestAnimationFrame
    if (hoverCheckPendingRef.current) return;
    hoverCheckPendingRef.current = true;

    const clientX = e.clientX;
    const clientY = e.clientY;

    requestAnimationFrame(() => {
      hoverCheckPendingRef.current = false;
      const rect = canvas.getBoundingClientRect();
      const mouseCanvasX = (clientX - rect.left - transform.x) / transform.scale;
      const mouseCanvasY = (clientY - rect.top - transform.y) / transform.scale;

      let found: ForceNode | null = null;
      let minD2 = 225; // 15px hover radius

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
          let screenX = clientX - rect.left + 16;
          let screenY = clientY - rect.top + 16;
          if (screenX + 240 > rect.width) screenX = clientX - rect.left - 250;
          if (screenY + 110 > rect.height) screenY = clientY - rect.top - 120;

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
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    hasUserPannedOrZoomed.current = true;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(4.0, Math.max(0.2, transform.scale * zoomFactor));

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

  // State 1: Loading skeleton
  if (isLoading) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000000',
          borderRadius: 'var(--radius-panel)',
          border: '1px solid var(--hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-1)',
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
          backgroundColor: '#000000',
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
          backgroundColor: '#000000',
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
        backgroundColor: '#000000',
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

      {/* Hover tooltip */}
      {hoveredNode && (
        <div
          style={{
            position: 'absolute',
            left: `${hoveredNode.screenX}px`,
            top: `${hoveredNode.screenY}px`,
            pointerEvents: 'none',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid #FFFFFF',
            borderRadius: 'var(--radius-control)',
            padding: 'var(--space-8) var(--space-12)',
            fontSize: '11px',
            lineHeight: 1.4,
            zIndex: 'var(--z-tooltip)' as unknown as number,
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 16px',
          }}
        >
          <div style={{ fontWeight: 700, color: '#FFFFFF' }}>
            {hoveredNode.node.borrower.displayName} ({hoveredNode.node.id.toUpperCase()})
          </div>
          <div style={{ color: '#CBD5E1', fontSize: '10px' }}>
            {hoveredNode.node.borrower.occupation} · Cycle {hoveredNode.node.borrower.loanCycle}
          </div>
          <div style={{ marginTop: '4px', display: 'flex', gap: 'var(--space-8)' }} className="tabular-num">
            <span
              style={{
                color: hoveredNode.snapshot.latentStress >= 0.35 ? COLOR_INDUCED : '#FFFFFF',
                fontWeight: 600,
              }}
            >
              Stress: {(hoveredNode.snapshot.latentStress * 100).toFixed(1)}%
            </span>
            <span style={{ color: '#94A3B8' }}>
              DPD: {hoveredNode.snapshot.dpd}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
