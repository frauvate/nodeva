import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { boardAPI } from '../services/api';
import type { ToastType } from './Toast';
import './Canvas.css';

/* ─── Types ─────────────────────────────────────────────────── */
interface NodeData {
    title: string;
    content: string;
    color: string;
    assignee?: string;
}

interface Node {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: NodeData;
}

interface Edge {
    id: string;
    source: string;
    sourceHandle: string; // 'top'|'right'|'bottom'|'left'
    target: string;
    targetHandle: string;
}

interface CanvasProps {
    boardId: string;
    refreshKey?: number;
    showToast?: (message: string, type?: ToastType) => void;
}

/* ─── Constants ──────────────────────────────────────────────── */
const NODE_W = 240;
const NODE_H = 130;

const HANDLE_OFFSETS: Record<string, { cx: number; cy: number }> = {
    top: { cx: NODE_W / 2, cy: 0 },
    right: { cx: NODE_W, cy: NODE_H / 2 },
    bottom: { cx: NODE_W / 2, cy: NODE_H },
    left: { cx: 0, cy: NODE_H / 2 },
};

const SNAP_RADIUS = 28;

/* Her renk: { key: CSS değişken adı, label: görünen ad } */
const NODE_COLORS: { key: string; label: string }[] = [
    { key: 'var(--glass-bg)',     label: 'Varsayılan' },
    { key: 'var(--node-blue)',    label: 'Mavi'       },
    { key: 'var(--node-green)',   label: 'Yeşil'      },
    { key: 'var(--node-yellow)',  label: 'Sarı'       },
    { key: 'var(--node-pink)',    label: 'Pembe'      },
    { key: 'var(--node-purple)', label: 'Mor'        },
    { key: 'var(--node-orange)', label: 'Turuncu'    },
];

/* ─── Helpers ────────────────────────────────────────────────── */
function getHandlePos(node: Node, handle: string) {
    const off = HANDLE_OFFSETS[handle] ?? HANDLE_OFFSETS['right'];
    return { x: node.position.x + off.cx, y: node.position.y + off.cy };
}

function findSnapTarget(
    nodes: Node[],
    mouseX: number,
    mouseY: number,
    excludeId: string,
): { node: Node; handle: string } | null {
    for (const node of nodes) {
        if (node.id === excludeId) continue;
        for (const handle of Object.keys(HANDLE_OFFSETS)) {
            const pos = getHandlePos(node, handle);
            const d = Math.hypot(mouseX - pos.x, mouseY - pos.y);
            if (d <= SNAP_RADIUS) return { node, handle };
        }
    }
    return null;
}

/* ─── Component ───────────────────────────────────────────────── */
const Canvas: React.FC<CanvasProps> = ({ boardId, refreshKey }) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    // Viewport State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const viewRef = useRef({ zoom, pan });
    useEffect(() => { viewRef.current = { zoom, pan }; }, [zoom, pan]);

    // Drag-move state
    const [dragInfo, setDragInfo] = useState<{ id: string; startX: number; startY: number; initialNodeX: number; initialNodeY: number } | null>(null);

    // Connection-draw state
    const [connecting, setConnecting] = useState<{ fromId: string; fromHandle: string } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [snapTarget, setSnapTarget] = useState<{ node: Node; handle: string } | null>(null);

    // Inline-edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<Partial<NodeData>>({});

    // Property panel state
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);

    /* ── Save ── */
    const saveBoard = useCallback(async (newNodes: Node[], newEdges: Edge[]) => {
        try {
            await boardAPI.updateBoard(boardId, { nodes: newNodes, edges: newEdges });
        } catch (err) {
            console.error('Failed to save board', err);
        }
    }, [boardId]);

    /* ── Data fetch ── */
    const fetchBoardData = useCallback(async () => {
        try {
            const board = await boardAPI.getBoard(boardId);
            setNodes(board.nodes || []);
            setEdges(board.edges || []);
            setPan({ x: 0, y: 0 }); // reset view on board change
            setZoom(1);
            setHistory([]); // clear history on load
        } catch (err) {
            console.error('Failed to load board', err);
        }
    }, [boardId]);

    useEffect(() => { fetchBoardData(); }, [boardId, refreshKey, fetchBoardData]);

    // History (Undo) state
    const [history, setHistory] = useState<{nodes: Node[], edges: Edge[]}[]>([]);
    const dragSnapshotRef = useRef<{nodes: Node[], edges: Edge[]} | null>(null);

    const pushHistory = useCallback((stateToSave: {nodes: Node[], edges: Edge[]}) => {
        // Deep copy objects to prevent mutation issues
        const clonedState = {
            nodes: stateToSave.nodes.map(n => ({...n, data: {...n.data}, position: {...n.position}})),
            edges: stateToSave.edges.map(e => ({...e}))
        };
        setHistory(prev => [...prev.slice(-19), clonedState]); // keep last 20 steps
    }, []);

    const handleUndo = useCallback(() => {
        setHistory(prev => {
            if (prev.length === 0) return prev;
            const newHistory = [...prev];
            const previousState = newHistory.pop();
            if (previousState) {
                setNodes(previousState.nodes);
                setEdges(previousState.edges);
                saveBoard(previousState.nodes, previousState.edges);
            }
            return newHistory;
        });
    }, [saveBoard]);

    // Ctrl+Z handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                // Don't undo if we are currently typing in an input
                if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                    return;
                }
                e.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo]);


    /* ── Zoom via Wheel ── */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const currentZoom = viewRef.current.zoom;
            const currentPan = viewRef.current.pan;
            
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(Math.max(0.1, currentZoom * zoomFactor), 3);
            
            const rect = canvas.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;

            const newPanX = cursorX - (cursorX - currentPan.x) * (newZoom / currentZoom);
            const newPanY = cursorY - (cursorY - currentPan.y) * (newZoom / currentZoom);

            setZoom(newZoom);
            setPan({ x: newPanX, y: newPanY });
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, []);

    /* ── Canvas coords helper ── */
    const toCanvasCoords = (clientX: number, clientY: number) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { 
            x: (clientX - rect.left - pan.x) / zoom, 
            y: (clientY - rect.top - pan.y) / zoom 
        };
    };

    /* ─────────── Panning ─────────── */
    const handleBackgroundPointerDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('.canvas-node')) return;
        if ((e.target as HTMLElement).closest('.zoom-controls')) return;
        if ((e.target as HTMLElement).closest('.property-panel')) return;
        
        setSelectedNodeId(null);
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    /* ─────────── Node drag-move ─────────── */
    const handlePointerDown = (e: React.PointerEvent, id: string) => {
        if (connecting) return;
        if ((e.target as HTMLElement).closest('.conn-handle')) return;
        e.stopPropagation();
        
        setSelectedNodeId(id);
        
        const node = nodes.find(n => n.id === id);
        if (!node) return;
        
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        // Snapshot before drag
        dragSnapshotRef.current = { nodes, edges };

        const coords = toCanvasCoords(e.clientX, e.clientY);
        setDragInfo({ 
            id, 
            startX: coords.x, 
            startY: coords.y, 
            initialNodeX: node.position.x, 
            initialNodeY: node.position.y 
        });
    };

    /* ─────────── Canvas-level pointer move ─────────── */
    const handlePointerMove = (e: React.PointerEvent) => {
        if (isPanning) {
            setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
            return;
        }

        const coords = toCanvasCoords(e.clientX, e.clientY);

        if (connecting) {
            setMousePos(coords);
            setSnapTarget(findSnapTarget(nodes, coords.x, coords.y, connecting.fromId));
            return;
        }

        if (dragInfo) {
            const dx = coords.x - dragInfo.startX;
            const dy = coords.y - dragInfo.startY;
            setNodes(prev => prev.map(n =>
                n.id === dragInfo.id
                    ? { ...n, position: { x: dragInfo.initialNodeX + dx, y: dragInfo.initialNodeY + dy } }
                    : n
            ));
        }
    };

    /* ─────────── Canvas-level pointer up ─────────── */
    const handlePointerUp = (e: React.PointerEvent) => {
        if (isPanning) {
            setIsPanning(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
            return;
        }
        
        if (dragInfo) {
            const coords = toCanvasCoords(e.clientX, e.clientY);
            const dx = coords.x - dragInfo.startX;
            const dy = coords.y - dragInfo.startY;
            
            // Only push history if it actually moved noticeably
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                if (dragSnapshotRef.current) {
                    pushHistory(dragSnapshotRef.current);
                }
            }
            dragSnapshotRef.current = null;
            
            const newNodes = nodes.map(n =>
                n.id === dragInfo.id
                    ? { ...n, position: { x: dragInfo.initialNodeX + dx, y: dragInfo.initialNodeY + dy } }
                    : n
            );
            setDragInfo(null);
            setNodes(newNodes);
            saveBoard(newNodes, edges);
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(err) {}
        }
        
        if (connecting) {
            if (snapTarget) {
                completeConnection(snapTarget.node.id, snapTarget.handle);
            } else {
                setConnecting(null);
            }
        }
    };

    /* ─────────── HTML5 drop from Toolbar ─────────── */
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('nodeType');
        if (!nodeType) return;
        
        pushHistory({ nodes, edges });
        
        const coords = toCanvasCoords(e.clientX, e.clientY);
        const newNode: Node = {
            id: uuidv4(),
            type: nodeType,
            position: { x: coords.x, y: coords.y },
            data: {
                title: nodeType === 'task' ? 'Yeni Görev' : 'Yeni Not',
                content: 'İçerik...',
                color: nodeType === 'task' ? 'var(--node-blue)' : 'var(--node-green)',
                assignee: '',
            },
        };
        const newNodes = [...nodes, newNode];
        setNodes(newNodes);
        saveBoard(newNodes, edges);
    };

    /* ─────────── Connection handles ─────────── */
    const startConnection = (e: React.PointerEvent, fromId: string, fromHandle: string) => {
        e.stopPropagation();
        e.preventDefault();
        const coords = toCanvasCoords(e.clientX, e.clientY);
        setConnecting({ fromId, fromHandle });
        setMousePos(coords);
        setSnapTarget(null);
    };

    const completeConnection = (toId: string, toHandle: string) => {
        if (!connecting || connecting.fromId === toId) { setConnecting(null); return; }
        const exists = edges.find(
            ed => ed.source === connecting.fromId && ed.target === toId &&
                ed.sourceHandle === connecting.fromHandle && ed.targetHandle === toHandle
        );
        if (!exists) {
            pushHistory({ nodes, edges });
            const newEdge: Edge = {
                id: uuidv4(),
                source: connecting.fromId,
                sourceHandle: connecting.fromHandle,
                target: toId,
                targetHandle: toHandle,
            };
            const newEdges = [...edges, newEdge];
            setEdges(newEdges);
            saveBoard(nodes, newEdges);
        }
        setConnecting(null);
        setSnapTarget(null);
    };

    const handleHandlePointerUp = (e: React.PointerEvent, toId: string, toHandle: string) => {
        e.stopPropagation();
        if (connecting) completeConnection(toId, toHandle);
    };

    /* ─────────── Delete node ─────────── */
    const deleteNode = (e: React.MouseEvent | React.PointerEvent | null, id: string) => {
        if (e) e.stopPropagation();
        if (window.confirm("Bu düğümü silmek istediğinize emin misiniz?")) {
            pushHistory({ nodes, edges });
            const newNodes = nodes.filter(n => n.id !== id);
            const newEdges = edges.filter(ed => ed.source !== id && ed.target !== id);
            setNodes(newNodes);
            setEdges(newEdges);
            saveBoard(newNodes, newEdges);
        }
    };

    /* ─────────── Inline editing ─────────── */
    const startEdit = (e: React.MouseEvent, node: Node) => {
        e.stopPropagation();
        if (connecting) return;
        setEditingId(node.id);
        setEditDraft({ ...node.data });
    };

    const commitEdit = () => {
        if (!editingId) return;
        
        const node = nodes.find(n => n.id === editingId);
        if (node && (node.data.title !== editDraft.title || node.data.content !== editDraft.content || node.data.assignee !== editDraft.assignee)) {
            pushHistory({ nodes, edges });
        }
        
        const newNodes = nodes.map(n =>
            n.id === editingId ? { ...n, data: { ...n.data, ...editDraft } } : n
        );
        setNodes(newNodes);
        saveBoard(newNodes, edges);
        setEditingId(null);
        setEditDraft({});
    };

    const cancelEdit = () => { setEditingId(null); setEditDraft({}); };

    /* ─────────── SVG edge rendering ─────────── */
    const renderEdges = () => edges.map(edge => {
        const src = nodes.find(n => n.id === edge.source);
        const tgt = nodes.find(n => n.id === edge.target);
        if (!src || !tgt) return null;
        const s = getHandlePos(src, edge.sourceHandle || 'right');
        const t = getHandlePos(tgt, edge.targetHandle || 'left');
        const cx = (s.x + t.x) / 2;
        return (
            <g key={edge.id}>
                <path
                    d={`M ${s.x} ${s.y} C ${cx} ${s.y}, ${cx} ${t.y}, ${t.x} ${t.y}`}
                    stroke="#4facfe" strokeWidth="2.5" fill="none"
                    markerEnd="url(#arrowhead)"
                />
                {/* clickable delete zone */}
                <path
                    d={`M ${s.x} ${s.y} C ${cx} ${s.y}, ${cx} ${t.y}, ${t.x} ${t.y}`}
                    stroke="transparent" strokeWidth="12" fill="none"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                        if (window.confirm("Bu bağlantıyı silmek istediğinize emin misiniz?")) {
                            pushHistory({ nodes, edges });
                            const newEdges = edges.filter(ed => ed.id !== edge.id);
                            setEdges(newEdges);
                            saveBoard(nodes, newEdges);
                        }
                    }}
                />
            </g>
        );
    });

    const renderActiveConnection = () => {
        if (!connecting) return null;
        const src = nodes.find(n => n.id === connecting.fromId);
        if (!src) return null;
        const s = getHandlePos(src, connecting.fromHandle);
        const t = snapTarget ? getHandlePos(snapTarget.node, snapTarget.handle) : mousePos;
        const cx = (s.x + t.x) / 2;
        return (
            <path
                d={`M ${s.x} ${s.y} C ${cx} ${s.y}, ${cx} ${t.y}, ${t.x} ${t.y}`}
                stroke={snapTarget ? '#00e676' : '#9c27b0'}
                strokeWidth="2.5" strokeDasharray="6,4" fill="none"
            />
        );
    };

    /* ─────────── Node renderer ─────────── */
    const renderNode = (node: Node) => {
        const isEditing = editingId === node.id;
        const isTask = node.type === 'task';
        const typeLabel = isTask ? '📋 Görev' : '📝 Not';
        const typeColor = isTask ? 'var(--node-text-blue)' : 'var(--node-text-green)';

        // Renk normalizasyonu: eski hex değerlerini CSS değişkenlerine çevir
        const normalizeColor = (c: string) => {
            if (!c || c === 'var(--bg-color)' || c === '#FFFFFF' || c === '#FFF') return 'var(--glass-bg)';
            if (c === '#E3F2FD' || c === 'var(--node-blue)')   return 'var(--node-blue)';
            if (c === '#E8F5E9' || c === 'var(--node-green)')  return 'var(--node-green)';
            if (c === '#FFF9C4' || c === 'var(--node-yellow)') return 'var(--node-yellow)';
            if (c === '#FCE4EC' || c === 'var(--node-pink)')   return 'var(--node-pink)';
            if (c === '#F3E5F5' || c === 'var(--node-purple)') return 'var(--node-purple)';
            if (c === '#FFF3E0' || c === 'var(--node-orange)') return 'var(--node-orange)';
            return c;
        };
        const bgColor = normalizeColor(node.data?.color || '');

        return (
            <div
                key={node.id}
                className="canvas-node glass-panel"
                style={{
                    transform: `translate(${node.position?.x || 0}px, ${node.position?.y || 0}px)`,
                    backgroundColor: bgColor,
                    zIndex: dragInfo?.id === node.id ? 10 : 1,
                    width: NODE_W,
                    minHeight: NODE_H,
                    boxSizing: 'border-box',
                    cursor: connecting ? 'crosshair' : (dragInfo?.id === node.id ? 'grabbing' : 'grab'),
                    userSelect: 'none',
                    border: selectedNodeId === node.id
                        ? '2px solid var(--accent-primary)'
                        : '1px solid var(--glass-border)',
                    boxShadow: selectedNodeId === node.id
                        ? '0 0 0 3px var(--accent-gradient-soft), var(--glass-shadow-node)'
                        : 'var(--glass-shadow-node)',
                }}
                onPointerDown={(e) => handlePointerDown(e, node.id)}
                onDoubleClick={(e) => startEdit(e, node)}
            >
                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: isTask ? 'var(--node-text-blue)' : 'var(--node-text-green)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>{typeLabel}</span>
                    <button
                        onClick={(e) => deleteNode(e, node.id)}
                        onPointerDown={e => e.stopPropagation()}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontSize: '1.1rem',
                            lineHeight: 1,
                            opacity: 0.6,
                            transition: 'opacity 0.15s, color 0.15s',
                            padding: '0 2px',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.6'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                    >×</button>
                </div>

                {/* ── Body ── */}
                {isEditing ? (
                    <div 
                        onPointerDown={e => e.stopPropagation()} 
                        onDoubleClick={e => e.stopPropagation()}
                        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                    >
                        <input
                            autoFocus
                            value={editDraft.title ?? ''}
                            onChange={e => {
                                const val = e.target.value;
                                setEditDraft(d => ({ ...d, title: val }));
                            }}
                            placeholder="Başlık"
                            style={inputStyle}
                        />
                        <textarea
                            value={editDraft.content ?? ''}
                            onChange={e => {
                                const val = e.target.value;
                                setEditDraft(d => ({ ...d, content: val }));
                            }}
                            placeholder="İçerik"
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        {isTask && (
                            <input
                                value={editDraft.assignee ?? ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setEditDraft(d => ({ ...d, assignee: val }));
                                }}
                                placeholder="👤 Atanan kişi"
                                style={inputStyle}
                            />
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={commitEdit} style={saveBtnStyle}>Kaydet</button>
                            <button onClick={cancelEdit} style={cancelBtnStyle}>İptal</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="node-title" style={{
                            fontWeight: 600,
                            marginBottom: 6,
                            fontSize: '0.95rem',
                            color: 'var(--text-primary)',
                            lineHeight: 1.35,
                        }}>
                            {node.data?.title || '(Başlık yok)'}
                        </div>
                        <div className="node-content" style={{
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.5,
                        }}>
                            {node.data?.content || ''}
                        </div>
                        {isTask && node.data?.assignee && (
                            <div style={{
                                marginTop: 8,
                                fontSize: '0.75rem',
                                color: 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}>
                                👤 {node.data.assignee}
                            </div>
                        )}
                        <div style={{
                            fontSize: '0.68rem',
                            color: 'var(--text-muted)',
                            marginTop: 8,
                            opacity: 0.7,
                        }}>Düzenlemek için çift tıkla</div>
                    </div>
                )}

                {/* ── Connection handles ── */}
                {!isEditing && Object.entries(HANDLE_OFFSETS).map(([side, off]) => {
                    const isSnapped = snapTarget?.node.id === node.id && snapTarget?.handle === side;
                    return (
                        <div
                            key={side}
                            className={`conn-handle conn-handle-${side}${isSnapped ? ' snapped' : ''}`}
                            style={{
                                position: 'absolute',
                                left: off.cx - 7,
                                top: off.cy - 7,
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background: isSnapped ? '#00e676' : (connecting ? '#9c27b0' : '#4facfe'),
                                border: '2px solid #fff',
                                boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                                cursor: 'crosshair',
                                zIndex: 20,
                                opacity: connecting || isSnapped ? 1 : 0,
                                transition: 'opacity 0.15s, background 0.15s',
                            }}
                            onMouseEnter={() => {
                                const el = document.querySelectorAll(`[data-nodeid="${node.id}"] .conn-handle`);
                                el.forEach(h => (h as HTMLElement).style.opacity = '1');
                            }}
                            onMouseLeave={() => {
                                if (!connecting) {
                                    const el = document.querySelectorAll(`[data-nodeid="${node.id}"] .conn-handle`);
                                    el.forEach(h => (h as HTMLElement).style.opacity = '0');
                                }
                            }}
                            onPointerDown={(e) => { e.stopPropagation(); startConnection(e, node.id, side); }}
                            onPointerUp={(e) => handleHandlePointerUp(e, node.id, side)}
                        />
                    );
                })}
            </div>
        );
    };

    const wrapNode = (node: Node) => (
        <div
            key={node.id}
            data-nodeid={node.id}
            className="node-wrapper"
            style={{ position: 'absolute', top: 0, left: 0 }}
            onMouseEnter={() => {
                document.querySelectorAll(`[data-nodeid="${node.id}"] .conn-handle-top,
                    [data-nodeid="${node.id}"] .conn-handle-right,
                    [data-nodeid="${node.id}"] .conn-handle-bottom,
                    [data-nodeid="${node.id}"] .conn-handle-left`
                ).forEach(h => (h as HTMLElement).style.opacity = '1');
            }}
            onMouseLeave={() => {
                if (!connecting) {
                    document.querySelectorAll(`[data-nodeid="${node.id}"] .conn-handle-top,
                        [data-nodeid="${node.id}"] .conn-handle-right,
                        [data-nodeid="${node.id}"] .conn-handle-bottom,
                        [data-nodeid="${node.id}"] .conn-handle-left`
                    ).forEach(h => (h as HTMLElement).style.opacity = '0');
                }
            }}
        >
            {renderNode(node)}
        </div>
    );

    /* ─────────── Render ─────────── */
    return (
        <div
            ref={canvasRef}
            className="canvas-container"
            style={{ 
                cursor: connecting ? 'crosshair' : (isPanning ? 'grabbing' : 'default'),
                touchAction: 'none'
            }}
            onPointerDown={handleBackgroundPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => { if (connecting) setConnecting(null); }}
        >
            {/* Background pattern */}
            <div style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                backgroundImage: 'radial-gradient(var(--text-secondary) 1px, transparent 1px)',
                backgroundPosition: `${pan.x}px ${pan.y}px`,
                opacity: 0.15
            }} />

            {/* Transform layer */}
            <div className="canvas-transform" style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0
            }}>
                <svg className="edges-layer" style={{ overflow: 'visible', position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#4facfe" />
                        </marker>
                    </defs>
                    <g style={{ pointerEvents: 'all' }}>
                        {renderEdges()}
                    </g>
                    <g style={{ pointerEvents: 'none' }}>
                        {renderActiveConnection()}
                    </g>
                </svg>

                <div className="nodes-layer">
                    {nodes.map(wrapNode)}
                </div>
            </div>

            {/* Zoom Controls */}
            <div className="zoom-controls" style={{
                position: 'absolute',
                bottom: 24,
                right: 24,
                display: 'flex',
                gap: 8,
                background: 'var(--panel-bg)',
                padding: '4px 8px',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid var(--border-color)',
                alignItems: 'center',
                zIndex: 100
            }}>
                <button onClick={handleUndo} disabled={history.length === 0} style={{ ...ctrlBtnStyle, opacity: history.length === 0 ? 0.4 : 1, marginRight: 4 }} title="Geri Al (Ctrl+Z)">↩ Geri Al</button>
                <div style={{ width: 1, height: 16, background: 'var(--border-color)', marginRight: 4 }} />
                <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} style={ctrlBtnStyle} title="Uzaklaştır">-</button>
                <span style={{ fontSize: '0.8rem', minWidth: 40, textAlign: 'center', color: 'var(--text-primary)', userSelect: 'none' }}>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} style={ctrlBtnStyle} title="Yakınlaştır">+</button>
                <div style={{ width: 1, height: 16, background: 'var(--border-color)', margin: '0 4px' }} />
                <button onClick={() => { setZoom(1); setPan({x: 0, y: 0}); }} style={ctrlBtnStyle} title="Sıfırla">Sıfırla</button>
            </div>

            {/* Property Panel (Right Sidebar) */}
            {selectedNodeId && (
                <div className="property-panel glass-panel" style={{
                    position: 'absolute',
                    top: 80,
                    right: 20,
                    width: 320,
                    maxHeight: 'calc(100vh - 180px)',
                    overflowY: 'auto',
                    padding: 24,
                    zIndex: 150,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    border: '1px solid var(--glass-border)',
                    borderRadius: 16,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.1)'
                }}
                onPointerDown={e => e.stopPropagation()}
                onWheel={e => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Özellikler</h3>
                        <button onClick={() => setSelectedNodeId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>✕</button>
                    </div>

                    {(() => {
                        const selNode = nodes.find(n => n.id === selectedNodeId);
                        if (!selNode) return null;
                        const isTask = selNode.type === 'task';

                        const updateNode = (updates: Partial<NodeData>) => {
                            const newNodes = nodes.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updates } } : n);
                            setNodes(newNodes);
                        };

                        const commitUpdate = () => {
                            // Find current state
                            const currentNodes = nodes.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data } } : n);
                            saveBoard(currentNodes, edges);
                        };

                        return (
                            <>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Başlık</label>
                                    <input
                                        value={selNode.data.title || ''}
                                        onChange={e => updateNode({ title: e.target.value })}
                                        onFocus={() => pushHistory({ nodes, edges })}
                                        onBlur={commitUpdate}
                                        style={{ ...inputStyle, padding: '10px 14px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>İçerik</label>
                                    <textarea
                                        value={selNode.data.content || ''}
                                        onChange={e => updateNode({ content: e.target.value })}
                                        onFocus={() => pushHistory({ nodes, edges })}
                                        onBlur={commitUpdate}
                                        rows={5}
                                        style={{ ...inputStyle, padding: '10px 14px', resize: 'vertical' }}
                                    />
                                </div>
                                {isTask && (
                                    <div>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Atanan Kişi</label>
                                        <input
                                            value={selNode.data.assignee || ''}
                                            onChange={e => updateNode({ assignee: e.target.value })}
                                            onFocus={() => pushHistory({ nodes, edges })}
                                            onBlur={commitUpdate}
                                            style={{ ...inputStyle, padding: '10px 14px' }}
                                        />
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>Renk</label>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        {NODE_COLORS.map(({ key, label }) => {
                                            // Normalize stored color to CSS variable key for comparison
                                            const normalizeStored = (c: string) => {
                                                if (!c || c === 'var(--bg-color)' || c === '#FFFFFF' || c === '#FFF') return 'var(--glass-bg)';
                                                if (c === '#E3F2FD') return 'var(--node-blue)';
                                                if (c === '#E8F5E9') return 'var(--node-green)';
                                                if (c === '#FFF9C4') return 'var(--node-yellow)';
                                                if (c === '#FCE4EC') return 'var(--node-pink)';
                                                if (c === '#F3E5F5') return 'var(--node-purple)';
                                                if (c === '#FFF3E0') return 'var(--node-orange)';
                                                return c;
                                            };
                                            const isActive = normalizeStored(selNode.data.color || '') === key;

                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => {
                                                        pushHistory({ nodes, edges });
                                                        updateNode({ color: key });
                                                        setTimeout(() => saveBoard(
                                                            nodes.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, color: key } } : n),
                                                            edges
                                                        ), 0);
                                                    }}
                                                    title={label}
                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        background: key,
                                                        border: isActive
                                                            ? '2.5px solid var(--accent-primary)'
                                                            : '1.5px solid var(--glass-border)',
                                                        cursor: 'pointer',
                                                        boxShadow: isActive
                                                            ? '0 0 0 3px var(--accent-gradient-soft)'
                                                            : '0 1px 4px rgba(0,0,0,0.1)',
                                                        transition: 'transform 0.12s, box-shadow 0.12s',
                                                        flexShrink: 0,
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                                                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
                                                    onMouseUp={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--glass-border)' }}>
                                    <button 
                                        onClick={(e) => {
                                            setSelectedNodeId(null);
                                            deleteNode(e, selectedNodeId);
                                        }}
                                        style={{ ...cancelBtnStyle, width: '100%', color: '#d32f2f', padding: '10px', fontWeight: 600 }}
                                    >Düğümü Sil</button>
                                </div>
                            </>
                        )
                    })()}
                </div>
            )}
        </div>
    );
};

/* ─── Inline styles ─────────────────────────── */
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid var(--border-color)',
    background: 'var(--bg-color)',
    color: 'var(--text-primary)',
    fontSize: '0.82rem',
    outline: 'none',
    boxSizing: 'border-box',
};

const saveBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '4px',
    background: '#4facfe',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
};

const cancelBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '4px',
    background: 'var(--border-color)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
};

const ctrlBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

export default Canvas;
