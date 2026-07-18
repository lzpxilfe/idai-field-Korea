import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Condition, Datastore, Document, Field, Labels, Valuelist, ValuelistUtil } from 'idai-field-core';


const QUICK_RECORD_FIELDS = {
    checklist: 'featureInvestigationChecklist',
    featureRecordingStatus: 'featureRecordingStatus',
    fieldRecordQuality: 'fieldRecordQuality',
    recordCreationTiming: 'recordCreationTiming',
    verificationState: 'verificationState'
};

const FIELD_LABEL_OVERRIDES: { [fieldName: string]: string } = {
    [QUICK_RECORD_FIELDS.checklist]: '조사 단계 확인',
    [QUICK_RECORD_FIELDS.featureRecordingStatus]: '유구 진행'
};

const PROGRESS_FIELD_NAMES: readonly string[] = [
    QUICK_RECORD_FIELDS.featureRecordingStatus,
    QUICK_RECORD_FIELDS.checklist
];

interface KoreanFieldworkQuickRecordSection {
    id: string;
    title: string;
    fieldNames: readonly string[];
}

const FIELD_SECTIONS: readonly KoreanFieldworkQuickRecordSection[] = [
    {
        id: 'progress',
        title: '조사 진행',
        fieldNames: PROGRESS_FIELD_NAMES
    },
    {
        id: 'recordCharacter',
        title: '기록 성격',
        fieldNames: [QUICK_RECORD_FIELDS.fieldRecordQuality]
    },
    {
        id: 'verification',
        title: '확인·마감',
        fieldNames: [QUICK_RECORD_FIELDS.verificationState]
    },
    {
        id: 'timing',
        title: '기록 시점 수정',
        fieldNames: [QUICK_RECORD_FIELDS.recordCreationTiming]
    }
];

const ALL_FIELD_NAMES = FIELD_SECTIONS.flatMap(section => section.fieldNames);


@Component({
    selector: 'korean-fieldwork-quick-record-panel',
    templateUrl: './korean-fieldwork-quick-record-panel.html',
    standalone: false
})
export class KoreanFieldworkQuickRecordPanelComponent implements OnChanges {

    @Input() document: Document;
    @Input() fieldDefinitions: Array<Field>;

    @Output() onChanged: EventEmitter<void> = new EventEmitter<void>();

    public readonly fieldSections = FIELD_SECTIONS;
    public readonly progressFieldNames = PROGRESS_FIELD_NAMES;

    private valuelists: { [fieldName: string]: Valuelist } = {};


    constructor(private datastore: Datastore,
                private labels: Labels) {}


    async ngOnChanges() {

        await this.updateValuelists();
    }


    public shouldShow(): boolean {

        return this.getVisibleSections().length > 0;
    }


    public getVisibleSections = () =>
        this.fieldSections.filter(section => this.getVisibleFieldNames(section).length > 0);


    public getVisibleFieldNames = (section: KoreanFieldworkQuickRecordSection) =>
        section.fieldNames.filter(fieldName => this.canRenderField(fieldName));


    public shouldShowFieldLabel = (section: KoreanFieldworkQuickRecordSection) =>
        this.getVisibleFieldNames(section).length > 1;


    public getFieldLabel(fieldName: string): string {

        if (FIELD_LABEL_OVERRIDES[fieldName]) return FIELD_LABEL_OVERRIDES[fieldName];

        const field: Field|undefined = this.getField(fieldName);

        return field
            ? this.labels.get(field)
            : fieldName;
    }


    public getValues(fieldName: string): string[] {

        const valuelist = this.valuelists[fieldName];

        return valuelist
            ? this.labels.orderKeysByLabels(valuelist)
            : [];
    }


    public getValueLabel(fieldName: string, valueId: string): string {

        return this.valuelists[fieldName]
            ? this.labels.getValueLabel(this.valuelists[fieldName], valueId)
            : valueId;
    }


    public isMultiValueField(fieldName: string): boolean {

        const inputType = this.getField(fieldName)?.inputType;

        return inputType === 'checkboxes' || inputType === 'valuelistMultiInput';
    }


    public isActive(fieldName: string, valueId: string): boolean {

        return this.isMultiValueField(fieldName)
            ? this.getArrayValue(fieldName).includes(valueId)
            : this.document?.resource?.[fieldName] === valueId;
    }


    public toggleValue(fieldName: string, valueId: string) {

        if (!this.document?.resource) return;

        if (this.isMultiValueField(fieldName)) {
            this.toggleArrayValue(fieldName, valueId);
        } else if (this.document.resource[fieldName] === valueId) {
            delete this.document.resource[fieldName];
        } else {
            this.document.resource[fieldName] = valueId;
        }

        this.onChanged.emit();
    }


    private async updateValuelists() {

        this.valuelists = {};

        if (!this.fieldDefinitions || !this.document?.resource) return;

        const projectDocument = await this.datastore.get('project');

        for (const fieldName of ALL_FIELD_NAMES) {
            const field = this.getField(fieldName);
            if (!field || !this.isSupportedField(field)) continue;

            this.valuelists[fieldName] = ValuelistUtil.getValuelist(
                field,
                projectDocument,
                this.document.resource[field.name]
            );
        }
    }


    private canRenderField(fieldName: string): boolean {

        const field = this.getField(fieldName);

        return !!field
            && this.isSupportedField(field)
            && this.getValues(fieldName).length > 0
            && Condition.isFulfilled(field.condition, this.document.resource, this.fieldDefinitions, 'field');
    }


    private isSupportedField(field: Field): boolean {

        return field.editable === true
            && (
                field.inputType === 'dropdown'
                || field.inputType === 'radio'
                || field.inputType === 'checkboxes'
                || field.inputType === 'valuelistMultiInput'
            );
    }


    private getField(fieldName: string): Field|undefined {

        return this.fieldDefinitions?.find(field => field.name === fieldName);
    }


    private getArrayValue(fieldName: string): string[] {

        const value = this.document?.resource?.[fieldName];

        return Array.isArray(value)
            ? value.filter(item => typeof item === 'string')
            : [];
    }


    private toggleArrayValue(fieldName: string, valueId: string) {

        const values = this.getArrayValue(fieldName);
        const index = values.indexOf(valueId);

        if (index === -1) {
            values.push(valueId);
        } else {
            values.splice(index, 1);
        }

        if (values.length > 0) {
            this.document.resource[fieldName] = values;
        } else {
            delete this.document.resource[fieldName];
        }
    }
}
