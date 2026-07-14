import { DocumentCache } from '../../src/datastore/document-cache';
import { IDAI_FIELD_INTERNAL_DOCUMENT_ID_PREFIX } from '../../src/datastore/pouchdb/internal-document';
import { IndexFacade } from '../../src/index/index-facade';
import { Indexer } from '../../src/index/indexer';
import { ProjectConfiguration } from '../../src/services/project-configuration';


describe('Indexer', () => {

    it('does not migrate or index internal sidecar documents', async () => {

        const internalDocument = {
            _id: `${IDAI_FIELD_INTERNAL_DOCUMENT_ID_PREFIX}sidecar:feature-1`,
            kind: 'koreanFieldworkAssistSidecar',
            sidecar: {}
        };
        const db = {
            allDocs: jasmine.createSpy('allDocs').and.returnValue(Promise.resolve({
                rows: [{ id: internalDocument._id, doc: internalDocument }]
            }))
        };
        const indexFacade = jasmine.createSpyObj<IndexFacade>(
            'indexFacade',
            ['clear', 'putMultiple', 'notifyObservers']
        );
        indexFacade.putMultiple.and.returnValue(Promise.resolve());

        await Indexer.reindex(
            indexFacade,
            db,
            new DocumentCache(),
            {} as ProjectConfiguration,
            false
        );

        expect(indexFacade.putMultiple).toHaveBeenCalledWith([], undefined);
    });
});
