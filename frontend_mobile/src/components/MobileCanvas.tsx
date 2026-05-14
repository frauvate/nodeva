import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { NodeItem, Position, EdgeItem } from '../types/models';
import DraggableNode from './DraggableNode';
import { useTheme } from '../context/ThemeContext';
import Svg, { Defs, Marker, Path, G } from 'react-native-svg';

interface Props {
  nodes: NodeItem[];
  edges: EdgeItem[];
  onNodeDragEnd: (id: string, position: Position) => void;
  onNodeDelete: (id: string) => void;
  onNodeEdit: (node: NodeItem) => void;
  onConnectNodes: (sourceId: string, targetId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
}

const NODE_W = 200;
const NODE_H = 160;

const HANDLE_OFFSETS: Record<string, { cx: number; cy: number }> = {
  top:    { cx: NODE_W / 2, cy: 0 },
  right:  { cx: NODE_W,     cy: NODE_H / 2 },
  bottom: { cx: NODE_W / 2, cy: NODE_H },
  left:   { cx: 0,          cy: NODE_H / 2 },
};

function getHandlePos(node: NodeItem, handle: string | null | undefined) {
  const raw  = (handle || 'right').split('-').pop() || 'right';
  const off  = HANDLE_OFFSETS[raw] || HANDLE_OFFSETS.right;
  const nx   = Number(node.position?.x) || 0;
  const ny   = Number(node.position?.y) || 0;
  return { x: nx + off.cx, y: ny + off.cy };
}

const MobileCanvas: React.FC<Props> = ({
  nodes, edges, onNodeDragEnd, onNodeDelete, onNodeEdit, onConnectNodes, onEdgeDelete,
}) => {
  const { colors } = useTheme();

  const scale      = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTX    = useSharedValue(0);
  const savedTY    = useSharedValue(0);

  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const handleNodePress = (id: string) => {
    if (!connectingFrom) {
      setConnectingFrom(id);
    } else {
      if (connectingFrom !== id) onConnectNodes(connectingFrom, id);
      setConnectingFrom(null);
    }
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(0.1, Math.min(savedScale.value * e.scale, 5));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate(e => {
      translateX.value = savedTX.value + e.translationX;
      translateY.value = savedTY.value + e.translationY;
    })
    .onEnd(() => {
      savedTX.value = translateX.value;
      savedTY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.canvas, animatedStyle]}>
          {/* Extremely simple SVG setup - fixed size for stability */}
          <Svg
            width={3000}
            height={3000}
            style={{ position: 'absolute', top: -500, left: -500 }}
            pointerEvents="box-none"
          >
            <Defs>
              <Marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <Path d="M 0 0 L 10 5 L 0 10 z" fill={colors.accent} />
              </Marker>
            </Defs>

            <G transform="translate(500, 500)">
              {edges.map(edge => {
                const src = nodes.find(n => String(n.id) === String(edge.source));
                const tgt = nodes.find(n => String(n.id) === String(edge.target));
                if (!src || !tgt) return null;

                const s = getHandlePos(src, edge.sourceHandle);
                const t = getHandlePos(tgt, edge.targetHandle);

                const rawHandle = (edge.sourceHandle || 'right').split('-').pop() || 'right';
                const isVertical = rawHandle === 'top' || rawHandle === 'bottom';
                
                const d = isVertical
                  ? `M ${s.x} ${s.y} C ${s.x} ${(s.y + t.y) / 2}, ${t.x} ${(s.y + t.y) / 2}, ${t.x} ${t.y}`
                  : `M ${s.x} ${s.y} C ${(s.x + t.x) / 2} ${s.y}, ${(s.x + t.x) / 2} ${t.y}, ${t.x} ${t.y}`;

                return (
                  <React.Fragment key={edge.id || `${edge.source}-${edge.target}`}>
                    <Path
                      d={d}
                      stroke={colors.accent}
                      strokeWidth={2.5}
                      fill="none"
                      markerEnd="url(#arrow)"
                      opacity={0.8}
                    />
                    <Path
                      d={d}
                      stroke="transparent"
                      strokeWidth={24}
                      fill="none"
                      onPress={() =>
                        Alert.alert(
                          'Sil',
                          'Bağlantıyı silmek istiyor musunuz?',
                          [
                            { text: 'İptal', style: 'cancel' },
                            { text: 'Sil', style: 'destructive', onPress: () => onEdgeDelete?.(edge.id) },
                          ],
                        )
                      }
                    />
                  </React.Fragment>
                );
              })}
            </G>
          </Svg>

          {nodes.map(node => (
            <DraggableNode
              key={node.id}
              node={node}
              onDragEnd={onNodeDragEnd}
              onDelete={onNodeDelete}
              onEdit={onNodeEdit}
              onPress={handleNodePress}
              isConnectingSource={connectingFrom === node.id}
            />
          ))}
        </Animated.View>

        {/* Debug info if no edges show up */}
        {edges.length > 0 && nodes.length > 0 && (
          <View style={styles.debug}>
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>
              {nodes.length} N / {edges.length} E
            </Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  canvas:    { flex: 1, overflow: 'visible' },
  debug: { position: 'absolute', top: 10, left: 10, padding: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4 },
});

export default MobileCanvas;
