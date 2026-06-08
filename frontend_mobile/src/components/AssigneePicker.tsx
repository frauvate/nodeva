import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { userAPI } from '../services/api';

export interface BoardMember {
    email: string;
    id: string;
    is_self?: boolean;
    avatar_url?: string;
}

interface AssigneePickerProps {
    visible: boolean;
    boardId: string;
    currentAssignee: string;
    onSelect: (email: string) => void;
    onClose: () => void;
    onInvite?: (email: string) => void;
}

const getAvatar = (email: string) => (email ? email[0].toUpperCase() : '?');
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const getColor = (email: string) => COLORS[email.charCodeAt(0) % COLORS.length];

const AssigneePicker: React.FC<AssigneePickerProps> = ({
    visible,
    boardId,
    currentAssignee,
    onSelect,
    onClose,
    onInvite,
}) => {
    const { colors, isDark } = useTheme();
    const [members, setMembers] = useState<BoardMember[]>([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<BoardMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    // Üyeleri yükle
    useEffect(() => {
        if (!visible || !boardId) return;
        setLoading(true);
        userAPI.getBoardMembers(boardId)
            .then(data => setMembers(Array.isArray(data) ? data : []))
            .catch(() => setMembers([]))
            .finally(() => setLoading(false));
    }, [visible, boardId]);

    // Kullanıcı arama (debounce)
    useEffect(() => {
        if (search.length < 3) { setSearchResults([]); return; }
        const t = setTimeout(() => {
            setSearching(true);
            userAPI.searchUser(search)
                .then(res => setSearchResults(Array.isArray(res) ? res : []))
                .catch(() => setSearchResults([]))
                .finally(() => setSearching(false));
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const displayList = search.length >= 3 ? searchResults : members;
    const isNonMember = search.length >= 3 && !searching && searchResults.length === 0;

    const handleSelect = (email: string) => {
        onSelect(email);
        onClose();
        setSearch('');
    };

    const handleClear = () => {
        onSelect('');
        onClose();
        setSearch('');
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.kvContainer}
                pointerEvents="box-none"
            >
                <View style={[styles.sheet, { backgroundColor: isDark ? '#1c1c28' : '#fff', borderTopColor: colors.border }]}>
                    {/* Handle */}
                    <View style={styles.handleBar}>
                        <View style={[styles.handle, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>👤 Kişi Seç</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <View style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
                                <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Arama */}
                    <TextInput
                        style={[styles.searchInput, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                            color: colors.textPrimary,
                            borderColor: colors.border,
                        }]}
                        placeholder="E-posta ile ara..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    {/* Mevcut atama — temizle */}
                    {!!currentAssignee && (
                        <TouchableOpacity style={[styles.clearRow, { borderColor: colors.error }]} onPress={handleClear}>
                            <Text style={[styles.clearText, { color: colors.error }]}>✕ Atamayı Kaldır</Text>
                        </TouchableOpacity>
                    )}

                    {/* Liste */}
                    {loading ? (
                        <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
                    ) : (
                        <FlatList
                            data={displayList}
                            keyExtractor={item => item.email}
                            style={{ maxHeight: 280 }}
                            renderItem={({ item }) => {
                                const isSelected = item.email === currentAssignee;
                                return (
                                    <TouchableOpacity
                                        style={[styles.memberRow, {
                                            backgroundColor: isSelected
                                                ? `${colors.accent}18`
                                                : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                                        }]}
                                        onPress={() => handleSelect(item.email)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.avatar, { backgroundColor: item.avatar_url ? 'transparent' : getColor(item.email) }]}>
                                            {item.avatar_url ? (
                                                <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                                            ) : (
                                                <Text style={styles.avatarText}>{getAvatar(item.email)}</Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.memberEmail, { color: colors.textPrimary }]} numberOfLines={1}>
                                                {item.email}
                                                {item.is_self && (
                                                    <Text style={[styles.selfBadge, { color: colors.accent }]}> (Siz)</Text>
                                                )}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                !searching ? (
                                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                        {search.length >= 3 ? 'Kullanıcı bulunamadı' : 'Üye yok'}
                                    </Text>
                                ) : null
                            }
                        />
                    )}

                    {/* Davet seçeneği */}
                    {isNonMember && search.includes('@') && onInvite && (
                        <View style={[styles.inviteBox, { borderColor: colors.accent, backgroundColor: `${colors.accent}0d` }]}>
                            <Text style={[styles.inviteHint, { color: colors.textSecondary }]}>
                                "{search}" bu panoda üye değil.
                            </Text>
                            <TouchableOpacity
                                style={[styles.inviteBtn, { borderColor: colors.accent }]}
                                onPress={() => { onInvite(search); onClose(); setSearch(''); }}
                            >
                                <Text style={[styles.inviteBtnText, { color: colors.accent }]}>+ Ekip Daveti Gönder</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {Platform.OS === 'ios' && <View style={{ height: 20 }} />}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    kvContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 20,
    },
    handleBar: { alignItems: 'center', paddingVertical: 8 },
    handle: { width: 40, height: 4, borderRadius: 2 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: '700' },
    closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { fontSize: 13, fontWeight: '600' },
    searchInput: {
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        borderWidth: 1.5,
        marginBottom: 10,
    },
    clearRow: {
        borderWidth: 1.5,
        borderRadius: 10,
        padding: 9,
        alignItems: 'center',
        marginBottom: 10,
    },
    clearText: { fontSize: 13, fontWeight: '700' },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        borderRadius: 10,
        marginBottom: 6,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
    },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    memberEmail: { fontSize: 13, fontWeight: '600' },
    selfBadge: { fontSize: 11, fontWeight: '700' },
    checkmark: { fontSize: 16, fontWeight: '900', marginLeft: 4 },
    emptyText: { textAlign: 'center', fontSize: 13, paddingVertical: 16 },
    inviteBox: {
        borderWidth: 1.5,
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        gap: 8,
    },
    inviteHint: { fontSize: 12 },
    inviteBtn: {
        borderWidth: 1.5,
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
    },
    inviteBtnText: { fontSize: 13, fontWeight: '700' },
});

export default AssigneePicker;
