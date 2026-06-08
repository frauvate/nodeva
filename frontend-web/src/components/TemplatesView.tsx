import React, { useState, useRef, useEffect } from 'react';
import './TemplatesView.css';

interface TemplatesViewProps {
    ownedTeams: any[];
    onCreateBoard: (title: string, teamId?: string, template?: string) => void;
}

const TEMPLATES_LIST = [
    {
        id: 'flowchart',
        title: 'Akış Şeması',
        desc: 'Karar ve süreç akışları için elmas, kapsül ve süreç kartları.',
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="6" height="6" rx="1" />
                <rect x="15" y="15" width="6" height="6" rx="1" />
                <path d="M9 6h6v9" />
                <path d="M15 15h-6v3" />
                <circle cx="9" cy="18" r="3" />
            </svg>
        ),
        available: true
    },
    {
        id: 'mindmap',
        title: 'Zihin Haritası',
        desc: 'Fikirlerinizi görselleştirin, beyin fırtınası yapın ve yapılandırın.',
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <circle cx="19" cy="5" r="2" />
                <circle cx="5" cy="19" r="2" />
                <circle cx="19" cy="19" r="2" />
                <circle cx="5" cy="5" r="2" />
                <line x1="12" y1="12" x2="19" y2="5" />
                <line x1="12" y1="12" x2="5" y2="19" />
                <line x1="12" y1="12" x2="19" y2="19" />
                <line x1="12" y1="12" x2="5" y2="5" />
            </svg>
        ),
        available: true
    },
    {
        id: 'kanban',
        title: 'Kanban Panosu',
        desc: 'Projelerinizi ve görevlerinizi sütunlar halinde organize edin.',
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="3" x2="3" y2="21" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
                <line x1="21" y1="3" x2="21" y2="21" />
                <rect x="4" y="5" width="4" height="6" rx="1" />
                <rect x="10" y="8" width="4" height="4" rx="1" />
                <rect x="16" y="6" width="4" height="8" rx="1" />
            </svg>
        ),
        available: true
    },
    {
        id: 'timeline',
        title: 'Zaman Çizelgesi',
        desc: 'Kilometre taşları ve proje planları için zaman eksenli takip.',
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="5" x2="21" y2="5" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="19" x2="21" y2="19" />
                <rect x="5" y="8" width="6" height="3" rx="1" />
                <rect x="12" y="15" width="7" height="3" rx="1" />
            </svg>
        ),
        available: true
    }
];

const TemplatesView: React.FC<TemplatesViewProps> = ({ ownedTeams, onCreateBoard }) => {
    const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES_LIST[0] | null>(null);
    const [boardTitle, setBoardTitle] = useState('');
    const [teamId, setTeamId] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (selectedTemplate) {
            inputRef.current?.focus();
        }
    }, [selectedTemplate]);

    const handleSelectTemplate = (template: typeof TEMPLATES_LIST[0]) => {
        if (!template.available) return;
        setSelectedTemplate(template);
    };

    const handleCloseModal = () => {
        setSelectedTemplate(null);
        setBoardTitle('');
        setTeamId('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (boardTitle.trim() && selectedTemplate) {
            onCreateBoard(boardTitle.trim(), teamId || undefined, selectedTemplate.id);
            handleCloseModal();
        }
    };

    return (
        <div className="templates-container">
            <div className="templates-header">
                <h1 className="templates-page-title">Şablonlar</h1>
                <p className="templates-page-subtitle">Projelerinize hızlıca başlamak için bir şablon seçin.</p>
            </div>

            <div className="templates-grid-view">
                {TEMPLATES_LIST.map((template) => (
                    <div
                        key={template.id}
                        className={`template-view-card ${template.available ? 'available' : 'coming-soon'}`}
                        onClick={() => handleSelectTemplate(template)}
                    >
                        <div className="template-view-icon-wrapper">
                            {template.icon}
                        </div>
                        <h3 className="template-view-title">{template.title}</h3>
                        <p className="template-view-desc">{template.desc}</p>
                        
                        {!template.available && (
                            <span className="template-view-badge">Yakında</span>
                        )}
                        
                        {template.available && (
                            <button className="template-view-btn">Kullan</button>
                        )}
                    </div>
                ))}
            </div>

            {/* Custom creation modal overlay */}
            {selectedTemplate && (
                <div className="templates-modal-backdrop" onClick={handleCloseModal}>
                    <div className="templates-modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="templates-modal-header">
                            <h3 className="templates-modal-title">Yeni Pano Oluştur</h3>
                            <button className="templates-modal-close" onClick={handleCloseModal}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="templates-modal-body">
                            <p className="templates-modal-info">
                                Seçilen Şablon: <strong>{selectedTemplate.title}</strong>
                            </p>
                            <form onSubmit={handleSubmit}>
                                <div className="templates-form-group">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Pano adı..."
                                        value={boardTitle}
                                        onChange={(e) => setBoardTitle(e.target.value)}
                                        className="templates-modal-input"
                                        maxLength={60}
                                        required
                                    />
                                </div>
                                {ownedTeams.length > 0 && (
                                    <div className="templates-form-group">
                                        <select
                                            value={teamId}
                                            onChange={(e) => setTeamId(e.target.value)}
                                            className="templates-modal-input"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <option value="">Kişisel Pano</option>
                                            {ownedTeams.map((t) => (
                                                <option key={t.id} value={t.id}>{t.name} Ekibi</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="templates-modal-actions">
                                    <button type="button" className="templates-btn-secondary" onClick={handleCloseModal}>İptal</button>
                                    <button type="submit" className="templates-btn-primary" disabled={!boardTitle.trim()}>Oluştur</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplatesView;
