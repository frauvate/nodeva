import React, { useState } from 'react';
import { boardAPI } from '../services/api';
import type { ToastType } from './Toast';
import './Toolbar.css';

interface ToolbarProps {
    boardId: string;
    onGenerate: () => void;
    showToast?: (message: string, type?: ToastType) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ boardId, onGenerate, showToast }) => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt) return;
        setLoading(true);
        try {
            await boardAPI.generateAIWorkflow(boardId, prompt);
            setPrompt('');
            onGenerate();
            showToast?.('AI iş akışı başarıyla oluşturuldu.', 'success');
        } catch (error) {
            console.error('AI Generation failed', error);
            showToast?.('AI üretimi başarısız oldu. Tekrar deneyin.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, type: string) => {
        e.dataTransfer.setData('nodeType', type);
    };

    return (
        <div className="toolbar glass-panel">
            <div className="drag-items">
                {/* We use HTML5 Drag&Drop for elements coming from the toolbar to Canvas */}
                <div
                    className="drag-item node-task"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'task')}
                >
                    Görev Ekle
                </div>
                <div
                    className="drag-item node-note"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'note')}
                >
                    Not Ekle
                </div>
            </div>

            <div className="ai-section">
                <input
                    type="text"
                    placeholder="Yapay Zeka ile İş Akışı Oluştur..."
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
    );
};

export default Toolbar;
