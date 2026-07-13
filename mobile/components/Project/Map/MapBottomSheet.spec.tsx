import { fireEvent, render } from '@testing-library/react-native';
import { Document } from 'idai-field-core';
import React from 'react';
import MapBottomSheet from './MapBottomSheet';
import { KOREAN_FIELDWORK_CATEGORIES } from '../korean-fieldwork-categories';

jest.mock('@/components/common/BottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('MapBottomSheet', () => {
  it('uses trench workflow steps when the project is in trial trench mode', () => {
    const handleToggle = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      createBottomSheet({
        investigationModeId: 'trialTrench',
        toggleFeatureWorkflowStep: handleToggle,
      })
    );

    expect(getByText('조사 단계 확인')).toBeTruthy();
    expect(getByText('토층 정리')).toBeTruthy();
    expect(getByText('피트 토층도')).toBeTruthy();
    expect(queryByText('유물 수습')).toBeNull();

    fireEvent.press(getByTestId('mapWorkflowStep_trenchPitOpened'));

    expect(handleToggle).toHaveBeenCalledWith('trenchPitOpened');
  });

  it('uses excavation workflow steps outside trench mode', () => {
    const handleToggle = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      createBottomSheet({
        investigationModeId: 'excavation',
        toggleFeatureWorkflowStep: handleToggle,
      })
    );

    expect(getByText('조사 사진')).toBeTruthy();
    expect(getByText('조사 전 사진')).toBeTruthy();
    expect(getByText('조사 중 사진')).toBeTruthy();
    expect(getByText('완료 사진')).toBeTruthy();
    expect(queryByText('수습 전 사진')).toBeNull();
    expect(queryByText('유물 수습')).toBeNull();
    expect(queryByText('피트 토층도')).toBeNull();

    fireEvent.press(getByTestId('mapWorkflowStep_completionPhotoTaken'));

    expect(handleToggle).toHaveBeenCalledWith('completionPhotoTaken');
  });

  it('shows trial trench workflow steps for trench records', () => {
    const handleToggle = jest.fn();
    const { getByTestId, getByText } = render(
      createBottomSheet({
        document: createDoc(C.TRENCH),
        investigationModeId: 'trialTrench',
        toggleFeatureWorkflowStep: handleToggle,
      })
    );

    expect(getByText('피트 토층도')).toBeTruthy();

    fireEvent.press(getByTestId('mapWorkflowStep_trenchPitProfileDrawn'));

    expect(handleToggle).toHaveBeenCalledWith('trenchPitProfileDrawn');
  });

  it('opens the satellite picker from the visible map action panel', () => {
    const openSatellitePicker = jest.fn();
    const { getByText } = render(
      createBottomSheet({ openSatellitePicker })
    );

    fireEvent.press(getByText('지도 선택'));

    expect(openSatellitePicker).toHaveBeenCalled();
  });

  it('opens the boundary file import from the visible map action panel', () => {
    const openBoundaryFileImport = jest.fn();
    const { getByTestId, getByText } = render(
      createBottomSheet({ openBoundaryFileImport })
    );

    expect(getByText('SHP/DXF/GeoJSON')).toBeTruthy();

    fireEvent.press(getByTestId('mapBoundaryFileImportButton'));

    expect(openBoundaryFileImport).toHaveBeenCalled();
  });
});

const createBottomSheet = (
  props: Partial<React.ComponentProps<typeof MapBottomSheet>> = {}
) => (
  <MapBottomSheet
    document={createDoc(C.FEATURE)}
    addDocument={jest.fn()}
    editDocument={jest.fn()}
    removeDocument={jest.fn()}
    focusHandler={jest.fn()}
    canOpenFeatureSketchCreation={false}
    canCreatePenMemo={true}
    canCreateSoilProfilePhoto={true}
    canCreateSurveyBoundary={false}
    openFeatureSketchCreation={jest.fn()}
    createPenMemoDraft={jest.fn()}
    createSoilProfilePhotoDraft={jest.fn()}
    createSurveyBoundaryDraft={jest.fn()}
    openBoundaryFileImport={jest.fn()}
    openSatellitePicker={jest.fn()}
    markGeometryNeedsAerialAlignment={jest.fn()}
    markGeometryAdjustedToAerialLayer={jest.fn()}
    toggleFeatureWorkflowStep={jest.fn()}
    readinessIssues={[]}
    {...props}
  />
);

const createDoc = (category: string = C.FEATURE): Document => ({
  _id: 'feature-1',
  resource: {
    id: 'feature-1',
    identifier: '조선시대 1호 수혈',
    category,
    relations: {},
    featureInvestigationChecklist: ['trenchSoilCleaned'],
  },
  created: { user: 'test', date: new Date(0) },
  modified: [],
});
