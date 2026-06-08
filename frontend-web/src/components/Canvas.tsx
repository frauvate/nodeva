import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { boardAPI } from '../services/api';
import type { ToastType } from './Toast';
import AssigneeSelector from './AssigneeSelector';
import './Canvas.css';

/* ─── Types ─────────────────────────────────────────────────── */
type TaskStatus = 'todo' | 'in_progress' | 'done';

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string }> = {
    todo:        { label: 'Başlamadı',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
    in_progress: { label: 'Devam Ediyor', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    done:        { label: 'Bitti',         color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
};

interface NodeData {
    title: string;
    content: string;
    color: string;
    assignee?: string;
    status?: TaskStatus;
    startDate?: string;
    endDate?: string;
    progress?: number;
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
    currentUserEmail?: string;
    onInviteUser?: (email: string) => void;
    sidebarOpen?: boolean;
}

/* ─── Constants ──────────────────────────────────────────────── */
const NODE_W = 240;
const NODE_H = 130;

const HANDLE_SIDES = ['top', 'right', 'bottom', 'left'];

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
function getNodeSize(nodeType: string) {
    let w = NODE_W;
    let h = NODE_H;

    if (nodeType === 'flow_decision') {
        w = 140;
        h = 140;
    } else if (nodeType === 'flow_data') {
        w = 160;
        h = 130;
    } else if (nodeType === 'mindmap_root') {
        w = 200;
        h = 70;
    } else if (nodeType === 'mindmap_main') {
        w = 180;
        h = 65;
    } else if (nodeType === 'mindmap_sub') {
        w = 150;
        h = 40;
    }
    
    return { width: w, height: h };
}

function getHandlePos(node: Node, handle: string) {
    const { width, height } = getNodeSize(node.type);
    let cx = width / 2;
    let cy = height / 2;

    if (handle === 'top') {
        cx = width / 2;
        cy = 0;
    } else if (handle === 'right') {
        cx = width;
        cy = height / 2;
    } else if (handle === 'bottom') {
        cx = width / 2;
        cy = height;
    } else if (handle === 'left') {
        cx = 0;
        cy = height / 2;
    }

    return { x: node.position.x + cx, y: node.position.y + cy };
}

function findSnapTarget(
    nodes: Node[],
    mouseX: number,
    mouseY: number,
    excludeId: string,
): { node: Node; handle: string } | null {
    for (const node of nodes) {
        if (node.id === excludeId) continue;
        for (const handle of HANDLE_SIDES) {
            const pos = getHandlePos(node, handle);
            const d = Math.hypot(mouseX - pos.x, mouseY - pos.y);
            if (d <= SNAP_RADIUS) return { node, handle };
        }
    }
    return null;
}

function parseDate(dStr?: string) {
    if (!dStr) return null;
    const parts = dStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

/* ─── Component ───────────────────────────────────────────────── */
const Canvas: React.FC<CanvasProps> = ({ boardId, refreshKey, showToast: _showToast, currentUserEmail = '', onInviteUser, sidebarOpen = true }) => {
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

    // Property panel state
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [boardTemplate, setBoardTemplate] = useState<string>('basic');

    // Gantt dragging & resizing state
    const [ganttDrag, setGanttDrag] = useState<{
        nodeId: string;
        mode: 'move' | 'resize-start' | 'resize-end';
        startX: number;
        initialStartDate: string;
        initialEndDate: string;
    } | null>(null);

    // Gantt month & zoom state
    const [ganttYear, setGanttYear] = useState<number>(2026);
    const [ganttMonth, setGanttMonth] = useState<number>(5); // 0-indexed, 5 = June
    const [ganttColumnWidth, setGanttColumnWidth] = useState<number>(40);

    const handlePrevMonth = () => {
        setGanttMonth(prev => {
            if (prev === 0) {
                setGanttYear(y => y - 1);
                return 11;
            }
            return prev - 1;
        });
    };

    const handleNextMonth = () => {
        setGanttMonth(prev => {
            if (prev === 11) {
                setGanttYear(y => y + 1);
                return 0;
            }
            return prev + 1;
        });
    };

    const getMonthName = (monthIndex: number) => {
        const monthNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        return monthNames[monthIndex];
    };

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
            setBoardTemplate(board.template || 'basic');
            setPan({ x: 0, y: 0 }); // reset view on board change
            setZoom(1);
            setHistory([]); // clear history on load
        } catch (err) {
            console.error('Failed to load board', err);
        }
    }, [boardId]);

    useEffect(() => { fetchBoardData(); }, [boardId, refreshKey, fetchBoardData]);

    // Auto deselect if node is not visible in current month selection
    useEffect(() => {
        if (selectedNodeId && boardTemplate === 'timeline') {
            const selNode = nodes.find(n => n.id === selectedNodeId);
            if (selNode) {
                const start = parseDate(selNode.data.startDate);
                const end = parseDate(selNode.data.endDate);
                if (start && end) {
                    const nextMonth = ganttMonth === 11 ? 0 : ganttMonth + 1;
                    const nextMonthYear = ganttMonth === 11 ? ganttYear + 1 : ganttYear;
                    const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
                    const timelineStart = new Date(ganttYear, ganttMonth, 1);
                    const timelineEnd = new Date(nextMonthYear, nextMonth, daysInNextMonth, 23, 59, 59);
                    const isVisible = start <= timelineEnd && end >= timelineStart;
                    if (!isVisible) {
                        setSelectedNodeId(null);
                    }
                }
            }
        }
    }, [ganttMonth, ganttYear, nodes, selectedNodeId, boardTemplate]);

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

    /* ─────────── Gantt Drag & Resize ─────────── */
    const handleGanttBarPointerDown = (
        e: React.PointerEvent,
        nodeId: string,
        mode: 'move' | 'resize-start' | 'resize-end'
    ) => {
        e.stopPropagation();
        e.preventDefault();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        setSelectedNodeId(nodeId);
        
        const startD = node.data.startDate || '2026-06-08';
        const endD = node.data.endDate || '2026-06-12';
        
        // Snapshot before drag/resize
        dragSnapshotRef.current = { nodes, edges };
        
        setGanttDrag({
            nodeId,
            mode,
            startX: e.clientX,
            initialStartDate: startD,
            initialEndDate: endD
        });
        
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);
    };

    const handleGanttBarPointerMove = (e: React.PointerEvent) => {
        if (!ganttDrag) return;
        e.stopPropagation();
        
        const dx = e.clientX - ganttDrag.startX;
        const deltaDays = Math.round(dx / ganttColumnWidth);
        
        const start = parseDate(ganttDrag.initialStartDate) || new Date(ganttYear, ganttMonth, 8);
        const end = parseDate(ganttDrag.initialEndDate) || new Date(ganttYear, ganttMonth, 12);
        
        let newStart = new Date(start.getTime());
        let newEnd = new Date(end.getTime());
        
        if (ganttDrag.mode === 'move') {
            newStart.setDate(start.getDate() + deltaDays);
            newEnd.setDate(end.getDate() + deltaDays);
        } else if (ganttDrag.mode === 'resize-start') {
            newStart.setDate(start.getDate() + deltaDays);
            if (newStart > newEnd) {
                newStart = new Date(newEnd.getTime());
            }
        } else if (ganttDrag.mode === 'resize-end') {
            newEnd.setDate(end.getDate() + deltaDays);
            if (newEnd < newStart) {
                newEnd = new Date(newStart.getTime());
            }
        }
        
        const formatD = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };
        
        const newStartStr = formatD(newStart);
        const newEndStr = formatD(newEnd);
        
        setNodes(prev => prev.map(n => 
            n.id === ganttDrag.nodeId
                ? { ...n, data: { ...n.data, startDate: newStartStr, endDate: newEndStr } }
                : n
        ));
    };

    const handleGanttBarPointerUp = (e: React.PointerEvent) => {
        if (!ganttDrag) return;
        e.stopPropagation();
        
        // Push to history if dates actually changed
        const node = nodes.find(n => n.id === ganttDrag.nodeId);
        const startChanged = node?.data.startDate !== ganttDrag.initialStartDate;
        const endChanged = node?.data.endDate !== ganttDrag.initialEndDate;
        
        if ((startChanged || endChanged) && dragSnapshotRef.current) {
            pushHistory(dragSnapshotRef.current);
        }
        dragSnapshotRef.current = null;
        
        saveBoard(nodes, edges);
        setGanttDrag(null);
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch(err) {}
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
        
        // Capture pointer events on the stable canvas container instead of the moving node
        if (canvasRef.current) {
            canvasRef.current.setPointerCapture(e.pointerId);
        }

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
        let initialTitle = 'Yeni Not';
        let initialColor = 'var(--node-green)';
        
        if (nodeType === 'task') { initialTitle = 'Yeni Görev'; initialColor = 'var(--node-blue)'; }
        else if (nodeType === 'flow_start') { initialTitle = 'Başlangıç'; initialColor = 'var(--node-blue)'; }
        else if (nodeType === 'flow_end') { initialTitle = 'Bitiş'; initialColor = 'var(--node-blue)'; }
        else if (nodeType === 'flow_process') { initialTitle = 'İşlem'; initialColor = 'var(--node-pink)'; }
        else if (nodeType === 'flow_decision') { initialTitle = 'Karar'; initialColor = 'var(--node-purple)'; }
        else if (nodeType === 'flow_data') { initialTitle = 'Veri'; initialColor = 'var(--node-yellow)'; }
        else if (nodeType === 'mindmap_root') { initialTitle = 'Merkez Konu'; initialColor = 'var(--node-blue)'; }
        else if (nodeType === 'mindmap_main') { initialTitle = 'Ana Başlık'; initialColor = 'var(--node-purple)'; }
        else if (nodeType === 'mindmap_sub') { initialTitle = 'Alt Başlık'; initialColor = 'var(--node-yellow)'; }

        const newNode: Node = {
            id: uuidv4(),
            type: nodeType,
            position: { x: coords.x, y: coords.y },
            data: {
                title: initialTitle,
                content: (nodeType.startsWith('flow_') || nodeType.startsWith('mindmap_')) ? '' : 'İçerik...',
                color: initialColor,
                assignee: '',
                status: nodeType === 'task' ? 'todo' : undefined,
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

    const renderEdges = () => edges.map(edge => {
        const src = nodes.find(n => n.id === edge.source);
        const tgt = nodes.find(n => n.id === edge.target);
        if (!src || !tgt) return null;
        
        const sHandle = edge.sourceHandle || 'right';
        const tHandle = edge.targetHandle || 'left';
        
        const s = getHandlePos(src, sHandle);
        const t = getHandlePos(tgt, tHandle);
        
        let d = '';
        if (sHandle === 'bottom' || sHandle === 'top' || tHandle === 'top' || tHandle === 'bottom') {
            const cy = (s.y + t.y) / 2;
            d = `M ${s.x} ${s.y} C ${s.x} ${cy}, ${t.x} ${cy}, ${t.x} ${t.y}`;
        } else {
            const cx = (s.x + t.x) / 2;
            d = `M ${s.x} ${s.y} C ${cx} ${s.y}, ${cx} ${t.y}, ${t.x} ${t.y}`;
        }
        
        return (
            <g key={edge.id}>
                <path
                    className="edge-path"
                    d={d}
                    markerEnd="url(#arrowhead)"
                />
                {/* clickable delete zone */}
                <path
                    d={d}
                    stroke="transparent" strokeWidth="16" fill="none"
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
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
                className="active-edge-path"
                d={`M ${s.x} ${s.y} C ${cx} ${s.y}, ${cx} ${t.y}, ${t.x} ${t.y}`}
                style={snapTarget ? { stroke: '#34d399' } : {}}
            />
        );
    };

    /* ─────────── Node renderer ─────────── */
    const renderNode = (node: Node) => {
        const isTask = node.type === 'task';
        const isFlowStart = node.type === 'flow_start';
        const isFlowEnd = node.type === 'flow_end';
        const isFlowProcess = node.type === 'flow_process';
        const isFlowDecision = node.type === 'flow_decision';
        const isFlowData = node.type === 'flow_data';
        const isFlowchart = isFlowStart || isFlowEnd || isFlowProcess || isFlowDecision || isFlowData;

        const isMindmapRoot = node.type === 'mindmap_root';
        const isMindmapMain = node.type === 'mindmap_main';
        const isMindmapSub = node.type === 'mindmap_sub';
        const isMindmap = isMindmapRoot || isMindmapMain || isMindmapSub;
        const isSpecialShape = isFlowchart || isMindmap;

        let typeLabel = 'Not';
        let typeIcon = (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
        );
        if (isTask) {
            typeLabel = 'Görev';
            typeIcon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
            );
        } else if (isFlowStart) {
            typeLabel = 'Başlangıç';
            typeIcon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
            );
        } else if (isFlowEnd) {
            typeLabel = 'Bitiş';
            typeIcon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <rect x="9" y="9" width="6" height="6" />
                </svg>
            );
        } else if (isFlowProcess) {
            typeLabel = 'İşlem';
            typeIcon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                    <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
                </svg>
            );
        } else if (isFlowDecision) {
            typeLabel = 'Karar';
            typeIcon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                    <polygon points="12 2 22 12 12 22 2 12 12 2" />
                </svg>
            );
        } else if (isFlowData) {
            typeLabel = 'Veri';
            typeIcon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            );
        } else if (isMindmapRoot) {
            typeLabel = 'Merkez';
            typeIcon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                    <path d="M9.59 4.59A2 2 0 1 1 11 8H9m10.41 11.41A2 2 0 1 1 18 16h2" />
                    <circle cx="12" cy="12" r="4" />
                </svg>
            );
        } else if (isMindmapMain) {
            typeLabel = 'Ana Konu';
            typeIcon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                </svg>
            );
        } else if (isMindmapSub) {
            typeLabel = 'Alt Konu';
            typeIcon = (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
            );
        }

        // const typeColor = isTask ? 'var(--node-text-blue)' : 'var(--node-text-green)';

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

        let shapeClass = '';
        // let shapeBgStyle: React.CSSProperties = { background: bgColor };
        let nodeWidth = NODE_W;
        let nodeMinHeight = NODE_H;

        if (isFlowStart || isFlowEnd) {
            shapeClass = ' canvas-node-capsule';
        } else if (isFlowDecision) {
            shapeClass = ' canvas-node-diamond-wrapper';
            nodeWidth = 140;
            nodeMinHeight = 140;
        } else if (isFlowData) {
            shapeClass = ' canvas-node-parallelogram-wrapper';
            nodeWidth = 160;
        } else if (isMindmapRoot) {
            shapeClass = ' canvas-node-pill';
            nodeWidth = 200;
            nodeMinHeight = 70;
        } else if (isMindmapMain) {
            shapeClass = ' canvas-node-mindmap-main';
            nodeWidth = 180;
            nodeMinHeight = 65;
        } else if (isMindmapSub) {
            shapeClass = ' canvas-node-mindmap-sub';
            nodeWidth = 150;
            nodeMinHeight = 40;
        }

        let transformStr = `translate(${node.position?.x || 0}px, ${node.position?.y || 0}px)`;

        return (
            <div
                key={node.id}
                className={`canvas-node glass-panel${shapeClass}`}
                style={{
                    transform: transformStr,
                    backgroundColor: (isFlowDecision || isFlowData || isMindmapSub) ? 'transparent' : bgColor,
                    border: (isFlowDecision || isFlowData || isMindmapSub) ? 'none' : undefined,
                    boxShadow: (isFlowDecision || isFlowData || isMindmapSub) ? 'none' : undefined,
                    zIndex: dragInfo?.id === node.id ? 10 : 1,
                    width: nodeWidth,
                    minHeight: nodeMinHeight,
                    boxSizing: 'border-box',
                    cursor: connecting ? 'crosshair' : (dragInfo?.id === node.id ? 'grabbing' : 'grab'),
                    userSelect: 'none',
                    ...(isFlowDecision || isFlowData || isMindmapSub ? {} : {
                        border: selectedNodeId === node.id
                            ? '2px solid var(--accent-primary)'
                            : '1px solid var(--glass-border)',
                        boxShadow: selectedNodeId === node.id
                            ? '0 0 0 3px var(--accent-gradient-soft), var(--glass-shadow-node)'
                            : 'var(--glass-shadow-node)',
                    })
                }}
                onPointerDown={(e) => handlePointerDown(e, node.id)}
                onDragStart={(e) => e.preventDefault()}
            >
                {isTask && node.data?.status && (
                    <div className={`node-status-tag status-${node.data.status}`} />
                )}
                {(isFlowDecision || isFlowData) && (
                    <div className="shape-bg" style={{
                        position: 'absolute',
                        inset: 0,
                        background: bgColor,
                        zIndex: -1,
                        border: selectedNodeId === node.id
                            ? '2px solid var(--accent-primary)'
                            : '1px solid var(--glass-border)',
                        boxShadow: selectedNodeId === node.id
                            ? '0 0 0 3px var(--accent-gradient-soft), var(--glass-shadow-node)'
                            : 'var(--glass-shadow-node)',
                    }} />
                )}
                
                <div className="node-inner-content" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* ── Header ── */}
                <div className="node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: isTask ? 'var(--node-text-blue)' : 'var(--node-text-green)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                        {typeIcon}
                        {typeLabel}
                    </span>
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
                <div className="node-title" style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                }}>
                    {node.data?.title || '(Başlık yok)'}
                </div>
                        {!isSpecialShape && (
                            <div className="node-content" style={{
                                fontSize: '0.82rem',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'pre-wrap',
                                lineHeight: 1.5,
                            }}>
                                {node.data?.content || ''}
                            </div>
                        )}
                        {isTask && node.data?.assignee && (
                            <div style={{
                                marginTop: 8,
                                fontSize: '0.75rem',
                                color: 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, flexShrink: 0 }}>
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                {node.data.assignee}
                            </div>
                        )}
                        {isTask && node.data?.status && (() => {
                            const sm = STATUS_META[node.data.status];
                            return (
                                <div className={`status-badge status-${node.data.status}`}>
                                    <span className="status-dot" />
                                    <span className="status-text">{sm.label}</span>
                                </div>
                            );
                        })()}
                </div>

                {/* ── Connection handles ── */}
                {(() => {
                    const handleOffsetsForNode: Record<string, { cx: number; cy: number }> = {
                        top: { cx: nodeWidth / 2, cy: 0 },
                        right: { cx: nodeWidth, cy: nodeMinHeight / 2 },
                        bottom: { cx: nodeWidth / 2, cy: nodeMinHeight },
                        left: { cx: 0, cy: nodeMinHeight / 2 },
                    };
                    return Object.entries(handleOffsetsForNode).map(([side, off]) => {
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
                    });
                })()}
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
    if (boardTemplate === 'timeline') {
        const daysInMonth = new Date(ganttYear, ganttMonth + 1, 0).getDate();
        const nextMonth = ganttMonth === 11 ? 0 : ganttMonth + 1;
        const nextMonthYear = ganttMonth === 11 ? ganttYear + 1 : ganttYear;
        const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();

        const daysArray1 = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const daysArray2 = Array.from({ length: daysInNextMonth }, (_, i) => i + 1);

        const getGanttBarCoords = (node: Node) => {
            const start = parseDate(node.data.startDate) || new Date(ganttYear, ganttMonth, 8);
            const end = parseDate(node.data.endDate) || new Date(ganttYear, ganttMonth, 12);
            
            const timelineStart = new Date(ganttYear, ganttMonth, 1);
            const totalDaysInView = daysInMonth + daysInNextMonth;
            
            const diffStartMs = start.getTime() - timelineStart.getTime();
            let startDayOffset = diffStartMs / (1000 * 60 * 60 * 24);
            if (startDayOffset < 0) startDayOffset = 0;
            if (startDayOffset > totalDaysInView) startDayOffset = totalDaysInView;
            
            const diffEndMs = end.getTime() - start.getTime();
            let durationDays = diffEndMs / (1000 * 60 * 60 * 24) + 1;
            if (durationDays < 1) durationDays = 1;
            if (startDayOffset + durationDays > totalDaysInView) {
                durationDays = totalDaysInView - startDayOffset;
            }
            
            return {
                left: startDayOffset * ganttColumnWidth,
                width: durationDays * ganttColumnWidth
            };
        };

        const handleAddTimelineNode = () => {
            pushHistory({ nodes, edges });
            const mStr = String(ganttMonth + 1).padStart(2, '0');
            const newNode: Node = {
                id: uuidv4(),
                type: 'task',
                position: { x: 50, y: 50 },
                data: {
                    title: 'Yeni Görev',
                    content: 'Açıklama girin...',
                    color: 'var(--node-blue)',
                    assignee: '',
                    startDate: `${ganttYear}-${mStr}-08`,
                    endDate: `${ganttYear}-${mStr}-12`,
                    progress: 0
                }
            };
            const newNodes = [...nodes, newNode];
            setNodes(newNodes);
            saveBoard(newNodes, edges);
            setSelectedNodeId(newNode.id);
        };

        // Filter nodes to only show those that overlap the active month and next month
        const timelineStart = new Date(ganttYear, ganttMonth, 1);
        const timelineEnd = new Date(nextMonthYear, nextMonth, daysInNextMonth, 23, 59, 59);

        const visibleNodes = nodes.filter(node => {
            const start = parseDate(node.data.startDate);
            const end = parseDate(node.data.endDate);
            if (!start || !end) return true; // Show tasks without dates
            return start <= timelineEnd && end >= timelineStart;
        });

        return (
            <div className="gantt-board-container" style={{ paddingLeft: sidebarOpen ? 312 : 92 }}>
                <div className="gantt-board-inner glass-panel">
                    {/* Gantt Header */}
                    <div className="gantt-board-header">
                        <div className="gantt-board-title-container">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
                                <line x1="3" y1="5" x2="21" y2="5" />
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="19" x2="21" y2="19" />
                                <rect x="5" y="8" width="6" height="3" rx="1" />
                                <rect x="12" y="15" width="7" height="3" rx="1" />
                            </svg>
                            <h2 className="gantt-board-title">Proje Zaman Çizelgesi</h2>
                        </div>

                        {/* Orta Kontroller: Ay ve Zoom */}
                        <div className="gantt-controls-container" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                            {/* Ay Seçimi */}
                            <div className="gantt-month-navigation" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button 
                                    className="gantt-nav-btn" 
                                    onClick={handlePrevMonth}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-primary)',
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                </button>
                                <span className="gantt-month-label" style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 120, textAlign: 'center', color: 'var(--text-primary)' }}>
                                    {getMonthName(ganttMonth)} {ganttYear}
                                </span>
                                <button 
                                    className="gantt-nav-btn" 
                                    onClick={handleNextMonth}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-primary)',
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                            </div>

                            {/* Zoom/Ölçek Sürgüsü */}
                            <div className="gantt-zoom-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    <line x1="8" y1="11" x2="14" y2="11" />
                                </svg>
                                <input 
                                    type="range"
                                    min="15"
                                    max="85"
                                    value={ganttColumnWidth}
                                    onChange={(e) => setGanttColumnWidth(parseInt(e.target.value))}
                                    style={{
                                        width: 100,
                                        accentColor: 'var(--accent-primary)',
                                        cursor: 'pointer',
                                        height: 4
                                    }}
                                    title="Sütun Genişliğini Ayarla"
                                />
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    <line x1="11" y1="8" x2="11" y2="14" />
                                    <line x1="8" y1="11" x2="14" y2="11" />
                                </svg>
                            </div>
                        </div>

                        <button className="gantt-add-btn" onClick={handleAddTimelineNode}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Yeni Görev Ekle
                        </button>
                    </div>

                    <div className="gantt-board-body">
                        {/* Sol Bölüm: Görev Listesi */}
                        <div className="gantt-task-side">
                            <div className="gantt-task-header-row">
                                <span className="gantt-task-header-title">Görev Adı</span>
                                <span className="gantt-task-header-assignee">Atanan</span>
                            </div>
                            <div className="gantt-task-list">
                                {visibleNodes.length === 0 && (
                                    <div className="gantt-empty-state">Görev bulunmamaktadır.</div>
                                )}
                                {visibleNodes.map(node => {
                                    const isSelected = selectedNodeId === node.id;
                                    return (
                                        <div 
                                            key={node.id} 
                                            className={`gantt-task-row${isSelected ? ' selected' : ''}`}
                                            onClick={() => setSelectedNodeId(node.id)}
                                        >
                                            <div className="gantt-task-row-name-col">
                                                <span className="gantt-task-bullet" style={{ backgroundColor: node.data.color || 'var(--node-blue)' }} />
                                                <span className="gantt-task-name" title={node.data.title}>{node.data.title || '(Başlık yok)'}</span>
                                            </div>
                                            <div className="gantt-task-row-assignee-col">
                                                {node.data.assignee ? (
                                                    <span className="gantt-task-assignee-tag" title={node.data.assignee}>
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 3 }}>
                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                            <circle cx="12" cy="7" r="4" />
                                                        </svg>
                                                        {node.data.assignee.split('@')[0]}
                                                    </span>
                                                ) : (
                                                    <span className="gantt-task-assignee-none">-</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sağ Bölüm: Zaman Izgarası */}
                        <div className="gantt-timeline-side">
                            <div className="gantt-timeline-grid-wrapper" style={{ minWidth: (daysInMonth + daysInNextMonth) * ganttColumnWidth, width: (daysInMonth + daysInNextMonth) * ganttColumnWidth }}>
                                {/* Ay/Yıl Satırı */}
                                <div className="gantt-month-row" style={{ display: 'flex' }}>
                                    <div className="gantt-month-title" style={{ width: daysInMonth * ganttColumnWidth, flexShrink: 0, borderRight: '1px solid var(--glass-border-subtle)', paddingLeft: 16 }}>
                                        {getMonthName(ganttMonth)} {ganttYear}
                                    </div>
                                    <div className="gantt-month-title" style={{ width: daysInNextMonth * ganttColumnWidth, flexShrink: 0, paddingLeft: 16 }}>
                                        {getMonthName(nextMonth)} {nextMonthYear}
                                    </div>
                                </div>
                                {/* Gün Numaraları Satırı */}
                                <div className="gantt-days-row">
                                    {daysArray1.map(day => (
                                        <div key={`m1-${day}`} className="gantt-day-header-cell" style={{ width: ganttColumnWidth }}>
                                            {day}
                                        </div>
                                    ))}
                                    {daysArray2.map(day => (
                                        <div key={`m2-${day}`} className="gantt-day-header-cell" style={{ width: ganttColumnWidth }}>
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Çizgiler ve Çubuklar */}
                                <div className="gantt-grid-content-area" style={{ minHeight: 'calc(100% - 60px)' }}>
                                    {/* Dikey Izgara Çizgileri */}
                                    <div className="gantt-grid-vertical-lines">
                                        {daysArray1.map(day => (
                                            <div key={`l1-${day}`} className="gantt-vertical-line-col" style={{ width: ganttColumnWidth }} />
                                        ))}
                                        {daysArray2.map(day => (
                                            <div key={`l2-${day}`} className="gantt-vertical-line-col" style={{ width: ganttColumnWidth }} />
                                        ))}
                                    </div>

                                    {/* Bugün Göstergesi */}
                                    {(() => {
                                        const today = new Date();
                                        const isTodayInActiveMonth = today.getFullYear() === ganttYear && today.getMonth() === ganttMonth;
                                        const isTodayInNextMonth = today.getFullYear() === nextMonthYear && today.getMonth() === nextMonth;
                                        
                                        if (isTodayInActiveMonth) {
                                            const todayLeft = (today.getDate() - 1) * ganttColumnWidth + (ganttColumnWidth / 2);
                                            return (
                                                <div className="gantt-today-line" style={{ left: todayLeft }}>
                                                    <span className="gantt-today-badge">Bugün</span>
                                                </div>
                                            );
                                        } else if (isTodayInNextMonth) {
                                            const todayLeft = (daysInMonth + today.getDate() - 1) * ganttColumnWidth + (ganttColumnWidth / 2);
                                            return (
                                                <div className="gantt-today-line" style={{ left: todayLeft }}>
                                                    <span className="gantt-today-badge">Bugün</span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* Satırlar */}
                                    <div className="gantt-rows-container">
                                        {visibleNodes.map(node => {
                                            const isSelected = selectedNodeId === node.id;
                                            const coords = getGanttBarCoords(node);
                                            const progressVal = node.data.progress ?? 0;
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
                                            const barColor = normalizeColor(node.data.color || '');
                                            
                                            return (
                                                <div 
                                                    key={node.id} 
                                                    className={`gantt-grid-row${isSelected ? ' selected' : ''}`}
                                                    onClick={() => setSelectedNodeId(node.id)}
                                                >
                                                    <div 
                                                        className={`gantt-bar-wrapper${ganttDrag?.nodeId === node.id ? ' dragging' : ''}`}
                                                        style={{ 
                                                            left: coords.left, 
                                                            width: coords.width,
                                                            backgroundColor: barColor,
                                                            border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                                                            boxShadow: isSelected ? '0 0 0 2px var(--accent-gradient-soft)' : 'none',
                                                            cursor: ganttDrag?.nodeId === node.id ? (ganttDrag.mode === 'move' ? 'grabbing' : 'ew-resize') : 'grab'
                                                        }}
                                                        onPointerDown={(e) => {
                                                            if ((e.target as HTMLElement).classList.contains('gantt-bar-resize-handle')) return;
                                                            handleGanttBarPointerDown(e, node.id, 'move');
                                                        }}
                                                        onPointerMove={handleGanttBarPointerMove}
                                                        onPointerUp={handleGanttBarPointerUp}
                                                        onPointerCancel={handleGanttBarPointerUp}
                                                    >
                                                        {/* Resize handles */}
                                                        <div 
                                                            className="gantt-bar-resize-handle start"
                                                            onPointerDown={(e) => handleGanttBarPointerDown(e, node.id, 'resize-start')}
                                                        />
                                                        
                                                        {/* Progress fill */}
                                                        <div 
                                                            className="gantt-bar-progress-fill" 
                                                            style={{ 
                                                                width: `${progressVal}%`,
                                                                background: 'rgba(255,255,255,0.15)'
                                                            }} 
                                                        />
                                                        <span className="gantt-bar-label">
                                                            {progressVal > 0 && `${progressVal}%`}
                                                        </span>

                                                        <div 
                                                            className="gantt-bar-resize-handle end"
                                                            onPointerDown={(e) => handleGanttBarPointerDown(e, node.id, 'resize-end')}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Property Panel (Right Sidebar) inside Gantt view */}
                    {selectedNodeId && (
                        <div className="property-panel glass-panel" style={{
                            position: 'absolute',
                            top: 80,
                            right: 24,
                            width: 320,
                            height: 'calc(100% - 104px)',
                            maxHeight: 'calc(100vh - 120px)',
                            overflowY: 'auto',
                            padding: 24,
                            zIndex: 150,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onWheel={e => e.stopPropagation()}
                        >
                            {(() => {
                                const selNode = nodes.find(n => n.id === selectedNodeId);
                                if (!selNode) return null;

                                const updateNode = (updates: Partial<NodeData>) => {
                                    const newNodes = nodes.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updates } } : n);
                                    setNodes(newNodes);
                                };

                                const commitUpdate = () => {
                                    const currentNodes = nodes.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data } } : n);
                                    saveBoard(currentNodes, edges);
                                };

                                return (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Görev Özellikleri</h3>
                                            <button onClick={() => setSelectedNodeId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, color: 'var(--text-secondary)' }} title="Kapat">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Görev Adı</label>
                                            <input
                                                value={selNode.data.title || ''}
                                                onChange={e => updateNode({ title: e.target.value })}
                                                onFocus={() => pushHistory({ nodes, edges })}
                                                onBlur={commitUpdate}
                                                style={{ ...inputStyle, padding: '10px 14px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Açıklama</label>
                                            <textarea
                                                value={selNode.data.content || ''}
                                                onChange={e => updateNode({ content: e.target.value })}
                                                onFocus={() => pushHistory({ nodes, edges })}
                                                onBlur={commitUpdate}
                                                rows={3}
                                                style={{ ...inputStyle, padding: '10px 14px', resize: 'vertical' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Atanan Kişi</label>
                                            <AssigneeSelector
                                                boardId={boardId}
                                                currentAssignee={selNode.data.assignee || ''}
                                                currentUserEmail={currentUserEmail}
                                                onSelect={(email) => {
                                                    pushHistory({ nodes, edges });
                                                    const updated = nodes.map(n =>
                                                        n.id === selectedNodeId
                                                            ? { ...n, data: { ...n.data, assignee: email } }
                                                            : n
                                                    );
                                                    setNodes(updated);
                                                    saveBoard(updated, edges);
                                                }}
                                                onInvite={onInviteUser}
                                            />
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Başlangıç</label>
                                                <input
                                                    type="date"
                                                    value={selNode.data.startDate ?? ''}
                                                    onChange={e => updateNode({ startDate: e.target.value })}
                                                    onFocus={() => pushHistory({ nodes, edges })}
                                                    onBlur={commitUpdate}
                                                    style={{ ...inputStyle, padding: '8px' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Bitiş</label>
                                                <input
                                                    type="date"
                                                    value={selNode.data.endDate ?? ''}
                                                    onChange={e => updateNode({ endDate: e.target.value })}
                                                    onFocus={() => pushHistory({ nodes, edges })}
                                                    onBlur={commitUpdate}
                                                    style={{ ...inputStyle, padding: '8px' }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>İlerleme Durumu</label>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>%{selNode.data.progress ?? 0}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={selNode.data.progress ?? 0}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    updateNode({ progress: val });
                                                }}
                                                onMouseUp={() => {
                                                    pushHistory({ nodes, edges });
                                                    saveBoard(nodes, edges);
                                                }}
                                                onTouchEnd={() => {
                                                    pushHistory({ nodes, edges });
                                                    saveBoard(nodes, edges);
                                                }}
                                                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>Renk</label>
                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                {NODE_COLORS.map(({ key, label }) => {
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
                                            >Görevi Sil</button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (boardTemplate === 'kanban') {
        const columns: { id: TaskStatus; label: string; color: string }[] = [
            { id: 'todo', label: 'Yapılacaklar', color: '#ef4444' },
            { id: 'in_progress', label: 'Devam Edenler', color: '#f59e0b' },
            { id: 'done', label: 'Tamamlananlar', color: '#10b981' }
        ];

        const getColumnNodes = (status: TaskStatus) => {
            return nodes.filter(n => {
                const nodeStatus = n.data.status || 'todo';
                return nodeStatus === status;
            });
        };

        const handleKanbanDragStart = (e: React.DragEvent, nodeId: string) => {
            e.dataTransfer.setData('nodeId', nodeId);
        };

        const handleKanbanDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
            e.preventDefault();
            const nodeId = e.dataTransfer.getData('nodeId');
            
            // Also support dropping from toolbar
            const nodeType = e.dataTransfer.getData('nodeType');
            if (nodeType) {
                pushHistory({ nodes, edges });
                const isTask = nodeType === 'task';
                const newNode: Node = {
                    id: uuidv4(),
                    type: nodeType,
                    position: { x: 50, y: 50 },
                    data: {
                        title: isTask ? 'Yeni Görev' : 'Yeni Not',
                        content: isTask ? 'İçerik...' : 'İçerik...',
                        color: isTask ? 'var(--node-blue)' : 'var(--node-green)',
                        assignee: '',
                        status: targetStatus,
                    }
                };
                const newNodes = [...nodes, newNode];
                setNodes(newNodes);
                saveBoard(newNodes, edges);
                return;
            }

            if (!nodeId) return;
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;
            const currentStatus = node.data.status || 'todo';
            if (currentStatus === targetStatus) return;

            pushHistory({ nodes, edges });
            const newNodes = nodes.map(n => 
                n.id === nodeId 
                    ? { ...n, data: { ...n.data, status: targetStatus } }
                    : n
            );
            setNodes(newNodes);
            saveBoard(newNodes, edges);
        };

        const handleAddKanbanNode = (status: TaskStatus, type: 'task' | 'note') => {
            pushHistory({ nodes, edges });
            const isTask = type === 'task';
            const newNode: Node = {
                id: uuidv4(),
                type: type,
                position: { x: 50, y: 50 },
                data: {
                    title: isTask ? 'Yeni Görev' : 'Yeni Not',
                    content: 'Açıklama girin...',
                    color: isTask ? 'var(--node-blue)' : 'var(--node-green)',
                    assignee: '',
                    status: status,
                }
            };
            const newNodes = [...nodes, newNode];
            setNodes(newNodes);
            saveBoard(newNodes, edges);
            setSelectedNodeId(newNode.id); // auto select to edit properties
        };

        return (
            <div className="kanban-board-container" style={{ paddingLeft: sidebarOpen ? 312 : 92 }}>
                <div className="kanban-board-inner">
                    {columns.map(col => {
                        const colNodes = getColumnNodes(col.id);
                        return (
                            <div 
                                key={col.id} 
                                className="kanban-column glass-panel" 
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => handleKanbanDrop(e, col.id)}
                            >
                                {/* Column Header */}
                                <div className="kanban-column-header">
                                    <div className="kanban-column-title-container">
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                                        <h3 className="kanban-column-title">{col.label}</h3>
                                        <span className="kanban-column-badge">
                                            {colNodes.length}
                                        </span>
                                    </div>
                                    <div className="kanban-column-actions">
                                        <button 
                                            className="kanban-column-btn"
                                            onClick={() => handleAddKanbanNode(col.id, 'task')}
                                            title="Görev Ekle"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                                <line x1="12" y1="11" x2="12" y2="17" />
                                                <line x1="9" y1="14" x2="15" y2="14" />
                                            </svg>
                                        </button>
                                        <button 
                                            className="kanban-column-btn"
                                            onClick={() => handleAddKanbanNode(col.id, 'note')}
                                            title="Not Ekle"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line x1="12" y1="18" x2="12" y2="12" />
                                                <line x1="9" y1="15" x2="15" y2="15" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Cards List */}
                                <div className="kanban-cards-list">
                                    {colNodes.map(node => {
                                        const isTask = node.type === 'task';
                                        const isSelected = selectedNodeId === node.id;
                                        
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
                                        const cardBg = normalizeColor(node.data.color || '');

                                        return (
                                            <div
                                                key={node.id}
                                                draggable
                                                onDragStart={e => handleKanbanDragStart(e, node.id)}
                                                onClick={() => setSelectedNodeId(node.id)}
                                                className={`kanban-card glass-panel${isSelected ? ' selected' : ''}`}
                                            >
                                                {/* Left color bar */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 12,
                                                    bottom: 12,
                                                    width: 4,
                                                    borderRadius: '0 2px 2px 0',
                                                    background: cardBg
                                                }} />

                                                <div className="kanban-card-header">
                                                    <span className="kanban-card-type" style={{ color: isTask ? 'var(--node-text-blue)' : 'var(--node-text-green)' }}>
                                                        {isTask ? (
                                                            <>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                                                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                                                    <path d="M9 14l2 2 4-4" />
                                                                </svg>
                                                                Görev
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                                                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                                    <polyline points="14 2 14 8 20 8" />
                                                                </svg>
                                                                Not
                                                            </>
                                                        )}
                                                    </span>
                                                    <button 
                                                        className="kanban-card-delete-btn"
                                                        onClick={(e) => deleteNode(e, node.id)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>

                                                <div className="kanban-card-body">
                                                    <div className="kanban-card-title">
                                                        {node.data.title || '(Başlık yok)'}
                                                    </div>
                                                    <div className="kanban-card-content">
                                                        {node.data.content || ''}
                                                    </div>

                                                    {isTask && node.data.assignee && (
                                                        <div className="kanban-card-assignee">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                                <circle cx="12" cy="7" r="4" />
                                                            </svg>
                                                            {node.data.assignee}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Property Panel (Right Sidebar) inside Kanban view */}
                {selectedNodeId && (
                    <div className="property-panel glass-panel" style={{
                        position: 'absolute',
                        top: 80,
                        right: 24,
                        width: 320,
                        height: 'calc(100% - 104px)',
                        maxHeight: 'calc(100vh - 120px)',
                        overflowY: 'auto',
                        padding: 24,
                        zIndex: 150,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    onWheel={e => e.stopPropagation()}
                    >
                        {(() => {
                            const selNode = nodes.find(n => n.id === selectedNodeId);
                            if (!selNode) return null;
                            const isTask = selNode.type === 'task';
                            const isSpecialShape = selNode.type.startsWith('flow_') || selNode.type.startsWith('mindmap_');

                            const updateNode = (updates: Partial<NodeData>) => {
                                const newNodes = nodes.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updates } } : n);
                                setNodes(newNodes);
                            };

                            const commitUpdate = () => {
                                const currentNodes = nodes.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data } } : n);
                                saveBoard(currentNodes, edges);
                            };

                            return (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Özellikler</h3>
                                        <button onClick={() => setSelectedNodeId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, color: 'var(--text-secondary)' }} title="Kapat">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>
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
                                    {!isSpecialShape && (
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
                                    )}
                                    {isTask && (
                                        <div>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Atanan Kişi</label>
                                            <AssigneeSelector
                                                boardId={boardId}
                                                currentAssignee={selNode.data.assignee || ''}
                                                currentUserEmail={currentUserEmail}
                                                onSelect={(email) => {
                                                    pushHistory({ nodes, edges });
                                                    const updated = nodes.map(n =>
                                                        n.id === selectedNodeId
                                                            ? { ...n, data: { ...n.data, assignee: email } }
                                                            : n
                                                    );
                                                    setNodes(updated);
                                                    saveBoard(updated, edges);
                                                }}
                                                onInvite={onInviteUser}
                                            />
                                        </div>
                                    )}
                                    {isTask && (
                                        <div>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Durum</label>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {(Object.entries(STATUS_META) as [TaskStatus, typeof STATUS_META[TaskStatus]][]).map(([key, sm]) => {
                                                    const isActive = (selNode.data.status ?? 'todo') === key;
                                                    return (
                                                        <button
                                                            key={key}
                                                            onClick={() => {
                                                                pushHistory({ nodes, edges });
                                                                const updated = nodes.map(n =>
                                                                    n.id === selectedNodeId ? { ...n, data: { ...n.data, status: key } } : n
                                                                );
                                                                setNodes(updated);
                                                                saveBoard(updated, edges);
                                                            }}
                                                            className={`status-select-btn ${isActive ? 'active' : ''} status-${key}`}
                                                        >
                                                            <span className="status-dot" />
                                                            <span>{sm.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>Renk</label>
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                            {NODE_COLORS.map(({ key, label }) => {
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
                            );
                        })()}
                    </div>
                )}
            </div>
        );
    }

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
                }}
                onPointerDown={e => e.stopPropagation()}
                onWheel={e => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Özellikler</h3>
                        <button onClick={() => setSelectedNodeId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, color: 'var(--text-secondary)' }} title="Kapat">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    {(() => {
                        const selNode = nodes.find(n => n.id === selectedNodeId);
                        if (!selNode) return null;
                        const isTask = selNode.type === 'task';
                        const isSpecialShape = selNode.type.startsWith('flow_') || selNode.type.startsWith('mindmap_');

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
                                {!isSpecialShape && (
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
                                )}
                                {isTask && (
                                    <div>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Atanan Kişi</label>
                                        <AssigneeSelector
                                            boardId={boardId}
                                            currentAssignee={selNode.data.assignee || ''}
                                            currentUserEmail={currentUserEmail}
                                            onSelect={(email) => {
                                                pushHistory({ nodes, edges });
                                                const updated = nodes.map(n =>
                                                    n.id === selectedNodeId
                                                        ? { ...n, data: { ...n.data, assignee: email } }
                                                        : n
                                                );
                                                setNodes(updated);
                                                saveBoard(updated, edges);
                                            }}
                                            onInvite={onInviteUser}
                                        />
                                    </div>
                                )}
                                {isTask && (
                                    <div>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Durum</label>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {(Object.entries(STATUS_META) as [TaskStatus, typeof STATUS_META[TaskStatus]][]).map(([key, sm]) => {
                                                const isActive = (selNode.data.status ?? 'todo') === key;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => {
                                                            pushHistory({ nodes, edges });
                                                            const updated = nodes.map(n =>
                                                                n.id === selectedNodeId ? { ...n, data: { ...n.data, status: key } } : n
                                                            );
                                                            setNodes(updated);
                                                            saveBoard(updated, edges);
                                                        }}
                                                        className={`status-select-btn ${isActive ? 'active' : ''} status-${key}`}
                                                    >
                                                        <span className="status-dot" />
                                                        <span>{sm.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
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
