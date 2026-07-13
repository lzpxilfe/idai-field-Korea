import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import BoundaryFileImportModal from './BoundaryFileImportModal';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

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

const DocumentPicker = require('expo-document-picker');

describe('BoundaryFileImportModal', () => {
  beforeEach(() => {
    DocumentPicker.getDocumentAsync.mockReset();
  });

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

  it('submits a file selected from the tablet document picker', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{
        name: 'boundary.shp',
        uri: 'file:///storage/emulated/0/Download/boundary.shp',
      }],
    });
    const onImport = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <BoundaryFileImportModal
        onClose={jest.fn()}
        onImport={onImport}
        visible
      />
    );

    act(() => {
      fireEvent.press(getByTestId('boundaryFileImportPickButton'));
    });

    await waitFor(() => {
      expect(getByTestId('boundaryFileImportPathInput').props.value)
        .toBe('file:///storage/emulated/0/Download/boundary.shp');
    });

    act(() => {
      fireEvent.press(getByTestId('boundaryFileImportSubmitButton'));
    });

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(
        'file:///storage/emulated/0/Download/boundary.shp'
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

  it('uses DXF-only copy and submits a reference background file', async () => {
    const onImport = jest.fn().mockResolvedValue(undefined);
    const { getByTestId, getByText } = render(
      <BoundaryFileImportModal
        mode="dxfReference"
        onClose={jest.fn()}
        onImport={onImport}
        visible
      />
    );

    expect(getByText('DXF 측량 배경 가져오기')).toBeTruthy();
    expect(getByText('배경으로 저장')).toBeTruthy();

    fireEvent.changeText(
      getByTestId('boundaryFileImportPathInput'),
      '/storage/emulated/0/Download/site-survey.dxf'
    );
    act(() => {
      fireEvent.press(getByTestId('boundaryFileImportSubmitButton'));
    });

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(
        '/storage/emulated/0/Download/site-survey.dxf'
      );
    });
  });

  it('passes a selected PRJ sidecar with its DXF reference file', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: 'site-survey.prj',
          uri: 'file:///cache/site-survey.prj',
        },
        {
          name: 'site-survey.dxf',
          uri: 'file:///cache/site-survey.dxf',
        },
      ],
    });
    const onImport = jest.fn().mockResolvedValue(undefined);
    const { getByTestId, getByText } = render(
      <BoundaryFileImportModal
        mode="dxfReference"
        onClose={jest.fn()}
        onImport={onImport}
        visible
      />
    );

    act(() => {
      fireEvent.press(getByTestId('boundaryFileImportPickButton'));
    });

    await waitFor(() => {
      expect(getByTestId('boundaryFileImportPathInput').props.value)
        .toBe('file:///cache/site-survey.dxf');
    });
    expect(getByText('.prj 좌표계: site-survey.prj')).toBeTruthy();
    expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith(
      expect.objectContaining({ multiple: true })
    );

    act(() => {
      fireEvent.press(getByTestId('boundaryFileImportSubmitButton'));
    });

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledWith(
        'file:///cache/site-survey.dxf',
        'file:///cache/site-survey.prj'
      );
    });
  });

  it('clears the typed path and error when the modal is closed', async () => {
    const onImport = jest.fn().mockRejectedValue(
      new Error("Location 'file:///sdcard/Download/boundary.dxf' isn't readable.")
    );
    const { getByTestId, queryByTestId, rerender } = render(
      <BoundaryFileImportModal
        onClose={jest.fn()}
        onImport={onImport}
        visible
      />
    );

    fireEvent.changeText(
      getByTestId('boundaryFileImportPathInput'),
      '/sdcard/Download/boundary.dxf'
    );
    act(() => {
      fireEvent.press(getByTestId('boundaryFileImportSubmitButton'));
    });

    await waitFor(() => {
      expect(getByTestId('boundaryFileImportError').props.children)
        .toContain('파일 선택');
    });

    rerender(
      <BoundaryFileImportModal
        onClose={jest.fn()}
        onImport={onImport}
        visible={false}
      />
    );
    rerender(
      <BoundaryFileImportModal
        onClose={jest.fn()}
        onImport={onImport}
        visible
      />
    );

    expect(getByTestId('boundaryFileImportPathInput').props.value).toBe('');
    expect(queryByTestId('boundaryFileImportError')).toBeNull();
  });
});
