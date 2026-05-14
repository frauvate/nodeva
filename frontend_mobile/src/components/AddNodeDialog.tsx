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

import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

interface AddNodeDialogProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; content: string; type: string; color: string }) => void;
  boardTemplate?: string;
  initialType?: string;
}

const ACCENT_COLORS_LIGHT = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const ACCENT_COLORS_DARK  = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'];

const FLOW_SHAPES = [
  { key: 'flow_start',    icon: 'ellipse-outline', provider: 'Ionicons', label: 'Başlangıç' },
  { key: 'flow_process',  icon: 'square-outline',  provider: 'Ionicons', label: 'İşlem' },
  { key: 'flow_decision', icon: 'rhombus-outline', provider: 'MaterialCommunityIcons', label: 'Karar' },
  { key: 'flow_data',     icon: 'card-outline',    provider: 'Ionicons', label: 'Veri' },
];

const AddNodeDialog: React.FC<AddNodeDialogProps> = ({ 
  visible, 
  onClose, 
  onAdd, 
  boardTemplate = 'basic',
  initialType
}) => {
  const { colors, isDark } = useTheme();
  const [title, setTitle]           = useState('');
  const [content, setContent]       = useState('');
  const [type, setType]             = useState<string>(initialType || (boardTemplate === 'flowchart' ? 'flow_process' : 'note'));
  const [selectedColor, setSelectedColor] = useState('');

  // Update type when initialType changes
  React.useEffect(() => {
    if (initialType) setType(initialType);
  }, [initialType]);

  const palette = isDark ? ACCENT_COLORS_DARK : ACCENT_COLORS_LIGHT;

  const handleAdd = () => {
    if (!title.trim()) return;
    const color = selectedColor || palette[0];
    onAdd({ title: title.trim(), content: content.trim(), type, color });
    // Formu sıfırla
    setTitle('');
    setContent('');
    setType(boardTemplate === 'flowchart' ? 'flow_process' : 'note');
    setSelectedColor('');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setType(boardTemplate === 'flowchart' ? 'flow_process' : 'note');
    setSelectedColor('');
    onClose();
  };

  // Build type options based on boardTemplate
  const typeOptions = boardTemplate === 'flowchart'
    ? [
        { key: 'note', icon: 'file-text', provider: 'Feather', label: 'Not' },
        ...FLOW_SHAPES.map(s => ({ key: s.key, icon: s.icon, provider: s.provider, label: s.label })),
      ]
    : [
        { key: 'note', icon: 'file-text', provider: 'Feather', label: 'Not' },
        { key: 'task', icon: 'check-square', provider: 'Feather', label: 'Görev' },
      ];

  const isFlowType = FLOW_SHAPES.some(s => s.key === type);
  const isValid = title.trim().length > 0;

  const renderIcon = (provider: string, name: string, size: number, color: string) => {
    if (provider === 'Feather') return <Feather name={name as any} size={size} color={color} />;
    if (provider === 'Ionicons') return <Ionicons name={name as any} size={size} color={color} />;
    if (provider === 'MaterialCommunityIcons') return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
    return null;
  };

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {initialType && (
                <View style={[styles.typeIconBadge, { backgroundColor: `${colors.accent}15` }]}>
                  {renderIcon(
                    typeOptions.find(o => o.key === type)?.provider || 'Feather',
                    typeOptions.find(o => o.key === type)?.icon || 'plus',
                    20,
                    colors.accent
                  )}
                </View>
              )}
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Yeni Öğe Ekle</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
                <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>✕</Text>
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* ── Tür Seçimi (Sadece başlangıçta tür seçilmemişse veya her zaman görünürse) ── */}
            {!initialType && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Tür</Text>
                <View style={[styles.typeRow, boardTemplate === 'flowchart' && styles.typeRowGrid]}>
                  {typeOptions.map(({ key, icon, provider, label }) => {
                    const isActive = type === key;
                    const accentColor = key === 'note'
                      ? (isDark ? '#34d399' : '#10b981')
                      : key === 'task'
                      ? (isDark ? '#818cf8' : '#6366f1')
                      : (isDark ? '#a78bfa' : '#7c3aed');
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          boardTemplate === 'flowchart' ? styles.typeCardSmall : styles.typeBtn,
                          {
                            backgroundColor: isActive ? `${accentColor}18` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                            borderColor: isActive ? accentColor : colors.border,
                          },
                        ]}
                        onPress={() => setType(key as any)}
                        activeOpacity={0.7}
                      >
                        {renderIcon(provider, icon, boardTemplate === 'flowchart' ? 22 : 18, isActive ? accentColor : colors.textSecondary)}
                        <Text style={[styles.typeBtnLabel, { color: isActive ? accentColor : colors.textSecondary, fontSize: boardTemplate === 'flowchart' ? 11 : 15 }]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

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
              placeholder={
                isFlowType ? `${type === 'flow_decision' ? 'Karar sorusu' : type === 'flow_data' ? 'Veri adı' : 'Şekil başlığı'}...`
                : type === 'task' ? 'Görev başlığı...' : 'Not başlığı...'
              }
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
              {isFlowType ? `${FLOW_SHAPES.find(s => s.key === type)?.label ?? 'Şekil'} Ekle`
                : type === 'task' ? 'Görevi Ekle' : 'Notu Ekle'}
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
  typeIconBadge: {
    width: 36,
    height: 36,
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
    flexWrap: 'wrap',
  },
  typeRowGrid: {
    flexWrap: 'wrap',
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
    minWidth: '45%',
  },
  typeCardSmall: {
    width: '22%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  typeBtnIcon: { fontSize: 18 },
  typeBtnIconLarge: { fontSize: 22 },
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
