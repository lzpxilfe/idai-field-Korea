import {
    KoreanFieldworkSoilColorPanelComponent
} from '../../../../../src/app/components/docedit/core/korean-fieldwork-soil-color-panel.component';
import * as fs from 'fs';
import * as path from 'path';


describe('KoreanFieldworkSoilColorPanelComponent', () => {

    let component: KoreanFieldworkSoilColorPanelComponent;


    beforeEach(() => {

        component = new KoreanFieldworkSoilColorPanelComponent();
    });

    it('uses Korean field-facing soil color labels', () => {

        const template = fs.readFileSync(
            path.resolve(
                __dirname,
                '../../../../../src/app/components/docedit/core/korean-fieldwork-soil-color-panel.html'
            ),
            'utf8'
        );

        expect(template).toContain('먼셀값');
        expect(template).toContain('먼셀 조합');
        expect(template).toContain('setMunsellBuilderPart');
        expect(template).toContain('korean-fieldwork-soil-color-layer-input');
        expect(template).not.toContain('Munsell 값');
        expect(template).toContain('사진 판독 후보');
        expect(template).toContain('사진에서 읽은 먼셀 후보');
        expect(template).toContain('getAssistSampleSourceLabel()');
        expect(template).toContain('korean-fieldwork-soil-color-layer-sample-source');
        expect(template).toContain('korean-fieldwork-soil-color-photo-sample-map');
        expect(template).toContain('getSoilColorPhotoSampleRows()');
        expect(template).toContain('토색 메모');
        expect(template).toContain('보정판 위치');
        expect(template).not.toContain('촬영 조건');
        expect(template).not.toContain('그늘');
        expect(template).not.toContain('fields.captureCondition');
        expect(template).not.toContain('captureConditionOptions');
        expect(JSON.stringify((component as any).fields)).not.toContain('soilColorCaptureCondition');
        expect(template).not.toContain('보정표');
    });


    it('exposes the desktop numbered soil color row add control', () => {

        const template = fs.readFileSync(
            path.resolve(
                __dirname,
                '../../../../../src/app/components/docedit/core/korean-fieldwork-soil-color-panel.html'
            ),
            'utf8'
        );

        expect(template).toContain('addEmptyNumberedSwatch()');
        expect(template).toContain('번호 추가');
    });


    it('records manual layer Munsell values and marks assist status as manually recorded', () => {

        component.document = { resource: { category: 'Layer' } } as any;
        component.fieldDefinitions = [
            { name: 'soilColorMunsellManual', editable: true },
            { name: 'soilColorAssistStatus', editable: true }
        ] as any;

        component.setLayerMunsell('10YR 4/3');

        expect(component.document.resource.soilColorMunsellManual).toBe('10YR 4/3');
        expect(component.document.resource.soilColorAssistStatus).toBe('manualRecorded');
    });


    it('resets layer assist status when a manual Munsell value is cleared', () => {

        const emittedStates: Array<Record<string, unknown>> = [];
        component.document = {
            resource: {
                category: 'Layer',
                soilColorMunsellManual: '10YR 4/3',
                soilColorAssistStatus: 'manualRecorded'
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilColorMunsellManual', editable: true },
            { name: 'soilColorAssistStatus', editable: true }
        ] as any;
        component.onChanged.subscribe(() => emittedStates.push({ ...component.document.resource }));

        component.setLayerMunsell('');

        expect(component.document.resource.soilColorMunsellManual).toBeUndefined();
        expect(component.document.resource.soilColorAssistStatus).toBe('notRun');
        expect(emittedStates).toEqual([
            {
                category: 'Layer',
                soilColorAssistStatus: 'notRun'
            }
        ]);
    });


    it('edits the selected numbered Munsell swatch row for soil profile photos', () => {

        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilProfileColorSwatches: '1: 10YR 4/3\n2: '
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileColorSwatches', editable: true }
        ] as any;

        component.selectSoilColorRow(2);
        component.applyMunsellPreset('10YR 3/2');

        expect(component.document.resource.soilProfileColorSwatches).toBe('1: 10YR 4/3\n2: 10YR 3/2');
    });


    it('adds the next empty numbered swatch row for desktop soil profile review', () => {

        const emittedStates: Array<Record<string, unknown>> = [];
        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilProfileColorSwatches: '1: 10YR 4/3\n3: 10YR 5/4'
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileColorSwatches', editable: true }
        ] as any;
        component.onChanged.subscribe(() => emittedStates.push({ ...component.document.resource }));

        component.addEmptyNumberedSwatch();
        component.applyMunsellPreset('7.5YR 4/4');

        expect(component.document.resource.soilProfileColorSwatches)
            .toBe('1: 10YR 4/3\n3: 10YR 5/4\n4: 7.5YR 4/4');
        expect(emittedStates).toEqual([
            {
                category: 'SoilProfilePhoto',
                soilProfileColorSwatches: '1: 10YR 4/3\n3: 10YR 5/4\n4: '
            },
            {
                category: 'SoilProfilePhoto',
                soilProfileColorSwatches: '1: 10YR 4/3\n3: 10YR 5/4\n4: 7.5YR 4/4'
            }
        ]);
    });


    it('renames the selected numbered Munsell swatch row for soil profile photos', () => {

        const emittedStates: Array<Record<string, unknown>> = [];
        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilProfileColorSwatches: '1: 10YR 4/3\n2: 7.5YR 4/4'
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileActiveLayerNumber', editable: true },
            { name: 'soilProfileColorSwatches', editable: true }
        ] as any;
        component.onChanged.subscribe(() => emittedStates.push({ ...component.document.resource }));

        component.selectSoilColorRow(2);
        component.setActiveSoilColorRowNumberInput('4');
        component.applyActiveSoilColorRowNumber();

        expect(component.document.resource.soilProfileColorSwatches).toBe('1: 10YR 4/3\n4: 7.5YR 4/4');
        expect(component.document.resource.soilProfileActiveLayerNumber).toBe(4);
        expect(component.getActiveSoilColorRowNumber()).toBe(4);
        expect(emittedStates).toEqual([
            {
                category: 'SoilProfilePhoto',
                soilProfileActiveLayerNumber: 4,
                soilProfileColorSwatches: '1: 10YR 4/3\n4: 7.5YR 4/4'
            }
        ]);
    });


    it('keeps numbered Munsell swatch rows unchanged when a duplicate layer number is entered', () => {

        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilProfileActiveLayerNumber: 2,
                soilProfileColorSwatches: '1: 10YR 4/3\n2: 7.5YR 4/4'
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileActiveLayerNumber', editable: true },
            { name: 'soilProfileColorSwatches', editable: true }
        ] as any;

        component.selectSoilColorRow(2);
        component.setActiveSoilColorRowNumberInput('1');
        component.applyActiveSoilColorRowNumber();

        expect(component.document.resource.soilProfileColorSwatches).toBe('1: 10YR 4/3\n2: 7.5YR 4/4');
        expect(component.document.resource.soilProfileActiveLayerNumber).toBe(2);
        expect(component.getActiveSoilColorRowNumberInput()).toBe('2');
    });


    it('builds desktop Munsell values from hue, value, and chroma controls', () => {

        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilProfileColorSwatches: '1: 10YR 4/3\n2: '
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileColorSwatches', editable: true }
        ] as any;

        component.selectSoilColorRow(2);
        component.setMunsellBuilderPart('hueNumber', '2.5');
        component.setMunsellBuilderPart('hueFamily', 'GY');
        component.setMunsellBuilderPart('value', '2.5');
        component.setMunsellBuilderPart('chroma', '10');

        expect(component.getMunsellBuilderValue()).toBe('2.5GY 2.5/10');
        expect(component.document.resource.soilProfileColorSwatches)
            .toBe('1: 10YR 4/3\n2: 2.5GY 2.5/10');

        component.setMunsellBuilderPart('hueFamily', 'N');
        expect(component.document.resource.soilProfileColorSwatches)
            .toBe('1: 10YR 4/3\n2: N 2.5/0');

        component.setMunsellBuilderPart('hueFamily', 'GLEY 1');
        expect(component.document.resource.soilProfileColorSwatches)
            .toBe('1: 10YR 4/3\n2: GLEY 1 2.5/N');
    });


    it('accepts photo-derived candidates for soil profile photos', () => {

        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilColorAssistCandidates: '사진 중앙부 평균 RGB 111/87/61\n1: 10YR 4/3 (보통, 차이 0.0)'
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileColorSwatches', editable: true },
            { name: 'soilColorAssistCandidates', editable: true },
            { name: 'soilColorAssistStatus', editable: true }
        ] as any;

        expect(component.getAssistCandidateOptions()).toEqual(['10YR 4/3']);

        component.applyAssistCandidate('10YR 4/3');

        expect(component.document.resource.soilProfileColorSwatches)
            .toBe('1: 10YR 4/3 RGB 111/87/61');
        expect(component.document.resource.soilColorAssistStatus).toBe('reviewed');
    });


    it('uses the shared Munsell candidate parser for desktop review chips', () => {

        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilColorAssistCandidates: [
                    '1: 10YR 4/3 (높음)',
                    '2: GLEY 1 5/N (낮음)',
                    '3: 10YR 4/3 (중복)'
                ].join('\n')
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileColorSwatches', editable: true },
            { name: 'soilColorAssistCandidates', editable: true }
        ] as any;

        expect(component.getAssistCandidateOptions()).toEqual(['10YR 4/3', 'GLEY 1 5/N']);
    });


    it('shows tablet eyedropper sample locations next to desktop photo candidates', () => {

        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilColorAssistCandidates: [
                    '사진 선택 지점 20%/50% 평균 RGB 111/87/61',
                    '1: 10YR 4/3 (높음)'
                ].join('\n')
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileColorSwatches', editable: true },
            { name: 'soilColorAssistCandidates', editable: true }
        ] as any;

        expect(component.getAssistSampleSourceLabel())
            .toBe('사진 선택 지점 20%/50% 평균 RGB 111/87/61');
    });


    it('carries tablet eyedropper sample locations into accepted desktop layer rows', () => {

        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilColorAssistCandidates: [
                    '사진 선택 지점 20%/50% 평균 RGB 111/87/61',
                    '1: 10YR 4/3 (높음)'
                ].join('\n')
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileColorSwatches', editable: true },
            { name: 'soilColorAssistCandidates', editable: true },
            { name: 'soilColorAssistStatus', editable: true }
        ] as any;

        component.applyAssistCandidate('10YR 4/3');

        expect(component.document.resource.soilProfileColorSwatches)
            .toBe('1: 10YR 4/3 RGB 111/87/61 @ 20%/50%');
        expect(component.getSoilColorRows()[0]).toMatchObject({
            number: 1,
            sampleMarkerStyle: {
                left: '20%',
                top: '50%'
            },
            samplePoint: {
                xPercent: 20,
                yPercent: 50
            },
            sampleLocationLabel: '사진 선택 위치 20%/50%',
            sampleRgbLabel: 'RGB 111/87/61',
            value: '10YR 4/3 RGB 111/87/61 @ 20%/50%'
        });
    });


    it('keeps accepted eyedropper sample locations when desktop reviewers adjust Munsell values', () => {

        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilProfileColorSwatches: '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%'
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileColorSwatches', editable: true }
        ] as any;

        component.applyMunsellPreset('7.5YR 4/4');

        expect(component.document.resource.soilProfileColorSwatches)
            .toBe('1: 7.5YR 4/4 RGB 111/87/61 @ 20%/50%');
        expect(component.getSoilColorRows()[0].sampleLocationLabel)
            .toBe('사진 선택 위치 20%/50%');
    });


    it('shows accepted eyedropper locations as numbered markers over the desktop soil profile photo', () => {

        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilProfilePhotoUri: 'file:///tablet/photos/profile-1.jpg',
                soilProfileColorSwatches: [
                    '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
                    '2: 2.5Y 5/3',
                    '3: 7.5YR 4/4 RGB 139/128/88 @ 80%/45%'
                ].join('\n')
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileColorSwatches', editable: true }
        ] as any;

        expect(component.getSoilProfilePhotoUri())
            .toBe('file:///tablet/photos/profile-1.jpg');
        expect(component.getSoilColorPhotoSampleRows().map(row => ({
            location: row.sampleLocationLabel,
            number: row.number,
            style: row.sampleMarkerStyle
        }))).toEqual([
            {
                location: '사진 선택 위치 20%/50%',
                number: 1,
                style: { left: '20%', top: '50%' }
            },
            {
                location: '사진 선택 위치 80%/45%',
                number: 3,
                style: { left: '80%', top: '45%' }
            }
        ]);
    });


    it('emits reviewed status together with an accepted photo-derived candidate', () => {

        const emittedStates: Array<Record<string, unknown>> = [];
        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilColorAssistCandidates: '1: 10YR 4/3 (보통, 차이 0.0)'
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileColorSwatches', editable: true },
            { name: 'soilColorAssistCandidates', editable: true },
            { name: 'soilColorAssistStatus', editable: true }
        ] as any;
        component.onChanged.subscribe(() => emittedStates.push({ ...component.document.resource }));

        component.applyAssistCandidate('10YR 4/3');

        expect(emittedStates).toEqual([
            {
                category: 'SoilProfilePhoto',
                soilColorAssistCandidates: '1: 10YR 4/3 (보통, 차이 0.0)',
                soilColorAssistStatus: 'reviewed',
                soilProfileColorSwatches: '1: 10YR 4/3'
            }
        ]);
    });


    it('resets assist status when photo-derived candidates are cleared', () => {

        const emittedStates: Array<Record<string, unknown>> = [];
        component.document = {
            resource: {
                category: 'SoilProfilePhoto',
                soilColorAssistCandidates: '1: 10YR 4/3 (보통, 차이 0.0)',
                soilColorAssistStatus: 'candidatesAvailable'
            }
        } as any;
        component.fieldDefinitions = [
            { name: 'soilProfileColorSwatches', editable: true },
            { name: 'soilColorAssistCandidates', editable: true },
            { name: 'soilColorAssistStatus', editable: true }
        ] as any;
        component.onChanged.subscribe(() => emittedStates.push({ ...component.document.resource }));

        component.setAssistCandidates('');

        expect(component.document.resource.soilColorAssistCandidates).toBeUndefined();
        expect(component.document.resource.soilColorAssistStatus).toBe('notRun');
        expect(emittedStates).toEqual([
            {
                category: 'SoilProfilePhoto',
                soilColorAssistStatus: 'notRun'
            }
        ]);
    });
});
