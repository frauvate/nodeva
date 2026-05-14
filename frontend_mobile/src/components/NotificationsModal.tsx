import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Pressable,
    Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { notificationAPI } from '../services/api';
import { Feather } from '@expo/vector-icons';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    board_id?: string;
    read: boolean;
    created_at: string;
    assigner_email?: string;
}

interface NotificationsModalProps {
    visible: boolean;
    onClose: () => void;
    onNavigateToBoard: (boardId: string) => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ visible, onClose, onNavigateToBoard }) => {
    const { colors, isDark } = useTheme();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await notificationAPI.getNotifications();
            setNotifications(Array.isArray(data) ? data : []);
        } catch { /* sessiz */ }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (visible) fetchNotifications();
    }, [visible]);

    const handleRead = async (notif: Notification) => {
        if (!notif.read) {
            await notificationAPI.markRead(notif.id).catch(() => {});
            // Update local state to show as read immediately
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        }
        if (notif.board_id) {
            onNavigateToBoard(notif.board_id);
            onClose();
        }
    };

    const handleDelete = (notifId: string) => {
        Alert.alert('Bildirimi Sil', 'Bu bildirimi silmek istediğinize emin misiniz?', [
            { text: 'Vazgeç', style: 'cancel' },
            { 
                text: 'Sil', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await notificationAPI.deleteNotification(notifId);
                        setNotifications(prev => prev.filter(n => n.id !== notifId));
                    } catch (err) {
                        Alert.alert('Hata', 'Bildirim silinemedi.');
                    }
                }
            }
        ]);
    };

    const formatTime = (iso: string) => {
        try {
            const d = new Date(iso);
            const diff = (Date.now() - d.getTime()) / 1000;
            if (diff < 60) return 'Az önce';
            if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
            return `${Math.floor(diff / 86400)}g`;
        } catch { return ''; }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'task_assigned': return 'check-circle';
            case 'board_shared': return 'share-2';
            case 'team_invite': return 'users';
            default: return 'bell';
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose} />
            <View style={[styles.container, { backgroundColor: isDark ? '#1c1c28' : '#fff', borderColor: colors.border }]}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Feather name="bell" size={20} color={colors.accent} />
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Bildirimler</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Feather name="x" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator color={colors.accent} style={{ marginVertical: 40 }} />
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }]}>
                                    <Feather name="bell-off" size={40} color={colors.textMuted} />
                                </View>
                                <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: '500' }}>Henüz bildirim yok</Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.notifRow, { 
                                    backgroundColor: item.read ? 'transparent' : (isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)'),
                                    borderBottomColor: colors.border 
                                }]}
                                onPress={() => handleRead(item)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                                    <Feather name={getIcon(item.type) as any} size={18} color={item.read ? colors.textSecondary : colors.accent} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                        <Text style={[styles.notifTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                                        <Text style={[styles.notifTime, { color: colors.textMuted }]}>{formatTime(item.created_at)}</Text>
                                    </View>
                                    <Text style={[styles.notifBody, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
                                </View>
                                
                                <TouchableOpacity 
                                    onPress={() => handleDelete(item.id)}
                                    style={styles.deleteBtn}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Feather name="trash-2" size={16} color={colors.error} style={{ opacity: 0.6 }} />
                                </TouchableOpacity>

                                {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />}
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    container: {
        marginHorizontal: 20,
        marginTop: 100,
        marginBottom: 80,
        borderRadius: 24,
        borderWidth: 1,
        flex: 1,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
    closeBtn: { padding: 4 },
    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    notifRow: {
        flexDirection: 'row',
        padding: 18,
        borderBottomWidth: 1,
        gap: 14,
        alignItems: 'center',
    },
    iconContainer: { 
        width: 44, 
        height: 44, 
        borderRadius: 14, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    notifTitle: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
    notifBody: { fontSize: 13, lineHeight: 18 },
    notifTime: { fontSize: 11, fontWeight: '500' },
    unreadDot: { 
        position: 'absolute',
        top: 18,
        right: 12,
        width: 8, 
        height: 8, 
        borderRadius: 4,
    },
    deleteBtn: {
        padding: 8,
        marginLeft: 4,
    }
});

export default NotificationsModal;
