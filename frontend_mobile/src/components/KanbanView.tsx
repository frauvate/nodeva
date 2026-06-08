import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { NodeItem, TaskStatus } from '../types/models';
import { useTheme } from '../context/ThemeContext';
import { Feather, Ionicons } from '@expo/vector-icons';
import NodeComponent from './NodeComponent';

const SCREEN_W = Dimensions.get('window').width;
const COLUMN_W = SCREEN_W * 0.82; // Beautiful column width that leaves next column partially visible

interface Props {
  boardId: string;
  nodes: NodeItem[];
  onNodeDelete: (id: string) => void;
  onNodeEdit: (node: NodeItem) => void;
  onAddNode: (status: TaskStatus, type: 'task' | 'note') => void;
  onUpdateNodeStatus: (id: string, status: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo',        label: 'Yapılacaklar',  color: '#ef4444' },
  { id: 'in_progress', label: 'Devam Edenler', color: '#f59e0b' },
  { id: 'done',        label: 'Tamamlananlar', color: '#10b981' },
];

/* ─── Draggable Card Wrapper ─── */
const KanbanCard: React.FC<{
  node: NodeItem;
  onDelete: (id: string) => void;
  onEdit: (node: NodeItem) => void;
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
}> = ({ node, onDelete, onEdit, onStatusChange }) => {
  const { colors, isDark } = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const currentStatus = (node.data.status as TaskStatus) || 'todo';

  const getTargetStatus = (tx: number): TaskStatus | null => {
    if (tx > 80) {
      if (currentStatus === 'todo') return 'in_progress';
      if (currentStatus === 'in_progress') return 'done';
    } else if (tx < -80) {
      if (currentStatus === 'done') return 'in_progress';
      if (currentStatus === 'in_progress') return 'todo';
    }
    return null;
  };

  const handleStatusUpdate = (targetStatus: TaskStatus) => {
    onStatusChange(node.id, targetStatus);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Don't steal vertical scrolling instantly
    .onBegin(() => {
      isDragging.value = true;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.2; // dampen vertical drag
    })
    .onEnd(() => {
      const target = getTargetStatus(translateX.value);
      if (target) {
        runOnJS(handleStatusUpdate)(target);
      }
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      isDragging.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => {
    const scale = withSpring(isDragging.value ? 1.04 : 1);
    const zIndex = isDragging.value ? 999 : 1;
    const opacity = isDragging.value ? 0.85 : 1;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale },
      ],
      zIndex,
      opacity,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[animatedStyle, styles.cardWrapper]}>
        <NodeComponent
          node={node}
          onDelete={onDelete}
          onEdit={onEdit}
          compact={false}
        />
      </Animated.View>
    </GestureDetector>
  );
};

/* ─── Kanban Board View ─── */
const KanbanView: React.FC<Props> = ({
  boardId,
  nodes,
  onNodeDelete,
  onNodeEdit,
  onAddNode,
  onUpdateNodeStatus,
}) => {
  const { colors, isDark } = useTheme();

  const getColNodes = (status: TaskStatus) => {
    return nodes.filter((n) => {
      const s = n.data.status || 'todo';
      return s === status;
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={COLUMN_W + 16}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {COLUMNS.map((col) => {
          const colNodes = getColNodes(col.id);

          return (
            <View
              key={col.id}
              style={[
                styles.column,
                {
                  backgroundColor: isDark ? '#1C1C28' : '#F9FAF8',
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Column Header */}
              <View style={[styles.colHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.statusDot, { backgroundColor: col.color }]} />
                  <Text style={[styles.colTitle, { color: colors.textPrimary }]}>
                    {col.label}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: `${col.color}18` }]}>
                    <Text style={[styles.badgeText, { color: col.color }]}>
                      {colNodes.length}
                    </Text>
                  </View>
                </View>

                {/* SVG-style Clean Action Buttons */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                    onPress={() => onAddNode(col.id, 'task')}
                    activeOpacity={0.7}
                  >
                    <Feather name="check-square" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                    onPress={() => onAddNode(col.id, 'note')}
                    activeOpacity={0.7}
                  >
                    <Feather name="file-text" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Column Content */}
              <ScrollView
                style={styles.cardList}
                contentContainerStyle={styles.cardListContent}
                showsVerticalScrollIndicator={false}
              >
                {colNodes.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Feather name="inbox" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
                      Öğe yok
                    </Text>
                  </View>
                ) : (
                  colNodes.map((node) => (
                    <KanbanCard
                      key={node.id}
                      node={node}
                      onDelete={onNodeDelete}
                      onEdit={onNodeEdit}
                      onStatusChange={onUpdateNodeStatus}
                    />
                  ))
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  column: {
    width: COLUMN_W,
    borderRadius: 24,
    borderWidth: 1.5,
    maxHeight: '97%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardList: {
    flex: 1,
  },
  cardListContent: {
    padding: 12,
    gap: 10,
  },
  cardWrapper: {
    marginBottom: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});

export default KanbanView;
