import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AddNodeDialogProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; content: string; type: string; color: string }) => void;
}

const COLORS = [
  '#FFFFFF', // White
  '#E3F2FD', // Blue
  '#F3E5F5', // Purple
  '#E8F5E9', // Green
  '#FFF3E0', // Orange
  '#FFEBEE', // Red
];

const DARK_COLORS = [
  '#2A2A2A', // Dark Gray
  '#1A237E', // Dark Blue
  '#4A148C', // Dark Purple
  '#1B5E20', // Dark Green
  '#E65100', // Dark Orange
  '#B71C1C', // Dark Red
];

const AddNodeDialog: React.FC<AddNodeDialogProps> = ({ visible, onClose, onAdd }) => {
  const { colors, isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('note');
  const [selectedColor, setSelectedColor] = useState(isDark ? DARK_COLORS[0] : COLORS[0]);

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({ title, content, type, color: selectedColor });
    setTitle('');
    setContent('');
    setType('note');
    onClose();
  };

  const currentColors = isDark ? DARK_COLORS : COLORS;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Yeni Düğüm Ekle</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.accent, fontWeight: 'bold' }}>İptal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Başlık</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? '#333' : '#F5F5F5', 
                color: colors.textPrimary,
                borderColor: colors.border
              }]}
              placeholder="Düğüm başlığı..."
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>İçerik</Text>
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: isDark ? '#333' : '#F5F5F5', 
                color: colors.textPrimary,
                borderColor: colors.border
              }]}
              placeholder="Düğüm içeriği..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={content}
              onChangeText={setContent}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Tür</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  type === 'note' && { backgroundColor: colors.accent }
                ]}
                onPress={() => setType('note')}
              >
                <Text style={[styles.typeText, type === 'note' && { color: isDark ? '#000' : '#FFF' }]}>Not</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.typeButton, 
                  type === 'task' && { backgroundColor: colors.accent }
                ]}
                onPress={() => setType('task')}
              >
                <Text style={[styles.typeText, type === 'task' && { color: isDark ? '#000' : '#FFF' }]}>Görev</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Renk</Text>
            <View style={styles.colorContainer}>
              {currentColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    selectedColor === color && { borderWidth: 2, borderColor: colors.accent }
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={handleAdd}
          >
            <Text style={[styles.addButtonText, { color: isDark ? '#000' : '#FFF' }]}>Ekle</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCC',
    alignItems: 'center',
  },
  typeText: {
    fontWeight: '600',
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  addButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddNodeDialog;
