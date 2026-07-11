import { Injectable } from '@angular/core';
import { AppConfigurator, ConfigReader, ConfigurationDocument, DocumentCache, Indexer, IndexFacade,
    PouchdbDatastore, ProjectConfiguration, Document } from 'idai-field-core';
import { SampleDataLoader } from './datastore/field/sampledata/sample-data-loader';
import { ThumbnailGenerator } from './imagestore/thumbnail-generator';
import { ImagesState } from '../components/image/overview/view/images-state';
import { ResourcesStateManager } from '../components/resources/view/resources-state-manager';
import { Settings } from './settings/settings';
import { SettingsProvider } from './settings/settings-provider';
import { TabManager } from './tabs/tab-manager';
import { ConfigurationIndex } from './configuration/index/configuration-index';
import { ConfigurationState } from '../components/configuration/configuration-state';
import { Messages } from '../components/messages/messages';
import { M } from '../components/messages/m';
import { ImageDocumentsManager } from '../components/image/overview/view/image-documents-manager';
import {
    KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD,
    KOREAN_FIELDWORK_PROJECT_INVESTIGATION_MODE_FIELD
} from '../util/korean-fieldwork-project-setup';

import { electronIpc as ipcRenderer } from 'src/app/electron/electron';


@Injectable()
/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 * 
 * Called from e2e tests
 */
export class AppController {

    constructor(private resourcesState: ResourcesStateManager,
                private imagesState: ImagesState,
                private configurationState: ConfigurationState,
                private documentCache: DocumentCache,
                private indexFacade: IndexFacade,
                private thumbnailGenerator: ThumbnailGenerator,
                private pouchdbDatastore: PouchdbDatastore,
                private settingsProvider: SettingsProvider,
                private tabManager: TabManager,
                private imageDocumentsManager: ImageDocumentsManager,
                private projectConfiguration: ProjectConfiguration,
                private configurationIndex: ConfigurationIndex,
                private configReader: ConfigReader,
                private appConfigurator: AppConfigurator,
                private messages: Messages) {}

    
    public initialize() {

        ipcRenderer.on('resetApp', async () => {
            await this.reset();
            this.messages.add([M.APP_CONTROLLER_SUCCESS]);
        });

        ipcRenderer.on('createNonUniqueIdentifierWarning', async () => {
            await this.createNonUniqueIdentifierWarning();
            this.messages.add([M.APP_CONTROLLER_SUCCESS]);
        });

        ipcRenderer.on('createConflict', async () => {
            await this.createConflict();
            this.messages.add([M.APP_CONTROLLER_SUCCESS]);
        });

        ipcRenderer.on('createMissingRelationTargetWarning', async () => {
            await this.createMissingRelationTargetWarning();
            this.messages.add([M.APP_CONTROLLER_SUCCESS]);
        });

        ipcRenderer.on('createMissingOrInvalidParentWarning', async () => {
            await this.createMissingOrInvalidParentWarning();
            this.messages.add([M.APP_CONTROLLER_SUCCESS]);
        });

        ipcRenderer.on('seedKoreanFieldworkReportHandoff', async () => {
            await this.seedKoreanFieldworkReportHandoff();
            this.messages.add([M.APP_CONTROLLER_SUCCESS]);
        });
    }


    private async createNonUniqueIdentifierWarning() {

        const document: Document = this.createDocument();

        await this.pouchdbDatastore.create(document, 'test');

        document._id = '2';
        document.resource.id = '2';

        await this.pouchdbDatastore.create(document, 'test');

        await Indexer.reindex(
            this.indexFacade,
            this.pouchdbDatastore.getDb(),
            this.documentCache,
            this.projectConfiguration,
            false
        );
    }


    private async createConflict() {

        let document: Document = this.createDocument();
        
        document = await this.pouchdbDatastore.create(document, 'test');
        
        try {
            document.resource.shortDescription = 'A';
            await this.pouchdbDatastore.update(document, 'test');
            document.resource.shortDescription = 'B';
            await this.pouchdbDatastore.update(document, 'test');
        } catch (err) {
            // Ignore conflict errors
        }

        await Indexer.reindex(
            this.indexFacade,
            this.pouchdbDatastore.getDb(),
            this.documentCache,
            this.projectConfiguration,
            false
        );
    }


    private async createMissingRelationTargetWarning() {

        const document: Document = this.createDocument();
        document.resource.relations.isDepictedIn = ['missing'];
        await this.pouchdbDatastore.create(document, 'test');

        await Indexer.reindex(
            this.indexFacade,
            this.pouchdbDatastore.getDb(),
            this.documentCache,
            this.projectConfiguration,
            false
        );
    }


    private async createMissingOrInvalidParentWarning() {

        const document: Document = this.createDocument();
        document.resource.category = 'Feature';

        await this.pouchdbDatastore.create(document, 'test');

        await Indexer.reindex(
            this.indexFacade,
            this.pouchdbDatastore.getDb(),
            this.documentCache,
            this.projectConfiguration,
            false
        );
    }


    private async reset() {

        await this.pouchdbDatastore.destroyDb('test');

        const db = this.pouchdbDatastore.createDbForTesting('test');
        this.pouchdbDatastore.setDb_e2e(db);

        this.resourcesState.resetForE2E();
        this.imagesState.resetForE2E();
        this.configurationState.resetForE2E();
        this.tabManager.resetForE2E();
        this.imageDocumentsManager.clearSelection();
        this.documentCache.reset();

        const configurationDocument: ConfigurationDocument = await ConfigurationDocument.getConfigurationDocument(
            (id: string) => db.get(id), this.configReader, 'test', 'test-user'
        );

        this.projectConfiguration.update(await this.appConfigurator.go('test', configurationDocument));

        await new SampleDataLoader(
            this.thumbnailGenerator,
            this.settingsProvider.getSettings().imagestorePath,
            Settings.getLocale()
        ).go(db, this.settingsProvider.getSettings().selectedProject);

        await Indexer.reindex(
            this.indexFacade,
            db,
            this.documentCache,
            this.projectConfiguration,
            false
        );

        await this.configurationIndex.rebuild(configurationDocument);
    }


    private async seedKoreanFieldworkReportHandoff() {

        const db = this.pouchdbDatastore.getDb();
        const projectDocument = await db.get('project');

        projectDocument.resource[KOREAN_FIELDWORK_PROJECT_INVESTIGATION_MODE_FIELD] = 'excavation';
        projectDocument.resource[KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD] =
            '하남 교산 3구역 북쪽 경계, 기준점 HN-03에서 시작';
        await db.put(projectDocument);

        const featureTargetId = await this.seedKoreanFieldworkReportHandoffFeature(db);

        for (const document of this.createKoreanFieldworkReportHandoffDocuments(featureTargetId)) {
            await db.put(document);
        }

        this.documentCache.reset();
        await Indexer.reindex(
            this.indexFacade,
            db,
            this.documentCache,
            this.projectConfiguration,
            false
        );
    }


    private createDocument(): Document {

        return {
            _id: '1',
            resource: {
                id: '1',
                identifier: '1',
                category: 'Place',
                relations: {}
            },
            created: { date: new Date(), user: 'test' },
            modified: []
        };
    }


    private async seedKoreanFieldworkReportHandoffFeature(db: any): Promise<string> {

        const featureFields = this.getKoreanFieldworkReportHandoffFeatureFields();

        const existingFeatureDocument = await this.findKoreanFieldworkReportHandoffSeedFeature(db);
        if (existingFeatureDocument) {
            const featureDocument = existingFeatureDocument;
            const relations = this.mergeKoreanFieldworkReportHandoffFeatureRelations(
                featureDocument.resource.relations
            );
            featureDocument.resource = {
                ...featureDocument.resource,
                ...featureFields,
                relations,
                id: featureDocument.resource.id,
                category: 'Feature'
            };

            await db.put(featureDocument);
            return featureDocument.resource.id;
        }

        const featureDocument = this.createSeedDocument(
            'fieldwork-feature-pit-001',
            'Feature',
            featureFields
        );

        await db.put(featureDocument);
        return featureDocument.resource.id;
    }


    private mergeKoreanFieldworkReportHandoffFeatureRelations(relations: any): any {

        const existingRelations = relations ?? {};
        const recordedIn = Array.isArray(existingRelations.isRecordedIn)
            ? existingRelations.isRecordedIn
            : [];

        return {
            ...existingRelations,
            isRecordedIn: Array.from(new Set(recordedIn.concat('fieldwork-operation-1')))
        };
    }


    private async findKoreanFieldworkReportHandoffSeedFeature(db: any): Promise<Document|undefined> {

        const rows = (await db.allDocs({ include_docs: true })).rows ?? [];

        const documents = rows.map((row: any) => row.doc) as Array<Document|undefined>;

        return documents.find((document: Document|undefined) =>
            document?.resource?.category === 'Feature'
            && document.resource.id === 'si0'
        ) ?? documents.find((document: Document|undefined) =>
            document?.resource?.category === 'Feature'
            && document.resource.identifier === 'SE0'
        );
    }


    private getKoreanFieldworkReportHandoffFeatureFields() {

        return {
            reportIdentifier: 'pit-001',
            shortDescription: '원형 수혈, 암갈색 매몰토',
            featureType: 'pit',
            featureInterpretationType: ['pitFeature'],
            period: 'bronzeAge',
            geometrySource: 'gpsApproximate',
            geometryConfidence: 'rough',
            featureGeometryEditStatus: 'roughSketch',
            featureLocationSketch: '{"shape":"oval","center":{"x":75,"y":50},"scale":80}',
            featureFreeDrawingStrokes:
                '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":40,"y":50}]}]}',
            surveyBoundaryAccuracy: 'importedReference',
            surveyBoundarySource: 'shpImport',
            fieldNote: [
                '[관찰 내용] 바닥면에서 원형 윤곽 확인.',
                '[해석] 주공 가능성.',
                '[다음 작업] 단면 사진 보강.',
                '[근거 번호] 사진 12, 도면 3'
            ].join('\n'),
            featureRecordingStatus: 'confirmed',
            recordCreationTiming: 'sameDayFieldRecord',
            fieldRecordQuality: ['immediateRecording'],
            verificationState: 'observedInField',
            fieldOnlyMissingCheck: [
                'stratigraphicBoundary',
                'photoAngleAndScale'
            ],
            firstExposureRecord: [
                'firstExposurePhoto',
                'featureLineVisible',
                'confirmedBeforeInternalExcavation'
            ],
            featureInvestigationChecklist: [
                'findsRecovered',
                'preInvestigationPhotoTaken',
                'soilProfilePhotoLinked'
            ],
            relations: { isRecordedIn: ['fieldwork-operation-1'] }
        };
    }


    private createKoreanFieldworkReportHandoffDocuments(featureTargetId: string): Document[] {

        return [
            this.createSeedDocument('fieldwork-operation-1', 'Operation', {
                identifier: '3구역',
                shortDescription: '하남 교산 3구역 발굴조사'
            }),
            this.createSeedDocument('fieldwork-photo-12', 'Photo', {
                identifier: '사진 12',
                fieldworkPhotoUri: 'file:///tablet/photos/pit-001.jpg',
                originalFilename: 'pit-001.jpg',
                fieldworkPhotoCapturedAt: '2026-06-23T01:02:03.000Z',
                width: 4032,
                height: 3024,
                fieldworkPhotoAnnotationStrokes:
                    '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":30,"y":40}]}]}',
                relations: { depicts: [featureTargetId] }
            }),
            this.createSeedDocument('fieldwork-soil-photo-12', 'SoilProfilePhoto', {
                identifier: '토층사진 12',
                soilProfilePhotoUri: 'file:///tablet/photos/soil-photo-12.jpg',
                originalFilename: 'soil-photo-12.jpg',
                soilProfilePhotoCapturedAt: '2026-06-23T02:03:04.000Z',
                width: 3000,
                height: 2000,
                soilProfilePhotoAnnotationStrokes:
                    '{"version":1,"strokes":[{"points":[{"x":20,"y":30}]}]}',
                soilProfileAnnotationStrokes:
                    '{"version":1,"strokes":[{"points":[{"x":15,"y":40},{"x":70,"y":45}]}]}',
                soilProfileLayerMarkers: '[{"x":20,"y":50,"label":"1"}]',
                soilProfileColorSwatches: '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
                soilColorAssistCandidates: [
                    '사진 선택 지점 20%/50% 평균 RGB 111/87/61',
                    '1: 10YR 4/3 (보통, 차이 0.0)'
                ].join('\n'),
                relations: { depicts: [featureTargetId] }
            }),
            this.createSeedDocument('fieldwork-drawing-3', 'Drawing', {
                identifier: '도면 3',
                drawingSketchStrokes:
                    '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":50,"y":60}]}]}',
                relations: { depicts: [featureTargetId] }
            }),
            this.createSeedDocument('fieldwork-memo-handwritten', 'PenMemo', {
                identifier: '야장 메모',
                penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":30,"y":40}]}]}',
                penMemoTranscriptionStatus: 'pending',
                relations: { depicts: [featureTargetId] }
            })
        ];
    }


    private createSeedDocument(id: string, category: string, fields: any): Document {

        const now = new Date();

        return {
            _id: id,
            resource: {
                id,
                identifier: id,
                category,
                relations: {},
                ...fields
            },
            created: { date: now, user: 'test' },
            modified: []
        };
    }
}
