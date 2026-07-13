import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { Map } from 'tsfun';
import { ImageStore, ImageVariant, FileInfo, ConfigurationSerializer, ConfigReader, Datastore, ProjectConfiguration,
    RelationsManager, IdGenerator, ObserverUtil, Document, tombstoneSuffix, useOriginalSuffix } from 'idai-field-core';
import { SettingsProvider } from '../settings/settings-provider';
import { exportConfiguration } from './endpoints/configuration';
import { exportData } from './endpoints/export';
import { importData } from './endpoints/importData';
import { Settings } from '../settings/settings';
import { MD } from '../../components/messages/md';
import { AngularUtility } from '../../angular/angular-utility';
import { importFiles } from './endpoints/importFiles';
import { ImageUploader } from '../../components/image/upload/image-uploader';
import { UploadStatus } from '../../components/image/upload/upload-status';
import { exportFile } from './endpoints/exportFile';
import { electronCrypto as crypto, electronFs as fs, electronPath as path,
    electronRemote as remote } from 'src/app/electron/electron';
import * as PouchDBBaseModule from 'pouchdb-browser';

const PouchDBBase = getCommonJsDefaultExport<any>(PouchDBBaseModule);

let PouchDB = PouchDBBase;

function getCommonJsDefaultExport<T>(module: T): T {

    return (module as any).default ?? module;
}

function loadExpressDependencies(): ExpressDependencies {

    const nodeRequire = typeof window !== 'undefined' ? (window as any).require : undefined;
    if (!nodeRequire) throw new Error('Node require is not available in the Field Desktop renderer.');

    const expressModule = nodeRequire('express');
    const expressPouchDBModule = nodeRequire('express-pouchdb');
    const expressBasicAuthModule = nodeRequire('express-basic-auth');
    const bodyParserModule = nodeRequire('body-parser');

    return {
        express: getCommonJsDefaultExport<any>(expressModule),
        expressPouchDB: getCommonJsDefaultExport<any>(expressPouchDBModule),
        expressBasicAuth: getCommonJsDefaultExport<any>(expressBasicAuthModule),
        bodyParser: getCommonJsDefaultExport<any>(bodyParserModule)
    };
}


export type ApiState = 'none'|'import'|'fileImport'|'export';

interface ExpressDependencies {
    express: any;
    expressPouchDB: any;
    expressBasicAuth: any;
    bodyParser: any;
}


@Injectable()
export class ExpressServer {

    private password: string;
    private allowLargeFileUploads: boolean;
    private datastore: Datastore;
    private relationsManager: RelationsManager;
    private projectConfiguration: ProjectConfiguration;
    private imageUploader: ImageUploader;
    private uploadStatus: UploadStatus;
    private apiObservers: Array<Observer<ApiState>> = [];
    private preparedImportDocuments: Map<Map<Array<Document>>> = { csv: {}, native: {}, geojson: {} };
    private notificationTimeout: any;


    constructor(private imagestore: ImageStore,
                private configurationSerializer: ConfigurationSerializer,
                private settingsProvider: SettingsProvider,
                private configReader: ConfigReader,
                private idGenerator: IdGenerator,
                private messagesDictionary: MD) {}


    public getPassword = () => this.password;

    public setPassword = (password: string) => this.password = password;

    public getAllowLargeFileUploads = () => this.allowLargeFileUploads;

    public setAllowLargeFileUploads = (allow: boolean) => this.allowLargeFileUploads = allow;

    public getPouchDB = () => PouchDB;

    public setDatastore = (datastore: Datastore) => this.datastore = datastore;

    public setRelationsManager = (relationsManager: RelationsManager) => this.relationsManager = relationsManager;

    public setProjectConfiguration = (projectConfiguration: ProjectConfiguration) =>
        this.projectConfiguration = projectConfiguration;

    public setImageUploader = (imageUploader: ImageUploader) => this.imageUploader = imageUploader;

    public setUploadStatus = (uploadStatus: UploadStatus) => this.uploadStatus = uploadStatus;

    public apiNotifications = (): Observable<ApiState> => ObserverUtil.register(this.apiObservers);


    /**
     * Provides Fauxton and the CouchDB REST API
     */
    public async setupServer(pouchDirectory?: string) {

        const { express, expressPouchDB, expressBasicAuth, bodyParser } = await loadExpressDependencies();
        const self = this;
        const app = express();
        const binaryBodyParser = bodyParser.raw({ type: '*/*', limit: '1gb' });
        const textBodyParser = bodyParser.text({ type: '*/*', limit: '1gb' });
        const jsonBodyParser = bodyParser.json({ type: '*/*', limit: '1gb' });

        if (pouchDirectory) PouchDB = PouchDB.defaults({ prefix: pouchDirectory });

        app.use(expressBasicAuth({
            challenge: true,
            authorizer: (_: string, password: string) =>
                expressBasicAuth.safeCompare(password, this.password),
            unauthorizedResponse: () => ({ status: 401, reason: 'Name or password is incorrect.' })
        }));

        app.get('/files/:project', async (req: any, res: any) => {

            try {
                this.assertImageStorePaths(req.params.project);
                let list: { [uuid: string]: FileInfo };

                if (!req.query.types) {
                    list = await this.imagestore.getFileInfos(req.params.project, []);
                } else {
                    const imageVariants = [];

                    for (const type of req.query.types) {
                        if (Object.values(ImageVariant).includes(type)) {
                            imageVariants.push(type);
                        }
                    }

                    if (imageVariants.length > 0) {
                        list = await this.imagestore.getFileInfos(req.params.project, imageVariants);
                    } else {
                        res.status(400).send({ reason: 'Invalid types parameter: "' + req.query.types + '"' });
                    }
                }
                res.status(200).send(list);
            } catch (e) {
                if (e.code === 'ENOENT') {
                    res.status(404).send({ reason: 'Unknown project.' });
                } else if (e.code === 'EINVAL') {
                    res.status(400).send({ reason: e.message });
                } else {
                    console.log(e);
                    res.status(500).send({ reason: 'Whoops?' });
                }
            }
        });

        app.get('/files/:project/:uuid', async (req: any, res: any) => {

            try {
                if (req.query.type === undefined) {
                    res.status(400).send({
                        reason: `Please provide a 'type', possible values: ${Object.values(ImageVariant).join(', ')}`
                    });
                } else if (Object.values(ImageVariant).includes(req.query.type)) {
                    this.assertImageReadPaths(req.params.project, req.params.uuid, req.query.type);
                    const data = await self.imagestore.getData(req.params.uuid, req.query.type, req.params.project);
                    res.header('Content-Type', 'image/*').status(200).send(data);
                } else {
                    res.status(400).send({ reason: 'Invalid parameter for type: "' + req.query.type + '"' });
                }
            } catch (e) {
                if (e.code === 'ENOENT') {
                    res.status(404).send({ reason: 'Image file not found.' });
                } else if (e.code === 'EINVAL') {
                    res.status(400).send({ reason: e.message });
                } else {
                    console.log(e);
                    res.status(500).send({ reason: 'Whoops?' });
                }
            }
        });

        app.put('/files/:project/:uuid', binaryBodyParser, async (req: any, res: any) => {

            try {
                if (req.query.type === undefined) {
                    res.status(400).send({
                        reason: `Please provide a type, possible values: ${Object.values(ImageVariant).join(', ')}`
                    });
                }
                else if (Object.values(ImageVariant).includes(req.query.type)) {
                    this.assertImageWritePath(req.params.project, req.params.uuid, req.query.type);
                    if (req.query.type === ImageVariant.ORIGINAL && !this.allowLargeFileUploads) {
                        res.status(409).send({ reason: 'Currently no large file uploads accepted.' });
                    } else {
                        await this.imagestore.store(req.params.uuid, req.body, req.params.project, req.query.type);
                        res.status(200).send(getStoredFileMetadata(req.body));
                    }
                }
            } catch (e) {
                if (e.code === 'ENOENT') {
                    res.status(404).send({ reason: 'Unknown project.' });
                } else if (e.code === 'EINVAL') {
                    res.status(400).send({ reason: e.message });
                } else {
                    console.log(e);
                    res.status(500).send({ reason: 'Whoops?' });
                }
            }
        });

        app.delete('/files/:project/:uuid', async (req: any, res: any) => {

            try {
                this.assertImageDeletePaths(req.params.project, req.params.uuid);
                await this.imagestore.remove(req.params.uuid, req.params.project);
                res.status(200).send({});
            } catch (e) {
                if (e.code === 'ENOENT') {
                    res.status(404).send({ reason: 'Unknown project.' });
                } else if (e.code === 'EINVAL') {
                    res.status(400).send({ reason: e.message });
                } else {
                    console.log(e);
                    res.status(500).send({ reason: 'Whoops?' });
                }
            }
        });

        app.get('/configuration/:project', async (request: any, response: any) => {

            await exportConfiguration(
                request, response, this.configReader, this.configurationSerializer,
                this.settingsProvider.getSettings().username
            );
        });

        app.get('/export/:format', async (request: any, response: any) => {

            this.notifyObservers('export');
            await AngularUtility.refresh();
            await exportData(request, response, this.projectConfiguration, this.datastore, this.messagesDictionary);
            this.notifyObservers('none');
        });

        app.post('/import/:format', textBodyParser, async (request: any, response: any) => {

            this.notifyObservers('import');
            await AngularUtility.refresh();
            await importData(request, response, this.preparedImportDocuments, this.projectConfiguration, this.datastore,
                this.relationsManager, this.idGenerator, this.settingsProvider.getSettings(), this.messagesDictionary
            );
            this.notifyObservers('none');
        });

        app.get('/fileExport/:format/:identifier', async (request: any, response: any) => {

            await exportFile(request, response, this.datastore, this.imagestore, this.settingsProvider.getSettings(),
                this.messagesDictionary);
        });

        app.post('/fileImport', jsonBodyParser, async (request: any, response: any) => {

            ObserverUtil.notify(this.apiObservers, 'fileImport');
            await AngularUtility.refresh();
            await importFiles(request, response, this.projectConfiguration, this.imageUploader, this.uploadStatus,
                this.messagesDictionary);
            ObserverUtil.notify(this.apiObservers, 'none');
        });

        app.get('/info/',  async (_: any, response: any) => {

            try {
                const settings: Settings = this.settingsProvider.getSettings();

                const infoData = {
                    version: remote.app.getVersion(),
                    projects: settings.dbs,
                    activeProject: settings.selectedProject,
                    user: settings.username
                };

                response.header('Content-Type', 'application/json')
                    .status(200)
                    .send(infoData);
            } catch (err) {
                response.status(500).send({ reason: err });
            }
        });

        let conditionalParameters = {};
        if (remote) {
            conditionalParameters = Object.assign(
                conditionalParameters,
                { logPath: `${remote.getGlobal('appDataPath')}/pouchdb-server.log` }
            );
        }


        // prevent the creation of new databases when syncing
        app.put('/db/:db', (_: any, res: any) =>
            res.status(401).send( { status: 401 }));

        app.use('/db/', expressPouchDB(PouchDB, {
            ...conditionalParameters,
            ...{
                mode: 'fullCouchDB',
                overrideMode: {
                    exclude: [
                        'routes/authentication',
                        'routes/authorization',
                        'routes/fauxton',
                        'routes/session'
                    ]
                }
            }
        }));

        let mainAppHandle: any;
        await new Promise<void>((resolve, reject) => {
            mainAppHandle = app.listen(3000, () => {
                console.log('PouchDB Server is listening on port 3000');
                resolve();
            }).on('error', err => reject(err))
        });

        const fauxtonApp = express();

        fauxtonApp.use(expressBasicAuth({
            challenge: true,
            authorizer: (_: string, password: string) =>
                expressBasicAuth.safeCompare(password, this.password),
            unauthorizedResponse: () => ({ status: 401, reason: 'Name or password is incorrect.' })
        }));

        // prevent the creation of new databases when syncing
        fauxtonApp.put('/:db', (_: any, res: any) =>
            res.status(401).send( { status: 401 }));

        fauxtonApp.use(expressPouchDB(PouchDB, {
            ...conditionalParameters,
            ...{
                mode: 'fullCouchDB',
                overrideMode: {
                    exclude: [
                        'replicator',
                        'routes/authentication',
                        'routes/authorization',
                        'routes/security',
                        'routes/session'
                    ]
                }
            }
        }));

        let fauxtonAppHandle: any;
        await new Promise<void>((resolve) => {
            fauxtonAppHandle = fauxtonApp.listen(3001, () => {
                console.log('Fauxton is listening on port 3001');
                resolve();
            });
        });

        return [mainAppHandle, fauxtonAppHandle];
    }


    private assertImageStorePaths(project: string): void {

        this.assertConfiguredProject(project);
        this.assertImageStorePath(this.imagestore.getDirectoryPath(project, ImageVariant.ORIGINAL));
        this.assertImageStorePath(this.imagestore.getDirectoryPath(project, ImageVariant.THUMBNAIL));
        this.assertImageStorePath(this.imagestore.getDirectoryPath(project, ImageVariant.DISPLAY));
    }


    private assertImageReadPaths(project: string, uuid: string, type: ImageVariant): void {

        this.assertConfiguredProject(project);
        this.assertImageVariantPath(project, type, uuid);

        if (type === ImageVariant.THUMBNAIL) {
            this.assertImageVariantPath(project, ImageVariant.ORIGINAL, uuid);
        } else if (type === ImageVariant.DISPLAY) {
            this.assertImageVariantPath(project, ImageVariant.DISPLAY, uuid + useOriginalSuffix);
            this.assertImageVariantPath(project, ImageVariant.ORIGINAL, uuid);
        }
    }


    private assertImageWritePath(project: string, uuid: string, type: ImageVariant): void {

        this.assertImageStorePaths(project);
        this.assertImageVariantPath(project, type, uuid);
    }


    private assertImageDeletePaths(project: string, uuid: string): void {

        this.assertImageStorePaths(project);
        this.assertImageVariantPath(project, ImageVariant.ORIGINAL, uuid);
        this.assertImageVariantPath(project, ImageVariant.ORIGINAL, uuid + tombstoneSuffix);
        this.assertImageVariantPath(project, ImageVariant.THUMBNAIL, uuid);
        this.assertImageVariantPath(project, ImageVariant.THUMBNAIL, uuid + tombstoneSuffix);
        this.assertImageVariantPath(project, ImageVariant.DISPLAY, uuid);
        this.assertImageVariantPath(project, ImageVariant.DISPLAY, uuid + useOriginalSuffix);
    }


    private assertConfiguredProject(project: string): void {

        this.imagestore.getDirectoryPath(project, ImageVariant.ORIGINAL);

        const configuredProjects: string[]|undefined = this.settingsProvider?.getSettings()?.dbs;
        const activeProject = this.imagestore.getActiveProject();
        const allowedProjects = Array.isArray(configuredProjects) && configuredProjects.length > 0
            ? configuredProjects
            : activeProject
                ? [activeProject]
                : [];

        if (!allowedProjects.includes(project)) {
            const error: any = new Error('Unknown project.');
            error.code = 'ENOENT';
            throw error;
        }
    }


    private assertImageVariantPath(project: string, type: ImageVariant, filename: string): void {

        this.assertImageStorePath(path.resolve(this.imagestore.getDirectoryPath(project, type), filename));
    }


    private assertImageStorePath(candidatePath: string): void {

        const imageStoreRoot = this.imagestore.getAbsoluteRootPath();
        if (!imageStoreRoot) throw this.createUnsafeImagePathError();

        const resolvedRoot = path.resolve(imageStoreRoot);
        const resolvedCandidate = path.resolve(candidatePath);
        if (!this.isPathWithin(resolvedRoot, resolvedCandidate)) {
            throw this.createUnsafeImagePathError();
        }

        let existingPath = resolvedRoot;
        const relativeParts = path.relative(resolvedRoot, resolvedCandidate)
            .split(/[\\/]+/)
            .filter(Boolean);

        for (const part of relativeParts) {
            const currentPath = path.resolve(existingPath, part);
            try {
                const stat = fs.lstatSync(currentPath);
                if (stat.isSymbolicLink?.()) throw this.createUnsafeImagePathError();
                existingPath = currentPath;
            } catch (error) {
                if (error?.code === 'ENOENT') break;
                throw error;
            }
        }

        const realRoot = fs.realpathSync(resolvedRoot);
        const realExistingPath = fs.realpathSync(existingPath);
        if (!this.isPathWithin(realRoot, realExistingPath)) {
            throw this.createUnsafeImagePathError();
        }
    }


    private isPathWithin(rootPath: string, candidatePath: string): boolean {

        const relativePath = path.relative(rootPath, candidatePath);
        return relativePath === '' || (
            relativePath !== '..'
            && !relativePath.startsWith('..' + path.sep)
            && !path.isAbsolute(relativePath)
        );
    }


    private createUnsafeImagePathError(): Error & { code: string } {

        const error = new Error('Unsafe image store path.') as Error & { code: string };
        error.code = 'EINVAL';
        return error;
    }


    private notifyObservers(state: ApiState) {

        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
            this.notificationTimeout = undefined;
        }

        if (state === 'none') {
            this.notificationTimeout = setTimeout(() => {
                ObserverUtil.notify(this.apiObservers, state);
                this.notificationTimeout = undefined;
            }, 2000);
        } else {
            ObserverUtil.notify(this.apiObservers, state);
        }
    }
}


function getStoredFileMetadata(data: Buffer): { size_bytes: number, md5?: string, sha256?: string } {

    return {
        size_bytes: data.byteLength,
        md5: getFileHash(data, 'md5'),
        sha256: getFileHash(data, 'sha256')
    };
}


function getFileHash(data: Buffer, algorithm: 'md5'|'sha256'): string|undefined {

    return typeof crypto?.createHash === 'function'
        ? crypto.createHash(algorithm)
            .update(data)
            .digest('hex')
        : undefined;
}
