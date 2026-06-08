import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { NodeItem, TaskStatus } from '../types/models';
import AssigneePicker from './AssigneePicker';
import { teamAPI } from '../services/api';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

interface EditNodeSheetProps {
  visible: boolean;
  node: NodeItem | null;
  boardId?: string;
  teamId?: string;
  onClose: () => void;
  onSave: (nodeId: string, updates: { title: string; content: string; color: string; assignee?: string; status?: TaskStatus; startDate?: string; endDate?: string; progress?: number }) => void;
  onDelete: (nodeId: string) => void;
}

const STATUS_OPTIONS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo',        label: 'Başlamadı',     color: '#ef4444' },
  { key: 'in_progress', label: 'Devam Ediyor',  color: '#f59e0b' },
  { key: 'done',        label: 'Bitti',          color: '#10b981' },
];

const ACCENT_COLORS_LIGHT = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const ACCENT_COLORS_DARK  = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'];

const EditNodeSheet: React.FC<EditNodeSheetProps> = ({ visible, node, boardId = '', teamId, onClose, onSave, onDelete }) => {
  const { colors, isDark } = useTheme();

  const [title, setTitle]           = useState('');
  const [content, setContent]       = useState('');
  const [assignee, setAssignee]     = useState('');
  const [status, setStatus]         = useState<TaskStatus>('todo');
  const [selectedColor, setSelectedColor] = useState('');
  const [assigneePickerVisible, setAssigneePickerVisible] = useState(false);
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [progress, setProgress]     = useState('');

  const palette   = isDark ? ACCENT_COLORS_DARK : ACCENT_COLORS_LIGHT;
  const isTask    = node?.type === 'task';
  const isMindmap = node?.type.startsWith('mindmap_') ?? false;
  const isTimeline = !!(node?.data?.startDate || node?.data?.endDate);

  /* Node değişince formu doldur */
  React.useEffect(() => {
    if (node) {
      setTitle(node.data.title || '');
      setContent(node.data.content || '');
      setAssignee(node.data.assignee || '');
      setStatus((node.data.status as TaskStatus) || 'todo');
      setSelectedColor(node.data.color || '');
      setStartDate(node.data.startDate || '');
      setEndDate(node.data.endDate || '');
      setProgress(node.data.progress !== undefined ? String(node.data.progress) : '');
    }
  }, [node]);

  const handleSave = () => {
    if (!node || !title.trim()) return;
    onSave(node.id, {
      title:    title.trim(),
      content:  content.trim(),
      color:    selectedColor || palette[0],
      assignee: isTask && !isTimeline ? assignee.trim() : undefined,
      status:   isTask && !isTimeline ? status : undefined,
      startDate: isTimeline ? (startDate || undefined) : undefined,
      endDate:   isTimeline ? (endDate   || undefined) : undefined,
      progress:  isTimeline ? (parseInt(progress, 10) || 0) : undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!node) return;
    onDelete(node.id);
    onClose();
  };

  const isValid = title.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvContainer}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { backgroundColor: isDark ? '#1c1c28' : '#ffffff', borderTopColor: colors.border }]}>

          {/* Tutamaç */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Başlık satırı */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.typeIconBadge, { backgroundColor: `${colors.accent}15` }]}>
                {isTask ? (
                  <Feather name="check-square" size={20} color={colors.accent} />
                ) : isMindmap ? (
                  <Feather name="git-branch" size={20} color={colors.accent} />
                ) : (
                  <Feather name="file-text" size={20} color={colors.accent} />
                )}
              </View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {isTask ? 'Görevi Düzenle' : isMindmap ? 'Konuyu Düzenle' : 'Notu Düzenle'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
                <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Başlık */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Başlık *</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                color: colors.textPrimary,
                borderColor: title.trim() ? colors.accent : colors.border,
              }]}
              placeholder="Başlık..."
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            {/* İçerik — mindmap ve timeline dışında göster */}
            {!isMindmap && !isTimeline && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>İçerik</Text>
                <TextInput
                  style={[styles.input, styles.textArea, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  }]}
                  placeholder="İçerik..."
                  placeholderTextColor={colors.textMuted}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </>
            )}

            {/* Timeline tarih + ilerleme alanları */}
            {isTimeline && (
              <>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Başlangıç</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)', color: colors.textPrimary, borderColor: colors.border }]}
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-AA-GG"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Bitiş</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)', color: colors.textPrimary, borderColor: colors.border }]}
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="YYYY-AA-GG"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
                <Text style={[styles.label, { color: colors.textSecondary }]}>İlerleme (0-100)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)', color: colors.textPrimary, borderColor: colors.border }]}
                  value={progress}
                  onChangeText={setProgress}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </>
            )}

            {/* Görev alanları — timeline dışında */}
            {isTask && !isTimeline && (
              <>
                {/* Durum Seçici */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>Durum</Text>
                <View style={styles.statusRow}>
                  {STATUS_OPTIONS.map(({ key, label, color }) => {
                    const isActive = status === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.statusBtn,
                          {
                            borderColor: isActive ? color : colors.border,
                            backgroundColor: isActive ? `${color}18` : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                          },
                        ]}
                        onPress={() => setStatus(key)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.statusDot, { backgroundColor: color, opacity: isActive ? 1 : 0.35 }]} />
                        <Text style={[styles.statusLabel, { color: isActive ? color : colors.textSecondary }]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Atanan Kişi */}
                <Text style={[styles.label, { color: colors.textSecondary }]}>Atanan Kişi</Text>
                {/* Seçili kullanıcı göster veya seçme butonu */}
                <TouchableOpacity
                  style={[styles.assigneeBtn, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                    borderColor: assignee ? colors.accent : colors.border,
                  }]}
                  onPress={() => setAssigneePickerVisible(true)}
                  activeOpacity={0.8}
                >
                  {assignee ? (
                    <>
                      <View style={[styles.assigneeAvatar, { backgroundColor: colors.accent }]}>
                        <Text style={styles.assigneeAvatarText}>{assignee[0].toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.assigneeEmail, { color: colors.textPrimary }]} numberOfLines={1}>
                        {assignee}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setAssignee('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={[styles.assigneeClear, { color: colors.textMuted }]}>✕</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="user" size={16} color={colors.textMuted} />
                      <Text style={[styles.assigneePlaceholder, { color: colors.textMuted }]}>Kişi seç...</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Renk Etiketi */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Renk Etiketi</Text>
            <View style={styles.colorRow}>
              <TouchableOpacity
                style={[styles.colorChip, styles.colorChipNone, {
                  borderColor: selectedColor === '' ? colors.accent : colors.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }]}
                onPress={() => setSelectedColor('')}
              >
                <Text style={[styles.colorChipNoneText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
              {palette.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorChip,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorChipSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <Text style={styles.colorCheckmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Aksiyon Butonları */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.deleteBtn2, { borderColor: colors.error }]}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Text style={[styles.deleteBtnText2, { color: colors.error }]}>Sil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, {
                backgroundColor: isValid ? colors.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                flex: 2,
              }]}
              onPress={handleSave}
              disabled={!isValid}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveBtnText, { color: isValid ? colors.accentText : colors.textMuted }]}>
                Kaydet
              </Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === 'ios' && <View style={{ height: 20 }} />}
        </View>
      </KeyboardAvoidingView>

      {/* AssigneePicker Modal */}
      <AssigneePicker
        visible={assigneePickerVisible}
        boardId={boardId}
        currentAssignee={assignee}
        onSelect={(email) => setAssignee(email)}
        onClose={() => setAssigneePickerVisible(false)}
        onInvite={teamId ? async (email) => {
          try {
            await teamAPI.inviteMember(teamId, email);
          } catch { /* sessiz */ }
        } : undefined}
      />
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
    maxHeight: '90%',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  typeIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  /* Status */
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  /* Colors */
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipNone: {
    borderWidth: 1.5,
  },
  colorChipNoneText: {
    fontSize: 13,
    fontWeight: '700',
  },
  colorChipSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorCheckmark: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  /* Assignee button */
  assigneeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
    minHeight: 48,
  },
  assigneeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  assigneeAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  assigneeEmail: { flex: 1, fontSize: 14, fontWeight: '600' },
  assigneeClear: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  assigneePlaceholder: { fontSize: 14 },
  /* Actions */
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  deleteBtn2: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText2: {
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default EditNodeSheet;
