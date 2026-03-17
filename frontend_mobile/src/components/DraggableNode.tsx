import React from 'react';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { NodeItem, Position } from '../types/models';
import NodeComponent from './NodeComponent';

interface Props {
  node: NodeItem;
  onDragEnd: (id: string, position: Position) => void;
}

const DraggableNode: React.FC<Props> = ({ node, onDragEnd }) => {
  const translateX = useSharedValue(node.position.x);
  const translateY = useSharedValue(node.position.y);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number; startY: number }>({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: () => {
      runOnJS(onDragEnd)(node.id, { x: translateX.value, y: translateY.value });
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  // Since we use translateX/translateY, we reset absolute positioning in the component
  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[animatedStyle, { position: 'absolute' }]}>
        <NodeComponent node={{ ...node, position: { x: 0, y: 0 } }} />
      </Animated.View>
    </PanGestureHandler>
  );
};

export default DraggableNode;
