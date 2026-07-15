import { Document } from 'idai-field-core';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import KoreanFieldworkFeatureDrawingStatusPanel
  from './KoreanFieldworkFeatureDrawingStatusPanel';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

describe('KoreanFieldworkFeatureDrawingStatusPanel', () => {
  it('records drawing progress and a field memo without creating a drawing', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeatureDrawingStatusPanel
        document={createFeature()}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_drawings'));
    fireEvent.press(getByTestId('featureDrawingStatus_inProgress'));

    expect(onUpdateResourceFields).toHaveBeenCalledWith({
      featureDrawingStatus: 'inProgress',
      featureInvestigationChecklist: ['preInvestigationPhotoTaken'],
    });

    fireEvent.press(getByTestId('drawingSurveyMethod_handMeasured'));
    expect(onUpdateResourceFields).toHaveBeenCalledWith(expect.objectContaining({
      drawingSurveyMethods: ['handMeasured'],
    }));

    fireEvent.press(getByTestId('drawingSurveyMethod_threeDMeasured'));
    expect(onUpdateResourceFields).toHaveBeenCalledWith(expect.objectContaining({
      drawingSurveyMethods: ['threeDMeasured'],
    }));

    fireEvent.changeText(getByTestId('featureDrawingNote'), '북쪽 선 보완 필요');
    fireEvent.press(getByTestId('featureDrawingSave'));

    expect(onUpdateResourceFields).toHaveBeenLastCalledWith({
      featureChecklistNote: '북쪽 선 보완 필요',
    });
  });

  it('keeps measured drawing completion in the shared field checklist', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeatureDrawingStatusPanel
        document={createFeature()}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_drawings'));
    fireEvent.press(getByTestId('featureDrawingStatus_completed'));

    expect(onUpdateResourceFields).toHaveBeenCalledWith({
      featureDrawingStatus: 'completed',
      featureInvestigationChecklist: [
        'preInvestigationPhotoTaken',
        'measuredDrawingCompleted',
      ],
    });
  });
});

const createFeature = (): Document => ({
  _id: 'feature-1',
  created: { date: new Date(0), user: 'test' },
  modified: [],
  resource: {
    id: 'feature-1',
    identifier: '1호 유구',
    category: KOREAN_FIELDWORK_CATEGORIES.FEATURE,
    featureInvestigationChecklist: ['preInvestigationPhotoTaken'],
    relations: {},
  },
});
