import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import SwipeableActionRow from './SwipeableActionRow';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

describe('SwipeableActionRow', () => {
  it('keeps row actions hidden until the row is swiped', () => {
    const { getByTestId } = render(
      <SwipeableActionRow
        actions={[
          {
            icon: 'edit',
            id: 'edit',
            label: 'Edit',
            onPress: jest.fn(),
            tone: 'primary',
          },
          {
            icon: 'delete-outline',
            id: 'delete',
            label: 'Delete',
            onPress: jest.fn(),
            tone: 'danger',
          },
        ]}
        testID="swipeRow"
      >
        <Text>Feature 1</Text>
      </SwipeableActionRow>
    );

    expect(getByTestId('swipeRow_actions').props.pointerEvents).toBe('none');
    expect(StyleSheet.flatten(getByTestId('swipeRow_actions').props.style))
      .toEqual(expect.objectContaining({ opacity: 0 }));
  });

  it('reveals row actions after a right-to-left swipe and runs the chosen action', () => {
    const handleEdit = jest.fn();
    const handleDelete = jest.fn();
    const { getByTestId } = render(
      <SwipeableActionRow
        actions={[
          {
            icon: 'edit',
            id: 'edit',
            label: 'Edit',
            onPress: handleEdit,
            testID: 'swipeEdit',
            tone: 'primary',
          },
          {
            icon: 'delete-outline',
            id: 'delete',
            label: 'Delete',
            onPress: handleDelete,
            testID: 'swipeDelete',
            tone: 'danger',
          },
        ]}
        testID="swipeRow"
      >
        <Text>Feature 1</Text>
      </SwipeableActionRow>
    );

    const surface = getByTestId('swipeRow_surface');
    act(() => {
      surface.props.onResponderGrant(touchEvent({
        timestamp: 1,
        x: 0,
        y: 0,
      }));
      surface.props.onResponderMove(touchEvent({
        previousX: 0,
        previousY: 0,
        timestamp: 2,
        x: -120,
        y: 0,
      }));
      surface.props.onResponderRelease(touchEvent({
        previousX: -120,
        previousY: 0,
        timestamp: 3,
        x: -120,
        y: 0,
      }));
    });

    expect(getByTestId('swipeRow_actions').props.pointerEvents).toBe('auto');
    expect(StyleSheet.flatten(getByTestId('swipeRow_actions').props.style))
      .toEqual(expect.objectContaining({ opacity: 1 }));

    fireEvent.press(getByTestId('swipeDelete'));

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleEdit).not.toHaveBeenCalled();
  });
});

const touchEvent = ({
  previousX,
  previousY,
  timestamp,
  x,
  y,
}: {
  previousX?: number;
  previousY?: number;
  timestamp: number;
  x: number;
  y: number;
}) => ({
  nativeEvent: {
    touches: [{ pageX: x, pageY: y }],
  },
  touchHistory: {
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: timestamp,
    numberActiveTouches: 1,
    touchBank: [
      {
        currentPageX: x,
        currentPageY: y,
        currentTimeStamp: timestamp,
        previousPageX: previousX ?? x,
        previousPageY: previousY ?? y,
        previousTimeStamp: timestamp - 1,
        touchActive: true,
      },
    ],
  },
});
