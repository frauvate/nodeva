import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { NodeItem } from '../types/models';
import { useTheme } from '../context/ThemeContext';
import { useBoardStore } from '../store/useBoardStore';

interface Props {
  node: NodeItem;
  style?: ViewStyle;
}

const NodeComponent: React.FC<Props> = ({ node, style }) => {
  const { colors, isDark } = useTheme();
  const { deleteNode, saveBoard } = useBoardStore();

  const handleDelete = () => {
    deleteNode(node.id);
    saveBoard();
  };

  const getNodeBg = () => {
    const color = node.data.color || '#FFFFFF';
    if (!isDark) return color;
    if (color.toUpperCase() === '#E3F2FD') return colors.nodeBlue;
    if (color.toUpperCase() === '#E8F5E9') return colors.nodeGreen;
    if (color.toUpperCase() === '#F3E5F5') return colors.nodePurple;
    if (color.toUpperCase() === '#FFFFFF') return '#2A2A2A';
    return color;
  };

  return (
    <View
      style={[
        styles.node,
        {
          backgroundColor: getNodeBg(),
          borderColor: colors.border,
          left: node.position.x,
          top: node.position.y,
        },
        style,
      ]}
    >
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {node.data.title || 'Untitled'}
        </Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.deleteText, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.content, { color: isDark ? '#CCC' : '#4A4A4A' }]} numberOfLines={4}>
          {node.data.content || 'No content...'}
        </Text>
      </View>
      {node.data.assignee && (
        <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={styles.assignee}>@{node.data.assignee}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  node: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  deleteText: {
    fontSize: 18,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  contentContainer: {
    minHeight: 60,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  assignee: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default NodeComponent;
