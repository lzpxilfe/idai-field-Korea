import { fireEvent, render } from '@testing-library/react-native';
import {
  CategoryForm,
  Resource,
} from 'idai-field-core';
import React from 'react';
import KoreanFieldworkSoilColorPanel from './KoreanFieldworkSoilColorPanel';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkSoilColorPanel', () => {
  it('builds manual Munsell values from hue, value, and chroma controls', () => {
    const handleUpdateResourceField = jest.fn();
    const handleUpdateResourceFields = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <KoreanFieldworkSoilColorPanel
        category={createCategoryForm([
          'soilColorMunsellManual',
          'soilColorMoistureState',
          'soilColorCaptureCondition',
          'soilColorAssistStatus',
          'soilColorNote',
        ])}
        resource={createResource(C.LAYER, {
          soilColorMunsellManual: '',
          soilColorMoistureState: '',
          soilColorCaptureCondition: '',
          soilColorAssistStatus: 'notRun',
          soilColorNote: '',
        })}
        onUpdateResourceField={handleUpdateResourceField}
        onUpdateResourceFields={handleUpdateResourceFields}
      />
    );

    expect(getByText('토색 기록')).toBeTruthy();
    expect(getByText('먼셀 조합')).toBeTruthy();
    expect(queryByText('촬영 조건')).toBeNull();

    fireEvent.press(getByTestId('soilColorOption_7.5YR'));
    fireEvent.press(getByTestId('soilColorValueOption_5'));
    fireEvent.press(getByTestId('soilColorChromaOption_4'));
    fireEvent.press(getByTestId('soilColorOption_moist'));
    fireEvent.changeText(getByTestId('soilColorInput_note'), '회갈색 사질토');

    expect(handleUpdateResourceFields).toHaveBeenLastCalledWith({
      soilColorMunsellManual: '7.5YR 5/4',
      soilColorAssistStatus: 'manualRecorded',
    });
    expect(handleUpdateResourceField).toHaveBeenNthCalledWith(
      1,
      'soilColorMoistureState',
      'moist'
    );
    expect(handleUpdateResourceField).toHaveBeenNthCalledWith(
      2,
      'soilColorNote',
      '회갈색 사질토'
    );
  });

  it('adds the next empty numbered swatch row as one editable input per soil layer', () => {
    const handleUpdateResourceField = jest.fn();
    const { getByTestId, getByText, queryByTestId, queryByText } = render(
      <KoreanFieldworkSoilColorPanel
        category={createCategoryForm([
          'soilProfileColorSwatches',
          'soilColorCaptureCondition',
          'soilProfileColorNote',
          'soilProfileCaptureNote',
        ])}
        resource={createResource(C.SOIL_PROFILE_PHOTO, {
          soilProfileColorSwatches: '[]',
          soilColorCaptureCondition: '',
          soilProfileColorNote: '',
          soilProfileCaptureNote: '',
        })}
        onUpdateResourceField={handleUpdateResourceField}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(getByText('층별 토색')).toBeTruthy();
    expect(getByTestId('soilColorLayerInput_1').props.value).toBe('');
    expect(queryByTestId('soilColorInput_profileColorSwatches')).toBeNull();
    expect(queryByText('사진 메모')).toBeNull();
    expect(queryByText('촬영 조건')).toBeNull();

    fireEvent.changeText(getByTestId('soilColorLayerInput_1'), '10YR 4/3 갈색');
    fireEvent.press(getByTestId('soilColorAddNumberedSwatch'));

    expect(handleUpdateResourceField).toHaveBeenNthCalledWith(
      1,
      'soilProfileColorSwatches',
      '1: 10YR 4/3 갈색'
    );
    expect(handleUpdateResourceField).toHaveBeenNthCalledWith(
      2,
      'soilProfileColorSwatches',
      '1: \n2: '
    );
  });

  it('writes Munsell builder output to the selected soil layer row', () => {
    const handleUpdateResourceField = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkSoilColorPanel
        category={createCategoryForm([
          'soilProfileColorSwatches',
        ])}
        resource={createResource(C.SOIL_PROFILE_PHOTO, {
          soilProfileColorSwatches: '1: 10YR 4/3\n2: ',
        })}
        onUpdateResourceField={handleUpdateResourceField}
        onUpdateResourceFields={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('soilColorLayerSelect_2'));
    fireEvent.press(getByTestId('soilColorOption_5YR'));
    fireEvent.press(getByTestId('soilColorValueOption_4'));
    fireEvent.press(getByTestId('soilColorChromaOption_6'));

    expect(handleUpdateResourceField).toHaveBeenLastCalledWith(
      'soilProfileColorSwatches',
      '1: 10YR 4/3\n2: 5YR 4/6'
    );
  });

  it('lets users accept photo-derived Munsell candidates into the selected layer', () => {
    const handleUpdateResourceFields = jest.fn();
    const { getByTestId, getByText } = render(
      <KoreanFieldworkSoilColorPanel
        category={createCategoryForm([
          'soilProfileColorSwatches',
          'soilColorAssistCandidates',
          'soilColorAssistStatus',
        ])}
        resource={createResource(C.SOIL_PROFILE_PHOTO, {
          soilProfileColorSwatches: '1: \n2: ',
          soilColorAssistCandidates:
            '사진 선택 지점 20%/50% 평균 RGB 111/87/61\n1: 10YR 4/3 (보통, 차이 0.0)',
          soilColorAssistStatus: 'candidatesAvailable',
        })}
        onUpdateResourceField={jest.fn()}
        onUpdateResourceFields={handleUpdateResourceFields}
      />
    );

    expect(getByText('사진에서 찍은 토색')).toBeTruthy();
    fireEvent.press(getByTestId('soilColorLayerSelect_2'));
    fireEvent.press(getByTestId('soilColorCandidateOption_10YR 4/3'));
    fireEvent.changeText(
      getByTestId('soilColorInput_assistCandidates'),
      '1: 10YR 3/2'
    );
    fireEvent.changeText(
      getByTestId('soilColorInput_assistCandidates'),
      ''
    );

    expect(handleUpdateResourceFields).toHaveBeenCalledWith({
      soilProfileColorSwatches: '1: \n2: 10YR 4/3',
      soilColorAssistStatus: 'reviewed',
    });
    expect(handleUpdateResourceFields).toHaveBeenCalledWith({
      soilColorAssistCandidates: '1: 10YR 3/2',
      soilColorAssistStatus: 'candidatesAvailable',
    });
    expect(handleUpdateResourceFields).toHaveBeenCalledWith({
      soilColorAssistCandidates: '',
      soilColorAssistStatus: 'notRun',
    });
  });

  it('does not render outside soil color record categories', () => {
    const { queryByTestId } = render(
      <KoreanFieldworkSoilColorPanel
        category={createCategoryForm(['soilColorMunsellManual'])}
        resource={createResource(C.FEATURE)}
        onUpdateResourceField={jest.fn()}
      />
    );

    expect(queryByTestId('koreanFieldworkSoilColorPanel')).toBeNull();
  });
});

const createCategoryForm = (fieldNames: string[]): CategoryForm => ({
  groups: [
    {
      name: 'koreanFieldwork',
      fields: fieldNames.map((name) => ({ name })),
    },
  ],
} as CategoryForm);

const createResource = (
  category: string,
  extraResource: Record<string, unknown> = {}
): Resource => ({
  id: 'resource-1',
  identifier: '기록 1',
  category,
  relations: {},
  ...extraResource,
} as unknown as Resource);
