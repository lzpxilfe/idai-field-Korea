import AsyncStorage from '@react-native-async-storage/async-storage';
import {
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
import CreateProjectModal from './CreateProjectModal';

jest.mock('@/components/Project/Map/KakaoSatellitePicker', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');

  return {
    __esModule: true,
    default: ({ visible, onPickBoundary }: any) => visible ? (
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
    ) : null,
  };
});

const safeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

describe('CreateProjectModal', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('requires project setup basics and a drawn boundary before creating the project', () => {
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
    expect(queryByText('지도에서 유적 경계를 그려야 합니다.')).toBeNull();
    expect(queryByText(
      '프로젝트 이름을 적고, 조사 방식을 고른 뒤 지도에서 경계를 그리면 만들 수 있습니다.'
    )).toBeTruthy();
    expect(queryByText('프로젝트 기본 조사 방식을 정합니다.')).toBeTruthy();
    expect(queryByText('지도에서 유적 경계를 직접 그립니다.')).toBeTruthy();
    expect(queryByText('필요하면 경계 메모를 덧붙입니다.')).toBeTruthy();

    fireEvent.changeText(getByTestId('project-input'), 'fieldwork-1');

    expect(queryByText('조사 방식을 고르고 지도에서 경계를 그리면 만들 수 있습니다.'))
      .toBeTruthy();

    fireEvent.press(getByTestId('create-project-submit'));

    expect(handleProjectCreated).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('project-investigation-mode_excavation'));

    expect(queryByText('지도에서 유적 경계를 그리면 만들 수 있습니다.'))
      .toBeTruthy();

    fireEvent.press(getByTestId('create-project-submit'));

    expect(handleProjectCreated).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('project-boundary-draw-button'));

    expect(queryByText('지도에서 유적 경계를 그려야 합니다.')).toBeTruthy();

    fireEvent.press(getByTestId('mock-boundary-picker-save'));

    expect(queryByText(
      '경계점 3개를 찍었습니다. 생성하면 조사 경계 기록으로 저장됩니다.'
    )).toBeTruthy();
    expect(queryByText(
      '준비 완료. 생성하면 이 경계 도형이 조사 경계 기록으로 저장됩니다.'
    )).toBeTruthy();
  });

  it('points completed setup toward saving the drawn boundary as a project record', () => {
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
    fireEvent.press(getByTestId('project-boundary-draw-button'));
    fireEvent.press(getByTestId('mock-boundary-picker-save'));
    fireEvent.changeText(
      getByTestId('project-boundary-summary-input'),
      '1구역 북쪽 능선부터 남쪽 농로까지'
    );

    expect(getByText('준비 완료. 생성하면 이 경계 도형이 조사 경계 기록으로 저장됩니다.'))
      .toBeTruthy();
    expect(getByText(
      '선택 사항입니다. 비워두면 지도에서 그린 경계점 수가 메모로 저장됩니다.'
    )).toBeTruthy();
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
    fireEvent.press(getByTestId('project-boundary-draw-button'));
    fireEvent.press(getByTestId('mock-boundary-picker-save'));
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
    fireEvent.press(getByTestId('project-boundary-draw-button'));
    fireEvent.press(getByTestId('mock-boundary-picker-save'));
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

  it('prevents creating a project with an unsafe database name', () => {
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
    fireEvent.press(getByTestId('project-boundary-draw-button'));
    fireEvent.press(getByTestId('mock-boundary-picker-save'));
    fireEvent.press(getByTestId('create-project-submit'));

    expect(getAllByText(
      '프로젝트 이름은 소문자로 시작하고 소문자, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있으며 30자 이하여야 합니다.'
    ))
      .toHaveLength(2);
    expect(handleProjectCreated).not.toHaveBeenCalled();
  });
});
