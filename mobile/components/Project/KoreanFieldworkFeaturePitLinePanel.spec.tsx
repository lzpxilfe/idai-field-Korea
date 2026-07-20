import { fireEvent, render } from '@testing-library/react-native';
import { Document } from 'idai-field-core';
import React from 'react';
import { StyleSheet } from 'react-native';
import KoreanFieldworkFeaturePitLinePanel, {
  KOREAN_FIELDWORK_FEATURE_PHOTO_DIRECTION_FIELDS,
  KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS,
} from './KoreanFieldworkFeaturePitLinePanel';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkFeaturePitLinePanel', () => {
  it('keeps the editor behind a compact button with a numeric count', () => {
    const { getByTestId, queryByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featureSoilPitLines: JSON.stringify([createPitLine(1), createPitLine(2)]),
        })}
        documents={[]}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(getByTestId('featurePitLineCount').props.children).toBe(2);
    expect(queryByTestId('featurePitLineCanvas')).toBeNull();

    fireEvent.press(getByTestId('featurePitLineOpen'));

    expect(getByTestId('featurePitLineCanvas')).toBeTruthy();
  });

  it('stores a straight soil pit line from one drag gesture', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        allowedAddCategoryNames={[C.SOIL_PROFILE_PHOTO]}
        document={createDoc('feature-1', C.FEATURE, {
          featureLocationSketch: JSON.stringify({
            version: 2,
            shape: 'polygon',
            center: { x: 50, y: 50 },
            points: [
              { x: 20, y: 20 },
              { x: 80, y: 20 },
              { x: 80, y: 70 },
              { x: 20, y: 70 },
            ],
            rotation: 0,
            scale: 100,
          }),
        })}
        documents={[]}
        onAddSoilProfilePhoto={jest.fn()}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );
    fireEvent.press(getByTestId('featurePitLineOpen'));
    const canvas = getByTestId('featurePitLineCanvas');

    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 80, locationY: 50 },
    });

    expect(onUpdateResourceFields).not.toHaveBeenCalled();
    expect(getByTestId('featurePitLinePendingStart')).toBeTruthy();

    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 200, locationY: 100 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 320, locationY: 150 },
    });

    expect(onUpdateResourceFields).toHaveBeenCalledTimes(1);
    const updates = onUpdateResourceFields.mock.calls[0][0];
    const pitLines = JSON.parse(updates[KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.lines]);
    const pitLine = pitLines[0];

    expect(pitLines).toHaveLength(1);
    expect(pitLine.label).toBe('1');
    expect(pitLine.start).toEqual({ x: 20, y: 25 });
    expect(pitLine.end).toEqual({ x: 80, y: 75 });
    expect(pitLine.points).toEqual([
      { x: 20, y: 25 },
      { x: 80, y: 75 },
    ]);
    expect(pitLine.version).toBe(2);
    expect(updates[KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.updatedAt])
      .toEqual(pitLine.updatedAt);
  });

  it('stores a photo position and direction on the enlarged feature', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featureInvestigationChecklist: ['preInvestigationPhotoTaken'],
        })}
        documents={[]}
        mode="photoDirection"
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_photos'));
    const canvas = getByTestId('featurePitLineCanvas');
    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 80, locationY: 50 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 200, locationY: 100 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 320, locationY: 150 },
    });

    const updates = onUpdateResourceFields.mock.calls[0][0];
    const directions = JSON.parse(
      updates[KOREAN_FIELDWORK_FEATURE_PHOTO_DIRECTION_FIELDS.lines]
    );
    expect(directions[0]).toMatchObject({
      id: 'photo-direction-1',
      kind: 'direction',
      start: { x: 20, y: 25 },
      end: { x: 80, y: 75 },
    });
    expect(updates[KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.lines])
      .toBeUndefined();
    expect(updates.featureInvestigationChecklist).toBeUndefined();
    expect(updates.featureRecordingStatus).toBeUndefined();
  });

  it('combines photo stages above the position and direction canvas', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId, getByText } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featureInvestigationChecklist: [
            'preInvestigationPhotoTaken',
            'preInvestigationPhotoTaken',
            'soilProfilePhotoLinked',
          ],
          featurePhotoDirections: JSON.stringify([]),
        })}
        documents={[]}
        mode="photoDirection"
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_photos'));

    expect(getByTestId('featurePhotoStageSection')).toBeTruthy();
    expect(getByText('1. 조사 전·중·후')).toBeTruthy();
    expect(getByText('2. 촬영 위치·방향')).toBeTruthy();
    expect(getByTestId('featurePitLineCanvas')).toBeTruthy();
    expect(
      getByTestId('featurePhotoStage_preInvestigationPhotoTaken')
        .props.accessibilityState
    ).toEqual({ checked: true });
    expect(
      getByTestId('featurePhotoStage_inProgressPhotoTaken')
        .props.accessibilityState
    ).toEqual({ checked: false });
    expect(getByText('조사 전 · 1/3')).toBeTruthy();

    fireEvent.press(
      getByTestId('featurePhotoStage_inProgressPhotoTaken')
    );

    expect(onUpdateResourceFields).toHaveBeenCalledWith({
      featureInvestigationChecklist: [
        'preInvestigationPhotoTaken',
        'soilProfilePhotoLinked',
        'inProgressPhotoTaken',
      ],
      featureRecordingStatus: 'investigating',
    });
    expect(
      onUpdateResourceFields.mock.calls[0][0][
        KOREAN_FIELDWORK_FEATURE_PHOTO_DIRECTION_FIELDS.lines
      ]
    ).toBeUndefined();
  });

  it('marks the feature complete when the after-investigation photo is checked', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featureInvestigationChecklist: ['preInvestigationPhotoTaken'],
        })}
        documents={[]}
        mode="photoDirection"
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_photos'));
    fireEvent.press(
      getByTestId('featurePhotoStage_completionPhotoTaken')
    );

    expect(onUpdateResourceFields).toHaveBeenCalledWith({
      featureInvestigationChecklist: [
        'preInvestigationPhotoTaken',
        'completionPhotoTaken',
      ],
      featureRecordingStatus: 'confirmed',
    });
  });

  it('stores a short photo gesture as a position point', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE)}
        documents={[]}
        mode="photoDirection"
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_photos'));
    const canvas = getByTestId('featurePitLineCanvas');
    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 80, locationY: 50 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 86, locationY: 55 },
    });

    const updates = onUpdateResourceFields.mock.calls[0][0];
    const directions = JSON.parse(
      updates[KOREAN_FIELDWORK_FEATURE_PHOTO_DIRECTION_FIELDS.lines]
    );

    expect(directions[0]).toMatchObject({
      id: 'photo-direction-1',
      kind: 'point',
      start: { x: 20, y: 25 },
      end: { x: 20, y: 25 },
      points: [
        { x: 20, y: 25 },
        { x: 20, y: 25 },
      ],
    });
  });

  it('renders a photo point without a direction line or arrow', () => {
    const { getByTestId, queryByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featurePhotoDirections: JSON.stringify([
            {
              version: 2,
              id: 'photo-direction-1',
              kind: 'point',
              label: '1',
              start: { x: 20, y: 25 },
              end: { x: 20, y: 25 },
              points: [
                { x: 20, y: 25 },
                { x: 20, y: 25 },
              ],
            },
          ]),
        })}
        documents={[]}
        mode="photoDirection"
        onUpdateResourceFields={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_photos'));

    expect(getByTestId('featurePitLineStart')).toBeTruthy();
    expect(queryByTestId('featurePitLineSegment')).toBeNull();
    expect(queryByTestId('featurePitLineEnd')).toBeNull();
  });

  it('rotates saved and pending arrows along their actual screen direction', () => {
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featurePhotoDirections: JSON.stringify([
            {
              version: 2,
              id: 'photo-direction-1',
              kind: 'direction',
              label: '1',
              start: { x: 20, y: 25 },
              end: { x: 80, y: 75 },
              points: [
                { x: 20, y: 25 },
                { x: 80, y: 75 },
              ],
            },
          ]),
        })}
        documents={[]}
        mode="photoDirection"
        onUpdateResourceFields={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_photos'));
    const canvas = getByTestId('featurePitLineCanvas');
    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });

    const savedArrowStyle = StyleSheet.flatten(
      getByTestId('featurePitLineEnd').props.style
    );
    const savedAngle = Math.atan2(100, 240) * (180 / Math.PI);
    expect(savedArrowStyle.transform).toEqual([
      { rotateZ: `${savedAngle}deg` },
    ]);

    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 320, locationY: 100 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 80, locationY: 100 },
    });

    const pendingArrowStyle = StyleSheet.flatten(
      getByTestId('featurePitLinePendingEnd').props.style
    );
    expect(pendingArrowStyle.transform).toEqual([{ rotateZ: '180deg' }]);
  });

  it('renders one optional record row for each of five photo annotations', () => {
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featurePhotoDirections: JSON.stringify(
            Array.from({ length: 5 }, (_value, index) =>
              createPhotoDirection(index + 1))
          ),
        })}
        documents={[]}
        mode="photoDirection"
        onUpdateResourceFields={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_photos'));

    expect(getByTestId('featurePitLineScroll')).toBeTruthy();
    for (let index = 0; index < 5; index += 1) {
      expect(getByTestId(`featureAnnotationNoteRow_${index}`)).toBeTruthy();
      expect(getByTestId(`featureAnnotationNoteInput_${index}`)).toBeTruthy();
    }
  });

  it('persists a photo annotation note only after the local draft blurs', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featurePhotoDirections: JSON.stringify([
            createPhotoDirection(1, '조사 전 전경'),
          ]),
        })}
        documents={[]}
        mode="photoDirection"
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_photos'));
    const input = getByTestId('featureAnnotationNoteInput_0');
    expect(input.props.value).toBe('조사 전 전경');

    fireEvent.changeText(input, '  북쪽에서 본 조사 중 전경  ');
    expect(onUpdateResourceFields).not.toHaveBeenCalled();

    fireEvent(input, 'blur');

    const updates = onUpdateResourceFields.mock.calls[0][0];
    const directions = JSON.parse(
      updates[KOREAN_FIELDWORK_FEATURE_PHOTO_DIRECTION_FIELDS.lines]
    );
    expect(directions[0].description).toBe('북쪽에서 본 조사 중 전경');
  });

  it('flushes a local photo annotation draft when the editor closes', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featurePhotoDirections: JSON.stringify([
            createPhotoDirection(1),
          ]),
        })}
        documents={[]}
        mode="photoDirection"
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_photos'));
    fireEvent.changeText(
      getByTestId('featureAnnotationNoteInput_0'),
      '닫을 때 남기는 현장 기록'
    );
    fireEvent.press(getByTestId('featurePitLineClose'));

    const updates = onUpdateResourceFields.mock.calls[0][0];
    const directions = JSON.parse(
      updates[KOREAN_FIELDWORK_FEATURE_PHOTO_DIRECTION_FIELDS.lines]
    );
    expect(directions[0].description).toBe('닫을 때 남기는 현장 기록');
  });

  it('deletes the exact photo annotation with its note and renumbers the rest', () => {
    const onUpdateResourceFields = jest.fn();
    const { getAllByTestId, getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featurePhotoDirections: JSON.stringify([
            createPhotoDirection(1, '첫 번째'),
            createPhotoDirection(2, '삭제할 두 번째'),
            createPhotoDirection(3, '세 번째'),
          ]),
        })}
        documents={[]}
        mode="photoDirection"
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('evidenceChip_photos'));
    fireEvent.changeText(
      getByTestId('featureAnnotationNoteInput_2'),
      '저장할 세 번째 수정 기록'
    );
    fireEvent.press(getByTestId('featureAnnotationNoteDelete_1'));

    const updates = onUpdateResourceFields.mock.calls[0][0];
    const directions = JSON.parse(
      updates[KOREAN_FIELDWORK_FEATURE_PHOTO_DIRECTION_FIELDS.lines]
    );
    expect(directions).toHaveLength(2);
    expect(directions.map((line: any) => line.id)).toEqual([
      'photo-direction-1',
      'photo-direction-2',
    ]);
    expect(directions.map((line: any) => line.label)).toEqual(['1', '2']);
    expect(directions.map((line: any) => line.description)).toEqual([
      '첫 번째',
      '저장할 세 번째 수정 기록',
    ]);
    expect(directions[1].start).toEqual({ x: 30, y: 20 });
    expect(getAllByTestId(/featureAnnotationNoteRow_/)).toHaveLength(2);
  });

  it('persists and deletes numbered pit-line notes with the same behavior', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featureSoilPitLines: JSON.stringify([
            { ...createPitLine(1), description: '서쪽 피트선' },
            { ...createPitLine(2), description: '동쪽 피트선' },
          ]),
        })}
        documents={[]}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('featurePitLineOpen'));
    fireEvent.changeText(
      getByTestId('featureAnnotationNoteInput_1'),
      '동쪽 피트선에서 목탄 확인'
    );
    fireEvent(getByTestId('featureAnnotationNoteInput_1'), 'blur');

    let updates = onUpdateResourceFields.mock.calls.at(-1)[0];
    let pitLines = JSON.parse(
      updates[KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.lines]
    );
    expect(pitLines[1].description).toBe('동쪽 피트선에서 목탄 확인');

    fireEvent.press(getByTestId('featureAnnotationNoteDelete_0'));

    updates = onUpdateResourceFields.mock.calls.at(-1)[0];
    pitLines = JSON.parse(
      updates[KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.lines]
    );
    expect(pitLines).toHaveLength(1);
    expect(pitLines[0]).toMatchObject({
      description: '동쪽 피트선에서 목탄 확인',
      id: 'soil-pit-line-1',
      label: '1',
      start: { x: 20, y: 20 },
    });
    expect(JSON.parse(
      updates[KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.line]
    )).toMatchObject({
      description: '동쪽 피트선에서 목탄 확인',
      id: 'soil-pit-line-1',
      label: '1',
    });
  });

  it('continues to ignore a short tap in soil pit line mode', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE)}
        documents={[]}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('featurePitLineOpen'));
    const canvas = getByTestId('featurePitLineCanvas');
    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 80, locationY: 50 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 86, locationY: 55 },
    });

    expect(onUpdateResourceFields).not.toHaveBeenCalled();
  });

  it('keeps the pit line hint row mounted while choosing points', () => {
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE)}
        documents={[]}
        onUpdateResourceFields={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('featurePitLineOpen'));
    const canvas = getByTestId('featurePitLineCanvas');

    expect(getByTestId('featurePitLinePendingHint')).toBeTruthy();
    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 80, locationY: 50 },
    });

    expect(getByTestId('featurePitLinePendingHint')).toBeTruthy();
  });

  it('adds another soil pit line to an existing feature line set', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featureSoilPitLines: JSON.stringify([
            {
              version: 1,
              id: 'soil-pit-line-1',
              label: '1',
              start: { x: 25, y: 30 },
              end: { x: 75, y: 65 },
            },
          ]),
        })}
        documents={[]}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );
    fireEvent.press(getByTestId('featurePitLineOpen'));
    const canvas = getByTestId('featurePitLineCanvas');

    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 40, locationY: 40 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 200, locationY: 100 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 360, locationY: 160 },
    });

    const updates = onUpdateResourceFields.mock.calls[0][0];
    const pitLines = JSON.parse(updates[KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.lines]);

    expect(pitLines).toHaveLength(2);
    expect(pitLines[0].label).toBe('1');
    expect(pitLines[1].label).toBe('2');
    expect(pitLines[1].start).toEqual({ x: 10, y: 20 });
    expect(pitLines[1].end).toEqual({ x: 90, y: 80 });
    expect(pitLines[1].points).toEqual([
      { x: 10, y: 20 },
      { x: 90, y: 80 },
    ]);
  });

  it('ignores non-finite touch coordinates instead of saving an invalid pit line', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE)}
        documents={[]}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );
    fireEvent.press(getByTestId('featurePitLineOpen'));
    const canvas = getByTestId('featurePitLineCanvas');

    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: Number.NaN, locationY: 50 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 320, locationY: 150 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 320, locationY: 150 },
    });

    expect(queryByTestId('featurePitLinePendingStart')).toBeNull();
    expect(onUpdateResourceFields).not.toHaveBeenCalled();
  });

  it('connects the feature pit line panel to soil profile photo creation', () => {
    const onAddSoilProfilePhoto = jest.fn();
    const feature = createDoc('feature-1', C.FEATURE);
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        allowedAddCategoryNames={[C.SOIL_PROFILE_PHOTO]}
        document={feature}
        documents={[]}
        onAddSoilProfilePhoto={onAddSoilProfilePhoto}
        onUpdateResourceFields={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('featurePitLineOpen'));
    fireEvent.press(getByTestId('featurePitLineAddSoilProfilePhoto'));

    expect(onAddSoilProfilePhoto).toHaveBeenCalledWith(
      feature,
      C.SOIL_PROFILE_PHOTO
    );
  });

  it('stays hidden outside feature records', () => {
    const { queryByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('photo-1', C.PHOTO)}
        documents={[]}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(queryByTestId('featurePitLinePanel')).toBeNull();
  });

  it('clears an existing soil pit line', () => {
    const onUpdateResourceFields = jest.fn();
    const { getAllByTestId, getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featureSoilPitLine: JSON.stringify({
            version: 1,
            start: { x: 25, y: 30 },
            end: { x: 75, y: 65 },
          }),
        })}
        documents={[]}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('featurePitLineOpen'));
    expect(getAllByTestId('featurePitLineSegment')).toHaveLength(1);
    fireEvent.press(getByTestId('featurePitLineClear'));

    expect(onUpdateResourceFields).toHaveBeenCalledWith(expect.objectContaining({
      [KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.line]: '',
      [KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.lines]: '[]',
    }));
  });

  it('undoes the last saved soil pit line before clearing the others', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featureSoilPitLines: JSON.stringify([
            {
              version: 1,
              id: 'soil-pit-line-1',
              label: '1',
              start: { x: 20, y: 30 },
              end: { x: 40, y: 50 },
            },
            {
              version: 1,
              id: 'soil-pit-line-2',
              label: '2',
              start: { x: 60, y: 30 },
              end: { x: 80, y: 50 },
            },
          ]),
        })}
        documents={[]}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId('featurePitLineOpen'));
    fireEvent.press(getByTestId('featurePitLineUndoLast'));

    const updates = onUpdateResourceFields.mock.calls[0][0];
    const pitLines = JSON.parse(updates[KOREAN_FIELDWORK_FEATURE_PIT_LINE_FIELDS.lines]);

    expect(pitLines).toHaveLength(1);
    expect(pitLines[0].label).toBe('1');
  });

  it('cancels a pending start point without updating the document', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE)}
        documents={[]}
        onUpdateResourceFields={onUpdateResourceFields}
      />
    );
    fireEvent.press(getByTestId('featurePitLineOpen'));
    const canvas = getByTestId('featurePitLineCanvas');

    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 80, locationY: 50 },
    });
    expect(getByTestId('featurePitLinePendingStart')).toBeTruthy();

    fireEvent.press(getByTestId('featurePitLineUndoLast'));

    expect(queryByTestId('featurePitLinePendingStart')).toBeNull();
    expect(onUpdateResourceFields).not.toHaveBeenCalled();
  });

  it('reads a legacy single soil pit line as the first line', () => {
    const { getAllByTestId, getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featureSoilPitLine: JSON.stringify({
            version: 1,
            start: { x: 25, y: 30 },
            end: { x: 75, y: 65 },
          }),
        })}
        documents={[]}
        onUpdateResourceFields={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('featurePitLineOpen'));
    expect(getAllByTestId('featurePitLineSegment')).toHaveLength(1);
    expect(getByTestId('featurePitLineLabel_0')).toBeTruthy();
  });
});

const createPitLine = (number: number) => ({
  version: 2,
  id: `soil-pit-line-${number}`,
  label: `${number}`,
  start: { x: 10 * number, y: 20 },
  end: { x: 10 * number + 20, y: 70 },
  points: [
    { x: 10 * number, y: 20 },
    { x: 10 * number + 20, y: 70 },
  ],
});

const createPhotoDirection = (
  number: number,
  description?: string
) => ({
  ...createPitLine(number),
  description,
  id: `photo-direction-${number}`,
  kind: 'direction',
});

const createDoc = (
  id: string,
  category: string,
  extraResource: Record<string, unknown> = {}
): Document => ({
  _id: id,
  created: { date: new Date(0), user: 'test' },
  modified: [],
  resource: {
    id,
    identifier: id,
    category,
    relations: {},
    ...extraResource,
  },
});
