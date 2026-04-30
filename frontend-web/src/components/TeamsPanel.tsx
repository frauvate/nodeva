import React, { useState, useEffect, useRef } from 'react';
import { teamAPI } from '../services/api';
import './TeamsPanel.css';

interface Team {
    id: string;
    name: string;
    owner_id: string;
    members: string[];
}

interface TeamRequest {
    id: string;
    team_id: string;
    team_name: string;
    sender_id: string;
    recipient_email: string;
    status: string;
}

interface TeamsPanelProps {
    onClose: () => void;
    currentUserEmail: string;
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const TeamsPanel: React.FC<TeamsPanelProps> = ({ onClose, currentUserEmail, showToast }) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [requests, setRequests] = useState<TeamRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'teams' | 'requests'>('teams');

    // Create team form
    const [newTeamName, setNewTeamName] = useState('');
    const [creatingTeam, setCreatingTeam] = useState(false);

    // Invite form per team
    const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({});
    const [invitingTeam, setInvitingTeam] = useState<string | null>(null);

    // Expanded team
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

    const panelRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [teamsData, reqsData] = await Promise.all([
                teamAPI.getTeams(),
                teamAPI.getIncomingRequests(),
            ]);
            setTeams(teamsData);
            setRequests(reqsData);
        } catch {
            showToast('Ekip verileri yüklenemedi.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;
        setCreatingTeam(true);
        try {
            const team = await teamAPI.createTeam(newTeamName.trim());
            setTeams(prev => [...prev, team]);
            setNewTeamName('');
            setExpandedTeam(team.id);
            showToast(`"${team.name}" ekibi oluşturuldu.`, 'success');
        } catch (err: any) {
            showToast(err?.response?.data?.detail || 'Ekip oluşturulamadı.', 'error');
        } finally {
            setCreatingTeam(false);
        }
    };

    const handleDeleteTeam = async (team: Team) => {
        if (!window.confirm(`"${team.name}" ekibini silmek istediğinizden emin misiniz?`)) return;
        try {
            await teamAPI.deleteTeam(team.id);
            setTeams(prev => prev.filter(t => t.id !== team.id));
            showToast(`"${team.name}" ekibi silindi.`, 'success');
        } catch (err: any) {
            showToast(err?.response?.data?.detail || 'Ekip silinemedi.', 'error');
        }
    };

    const handleInvite = async (e: React.FormEvent, teamId: string) => {
        e.preventDefault();
        const email = inviteEmail[teamId]?.trim();
        if (!email) return;
        setInvitingTeam(teamId);
        try {
            await teamAPI.inviteMember(teamId, email);
            setInviteEmail(prev => ({ ...prev, [teamId]: '' }));
            showToast(`Davet gönderildi: ${email}`, 'success');
        } catch (err: any) {
            showToast(err?.response?.data?.detail || 'Davet gönderilemedi.', 'error');
        } finally {
            setInvitingTeam(null);
        }
    };

    const handleRemoveMember = async (teamId: string, memberEmail: string, teamName: string) => {
        const isSelf = memberEmail === currentUserEmail;
        const confirmMsg = isSelf
            ? `"${teamName}" ekibinden ayrılmak istediğinizden emin misiniz?`
            : `"${memberEmail}" kullanıcısını ekipten çıkarmak istediğinizden emin misiniz?`;
        if (!window.confirm(confirmMsg)) return;
        try {
            await teamAPI.removeMember(teamId, memberEmail);
            await fetchData();
            showToast(isSelf ? 'Ekipten ayrıldınız.' : `${memberEmail} ekipten çıkarıldı.`, 'success');
        } catch (err: any) {
            showToast(err?.response?.data?.detail || 'İşlem başarısız.', 'error');
        }
    };

    const handleAccept = async (reqId: string, teamName: string) => {
        try {
            await teamAPI.acceptRequest(reqId);
            setRequests(prev => prev.filter(r => r.id !== reqId));
            await fetchData();
            showToast(`"${teamName}" ekibine katıldınız!`, 'success');
        } catch (err: any) {
            showToast(err?.response?.data?.detail || 'Davet kabul edilemedi.', 'error');
        }
    };

    const handleReject = async (reqId: string) => {
        try {
            await teamAPI.rejectRequest(reqId);
            setRequests(prev => prev.filter(r => r.id !== reqId));
            showToast('Davet reddedildi.', 'info');
        } catch {
            showToast('İşlem başarısız.', 'error');
        }
    };

    const getAvatarLetter = (email: string) => email ? email[0].toUpperCase() : '?';
    const getAvatarColor = (email: string) => {
        const colors = ['#4facfe', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
        const idx = email.charCodeAt(0) % colors.length;
        return colors[idx];
    };

    return (
        <div className="teams-backdrop" onClick={onClose}>
            <div
                className="teams-panel glass-panel"
                ref={panelRef}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="teams-panel-header">
                    <div className="teams-panel-title">
                        <span className="teams-panel-icon">👥</span>
                        <h2>Ekipler</h2>
                    </div>
                    <button className="teams-close-btn" onClick={onClose} aria-label="Kapat">×</button>
                </div>

                {/* Tabs */}
                <div className="teams-tabs">
                    <button
                        className={`teams-tab ${activeTab === 'teams' ? 'active' : ''}`}
                        onClick={() => setActiveTab('teams')}
                    >
                        Ekiplerim
                        {teams.length > 0 && <span className="teams-tab-badge">{teams.length}</span>}
                    </button>
                    <button
                        className={`teams-tab ${activeTab === 'requests' ? 'active' : ''}`}
                        onClick={() => setActiveTab('requests')}
                    >
                        Daveti Bekleyenler
                        {requests.length > 0 && <span className="teams-tab-badge teams-tab-badge--alert">{requests.length}</span>}
                    </button>
                </div>

                <div className="teams-panel-body">
                    {loading ? (
                        <div className="teams-loading">
                            <div className="teams-spinner" />
                            <span>Yükleniyor...</span>
                        </div>
                    ) : activeTab === 'teams' ? (
                        <>
                            {/* Create Team Form */}
                            <form className="teams-create-form" onSubmit={handleCreateTeam}>
                                <input
                                    type="text"
                                    className="teams-input"
                                    placeholder="Yeni ekip adı..."
                                    value={newTeamName}
                                    onChange={e => setNewTeamName(e.target.value)}
                                    maxLength={50}
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    className="teams-btn teams-btn--primary"
                                    disabled={!newTeamName.trim() || creatingTeam}
                                >
                                    {creatingTeam ? '...' : '+ Oluştur'}
                                </button>
                            </form>

                            {/* Team List */}
                            {teams.length === 0 ? (
                                <div className="teams-empty">
                                    <span className="teams-empty-icon">🤝</span>
                                    <p>Henüz bir ekibiniz yok.</p>
                                    <small>Yukarıdan yeni bir ekip oluşturun.</small>
                                </div>
                            ) : (
                                <ul className="teams-list">
                                    {teams.map(team => {
                                        const isOwner = team.owner_id === undefined
                                            ? false
                                            : true; // We check by comparing with currentUserEmail via members
                                        const expanded = expandedTeam === team.id;
                                        return (
                                            <li key={team.id} className={`teams-list-item ${expanded ? 'expanded' : ''}`}>
                                                <div
                                                    className="teams-list-item-header"
                                                    onClick={() => setExpandedTeam(expanded ? null : team.id)}
                                                >
                                                    <div className="teams-list-item-info">
                                                        <span className="teams-team-color-dot" />
                                                        <div>
                                                            <strong className="teams-team-name">{team.name}</strong>
                                                            <span className="teams-member-count">{team.members.length} üye</span>
                                                        </div>
                                                    </div>
                                                    <div className="teams-list-item-actions">
                                                        <button
                                                            className="teams-icon-btn teams-icon-btn--danger"
                                                            title="Ekibi sil"
                                                            onClick={e => { e.stopPropagation(); handleDeleteTeam(team); }}
                                                        >🗑</button>
                                                        <span className="teams-chevron">{expanded ? '▲' : '▼'}</span>
                                                    </div>
                                                </div>

                                                {expanded && (
                                                    <div className="teams-team-detail">
                                                        {/* Member list */}
                                                        <div className="teams-members-label">Üyeler</div>
                                                        <ul className="teams-members-list">
                                                            {team.members.map(email => (
                                                                <li key={email} className="teams-member-item">
                                                                    <div
                                                                        className="teams-member-avatar"
                                                                        style={{ background: getAvatarColor(email) }}
                                                                    >
                                                                        {getAvatarLetter(email)}
                                                                    </div>
                                                                    <span className="teams-member-email">
                                                                        {email}
                                                                        {email === currentUserEmail && (
                                                                            <span className="teams-you-badge">Siz</span>
                                                                        )}
                                                                    </span>
                                                                    <button
                                                                        className="teams-icon-btn teams-icon-btn--sm"
                                                                        title={email === currentUserEmail ? 'Ekipten ayrıl' : 'Üyeyi çıkar'}
                                                                        onClick={() => handleRemoveMember(team.id, email, team.name)}
                                                                    >
                                                                        {email === currentUserEmail ? '🚪' : '✕'}
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>

                                                        {/* Invite form */}
                                                        <div className="teams-invite-label">
                                                            <span>Üye Davet Et</span>
                                                            <small className="teams-limit-hint">
                                                                ({team.members.length}/3 üye · Ücretsiz plan)
                                                            </small>
                                                        </div>
                                                        <form
                                                            className="teams-invite-form"
                                                            onSubmit={e => handleInvite(e, team.id)}
                                                        >
                                                            <input
                                                                type="email"
                                                                className="teams-input teams-input--sm"
                                                                placeholder="kullanici@ornek.com"
                                                                value={inviteEmail[team.id] || ''}
                                                                onChange={e => setInviteEmail(prev => ({
                                                                    ...prev,
                                                                    [team.id]: e.target.value
                                                                }))}
                                                                disabled={team.members.length >= 3}
                                                            />
                                                            <button
                                                                type="submit"
                                                                className="teams-btn teams-btn--secondary"
                                                                disabled={
                                                                    !inviteEmail[team.id]?.trim() ||
                                                                    team.members.length >= 3 ||
                                                                    invitingTeam === team.id
                                                                }
                                                            >
                                                                {invitingTeam === team.id ? '...' : 'Davet Et'}
                                                            </button>
                                                        </form>
                                                        {team.members.length >= 3 && (
                                                            <p className="teams-limit-msg">
                                                                ⚠️ Ücretsiz planda maksimum 3 üye limiti.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </>
                    ) : (
                        /* Requests Tab */
                        <>
                            {requests.length === 0 ? (
                                <div className="teams-empty">
                                    <span className="teams-empty-icon">📬</span>
                                    <p>Bekleyen davet yok.</p>
                                    <small>Bir ekipten davet geldiğinde burada görünecek.</small>
                                </div>
                            ) : (
                                <ul className="teams-request-list">
                                    {requests.map(req => (
                                        <li key={req.id} className="teams-request-item">
                                            <div className="teams-request-info">
                                                <span className="teams-request-icon">📩</span>
                                                <div>
                                                    <strong>{req.team_name}</strong> ekibine davet edildiniz.
                                                </div>
                                            </div>
                                            <div className="teams-request-actions">
                                                <button
                                                    className="teams-btn teams-btn--accept"
                                                    onClick={() => handleAccept(req.id, req.team_name)}
                                                >
                                                    ✓ Kabul
                                                </button>
                                                <button
                                                    className="teams-btn teams-btn--reject"
                                                    onClick={() => handleReject(req.id)}
                                                >
                                                    ✕ Reddet
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamsPanel;
