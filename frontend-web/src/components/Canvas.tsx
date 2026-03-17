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
const NODE_H = 130; // approximate; handles are placed relative to this

/** Pixel offsets (cx,cy) of each handle relative to node top-left */
const HANDLE_OFFSETS: Record<string, { cx: number; cy: number }> = {
    top: { cx: NODE_W / 2, cy: 0 },
    right: { cx: NODE_W, cy: NODE_H / 2 },
    bottom: { cx: NODE_W / 2, cy: NODE_H },
    left: { cx: 0, cy: NODE_H / 2 },
};

const SNAP_RADIUS = 28; // px – how close the cursor must be to snap to a handle

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

    // Drag-move state
    const [dragInfo, setDragInfo] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

    // Connection-draw state
    const [connecting, setConnecting] = useState<{ fromId: string; fromHandle: string } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [snapTarget, setSnapTarget] = useState<{ node: Node; handle: string } | null>(null);

    // Inline-edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<Partial<NodeData>>({});

    const canvasRef = useRef<HTMLDivElement>(null);

    /* ── Data fetch ── */
    const fetchBoardData = useCallback(async () => {
        try {
            const board = await boardAPI.getBoard(boardId);
            setNodes(board.nodes || []);
            setEdges(board.edges || []);
        } catch (err) {
            console.error('Failed to load board', err);
        }
    }, [boardId]);

    useEffect(() => { fetchBoardData(); }, [boardId, refreshKey, fetchBoardData]);

    /* ── Save ── */
    const saveBoard = useCallback(async (newNodes: Node[], newEdges: Edge[]) => {
        try {
            await boardAPI.updateBoard(boardId, { nodes: newNodes, edges: newEdges });
        } catch (err) {
            console.error('Failed to save board', err);
        }
    }, [boardId]);

    /* ── Canvas coords helper ── */
    const toCanvasCoords = (clientX: number, clientY: number) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    /* ─────────── Node drag-move ─────────── */
    const handlePointerDown = (e: React.PointerEvent, id: string) => {
        if (connecting) return;
        // If the click originated on a connection handle, don't start dragging
        if ((e.target as HTMLElement).closest('.conn-handle')) return;
        e.stopPropagation();
        const node = nodes.find(n => n.id === id);
        if (!node) return;
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);
        const rect = target.getBoundingClientRect();
        setDragInfo({ id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
    };

    /* ─────────── Canvas-level pointer move ─────────── */
    const handlePointerMove = (e: React.PointerEvent) => {
        const { x, y } = toCanvasCoords(e.clientX, e.clientY);

        if (connecting) {
            setMousePos({ x, y });
            setSnapTarget(findSnapTarget(nodes, x, y, connecting.fromId));
            return;
        }
        if (!dragInfo) return;
        setNodes(prev => prev.map(n =>
            n.id === dragInfo.id
                ? { ...n, position: { x: x - dragInfo.offsetX, y: y - dragInfo.offsetY } }
                : n
        ));
    };

    /* ─────────── Canvas-level pointer up ─────────── */
    const handlePointerUp = (e: React.PointerEvent) => {
        if (dragInfo) {
            const { x, y } = toCanvasCoords(e.clientX, e.clientY);
            const newNodes = nodes.map(n =>
                n.id === dragInfo.id
                    ? { ...n, position: { x: x - dragInfo.offsetX, y: y - dragInfo.offsetY } }
                    : n
            );
            setDragInfo(null);
            setNodes(newNodes);
            saveBoard(newNodes, edges);
        }
        if (connecting) {
            if (snapTarget) {
                // Snapped to a handle — complete the connection
                completeConnection(snapTarget.node.id, snapTarget.handle);
            } else {
                // Dropped on empty canvas → cancel
                setConnecting(null);
            }
        }
    };

    /* ─────────── HTML5 drop from Toolbar ─────────── */
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('nodeType');
        if (!nodeType) return;
        const { x, y } = toCanvasCoords(e.clientX, e.clientY);
        const newNode: Node = {
            id: uuidv4(),
            type: nodeType,
            position: { x, y },
            data: {
                title: nodeType === 'task' ? 'Yeni Görev' : 'Yeni Not',
                content: 'İçerik...',
                color: nodeType === 'task' ? '#E3F2FD' : '#E8F5E9',
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
        const { x, y } = toCanvasCoords(e.clientX, e.clientY);
        setConnecting({ fromId, fromHandle });
        setMousePos({ x, y });
        setSnapTarget(null);
    };

    const completeConnection = (toId: string, toHandle: string) => {
        if (!connecting || connecting.fromId === toId) { setConnecting(null); return; }
        const exists = edges.find(
            ed => ed.source === connecting.fromId && ed.target === toId &&
                ed.sourceHandle === connecting.fromHandle && ed.targetHandle === toHandle
        );
        if (!exists) {
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

    // Finalise connection when pointer is released over a handle
    const handleHandlePointerUp = (e: React.PointerEvent, toId: string, toHandle: string) => {
        e.stopPropagation();
        if (connecting) completeConnection(toId, toHandle);
    };

    /* ─────────── Delete node ─────────── */
    const deleteNode = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newNodes = nodes.filter(n => n.id !== id);
        const newEdges = edges.filter(ed => ed.source !== id && ed.target !== id);
        setNodes(newNodes);
        setEdges(newEdges);
        saveBoard(newNodes, newEdges);
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
                        const newEdges = edges.filter(ed => ed.id !== edge.id);
                        setEdges(newEdges);
                        saveBoard(nodes, newEdges);
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
        const typeColor = isTask ? '#1565C0' : '#2E7D32';

        return (
            <div
                key={node.id}
                className="canvas-node glass-panel"
                style={{
                    transform: `translate(${node.position?.x || 0}px, ${node.position?.y || 0}px)`,
                    backgroundColor: node.data?.color || '#FFF',
                    zIndex: dragInfo?.id === node.id ? 10 : 1,
                    width: NODE_W,
                    minHeight: NODE_H,
                    boxSizing: 'border-box',
                    cursor: connecting ? 'crosshair' : 'grab',
                    userSelect: 'none',
                }}
                onPointerDown={(e) => handlePointerDown(e, node.id)}
                onDoubleClick={(e) => startEdit(e, node)}
            >
                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: typeColor }}>{typeLabel}</span>
                    <button
                        onClick={(e) => deleteNode(e, node.id)}
                        onPointerDown={e => e.stopPropagation()}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', fontWeight: 'bold', fontSize: '1rem', lineHeight: 1 }}
                    >×</button>
                </div>

                {/* ── Body ── */}
                {isEditing ? (
                    <div onPointerDown={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                            autoFocus
                            value={editDraft.title ?? ''}
                            onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
                            placeholder="Başlık"
                            style={inputStyle}
                        />
                        <textarea
                            value={editDraft.content ?? ''}
                            onChange={e => setEditDraft(d => ({ ...d, content: e.target.value }))}
                            placeholder="İçerik"
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        {isTask && (
                            <input
                                value={editDraft.assignee ?? ''}
                                onChange={e => setEditDraft(d => ({ ...d, assignee: e.target.value }))}
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
                        <div className="node-title" style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
                            {node.data?.title || '(Başlık yok)'}
                        </div>
                        <div className="node-content" style={{ fontSize: '0.8rem', color: '#555', whiteSpace: 'pre-wrap' }}>
                            {node.data?.content || ''}
                        </div>
                        {isTask && node.data?.assignee && (
                            <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#1565C0' }}>
                                👤 {node.data.assignee}
                            </div>
                        )}
                        <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: 4 }}>Düzenlemek için çift tıkla</div>
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
                                // Show handles when hovering node
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

    /* ─────────── Hover-show handles via CSS trick ─────────── */
    // We use a wrapper div with data-nodeid for the CSS hover group
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
            style={{ cursor: connecting ? 'crosshair' : 'default' }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => { if (connecting) setConnecting(null); }}
        >
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
    );
};

/* ─── Inline styles for edit inputs ─────────────────────────── */
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid #ccc',
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
    background: '#eee',
    color: '#333',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
};

export default Canvas;
