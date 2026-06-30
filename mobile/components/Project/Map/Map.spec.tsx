import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Document } from 'idai-field-core';
import React from 'react';
import { ConfigurationContext } from '@/contexts/configuration-context';
import { PreferencesContext } from '@/contexts/preferences-context';
import useMapData from '@/hooks/use-mapdata';
import { defaultPointRadius } from './GLMap/constants';
import Map from './Map';
import { KOREAN_FIELDWORK_CATEGORIES } from '../korean-fieldwork-categories';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 37.5665, longitude: 126.978 },
  })),
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
}));

jest.mock('@/hooks/use-mapdata', () => ({
  __esModule: true,
  default: jest.fn(() => [
    [],
    [],
    undefined,
    undefined,
    undefined,
    jest.fn(),
    undefined,
  ]),
}));

jest.mock('@/contexts/preferences-context', () => {
  const React = require('react');

  return {
    PreferencesContext: React.createContext(null),
  };
});

jest.mock('@/components/common/Button', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    __esModule: true,
    default: ({ isDisabled, onPress, testID, title }: Record<string, any>) => (
      <Text
        accessibilityState={{ disabled: !!isDisabled }}
        onPress={isDisabled ? undefined : onPress}
        testID={testID}
      >
        {title}
      </Text>
    ),
  };
});

jest.mock('./GLMap/GLMap', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    FIELDWORK_MAP_WORKSPACE_BACKGROUND: '#ffffff',
    default: (props: Record<string, unknown>) => (
      <View testID="gl-map" {...props} />
    ),
  };
});

jest.mock('./KakaoSatellitePicker', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');

  return {
    __esModule: true,
    default: ({ onPickBoundary, visible }: Record<string, any>) => visible ? (
      <TouchableOpacity
        testID="mock-kakao-boundary-save"
        onPress={() => onPickBoundary({
          center: { latitude: 36.12, longitude: 127.45 },
          coordinates: [
            { latitude: 36.12, longitude: 127.45 },
            { latitude: 36.13, longitude: 127.46 },
            { latitude: 36.14, longitude: 127.45 },
          ],
          mapTypeId: 'HYBRID',
        })}
      >
        <Text>경계 저장</Text>
      </TouchableOpacity>
    ) : null,
  };
});

jest.mock('./BoundaryFileImportModal', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: () => <View />,
  };
});

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('Map', () => {
  beforeEach(() => {
    (useMapData as jest.Mock).mockReturnValue([
      [],
      [],
      undefined,
      undefined,
      undefined,
      jest.fn(),
      undefined,
    ]);
  });

  it('hides trench creation from the excavation map start panel', () => {
    const operation = createDoc(C.OPERATION, 'operation-1');

    const { queryByText } = render(
      <ConfigurationContext.Provider value={createConfigurationMock() as any}>
        <PreferencesContext.Provider value={createPreferencesMock() as any}>
          <Map
            repository={createRepositoryMock([operation]) as any}
            documents={[operation]}
            selectedDocumentIds={['operation-1']}
            addDocument={jest.fn()}
            addDocumentOfCategory={jest.fn()}
            editDocument={jest.fn()}
            removeDocument={jest.fn()}
            selectParent={jest.fn()}
            readinessIssues={[]}
            investigationModeId="excavation"
          />
        </PreferencesContext.Provider>
      </ConfigurationContext.Provider>
    );

    expect(queryByText('트렌치 추가')).toBeNull();
  });

  it('keeps trench creation in the trial trench map start panel', () => {
    const operation = createDoc(C.OPERATION, 'operation-1');

    const { getByText } = render(
      <ConfigurationContext.Provider value={createConfigurationMock() as any}>
        <PreferencesContext.Provider value={createPreferencesMock() as any}>
          <Map
            repository={createRepositoryMock([operation]) as any}
            documents={[operation]}
            selectedDocumentIds={['operation-1']}
            addDocument={jest.fn()}
            addDocumentOfCategory={jest.fn()}
            editDocument={jest.fn()}
            removeDocument={jest.fn()}
            selectParent={jest.fn()}
            readinessIssues={[]}
            investigationModeId="trialTrench"
          />
        </PreferencesContext.Provider>
      </ConfigurationContext.Provider>
    );

    expect(getByText('트렌치 추가')).toBeTruthy();
  });

  it('uses the operation as the excavation feature parent even when a trench is highlighted', async () => {
    const operation = createDoc(C.OPERATION, 'operation-1');
    const trench = createDoc(C.TRENCH, 'trench-1');
    const boundary = createDoc(C.SURVEY_BOUNDARY, 'boundary-1');
    const addDocumentOfCategory = jest.fn();
    (useMapData as jest.Mock).mockReturnValue([
      [boundary],
      [],
      undefined,
      undefined,
      undefined,
      jest.fn(),
      undefined,
    ]);

    const { getAllByText } = render(
      <ConfigurationContext.Provider value={createConfigurationMock() as any}>
        <PreferencesContext.Provider value={createPreferencesMock() as any}>
          <Map
            repository={createRepositoryMock([operation, trench]) as any}
            documents={[operation, trench, boundary]}
            selectedDocumentIds={['operation-1']}
            highlightedDocId="trench-1"
            addDocument={jest.fn()}
            addDocumentOfCategory={addDocumentOfCategory}
            editDocument={jest.fn()}
            removeDocument={jest.fn()}
            selectParent={jest.fn()}
            readinessIssues={[]}
            investigationModeId="excavation"
          />
        </PreferencesContext.Provider>
      </ConfigurationContext.Provider>
    );

    await waitFor(() => expect(getAllByText('유구 추가').length).toBeGreaterThan(0));

    fireEvent.press(getAllByText('유구 추가')[0]);

    expect(addDocumentOfCategory).toHaveBeenCalledWith(
      operation,
      C.FEATURE,
      expect.any(Object)
    );
  });

  it('keeps users on the white map workspace after saving a hand-drawn boundary', async () => {
    const editDocument = jest.fn();
    const repository = createRepositoryMock();

    const { getByTestId } = render(
      <ConfigurationContext.Provider value={createConfigurationMock() as any}>
        <PreferencesContext.Provider value={createPreferencesMock() as any}>
          <Map
            repository={repository as any}
            documents={[createDoc(C.OPERATION, 'operation-1')]}
            selectedDocumentIds={['operation-1']}
            addDocument={jest.fn()}
            addDocumentOfCategory={jest.fn()}
            editDocument={editDocument}
            removeDocument={jest.fn()}
            selectParent={jest.fn()}
            readinessIssues={[]}
            investigationModeId="excavation"
            boundarySummary="1구역"
            satellitePickerRequestId={1}
          />
        </PreferencesContext.Provider>
      </ConfigurationContext.Provider>
    );

    fireEvent.press(getByTestId('mock-kakao-boundary-save'));

    await waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      resource: expect.objectContaining({
        category: C.SURVEY_BOUNDARY,
        geometry: expect.objectContaining({ type: 'LineString' }),
      }),
    }));
    expect(editDocument).not.toHaveBeenCalled();
  });
});

const createRepositoryMock = (documents: Document[] = []) => ({
  create: jest.fn(async (draft: any) => ({
    _id: 'survey-boundary-1',
    resource: {
      id: 'survey-boundary-1',
      ...draft.resource,
    },
    created: { user: 'test', date: new Date(0) },
    modified: [],
  })),
  get: jest.fn(async (docId: string) =>
    documents.find((document) => document.resource.id === docId)
  ),
});

const createConfigurationMock = () => ({
  getCategory: (categoryName: string) => ({
    color: categoryName === C.SURVEY_BOUNDARY ? '#175cd3' : '#222222',
    name: categoryName,
  }),
});

const createPreferencesMock = () => ({
  getMapSettings: jest.fn(() => ({ pointRadius: defaultPointRadius })),
  preferences: {
    currentProject: 'test-project',
    mapProviderSettings: {
      kakaoLocalRestApiKey: '',
      kakaoMapJavaScriptKey: 'js-key',
      kakaoNativeAppKey: '',
    },
  },
  setMapSettings: jest.fn(),
});

const createDoc = (category: string, id: string): Document => ({
  _id: id,
  resource: {
    id,
    identifier: id,
    category,
    relations: {},
  },
  created: { user: 'test', date: new Date(0) },
  modified: [],
});
