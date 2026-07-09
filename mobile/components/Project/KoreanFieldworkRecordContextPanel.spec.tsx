import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import KoreanFieldworkRecordContextPanel from './KoreanFieldworkRecordContextPanel';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

const C = KOREAN_FIELDWORK_CATEGORIES;

describe('KoreanFieldworkRecordContextPanel', () => {
  it('shows parent scope as a separate included-location line', () => {
    const operation = createDoc('operation-1', C.OPERATION, 'OP1');
    const trench = createDoc('trench-1', C.TRENCH, 'TR1', {
      liesWithin: ['operation-1'],
    });
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1', {
      liesWithin: ['trench-1'],
    });
    const { getByText, queryByText } = render(
      <KoreanFieldworkRecordContextPanel
        document={feature}
        documents={[operation, trench, feature]}
        onOpenDocument={jest.fn()}
      />
    );

    expect(getByText('포함 위치: OP1 > TR1')).toBeTruthy();
    expect(queryByText('유구 · OP1 > TR1')).toBeNull();
  });

  it('creates missing allowed evidence from the current fieldwork record', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1');
    const handleAddDocumentOfCategory = jest.fn();
    const handleOpenDocument = jest.fn();
    const { getByTestId, getByText } = render(
      <KoreanFieldworkRecordContextPanel
        document={feature}
        documents={[feature]}
        allowedAddCategoryNames={[C.PHOTO]}
        onAddDocumentOfCategory={handleAddDocumentOfCategory}
        onOpenDocument={handleOpenDocument}
      />
    );

    expect(getByText('추가')).toBeTruthy();
    fireEvent.press(getByTestId('evidenceMetric_photos'));

    expect(handleAddDocumentOfCategory).toHaveBeenCalledWith(feature, C.PHOTO);
    expect(handleOpenDocument).not.toHaveBeenCalled();
  });

  it('opens existing linked evidence instead of creating a duplicate record', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1');
    const photo = createDoc('photo-1', C.PHOTO, '수혈 1 조사 중 사진', {
      depicts: ['feature-1'],
    });
    const handleAddDocumentOfCategory = jest.fn();
    const handleOpenDocument = jest.fn();
    const { getByTestId, queryByText } = render(
      <KoreanFieldworkRecordContextPanel
        document={feature}
        documents={[feature, photo]}
        allowedAddCategoryNames={[C.PHOTO]}
        onAddDocumentOfCategory={handleAddDocumentOfCategory}
        onOpenDocument={handleOpenDocument}
      />
    );

    expect(queryByText('추가')).toBeNull();
    fireEvent.press(getByTestId('evidenceMetric_photos'));

    expect(handleOpenDocument).toHaveBeenCalledWith(photo);
    expect(handleAddDocumentOfCategory).not.toHaveBeenCalled();
  });

  it('expands busy evidence groups before opening an individual record', () => {
    const feature = createDoc('feature-1', C.FEATURE, 'feature 1');
    const firstPhoto = createDoc('photo-1', C.PHOTO, 'photo 1', {
      depicts: ['feature-1'],
    }, {
      shortDescription: 'north overview',
    });
    const secondPhoto = createDoc('photo-2', C.PHOTO, 'photo 2', {
      depicts: ['feature-1'],
    }, {
      shortDescription: 'section detail',
    });
    const handleAddDocumentOfCategory = jest.fn();
    const handleOpenDocument = jest.fn();
    const { getByTestId, getByText } = render(
      <KoreanFieldworkRecordContextPanel
        document={feature}
        documents={[feature, firstPhoto, secondPhoto]}
        allowedAddCategoryNames={[C.PHOTO]}
        onAddDocumentOfCategory={handleAddDocumentOfCategory}
        onOpenDocument={handleOpenDocument}
      />
    );

    fireEvent.press(getByTestId('evidenceMetric_photos'));

    expect(handleOpenDocument).not.toHaveBeenCalled();
    expect(getByTestId('evidenceGroup_photos')).toBeTruthy();
    expect(getByText('photo 1')).toBeTruthy();
    expect(getByText('section detail')).toBeTruthy();

    fireEvent.press(getByTestId('evidenceGroupItem_photos_photo-2'));

    expect(handleOpenDocument).toHaveBeenCalledWith(secondPhoto);

    fireEvent.press(getByTestId('evidenceGroupAdd_photos'));

    expect(handleAddDocumentOfCategory).toHaveBeenCalledWith(feature, C.PHOTO);
  });

  it('opens directly attached tablet photos instead of creating a duplicate record', () => {
    const feature = createDoc('feature-1', C.FEATURE, '?섑삁 1', {}, {
      fieldworkPhotoUri: 'file:///tablet/photos/feature-1.jpg',
    });
    const handleAddDocumentOfCategory = jest.fn();
    const handleOpenDocument = jest.fn();
    const { getByTestId, queryByText } = render(
      <KoreanFieldworkRecordContextPanel
        document={feature}
        documents={[feature]}
        allowedAddCategoryNames={[C.PHOTO]}
        onAddDocumentOfCategory={handleAddDocumentOfCategory}
        onOpenDocument={handleOpenDocument}
      />
    );

    expect(queryByText('異붽?')).toBeNull();
    fireEvent.press(getByTestId('evidenceMetric_photos'));

    expect(handleOpenDocument).toHaveBeenCalledWith(feature);
    expect(handleAddDocumentOfCategory).not.toHaveBeenCalled();
  });

  it('opens linked tablet media records whose original preservation is not confirmed', () => {
    const feature = createDoc('feature-1', C.FEATURE, '?섑삁 1', {}, {
      featureRecordingStatus: 'confirmed',
      featureInvestigationChecklist: ['completionPhotoTaken'],
    });
    const photo = createDoc('photo-1', C.PHOTO, '?섑삁 1 議곗궗 以??ъ쭊', {
      depicts: ['feature-1'],
    }, {
      fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg',
    });
    const handleOpenDocument = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkRecordContextPanel
        document={feature}
        documents={[feature, photo]}
        onOpenDocument={handleOpenDocument}
      />
    );

    fireEvent.press(getByTestId(
      'issueOpen_fieldwork-photo-upload-missing_photo-1'
    ));

    expect(handleOpenDocument).toHaveBeenCalledWith(photo);
  });

  it('does not turn missing evidence into an add action when the category is not allowed', () => {
    const feature = createDoc('feature-1', C.FEATURE, '수혈 1');
    const handleAddDocumentOfCategory = jest.fn();
    const { getByTestId, queryByText } = render(
      <KoreanFieldworkRecordContextPanel
        document={feature}
        documents={[feature]}
        allowedAddCategoryNames={[]}
        onAddDocumentOfCategory={handleAddDocumentOfCategory}
        onOpenDocument={jest.fn()}
      />
    );

    const photoMetric = getByTestId('evidenceMetric_photos');

    expect(queryByText('추가')).toBeNull();
    fireEvent.press(photoMetric);

    expect(handleAddDocumentOfCategory).not.toHaveBeenCalled();
  });

  it('resolves current record checklist issues from the context panel', () => {
    const feature = createDoc('feature-1', C.FEATURE, '유구 1', {}, {
      featureRecordingStatus: 'confirmed',
      featureInvestigationChecklist: ['measuredDrawingCompleted'],
    });
    const handleUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkRecordContextPanel
        document={feature}
        documents={[feature]}
        allowedAddCategoryNames={[]}
        onOpenDocument={jest.fn()}
        onUpdateResourceFields={handleUpdateResourceFields}
      />
    );

    fireEvent.press(getByTestId(
      'issueResolution_feature-complete-photo_feature-1'
    ));

    expect(handleUpdateResourceFields).toHaveBeenCalledWith({
      featureInvestigationChecklist: [
        'measuredDrawingCompleted',
        'completionPhotoTaken',
      ],
    });
  });

  it('starts missing soil profile photo records from a readiness issue', () => {
    const feature = createDoc('feature-1', C.FEATURE, '유구 1', {}, {
      featureSoilProfilePhotoCount: 1,
      featureInvestigationChecklist: ['soilProfilePhotoLinked'],
    });
    const handleAddDocumentOfCategory = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkRecordContextPanel
        document={feature}
        documents={[feature]}
        allowedAddCategoryNames={[C.SOIL_PROFILE_PHOTO]}
        onAddDocumentOfCategory={handleAddDocumentOfCategory}
        onOpenDocument={jest.fn()}
        onUpdateResourceFields={jest.fn()}
      />
    );

    fireEvent.press(getByTestId(
      'issueResolution_soil-profile-photo-count_feature-1'
    ));

    expect(handleAddDocumentOfCategory)
      .toHaveBeenCalledWith(feature, C.SOIL_PROFILE_PHOTO);
  });
});

const createDoc = (
  id: string,
  category: string,
  identifier: string,
  relations: Record<string, string[]> = {},
  extraResource: Record<string, unknown> = {}
) => ({
  resource: {
    id,
    identifier,
    category,
    relations,
    ...extraResource,
  },
} as any);
