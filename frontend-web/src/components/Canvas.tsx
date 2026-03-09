import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { boardAPI } from '../services/api';
import './Canvas.css';

interface Node {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
        title: string;
        content: string;
        color: string;
    };
}

interface Edge {
    id: string;
    source: string;
    target: string;
}

interface CanvasProps {
    boardId: string;
    refreshKey?: number;
}

const Canvas: React.FC<CanvasProps> = ({ boardId, refreshKey }) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [dragInfo, setDragInfo] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

    // Connection dragging
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const fetchBoardData = async () => {
        try {
            const board = await boardAPI.getBoard(boardId);
            setNodes(board.nodes || []);
            setEdges(board.edges || []);
        } catch (error) {
            console.error("Failed to load board data", error);
        }
    };

    useEffect(() => {
        fetchBoardData();
    }, [boardId, refreshKey]);

    const saveBoard = async (newNodes: Node[], newEdges: Edge[]) => {
        try {
            await boardAPI.updateBoard(boardId, { nodes: newNodes, edges: newEdges });
        } catch (error) {
            console.error("Failed to save board", error);
        }
    };

    // Node Dragging
    const handlePointerDown = (e: React.PointerEvent, id: string) => {
        e.stopPropagation();
        const node = nodes.find(n => n.id === id);
        if (!node) return;

        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const rect = target.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        setDragInfo({ id, offsetX, offsetY });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (connectingFrom) {
            // We are trying to draw an edge
            const canvasRect = e.currentTarget.getBoundingClientRect();
            setMousePos({ x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top });
            return;
        }

        if (!dragInfo) return;

        // Simple view coords
        const canvasRect = e.currentTarget.getBoundingClientRect();
        const newX = e.clientX - canvasRect.left - dragInfo.offsetX;
        const newY = e.clientY - canvasRect.top - dragInfo.offsetY;

        // Update locally for smooth drag
        setNodes(prev => prev.map(n =>
            n.id === dragInfo.id ? { ...n, position: { x: newX, y: newY } } : n
        ));
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (dragInfo) {
            const target = e.target as HTMLElement;
            target.releasePointerCapture(e.pointerId);
            setDragInfo(null);

            // Save the state after drag ends
            const newNodes = nodes.map(n => {
                if (n.id === dragInfo.id) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const newX = e.clientX - rect.left - dragInfo.offsetX;
                    const newY = e.clientY - rect.top - dragInfo.offsetY;
                    return { ...n, position: { x: newX, y: newY } };
                }
                return n;
            });
            saveBoard(newNodes, edges);
        }

        if (connectingFrom) {
            setConnectingFrom(null); // Cancel edge if dropped purely on canvas
        }
    };

    // HTML5 Drag Drop from Toolbar
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('nodeType');
        if (!nodeType) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newNode: Node = {
            id: uuidv4(),
            type: nodeType,
            position: { x, y },
            data: {
                title: nodeType === 'task' ? 'Yeni Görev' : 'Yeni Not',
                content: 'İçerik...',
                color: nodeType === 'task' ? '#E3F2FD' : '#E8F5E9'
            }
        };

        const newNodes = [...nodes, newNode];
        setNodes(newNodes);
        saveBoard(newNodes, edges);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // necessary to allow dropping
    };

    // Node Edges Connection Logic
    const startConnection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setConnectingFrom(id);
        const canvasRect = e.currentTarget.closest('.canvas-container')?.getBoundingClientRect();
        if (canvasRect) {
            setMousePos({ x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top });
        }
    };

    const completeConnection = (e: React.MouseEvent, targetId: string) => {
        e.stopPropagation();
        if (connectingFrom && connectingFrom !== targetId) {
            // Check if already exists
            const exists = edges.find(ed => ed.source === connectingFrom && ed.target === targetId);
            if (!exists) {
                const newEdge = { id: uuidv4(), source: connectingFrom, target: targetId };
                const newEdges = [...edges, newEdge];
                setEdges(newEdges);
                saveBoard(nodes, newEdges);
            }
        }
        setConnectingFrom(null);
    };

    // Helper to render SVG paths
    const renderEdges = () => {
        return edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            // Draw from center right of source to center left of target
            const sx = sourceNode.position.x + 250; // node width
            const sy = sourceNode.position.y + 60;  // approx center height
            const tx = targetNode.position.x;
            const ty = targetNode.position.y + 60;

            return (
                <path
                    key={edge.id}
                    d={`M ${sx} ${sy} C ${sx + 50} ${sy}, ${tx - 50} ${ty}, ${tx} ${ty}`}
                    stroke="#B0BEC5"
                    strokeWidth="3"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                />
            );
        });
    };

    const renderActiveConnection = () => {
        if (!connectingFrom) return null;
        const sourceNode = nodes.find(n => n.id === connectingFrom);
        if (!sourceNode) return null;

        const sx = sourceNode.position.x + 250;
        const sy = sourceNode.position.y + 60;

        return (
            <path
                d={`M ${sx} ${sy} L ${mousePos.x} ${mousePos.y}`}
                stroke="#9c27b0"
                strokeWidth="3"
                strokeDasharray="5,5"
                fill="none"
            />
        );
    };

    const deleteNode = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newNodes = nodes.filter(n => n.id !== id);
        const newEdges = edges.filter(e => e.source !== id && e.target !== id);
        setNodes(newNodes);
        setEdges(newEdges);
        saveBoard(newNodes, newEdges);
    };

    return (
        <div
            className="canvas-container"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <svg className="edges-layer">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#B0BEC5" />
                    </marker>
                </defs>
                {renderEdges()}
                {renderActiveConnection()}
            </svg>

            <div className="nodes-layer">
                {nodes.map(node => (
                    <div
                        key={node.id}
                        className="canvas-node glass-panel"
                        style={{
                            transform: `translate(${node.position?.x || 0}px, ${node.position?.y || 0}px)`,
                            backgroundColor: node.data?.color || '#FFF',
                            zIndex: dragInfo?.id === node.id ? 10 : 1
                        }}
                        onPointerDown={(e) => handlePointerDown(e, node.id)}
                        onMouseUp={(e) => completeConnection(e, node.id)} // For finalizing edge drop on a node
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h4 className="node-title">{node.data?.title || 'Bilinmeyen'}</h4>
                            <button onClick={(e) => deleteNode(e, node.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', fontWeight: 'bold' }}>×</button>
                        </div>
                        <p className="node-content">{node.data?.content || ''}</p>

                        {/* Connection Handle */}
                        <div
                            className="connection-handle"
                            onMouseDown={(e) => startConnection(e, node.id)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Canvas;
