import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type SwipeableActionRowTone = 'primary' | 'danger' | 'neutral';

export interface SwipeableActionRowAction {
  icon: keyof typeof MaterialIcons.glyphMap;
  id: string;
  label: string;
  onPress: () => void;
  testID?: string;
  tone?: SwipeableActionRowTone;
}

interface SwipeableActionRowProps {
  actions: SwipeableActionRowAction[];
  actionWidth?: number;
  children: React.ReactNode;
  testID?: string;
}

const DEFAULT_ACTION_WIDTH = 76;
const SWIPE_OPEN_THRESHOLD = 48;

const SwipeableActionRow: React.FC<SwipeableActionRowProps> = ({
  actions,
  actionWidth = DEFAULT_ACTION_WIDTH,
  children,
  testID = 'swipeableActionRow',
}) => {
  const revealWidth = actions.length * actionWidth;
  const [isOpen, setIsOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const visibleOffset = dragOffset > 0
    ? dragOffset
    : isOpen ? revealWidth : 0;
  const areActionsVisible = visibleOffset > 0;
  const close = () => {
    setDragOffset(0);
    setIsOpen(false);
  };
  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gestureState) =>
        shouldHandleHorizontalSwipe(gestureState),
      onPanResponderMove: (_event, gestureState) => {
        setDragOffset(getSwipeOffset(gestureState, isOpen, revealWidth));
      },
      onPanResponderRelease: (_event, gestureState) => {
        const nextOffset = getSwipeOffset(gestureState, isOpen, revealWidth);
        setDragOffset(0);
        setIsOpen(
          gestureState.dx < -SWIPE_OPEN_THRESHOLD
          || nextOffset > revealWidth / 2
        );
      },
      onPanResponderTerminate: () => {
        setDragOffset(0);
      },
    }),
    [isOpen, revealWidth]
  );

  if (actions.length === 0) {
    return <View testID={testID}>{children}</View>;
  }

  return (
    <View style={styles.container} testID={testID}>
      <View
        pointerEvents={areActionsVisible ? 'auto' : 'none'}
        style={[
          styles.actions,
          {
            opacity: areActionsVisible ? 1 : 0,
            width: revealWidth,
          },
        ]}
        testID={`${testID}_actions`}
      >
        {actions.map((action) => (
          <TouchableOpacity
            activeOpacity={0.86}
            key={action.id}
            onPress={() => {
              close();
              action.onPress();
            }}
            style={[
              styles.actionButton,
              { width: actionWidth },
              actionToneStyle(action.tone),
            ]}
            testID={action.testID ?? `${testID}_${action.id}`}
          >
            <MaterialIcons
              name={action.icon}
              size={19}
              color={actionIconColor(action.tone)}
            />
            <Text style={[styles.actionText, actionTextToneStyle(action.tone)]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View
        {...panResponder.panHandlers}
        style={[
          styles.surface,
          {
            transform: [{ translateX: -visibleOffset }],
          },
        ]}
        testID={`${testID}_surface`}
      >
        {children}
      </View>
    </View>
  );
};

const shouldHandleHorizontalSwipe = (
  gestureState: PanResponderGestureState
): boolean =>
  Math.abs(gestureState.dx) > 12
  && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2;

const getSwipeOffset = (
  gestureState: PanResponderGestureState,
  isOpen: boolean,
  revealWidth: number
): number => {
  const dragDistance = isOpen
    ? revealWidth - gestureState.dx
    : -gestureState.dx;

  return clamp(dragDistance, 0, revealWidth);
};

const actionToneStyle = (tone: SwipeableActionRowTone = 'neutral') => {
  switch (tone) {
    case 'danger':
      return styles.actionDanger;
    case 'primary':
      return styles.actionPrimary;
    default:
      return styles.actionNeutral;
  }
};

const actionTextToneStyle = (tone: SwipeableActionRowTone = 'neutral') => {
  switch (tone) {
    case 'danger':
      return styles.actionTextDanger;
    case 'primary':
      return styles.actionTextPrimary;
    default:
      return styles.actionTextNeutral;
  }
};

const actionIconColor = (tone: SwipeableActionRowTone = 'neutral'): string => {
  switch (tone) {
    case 'danger':
      return '#b42318';
    case 'primary':
      return '#175cd3';
    default:
      return '#475467';
  }
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  actions: {
    bottom: 0,
    flexDirection: 'row',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  actionButton: {
    alignItems: 'center',
    borderLeftColor: 'rgba(255,255,255,0.62)',
    borderLeftWidth: 1,
    justifyContent: 'center',
  },
  actionNeutral: {
    backgroundColor: '#f2f4f7',
  },
  actionPrimary: {
    backgroundColor: '#eff8ff',
  },
  actionDanger: {
    backgroundColor: '#fff1f3',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  actionTextNeutral: {
    color: '#475467',
  },
  actionTextPrimary: {
    color: '#175cd3',
  },
  actionTextDanger: {
    color: '#b42318',
  },
  surface: {
    backgroundColor: 'transparent',
  },
});

export default SwipeableActionRow;
