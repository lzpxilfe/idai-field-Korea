jest.mock('src/app/electron/electron', () => ({
    electronFs: { promises: {} },
    electronPath: { sep: '/' },
    electronRemote: {
        dialog: {
            showOpenDialog: jest.fn()
        },
        getCurrentWindow: jest.fn(),
        getGlobal: (key: string) => key === 'os'
            ? 'Windows_NT'
            : undefined
    }
}), { virtual: true });

jest.mock('../../../../../src/app/services/imagestore/export-images', () => ({
    exportImages: jest.fn()
}));

import { exportImages } from '../../../../../src/app/services/imagestore/export-images';
import { ImageExportModalComponent } from '../../../../../src/app/components/image/export/image-export-modal.component';


describe('ImageExportModalComponent', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });


    it('passes related records and project fieldwork context into image export', async () => {

        const activeModal = { close: jest.fn(), dismiss: jest.fn() };
        const datastore = {
            get: jest.fn(async (id: string) => {
                if (id === 'project') {
                    return {
                        resource: {
                            id: 'project',
                            identifier: 'fieldwork',
                            category: 'Project',
                            projectInvestigationMode: 'trialTrench',
                            projectBoundarySetupState: 'draftBoundary',
                            projectBoundarySummary: '1구역 북쪽 능선부터 남쪽 농로까지',
                            shortDescription: '북쪽 능선 조사',
                            coordinateReferenceSystem: 'EPSG:5186',
                            relations: {}
                        }
                    };
                }
                if (id === 'feature-1') {
                    return {
                        resource: {
                            id: 'feature-1',
                            identifier: '수혈 1',
                            category: 'Feature',
                            shortDescription: 'pit fill',
                            relations: {}
                        }
                    };
                }

                throw new Error('missing document');
            })
        };
        const imageStore = {};
        const imageDocument = {
            resource: {
                id: 'photo-1',
                identifier: 'P-001',
                category: 'Photo',
                relations: {
                    depicts: ['feature-1'],
                    isRecordedIn: ['missing-record']
                }
            }
        } as any;
        const component = createComponent({
            activeModal,
            datastore,
            imageStore,
            selectedProject: 'fieldwork'
        });
        component.images = [imageDocument];
        component.targetDirectoryPath = 'C:/export';

        await component.startExport();

        expect(datastore.get).toHaveBeenCalledWith('project');
        expect(datastore.get).toHaveBeenCalledWith('feature-1');
        expect(datastore.get).toHaveBeenCalledWith('missing-record');
        expect(exportImages).toHaveBeenCalledWith(
            imageStore,
            [imageDocument],
            'C:/export',
            'fieldwork',
            false,
            {
                'feature-1': {
                    id: 'feature-1',
                    identifier: '수혈 1',
                    category: 'Feature',
                    resource: {
                        id: 'feature-1',
                        identifier: '수혈 1',
                        category: 'Feature',
                        shortDescription: 'pit fill',
                        relations: {}
                    }
                }
            },
            {
                id: 'project',
                identifier: 'fieldwork',
                category: 'Project',
                projectInvestigationMode: 'trialTrench',
                projectBoundarySetupState: 'draftBoundary',
                projectBoundarySummary: '1구역 북쪽 능선부터 남쪽 농로까지',
                shortDescription: '북쪽 능선 조사',
                coordinateReferenceSystem: 'EPSG:5186',
                relations: {}
            }
        );
        expect(activeModal.close).toHaveBeenCalled();
    });


    it('adds locally downloaded direct fieldwork photo records to the handover export', async () => {

        const featureDocument = {
            resource: {
                id: 'feature-1',
                identifier: 'F-001',
                category: 'Feature',
                fieldworkPhotoUri: 'file:///tablet/DCIM/feature-1.jpg',
                relations: {
                    liesWithin: ['trench-1']
                }
            }
        } as any;
        const skippedFeatureDocument = {
            resource: {
                id: 'feature-2',
                identifier: 'F-002',
                category: 'Feature',
                fieldworkPhotoUri: 'file:///tablet/DCIM/feature-2.jpg',
                relations: {}
            }
        } as any;
        const soilProfilePhotoDocument = {
            resource: {
                id: 'soil-profile-photo-1',
                identifier: 'SP-001',
                category: 'SoilProfilePhoto',
                soilProfilePhotoUri: 'file:///tablet/DCIM/soil-profile-1.jpg',
                relations: {
                    depicts: ['feature-1']
                }
            }
        } as any;
        const drawingDocument = {
            resource: {
                id: 'drawing-1',
                identifier: 'DR-001',
                category: 'Drawing',
                fileUri: 'content://tablet/drawings/drawing-1.jpg',
                relations: {
                    depicts: ['feature-1']
                }
            }
        } as any;
        const datastore = {
            find: jest.fn(async () => ({
                documents: [
                    featureDocument,
                    soilProfilePhotoDocument,
                    drawingDocument,
                    skippedFeatureDocument,
                    {
                        resource: {
                            id: 'feature-3',
                            identifier: 'F-003',
                            category: 'Feature',
                            relations: {}
                        }
                    }
                ],
                totalCount: 3
            })),
            get: jest.fn(async (id: string) => {
                if (id === 'project') {
                    return { resource: { id: 'project', category: 'Project', relations: {} } };
                }
                if (id === 'feature-1') {
                    return featureDocument;
                }
                if (id === 'trench-1') {
                    return {
                        resource: {
                            id: 'trench-1',
                            identifier: 'TR-1',
                            category: 'Trench',
                            relations: {}
                        }
                    };
                }

                throw new Error('missing document');
            })
        };
        const imageStore = {
            getFileInfos: jest.fn(async () => ({
                'drawing-1': { deleted: false, types: [], variants: [] },
                'feature-1': { deleted: false, types: [], variants: [] },
                'soil-profile-photo-1': { deleted: false, types: [], variants: [] }
            }))
        };
        const imageDocument = {
            resource: {
                id: 'photo-1',
                identifier: 'P-001',
                category: 'Photo',
                relations: {}
            }
        } as any;
        const component = createComponent({
            datastore,
            imageStore,
            selectedProject: 'fieldwork'
        });
        component.images = [imageDocument];
        component.targetDirectoryPath = 'C:/export';

        await component.startExport();

        expect(imageStore.getFileInfos).toHaveBeenCalledWith('fieldwork', ['original_image']);
        expect(datastore.find).toHaveBeenCalledWith({});
        expect(datastore.get).toHaveBeenCalledWith('trench-1');
        expect(exportImages).toHaveBeenCalledWith(
            imageStore,
            [imageDocument, featureDocument, soilProfilePhotoDocument, drawingDocument],
            'C:/export',
            'fieldwork',
            false,
            {
                'feature-1': {
                    id: 'feature-1',
                    identifier: 'F-001',
                    category: 'Feature',
                    resource: featureDocument.resource
                },
                'trench-1': {
                    id: 'trench-1',
                    identifier: 'TR-1',
                    category: 'Trench',
                    resource: {
                        id: 'trench-1',
                        identifier: 'TR-1',
                        category: 'Trench',
                        relations: {}
                    }
                }
            },
            {
                id: 'project',
                category: 'Project',
                relations: {}
            }
        );
    });


    it('still exports images when the project document cannot be read', async () => {

        const imageStore = {};
        const imageDocument = {
            resource: {
                id: 'photo-1',
                identifier: 'P-001',
                category: 'Photo',
                relations: {}
            }
        } as any;
        const component = createComponent({
            datastore: {
                get: jest.fn(async () => {
                    throw new Error('project missing');
                })
            },
            imageStore,
            selectedProject: 'fieldwork'
        });
        component.images = [imageDocument];
        component.targetDirectoryPath = 'C:/export';

        await component.startExport();

        expect(exportImages).toHaveBeenCalledWith(
            imageStore,
            [imageDocument],
            'C:/export',
            'fieldwork',
            false,
            {},
            {}
        );
    });


    it('uses related record ids as export context fallback when identifiers are missing', async () => {

        const imageStore = {};
        const imageDocument = {
            resource: {
                id: 'photo-1',
                identifier: 'P-001',
                category: 'Photo',
                relations: {
                    depicts: ['feature-1']
                }
            }
        } as any;
        const component = createComponent({
            datastore: {
                get: jest.fn(async (id: string) => {
                    if (id === 'project') {
                        return { resource: { id: 'project', category: 'Project', relations: {} } };
                    }
                    if (id === 'feature-1') {
                        return {
                            resource: {
                                id: 'feature-1',
                                category: 'Feature',
                                relations: {}
                            }
                        };
                    }

                    throw new Error('missing document');
                })
            },
            imageStore,
            selectedProject: 'fieldwork'
        });
        component.images = [imageDocument];
        component.targetDirectoryPath = 'C:/export';

        await component.startExport();

        expect(exportImages).toHaveBeenCalledWith(
            imageStore,
            [imageDocument],
            'C:/export',
            'fieldwork',
            false,
            {
                'feature-1': {
                    id: 'feature-1',
                    identifier: 'feature-1',
                    category: 'Feature',
                    resource: {
                        id: 'feature-1',
                        category: 'Feature',
                        relations: {}
                    }
                }
            },
            {
                id: 'project',
                category: 'Project',
                relations: {}
            }
        );
    });
});


const createComponent = ({
    activeModal = { close: jest.fn(), dismiss: jest.fn() },
    datastore = { get: jest.fn() },
    imageStore = {},
    selectedProject = 'fieldwork'
}: {
    activeModal?: any;
    datastore?: any;
    imageStore?: any;
    selectedProject?: string;
} = {}) => new ImageExportModalComponent(
    activeModal,
    { getFolderPath: jest.fn(), setFolderPath: jest.fn() } as any,
    imageStore as any,
    {
        getSettings: () => ({ selectedProject })
    } as any,
    { add: jest.fn() } as any,
    { getContext: jest.fn() } as any,
    {
        getCategory: jest.fn()
    } as any,
    {
        getFieldLabel: jest.fn()
    } as any,
    datastore as any
);
