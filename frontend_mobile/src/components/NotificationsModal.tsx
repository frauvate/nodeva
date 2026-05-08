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
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { notificationAPI } from '../services/api';

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
        }
        if (notif.board_id) {
            onNavigateToBoard(notif.board_id);
            onClose();
        }
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

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose} />
            <View style={[styles.container, { backgroundColor: isDark ? '#1c1c28' : '#fff', borderColor: colors.border }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Bildirimler</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={{ color: colors.accent, fontWeight: '700' }}>Kapat</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator color={colors.accent} style={{ marginVertical: 40 }} />
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={item => item.id}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={{ fontSize: 32, marginBottom: 12 }}>🔔</Text>
                                <Text style={{ color: colors.textMuted }}>Henüz bildirim yok</Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.notifRow, { 
                                    backgroundColor: item.read ? 'transparent' : (isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)'),
                                    borderBottomColor: colors.border 
                                }]}
                                onPress={() => handleRead(item)}
                            >
                                <View style={styles.iconContainer}>
                                    <Text style={{ fontSize: 20 }}>{item.type === 'task_assigned' ? '📋' : '📩'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                                    <Text style={[styles.notifBody, { color: colors.textSecondary }]}>{item.body}</Text>
                                    <Text style={[styles.notifTime, { color: colors.textMuted }]}>{formatTime(item.created_at)}</Text>
                                </View>
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
        marginBottom: 40,
        borderRadius: 20,
        borderWidth: 1,
        flex: 1,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    title: { fontSize: 18, fontWeight: '700' },
    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    notifRow: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        gap: 12,
        alignItems: 'flex-start',
    },
    iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
    notifTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    notifBody: { fontSize: 13, lineHeight: 18 },
    notifTime: { fontSize: 11, marginTop: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});

export default NotificationsModal;
