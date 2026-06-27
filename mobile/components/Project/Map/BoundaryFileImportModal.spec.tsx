import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import BoundaryFileImportModal from './BoundaryFileImportModal';

jest.mock('@/components/common/Button', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');

  return {
    __esModule: true,
    default: ({
      icon,
      isDisabled,
      onPress,
      testID,
      title,
    }: {
      icon?: React.ReactNode;
      isDisabled?: boolean;
      onPress: () => void;
      testID?: string;
      title?: string;
    }) => (
      <Pressable disabled={isDisabled} onPress={onPress} testID={testID}>
        {icon}
        {title ? <Text>{title}</Text> : null}
      </Pressable>
    ),
  };
});

describe('BoundaryFileImportModal', () => {
  it('submits the typed local file path', async () => {
    const onImport = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <BoundaryFileImportModal
        onClose={jest.fn()}
        onImport={onImport}
        visible
      />
    );

    fireEvent.changeText(
      getByTestId('boundaryFileImportPathInput'),
      '/storage/emulated/0/Download/boundary.dxf'
    );
    act(() => {
      fireEvent.press(getByTestId('boundaryFileImportSubmitButton'));
    });

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(
        '/storage/emulated/0/Download/boundary.dxf'
      );
    });
  });

  it('shows validation feedback when no file path is entered', () => {
    const onImport = jest.fn();
    const { getByTestId } = render(
      <BoundaryFileImportModal
        onClose={jest.fn()}
        onImport={onImport}
        visible
      />
    );

    act(() => {
      fireEvent.press(getByTestId('boundaryFileImportSubmitButton'));
    });

    expect(getByTestId('boundaryFileImportError').props.children)
      .toContain('.shp');
    expect(onImport).not.toHaveBeenCalled();
  });
});
