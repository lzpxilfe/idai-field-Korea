import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Document, Field } from 'idai-field-core';
import {
    extractMunsellCandidateOptions,
    getSoilColorSampleSourceLabel
} from '../../../util/korean-fieldwork-soil-color-candidates';


type SoilColorOption = {
    value: string;
    label: string;
};

type SoilColorLayerRow = {
    number: number;
    value: string;
};


const SOIL_COLOR_FIELDS = {
    activeLayerNumber: 'soilProfileActiveLayerNumber',
    assistCandidates: 'soilColorAssistCandidates',
    assistStatus: 'soilColorAssistStatus',
    captureCondition: 'soilColorCaptureCondition',
    manualMunsell: 'soilColorMunsellManual',
    moistureState: 'soilColorMoistureState',
    profileCaptureNote: 'soilProfileCaptureNote',
    profileColorNote: 'soilProfileColorNote',
    profileColorSwatches: 'soilProfileColorSwatches',
    soilColorNote: 'soilColorNote'
};


@Component({
    selector: 'korean-fieldwork-soil-color-panel',
    templateUrl: './korean-fieldwork-soil-color-panel.html',
    standalone: false
})
export class KoreanFieldworkSoilColorPanelComponent {

    @Input() document: Document;
    @Input() fieldDefinitions: Array<Field>;

    @Output() onChanged: EventEmitter<void> = new EventEmitter<void>();

    public readonly fields = SOIL_COLOR_FIELDS;

    public readonly munsellHueNumberOptions: readonly SoilColorOption[] =
        ['2.5', '5', '7.5', '10'].map(value => ({ value, label: value }));

    public readonly munsellHueFamilyOptions: readonly SoilColorOption[] = [
        'R',
        'YR',
        'Y',
        'GY',
        'G',
        'BG',
        'B',
        'PB',
        'P',
        'RP',
        'GLEY 1',
        'GLEY 2',
        'N'
    ].map(value => ({ value, label: value }));

    public readonly munsellValueOptions: readonly SoilColorOption[] =
        ['1', '2', '2.5', '3', '4', '5', '6', '7', '8', '9']
            .map(value => ({ value, label: value }));

    public readonly munsellChromaOptions: readonly SoilColorOption[] =
        ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12']
            .map(value => ({ value, label: `/${value}` }));

    public readonly moistureOptions: readonly SoilColorOption[] = [
        { value: 'dry', label: '건조' },
        { value: 'moist', label: '습윤' },
        { value: 'wet', label: '젖음' },
        { value: 'unclear', label: '불명확' }
    ];

    public readonly captureConditionOptions: readonly SoilColorOption[] = [
        { value: 'naturalLight', label: '자연광' },
        { value: 'shade', label: '그늘' },
        { value: 'calibrationTargetUsed', label: '보정판' },
        { value: 'flash', label: '플래시' },
        { value: 'poorCondition', label: '조건 불량' }
    ];

    public activeSoilColorRowNumber = 1;
    public builderHueNumber = '10';
    public builderHueFamily = 'YR';
    public builderValue = '4';
    public builderChroma = '3';


    public shouldShow(): boolean {

        return this.canRecordLayerMunsell() || this.canRecordPhotoSwatches();
    }


    public canRecordLayerMunsell(): boolean {

        return this.document?.resource?.category === 'Layer'
            && this.hasField(SOIL_COLOR_FIELDS.manualMunsell);
    }


    public canRecordPhotoSwatches(): boolean {

        return this.document?.resource?.category === 'SoilProfilePhoto'
            && this.hasField(SOIL_COLOR_FIELDS.profileColorSwatches);
    }


    public hasField(fieldName: string): boolean {

        return this.fieldDefinitions?.some(field => field.name === fieldName && field.editable) ?? false;
    }


    public getValue(fieldName: string): string {

        const value: unknown = this.document?.resource?.[fieldName];

        return typeof value === 'string' ? value : '';
    }


    public setValue(fieldName: string, value: string) {

        if (!this.document?.resource) return;

        this.setTextResourceValue(fieldName, value);
        this.onChanged.emit();
    }


    public applyMunsellPreset(value: string) {

        if (this.canRecordLayerMunsell()) {
            this.setLayerMunsell(value);
        } else if (this.canRecordPhotoSwatches()) {
            this.setSoilProfileColorRowValue(this.getActiveSoilColorRowNumber(), value);
        }
    }


    public addEmptyNumberedSwatch() {

        if (!this.canRecordPhotoSwatches()) return;

        this.setValue(
            SOIL_COLOR_FIELDS.profileColorSwatches,
            this.appendEmptyNumberedSoilColorRow(this.getValue(SOIL_COLOR_FIELDS.profileColorSwatches))
        );
        this.activeSoilColorRowNumber = this.getSoilColorRows().slice(-1)[0]?.number ?? 1;
    }


    public applyAssistCandidate(value: string) {

        if (this.canRecordLayerMunsell()) {
            this.setLayerMunsell(value);
        } else if (this.canRecordPhotoSwatches()) {
            this.setTextResourceValue(
                SOIL_COLOR_FIELDS.profileColorSwatches,
                this.updateSoilColorRowValue(
                    this.getValue(SOIL_COLOR_FIELDS.profileColorSwatches),
                    this.getActiveSoilColorRowNumber(),
                    value
                )
            );
            this.setAssistStatus('reviewed');
            this.onChanged.emit();
        }
    }

    public getSoilColorRows(): SoilColorLayerRow[] {

        return this.parseSoilColorRows(this.getValue(SOIL_COLOR_FIELDS.profileColorSwatches));
    }


    public selectSoilColorRow(rowNumber: number) {

        this.activeSoilColorRowNumber = rowNumber;
        if (this.hasField(SOIL_COLOR_FIELDS.activeLayerNumber)) {
            this.document.resource[SOIL_COLOR_FIELDS.activeLayerNumber] = rowNumber;
        }
    }


    public getActiveSoilColorRowNumber(): number {

        const rows = this.getSoilColorRows();
        if (rows.some(row => row.number === this.activeSoilColorRowNumber)) {
            return this.activeSoilColorRowNumber;
        }

        return rows[0]?.number ?? 1;
    }


    public setSoilProfileColorRowValue(rowNumber: number, value: string) {

        this.selectSoilColorRow(rowNumber);
        this.setValue(
            SOIL_COLOR_FIELDS.profileColorSwatches,
            this.updateSoilColorRowValue(
                this.getValue(SOIL_COLOR_FIELDS.profileColorSwatches),
                rowNumber,
                value
            )
        );
    }


    public setMunsellBuilderPart(part: 'hueNumber'|'hueFamily'|'value'|'chroma', value: string) {

        if (part === 'hueNumber') this.builderHueNumber = value;
        if (part === 'hueFamily') this.builderHueFamily = value;
        if (part === 'value') this.builderValue = value;
        if (part === 'chroma') this.builderChroma = value;

        this.applyMunsellPreset(this.getMunsellBuilderValue());
    }


    public getMunsellBuilderValue(): string {

        if (this.builderHueFamily === 'N') return `N ${this.builderValue}/0`;
        if (this.builderHueFamily.startsWith('GLEY')) return `${this.builderHueFamily} ${this.builderValue}/N`;

        return `${this.builderHueNumber}${this.builderHueFamily} ${this.builderValue}/${this.builderChroma}`;
    }


    public setAssistCandidates(value: string) {

        if (!this.document?.resource) return;

        this.setTextResourceValue(SOIL_COLOR_FIELDS.assistCandidates, value);
        this.setAssistStatus(value.trim() ? 'candidatesAvailable' : 'notRun');
        this.onChanged.emit();
    }


    public getAssistCandidateOptions(): string[] {

        return extractMunsellCandidateOptions(this.getValue(SOIL_COLOR_FIELDS.assistCandidates));
    }


    public getAssistSampleSourceLabel(): string {

        return getSoilColorSampleSourceLabel(this.getValue(SOIL_COLOR_FIELDS.assistCandidates));
    }


    public setLayerMunsell(value: string) {

        if (!this.document?.resource) return;

        this.setTextResourceValue(SOIL_COLOR_FIELDS.manualMunsell, value);
        this.setAssistStatus(value.trim() ? 'manualRecorded' : 'notRun');
        this.onChanged.emit();
    }


    public isMunsellPresetActive(value: string): boolean {

        return this.canRecordLayerMunsell()
            ? this.getValue(SOIL_COLOR_FIELDS.manualMunsell) === value
            : this.getValue(SOIL_COLOR_FIELDS.profileColorSwatches).includes(value);
    }


    private parseSoilColorRows(currentValue: string): SoilColorLayerRow[] {

        const lines: string[] = currentValue
            .split(/\r?\n/)
            .map(line => line.trimEnd())
            .filter(line => line.trim().length > 0);

        if (lines.length === 0) return [{ number: 1, value: '' }];

        return lines.map((line, index) => {
            const match = line.match(/^\s*(\d+)\s*:?\s*(.*)$/);
            if (!match) return { number: index + 1, value: line.trim() };

            return {
                number: Number.parseInt(match[1], 10),
                value: match[2] ?? ''
            };
        });
    }


    private updateSoilColorRowValue(currentValue: string, rowNumber: number, value: string): string {

        const rows = this.parseSoilColorRows(currentValue);
        const rowIndex = rows.findIndex(row => row.number === rowNumber);
        const nextRows = rowIndex < 0
            ? [...rows, { number: rowNumber, value }]
            : rows.map((row, index) => index === rowIndex ? { ...row, value } : row);

        return this.serializeSoilColorRows(nextRows);
    }


    private appendEmptyNumberedSoilColorRow(currentValue: string): string {

        const rows = this.parseSoilColorRows(currentValue);
        const nextNumber = Math.max(0, ...rows.map(row => row.number)) + 1;

        return this.serializeSoilColorRows([...rows, { number: nextNumber, value: '' }]);
    }


    private serializeSoilColorRows(rows: SoilColorLayerRow[]): string {

        return rows
            .sort((left, right) => left.number - right.number)
            .map(row => `${row.number}: ${row.value}`)
            .join('\n');
    }


    private setTextResourceValue(fieldName: string, value: string) {

        const trimmedValue = value?.trim();
        if (trimmedValue) {
            this.document.resource[fieldName] = value;
        } else {
            delete this.document.resource[fieldName];
        }
    }


    private setAssistStatus(value: string) {

        if (this.hasField(SOIL_COLOR_FIELDS.assistStatus)) {
            this.document.resource[SOIL_COLOR_FIELDS.assistStatus] = value;
        }
    }
}
