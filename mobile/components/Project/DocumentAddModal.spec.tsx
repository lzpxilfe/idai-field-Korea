import {
  fireEvent,
  render,
} from '@testing-library/react-native';
import {
  CategoryForm,
  createCategory,
  Forest,
  Labels,
  Tree,
} from 'idai-field-core';
import React from 'react';
import { StyleSheet } from 'react-native';
import { ConfigurationContext } from '@/contexts/configuration-context';
import LabelsContext from '@/contexts/labels/labels-context';
import DocumentAddModal from './DocumentAddModal';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('DocumentAddModal', () => {
  it('starts with the feature name field when Feature is the initial category', () => {
    const onAddCategory = jest.fn();
    const parentDoc = {
      resource: {
        id: 'operation-1',
        identifier: 'Operation 1',
        category: C.TRENCH,
        relations: {},
      },
    } as any;

    const { getByTestId, queryByTestId } = render(
      <LabelsContext.Provider value={{ labels: new Labels(() => ['ko']) }}>
        <ConfigurationContext.Provider value={createConfig([
          createCategory(C.TRENCH),
          createCategory(C.FEATURE),
        ])}
        >
          <DocumentAddModal
            initialCategoryName={C.FEATURE}
            initialDraftParams={{ geometrySource: 'gpsApproximate' }}
            onAddCategory={onAddCategory}
            onClose={jest.fn()}
            parentDoc={parentDoc}
          />
        </ConfigurationContext.Provider>
      </LabelsContext.Provider>
    );

    expect(getByTestId('featureIdentifierInput')).toBeTruthy();
    expect(queryByTestId(`addCategory_${C.FEATURE}`)).toBeNull();

    fireEvent.changeText(getByTestId('featureIdentifierInput'), '1호 유구');
    fireEvent.press(getByTestId('featureType_startUnknown'));

    expect(onAddCategory).toHaveBeenCalledWith(C.FEATURE, parentDoc, {
      featureType: 'unknown',
      geometrySource: 'gpsApproximate',
      identifier: '1호 유구',
    });
  });

  it('asks for a feature type before creating a Feature record', () => {
    const onAddCategory = jest.fn();
    const parentDoc = {
      resource: {
        id: 'trench-1',
        identifier: 'T1',
        category: C.TRENCH,
        relations: {},
      },
    } as any;

    const { getByTestId, getByText, queryByText } = render(
      <LabelsContext.Provider value={{ labels: new Labels(() => ['ko']) }}>
        <ConfigurationContext.Provider value={createConfig([
          createCategory(C.TRENCH),
          createCategory(C.FEATURE),
        ])}
        >
          <DocumentAddModal
            onAddCategory={onAddCategory}
            onClose={jest.fn()}
            parentDoc={parentDoc}
          />
        </ConfigurationContext.Provider>
      </LabelsContext.Provider>
    );

    expect(getByText('포함 위치: T1')).toBeTruthy();
    expect(getByText(
      '여기서는 층위 선후를 정하지 않습니다. 새 기록이 어느 조사 경계·트렌치·유구에 포함되는지만 정합니다.'
    )).toBeTruthy();

    fireEvent.press(getByTestId(`addCategory_${C.FEATURE}`));

    expect(getByText('유구 추가')).toBeTruthy();
    expect(getByText('포함 위치: T1')).toBeTruthy();
    expect(getByText(
      '여기서는 층위 선후를 정하지 않습니다. 새 기록이 어느 조사 경계·트렌치·유구에 포함되는지만 정합니다.'
    )).toBeTruthy();
    expect(getByText('유구로 바로 만들기')).toBeTruthy();
    expect(getByText(
      '유구명만 먼저 적어도 됩니다. 성격과 세부 정보는 조사하면서 계속 채우고 고칠 수 있습니다.'
    )).toBeTruthy();
    expect(queryByText('조사 참고')).toBeNull();
    fireEvent.changeText(getByTestId('featureIdentifierInput'), '  1호 수혈  ');

    fireEvent.press(getByTestId('featureTypeHelp_pit'));

    expect(getByText('조사 참고')).toBeTruthy();
    expect(getByText('현장 상황에 맞게 바꿔도 되는 참고용 순서입니다.')).toBeTruthy();
    expect(getByText('조사 전 사진 → 윤곽·어깨선 → 장축·단축·깊이')).toBeTruthy();

    fireEvent.press(getByTestId('featureType_pit'));

    expect(onAddCategory).toHaveBeenCalledWith(C.FEATURE, parentDoc, {
      featureType: 'pit',
      identifier: '1호 수혈',
    });
  });

  it('auto-names a feature when a type is chosen without a typed name', () => {
    const onAddCategory = jest.fn();
    const parentDoc = {
      resource: {
        id: 'trench-1',
        identifier: 'T1',
        category: C.TRENCH,
        relations: {},
      },
    } as any;

    const { getByTestId } = render(
      <LabelsContext.Provider value={{ labels: new Labels(() => ['ko']) }}>
        <ConfigurationContext.Provider value={createConfig([
          createCategory(C.TRENCH),
          createCategory(C.FEATURE),
        ])}
        >
          <DocumentAddModal
            onAddCategory={onAddCategory}
            onClose={jest.fn()}
            parentDoc={parentDoc}
          />
        </ConfigurationContext.Provider>
      </LabelsContext.Provider>
    );

    fireEvent.press(getByTestId(`addCategory_${C.FEATURE}`));
    fireEvent.press(getByTestId('featureType_pit'));

    expect(onAddCategory).toHaveBeenCalledWith(C.FEATURE, parentDoc, {
      featureType: 'pit',
      identifier: '1호 수혈',
    });
  });

  it('continues feature numbers from existing records of the same type', () => {
    const onAddCategory = jest.fn();
    const parentDoc = {
      resource: {
        id: 'trench-1',
        identifier: 'T1',
        category: C.TRENCH,
        relations: {},
      },
    } as any;

    const { getByTestId } = render(
      <LabelsContext.Provider value={{ labels: new Labels(() => ['ko']) }}>
        <ConfigurationContext.Provider value={createConfig([
          createCategory(C.TRENCH),
          createCategory(C.FEATURE),
        ])}
        >
          <DocumentAddModal
            existingDocuments={[
              createDocument('feature-1', C.FEATURE, '1호 수혈', { featureType: 'pit' }),
              createDocument('feature-2', C.FEATURE, '조선시대 2호 수혈', { featureType: 'pit' }),
              createDocument('feature-3', C.FEATURE, '1호 구상유구', { featureType: 'ditch' }),
            ]}
            onAddCategory={onAddCategory}
            onClose={jest.fn()}
            parentDoc={parentDoc}
          />
        </ConfigurationContext.Provider>
      </LabelsContext.Provider>
    );

    fireEvent.press(getByTestId(`addCategory_${C.FEATURE}`));
    fireEvent.press(getByTestId('featureType_pit'));

    expect(onAddCategory).toHaveBeenCalledWith(C.FEATURE, parentDoc, {
      featureType: 'pit',
      identifier: '3호 수혈',
    });
  });

  it('can create a feature without choosing a detailed type first', () => {
    const onAddCategory = jest.fn();
    const parentDoc = {
      resource: {
        id: 'trench-1',
        identifier: 'T1',
        category: C.TRENCH,
        relations: {},
      },
    } as any;

    const { getByTestId } = render(
      <LabelsContext.Provider value={{ labels: new Labels(() => ['ko']) }}>
        <ConfigurationContext.Provider value={createConfig([
          createCategory(C.TRENCH),
          createCategory(C.FEATURE),
        ])}
        >
          <DocumentAddModal
            onAddCategory={onAddCategory}
            onClose={jest.fn()}
            parentDoc={parentDoc}
          />
        </ConfigurationContext.Provider>
      </LabelsContext.Provider>
    );

    fireEvent.press(getByTestId(`addCategory_${C.FEATURE}`));
    fireEvent.changeText(getByTestId('featureIdentifierInput'), '1호 유구');
    fireEvent.press(getByTestId('featureType_startUnknown'));

    expect(onAddCategory).toHaveBeenCalledWith(C.FEATURE, parentDoc, {
      featureType: 'unknown',
      identifier: '1호 유구',
    });
  });

  it('passes a rough location sketch when adding a feature', () => {
    const onAddCategory = jest.fn();
    const parentDoc = {
      resource: {
        id: 'trench-1',
        identifier: 'T1',
        category: C.TRENCH,
        relations: {},
      },
    } as any;

    const { getByTestId, getByText, queryByText } = render(
      <LabelsContext.Provider value={{ labels: new Labels(() => ['ko']) }}>
        <ConfigurationContext.Provider value={createConfig([
          createCategory(C.TRENCH),
          createCategory(C.FEATURE),
        ])}
        >
          <DocumentAddModal
            onAddCategory={onAddCategory}
            onClose={jest.fn()}
            parentDoc={parentDoc}
          />
        </ConfigurationContext.Provider>
      </LabelsContext.Provider>
    );

    fireEvent.press(getByTestId(`addCategory_${C.FEATURE}`));

    expect(getByText('유구 위치 지도')).toBeTruthy();
    expect(getByText(
      '위성지도나 평면도처럼 조사 경계 위에 유구를 바로 얹습니다.'
    )).toBeTruthy();
    expect(getByText('조사 경계 위 배치')).toBeTruthy();
    expect(queryByText('위성지도식 평면')).toBeNull();
    expect(queryByText('평면 배치 지도')).toBeNull();
    expect(queryByText(/위에서 보기|위에서 보고/)).toBeNull();
    expect(queryByText(/3D|조감/)).toBeNull();

    const canvas = getByTestId('featureLocationSketchCanvas');
    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 100, width: 200 } },
    });
    fireEvent.press(getByTestId('featureSketchMode_oval'));
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 150, locationY: 50 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 150, locationY: 50 },
    });
    fireEvent.press(getByTestId('featureSketchRotateRight'));
    fireEvent.press(getByTestId('featureSketchScaleUp'));
    fireEvent.changeText(getByTestId('featureIdentifierInput'), '1호 수혈');
    fireEvent.press(getByTestId('featureType_pit'));

    expect(onAddCategory).toHaveBeenCalledWith(C.FEATURE, parentDoc, {
      featureGeometryRevisionNote:
        '위치 스케치: 타원, 중심 75%, 50%, 크기 110%, 회전 15°',
      featureLocationSketch: JSON.stringify({
        version: 1,
        shape: 'oval',
        center: { x: 75, y: 50 },
        points: [{ x: 75, y: 50 }],
        rotation: 15,
        scale: 110,
      }),
      featureType: 'pit',
      identifier: '1호 수혈',
      shortDescription:
        '위치 스케치: 타원, 중심 75%, 50%, 크기 110%, 회전 15°',
    });
  });

  it('shows the project boundary and live polygon line in a map-first tablet layout', () => {
    const parentDoc = {
      resource: {
        id: 'trench-1',
        identifier: 'T1',
        category: C.TRENCH,
        relations: {},
      },
    } as any;

    const { getByTestId } = render(
      <LabelsContext.Provider value={{ labels: new Labels(() => ['ko']) }}>
        <ConfigurationContext.Provider value={createConfig([
          createCategory(C.TRENCH),
          createCategory(C.FEATURE),
        ])}
        >
          <DocumentAddModal
            boundaryDraft={createBoundaryDraft()}
            initialCategoryName={C.FEATURE}
            onAddCategory={jest.fn()}
            onClose={jest.fn()}
            parentDoc={parentDoc}
          />
        </ConfigurationContext.Provider>
      </LabelsContext.Provider>
    );

    expect(getByTestId('featureSketchBoundaryPoint_0')).toBeTruthy();
    expect(getByTestId('featureSketchFlatMapSurface')).toBeTruthy();
    expect(getByTestId('featureSketchMode_polygon').props.accessibilityState)
      .toEqual({ selected: true });

    const canvas = getByTestId('featureLocationSketchCanvas');
    expect(StyleSheet.flatten(getByTestId('featureCreationLayout').props.style))
      .toEqual(expect.objectContaining({
        flexDirection: 'column',
      }));
    expect(StyleSheet.flatten(getByTestId('featureCreationMapPane').props.style))
      .toEqual(expect.objectContaining({
        flex: 1,
        minWidth: 0,
      }));
    const mapPaneStyle = StyleSheet.flatten(getByTestId('featureCreationMapPane').props.style);
    if (mapPaneStyle.minHeight !== undefined) {
      expect(mapPaneStyle.minHeight).toBeGreaterThanOrEqual(720);
    }
    const formPaneStyle = StyleSheet.flatten(getByTestId('featureCreationFormPane').props.style);
    expect(formPaneStyle).toEqual(expect.objectContaining({ minWidth: 0 }));
    if (formPaneStyle.flexDirection === 'row') {
      expect(formPaneStyle).toEqual(expect.objectContaining({
        borderTopWidth: 1,
        width: '100%',
      }));
    }
    expect(StyleSheet.flatten(getByTestId('featureLocationSketchPanel').props.style))
      .toEqual(expect.objectContaining({ flex: 1 }));
    expect(getByTestId('featureSketchPlacementBadge')).toBeTruthy();
    expect(getByTestId('featureSketchModeRail').props.style).toEqual(
      expect.objectContaining({
        bottom: 12,
        flexDirection: 'row',
      })
    );
    expect(getByTestId('featureSketchToolRail').props.style).toEqual(
      expect.objectContaining({
        flexDirection: 'column',
        top: 70,
      })
    );
    expect(canvas.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ height: expect.any(Number) }),
      ])
    );
    const canvasStyles = canvas.props.style as Array<{ height?: number }>;
    const dynamicCanvasStyle = canvasStyles[canvasStyles.length - 1];
    expect(dynamicCanvasStyle.height).toBeGreaterThanOrEqual(600);
    fireEvent(canvas, 'layout', {
      nativeEvent: { layout: { height: 100, width: 200 } },
    });
    fireEvent.press(getByTestId('featureSketchMode_polygon'));
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 40, locationY: 25 },
    });
    fireEvent(canvas, 'responderRelease', {
      nativeEvent: { locationX: 40, locationY: 25 },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 120, locationY: 50 },
    });
    fireEvent(canvas, 'responderMove', {
      nativeEvent: { locationX: 150, locationY: 60 },
    });

    expect(getByTestId('featureSketchLine')).toBeTruthy();
    expect(getByTestId('featureSketchPoint_1').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          left: '75%',
          top: '60%',
        }),
      ])
    );
  });

  it('closes when the backdrop is pressed', () => {
    const onClose = jest.fn();
    const parentDoc = {
      resource: {
        id: 'trench-1',
        identifier: 'T1',
        category: C.TRENCH,
        relations: {},
      },
    } as any;

    const { getByTestId } = render(
      <LabelsContext.Provider value={{ labels: new Labels(() => ['ko']) }}>
        <ConfigurationContext.Provider value={createConfig([
          createCategory(C.TRENCH),
          createCategory(C.FEATURE),
        ])}
        >
          <DocumentAddModal
            onAddCategory={jest.fn()}
            onClose={onClose}
            parentDoc={parentDoc}
          />
        </ConfigurationContext.Provider>
      </LabelsContext.Provider>
    );

    fireEvent.press(getByTestId('documentAddModalBackdrop'));

    expect(onClose).toHaveBeenCalled();
  });
});

const createConfig = (categories: Forest<CategoryForm>) => ({
  getCategories: () => categories,
  getCategory: (categoryName: string) =>
    Tree.flatten(categories).find((category) => category.name === categoryName),
  isAllowedRelationDomainCategory: (
    categoryName: string,
    parentCategoryName: string,
    relationName: string
  ) =>
    categoryName === C.FEATURE
    && parentCategoryName === C.TRENCH
    && relationName === 'liesWithin',
} as any);

const createDocument = (
  id: string,
  category: string,
  identifier: string,
  fields: Record<string, unknown> = {}
) => ({
  resource: {
    id,
    identifier,
    category,
    relations: {},
    ...fields,
  },
} as any);

const createBoundaryDraft = () => ({
  coordinates: [
    { latitude: 37.1, longitude: 127.1 },
    { latitude: 37.1, longitude: 127.2 },
    { latitude: 37.0, longitude: 127.2 },
    { latitude: 37.0, longitude: 127.1 },
  ],
});
