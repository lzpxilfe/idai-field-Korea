import { fireEvent, render } from '@testing-library/react-native';
import {
  CategoryForm,
  Resource,
} from 'idai-field-core';
import React from 'react';
import KoreanFieldworkSoilColorPanel, {
  getSoilColorPhotoMarkerStyle,
  getSoilProfileColorSampleUpdates,
} from './KoreanFieldworkSoilColorPanel';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkSoilColorPanel', () => {
  it('builds manual Munsell values from separated hue number, hue family, value, and chroma controls', () => {
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
    expect(queryByText('직접 입력')).toBeNull();
    expect(getByText('숫자')).toBeTruthy();
    expect(getByText('알파벳')).toBeTruthy();

    fireEvent.press(getByTestId('soilColorHueNumberOption_7.5'));
    fireEvent.press(getByTestId('soilColorHueFamilyOption_YR'));
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

  it('edits each numbered soil layer row and adds the next empty numbered swatch row', () => {
    const handleUpdateResourceFields = jest.fn();
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
        onUpdateResourceField={jest.fn()}
        onUpdateResourceFields={handleUpdateResourceFields}
      />
    );

    expect(getByText('층별 토색')).toBeTruthy();
    expect(getByTestId('soilColorLayerInput_1').props.value).toBe('');
    expect(queryByTestId('soilColorInput_profileColorSwatches')).toBeNull();
    expect(queryByText('사진 메모')).toBeNull();
    expect(queryByText('촬영 조건')).toBeNull();

    fireEvent.changeText(getByTestId('soilColorLayerInput_1'), '10YR 4/2');
    expect(handleUpdateResourceFields).toHaveBeenCalledWith({
      soilProfileColorSwatches: '1: 10YR 4/2',
      soilProfileActiveLayerNumber: 1,
    });

    fireEvent.press(getByTestId('soilColorHueNumberOption_10'));
    fireEvent.press(getByTestId('soilColorHueFamilyOption_YR'));
    fireEvent.press(getByTestId('soilColorValueOption_4'));
    fireEvent.press(getByTestId('soilColorChromaOption_3'));
    fireEvent.press(getByTestId('soilColorAddNumberedSwatch'));

    expect(handleUpdateResourceFields).toHaveBeenCalledWith({
      soilProfileColorSwatches: '1: 10YR 4/3',
      soilProfileActiveLayerNumber: 1,
    });
    expect(handleUpdateResourceFields).toHaveBeenLastCalledWith({
      soilProfileColorSwatches: '1: \n2: ',
      soilProfileActiveLayerNumber: 2,
    });
  });

  it('keeps a separate Korean layer color note beside the Munsell value', () => {
    const handleUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkSoilColorPanel
        category={createCategoryForm([
          'soilProfileColorSwatches',
        ])}
        resource={createResource(C.SOIL_PROFILE_PHOTO, {
          soilProfileColorSwatches: '1: 10YR 4/3 회갈색 사질토',
        })}
        onUpdateResourceField={jest.fn()}
        onUpdateResourceFields={handleUpdateResourceFields}
      />
    );

    expect(getByTestId('soilColorLayerInput_1').props.value).toBe('10YR 4/3');
    expect(getByTestId('soilColorLayerNoteInput_1').props.value)
      .toBe('회갈색 사질토');

    fireEvent.changeText(
      getByTestId('soilColorLayerNoteInput_1'),
      '회갈색 사질점토, 목탄립 포함'
    );

    expect(handleUpdateResourceFields).toHaveBeenCalledWith({
      soilProfileColorSwatches: '1: 10YR 4/3 회갈색 사질점토, 목탄립 포함',
      soilProfileActiveLayerNumber: 1,
    });
  });

  it('edits a soil layer number through a numeric modal', () => {
    const handleUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkSoilColorPanel
        category={createCategoryForm([
          'soilProfileColorSwatches',
        ])}
        resource={createResource(C.SOIL_PROFILE_PHOTO, {
          soilProfileColorSwatches: '1: 10YR 4/3\n2: 2.5Y 5/3',
        })}
        onUpdateResourceField={jest.fn()}
        onUpdateResourceFields={handleUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('soilColorLayerNumberEdit_2'));
    fireEvent.changeText(getByTestId('soilColorLayerNumberInput'), '4');
    fireEvent.press(getByTestId('soilColorLayerNumberApply'));

    expect(handleUpdateResourceFields).toHaveBeenLastCalledWith({
      soilProfileColorSwatches: '1: 10YR 4/3\n4: 2.5Y 5/3',
      soilProfileActiveLayerNumber: 4,
    });
  });

  it('stores the selected soil layer as the next photo sample target', () => {
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

    expect(getByTestId('soilColorLayerInput_1')).toBeTruthy();
    fireEvent.press(getByTestId('soilColorLayerSelect_2'));

    expect(handleUpdateResourceField).toHaveBeenCalledWith(
      'soilProfileActiveLayerNumber',
      2
    );
  });

  it('starts photo sampling from an individual soil layer row', () => {
    const handleUpdateResourceField = jest.fn();
    const handleSampleLayerColor = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkSoilColorPanel
        category={createCategoryForm([
          'soilProfileColorSwatches',
        ])}
        isLayerPhotoSamplingAvailable={true}
        resource={createResource(C.SOIL_PROFILE_PHOTO, {
          soilProfileColorSwatches: '1: 10YR 4/3\n2: ',
        })}
        onSampleLayerColor={handleSampleLayerColor}
        onUpdateResourceField={handleUpdateResourceField}
        onUpdateResourceFields={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('soilColorLayerSampleButton_2'));

    expect(handleUpdateResourceField).toHaveBeenCalledWith(
      'soilProfileActiveLayerNumber',
      2
    );
    expect(handleSampleLayerColor).toHaveBeenCalledWith(2);
  });

  it('writes expanded, neutral, and gley Munsell builder output to the selected soil layer row', () => {
    const handleUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkSoilColorPanel
        category={createCategoryForm([
          'soilProfileColorSwatches',
        ])}
        resource={createResource(C.SOIL_PROFILE_PHOTO, {
          soilProfileColorSwatches: '1: 10YR 4/3\n2: ',
        })}
        onUpdateResourceField={jest.fn()}
        onUpdateResourceFields={handleUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('soilColorLayerSelect_2'));
    fireEvent.press(getByTestId('soilColorHueNumberOption_2.5'));
    fireEvent.press(getByTestId('soilColorHueFamilyOption_GY'));
    fireEvent.press(getByTestId('soilColorValueOption_2.5'));
    fireEvent.press(getByTestId('soilColorChromaOption_10'));

    expect(handleUpdateResourceFields).toHaveBeenLastCalledWith({
      soilProfileColorSwatches: '1: 10YR 4/3\n2: 2.5GY 2.5/10',
      soilProfileActiveLayerNumber: 2,
    });

    fireEvent.press(getByTestId('soilColorHueFamilyOption_N'));

    expect(handleUpdateResourceFields).toHaveBeenLastCalledWith({
      soilProfileColorSwatches: '1: 10YR 4/3\n2: N 2.5/0',
      soilProfileActiveLayerNumber: 2,
    });

    fireEvent.press(getByTestId('soilColorHueFamilyOption_GLEY 1'));

    expect(handleUpdateResourceFields).toHaveBeenLastCalledWith({
      soilProfileColorSwatches: '1: 10YR 4/3\n2: GLEY 1 2.5/N',
      soilProfileActiveLayerNumber: 2,
    });
  });

  it('keeps photo-derived candidates hidden from soil layer rows', () => {
    const { queryByText, queryByTestId } = render(
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
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(queryByText('사진에서 찍은 토색')).toBeNull();
    expect(queryByTestId('soilColorLayerSamplePanel')).toBeNull();
    expect(queryByTestId('soilColorInput_assistCandidates')).toBeNull();
    expect(queryByTestId('soilColorCandidateOption_10YR 4/3')).toBeNull();
  });

  it('shows stored RGB sample details on the sampled soil layer photo', () => {
    const { getByTestId, queryByTestId } = render(
      <KoreanFieldworkSoilColorPanel
        category={createCategoryForm([
          'soilProfileColorSwatches',
        ])}
        resource={createResource(C.SOIL_PROFILE_PHOTO, {
          soilProfilePhotoUri: 'file:///tablet/photos/profile-1.jpg',
          soilProfileColorSwatches:
            '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
        })}
        onUpdateResourceField={jest.fn()}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(getByTestId('soilColorLayerSampleResultText_1').props.children)
      .toBe('RGB 111/87/61 @ 20%/50%');
    expect(getByTestId('soilColorLayerSampleLocation_1')).toBeTruthy();
    expect(queryByTestId('soilColorLayerSampleLocationMap_1')).toBeNull();
    expect(getByTestId('soilColorLayerSampleLocationText_1').props.children)
      .toBe('선택 위치 20%/50%');
    expect(getByTestId('soilColorPhotoSampleOverlay')).toBeTruthy();
    expect(getByTestId('soilColorPhotoSampleImage')).toBeTruthy();
    expect(getByTestId('soilColorPhotoSampleMarker_1')).toBeTruthy();
    expect(getByTestId('soilColorPhotoSampleMarkerText_1').props.children)
      .toBe(1);
    expect(getByTestId('soilColorLayerNoteInput_1').props.value).toBe('');
  });

  it('positions soil color sample markers within the contained photo frame', () => {
    expect(getSoilColorPhotoMarkerStyle(
      { xPercent: 80, yPercent: 50 },
      { height: 300, width: 300 },
      { height: 200, width: 400 }
    )).toEqual({
      left: 240,
      top: 150,
    });
  });

  it('writes the first photo-sampled Munsell candidate into the active layer row', () => {
    expect(getSoilProfileColorSampleUpdates(
      createResource(C.SOIL_PROFILE_PHOTO, {
        soilProfileActiveLayerNumber: 2,
        soilProfileColorSwatches: '1: 10YR 4/3\n2: ',
      }),
      {
        soilColorAssistCandidates:
          '사진 선택 지점 80%/50% 평균 RGB 139/128/88\n1: 2.5Y 5/3 (높음, 차이 0.0)',
        soilColorAssistStatus: 'candidatesAvailable',
      }
    )).toEqual({
      soilColorAssistCandidates:
        '사진 선택 지점 80%/50% 평균 RGB 139/128/88\n1: 2.5Y 5/3 (높음, 차이 0.0)',
      soilColorAssistStatus: 'reviewed',
      soilProfileActiveLayerNumber: 2,
      soilProfileColorSwatches:
        '1: 10YR 4/3\n2: 2.5Y 5/3 RGB 139/128/88 @ 80%/50%',
    });
  });

  it('writes a photo-sampled Munsell value into the explicitly requested layer', () => {
    expect(getSoilProfileColorSampleUpdates(
      createResource(C.SOIL_PROFILE_PHOTO, {
        soilProfileActiveLayerNumber: 1,
        soilProfileColorSwatches: '1: 10YR 4/3\n2: ',
      }),
      {
        soilColorAssistCandidates:
          '사진 선택 지점 80%/50% 평균 RGB 139/128/88\n1: 2.5Y 5/3 (높음, 차이 0.0)',
        soilColorAssistStatus: 'candidatesAvailable',
      },
      2
    )).toEqual({
      soilColorAssistCandidates:
        '사진 선택 지점 80%/50% 평균 RGB 139/128/88\n1: 2.5Y 5/3 (높음, 차이 0.0)',
      soilColorAssistStatus: 'reviewed',
      soilProfileActiveLayerNumber: 2,
      soilProfileColorSwatches:
        '1: 10YR 4/3\n2: 2.5Y 5/3 RGB 139/128/88 @ 80%/50%',
    });
  });

  it('preserves Korean layer notes when photo sampling writes a Munsell candidate', () => {
    expect(getSoilProfileColorSampleUpdates(
      createResource(C.SOIL_PROFILE_PHOTO, {
        soilProfileActiveLayerNumber: 2,
        soilProfileColorSwatches: '1: 10YR 4/3\n2: 회갈색 사질토',
      }),
      {
        soilColorAssistCandidates:
          '사진 선택 지점 80%/50% 평균 RGB 139/128/88\n1: 2.5Y 5/3 (높음, 차이 0.0)',
        soilColorAssistStatus: 'candidatesAvailable',
      }
    )).toEqual({
      soilColorAssistCandidates:
        '사진 선택 지점 80%/50% 평균 RGB 139/128/88\n1: 2.5Y 5/3 (높음, 차이 0.0)',
      soilColorAssistStatus: 'reviewed',
      soilProfileActiveLayerNumber: 2,
      soilProfileColorSwatches:
        '1: 10YR 4/3\n2: 2.5Y 5/3 회갈색 사질토 RGB 139/128/88 @ 80%/50%',
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
