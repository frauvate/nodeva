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

interface AddNodeDialogProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; content: string; type: string; color: string }) => void;
}

const ACCENT_COLORS_LIGHT = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const ACCENT_COLORS_DARK  = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'];

const AddNodeDialog: React.FC<AddNodeDialogProps> = ({ visible, onClose, onAdd }) => {
  const { colors, isDark } = useTheme();
  const [title, setTitle]           = useState('');
  const [content, setContent]       = useState('');
  const [type, setType]             = useState<'note' | 'task'>('note');
  const [selectedColor, setSelectedColor] = useState('');

  const palette = isDark ? ACCENT_COLORS_DARK : ACCENT_COLORS_LIGHT;

  const handleAdd = () => {
    if (!title.trim()) return;
    const color = selectedColor || palette[0];
    onAdd({ title: title.trim(), content: content.trim(), type, color });
    // Formu sıfırla
    setTitle('');
    setContent('');
    setType('note');
    setSelectedColor('');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setType('note');
    setSelectedColor('');
    onClose();
  };

  const typeOptions: { key: 'note' | 'task'; icon: string; label: string }[] = [
    { key: 'note', icon: '📝', label: 'Not' },
    { key: 'task', icon: '✅', label: 'Görev' },
  ];

  const isValid = title.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Overlay – kapatma alanı */}
      <Pressable style={styles.overlay} onPress={handleClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvContainer}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#1c1c28' : '#ffffff',
              borderTopColor: colors.border,
            },
          ]}
        >
          {/* Tutamaç */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Başlık */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Yeni Öğe Ekle</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
                <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* ── Tür Seçimi ── */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tür</Text>
            <View style={styles.typeRow}>
              {typeOptions.map(({ key, icon, label }) => {
                const isActive = type === key;
                const accentColor = key === 'note'
                  ? (isDark ? '#34d399' : '#10b981')
                  : (isDark ? '#818cf8' : '#6366f1');
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.typeBtn,
                      {
                        backgroundColor: isActive ? `${accentColor}18` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                        borderColor: isActive ? accentColor : colors.border,
                      },
                    ]}
                    onPress={() => setType(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.typeBtnIcon}>{icon}</Text>
                    <Text style={[styles.typeBtnLabel, { color: isActive ? accentColor : colors.textSecondary }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Başlık ── */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Başlık *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                  color: colors.textPrimary,
                  borderColor: title.trim() ? colors.accent : colors.border,
                },
              ]}
              placeholder={type === 'task' ? 'Görev başlığı...' : 'Not başlığı...'}
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              autoFocus
            />

            {/* ── İçerik ── */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>İçerik</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              placeholder={type === 'task' ? 'Görev açıklaması...' : 'Not içeriği...'}
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* ── Renk ── */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Renk Etiketi</Text>
            <View style={styles.colorRow}>
              {/* "Yok" seçeneği */}
              <TouchableOpacity
                style={[
                  styles.colorChip,
                  styles.colorChipNone,
                  {
                    borderColor: selectedColor === '' ? colors.accent : colors.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  },
                ]}
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
                  {selectedColor === color && (
                    <Text style={styles.colorCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* ── Ekle Butonu ── */}
          <TouchableOpacity
            style={[
              styles.addBtn,
              {
                backgroundColor: isValid ? colors.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
              },
            ]}
            onPress={handleAdd}
            disabled={!isValid}
            activeOpacity={0.8}
          >
            <Text style={[styles.addBtnText, { color: isValid ? colors.accentText : colors.textMuted }]}>
              {type === 'task' ? '✅ Görevi Ekle' : '📝 Notu Ekle'}
            </Text>
          </TouchableOpacity>

          {/* iOS için ekstra padding */}
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
    maxHeight: '88%',
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
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  typeBtnIcon: {
    fontSize: 18,
  },
  typeBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  textArea: {
    height: 96,
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipNone: {
    borderWidth: 1.5,
  },
  colorChipNoneText: {
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  addBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default AddNodeDialog;
