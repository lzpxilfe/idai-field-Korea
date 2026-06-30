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
import { ConfigurationContext } from '@/contexts/configuration-context';
import LabelsContext from '@/contexts/labels/labels-context';
import DocumentAddModal from './DocumentAddModal';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('DocumentAddModal', () => {
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

  it('does not create a feature before the feature name is entered', () => {
    const onAddCategory = jest.fn();
    const parentDoc = {
      resource: {
        id: 'trench-1',
        identifier: 'T1',
        category: C.TRENCH,
        relations: {},
      },
    } as any;

    const { getByTestId, getByText } = render(
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
    fireEvent.press(getByTestId('featureType_startUnknown'));

    expect(getByText('유구명을 먼저 입력하세요.')).toBeTruthy();
    expect(onAddCategory).not.toHaveBeenCalled();
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
