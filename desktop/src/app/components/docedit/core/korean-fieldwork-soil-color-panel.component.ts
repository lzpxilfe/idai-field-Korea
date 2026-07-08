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
    sampleLocationLabel?: string;
    sampleMarkerStyle?: Record<string, string>;
    samplePoint?: {
        xPercent: number;
        yPercent: number;
    };
    sampleRgbLabel?: string;
    value: string;
};


const SOIL_COLOR_ROW_RGB_SAMPLE_PATTERN =
    /RGB\s+(\d{1,3})\/(\d{1,3})\/(\d{1,3})(?:\s+@\s*(\d{1,3})%\/(\d{1,3})%)?/i;
const SOIL_COLOR_ASSIST_POINT_SAMPLE_PATTERN =
    /^사진 선택 지점 (\d{1,3})%\/(\d{1,3})% 평균 RGB (\d{1,3})\/(\d{1,3})\/(\d{1,3})$/;
const SOIL_COLOR_ASSIST_CENTER_SAMPLE_PATTERN =
    /^사진 중앙부 평균 RGB (\d{1,3})\/(\d{1,3})\/(\d{1,3})$/;


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
        { value: 'dry', label: '건조' },
        { value: 'moist', label: '습윤' },
        { value: 'wet', label: '젖음' },
        { value: 'unclear', label: '불명확' }
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
            this.setSoilProfileColorRowValue(this.getActiveSoilColorRowNumber(), value, true);
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
                    this.getAcceptedAssistCandidateRowValue(value)
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
        const nextValue = this.renameSoilColorRowNumber(currentValue, currentRowNumber, nextRowNumber);
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
            if (!match) {
                return {
                    number: index + 1,
                    ...this.getSoilColorRowSampleSummary(line),
                    value: line.trim()
                };
            }

            const value = match[2] ?? '';

            return {
                number: Number.parseInt(match[1], 10),
                ...this.getSoilColorRowSampleSummary(value),
                value
            };
        });
    }


    private updateSoilColorRowValue(currentValue: string,
                                    rowNumber: number,
                                    value: string,
                                    preserveExistingSample: boolean = false): string {

        const rows = this.parseSoilColorRows(currentValue);
        const rowIndex = rows.findIndex(row => row.number === rowNumber);
        const nextValue = preserveExistingSample
            ? this.withPreservedSoilColorSample(rows[rowIndex]?.value, value)
            : value;
        const nextRows = rowIndex < 0
            ? [...rows, { number: rowNumber, value: nextValue }]
            : rows.map((row, index) => index === rowIndex ? { ...row, value: nextValue } : row);

        return this.serializeSoilColorRows(nextRows);
    }


    private getAcceptedAssistCandidateRowValue(value: string): string {

        const sampleSuffix = this.getSoilColorSampleSuffixFromAssistSource();

        return sampleSuffix && !SOIL_COLOR_ROW_RGB_SAMPLE_PATTERN.test(value)
            ? `${value} ${sampleSuffix}`
            : value;
    }


    private getSoilColorSampleSuffixFromAssistSource(): string {

        const sourceLabel = this.getAssistSampleSourceLabel();
        const pointMatch = sourceLabel.match(SOIL_COLOR_ASSIST_POINT_SAMPLE_PATTERN);
        if (pointMatch) {
            const xPercent = this.normalizeSoilColorSamplePercent(pointMatch[1]);
            const yPercent = this.normalizeSoilColorSamplePercent(pointMatch[2]);
            const rgb = this.getValidRgbSample(pointMatch[3], pointMatch[4], pointMatch[5]);

            return rgb ? `${rgb} @ ${xPercent}%/${yPercent}%` : '';
        }

        const centerMatch = sourceLabel.match(SOIL_COLOR_ASSIST_CENTER_SAMPLE_PATTERN);
        if (centerMatch) {
            return this.getValidRgbSample(centerMatch[1], centerMatch[2], centerMatch[3]) ?? '';
        }

        return '';
    }


    private withPreservedSoilColorSample(previousValue: string|undefined, nextValue: string): string {

        if (!previousValue || SOIL_COLOR_ROW_RGB_SAMPLE_PATTERN.test(nextValue)) return nextValue;

        const previousSample = this.getSoilColorRowSampleSummary(previousValue).sampleRawValue;

        return previousSample && nextValue.trim()
            ? `${nextValue.trim()} ${previousSample}`
            : nextValue;
    }


    private getSoilColorRowSampleSummary(value: string): {
        sampleLocationLabel?: string;
        sampleRawValue?: string;
        sampleRgbLabel?: string;
    } {

        const match = value.match(SOIL_COLOR_ROW_RGB_SAMPLE_PATTERN);
        if (!match) return {};

        const rgb = this.getValidRgbSample(match[1], match[2], match[3]);
        if (!rgb) return {};

        const xPercent = match[4] === undefined ? undefined : this.normalizeSoilColorSamplePercent(match[4]);
        const yPercent = match[5] === undefined ? undefined : this.normalizeSoilColorSamplePercent(match[5]);
        const sampleLocationLabel = xPercent !== undefined && yPercent !== undefined
            ? `사진 선택 위치 ${xPercent}%/${yPercent}%`
            : undefined;
        const samplePoint = xPercent !== undefined && yPercent !== undefined
            ? {
                xPercent,
                yPercent
            }
            : undefined;

        return {
            sampleLocationLabel,
            ...(samplePoint
                ? {
                    sampleMarkerStyle: {
                        left: `${samplePoint.xPercent}%`,
                        top: `${samplePoint.yPercent}%`
                    },
                    samplePoint
                }
                : {}),
            sampleRawValue: sampleLocationLabel
                ? `${rgb} @ ${xPercent}%/${yPercent}%`
                : rgb,
            sampleRgbLabel: rgb
        };
    }


    private getValidRgbSample(redValue: string, greenValue: string, blueValue: string): string|undefined {

        const values = [redValue, greenValue, blueValue].map(value => Number.parseInt(value, 10));
        if (!values.every(value => Number.isFinite(value) && value >= 0 && value <= 255)) return undefined;

        return `RGB ${values[0]}/${values[1]}/${values[2]}`;
    }


    private normalizeSoilColorSamplePercent(value: string): number {

        const percent = Number.parseInt(value, 10);

        return Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : 0;
    }


    private appendEmptyNumberedSoilColorRow(currentValue: string): string {

        const rows = this.parseSoilColorRows(currentValue);
        const nextNumber = Math.max(0, ...rows.map(row => row.number)) + 1;

        return this.serializeSoilColorRows([...rows, { number: nextNumber, value: '' }]);
    }


    private renameSoilColorRowNumber(currentValue: string,
                                     currentRowNumber: number,
                                     nextRowNumber: number): string {

        const rows = this.parseSoilColorRows(currentValue);
        if (rows.some(row => row.number === nextRowNumber && row.number !== currentRowNumber)) {
            return currentValue;
        }

        return this.serializeSoilColorRows(rows.map(row =>
            row.number === currentRowNumber
                ? { ...row, number: nextRowNumber }
                : row
        ));
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
