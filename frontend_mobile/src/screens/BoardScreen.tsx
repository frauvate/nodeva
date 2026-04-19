import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useBoardStore } from '../store/useBoardStore';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import DraggableNode from '../components/DraggableNode';
import { Position, NodeItem } from '../types/models';
import AddNodeDialog from '../components/AddNodeDialog';

type Props = StackScreenProps<RootStackParamList, 'Board'>;

const BoardScreen: React.FC<Props> = ({ route, navigation }: Props) => {
  const { boardId } = route.params;
  const { activeBoard, selectBoard, addNode, deleteNode, updateNodePosition, saveBoard, isLoading, error } = useBoardStore();
  const { colors, isDark } = useTheme();
  const [dialogVisible, setDialogVisible] = useState(false);

  useEffect(() => {
    selectBoard(boardId);
  }, [boardId, selectBoard]);

  const handleDragEnd = (id: string, pos: Position) => {
    updateNodePosition(id, pos);
    saveBoard();
  };

  const handleAddNode = (data: { title: string; content: string; type: string; color: string }) => {
    const newNode: NodeItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: data.type,
      position: { x: 100, y: 100 }, 
      data: { 
        title: data.title, 
        content: data.content, 
        color: data.color 
      },
    };

    addNode(newNode);
    saveBoard();
  };

  if (isLoading && !activeBoard) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error && !activeBoard) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 24 }]}>
        <Text style={{ color: '#FF5252', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>{error}</Text>
        <TouchableOpacity 
          style={[styles.fab, { position: 'relative', right: 0, bottom: 0, width: 'auto', borderRadius: 8, paddingHorizontal: 24 }]}
          onPress={() => selectBoard(boardId)}
        >
          <Text style={{ color: isDark ? '#000' : '#FFF', fontWeight: 'bold' }}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!activeBoard) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary, fontSize: 18 }}>Pano bulunamadı.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.accent }}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        horizontal
        contentContainerStyle={styles.canvasContainer}
        showsHorizontalScrollIndicator={true}
      >
        <ScrollView 
          contentContainerStyle={styles.canvasContainer}
          showsVerticalScrollIndicator={true}
        >
          {/* Main Board Area */}
          <View style={[styles.canvas, { backgroundColor: colors.background }]}>
            {activeBoard.nodes.map((node) => (
              <DraggableNode key={node.id} node={node} onDragEnd={handleDragEnd} />
            ))}
          </View>
        </ScrollView>
      </ScrollView>
      
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.accent }]} 
        onPress={() => setDialogVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.fabText, { color: isDark ? '#000' : '#FFF' }]}>+</Text>
      </TouchableOpacity>

      <AddNodeDialog 
        visible={dialogVisible} 
        onClose={() => setDialogVisible(false)} 
        onAdd={handleAddNode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasContainer: {
    minWidth: 3000,
    minHeight: 3000,
  },
  canvas: {
    width: '100%',
    height: '100%',
    position: 'relative',
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
    fontSize: 40,
    lineHeight: 45,
    textAlign: 'center',
  },
});

export default BoardScreen;
