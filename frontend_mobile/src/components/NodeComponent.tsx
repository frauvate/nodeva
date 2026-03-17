import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { NodeItem } from '../types/models';

interface Props {
  node: NodeItem;
  style?: ViewStyle;
}

const NodeComponent: React.FC<Props> = ({ node, style }) => {
  return (
    <View
      style={[
        styles.node,
        {
          backgroundColor: node.data.color || '#FFFFFF',
          left: node.position.x,
          top: node.position.y,
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {node.data.title || 'Untitled'}
        </Text>
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.content} numberOfLines={4}>
          {node.data.content || 'No content...'}
        </Text>
      </View>
      {node.data.assignee && (
        <View style={styles.footer}>
          <Text style={styles.assignee}>@{node.data.assignee}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    width: 200,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  contentContainer: {
    minHeight: 60,
  },
  content: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  assignee: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default NodeComponent;
