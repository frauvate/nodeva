import React from 'react';
import { View, StyleSheet, Dimensions, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withDecay } from 'react-native-reanimated';
import { NodeItem, Position, EdgeItem } from '../types/models';
import DraggableNode from './DraggableNode';
import { useTheme } from '../context/ThemeContext';
import Svg, { Line, Defs, Marker, Path } from 'react-native-svg';
import { useState } from 'react';

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
const NODE_H = 130; // Updated to match exact compact card height

const HANDLE_OFFSETS: Record<string, { cx: number; cy: number }> = {
  top: { cx: NODE_W / 2, cy: 0 },
  right: { cx: NODE_W, cy: NODE_H / 2 },
  bottom: { cx: NODE_W / 2, cy: NODE_H },
  left: { cx: 0, cy: NODE_H / 2 },
};

function getHandlePos(node: NodeItem, handle: string) {
  const off = HANDLE_OFFSETS[handle] ?? HANDLE_OFFSETS['right'];
  return { x: (node.position?.x || 0) + off.cx, y: (node.position?.y || 0) + off.cy };
}

const MobileCanvas: React.FC<Props> = ({ nodes, edges, onNodeDragEnd, onNodeDelete, onNodeEdit, onConnectNodes, onEdgeDelete }) => {
  const { colors, isDark } = useTheme();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const handleNodePress = (id: string) => {
    if (!connectingFrom) {
      setConnectingFrom(id);
    } else {
      if (connectingFrom !== id) {
        onConnectNodes(connectingFrom, id);
      }
      setConnectingFrom(null);
    }
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      // Limit zoom between 0.5x and 2x
      const newScale = savedScale.value * e.scale;
      scale.value = Math.max(0.5, Math.min(newScale, 2.0));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .minDistance(10) // Allow taps to pass through to nodes
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // A subtle pattern background
  const dotColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.canvas, animatedStyle]}>
          <Svg style={[StyleSheet.absoluteFill, { overflow: 'visible' }]} width="100%" height="100%">
            <Defs>
              <Marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <Path d="M 0 0 L 10 5 L 0 10 z" fill={colors.textSecondary} />
              </Marker>
            </Defs>
            {edges.map(edge => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              const sHandle = edge.sourceHandle || 'right';
              const tHandle = edge.targetHandle || 'left';
              
              const sPos = getHandlePos(sourceNode, sHandle);
              const tPos = getHandlePos(targetNode, tHandle);

              // Smart curve based on handle orientation
              let d = '';
              if (sHandle === 'bottom' || sHandle === 'top' || tHandle === 'top' || tHandle === 'bottom') {
                const cy = (sPos.y + tPos.y) / 2;
                d = `M ${sPos.x} ${sPos.y} C ${sPos.x} ${cy}, ${tPos.x} ${cy}, ${tPos.x} ${tPos.y}`;
              } else {
                const cx = (sPos.x + tPos.x) / 2;
                d = `M ${sPos.x} ${sPos.y} C ${cx} ${sPos.y}, ${cx} ${tPos.y}, ${tPos.x} ${tPos.y}`;
              }

              return (
                <React.Fragment key={edge.id}>
                  {/* Visible path */}
                  <Path 
                    d={d}
                    stroke={colors.textSecondary}
                    strokeWidth={2.5}
                    fill="none"
                    markerEnd="url(#arrow)"
                    opacity={0.8}
                  />
                  {/* Invisible hit area for deletion */}
                  <Path
                    d={d}
                    stroke="transparent"
                    strokeWidth={20}
                    fill="none"
                    onPress={() => {
                      Alert.alert(
                        "Bağlantıyı Sil",
                        "Bu bağlantıyı silmek istediğinize emin misiniz?",
                        [
                          { text: "İptal", style: "cancel" },
                          { text: "Sil", style: "destructive", onPress: () => {
                            onEdgeDelete?.(edge.id);
                          }}
                        ]
                      );
                    }}
                  />
                </React.Fragment>
              );
            })}
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
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    overflow: 'visible',
  },
});

export default MobileCanvas;
