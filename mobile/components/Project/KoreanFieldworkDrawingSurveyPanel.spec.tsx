import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import KoreanFieldworkDrawingSurveyPanel, {
  KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS,
} from './KoreanFieldworkDrawingSurveyPanel';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkDrawingSurveyPanel', () => {
  it('stores hand and 3D measurement method checks', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkDrawingSurveyPanel
        resource={createDrawingResource()}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('drawingSurveyMethod_handMeasured'));

    expect(onUpdateResourceFields).toHaveBeenCalledWith(expect.objectContaining({
      [KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.methods]: ['handMeasured'],
    }));
  });

  it('shows DSLR and drone options only after 3D measurement is checked', () => {
    const { getByTestId, queryByTestId } = render(
      <KoreanFieldworkDrawingSurveyPanel
        resource={createDrawingResource()}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(queryByTestId('drawingSurveyDevice_dslr')).toBeNull();

    const { getByTestId: getByTestIdWith3d } = render(
      <KoreanFieldworkDrawingSurveyPanel
        resource={createDrawingResource({
          drawingSurveyMethods: ['threeDMeasured'],
        })}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(getByTestId('drawingSurveyMethod_threeDMeasured')).toBeTruthy();
    expect(getByTestIdWith3d('drawingSurveyDevice_dslr')).toBeTruthy();
    expect(getByTestIdWith3d('drawingSurveyDevice_drone')).toBeTruthy();
  });

  it('stores 3D device and survey stage checks', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkDrawingSurveyPanel
        resource={createDrawingResource({
          drawingSurveyMethods: ['threeDMeasured'],
        })}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('drawingSurveyDevice_drone'));
    fireEvent.press(getByTestId('drawingSurveyStage_duringInvestigation'));

    expect(onUpdateResourceFields).toHaveBeenNthCalledWith(1, expect.objectContaining({
      [KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.devices]: ['drone'],
    }));
    expect(onUpdateResourceFields).toHaveBeenNthCalledWith(2, expect.objectContaining({
      [KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.stages]: ['duringInvestigation'],
    }));
  });

  it('clears 3D devices when 3D measurement is unchecked', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkDrawingSurveyPanel
        resource={createDrawingResource({
          drawingSurveyMethods: ['handMeasured', 'threeDMeasured'],
          drawingThreeDDevices: ['dslr', 'drone'],
        })}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('drawingSurveyMethod_threeDMeasured'));

    expect(onUpdateResourceFields).toHaveBeenCalledWith(expect.objectContaining({
      [KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.devices]: [],
      [KOREAN_FIELDWORK_DRAWING_SURVEY_FIELDS.methods]: ['handMeasured'],
    }));
  });

  it('stays hidden outside drawing records', () => {
    const { queryByTestId } = render(
      <KoreanFieldworkDrawingSurveyPanel
        resource={{ category: C.PHOTO, identifier: 'photo-1', relations: {} }}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(queryByTestId('drawingSurveyPanel')).toBeNull();
  });
});

const createDrawingResource = (
  extraResource: Record<string, unknown> = {}
) => ({
  category: C.DRAWING,
  identifier: 'drawing-1',
  relations: {},
  ...extraResource,
});
