import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useBoardStore } from '../store/useBoardStore';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { Board } from '../types/models';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { boards, fetchBoards, createBoard, isLoading, error } = useBoardStore();
  const { colors, toggleTheme, isDark } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleCreateBoard = async () => {
    if (newBoardTitle.trim() && !isLoading) {
      const title = newBoardTitle.trim();
      const createdBoard = await createBoard(title);
      
      if (createdBoard) {
        setNewBoardTitle('');
        setIsModalVisible(false);
        navigation.navigate('Board', { boardId: createdBoard.id });
      }
    }
  };

  const renderBoardItem = ({ item }: { item: Board }) => (
    <TouchableOpacity
      style={[styles.boardCard, { 
        backgroundColor: isDark ? '#1E1E1E' : '#FFF',
        borderColor: colors.border
      }]}
      onPress={() => {
        navigation.navigate('Board', { boardId: item.id });
      }}
      activeOpacity={0.7}
    >
      <Text style={[styles.boardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
      <Text style={[styles.boardMeta, { color: colors.textSecondary }]}>
        Nodes: {item.nodes?.length || 0}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading && boards.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error && boards.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 24 }]}>
        <Text style={{ color: '#FF5252', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>{error}</Text>
        <TouchableOpacity 
          style={[styles.modalButton, { backgroundColor: colors.accent, paddingHorizontal: 32 }]}
          onPress={fetchBoards}
        >
          <Text style={{ color: isDark ? '#000' : '#FFF', fontWeight: 'bold' }}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={boards}
        keyExtractor={(item) => item.id}
        renderItem={renderBoardItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 100 }}>
            <Text style={{ color: colors.textSecondary }}>Henüz hiç pano yok. Sağ alttaki butona basarak oluşturabilirsin.</Text>
          </View>
        )}
      />
      
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.accent }]} 
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.fabText, { color: isDark ? '#000' : '#FFF' }]}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isLoading && setIsModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E1E1E' : '#FFF' }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Yeni Pano</Text>
            
            {error && (
              <Text style={{ color: '#FF5252', marginBottom: 12, fontSize: 13 }}>{error}</Text>
            )}

            <TextInput
              style={[styles.input, { 
                color: colors.textPrimary, 
                borderColor: error ? '#FF5252' : colors.border,
                backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5'
              }]}
              placeholder="Pano başlığı..."
              placeholderTextColor={colors.textSecondary}
              value={newBoardTitle}
              onChangeText={setNewBoardTitle}
              autoFocus
              editable={!isLoading}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => setIsModalVisible(false)}
                disabled={isLoading}
              >
                <Text style={{ color: colors.textSecondary }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.createButton, { backgroundColor: colors.accent, opacity: isLoading ? 0.7 : 1 }]} 
                onPress={handleCreateBoard}
                disabled={isLoading || !newBoardTitle.trim()}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={isDark ? '#000' : '#FFF'} />
                ) : (
                  <Text style={{ color: isDark ? '#000' : '#FFF', fontWeight: 'bold' }}>Oluştur</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  boardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  boardMeta: {
    fontSize: 14,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1000,
  },
  fabText: {
    fontSize: 36,
    marginTop: -2,
    textAlign: 'center',
    lineHeight: 42,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
  },
  createButton: {
    minWidth: 80,
    alignItems: 'center',
  }
});

export default HomeScreen;
