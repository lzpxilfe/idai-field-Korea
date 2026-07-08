import {
    getKoreanFieldworkReportHandoffSaveMessage,
    getKoreanFieldworkReportHandoffValidationDetailMessage,
    makeKoreanFieldworkReportHandoff,
    normalizeKoreanFieldworkHwpPlainText,
    validateKoreanFieldworkReportHandoffCandidate
} from '../../src/tools/korean-fieldwork-report-handoff';
import { getKoreanFieldworkFeatureTypeLabel } from '../../src/tools/korean-fieldwork-feature-types';


describe('Korean fieldwork report handoff', () => {

    it('turns a tablet feature bundle into a desktop report copy block', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            }),
            makeDocument('photo-1', 'Photo', {
                fieldworkPhotoUri: 'file:///tablet/photos/photo-1.jpg',
                relations: { depicts: ['feature-1'] }
            }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilProfilePhotoUri: 'file:///tablet/photos/soil-photo-1.jpg',
                relations: { depicts: ['feature-1'] }
            }),
            makeDocument('memo-1', 'PenMemo', {
                penMemoReviewedTranscript: 'fill continues under east edge',
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');

        expect(featureItem).toEqual(jasmine.objectContaining({
            documentId: 'feature-1',
            identifier: 'pit-001',
            summary: 'round pit with dark fill',
            evidenceCount: 3,
            issueCount: 6,
            tone: 'review'
        }));
        expect(featureItem?.evidenceLabel).toContain('\uc0ac\uc9c4 1');
        expect(featureItem?.evidenceLabel).toContain('\ud1a0\uce35\uc0ac\uc9c4 1');
        expect(featureItem?.evidenceLabel).toContain('\ud604\uc7a5\uba54\ubaa8 1');
        expect(featureItem?.evidenceDetails.join('\n')).toContain('file:///tablet/photos/photo-1.jpg');
        expect(featureItem?.evidenceDetails.join('\n')).toContain('fill continues under east edge');
        expect(featureItem?.issueDetails.join('\n')).toContain('완료 사진 항목이 체크되지 않았습니다');
        expect(featureItem?.issueDetails.join('\n')).toContain('현장사진 원본 보존 상태');
        expect(featureItem?.issueDetails.join('\n')).toContain('보고서용 원본 정보');
        expect(featureItem?.issueDetails.join('\n')).toContain('번호별 토색');
        expect(featureItem?.copyText).toContain('[\uc720\uad6c] pit-001');
        expect(featureItem?.copyText).toContain('\uc694\uc57d: round pit with dark fill');
        expect(featureItem?.copyText).toContain('\uc790\ub8cc \uc0c1\uc138');
        expect(featureItem?.copyText).toContain('file:///tablet/photos/photo-1.jpg');
        expect(featureItem?.copyText).toContain('\ud655\uc778: \ubcf4\uc644 \ud544\uc694 6');
        expect(featureItem?.copyText).toContain('\ud655\uc778 \uc0c1\uc138');
        expect(featureItem?.copyText).toContain('현장사진 원본 보존 상태');
        expect(featureItem?.copyText).not.toContain('fieldwork-photo-upload-missing');
        expect(featureItem?.copyText).not.toContain('feature-complete-photo');
        expect(handoff.reviewCount).toBeGreaterThan(0);
        expect(handoff.copyAllText).toContain(featureItem!.copyText);
        expect(featureItem?.copyText).not.toContain('\u200B');
        expect(featureItem?.copyText).not.toMatch(/(^|[^\r])\n/);
        expect(featureItem?.copyText).toContain('\r\n');
    });


    it('carries tablet feature type choices into HWP copy blocks with shared Korean labels', () => {

        const featureTypeLabel = getKoreanFieldworkFeatureTypeLabel('pit');
        const handoff = makeKoreanFieldworkReportHandoff([
            makeDocument('feature-1', 'Feature', {
                identifier: 'feature-001',
                featureType: 'pit',
                featureInterpretationType: ['pitFeature']
            })
        ] as any);

        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const details = featureItem?.details.join('\n') ?? '';

        expect(details).toContain(`\uc131\uaca9: ${featureTypeLabel}`);
        expect(featureItem?.copyText).toContain(`\uc131\uaca9: ${featureTypeLabel}`);
        expect(featureItem?.copyText).not.toContain('pitFeature');
    });


    it('carries tablet investigation checklist steps into HWP copy blocks with Korean labels', () => {

        const handoff = makeKoreanFieldworkReportHandoff([
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                period: 'bronzeAge',
                featureRecordingStatus: 'candidate',
                recordCreationTiming: 'duringFieldwork',
                fieldRecordQuality: [
                    'immediateRecording',
                    'observationInterpretationSeparated'
                ],
                verificationState: 'observedInField',
                featureInvestigationChecklist: [
                    'findsRecovered',
                    'preInvestigationPhotoTaken',
                    'soilProfilePhotoLinked'
                ]
            })
        ] as any);

        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const details = featureItem?.details.join('\n') ?? '';

        expect(details).toContain('\uc2dc\ub300: \uccad\ub3d9\uae30');
        expect(details).toContain(
            '\uc870\uc0ac \uc0c1\ud0dc: '
            + '\uc720\uad6c \uc9c4\ud589: \uc870\uc0ac \uc804, '
            + '\uae30\ub85d \uc2dc\uc810: \ucd94\uac00 \uae30\ub85d, '
            + '\uae30\ub85d \uad6c\ubd84: \ud604\uc7a5 \uae30\ub85d \u00b7 \ud574\uc11d, '
            + '\ud655\uc778 \uc0c1\ud0dc: \ud604\uc7a5 \ud655\uc778, '
            + '\uc870\uc0ac \ub2e8\uacc4 \ud655\uc778: '
            + '\uc870\uc0ac \uc804 \uc0ac\uc9c4 \u00b7 \ud1a0\uce35\uc0ac\uc9c4 \u00b7 \uc720\ubb3c \uc218\uc2b5'
        );
        expect(featureItem?.copyText).toContain('\uc2dc\ub300: \uccad\ub3d9\uae30');
        expect(featureItem?.copyText).toContain(
            '\uc870\uc0ac \ub2e8\uacc4 \ud655\uc778: '
            + '\uc870\uc0ac \uc804 \uc0ac\uc9c4 \u00b7 \ud1a0\uce35\uc0ac\uc9c4 \u00b7 \uc720\ubb3c \uc218\uc2b5'
        );
        expect(featureItem?.copyText).toContain('\uae30\ub85d \uc2dc\uc810: \ucd94\uac00 \uae30\ub85d');
        expect(featureItem?.copyText).toContain('\uae30\ub85d \uad6c\ubd84: \ud604\uc7a5 \uae30\ub85d \u00b7 \ud574\uc11d');
        expect(featureItem?.copyText).toContain('\ud655\uc778 \uc0c1\ud0dc: \ud604\uc7a5 \ud655\uc778');
        expect(featureItem?.copyText).not.toContain('duringFieldwork');
        expect(featureItem?.copyText).not.toContain('immediateRecording');
        expect(featureItem?.copyText).not.toContain('observedInField');
        expect(featureItem?.copyText).not.toContain('bronzeAge');
        expect(featureItem?.copyText).not.toContain('preInvestigationPhotoTaken');
        expect(featureItem?.copyText).not.toContain('soilProfilePhotoLinked');
        expect(featureItem?.copyText).not.toContain('findsRecovered');
    });


    it('summarizes feature location sketches without dumping tablet sketch JSON into HWP copy blocks', () => {

        const handoff = makeKoreanFieldworkReportHandoff([
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                geometrySource: 'gpsApproximate',
                geometryConfidence: 'rough',
                featureGeometryEditStatus: 'roughSketch',
                featureLocationSketch: '{"shape":"oval","center":{"x":75,"y":50},"scale":80}',
                featureFreeDrawingStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":40,"y":50}]}]}',
                surveyBoundaryAccuracy: 'importedReference',
                surveyBoundarySource: 'shpImport',
                featureRecordingStatus: 'candidate',
                featureInvestigationChecklist: []
            })
        ] as any);

        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');

        expect(featureItem?.summary)
            .toBe('\uc704\uce58 \uc57d\ub3c4: \uc788\uc74c');
        expect(featureItem?.details.join('\n'))
            .toContain(
                '\uc704\uce58/\ub3c4\uba74: GPS \ub300\ub7b5 \uc704\uce58, '
                + '\ub300\ub7b5, \ub300\ub7b5 \uc2a4\ucf00\uce58, '
                + '\uac00\uc838\uc628 \ucc38\uace0\uc790\ub8cc, SHP \uac00\uc838\uc624\uae30, '
                + '\uc704\uce58 \uc57d\ub3c4: \uc788\uc74c, \uc790\uc720 \uc2a4\ucf00\uce58: \uc788\uc74c'
            );
        expect(featureItem?.copyText)
            .toContain('\uc694\uc57d: \uc704\uce58 \uc57d\ub3c4: \uc788\uc74c');
        expect(featureItem?.copyText)
            .toContain('\uc790\uc720 \uc2a4\ucf00\uce58: \uc788\uc74c');
        expect(featureItem?.copyText)
            .toContain('GPS \ub300\ub7b5 \uc704\uce58');
        expect(featureItem?.copyText)
            .toContain('SHP \uac00\uc838\uc624\uae30');
        expect(featureItem?.copyText)
            .not.toContain('gpsApproximate');
        expect(featureItem?.copyText)
            .not.toContain('roughSketch');
        expect(featureItem?.copyText)
            .not.toContain('importedReference');
        expect(featureItem?.copyText)
            .not.toContain('shpImport');
        expect(featureItem?.copyText)
            .not.toContain('"shape"');
        expect(featureItem?.copyText)
            .not.toContain('"strokes"');
    });


    it('carries selected-record tablet field notes into HWP copy blocks without dumping handwriting JSON', () => {

        const handoff = makeKoreanFieldworkReportHandoff([
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                fieldNote: [
                    '[\uad00\ucc30 \ub0b4\uc6a9] \ubc14\ub2e5\uba74\uc5d0\uc11c \uc6d0\ud615 \uc724\uacfd \ud655\uc778.',
                    '[\ud574\uc11d] \uc8fc\uacf5 \uac00\ub2a5\uc131.',
                    '[\ub2e4\uc74c \uc791\uc5c5] \ub2e8\uba74 \uc0ac\uc9c4 \ubcf4\uac15.',
                    '[\uadfc\uac70 \ubc88\ud638] \uc0ac\uc9c4 12, \ub3c4\uba74 3',
                    '[\uc190\uadf8\ub9bc \uba54\ubaa8] 1\ud68d 2\uc810',
                    '[\uc190\uadf8\ub9bc \uc88c\ud45c] {"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":40,"y":50}]}]}'
                ].join('\n'),
                interpretation: '\uc8fc\uacf5 \uac00\ub2a5\uc131.',
                featureRecordingStatus: 'candidate',
                featureInvestigationChecklist: []
            })
        ] as any);

        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const details = featureItem?.details.join('\n') ?? '';

        expect(featureItem?.summary)
            .toBe('\uad00\ucc30: \ubc14\ub2e5\uba74\uc5d0\uc11c \uc6d0\ud615 \uc724\uacfd \ud655\uc778.');
        expect(details)
            .toContain('\ud604\uc7a5\uba54\ubaa8: \uad00\ucc30: \ubc14\ub2e5\uba74\uc5d0\uc11c \uc6d0\ud615 \uc724\uacfd \ud655\uc778.');
        expect(details)
            .toContain('\ud574\uc11d: \uc8fc\uacf5 \uac00\ub2a5\uc131.');
        expect(details)
            .toContain('\ub2e4\uc74c \uc791\uc5c5: \ub2e8\uba74 \uc0ac\uc9c4 \ubcf4\uac15.');
        expect(details)
            .toContain('\uadfc\uac70 \ubc88\ud638: \uc0ac\uc9c4 12, \ub3c4\uba74 3');
        expect(details)
            .toContain('\uc190\uadf8\ub9bc \uba54\ubaa8: 1\ud68d 2\uc810');
        expect(featureItem?.copyText)
            .toContain('\ub2e4\uc74c \uc791\uc5c5: \ub2e8\uba74 \uc0ac\uc9c4 \ubcf4\uac15.');
        expect(featureItem?.copyText)
            .not.toContain('\uc190\uadf8\ub9bc \uc88c\ud45c');
        expect(featureItem?.copyText)
            .not.toContain('"strokes"');
    });


    it('carries tablet daily log journal fields into HWP copy blocks without dumping boundary JSON', () => {

        const handoff = makeKoreanFieldworkReportHandoff([
            makeDocument('daily-log-1', 'DailyLog', {
                identifier: '2026-06-30',
                date: '2026-06-30',
                dailyLogInvestigatorCount: 2,
                dailyLogLaborerCount: 4,
                dailyLogWorkerCount: 6,
                dailyLogEquipmentCount: 1,
                dailyLogEquipmentSize: '0.6m3',
                dailyLogSafetyEducationPhoto: true,
                dailyLogSafetyEducationStretching: false,
                dailyLogContent: JSON.stringify([
                    'strippingProgress',
                    'workArea',
                    'photoDrawingNumbers'
                ]),
                dailyLogEvidenceRole: ['sameDayFactRecord'],
                dailyLogReview: ['sameDayWritten', 'reviewerChecked'],
                dailyLogBoundaryMemoImportedAt: '2026-06-30T08:30:00.000Z',
                dailyLogBoundaryMemoUpdatedAt: '2026-06-30T09:15:00.000Z',
                dailyLogWorkMemoUpdatedAt: '2026-06-30T10:15:00.000Z',
                dailyLogBoundaryMemoStrokes:
                    '{"version":1,"strokes":[{"points":[{"x":1200,"y":2200},{"x":3200,"y":4200}]}]}'
            })
        ] as any);

        const dailyLogItem = handoff.items.find(item => item.documentId === 'daily-log-1');
        const detailText = dailyLogItem?.details.join('\n') ?? '';

        expect(dailyLogItem?.summary)
            .toBe('\uc77c\uc9c0 \ub0b4\uc6a9: \ud45c\ud1a0 \uc9c4\ud589 \u00b7 \uc791\uc5c5\uad6c\uc5ed \u00b7 \uc0ac\uc9c4\u00b7\ub3c4\uba74 \ubc88\ud638');
        expect(detailText)
            .toContain('\uc791\uc5c5\uc77c\uc9c0: \uc778\uc6d0: \uc870\uc0ac\uc6d0 2\uba85 / \uc778\ubd80 4\uba85 / \ud22c\uc785 6\uba85');
        expect(detailText)
            .toContain('\uc7a5\ube44: 1\ub300 / 0.6m3');
        expect(detailText)
            .toContain('\uc548\uc804\uad50\uc721: \uc0ac\uc9c4 \uc644\ub8cc / \uccb4\uc870 \ubbf8\ud655\uc778');
        expect(detailText)
            .toContain('\uadfc\uac70: \ub2f9\uc77c \uc0ac\uc2e4\uae30\ub85d');
        expect(detailText)
            .toContain('\uac80\ud1a0: \ub2f9\uc77c \uc791\uc131 \u00b7 \uac80\ud1a0\uc790 \ud655\uc778');
        expect(detailText)
            .toContain('\uc791\uc5c5\uc77c\uc9c0 \uacbd\uacc4 \uba54\ubaa8: \uc788\uc74c');
        expect(detailText)
            .toContain('\uacbd\uacc4 \uac00\uc838\uc634: 2026-06-30');
        expect(detailText)
            .toContain('\uacbd\uacc4 \uc218\uc815: 2026-06-30');
        expect(detailText)
            .toContain('\uc791\uc5c5\uc77c\uc9c0 \uc218\uc815: 2026-06-30');
        expect(dailyLogItem?.copyText)
            .toContain('\uc791\uc5c5\uc77c\uc9c0 \uacbd\uacc4 \uba54\ubaa8: \uc788\uc74c');
        expect(dailyLogItem?.copyText)
            .not.toContain('strippingProgress');
        expect(dailyLogItem?.copyText)
            .not.toContain('"strokes"');
    });


    it('carries soil profile color sample locations into HWP copy blocks', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilProfilePhotoUri: 'file:///tablet/photos/soil-photo-1.jpg',
                soilProfilePhotoAnnotationStrokes: '{"version":1,"strokes":[{"points":[{"x":20,"y":30}]}]}',
                soilProfileAnnotationStrokes: '{"version":1,"strokes":[{"points":[{"x":15,"y":40},{"x":70,"y":45}]}]}',
                soilProfileLayerMarkers: '[{"x":20,"y":50,"label":"1"}]',
                soilProfileColorSwatches: '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
                soilColorAssistCandidates: [
                    '\uc0ac\uc9c4 \uc120\ud0dd \uc9c0\uc810 20%/50% \ud3c9\uade0 RGB 111/87/61',
                    '1: 10YR 4/3 (\ubcf4\ud1b5, \ucc28\uc774 0.0)'
                ].join('\n'),
                soilProfileColorNote: 'dark fill sample from lower layer',
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const evidenceDetails = featureItem?.evidenceDetails.join('\n') ?? '';

        expect(evidenceDetails)
            .toContain('\uce35\ubcc4 \ud1a0\uc0c9: 1: 10YR 4/3 RGB 111/87/61 @ 20%/50%');
        expect(evidenceDetails)
            .toContain('\uc0ac\uc9c4 \ud45c\uc2dc: \uc788\uc74c');
        expect(evidenceDetails)
            .toContain('\ud1a0\uce35\uc120 \ud45c\uc2dc: \uc788\uc74c');
        expect(evidenceDetails)
            .toContain('\uce35 \ubc88\ud638 \ud45c\uc2dc: \uc788\uc74c');
        expect(evidenceDetails)
            .toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58: 1\uce35: RGB 111/87/61 @ 20%/50%');
        expect(featureItem?.copyText)
            .toContain('RGB 111/87/61 @ 20%/50%');
        expect(featureItem?.copyText)
            .toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58');
        expect(featureItem?.copyText)
            .toContain('\ud1a0\uce35\uc120 \ud45c\uc2dc: \uc788\uc74c');
        expect(featureItem?.copyText)
            .not.toContain('"strokes"');
        expect(featureItem?.copyText).not.toMatch(/(^|[^\r])\n/);
    });


    it('recovers soil profile eyedropper locations from layer swatches when assist text is missing', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilProfilePhotoUri: 'file:///tablet/photos/soil-photo-1.jpg',
                soilProfileColorSwatches: [
                    '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
                    '2: 2.5Y 5/3 RGB 139/128/88 @ 80%/50%'
                ].join('\n'),
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const evidenceDetails = featureItem?.evidenceDetails.join('\n') ?? '';

        expect(evidenceDetails)
            .toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58: 1\uce35: RGB 111/87/61 @ 20%/50%, 2\uce35: RGB 139/128/88 @ 80%/50%');
        expect(featureItem?.copyText)
            .toContain('2\uce35: RGB 139/128/88 @ 80%/50%');
    });


    it('prefers accepted layer color sample locations over the last tablet candidate in HWP copy blocks', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilProfilePhotoUri: 'file:///tablet/photos/soil-photo-1.jpg',
                soilProfileColorSwatches: [
                    '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
                    '2: 2.5Y 5/3 RGB 139/128/88 @ 80%/45%'
                ].join('\n'),
                soilColorAssistCandidates: [
                    '\uc0ac\uc9c4 \uc120\ud0dd \uc9c0\uc810 80%/45% \ud3c9\uade0 RGB 139/128/88',
                    '1: 2.5Y 5/3 (\ub192\uc74c, \ucc28\uc774 0.0)'
                ].join('\n'),
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const evidenceDetails = featureItem?.evidenceDetails.join('\n') ?? '';

        expect(evidenceDetails)
            .toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58: 1\uce35: RGB 111/87/61 @ 20%/50%, 2\uce35: RGB 139/128/88 @ 80%/45%');
        expect(featureItem?.copyText)
            .toContain('1\uce35: RGB 111/87/61 @ 20%/50%');
        expect(featureItem?.copyText)
            .toContain('2\uce35: RGB 139/128/88 @ 80%/45%');
        expect(evidenceDetails)
            .not.toContain('\uc0ac\uc9c4 \uc120\ud0dd \uc9c0\uc810 80%/45% \ud3c9\uade0 RGB 139/128/88');
    });


    it('normalizes HWP copy text as plain Windows clipboard text', () => {

        expect(normalizeKoreanFieldworkHwpPlainText('  [유구] 1호 수혈  \n\n\n요약: 값\u200B\n'))
            .toBe('[유구] 1호 수혈\r\n\r\n요약: 값');
    });


    it('strips browser and rich-text clipboard residue from HWP copy text', () => {

        expect(normalizeKoreanFieldworkHwpPlainText([
            '\u202A[Feature]\tpit-001\u202C',
            'Summary:\u00a0dark\u00ad fill\u0007',
            '',
            '',
            '',
            '\u200BDetails:\t\tsoil layer'
        ].join('\r\n'))).toBe([
            '[Feature] pit-001',
            'Summary: dark fill',
            '',
            'Details: soil layer'
        ].join('\r\n'));
    });


    it('carries tablet closeout review issues into desktop HWP copy blocks', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'candidate'
            }),
            makeDocument('photo-annotated', 'Photo', {
                originalFilename: 'photo-annotated.jpg',
                fieldworkPhotoCapturedAt: '2026-06-23T01:02:03.000Z',
                width: 4032,
                height: 3024,
                fieldworkPhotoAnnotationStrokes: '{"version":1,"strokes":[{"points":[{"x":1,"y":2}]}]}',
                relations: { depicts: ['feature-1'] }
            }),
            makeDocument('memo-auto', 'PenMemo', {
                penMemoAutoTranscript: 'possible ash lens near base',
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const issueDetails = featureItem?.issueDetails.join('\n') ?? '';

        expect(issueDetails).toContain('사진 위 표시가 보고서용 설명으로 정리되지 않았습니다');
        expect(issueDetails).toContain('자동 필사된 현장메모가 아직 검토되지 않았습니다');
        expect(featureItem?.copyText).toContain('\ud655\uc778 \uc0c1\uc138');
        expect(featureItem?.copyText).toContain('\uc0ac\uc9c4 \ud45c\uc2dc: \uc788\uc74c');
        expect(featureItem?.copyText).toContain('\uc6d0\ubcf8 \ud30c\uc77c: photo-annotated.jpg');
        expect(featureItem?.copyText).toContain('\ucd2c\uc601: 2026-06-23 01:02');
        expect(featureItem?.copyText).toContain('\ud06c\uae30: 4032x3024');
        expect(featureItem?.copyText).toContain('사진 위 표시가 보고서용 설명으로 정리되지 않았습니다');
        expect(featureItem?.copyText).toContain('자동 필사된 현장메모가 아직 검토되지 않았습니다');
        expect(featureItem?.copyText).not.toContain('fieldwork-photo-annotation-review');
        expect(featureItem?.copyText).not.toContain('pen-memo-auto-transcript-review');
        expect(featureItem?.copyText).not.toContain('"strokes"');
    });


    it('carries tablet photo report metadata into HWP copy blocks', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            }),
            makeDocument('photo-1', 'Photo', {
                fieldworkPhotoUri: 'file:///tablet/photos/pit-001.jpg',
                originalFilename: 'pit-001.jpg',
                fieldworkPhotoCapturedAt: '2026-06-23T01:02:03.000Z',
                width: 4032,
                height: 3024,
                relations: { depicts: ['feature-1'] }
            }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilProfilePhotoUri: 'file:///tablet/photos/soil-profile-1.jpg',
                originalFilename: 'soil-profile-1.jpg',
                soilProfilePhotoCapturedAt: '2026-06-23T02:03:04.000Z',
                width: 3000,
                height: 2000,
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const evidenceDetails = featureItem?.evidenceDetails.join('\n') ?? '';

        expect(evidenceDetails).toContain('\uc6d0\ubcf8 \ud30c\uc77c: pit-001.jpg');
        expect(evidenceDetails).toContain('\ucd2c\uc601: 2026-06-23 01:02');
        expect(evidenceDetails).toContain('\ud06c\uae30: 4032x3024');
        expect(evidenceDetails).toContain('\uc6d0\ubcf8 \ud30c\uc77c: soil-profile-1.jpg');
        expect(evidenceDetails).toContain('\ucd2c\uc601: 2026-06-23 02:03');
        expect(evidenceDetails).toContain('\ud06c\uae30: 3000x2000');
        expect(featureItem?.copyText).toContain('\uc6d0\ubcf8 \ud30c\uc77c: pit-001.jpg');
        expect(featureItem?.copyText).toContain('\uc6d0\ubcf8 \ud30c\uc77c: soil-profile-1.jpg');
    });


    it('uses tablet media metadata as direct HWP copy summaries', () => {

        const documents = [
            makeDocument('photo-1', 'Photo', {
                fieldworkPhotoCaption: 'pit before cleaning',
                fieldworkPhotoUri: 'file:///tablet/photos/pit-before.jpg',
                originalFilename: 'pit-before.jpg',
                fieldworkPhotoCapturedAt: '2026-06-23T01:02:03.000Z',
                width: 4032,
                height: 3024
            }),
            makeDocument('soil-photo-1', 'SoilProfilePhoto', {
                soilProfilePhotoUri: 'file:///tablet/photos/profile.jpg',
                originalFilename: 'profile.jpg',
                soilProfilePhotoCapturedAt: '2026-06-23T02:03:04.000Z',
                width: 3000,
                height: 2000,
                soilProfileColorSwatches: '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%'
            }),
            makeDocument('drawing-1', 'Drawing', {
                fileUri: 'file:///tablet/drawings/pit-plan.png',
                drawingSketchStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":50,"y":60}]}]}'
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const photoItem = handoff.items.find(item => item.documentId === 'photo-1');
        const soilPhotoItem = handoff.items.find(item => item.documentId === 'soil-photo-1');
        const drawingItem = handoff.items.find(item => item.documentId === 'drawing-1');

        expect(photoItem?.summary).toContain('\uc124\uba85: pit before cleaning');
        expect(photoItem?.summary).toContain('\uc6d0\ubcf8 \ud30c\uc77c: pit-before.jpg');
        expect(photoItem?.copyText).toContain('\ucd2c\uc601: 2026-06-23 01:02');
        expect(photoItem?.copyText).toContain('\ud06c\uae30: 4032x3024');
        expect(soilPhotoItem?.summary).toContain('\uc6d0\ubcf8 \ud30c\uc77c: profile.jpg');
        expect(soilPhotoItem?.copyText).toContain('\uce35\ubcc4 \ud1a0\uc0c9: 1: 10YR 4/3 RGB 111/87/61 @ 20%/50%');
        expect(soilPhotoItem?.copyText).toContain('\uc2a4\ud3ec\uc774\ub4dc \uc704\uce58: 1\uce35: RGB 111/87/61 @ 20%/50%');
        expect(drawingItem?.summary).toContain('\uc6d0\ubcf8: file:///tablet/drawings/pit-plan.png');
        expect(drawingItem?.copyText).toContain('\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58: \uc788\uc74c');
        expect(drawingItem?.copyText).not.toContain('"strokes"');
    });


    it('summarizes tablet drawing sketches without dumping stroke JSON into HWP copy blocks', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            }),
            makeDocument('drawing-1', 'Drawing', {
                drawingSketchStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":50,"y":60}]}]}',
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const evidenceDetails = featureItem?.evidenceDetails.join('\n') ?? '';

        expect(evidenceDetails)
            .toContain('\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58: \uc788\uc74c');
        expect(featureItem?.copyText)
            .toContain('\ud0dc\ube14\ub9bf \uc2a4\ucf00\uce58: \uc788\uc74c');
        expect(featureItem?.copyText)
            .not.toContain('"strokes"');
    });


    it('summarizes handwritten tablet pen memos without dumping stroke JSON into HWP copy blocks', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'confirmed',
                featureInvestigationChecklist: []
            }),
            makeDocument('memo-handwritten', 'PenMemo', {
                penMemoStrokes: '{"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":30,"y":40}]}]}',
                penMemoTranscriptionStatus: 'pending',
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const evidenceDetails = featureItem?.evidenceDetails.join('\n') ?? '';

        expect(evidenceDetails)
            .toContain('\ud544\uae30 \uc6d0\ubcf8: \uc788\uc74c');
        expect(featureItem?.copyText)
            .toContain('\ud544\uae30 \uc6d0\ubcf8: \uc788\uc74c');
        expect(featureItem?.copyText)
            .toContain('\ud0dc\ube14\ub9bf \ud544\uae30 \ud604\uc7a5\uba54\ubaa8');
        expect(featureItem?.copyText)
            .not.toContain('pen-memo-handwriting-transcription');
        expect(featureItem?.copyText)
            .not.toContain('"strokes"');
    });


    it('carries linked record labels into desktop HWP copy blocks', () => {

        const documents = [
            makeDocument('operation-1', 'Operation', {
                identifier: 'op-001',
                shortDescription: 'north area excavation'
            }),
            makeDocument('trench-1', 'Trench', {
                identifier: 'trench-001',
                shortDescription: 'north trench',
                relations: { isRecordedIn: ['operation-1'] }
            }),
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill',
                featureRecordingStatus: 'candidate',
                relations: { liesWithin: ['trench-1'], isRecordedIn: ['operation-1'] }
            }),
            makeDocument('photo-1', 'Photo', {
                fieldworkPhotoUri: 'file:///tablet/photos/pit-001.jpg',
                relations: { depicts: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const photoItem = handoff.items.find(item => item.documentId === 'photo-1');

        expect(featureItem?.relationDetails).toEqual([
            '\uc0c1\uc704 \uae30\ub85d: [\ud2b8\ub80c\uce58] trench-001',
            '\uc870\uc0ac \uae30\ub85d: [\uc870\uc0ac \uad6c\uc5ed \uae30\ub85d] op-001'
        ]);
        expect(photoItem?.relationDetails).toEqual([
            '\ub300\uc0c1: [\uc720\uad6c] pit-001'
        ]);
        expect(featureItem?.copyText).toContain('\uc5f0\uacb0: \uc0c1\uc704 \uae30\ub85d: [\ud2b8\ub80c\uce58] trench-001');
        expect(featureItem?.copyText).toContain('\uc870\uc0ac \uae30\ub85d: [\uc870\uc0ac \uad6c\uc5ed \uae30\ub85d] op-001');
        expect(photoItem?.copyText).toContain('\uc5f0\uacb0: \ub300\uc0c1: [\uc720\uad6c] pit-001');
    });


    it('keeps direct tablet media records copyable even before upload metadata is complete', () => {

        const documents = [
            makeDocument('find-1', 'Find', {
                identifier: 'find-001',
                shortDescription: 'rim sherd near floor',
                fieldworkPhotoUri: 'content://tablet/photos/find-001.jpg'
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);

        expect(handoff.items.length).toBe(1);
        expect(handoff.items[0]).toEqual(jasmine.objectContaining({
            documentId: 'find-1',
            identifier: 'find-001',
            summary: 'rim sherd near floor',
            evidenceCount: 1,
            tone: 'review'
        }));
        expect(handoff.items[0].evidenceLabel).toContain('\uc0ac\uc9c4 1');
        expect(handoff.items[0].copyText).toContain('[\uc720\ubb3c] find-001');
        expect(handoff.items[0].copyText).toContain('content://tablet/photos/find-001.jpg');
    });


    it('carries tablet find and sample collection notes into HWP copy blocks with shared Korean labels', () => {

        const documents = [
            makeDocument('feature-1', 'Feature', {
                identifier: 'pit-001',
                shortDescription: 'round pit with dark fill'
            }),
            makeDocument('find-1', 'Find', {
                identifier: 'find-001',
                findSpotDescription: 'pit floor, east edge',
                findSampleResearchScope: ['reportIncludedArtifact', 'collectionStatusRecorded'],
                artifactHandlingWorkflow: ['fieldCollection'],
                artifactLabelRegisterLink: ['labelCreated', 'fieldSerialNumber'],
                surfaceFindHandlingRecord: ['gpsLatLongRecorded'],
                chanceFindProvenance: ['residentReport'],
                tileKilnFindContext: ['productTile'],
                relations: { isPresentIn: ['feature-1'] }
            }),
            makeDocument('sample-1', 'Sample', {
                identifier: 'sample-001',
                sampleType: 'charcoal',
                samplePurpose: ['absoluteDating'],
                findSampleResearchScope: ['charcoal', 'scienceAnalysisCandidate'],
                sampleCollectionHandling: ['lightShielded'],
                ironSampleAnalysisPlan: ['magnetReaction'],
                archaeomagneticSampleContext: ['hearth'],
                organicSoilAnalysisSample: ['interiorSoil'],
                archaeobotanySampleDesign: ['amsCandidate'],
                flotationProcessingRecord: ['flotation'],
                relations: { isPresentIn: ['feature-1'] }
            })
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);
        const featureItem = handoff.items.find(item => item.documentId === 'feature-1');
        const findItem = handoff.items.find(item => item.documentId === 'find-1');
        const sampleItem = handoff.items.find(item => item.documentId === 'sample-1');
        const evidenceDetails = featureItem?.evidenceDetails.join('\n') ?? '';

        expect(featureItem?.evidenceLabel).toContain('\uc720\ubb3c 1');
        expect(featureItem?.evidenceLabel).toContain('\uc2dc\ub8cc 1');
        expect(evidenceDetails).toContain('\uc720\ubb3c find-001');
        expect(evidenceDetails).toContain('\ucd9c\ud1a0 \uc704\uce58: pit floor, east edge');
        expect(evidenceDetails).toContain('\uc720\ubb3c\u00b7\uc2dc\ub8cc \uc5f0\uad6c\ubc94\uc704: \ubcf4\uace0\uc11c \uc218\ub85d \uc720\ubb3c');
        expect(evidenceDetails).toContain('\uc720\ubb3c \uad00\ub9ac \uc808\ucc28: \ud604\uc7a5\uc218\uc2b5');
        expect(evidenceDetails).toContain('\uc720\ubb3c \uaf2c\ub9ac\ud45c\u00b7\ub300\uc7a5 \uc5f0\uacb0: \uaf2c\ub9ac\ud45c \uc791\uc131');
        expect(evidenceDetails).toContain('\uc9c0\ud45c \uc218\uc2b5\uc720\ubb3c \uad00\ub9ac: GPS \uc704\uacbd\ub3c4 \uae30\ub85d');
        expect(evidenceDetails).toContain('\uc6b0\uc5f0\u00b7\uc2e0\uace0 \uc720\ubb3c \ucd9c\ucc98: \uc8fc\ubbfc \uc2e0\uace0');
        expect(evidenceDetails).toContain('\uae30\uc640\uac00\ub9c8 \ucd9c\ud1a0\ud488 \uc131\uaca9: \uc0dd\uc0b0\ud488');
        expect(evidenceDetails).toContain('\uc2dc\ub8cc sample-001');
        expect(evidenceDetails).toContain('\uc2dc\ub8cc \uc885\ub958: charcoal');
        expect(evidenceDetails).toContain('\uc2dc\ub8cc \ubaa9\uc801: \uc808\ub300\uc5f0\ub300');
        expect(evidenceDetails).toContain('\uc2dc\ub8cc \ucc44\ucde8\u00b7\ubcf4\uad00: \ube5b \ucc28\ub2e8');
        expect(evidenceDetails).toContain('\uc81c\ucca0 \uc2dc\ub8cc \ubd84\uc11d\uacc4\ud68d: \uc790\uc11d\ubc18\uc751');
        expect(evidenceDetails).toContain('\uace0\uace0\uc9c0\uc790\uae30 \uc2dc\ub8cc \ub9e5\ub77d: \ub178\uc9c0');
        expect(evidenceDetails).toContain('\uc720\uae30\ubb3c\u00b7\ud1a0\uc591 \ubd84\uc11d\uc2dc\ub8cc: \ub0b4\ubd80\ud1a0');
        expect(evidenceDetails).toContain('\uc2dd\ubb3c\uace0\uace0\ud559 \uc2dc\ub8cc \uc124\uacc4: AMS \ud6c4\ubcf4');
        expect(evidenceDetails).toContain('\ud50c\ub85c\ud14c\uc774\uc158 \ucc98\ub9ac\uae30\ub85d: \ud50c\ub85c\ud14c\uc774\uc158');
        expect(featureItem?.copyText).toContain('\uc720\ubb3c find-001');
        expect(featureItem?.copyText).toContain('\uc2dc\ub8cc sample-001');
        expect(findItem?.summary).toContain('pit floor, east edge');
        expect(sampleItem?.summary).toContain('\uc808\ub300\uc5f0\ub300');
        expect(featureItem?.copyText).not.toContain('reportIncludedArtifact');
        expect(featureItem?.copyText).not.toContain('absoluteDating');
        expect(featureItem?.copyText).not.toContain('fieldCollection');
    });


    it('orders investigation records before evidence records', () => {

        const documents = [
            makeDocument('photo-1', 'Photo'),
            makeDocument('feature-1', 'Feature'),
            makeDocument('trench-1', 'Trench'),
            makeDocument('layer-1', 'Layer')
        ];

        const handoff = makeKoreanFieldworkReportHandoff(documents as any);

        expect(handoff.items.map(item => item.documentId)).toEqual([
            'trench-1',
            'feature-1',
            'layer-1',
            'photo-1'
        ]);
    });


    it('validates a tablet draft before saving it for desktop report handoff', () => {

        const validation = validateKoreanFieldworkReportHandoffCandidate({
            identifier: 'pit-001',
            category: 'Feature',
            relations: { liesWithin: ['trench-1'], isRecordedIn: ['operation-1'] },
            shortDescription: 'round pit with dark fill',
            featureRecordingStatus: 'candidate'
        } as any, [
            makeDocument('trench-1', 'Trench')
        ] as any);

        expect(validation).toEqual(jasmine.objectContaining({
            status: 'ready',
            category: 'Feature',
            categoryLabel: '\uc720\uad6c',
            identifier: 'pit-001',
            isReportHandoffCategory: true,
            isCopyable: true,
            issueCount: 0
        }));
        expect(validation.message).toContain('\ub370\uc2a4\ud06c\ud1b1 HWP \ubcf4\uace0\uc11c \ud0ed \uc804\ub2ec \ud655\uc778');
        expect(validation.copyText).toContain('[\uc720\uad6c] pit-001');
    });


    it('reports pre-save handoff gaps that would weaken HWP copy blocks', () => {

        const validation = validateKoreanFieldworkReportHandoffCandidate({
            identifier: 'photo-001',
            category: 'Photo',
            relations: {}
        } as any);

        expect(validation.status).toBe('review');
        expect(validation.isCopyable).toBe(true);
        expect(validation.messages.length).toBeGreaterThan(1);
        expect(validation.messages.join('\n')).toContain('HWP');
        expect(validation.messages.join('\n')).toContain('\uc0ac\uc9c4/\ub3c4\uba74');
        expect(validation.relatedFields).toContain('fieldworkPhotoUri');
        expect(validation.relatedFields).toContain('relations');
    });


    it('adds concrete tablet save warnings for desktop HWP handoff gaps', () => {

        const validation = validateKoreanFieldworkReportHandoffCandidate({
            identifier: 'photo-001',
            category: 'Photo',
            relations: {}
        } as any);
        const message = getKoreanFieldworkReportHandoffSaveMessage(
            'photo-001 saved.',
            validation
        );

        expect(message).toContain('photo-001 saved.');
        expect(message).toContain(validation.message);
        expect(message).toContain('\ubcf4\uc644 \ud56d\ubaa9:');
        expect(message).toContain('HWP \ubcf5\uc0ac \ubb38\uc7a5');
        expect(message).toContain('\uc0c1\uc704 \uc870\uc0ac\uad6c\uc5ed');
        expect(message).toContain('\uc678 1\uac74 \ub354 \ud655\uc778');
    });


    it('keeps tablet save messages quiet when a record is not part of HWP handoff', () => {

        const validation = validateKoreanFieldworkReportHandoffCandidate({
            identifier: 'term-001',
            category: 'TermAuthority',
            relations: {}
        } as any);

        expect(getKoreanFieldworkReportHandoffSaveMessage('term saved.', validation))
            .toBe('term saved.');
        expect(getKoreanFieldworkReportHandoffValidationDetailMessage(validation))
            .toBeUndefined();
    });


    it('does not treat empty tablet handwriting stroke containers as PenMemo content', () => {

        const validation = validateKoreanFieldworkReportHandoffCandidate({
            identifier: 'memo-001',
            category: 'PenMemo',
            relations: { depicts: ['feature-1'] },
            penMemoStrokes: '{"version":1,"strokes":[]}',
            penMemoTranscriptionStatus: 'pending'
        } as any);

        expect(validation.status).toBe('review');
        expect(validation.messages.join('\n'))
            .toContain('\ud604\uc7a5\uba54\ubaa8 \ub0b4\uc6a9\uc774\ub098 \ud544\uae30 \uc2a4\ud2b8\ub85c\ud06c\uac00 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.');
        expect(validation.relatedFields).toContain('penMemoStrokes');
    });


    it('ignores records that are not part of the desktop report handoff contract', () => {

        const validation = validateKoreanFieldworkReportHandoffCandidate({
            identifier: 'term-001',
            category: 'TermAuthority',
            relations: {}
        } as any);

        expect(validation).toEqual(jasmine.objectContaining({
            status: 'not-applicable',
            isReportHandoffCategory: false,
            isCopyable: false,
            evidenceCount: 0,
            issueCount: 0
        }));
    });
});


function makeDocument(id: string, category: string, resource: any = {}) {

    const { relations, ...properties } = resource;

    return {
        _id: id,
        resource: {
            id,
            identifier: id,
            category,
            relations: relations ?? {},
            ...properties
        },
        created: {},
        modified: []
    };
}
