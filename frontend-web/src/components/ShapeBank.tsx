import React from 'react';
import './ShapeBank.css';

const shapes = [
    { type: 'flow_start', label: 'Başlangıç / Bitiş', iconClass: 'icon-capsule' },
    { type: 'flow_process', label: 'İşlem', iconClass: 'icon-process' },
    { type: 'flow_decision', label: 'Karar', iconClass: 'icon-diamond' },
    { type: 'flow_data', label: 'Veri G/Ç', iconClass: 'icon-parallelogram' }
];

const ShapeBank: React.FC = () => {
    const handleDragStart = (e: React.DragEvent, type: string) => {
        e.dataTransfer.setData('nodeType', type);
    };

    return (
        <div 
            className="shape-bank glass-panel"
            onPointerDown={e => e.stopPropagation()} // Prevent canvas panning when clicking the bank
        >
            <h4 className="shape-bank-title">Akış Şekilleri</h4>
            <div className="shape-grid">
                {shapes.map(s => (
                    <div 
                        key={s.type} 
                        className="shape-item" 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, s.type)}
                        title={s.label}
                    >
                        <div className={`shape-icon ${s.iconClass}`} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShapeBank;
