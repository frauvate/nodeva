import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useBoardStore } from '../store/useBoardStore';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import NodeComponent from '../components/NodeComponent';

type Props = StackScreenProps<RootStackParamList, 'Board'>;

const BoardScreen: React.FC<Props> = ({ route }) => {
  const { boardId } = route.params;
  const { activeBoard, selectBoard, isLoading, error } = useBoardStore();

  useEffect(() => {
    selectBoard(boardId);
  }, [boardId, selectBoard]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!activeBoard) {
    return (
      <View style={styles.centered}>
        <Text>Board not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.canvas} horizontal>
        <ScrollView contentContainerStyle={styles.canvas}>
          {activeBoard.nodes.map((node) => (
            <NodeComponent key={node.id} node={node} />
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    minWidth: 2000,
    minHeight: 2000,
    position: 'relative',
  },
  node: {
    position: 'absolute',
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  nodeTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  nodeContent: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default BoardScreen;
