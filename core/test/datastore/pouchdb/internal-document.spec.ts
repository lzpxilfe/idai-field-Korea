import { IdGenerator } from '../../../src/datastore/pouchdb/id-generator';
import {
    IDAI_FIELD_INTERNAL_DOCUMENT_ID_PREFIX
} from '../../../src/datastore/pouchdb/internal-document';
import { PouchdbDatastore } from '../../../src/datastore/pouchdb/pouchdb-datastore';


describe('PouchDB internal documents', () => {

    it('keeps internal sidecar changes out of normal document notifications', () => {

        let changeHandler: (change: any) => void;
        const changesFeed = {
            on: (event: string, handler: (value: any) => void) => {
                if (event === 'change') changeHandler = handler;
                return changesFeed;
            }
        };
        const db = {
            changes: jasmine.createSpy('changes').and.returnValue(changesFeed),
            get: jasmine.createSpy('get')
        };
        const datastore = new PouchdbDatastore(
            () => db,
            jasmine.createSpyObj<IdGenerator>('idGenerator', ['generateId'])
        );
        datastore.createDbForTesting('test');
        datastore.setupChangesEmitter();

        changeHandler({ id: `${IDAI_FIELD_INTERNAL_DOCUMENT_ID_PREFIX}sidecar:feature-1` });

        expect(db.get).not.toHaveBeenCalled();
    });
});
