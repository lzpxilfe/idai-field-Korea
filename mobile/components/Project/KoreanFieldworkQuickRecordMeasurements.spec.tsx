import { fireEvent, render } from '@testing-library/react-native';
import { CategoryForm, NewResource, Resource } from 'idai-field-core';
import React, { useState } from 'react';
import KoreanFieldworkQuickRecordPanel from './KoreanFieldworkQuickRecordPanel';
import { FIELDWORK_QUICK_FIELDS } from './korean-fieldwork-quick-record';


describe('KoreanFieldworkQuickRecordPanel measurements', () => {
  it('opens the matching fields after feature type selection and retains hidden values', () => {
    const { getByTestId, getByText, queryByText } = render(
      <StatefulMeasurementPanel />
    );

    expect(queryByText('제원')).toBeNull();

    fireEvent.press(getByTestId('quickRecordOption_kiln'));

    expect(getByText('가마 전체')).toBeTruthy();
    expect(getByText('소성부·연도부')).toBeTruthy();
    fireEvent.changeText(
      getByTestId('quickRecordMeasurement_kilnOverallLength'),
      '320'
    );

    fireEvent.press(getByTestId('quickRecordOption_pit'));

    expect(getByText('수혈 제원')).toBeTruthy();
    expect(queryByText('가마 전체')).toBeNull();

    fireEvent.press(getByTestId('quickRecordOption_kiln'));

    expect(getByTestId('quickRecordMeasurement_kilnOverallLength').props.value)
      .toBe('320');
  });

  it('shows grave pit and burial body measurements immediately for a burial', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <KoreanFieldworkQuickRecordPanel
        category={createFeatureCategory()}
        resource={createFeature({
          featureType: 'burial',
          featureInterpretationType: ['tomb'],
        })}
        onUpdateResourceField={jest.fn()}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    expect(getByText('제원')).toBeTruthy();
    expect(getByText('묘광 제원')).toBeTruthy();
    expect(getByText('매장부 제원')).toBeTruthy();
    expect(getByText('묘광 장축')).toBeTruthy();
    expect(getByText('매장부 잔존높이')).toBeTruthy();
    expect(queryByText('연소부 길이')).toBeNull();

    fireEvent.changeText(
      getByTestId('quickRecordMeasurement_burialGravePitLongAxis'),
      '245.5'
    );

    expect(onUpdateResourceFields).toHaveBeenCalledWith({
      dimensionLength: [expect.objectContaining({
        inputUnit: 'cm',
        inputValue: 245.5,
        measurementComment: '토광묘 묘광 장축',
        value: 2455000,
      })],
    });
  });

  it('shows kiln measurements by part and supports metre input', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId, getByText } = render(
      <KoreanFieldworkQuickRecordPanel
        category={createFeatureCategory()}
        resource={createFeature({
          featureType: 'kiln',
          featureInterpretationType: ['kiln'],
        })}
        onUpdateResourceField={jest.fn()}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    expect(getByText('가마 전체')).toBeTruthy();
    expect(getByText('화구·연소부')).toBeTruthy();
    expect(getByText('소성부·연도부')).toBeTruthy();
    expect(getByText('회구부')).toBeTruthy();
    expect(getByText('연소부 길이')).toBeTruthy();
    expect(getByText('연도부 폭·직경')).toBeTruthy();

    fireEvent.changeText(
      getByTestId('quickRecordMeasurement_kilnOverallLength'),
      '3.2'
    );
    fireEvent.press(
      getByTestId('quickRecordMeasurementUnit_kilnOverallLength_m')
    );

    expect(onUpdateResourceFields).toHaveBeenLastCalledWith({
      dimensionLength: [expect.objectContaining({
        inputUnit: 'm',
        inputValue: 3.2,
        measurementComment: '가마 전체 길이',
        value: 3200000,
      })],
    });
  });
});


const StatefulMeasurementPanel: React.FC = () => {
  const [resource, setResource] = useState<NewResource>(createFeature({
    featureType: 'unknown',
    featureInterpretationType: [],
  }));

  return (
    <KoreanFieldworkQuickRecordPanel
      category={createFeatureCategory()}
      resource={resource}
      onUpdateResourceField={(fieldName, value) => setResource((current) => ({
        ...current,
        [fieldName]: value,
      }))}
      onUpdateResourceFields={(updates) => setResource((current) => ({
        ...current,
        ...updates,
      }))}
    />
  );
};


const createFeatureCategory = (): CategoryForm => ({
  groups: [{
    name: 'fieldwork',
    fields: [
      FIELDWORK_QUICK_FIELDS.featureInterpretationType,
      'dimensionLength',
      'dimensionWidth',
      'dimensionVerticalExtent',
    ].map((name) => ({ name })),
  }],
} as CategoryForm);

const createFeature = (
  extraResource: Record<string, unknown>
): Resource => ({
  id: 'feature-1',
  identifier: '1호 유구',
  category: 'Feature',
  relations: {},
  ...extraResource,
} as unknown as Resource);
