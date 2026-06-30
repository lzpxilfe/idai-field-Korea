import { Subject } from 'rxjs';
import { PlusButtonComponent } from '../../../../src/app/components/resources/plus-button.component';


describe('PlusButtonComponent', () => {

    it('starts Korean fieldwork feature drawing as a flat desktop map trace', async () => {

        const existingFeature = createDocument('feature-1', 'Feature', '1호 유구');
        const resourcesComponent = {
            listenToClickEvents: () => new Subject().asObservable(),
            startEditNewDocument: jest.fn()
        };
        const datastore = {
            find: jest.fn().mockResolvedValue({ documents: [existingFeature] }),
            get: jest.fn().mockResolvedValue(createDocument('operation-1', 'Operation', '1구역'))
        };
        const component = createComponent(resourcesComponent, datastore);
        component.isRecordedIn = createDocument('operation-1', 'Operation', '1구역') as any;
        component.topLevelCategoriesArray = [createKoreanFeatureCategory() as any];

        expect(component.isFeatureQuickCreateVisible()).toBe(true);

        await component.startFeaturePolygonCreation();

        expect(datastore.find).toHaveBeenCalledWith({ categories: ['Feature'] });
        expect(resourcesComponent.startEditNewDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    category: 'Feature',
                    featureGeometryEditStatus: 'roughSketch',
                    featureGeometryRevisionHistory: '[]',
                    featureRecordingStatus: 'candidate',
                    featureType: 'unknown',
                    featureGeometryRevisionNote:
                        '위성지도나 평면도처럼 조사 경계 위에 유구 위치와 형태를 바로 얹으며 시작',
                    geometryConfidence: 'rough',
                    geometrySource: 'aerialLayerTrace',
                    identifier: '2호 유구',
                    relations: { isRecordedIn: ['operation-1'] },
                    shortDescription:
                        '위성지도나 평면도처럼 조사 경계 위에 유구 위치와 형태를 바로 얹으며 시작'
                })
            }),
            'Polygon'
        );
    });


    it('keeps explicit default identifiers when starting a feature drawing', async () => {

        const resourcesComponent = {
            listenToClickEvents: () => new Subject().asObservable(),
            startEditNewDocument: jest.fn()
        };
        const datastore = {
            find: jest.fn().mockResolvedValue({ documents: [] }),
            get: jest.fn().mockResolvedValue(createDocument('operation-1', 'Operation', '1구역'))
        };
        const component = createComponent(resourcesComponent, datastore);
        component.defaultFieldValues = { identifier: '북쪽 배수로' };
        component.isRecordedIn = createDocument('operation-1', 'Operation', '1구역') as any;
        component.topLevelCategoriesArray = [createKoreanFeatureCategory() as any];

        await component.startFeaturePolygonCreation();

        expect(resourcesComponent.startEditNewDocument).toHaveBeenCalledWith(
            expect.objectContaining({
                resource: expect.objectContaining({
                    geometrySource: 'aerialLayerTrace',
                    identifier: '북쪽 배수로',
                    shortDescription:
                        '위성지도나 평면도처럼 조사 경계 위에 유구 위치와 형태를 바로 얹으며 시작'
                })
            }),
            'Polygon'
        );
    });
});


const createComponent = (resourcesComponent: any, datastore: any): PlusButtonComponent =>
    new PlusButtonComponent(
        { nativeElement: {} } as any,
        resourcesComponent,
        {
            isGeometryCategory: jest.fn().mockReturnValue(true)
        } as any,
        { add: jest.fn() } as any,
        {} as any,
        datastore,
        { changesNotifications: () => new Subject().asObservable() } as any
    );


const createKoreanFeatureCategory = () => ({
    name: 'Feature',
    children: [],
    groups: [{
        name: 'workflow',
        fields: [
            field('geometry', undefined, ['Polygon']),
            field('featureRecordingStatus', 'KoreanFieldwork-featureRecordingStatus'),
            field('featureGeometryEditStatus'),
            field('featureGeometryRevisionHistory'),
            field('featureInvestigationChecklist'),
            field('featureSoilProfilePhotoCount'),
            field('featureType'),
            field('featureGeometryRevisionNote'),
            field('geometrySource'),
            field('geometryConfidence'),
            field('shortDescription')
        ]
    }]
});


const field = (name: string, valuelistId?: string, geometryTypes?: string[]) => ({
    name,
    ...(valuelistId ? { valuelist: { id: valuelistId } } : {}),
    ...(geometryTypes ? { geometryTypes } : {})
});


const createDocument = (id: string, category: string, identifier: string) => ({
    resource: {
        id,
        identifier,
        category,
        relations: {}
    }
});
