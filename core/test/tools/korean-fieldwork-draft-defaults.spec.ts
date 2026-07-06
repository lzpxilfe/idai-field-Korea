import {
    getKoreanFieldworkConfiguredDraftFieldDefaults,
    getKoreanFieldworkDraftFieldDefaults,
    getKoreanFieldworkFeatureTraceConfiguredDraftValues,
    getKoreanFieldworkFeatureTraceDraftValues,
    isKoreanFieldworkFeatureDraftCategory,
    KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE
} from '../../src/tools/korean-fieldwork-draft-defaults';


describe('Korean fieldwork draft defaults', () => {

    it('keeps feature, trench, and layer draft defaults in core', () => {

        expect(getKoreanFieldworkDraftFieldDefaults('Feature', {
            includeGeometryDefaults: true
        })).toEqual({
            featureRecordingStatus: 'candidate',
            featureGeometryEditStatus: 'roughSketch',
            featureGeometryRevisionHistory: '[]',
            featureInvestigationChecklist: [],
            featureSoilProfilePhotoCount: 0,
            geometrySource: 'tabletSketch',
            geometryConfidence: 'rough'
        });

        expect(getKoreanFieldworkDraftFieldDefaults('Feature', {
            geometrySource: 'gpsApproximate'
        })).toEqual(jasmine.objectContaining({
            geometrySource: 'gpsApproximate',
            geometryConfidence: 'rough'
        }));
        expect(getKoreanFieldworkDraftFieldDefaults('FeatureGroup')).toEqual({
            featureRecordingStatus: 'candidate',
            featureGeometryEditStatus: 'roughSketch',
            featureGeometryRevisionHistory: '[]',
            featureInvestigationChecklist: [],
            featureSoilProfilePhotoCount: 0
        });
        expect(getKoreanFieldworkDraftFieldDefaults('FeatureSegment')).toEqual({
            featureRecordingStatus: 'candidate',
            featureGeometryEditStatus: 'roughSketch',
            featureGeometryRevisionHistory: '[]',
            featureInvestigationChecklist: [],
            featureSoilProfilePhotoCount: 0
        });

        expect(getKoreanFieldworkDraftFieldDefaults('Trench')).toEqual({
            featureInvestigationChecklist: [],
            fieldRecordQuality: [],
            recordCreationTiming: 'duringFieldwork'
        });

        expect(getKoreanFieldworkDraftFieldDefaults('Layer')).toEqual({
            layerSequenceNumber: 1,
            layerSequenceMeaning: 'latestToEarliest',
            soilColorAssistStatus: 'notRun'
        });
    });


    it('keeps media, survey boundary, and pen memo defaults in core', () => {

        expect(getKoreanFieldworkDraftFieldDefaults('SoilProfilePhoto')).toEqual({
            layerSequenceMeaning: 'latestToEarliest',
            soilColorAssistCandidates: '',
            soilColorAssistStatus: 'notRun',
            soilProfileAnnotationStrokes: '[]',
            soilProfilePhotoAnnotationStrokes: '[]',
            soilProfileColorSwatches: '',
            soilProfileLayerIds: '[]',
            soilProfileLayerMarkers: '[]',
            soilProfilePhotoQuality: 0.35,
            soilProfilePhotoSizeHintKb: 512
        });

        expect(getKoreanFieldworkDraftFieldDefaults('Photo')).toEqual({
            fieldworkPhotoAnnotationStrokes: '[]',
            fieldworkPhotoQuality: 0.35,
            fieldworkPhotoSizeHintKb: 512,
            mediaEvidenceRole: ['fieldResultRecord']
        });

        expect(getKoreanFieldworkDraftFieldDefaults('Drawing')).toEqual({
            drawingSketchStrokes: '[]',
            mediaEvidenceRole: ['fieldResultRecord']
        });

        expect(getKoreanFieldworkDraftFieldDefaults('SurveyBoundary', {
            boundaryAccuracy: 'importedReference',
            boundarySource: 'shpImport',
            boundarySummary: '  SHP boundary  ',
            referenceBasemapProvider: 'importedVectorLayer'
        })).toEqual({
            shortDescription: 'SHP boundary',
            referenceBasemapProvider: 'importedVectorLayer',
            surveyBoundaryAccuracy: 'importedReference',
            surveyBoundaryNote: 'SHP boundary',
            surveyBoundarySource: 'shpImport',
            surveyBoundaryType: 'operationBoundary'
        });

        expect(getKoreanFieldworkDraftFieldDefaults('PenMemo')).toEqual({
            penMemoStrokes: '[]',
            penMemoTranscriptionStatus: 'pending'
        });
    });


    it('filters defaults through configured desktop category fields', () => {

        const category = createCategory('SoilProfilePhoto', [
            field('layerSequenceMeaning', 'KoreanFieldwork-layerSequenceMeaning'),
            field('soilColorAssistStatus'),
            field('soilProfilePhotoQuality')
        ]);

        expect(getKoreanFieldworkConfiguredDraftFieldDefaults(category)).toEqual({
            layerSequenceMeaning: 'latestToEarliest',
            soilColorAssistStatus: 'notRun',
            soilProfilePhotoQuality: 0.35
        });
        expect(getKoreanFieldworkConfiguredDraftFieldDefaults(createCategory('Layer', [
            field('layerSequenceMeaning', 'Other-layerSequenceMeaning'),
            field('soilColorAssistStatus')
        ]))).toEqual({});
    });


    it('keeps desktop trace draft values in the same core contract', () => {

        const category = createCategory('Feature', [
            field('featureRecordingStatus', 'KoreanFieldwork-featureRecordingStatus'),
            field('featureGeometryRevisionNote'),
            field('geometrySource'),
            field('geometryConfidence'),
            field('shortDescription')
        ]);

        expect(isKoreanFieldworkFeatureDraftCategory(category)).toBe(true);
        expect(KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE)
            .toContain('\uc870\uc0ac \uacbd\uacc4');
        expect(getKoreanFieldworkFeatureTraceDraftValues()).toEqual({
            featureGeometryRevisionNote: KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE,
            geometryConfidence: 'rough',
            geometrySource: 'aerialLayerTrace',
            shortDescription: KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE
        });
        expect(getKoreanFieldworkFeatureTraceConfiguredDraftValues(category))
            .toEqual(getKoreanFieldworkFeatureTraceDraftValues());
    });
});


const createCategory = (name: string, fields: any[]) => ({
    name,
    groups: [{
        fields,
        name: 'koreanFieldwork'
    }]
} as any);


const field = (name: string, valuelistId?: string) => ({
    name,
    ...(valuelistId ? { valuelist: { id: valuelistId } } : {})
});
