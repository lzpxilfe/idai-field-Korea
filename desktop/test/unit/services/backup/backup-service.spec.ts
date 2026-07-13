const mockElectronFs = {
    existsSync: jest.fn(),
    lstatSync: jest.fn(),
    readFileSync: jest.fn()
};

type MockDocument = {
    _id?: string;
    resource: { id: string; identifier?: string; category: string };
};

const mockDbStores = new Map<string, Record<string, MockDocument>>();
const mockBackupDocsByFileUrl = new Map<string, MockDocument[]>();
let mockLoadError: Error|undefined;
let mockFailStagingToProjectReplication: Error|undefined;

jest.mock('src/app/electron/electron', () => ({
    electronFs: mockElectronFs
}), { virtual: true });

jest.mock('pouchdb-load', () => jest.fn());

jest.mock('pouchdb-browser', () => {
    class MockPouchDB {

        public static plugin = jest.fn();
        public static replicate = jest.fn(async (source: MockPouchDB, target: MockPouchDB) => {
            if (mockFailStagingToProjectReplication
                    && source.name.includes('restore-staging')
                    && target.name === 'fieldwork') {
                const error = mockFailStagingToProjectReplication;
                mockFailStagingToProjectReplication = undefined;
                throw error;
            }

            mockDbStores.set(target.name, { ...mockDbStores.get(source.name) });
        });

        constructor(public name: string) {
            if (!mockDbStores.has(name)) mockDbStores.set(name, {});
        }

        public async load(fileUrl: string) {
            if (mockLoadError) throw mockLoadError;

            const docs = mockBackupDocsByFileUrl.get(fileUrl);
            if (!docs) throw new Error('No mocked backup for ' + fileUrl);

            mockDbStores.set(this.name, docs.reduce((store: Record<string, MockDocument>, document) => {
                store[document._id ?? document.resource.id] = { ...document };
                return store;
            }, {}));
        }

        public async get(id: string): Promise<MockDocument> {
            const document = mockDbStores.get(this.name)?.[id];
            if (!document) throw new Error('not_found');

            return document;
        }

        public async put(document: MockDocument): Promise<void> {
            const store = mockDbStores.get(this.name) ?? {};
            store[document._id ?? document.resource.id] = document;
            mockDbStores.set(this.name, store);
        }

        public async info(): Promise<{ doc_count: number }> {
            return { doc_count: Object.keys(mockDbStores.get(this.name) ?? {}).length };
        }

        public async destroy(): Promise<void> {
            mockDbStores.set(this.name, {});
        }
    }

    return {
        __esModule: true,
        default: MockPouchDB
    };
});

import { BackupService, ERROR_GENERIC } from '../../../../src/app/services/backup/backup-service';
import PouchDB from 'pouchdb-browser';


describe('BackupService', () => {

    const settingsService = {
        updateProjectName: jest.fn()
    };


    beforeEach(() => {
        jest.clearAllMocks();
        mockDbStores.clear();
        mockBackupDocsByFileUrl.clear();
        mockLoadError = undefined;
        mockFailStagingToProjectReplication = undefined;
        mockElectronFs.existsSync.mockReturnValue(true);
        mockElectronFs.lstatSync.mockReturnValue({ isFile: () => true });
        mockElectronFs.readFileSync.mockReturnValue(JSON.stringify({
            docs: [createProjectDocument('fieldwork')]
        }));
        mockDbStores.set('fieldwork', {
            project: createProjectDocument('fieldwork'),
            existing: createDocument('existing', 'Existing')
        });
        mockBackupDocsByFileUrl.set('file://C:/backup.jsonl', [
            createProjectDocument('fieldwork-backup'),
            createDocument('restored', 'Restored')
        ]);
    });


    it('loads a backup into staging before replacing the project database', async () => {

        await new BackupService().restore(
            'C:/backup.jsonl',
            'fieldwork',
            settingsService as any
        );

        expect(mockDbStores.get('fieldwork')).toEqual({
            project: createProjectDocument('fieldwork'),
            restored: createDocument('restored', 'Restored')
        });
        expect(settingsService.updateProjectName).toHaveBeenCalledWith(createProjectDocument('fieldwork'));
        expect((PouchDB as any).replicate).toHaveBeenCalledTimes(2);
    });


    it('keeps the existing project database if staging load fails', async () => {

        mockLoadError = new Error('invalid backup stream');

        await expect(new BackupService().restore(
            'C:/backup.jsonl',
            'fieldwork',
            settingsService as any
        )).rejects.toEqual([ERROR_GENERIC]);

        expect(mockDbStores.get('fieldwork')).toEqual({
            project: createProjectDocument('fieldwork'),
            existing: createDocument('existing', 'Existing')
        });
        expect((PouchDB as any).replicate).not.toHaveBeenCalled();
        expect(settingsService.updateProjectName).not.toHaveBeenCalled();
    });


    it('rolls back the existing project database if final replacement fails', async () => {

        mockFailStagingToProjectReplication = new Error('disk full');

        await expect(new BackupService().restore(
            'C:/backup.jsonl',
            'fieldwork',
            settingsService as any
        )).rejects.toEqual([ERROR_GENERIC]);

        expect(mockDbStores.get('fieldwork')).toEqual({
            project: createProjectDocument('fieldwork'),
            existing: createDocument('existing', 'Existing')
        });
        expect(settingsService.updateProjectName).not.toHaveBeenCalled();
    });
});


const createProjectDocument = (identifier: string): MockDocument => ({
    _id: 'project',
    resource: {
        id: 'project',
        identifier,
        category: 'Project'
    }
});


const createDocument = (id: string, identifier: string): MockDocument => ({
    _id: id,
    resource: {
        id,
        identifier,
        category: 'Find'
    }
});
