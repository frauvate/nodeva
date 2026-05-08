import React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { NodeItem, Position } from '../types/models';
import NodeComponent from './NodeComponent';

interface Props {
  node: NodeItem;
  onDragEnd: (id: string, position: Position) => void;
  onDelete: (id: string) => void;
  onEdit: (node: NodeItem) => void;
  onPress?: (id: string) => void;
  isConnectingSource?: boolean;
}

const DraggableNode: React.FC<Props> = ({ node, onDragEnd, onDelete, onEdit, onPress, isConnectingSource }) => {
  const isPressed = useSharedValue(false);
  const offset = useSharedValue({ x: node.position.x, y: node.position.y });
  const translation = useSharedValue({ x: 0, y: 0 });

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onBegin(() => {
      isPressed.value = true;
    })
    .onUpdate((e) => {
      translation.value = {
        x: e.translationX,
        y: e.translationY,
      };
    })
    .onEnd(() => {
      offset.value = {
        x: offset.value.x + translation.value.x,
        y: offset.value.y + translation.value.y,
      };
      translation.value = { x: 0, y: 0 };
      isPressed.value = false;
      runOnJS(onDragEnd)(node.id, { x: offset.value.x, y: offset.value.y });
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      if (onPress) {
        runOnJS(onPress)(node.id);
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  // Sync internal state when node.position changes from outside (e.g. store update)
  useAnimatedReaction(
    () => node.position,
    (newPos: Position) => {
      if (!isPressed.value) {
        offset.value = { x: newPos.x, y: newPos.y };
      }
    },
    [node.position]
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value.x + translation.value.x },
        { translateY: offset.value.y + translation.value.y },
        { scale: withSpring(isPressed.value ? 1.05 : 1) },
      ],
      zIndex: isPressed.value ? 100 : 1,
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[animatedStyle, { position: 'absolute', top: 0, left: 0 }]}>
        <NodeComponent 
          node={{ ...node, position: { x: 0, y: 0 } }} 
          onDelete={onDelete}
          onEdit={onEdit}
          onPress={() => onPress && onPress(node.id)}
          isConnectingSource={isConnectingSource}
          compact={true}
        />
      </Animated.View>
    </GestureDetector>
  );
};

export default DraggableNode;
