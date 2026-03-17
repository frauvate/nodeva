import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useBoardStore } from '../store/useBoardStore';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = StackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { boards, fetchBoards, isLoading, error } = useBoardStore();

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={boards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.boardCard}
            onPress={() => navigation.navigate('Board', { boardId: item.id })}
          >
            <Text style={styles.boardTitle}>{item.title}</Text>
            <Text style={styles.boardMeta}>Nodes: {item.nodes.length}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boardCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  boardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  boardMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default HomeScreen;
