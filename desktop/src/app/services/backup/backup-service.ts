import { Document } from 'idai-field-core';
import { ProjectIdentifierValidation } from '../../model/project-identifier-validation';
import { SettingsService } from '../settings/settings-service';
import { createBackupFile } from './create-backup';

import { electronFs as fs } from 'src/app/electron/electron';
import PouchDB from 'pouchdb-browser';
import pouchDBLoad from 'pouchdb-load';


export type RestoreBackupError = 'fileNotFound'|'unsimilarProjectIdentifier'|'invalidFileFormat'|'generic';

export const ERROR_FILE_NOT_FOUND: RestoreBackupError = 'fileNotFound';
export const ERROR_UNSIMILAR_PROJECT_IDENTIFIER: RestoreBackupError = 'unsimilarProjectIdentifier'
export const ERROR_INVALID_FILE_FORMAT: RestoreBackupError = 'invalidFileFormat';
export const ERROR_GENERIC: RestoreBackupError = 'generic';


/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
export class BackupService {

    /*
    * @returns true if successful, false if backup creation failed
    */
    public create(targetFilePath: string, project: string): Promise<boolean> {

        return createBackupFile(targetFilePath, project)
            .then(() => true)
            .catch(err => {
                console.error('Error while trying to create backup file', err);
                return false;
            });
    }


    public async restore(filePath: string, project: string, settingsService: SettingsService,
                         checkProjectIdentifier: boolean = true) {

        if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) throw [ERROR_FILE_NOT_FOUND];

        if (checkProjectIdentifier) this.assertProjectIdentifierIsValid(filePath, project);

        try {
            const restoredDatabase: any = await this.loadBackupFile(filePath, project);
            const projectDocument: Document = await restoredDatabase.get('project');

            await this.updateProjectIdentifier(projectDocument, project, restoredDatabase);
            await settingsService.updateProjectName(projectDocument);
        } catch (err) {
            console.error('Error while trying to restore backup file', err);
            throw [ERROR_GENERIC];
        }
    }


    private assertProjectIdentifierIsValid(filePath: string, project: string) {
        
        const projectDocument: Document = this.getProjectDocument(filePath);
        if (!projectDocument) throw [ERROR_INVALID_FILE_FORMAT];

        if (!ProjectIdentifierValidation.isSimilar(projectDocument.resource.identifier, project)) {
            throw [ERROR_UNSIMILAR_PROJECT_IDENTIFIER, projectDocument.resource.identifier];
        }
    }


    private getProjectDocument(filePath: string): Document {

        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            return fileContent.split('\n')
                .filter(line => line?.length)
                .map(line => JSON.parse(line)?.docs?.find(document => document?.resource?.id === 'project'))
                .filter(document => document !== undefined)?.[0];
        } catch (err) {
            console.warn('Failed to read project document from backup file:', err);
            return undefined;
        }
    }


    private async loadBackupFile(filePath: string, project: string): Promise<any> {

        PouchDB.plugin(pouchDBLoad);

        const stagingDatabase: any = new PouchDB(this.createTemporaryDatabaseName(project, 'restore-staging'));
        const rollbackDatabase: any = new PouchDB(this.createTemporaryDatabaseName(project, 'restore-rollback'));
        let hasRollback: boolean = false;

        try {
            await stagingDatabase.load('file://' + filePath);
            await this.assertRestoredDatabaseIsUsable(stagingDatabase);

            const existingDatabase: any = new PouchDB(project);
            hasRollback = await this.copyExistingDatabaseToRollback(existingDatabase, rollbackDatabase);

            await existingDatabase.destroy();

            const restoredDatabase: any = new PouchDB(project);
            try {
                await BackupService.replicate(stagingDatabase, restoredDatabase);
            } catch (err) {
                await this.restoreRollback(project, rollbackDatabase, hasRollback, err);
                throw err;
            }

            return restoredDatabase;
        } finally {
            await this.destroyTemporaryDatabase(stagingDatabase);
            await this.destroyTemporaryDatabase(rollbackDatabase);
        }
    }


    private async assertRestoredDatabaseIsUsable(database: any): Promise<void> {

        await database.get('project');
    }


    private async copyExistingDatabaseToRollback(existingDatabase: any, rollbackDatabase: any): Promise<boolean> {

        const info = await existingDatabase.info();
        const hasExistingDocuments = info.doc_count > 0;
        if (hasExistingDocuments) await BackupService.replicate(existingDatabase, rollbackDatabase);

        return hasExistingDocuments;
    }


    private async restoreRollback(project: string, rollbackDatabase: any, hasRollback: boolean,
                                  originalError: any): Promise<void> {

        if (!hasRollback) return;

        try {
            let database: any = new PouchDB(project);
            await database.destroy();
            database = new PouchDB(project);
            await BackupService.replicate(rollbackDatabase, database);
        } catch (rollbackError) {
            console.error('Failed to roll back database after restore error', {
                originalError,
                rollbackError
            });
        }
    }


    private async destroyTemporaryDatabase(database: any): Promise<void> {

        try {
            await database.destroy();
        } catch (err) {
            console.warn('Failed to remove temporary restore database', err);
        }
    }


    private createTemporaryDatabaseName(project: string, purpose: string): string {

        return `${project}-${purpose}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }


    private static async replicate(source: any, target: any): Promise<void> {

        if (typeof (PouchDB as any).replicate === 'function') {
            await (PouchDB as any).replicate(source, target);
        } else if (typeof source?.replicate?.to === 'function') {
            await source.replicate.to(target);
        } else {
            throw new Error('PouchDB replication is not available');
        }
    }


    private async updateProjectIdentifier(projectDocument: Document, project: string, restoredDatabase: any) {

        projectDocument.resource.identifier = project;
        await restoredDatabase.put(projectDocument, { force: true });
    }
}
