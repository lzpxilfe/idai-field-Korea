import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import {
    Condition,
    Datastore,
    Document,
    Field,
    Labels,
    OptionalRange,
    Valuelist,
    ValuelistUtil
} from 'idai-field-core';
import {
    applyKoreanFieldworkFeatureGuidancePreset,
    getKoreanFieldworkActiveFeatureGuidancePreset,
    getKoreanFieldworkFeatureGuidanceChecklistFields,
    getKoreanFieldworkFeatureGuidanceNarrativeTarget,
    getKoreanFieldworkFeatureGuidanceNarrativeValue,
    isKoreanFieldworkFeatureGuidanceCategory,
    KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS,
    KoreanFieldworkFeatureGuidanceChecklist,
    KoreanFieldworkFeatureGuidancePreset
} from '../../../util/korean-fieldwork-feature-guidance';

const PERIOD_FIELD_NAME = 'period';


@Component({
    selector: 'korean-fieldwork-feature-guidance-panel',
    templateUrl: './korean-fieldwork-feature-guidance-panel.html',
    standalone: false
})
export class KoreanFieldworkFeatureGuidancePanelComponent implements OnChanges {

    @Input() document: Document;
    @Input() fieldDefinitions: Field[];

    @Output() onChanged: EventEmitter<void> = new EventEmitter<void>();

    public readonly presets = KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS;

    private valuelists: { [fieldName: string]: Valuelist } = {};


    constructor(private datastore: Datastore,
                private labels: Labels) {}


    async ngOnChanges() {

        await this.updateValuelists();
    }


    public shouldShow(): boolean {

        return isKoreanFieldworkFeatureGuidanceCategory(this.document?.resource?.category)
            && (
                this.canRenderPeriodField()
                || this.canSelectFeatureType()
                || this.getGuidedChecklistFields().length > 0
                || this.canApplyNarrativeTemplate()
            );
    }


    public getActivePreset = () =>
        getKoreanFieldworkActiveFeatureGuidancePreset(this.document);


    public isPresetActive(preset: KoreanFieldworkFeatureGuidancePreset): boolean {

        return this.getActivePreset()?.id === preset.id;
    }


    public getCoreAttributeTitle(preset: KoreanFieldworkFeatureGuidancePreset): string {

        return `${preset.label} 핵심 속성`;
    }


    public selectPreset(preset: KoreanFieldworkFeatureGuidancePreset) {

        applyKoreanFieldworkFeatureGuidancePreset(this.document, preset);
        this.onChanged.emit();
    }


    public canRenderPeriodField = () => this.canRenderChoiceField(PERIOD_FIELD_NAME);


    public getPeriodFieldName = () => PERIOD_FIELD_NAME;


    public getChoiceFieldLabel(fieldName: string): string {

        const field = this.getField(fieldName);

        return field
            ? this.labels.get(field)
            : fieldName;
    }


    public getChoiceValueIds(fieldName: string): string[] {

        const valuelist = this.valuelists[fieldName];

        return valuelist
            ? this.labels.orderKeysByLabels(valuelist)
            : [];
    }


    public getChoiceValueLabel(fieldName: string, valueId: string): string {

        return this.getValueLabel(fieldName, valueId);
    }


    public isChoiceValueActive(fieldName: string, valueId: string): boolean {

        return this.isMultiValueChoiceField(fieldName)
            ? this.getStringArrayValue(fieldName).includes(valueId)
            : this.getSingleChoiceValue(fieldName) === valueId;
    }


    public toggleChoiceValue(fieldName: string, valueId: string) {

        if (!this.document?.resource) return;

        if (this.isMultiValueChoiceField(fieldName)) {
            this.toggleArrayValue(fieldName, valueId);
        } else if (this.getSingleChoiceValue(fieldName) === valueId) {
            delete this.document.resource[fieldName];
        } else if (this.isOptionalRangeChoiceField(fieldName)) {
            this.document.resource[fieldName] = {
                value: valueId
            } as OptionalRange<string>;
        } else {
            this.document.resource[fieldName] = valueId;
        }

        this.onChanged.emit();
    }


    public getGuidedChecklistFields(): KoreanFieldworkFeatureGuidanceChecklist[] {

        return getKoreanFieldworkFeatureGuidanceChecklistFields(
            this.getActivePreset(),
            this.document,
            this.fieldDefinitions
        ).filter(checklist => this.getSuggestedValueIds(checklist).length > 0);
    }


    public getChecklistFieldLabel(fieldName: string): string {

        const field = this.getField(fieldName);

        return field
            ? this.labels.get(field)
            : fieldName;
    }


    public getSuggestedValueIds(checklist: KoreanFieldworkFeatureGuidanceChecklist): string[] {

        const valuelist = this.valuelists[checklist.fieldName];
        if (!valuelist) return [];

        return checklist.valueIds.filter(valueId => !!valuelist.values[valueId]);
    }


    public getValueLabel(fieldName: string, valueId: string): string {

        return this.valuelists[fieldName]
            ? this.labels.getValueLabel(this.valuelists[fieldName], valueId)
            : valueId;
    }


    public isChecklistValueActive(fieldName: string, valueId: string): boolean {

        return this.getStringArrayValue(fieldName).includes(valueId);
    }


    public toggleChecklistValue(fieldName: string, valueId: string) {

        if (!this.document?.resource) return;

        const values = this.getStringArrayValue(fieldName);
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

        this.onChanged.emit();
    }


    public canApplyNarrativeTemplate(): boolean {

        return !!this.getActivePreset()
            && !!getKoreanFieldworkFeatureGuidanceNarrativeTarget(this.document, this.fieldDefinitions);
    }


    public getNarrativeTargetLabel(): string {

        const target = getKoreanFieldworkFeatureGuidanceNarrativeTarget(this.document, this.fieldDefinitions);
        const field = target ? this.getField(target) : undefined;

        return field
            ? this.labels.get(field)
            : '서술';
    }


    public getNarrativeTargetValue(): string {

        const target = getKoreanFieldworkFeatureGuidanceNarrativeTarget(this.document, this.fieldDefinitions);
        const value = target ? this.document?.resource?.[target] : undefined;

        return typeof value === 'string' ? value : '';
    }


    public getNarrativePlaceholder(): string {

        return this.getActivePreset()?.narrativeTemplate ?? '';
    }


    public updateNarrativeTargetValue(value: string) {

        const target = getKoreanFieldworkFeatureGuidanceNarrativeTarget(this.document, this.fieldDefinitions);
        if (!target || !this.document?.resource) return;

        if (value.trim().length > 0) {
            this.document.resource[target] = value;
        } else {
            delete this.document.resource[target];
        }

        this.onChanged.emit();
    }


    public applyNarrativeTemplate() {

        const preset = this.getActivePreset();
        const target = getKoreanFieldworkFeatureGuidanceNarrativeTarget(this.document, this.fieldDefinitions);

        if (!preset || !target || !this.document?.resource) return;

        this.document.resource[target] = getKoreanFieldworkFeatureGuidanceNarrativeValue(
            this.document,
            preset,
            target
        );
        this.onChanged.emit();
    }


    private async updateValuelists() {

        this.valuelists = {};

        if (!this.fieldDefinitions || !this.document?.resource) return;

        const projectDocument = await this.datastore.get('project');

        this.addValuelist(PERIOD_FIELD_NAME, projectDocument);

        for (const preset of this.presets) {
            for (const checklist of preset.checklists) {
                this.addValuelist(checklist.fieldName, projectDocument);
            }
        }
    }


    public canSelectFeatureType(): boolean {

        const field = this.getField('featureInterpretationType');

        return !!field
            && this.isSupportedChecklistField(field)
            && Condition.isFulfilled(field.condition, this.document.resource, this.fieldDefinitions, 'field');
    }


    private isSupportedChecklistField(field: Field): boolean {

        return field.editable === true
            && (
                field.inputType === 'checkboxes'
                || field.inputType === 'valuelistMultiInput'
            );
    }


    private canRenderChoiceField(fieldName: string): boolean {

        const field = this.getField(fieldName);

        return !!field
            && this.isSupportedChoiceField(field)
            && this.getChoiceValueIds(fieldName).length > 0
            && Condition.isFulfilled(field.condition, this.document.resource, this.fieldDefinitions, 'field');
    }


    private isSupportedChoiceField(field: Field): boolean {

        return field.editable === true
            && (
                field.inputType === 'dropdown'
                || field.inputType === 'dropdownRange'
                || field.inputType === 'radio'
                || field.inputType === 'checkboxes'
                || field.inputType === 'valuelistMultiInput'
            );
    }


    private addValuelist(fieldName: string, projectDocument: Document) {

        const field = this.getField(fieldName);
        if (!field || !this.isSupportedChoiceField(field)) return;

        this.valuelists[field.name] = ValuelistUtil.getValuelist(
            field,
            projectDocument,
            this.getChoiceValues(field.name)
        );
    }


    private isMultiValueChoiceField(fieldName: string): boolean {

        const inputType = this.getField(fieldName)?.inputType;

        return inputType === 'checkboxes' || inputType === 'valuelistMultiInput';
    }


    private isOptionalRangeChoiceField(fieldName: string): boolean {

        return this.getField(fieldName)?.inputType === 'dropdownRange';
    }


    private getSingleChoiceValue(fieldName: string): string|undefined {

        const value = this.document?.resource?.[fieldName];
        if (typeof value === 'string') return value;
        if (!this.isOptionalRangeChoiceField(fieldName)
            || !value
            || typeof value !== 'object'
            || Array.isArray(value)) {
            return undefined;
        }

        const startValue = (value as Record<string, unknown>).value;

        return typeof startValue === 'string' && startValue.trim().length > 0
            ? startValue
            : undefined;
    }


    private getChoiceValues(fieldName: string): string[] {

        if (this.isMultiValueChoiceField(fieldName)) return this.getStringArrayValue(fieldName);

        const value = this.document?.resource?.[fieldName];
        if (typeof value === 'string') return value.trim().length > 0 ? [value] : [];
        if (!this.isOptionalRangeChoiceField(fieldName)
            || !value
            || typeof value !== 'object'
            || Array.isArray(value)) {
            return [];
        }

        const range = value as Record<string, unknown>;

        return [range.value, range.endValue]
            .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
    }


    private getField(fieldName: string): Field|undefined {

        return this.fieldDefinitions?.find(field => field.name === fieldName);
    }


    private getStringArrayValue(fieldName: string): string[] {

        const value = this.document?.resource?.[fieldName];

        return Array.isArray(value)
            ? value.filter(item => typeof item === 'string')
            : [];
    }


    private toggleArrayValue(fieldName: string, valueId: string) {

        const values = this.getStringArrayValue(fieldName);
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
