import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { KOREAN_FIELDWORK_PROJECT_LANGUAGES } from '@/constants/korean-fieldwork-project';
import {
  createKoreanFieldworkBoundarySummaryStorageKey,
  createKoreanFieldworkProjectBoundaryDraftStorageKey,
} from '../Project/korean-fieldwork-investigation-mode';
import {
  projectWgs84BoundaryToSurveyBoundaryGeometry,
} from '../Project/Map/korean-fieldwork-drafts';
import {
  importBoundaryFileFromPath,
} from '@/components/Project/Map/boundary-file-import';
import CreateProjectModal from './CreateProjectModal';
import { createServerCompatibleProjectId } from './project-name-validation';

const mockImportBoundaryFileFromPath =
  importBoundaryFileFromPath as jest.MockedFunction<typeof importBoundaryFileFromPath>;

jest.mock('@/components/Project/Map/KakaoSatellitePicker', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');

  return {
    __esModule: true,
    default: ({ initialLocation, visible, onPickBoundary }: any) => visible ? (
      <View>
        <Text testID="mock-boundary-picker-initial-location">
          {initialLocation
            ? `${initialLocation.latitude},${initialLocation.longitude}`
            : 'none'}
        </Text>
        <TouchableOpacity
          onPress={() => onPickBoundary({
            center: { latitude: 37.133333, longitude: 127.166667 },
            coordinates: [
              { latitude: 37.1, longitude: 127.1 },
              { latitude: 37.1, longitude: 127.2 },
              { latitude: 37.2, longitude: 127.2 },
            ],
            mapTypeId: 'HYBRID',
          })}
          testID="mock-boundary-picker-save"
        >
          <Text>경계 저장</Text>
        </TouchableOpacity>
      </View>
    ) : null,
  };
});

jest.mock('@/components/Project/Map/BoundaryFileImportModal', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');

  return {
    __esModule: true,
    default: ({ visible, onImport }: any) => visible ? (
      <View>
        <TouchableOpacity
          onPress={() => onImport('/storage/emulated/0/Download/idai-field-boundaries/bandabi-boundary.dxf')}
          testID="mock-boundary-file-import-submit"
        >
          <Text>SHP/DXF 가져오기</Text>
        </TouchableOpacity>
      </View>
    ) : null,
  };
});

jest.mock('@/components/Project/Map/boundary-file-import', () => ({
  importBoundaryFileFromPath: jest.fn(),
}));

jest.mock('expo-location', () => ({
  Accuracy: {
    Balanced: 3,
  },
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: {
      latitude: 36.45,
      longitude: 127.12,
    },
  })),
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({
    status: 'granted',
  })),
}));

jest.mock('@/contexts/preferences-context', () => {
  const React = require('react');

  return {
    PreferencesContext: React.createContext({
      preferences: {
        mapProviderSettings: {
          kakaoMapJavaScriptKey: 'test-js-key',
        },
      },
    }),
  };
});

const safeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

describe('CreateProjectModal', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: {
        latitude: 36.45,
        longitude: 127.12,
      },
    });
    await AsyncStorage.clear();
  });

  it('requires project setup basics and a drawn boundary before creating the project', async () => {
    const handleProjectCreated = jest.fn();
    const { getByTestId, queryByText } = render(
      <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
        <CreateProjectModal
          onProjectCreated={handleProjectCreated}
          onClose={jest.fn()}
        />
      </SafeAreaInsetsContext.Provider>
    );

    expect(queryByText('프로젝트 이름을 입력해야 합니다.')).toBeNull();
    expect(queryByText('조사 방식을 선택해야 합니다.')).toBeNull();
    expect(queryByText('유적 경계를 직접 그리거나 파일에서 가져와야 합니다.')).toBeNull();
    expect(queryByText(
      '프로젝트 이름을 적고, 조사 방식을 고른 뒤 경계를 직접 그리거나 파일에서 가져오면 만들 수 있습니다.'
    )).toBeTruthy();
    expect(queryByText('프로젝트 기본 조사 방식을 정합니다.')).toBeTruthy();
    expect(queryByText('조사 경계 기준을 문장으로 남깁니다.')).toBeTruthy();
    expect(queryByText('지도에서 경계를 직접 그리거나 SHP/DXF/GeoJSON을 가져옵니다.')).toBeTruthy();
    expect(queryByText(/지도에서 도형을 그리거나 지원되는 파일 가져오기로 확정합니다\./))
      .toBeTruthy();

    fireEvent.changeText(getByTestId('project-input'), 'fieldwork-1');

    expect(queryByText('조사 방식을 고르고 경계를 직접 그리거나 SHP/DXF/GeoJSON에서 가져오면 만들 수 있습니다.'))
      .toBeTruthy();

    fireEvent.press(getByTestId('create-project-submit'));

    expect(handleProjectCreated).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('project-investigation-mode_excavation'));

    expect(queryByText('유적 경계를 직접 그리거나 파일에서 가져오면 만들 수 있습니다.'))
      .toBeTruthy();

    fireEvent.press(getByTestId('create-project-submit'));

    expect(handleProjectCreated).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('project-boundary-draw-button'));

    expect(queryByText('유적 경계를 직접 그리거나 파일에서 가져와야 합니다.')).toBeTruthy();
    await waitFor(() => {
      expect(getByTestId('mock-boundary-picker-save')).toBeTruthy();
    });

    fireEvent.press(getByTestId('mock-boundary-picker-save'));

    expect(queryByText(
      '경계점 3개를 찍었습니다. 생성하면 조사 경계 기록으로 저장됩니다.'
    )).toBeTruthy();
    expect(queryByText(
      '준비 완료. 이 경계를 기준으로 프로젝트를 만들 수 있습니다.'
    )).toBeTruthy();
  }, 10000);

  it('centers the boundary picker on the current device location when available', async () => {
    const { getByTestId } = render(
      <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
        <CreateProjectModal
          onProjectCreated={jest.fn()}
          onClose={jest.fn()}
        />
      </SafeAreaInsetsContext.Provider>
    );

    fireEvent.press(getByTestId('project-boundary-draw-button'));

    await waitFor(() => {
      expect(getByTestId('mock-boundary-picker-initial-location').props.children)
        .toBe('36.45,127.12');
    });
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
  });

  it('shows a full wait overlay while preparing the boundary map', async () => {
    let resolveLocation: (value: unknown) => void = () => {};
    (Location.getCurrentPositionAsync as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLocation = resolve;
      })
    );

    const { getByTestId, getByText, queryByTestId } = render(
      <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
        <CreateProjectModal
          onProjectCreated={jest.fn()}
          onClose={jest.fn()}
        />
      </SafeAreaInsetsContext.Provider>
    );

    fireEvent.press(getByTestId('project-boundary-draw-button'));

    expect(getByTestId('project-boundary-prepare-overlay')).toBeTruthy();
    expect(getByText('잠시만 기다려주십시오')).toBeTruthy();

    await act(async () => {
      resolveLocation({
        coords: {
          latitude: 36.45,
          longitude: 127.12,
        },
      });
    });

    await waitFor(() => {
      expect(queryByTestId('project-boundary-prepare-overlay')).toBeNull();
      expect(getByTestId('mock-boundary-picker-save')).toBeTruthy();
    });
  });

  it('opens the boundary picker even when current location is unavailable', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });
    const { getByTestId } = render(
      <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
        <CreateProjectModal
          onProjectCreated={jest.fn()}
          onClose={jest.fn()}
        />
      </SafeAreaInsetsContext.Provider>
    );

    fireEvent.press(getByTestId('project-boundary-draw-button'));

    await waitFor(() => {
      expect(getByTestId('mock-boundary-picker-initial-location').props.children)
        .toBe('none');
    });
  });

  it('points completed setup toward saving the drawn boundary as a project record', async () => {
    const handleProjectCreated = jest.fn();
    const { getByTestId, getByText } = render(
      <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
        <CreateProjectModal
          onProjectCreated={handleProjectCreated}
          onClose={jest.fn()}
        />
      </SafeAreaInsetsContext.Provider>
    );

    fireEvent.changeText(getByTestId('project-input'), 'fieldwork-1');
    fireEvent.press(getByTestId('project-investigation-mode_excavation'));
    await drawBoundary(getByTestId);
    fireEvent.changeText(
      getByTestId('project-boundary-summary-input'),
      '1구역 북쪽 능선부터 남쪽 농로까지'
    );

    expect(getByText('준비 완료. 이 경계를 기준으로 프로젝트를 만들 수 있습니다.'))
      .toBeTruthy();
    expect(getByText(
      '선택 사항입니다. 비워두면 그리거나 가져온 경계 정보가 메모로 저장됩니다.'
    )).toBeTruthy();
  });

  it('imports a SHP/DXF/GeoJSON boundary before creating a project', async () => {
    const importedGeometry = projectWgs84BoundaryToSurveyBoundaryGeometry([
      { latitude: 37.1, longitude: 127.1 },
      { latitude: 37.1, longitude: 127.2 },
      { latitude: 37.2, longitude: 127.2 },
    ])!;
    mockImportBoundaryFileFromPath.mockResolvedValueOnce({
      boundarySource: 'dxfImport',
      coordinateCount: importedGeometry.coordinates.length,
      coordinateSystem: 'EPSG:4326',
      fileName: 'bandabi-boundary.dxf',
      geometry: importedGeometry,
      referenceBasemapProvider: 'importedVectorLayer',
    });
    const handleProjectCreated = jest.fn();
    const { getByTestId } = render(
      <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
        <CreateProjectModal
          onProjectCreated={handleProjectCreated}
          onClose={jest.fn()}
        />
      </SafeAreaInsetsContext.Provider>
    );

    fireEvent.changeText(getByTestId('project-input'), 'bandabi');
    fireEvent.press(getByTestId('project-investigation-mode_excavation'));
    fireEvent.press(getByTestId('project-boundary-import-button'));
    fireEvent.press(getByTestId('mock-boundary-file-import-submit'));

    await waitFor(() => {
      expect(mockImportBoundaryFileFromPath).toHaveBeenCalledWith(
        '/storage/emulated/0/Download/idai-field-boundaries/bandabi-boundary.dxf'
      );
    });

    fireEvent.press(getByTestId('create-project-submit'));

    await waitFor(() => {
      expect(handleProjectCreated).toHaveBeenCalledWith(
        'bandabi',
        KOREAN_FIELDWORK_PROJECT_LANGUAGES
      );
    });
    await expect(AsyncStorage.getItem(
      createKoreanFieldworkBoundarySummaryStorageKey('bandabi')
    )).resolves.toBe(
      'bandabi-boundary.dxf에서 가져온 조사 경계 (4점, EPSG:4326)'
    );

    const storedBoundaryDraft = JSON.parse(
      await AsyncStorage.getItem(
        createKoreanFieldworkProjectBoundaryDraftStorageKey('bandabi')
      ) ?? '{}'
    );
    expect(storedBoundaryDraft.coordinates).toHaveLength(3);
    expect(storedBoundaryDraft.coordinates[0].latitude).toBeCloseTo(37.1, 5);
    expect(storedBoundaryDraft.coordinates[0].longitude).toBeCloseTo(127.1, 5);
    expect(storedBoundaryDraft.mapTypeId).toBeUndefined();
  });

  it('prevents creating a project with an existing normalized name', async () => {
    const handleProjectCreated = jest.fn();
    const { getByTestId } = render(
      <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
        <CreateProjectModal
          existingProjects={['fieldwork-1']}
          onProjectCreated={handleProjectCreated}
          onClose={jest.fn()}
        />
      </SafeAreaInsetsContext.Provider>
    );

    fireEvent.changeText(getByTestId('project-input'), '  fieldwork-1  ');
    fireEvent.press(getByTestId('project-investigation-mode_excavation'));
    await drawBoundary(getByTestId);
    fireEvent.changeText(
      getByTestId('project-boundary-summary-input'),
      '1구역 북쪽 능선부터 남쪽 농로까지'
    );
    fireEvent.press(getByTestId('create-project-submit'));

    expect(handleProjectCreated).not.toHaveBeenCalled();

    fireEvent.changeText(getByTestId('project-input'), '  fieldwork-2  ');
    fireEvent.press(getByTestId('create-project-submit'));

    await waitFor(() => {
      expect(handleProjectCreated).toHaveBeenCalledWith(
        'fieldwork-2',
        KOREAN_FIELDWORK_PROJECT_LANGUAGES
      );
    });
  });

  it('uses the typed project name without adding a Korean fieldwork prefix', async () => {
    const handleProjectCreated = jest.fn();
    const { getByTestId } = render(
      <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
        <CreateProjectModal
          onProjectCreated={handleProjectCreated}
          onClose={jest.fn()}
        />
      </SafeAreaInsetsContext.Provider>
    );

    fireEvent.changeText(getByTestId('project-input'), '  area-2026  ');
    fireEvent.press(getByTestId('project-investigation-mode_excavation'));
    await drawBoundary(getByTestId);
    fireEvent.press(getByTestId('create-project-submit'));

    await waitFor(() => {
      expect(handleProjectCreated).toHaveBeenCalledWith(
        'area-2026',
        KOREAN_FIELDWORK_PROJECT_LANGUAGES
      );
    });
    expect(handleProjectCreated).not.toHaveBeenCalledWith(
      'korean-fieldwork-area-2026',
      expect.anything()
    );
    await expect(AsyncStorage.getItem(
      createKoreanFieldworkBoundarySummaryStorageKey('area-2026')
    )).resolves.toBe('지도에서 그린 조사 경계 (3점)');

    const storedBoundaryDraft = JSON.parse(
      await AsyncStorage.getItem(
        createKoreanFieldworkProjectBoundaryDraftStorageKey('area-2026')
      ) ?? '{}'
    );
    expect(storedBoundaryDraft).toEqual({
      center: { latitude: 37.133333, longitude: 127.166667 },
      coordinates: [
        { latitude: 37.1, longitude: 127.1 },
        { latitude: 37.1, longitude: 127.2 },
        { latitude: 37.2, longitude: 127.2 },
      ],
      mapTypeId: 'HYBRID',
    });
  });

  it('creates a local project with a Korean field site name', async () => {
    const handleProjectCreated = jest.fn();
    const projectName = '서울 종로구 반다비 유적 1구역';
    const { getByTestId } = render(
      <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
        <CreateProjectModal
          onProjectCreated={handleProjectCreated}
          onClose={jest.fn()}
        />
      </SafeAreaInsetsContext.Provider>
    );

    fireEvent.changeText(getByTestId('project-input'), `  ${projectName}  `);
    const projectId = createServerCompatibleProjectId(projectName);
    fireEvent.press(getByTestId('project-investigation-mode_excavation'));
    await drawBoundary(getByTestId);
    fireEvent.press(getByTestId('create-project-submit'));

    await waitFor(() => {
      expect(handleProjectCreated).toHaveBeenCalledWith(
        projectId,
        KOREAN_FIELDWORK_PROJECT_LANGUAGES,
        projectName
      );
    });
    await expect(AsyncStorage.getItem(
      createKoreanFieldworkBoundarySummaryStorageKey(projectId)
    )).resolves.toBe('지도에서 그린 조사 경계 (3점)');
  });

  it('prevents creating a local project with path-like characters', async () => {
    const handleProjectCreated = jest.fn();
    const { getAllByText, getByTestId } = render(
      <SafeAreaInsetsContext.Provider value={safeAreaInsets}>
        <CreateProjectModal
          onProjectCreated={handleProjectCreated}
          onClose={jest.fn()}
        />
      </SafeAreaInsetsContext.Provider>
    );

    fireEvent.changeText(getByTestId('project-input'), 'field/work:1');
    fireEvent.press(getByTestId('project-investigation-mode_excavation'));
    await drawBoundary(getByTestId);
    fireEvent.press(getByTestId('create-project-submit'));

    expect(getAllByText(
      '프로젝트 이름에는 / \\ : * ? " < > | 문자나 줄바꿈을 사용할 수 없습니다. 한글, 숫자, 영문, 띄어쓰기는 사용할 수 있습니다.'
    ))
      .toHaveLength(2);
    expect(handleProjectCreated).not.toHaveBeenCalled();
  });
});

const drawBoundary = async (
  getByTestId: ReturnType<typeof render>['getByTestId']
) => {
  fireEvent.press(getByTestId('project-boundary-draw-button'));
  await waitFor(() => {
    expect(getByTestId('mock-boundary-picker-save')).toBeTruthy();
  });
  fireEvent.press(getByTestId('mock-boundary-picker-save'));
};
