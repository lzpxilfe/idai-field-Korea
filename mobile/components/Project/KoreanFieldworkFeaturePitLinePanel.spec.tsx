import { fireEvent, render } from '@testing-library/react-native';
import { Document } from 'idai-field-core';
import React from 'react';
import KoreanFieldworkFeaturePitLinePanel, {
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
  it('stores a straight soil pit line from two tapped points', () => {
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
    const canvas = getByTestId('featurePitLineCanvas');

    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 80, locationY: 50 },
    });

    expect(onUpdateResourceFields).not.toHaveBeenCalled();
    expect(getByTestId('featurePitLinePendingStart')).toBeTruthy();

    fireEvent(canvas, 'responderGrant', {
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

  it('keeps the pit line hint row mounted while choosing points', () => {
    const { getByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE)}
        documents={[]}
        onUpdateResourceFields={jest.fn()}
      />
    );
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
    const canvas = getByTestId('featurePitLineCanvas');

    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 40, locationY: 40 },
    });
    fireEvent(canvas, 'responderGrant', {
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

  it('renders legacy multi-point pit lines as one straight segment', () => {
    const { getAllByTestId, queryByTestId } = render(
      <KoreanFieldworkFeaturePitLinePanel
        document={createDoc('feature-1', C.FEATURE, {
          featureSoilPitLines: JSON.stringify([
            {
              version: 2,
              id: 'soil-pit-line-1',
              label: '1',
              start: { x: 20, y: 25 },
              end: { x: 80, y: 75 },
              points: [
                { x: 20, y: 25 },
                { x: 80, y: 25 },
                { x: 80, y: 75 },
              ],
            },
          ]),
        })}
        documents={[]}
        onUpdateResourceFields={jest.fn()}
      />
    );

    expect(getAllByTestId('featurePitLineSegment')).toHaveLength(1);
    expect(queryByTestId('featurePitLineCorner_0_0')).toBeNull();
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
    const canvas = getByTestId('featurePitLineCanvas');

    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 200, width: 400 } },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: Number.NaN, locationY: 50 },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 320, locationY: 150 },
    });

    expect(queryByTestId('featurePitLinePendingStart')).toBeTruthy();
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

    expect(getAllByTestId('featurePitLineSegment')).toHaveLength(1);
    expect(getByTestId('featurePitLineLabel_0')).toBeTruthy();
  });
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
