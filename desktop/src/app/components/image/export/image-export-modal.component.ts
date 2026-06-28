import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {
    Datastore,
    Document,
    ImageStore,
    ImageDocument,
    ImageVariant,
    ProjectConfiguration,
    Labels,
    Resource
} from 'idai-field-core';
import { AngularUtility } from '../../../angular/angular-utility';
import { AppState } from '../../../services/app-state';
import {
    exportImages,
    FieldworkImageExportSourceDocument,
    FieldworkImageExportRelatedDocumentIndex
} from '../../../services/imagestore/export-images';
import { SettingsProvider } from '../../../services/settings/settings-provider';
import { Messages } from '../../messages/messages';
import { M } from '../../messages/m';
import { Menus } from '../../../services/menus';
import { MenuContext } from '../../../services/menu-context';

import { electronRemote as remote } from 'src/app/electron/electron';


type NamingOption = 'identifier'|'originalFilename';

const DIRECT_FIELDWORK_PHOTO_CATEGORIES = new Set([
    'DailyLog',
    'Drawing',
    'Feature',
    'FeatureGroup',
    'FeatureSegment',
    'FieldRecordQualityReview',
    'Find',
    'FindCollection',
    'Layer',
    'Operation',
    'Photo',
    'Sample',
    'SoilProfilePhoto',
    'Survey',
    'SurveyBoundary',
    'Trench'
]);
const DIRECT_FIELDWORK_PHOTO_URI_FIELDS = [
    'fieldworkPhotoUri',
    'soilProfilePhotoUri',
    'imageUri',
    'fileUri'
];


/**
 * @author Thomas Kleinke
 */
@Component({
    selector: 'image-export-modal',
    templateUrl: './image-export-modal.html',
    host: {
        '(window:keydown)': 'onKeyDown($event)'
    },
    standalone: false
})
export class ImageExportModalComponent implements OnInit {

    public images: Array<ImageDocument>;

    public targetDirectoryPath: string = '';
    public selectedNamingOption: NamingOption = 'identifier';


    constructor(public activeModal: NgbActiveModal,
                private appState: AppState,
                private imageStore: ImageStore,
                private settingsProvider: SettingsProvider,
                private messages: Messages,
                private menuService: Menus,
                private projectConfiguration: ProjectConfiguration,
                private labels: Labels,
                private datastore: Datastore) {}


    public getIdentifierLabel = () => this.labels.getFieldLabel(
        this.projectConfiguration.getCategory('Image'),
        Resource.IDENTIFIER
    );


    ngOnInit() {
        
        AngularUtility.blurActiveElement();
        this.targetDirectoryPath = this.appState.getFolderPath('imageExport');
    }


    public onKeyDown(event: KeyboardEvent) {

        if (event.key === 'Escape' && this.menuService.getContext() === MenuContext.IMAGE_TOOL_MODAL) {
            this.activeModal.dismiss('cancel');
        }
    }


    public async startExport() {

        if (!this.targetDirectoryPath) return;
    
        try {
            const project = this.settingsProvider.getSettings().selectedProject;
            const fieldworkAttachedPhotoDocuments = await this.getExportableDirectFieldworkPhotoDocuments(project);
            const exportDocuments = getUniqueExportDocuments([
                ...this.images,
                ...fieldworkAttachedPhotoDocuments
            ]);
            const [relatedDocumentsById, projectContext] = await Promise.all([
                this.getRelatedDocumentsById(exportDocuments),
                this.getProjectContext()
            ]);

            exportImages(
                this.imageStore,
                exportDocuments,
                this.targetDirectoryPath,
                project,
                this.selectedNamingOption === 'originalFilename',
                relatedDocumentsById,
                projectContext
            );
            this.showSuccessMessage(exportDocuments.length);
            this.activeModal.close();
        } catch (err) {
            console.error(err);
            this.messages.add([M.IMAGES_ERROR_EXPORT_FAILED]);
        }
    }
    
    
    public async chooseTargetDirectory() {

        const result: any = await remote.dialog.showOpenDialog(
            remote.getCurrentWindow(),
            {
                properties: ['openDirectory', 'createDirectory'],
                defaultPath: this.targetDirectoryPath,
                buttonLabel: $localize `:@@buttons.selectFolder:Verzeichnis auswählen`
            }
        );

        if (result && result.filePaths.length > 0) {
            this.targetDirectoryPath = result.filePaths[0];
            this.appState.setFolderPath(this.targetDirectoryPath, 'imageExport', true);
        }
    }


    private showSuccessMessage(exportedDocumentCount: number = this.images.length) {

        if (exportedDocumentCount === 1) {
            this.messages.add([M.IMAGES_SUCCESS_IMAGES_EXPORTED_SINGLE]);
        } else {
            this.messages.add([
                M.IMAGES_SUCCESS_IMAGES_EXPORTED_MULTIPLE,
                exportedDocumentCount.toString()
            ]);
        }
    }


    private async getRelatedDocumentsById(images: Array<FieldworkImageExportSourceDocument>):
            Promise<FieldworkImageExportRelatedDocumentIndex> {

        const targetIds = [...new Set(images.flatMap(image => {
            return Object.values(image.resource.relations ?? {}).flat();
        }))];

        const relatedDocuments = await Promise.all(targetIds.map(async targetId => {
            try {
                return await this.datastore.get(targetId);
            } catch {
                return undefined;
            }
        }));

        return relatedDocuments.reduce((result: FieldworkImageExportRelatedDocumentIndex,
                                        document: Document|undefined) => {
            if (document) {
                result[document.resource.id] = {
                    id: document.resource.id,
                    identifier: document.resource.identifier || document.resource.id,
                    category: document.resource.category,
                    resource: document.resource
                };
            }

            return result;
        }, {});
    }


    private async getExportableDirectFieldworkPhotoDocuments(project: string): Promise<Document[]> {

        if (typeof this.imageStore.getFileInfos !== 'function') return [];

        try {
            const [findResult, originalFileInfos] = await Promise.all([
                this.datastore.find({}),
                this.imageStore.getFileInfos(project, [ImageVariant.ORIGINAL])
            ]);

            return (findResult.documents ?? [])
                .filter(document => isDirectFieldworkPhotoDocument(document))
                .filter(document => originalFileInfos[document.resource.id] !== undefined);
        } catch {
            return [];
        }
    }


    private async getProjectContext(): Promise<Record<string, any>> {

        try {
            const projectDocument: Document = await this.datastore.get('project');
            return projectDocument.resource;
        } catch {
            return {};
        }
    }
}


function isDirectFieldworkPhotoDocument(document: Document): boolean {

    return DIRECT_FIELDWORK_PHOTO_CATEGORIES.has(String(document.resource.category))
        && DIRECT_FIELDWORK_PHOTO_URI_FIELDS.some(fieldName => hasTextValue(document.resource[fieldName]));
}


function getUniqueExportDocuments(documents: Array<FieldworkImageExportSourceDocument>):
        Array<FieldworkImageExportSourceDocument> {

    const seenIds = new Set<string>();

    return documents.filter(document => {
        if (seenIds.has(document.resource.id)) return false;

        seenIds.add(document.resource.id);
        return true;
    });
}


function hasTextValue(value: unknown): boolean {

    return typeof value === 'string' && value.trim().length > 0;
}
