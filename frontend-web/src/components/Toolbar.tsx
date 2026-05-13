import React, { useState, useRef, useEffect } from 'react';
import { boardAPI } from '../services/api';
import type { ToastType } from './Toast';
import './Toolbar.css';

interface ToolbarProps {
    boardId: string;
    boardTemplate?: string;
    onGenerate: () => void;
    showToast?: (message: string, type?: ToastType) => void;
}

const SHAPES = [
    { type: 'flow_start', label: 'Başlangıç', icon: 'icon-capsule' },
    { type: 'flow_process', label: 'İşlem', icon: 'icon-process' },
    { type: 'flow_decision', label: 'Karar', icon: 'icon-diamond' },
    { type: 'flow_data', label: 'Veri', icon: 'icon-parallelogram' }
];

const BASIC_NODES = [
    { type: 'task', label: 'Görev Ekle', icon: 'icon-task' },
    { type: 'note', label: 'Not Ekle', icon: 'icon-note' }
];

const Toolbar: React.FC<ToolbarProps> = ({ boardId, boardTemplate = 'basic', onGenerate, showToast }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        try {
            await boardAPI.generateAIWorkflow(boardId, prompt);
            setPrompt('');
            onGenerate();
            showToast?.('AI iş akışı başarıyla oluşturuldu.', 'success');
            setIsOpen(false);
        } catch (error) {
            console.error('AI Generation failed', error);
            showToast?.('AI üretimi başarısız oldu. Tekrar deneyin.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, type: string) => {
        e.dataTransfer.setData('nodeType', type);
        // setIsOpen(false); // Don't close immediately so user sees what they're dragging
    };

    return (
        <div className="fab-container" ref={menuRef}>
            <button className={`fab-button ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                +
            </button>
            
            {isOpen && (
                <div className="fab-menu glass-panel">
                    <div className="menu-section">
                        <div className="section-title">Yapay Zeka ile Üret</div>
                        <div className="ai-section">
                            <input
                                type="text"
                                placeholder="İş akışı hayal et..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                                className="ai-input"
                                disabled={loading}
                            />
                            <button className="ai-btn" onClick={handleGenerate} disabled={loading}>
                                {loading ? 'Üretiliyor...' : 'Üret'}
                            </button>
                        </div>
                    </div>

                    <div className="menu-section" style={{ borderBottom: boardTemplate === 'flowchart' ? '1px solid var(--glass-border-subtle)' : 'none' }}>
                        <div className="section-title">Temel Düğümler (Sürükle)</div>
                        <div className="shape-grid basic-grid">
                            {BASIC_NODES.filter(n => boardTemplate === 'basic' || n.type === 'note').map(n => (
                                <div key={n.type} className="shape-item" draggable onDragStart={(e) => handleDragStart(e, n.type)} title={n.label}>
                                    <div className={`shape-icon ${n.icon}`} />
                                    <span className="shape-label">{n.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {boardTemplate === 'flowchart' && (
                        <div className="menu-section" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                            <div className="section-title">Akış Şekilleri (Sürükle)</div>
                            <div className="shape-grid">
                                {SHAPES.map(s => (
                                    <div key={s.type} className="shape-item" draggable onDragStart={(e) => handleDragStart(e, s.type)} title={s.label}>
                                        <div className={`shape-icon ${s.icon}`} />
                                        <span className="shape-label">{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Toolbar;
