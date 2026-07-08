import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
    appendEmptySoilProfileColorSwatchRow,
    createSoilProfileColorSwatchRow,
    Document,
    Field,
    getSoilProfileColorSampleSummary,
    parseSoilProfileColorSwatchRows,
    renameSoilProfileColorSwatchRowNumber,
    serializeSoilProfileColorSwatchRows,
    SoilProfileColorSampleSummary,
    SoilProfileColorSwatchRow,
    updateSoilProfileColorSwatchMunsellValue,
    updateSoilProfileColorSwatchSampleValue
} from 'idai-field-core';
import {
    extractMunsellCandidateOptions,
    getSoilColorSampleSourceLabel
} from '../../../util/korean-fieldwork-soil-color-candidates';


type SoilColorOption = {
    value: string;
    label: string;
};

type SoilColorLayerRow = SoilProfileColorSwatchRow & {
    sampleLocationLabel?: string;
    sampleMarkerStyle?: Record<string, string>;
    samplePoint?: {
        xPercent: number;
        yPercent: number;
    };
    sampleRgbLabel?: string;
};


const SOIL_COLOR_FIELDS = {
    activeLayerNumber: 'soilProfileActiveLayerNumber',
    assistCandidates: 'soilColorAssistCandidates',
    assistStatus: 'soilColorAssistStatus',
    manualMunsell: 'soilColorMunsellManual',
    moistureState: 'soilColorMoistureState',
    profileCaptureNote: 'soilProfileCaptureNote',
    profileColorNote: 'soilProfileColorNote',
    profileColorSwatches: 'soilProfileColorSwatches',
    soilColorNote: 'soilColorNote'
};
const SOIL_PROFILE_PHOTO_URI_FIELDS = [
    'soilProfilePhotoUri',
    'imageUri',
    'fieldworkPhotoUri'
];


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
        { value: 'dry', label: '\uac74\uc870' },
        { value: 'moist', label: '\uc2b5\uc724' },
        { value: 'wet', label: '\uc816\uc74c' },
        { value: 'unclear', label: '\ubd88\uba85\ud655' }
    ];

    public activeSoilColorRowNumber = 1;
    public soilColorRowNumberInput = '';
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


    public getSoilProfilePhotoUri(): string {

        if (!this.canRecordPhotoSwatches()) return '';

        return SOIL_PROFILE_PHOTO_URI_FIELDS
            .map(fieldName => this.document?.resource?.[fieldName])
            .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
            ?? '';
    }


    public getSoilColorPhotoSampleRows(): SoilColorLayerRow[] {

        if (!this.getSoilProfilePhotoUri()) return [];

        return this.getSoilColorRows()
            .filter(row => !!row.samplePoint && !!row.sampleMarkerStyle);
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
            this.setSoilProfileColorMunsellValue(this.getActiveSoilColorRowNumber(), value);
        }
    }


    public addEmptyNumberedSwatch() {

        if (!this.canRecordPhotoSwatches()) return;

        this.setValue(
            SOIL_COLOR_FIELDS.profileColorSwatches,
            appendEmptySoilProfileColorSwatchRow(this.getValue(SOIL_COLOR_FIELDS.profileColorSwatches))
        );
        this.activeSoilColorRowNumber = this.getSoilColorRows().slice(-1)[0]?.number ?? 1;
    }


    public applyAssistCandidate(value: string) {

        if (this.canRecordLayerMunsell()) {
            this.setLayerMunsell(value);
        } else if (this.canRecordPhotoSwatches()) {
            this.setTextResourceValue(
                SOIL_COLOR_FIELDS.profileColorSwatches,
                updateSoilProfileColorSwatchSampleValue(
                    this.getValue(SOIL_COLOR_FIELDS.profileColorSwatches),
                    this.getActiveSoilColorRowNumber(),
                    value,
                    this.getValue(SOIL_COLOR_FIELDS.assistCandidates)
                )
            );
            this.setAssistStatus('reviewed');
            this.onChanged.emit();
        }
    }

    public getSoilColorRows(): SoilColorLayerRow[] {

        return parseSoilProfileColorSwatchRows(this.getValue(SOIL_COLOR_FIELDS.profileColorSwatches))
            .map(row => this.decorateSoilColorRow(row));
    }


    public selectSoilColorRow(rowNumber: number) {

        this.activeSoilColorRowNumber = rowNumber;
        this.soilColorRowNumberInput = String(rowNumber);
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


    public getActiveSoilColorRowNumberInput(): string {

        return this.soilColorRowNumberInput || String(this.getActiveSoilColorRowNumber());
    }


    public setActiveSoilColorRowNumberInput(value: string) {

        this.soilColorRowNumberInput = value;
    }


    public applyActiveSoilColorRowNumber() {

        if (!this.canRecordPhotoSwatches()) return;

        const currentRowNumber = this.getActiveSoilColorRowNumber();
        const nextRowNumber = Number.parseInt(this.soilColorRowNumberInput.trim(), 10);
        if (!Number.isFinite(nextRowNumber) || nextRowNumber < 1) {
            this.soilColorRowNumberInput = String(currentRowNumber);
            return;
        }

        if (nextRowNumber === currentRowNumber) return;

        const currentValue = this.getValue(SOIL_COLOR_FIELDS.profileColorSwatches);
        const nextValue = renameSoilProfileColorSwatchRowNumber(currentValue, currentRowNumber, nextRowNumber);
        if (nextValue === currentValue) {
            this.soilColorRowNumberInput = String(currentRowNumber);
            return;
        }

        this.setTextResourceValue(SOIL_COLOR_FIELDS.profileColorSwatches, nextValue);
        this.activeSoilColorRowNumber = nextRowNumber;
        this.soilColorRowNumberInput = String(nextRowNumber);
        if (this.hasField(SOIL_COLOR_FIELDS.activeLayerNumber)) {
            this.document.resource[SOIL_COLOR_FIELDS.activeLayerNumber] = nextRowNumber;
        }
        this.onChanged.emit();
    }


    public setSoilProfileColorRowValue(rowNumber: number, value: string, preserveExistingSample: boolean = false) {

        this.selectSoilColorRow(rowNumber);
        this.setValue(
            SOIL_COLOR_FIELDS.profileColorSwatches,
            this.updateSoilColorRowValue(
                this.getValue(SOIL_COLOR_FIELDS.profileColorSwatches),
                rowNumber,
                value,
                preserveExistingSample
            )
        );
    }


    public setSoilProfileColorMunsellValue(rowNumber: number, value: string) {

        this.selectSoilColorRow(rowNumber);
        this.setValue(
            SOIL_COLOR_FIELDS.profileColorSwatches,
            updateSoilProfileColorSwatchMunsellValue(
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


    private updateSoilColorRowValue(currentValue: string,
                                    rowNumber: number,
                                    value: string,
                                    preserveExistingSample: boolean = false): string {

        const rows = parseSoilProfileColorSwatchRows(currentValue);
        const rowIndex = rows.findIndex(row => row.number === rowNumber);
        const nextValue = this.getRowValueWithPreservedSample(rows[rowIndex], value, preserveExistingSample);
        const nextRows = rowIndex < 0
            ? [...rows, createSoilProfileColorSwatchRow(rowNumber, nextValue)]
            : rows.map((row, index) =>
                index === rowIndex ? createSoilProfileColorSwatchRow(row.number, nextValue) : row
            );

        return serializeSoilProfileColorSwatchRows(nextRows);
    }


    private getRowValueWithPreservedSample(row: SoilProfileColorSwatchRow|undefined,
                                           nextValue: string,
                                           preserveExistingSample: boolean): string {

        if (!preserveExistingSample || !row?.sample || getSoilProfileColorSampleSummary(nextValue)) {
            return nextValue;
        }

        return nextValue.trim()
            ? `${nextValue.trim()} ${row.sample.label}`
            : nextValue;
    }


    private decorateSoilColorRow(row: SoilProfileColorSwatchRow): SoilColorLayerRow {

        if (!row.sample) return row;

        return {
            ...row,
            ...(row.sample.point
                ? {
                    sampleLocationLabel:
                        `\uc0ac\uc9c4 \uc120\ud0dd \uc704\uce58 ${row.sample.pointLabel}`,
                    sampleMarkerStyle: {
                        left: `${row.sample.point.xPercent}%`,
                        top: `${row.sample.point.yPercent}%`
                    },
                    samplePoint: row.sample.point
                }
                : {}),
            sampleRgbLabel: this.getSoilColorSampleRgbLabel(row.sample)
        };
    }


    private getSoilColorSampleRgbLabel(sample: SoilProfileColorSampleSummary): string {

        return `RGB ${sample.red}/${sample.green}/${sample.blue}`;
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
