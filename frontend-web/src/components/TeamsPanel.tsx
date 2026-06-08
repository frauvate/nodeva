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
                                    <span className="teams-empty-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                    </span>
                                    <p>Henüz bir ekibiniz yok.</p>
                                    <small>Yukarıdan yeni bir ekip oluşturun.</small>
                                </div>
                            ) : (
                                <ul className="teams-list">
                                    {teams.map(team => {
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
                                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6" />
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                                <line x1="14" y1="11" x2="14" y2="17" />
                                                            </svg>
                                                        </button>
                                                        <span className="teams-chevron" style={{ display: 'flex', alignItems: 'center' }}>
                                                            {expanded ? (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="18 15 12 9 6 15" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="6 9 12 15 18 9" />
                                                                </svg>
                                                            )}
                                                        </span>
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
                                                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}
                                                                    >
                                                                        {email === currentUserEmail ? (
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                                                                <polyline points="16 17 21 12 16 7" />
                                                                                <line x1="21" y1="12" x2="9" y2="12" />
                                                                            </svg>
                                                                        ) : (
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                                                <line x1="6" y1="6" x2="18" y2="18" />
                                                                            </svg>
                                                                        )}
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
                                                            <p className="teams-limit-msg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                                    <line x1="12" y1="9" x2="12" y2="13" />
                                                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                                                </svg>
                                                                <span>Ücretsiz planda maksimum 3 üye limiti.</span>
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
                                    <span className="teams-empty-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                            <line x1="12" y1="11" x2="12" y2="17" />
                                            <line x1="9" y1="14" x2="15" y2="14" />
                                        </svg>
                                    </span>
                                    <p>Bekleyen davet yok.</p>
                                    <small>Bir ekipten davet geldiğinde burada görünecek.</small>
                                </div>
                            ) : (
                                <ul className="teams-request-list">
                                    {requests.map(req => (
                                        <li key={req.id} className="teams-request-item">
                                            <div className="teams-request-info">
                                                <span className="teams-request-icon">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                        <polyline points="22,6 12,13 2,6" />
                                                    </svg>
                                                </span>
                                                <div>
                                                    <strong>{req.team_name}</strong> ekibine davet edildiniz.
                                                </div>
                                            </div>
                                            <div className="teams-request-actions">
                                                <button
                                                    className="teams-btn teams-btn--accept"
                                                    onClick={() => handleAccept(req.id, req.team_name)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    <span>Kabul</span>
                                                </button>
                                                <button
                                                    className="teams-btn teams-btn--reject"
                                                    onClick={() => handleReject(req.id)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                    <span>Reddet</span>
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
