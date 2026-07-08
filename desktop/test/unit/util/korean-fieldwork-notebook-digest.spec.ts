import {
    extractKoreanFieldworkFieldNoteInput,
    getKoreanFieldworkNotebookEntries,
    getKoreanFieldworkNotebookContinuationSeed,
    getKoreanFieldworkNotebookEntriesForDocument,
    makeKoreanFieldworkDailyNotebookDigest,
    makeKoreanFieldworkNotebookEntryCopyText
} from '../../../src/app/util/korean-fieldwork-notebook-digest';


describe('korean-fieldwork-notebook-digest', () => {

    const today = new Date('2026-06-24T10:00:00');


    it('builds today digest entries from reviewed PenMemo records', () => {

        const feature = createDoc('feature-1', 'Feature', 'F-1');
        const memo = createDoc('memo-1', 'PenMemo', 'M-1', {
            date: '2026-06-24',
            penMemoReviewedTranscript: [
                '[관찰 내용] 북쪽 경계에서 소토와 재층 확인.',
                '[다음 작업] 사진 보강 후 단면 정리.'
            ].join('\n'),
            relations: { depicts: ['feature-1'] }
        });

        const digest = makeKoreanFieldworkDailyNotebookDigest([feature, memo] as any, today);

        expect(digest.dateLabel).toBe('2026-06-24');
        expect(digest.entries).toHaveLength(1);
        expect(digest.nextWorkEntries[0].targetLabel).toBe('F-1');
        expect(digest.nextWorkEntries[0].targetCategoryLabel).toBe('유구');
        expect(digest.nextWorkEntries[0].nextWork).toBe('사진 보강 후 단면 정리.');
        expect(digest.evidenceMissingEntries).toHaveLength(1);
    });


    it('labels legacy FeatureGroup note targets as related features', () => {

        const featureGroup = createDoc('feature-group-1', 'FeatureGroup', '수혈군 A');
        const memo = createDoc('memo-1', 'PenMemo', 'M-1', {
            date: '2026-06-24',
            penMemoReviewedTranscript: '[관찰 내용] 관련 유구 범위 확인.',
            relations: { depicts: ['feature-group-1'] }
        });

        const [entry] = getKoreanFieldworkNotebookEntries([featureGroup, memo] as any);

        expect(entry).toMatchObject({
            targetLabel: '수혈군 A',
            targetCategoryLabel: '관련 유구'
        });
    });


    it('uses the Korean fieldwork date for desktop daily notebook digests', () => {

        const previousTimeZone = process.env.TZ;
        process.env.TZ = 'UTC';

        try {
            const feature = createDoc('feature-1', 'Feature', 'F-1');
            const memo = createDoc('memo-1', 'PenMemo', 'M-1', {
                penMemoReviewedTranscript: '[다음 작업] 자정 직후 단면 사진 보강.',
                relations: { depicts: ['feature-1'] }
            });
            const dailyLog = createDoc('daily-log-1', 'DailyLog', '6월 24일 작업일지');
            const justAfterKoreanMidnight = new Date('2026-06-23T15:05:00.000Z');

            memo.created.date = justAfterKoreanMidnight;
            memo.modified = [{ user: 'tester', date: justAfterKoreanMidnight }];
            dailyLog.created.date = justAfterKoreanMidnight;
            dailyLog.modified = [{ user: 'tester', date: justAfterKoreanMidnight }];

            const digest = makeKoreanFieldworkDailyNotebookDigest(
                [feature, memo, dailyLog] as any,
                justAfterKoreanMidnight
            );

            expect(digest.dateLabel).toBe('2026-06-24');
            expect(digest.entries.map(entry => entry.sourceDocument.resource.id)).toEqual(['memo-1']);
            expect(digest.dailyLogDocuments.map(document => document.resource.id)).toEqual(['daily-log-1']);
        } finally {
            restoreTimeZone(previousTimeZone);
        }
    });


    it('creates notebook entries from daily log blocks and resolves target labels', () => {

        const feature = createDoc('feature-1', 'Feature', 'F-1');
        const dailyLog = createDoc('daily-log-1', 'DailyLog', '2026-06-24 일지', {
            date: '2026-06-24',
            description: [
                '09:30 F-1 - [관찰 내용] 장축 방향과 바닥면 확인.',
                '[다음 작업] 단면 정리.',
                '11:00 조사구역 - [사진·도면·스케치·유물·시료 번호] 사진 12'
            ].join('\n')
        });

        const entries = getKoreanFieldworkNotebookEntries([feature, dailyLog] as any);

        expect(entries).toHaveLength(2);
        expect(entries[1].sourceLabel).toBe('일지');
        expect(entries[1].targetLabel).toBe('F-1');
        expect(entries[1].dateLabel).toBe('2026-06-24 09:30');
        expect(entries[1].nextWork).toBe('단면 정리.');
    });


    it('summarizes tablet daily journal personnel, safety, and boundary memo fields', () => {

        const dailyLog = createDoc('daily-log-1', 'DailyLog', '2026-06-24 일지', {
            date: '2026-06-24',
            dailyLogInvestigatorCount: 2,
            dailyLogLaborerCount: 5,
            dailyLogEquipmentCount: 1,
            dailyLogEquipmentSize: '0.6㎥',
            dailyLogSafetyEducationPhoto: true,
            dailyLogSafetyEducationStretching: false,
            dailyLogContent: ['workArea', 'featureProgress', 'photoDrawingNumbers'],
            dailyLogEvidenceRole: ['sameDayFactRecord'],
            dailyLogReview: ['sameDayWritten'],
            dailyLogBoundaryMemoImportedAt: '2026-06-24T08:30:00.000Z',
            dailyLogWorkMemoUpdatedAt: '2026-06-24T10:15:00.000Z',
            dailyLogBoundaryMemoStrokes: JSON.stringify({
                version: 1,
                strokes: [
                    { points: [{ x: 120, y: 220 }, { x: 320, y: 420 }] }
                ]
            })
        });

        const digest = makeKoreanFieldworkDailyNotebookDigest([dailyLog] as any, today);

        expect(digest.dailyJournalSummaries).toEqual([
            expect.objectContaining({
                document: dailyLog,
                documentLabel: '2026-06-24 일지',
                personnelLabel: '투입 7명 (조사원 2명 / 인부 5명)',
                equipmentLabel: '장비 1대/0.6㎥',
                safetyLabel: '안전교육 · 사진 · 체조 미확인',
                contentLabel: '내용 작업구역 · 유구 조사 진행 · 사진·도면 번호',
                evidenceRoleLabel: '근거 당일 사실기록',
                reviewLabel: '검토 당일 작성',
                boundaryMemoLabel: '경계 메모 1획/2점',
                boundaryMemoImportedAtLabel: '경계 가져옴 2026-06-24',
                workMemoUpdatedAtLabel: '작업일지 수정 2026-06-24',
                boundaryMemoPreview: expect.objectContaining({
                    path: expect.stringContaining('M '),
                    viewBox: '0 0 120 72'
                }),
                hasPersonnel: true,
                hasSafetyComplete: false,
                hasBoundaryMemo: true,
                hasLogClassification: true
            })
        ]);
    });


    it('keeps tablet daily journal classification-only logs in desktop summaries', () => {

        const dailyLog = createDoc('daily-log-1', 'DailyLog', '2026-06-24 일지', {
            date: '2026-06-24',
            dailyLogContent: JSON.stringify(['strippingProgress', 'workArea', 'unknownContent']),
            dailyLogEvidenceRole: ['sameDayFactRecord'],
            dailyLogReview: ['sameDayWritten', 'reviewerChecked']
        });

        const digest = makeKoreanFieldworkDailyNotebookDigest([dailyLog] as any, today);

        expect(digest.dailyJournalSummaries).toEqual([
            expect.objectContaining({
                document: dailyLog,
                contentLabel: '내용 제토 진행 · 작업구역 · unknownContent',
                evidenceRoleLabel: '근거 당일 사실기록',
                reviewLabel: '검토 당일 작성 · 검토자 확인',
                hasPersonnel: false,
                hasSafetyComplete: false,
                hasBoundaryMemo: false,
                hasLogClassification: true
            })
        ]);
    });


    it('builds notebook entries from tablet fieldNote saved on selected records', () => {

        const feature = createDoc('feature-1', 'Feature', 'F-1', {
            fieldNote: [
                '[관찰 내용] 바닥면에서 원형 윤곽 확인.',
                '[다음 작업] 사진 보강 후 단면 정리.'
            ].join('\n')
        });

        const entries = getKoreanFieldworkNotebookEntries([feature] as any);
        const digest = makeKoreanFieldworkDailyNotebookDigest([feature] as any, today);

        expect(entries).toEqual([
            expect.objectContaining({
                id: 'feature-1:fieldNote',
                sourceLabel: '기록 메모',
                targetLabel: 'F-1',
                targetCategoryLabel: '유구',
                detail: '바닥면에서 원형 윤곽 확인.',
                nextWork: '사진 보강 후 단면 정리.',
                needsEvidenceNumbers: true
            })
        ]);
        expect(getKoreanFieldworkNotebookEntriesForDocument(
            feature as any,
            [feature] as any
        ).map(entry => entry.id)).toEqual(['feature-1:fieldNote']);
        expect(digest.entries.map(entry => entry.id)).toEqual(['feature-1:fieldNote']);
        expect(digest.nextWorkEntries.map(entry => entry.id)).toEqual(['feature-1:fieldNote']);
    });


    it('keeps tablet fieldNote handwriting metadata out of structured sections', () => {

        const feature = createDoc('feature-1', 'Feature', 'F-1', {
            fieldNote: [
                '[관찰 내용] 바닥면에서 원형 윤곽 확인.',
                '[다음 작업] 사진 보강 후 단면 정리.',
                '[손그림 메모] 총 1획, 점 2개',
                '[손그림 좌표] {"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":40,"y":50}]}]}'
            ].join('\n')
        });

        const [entry] = getKoreanFieldworkNotebookEntries([feature] as any);

        expect(extractKoreanFieldworkFieldNoteInput(feature.resource.fieldNote as string))
            .toMatchObject({
                observation: '바닥면에서 원형 윤곽 확인.',
                nextWork: '사진 보강 후 단면 정리.'
            });
        expect(entry).toMatchObject({
            detail: '바닥면에서 원형 윤곽 확인. · 손그림 메모 1획/2점.',
            nextWork: '사진 보강 후 단면 정리.',
            handwritingStrokeCount: 1,
            handwritingPointCount: 2,
            handwritingSummaryLabel: '손그림 메모 1획/2점.'
        });
        expect(getKoreanFieldworkNotebookContinuationSeed(entry)).toMatchObject({
            input: {
                observation: '바닥면에서 원형 윤곽 확인.\n손그림 메모 1획/2점.'
            }
        });
    });


    it('builds HWP-safe copy text for tablet notebook entries', () => {

        const feature = createDoc('feature-1', 'Feature', 'F-1', {
            fieldNote: [
                '[관찰 내용] 바닥면에서 원형 윤곽 확인.',
                '[해석] 주공 가능성.',
                '[다음 작업] 사진 보강 후 단면 정리.',
                '[손그림 좌표] {"version":1,"strokes":[{"points":[{"x":10,"y":20},{"x":40,"y":50}]}]}'
            ].join('\n')
        });

        const [entry] = getKoreanFieldworkNotebookEntries([feature] as any);

        expect(makeKoreanFieldworkNotebookEntryCopyText(entry)).toBe([
            '[야장] 유구 F-1',
            '[출처] 기록 메모 · 2026-06-24',
            '[관찰 내용] 바닥면에서 원형 윤곽 확인.',
            '[해석] 주공 가능성.',
            '[다음 작업] 사진 보강 후 단면 정리.',
            '[사진·도면·스케치·유물·시료 번호] 확인 필요',
            '[손그림 메모] 손그림 메모 1획/2점.'
        ].join('\n'));
    });


    it('accepts short evidence-number section labels', () => {

        expect(extractKoreanFieldworkFieldNoteInput([
            '[관찰 내용] 바닥면에서 원형 윤곽 확인.',
            '[근거 번호] 사진 12, 도면 3'
        ].join('\n'))).toEqual({
            observation: '바닥면에서 원형 윤곽 확인.',
            interpretation: '',
            nextWork: '',
            evidenceNumbers: '사진 12, 도면 3'
        });

        expect(extractKoreanFieldworkFieldNoteInput([
            '[관찰 내용] 평면 윤곽과 깊이를 확인.',
            '[스케치·약측/근거 번호] 스케치 A, 장축 2.1m, 사진 14'
        ].join('\n'))).toEqual({
            observation: '평면 윤곽과 깊이를 확인.',
            interpretation: '',
            nextWork: '',
            evidenceNumbers: '스케치 A, 장축 2.1m, 사진 14'
        });
    });


    it('does not treat empty field note templates as notebook entries', () => {

        const feature = createDoc('feature-1', 'Feature', 'F-1');
        const templateMemo = createDoc('memo-template', 'PenMemo', 'M-template', {
            date: '2026-06-24',
            description: '[관찰 내용]\n\n[근거 번호]\n\n[다음 작업]',
            relations: { depicts: ['feature-1'] }
        });
        const templateDailyLog = createDoc('daily-log-template', 'DailyLog', '2026-06-24 일지', {
            date: '2026-06-24',
            description: '09:30 F-1 - [관찰 내용]\n[근거 번호]\n[다음 작업]'
        });

        expect(getKoreanFieldworkNotebookEntries([feature, templateMemo, templateDailyLog] as any))
            .toEqual([]);
        expect(getKoreanFieldworkNotebookEntriesForDocument(
            feature as any,
            [feature, templateMemo, templateDailyLog] as any
        )).toEqual([]);
        expect(makeKoreanFieldworkDailyNotebookDigest(
            [feature, templateMemo, templateDailyLog] as any,
            today
        ).entries).toEqual([]);
    });


    it('builds continuation seeds for notebook follow-ups', () => {

        const feature = createDoc('feature-1', 'Feature', 'F-1');
        const memo = createDoc('memo-1', 'PenMemo', 'M-1', {
            date: '2026-06-24',
            penMemoReviewedTranscript: [
                '[관찰 내용] 바닥면 정리 중 원형 윤곽 확인.',
                '[다음 작업] 사진 보강.'
            ].join('\n'),
            relations: { depicts: ['feature-1'] }
        });

        const [entry] = getKoreanFieldworkNotebookEntries([feature, memo] as any);

        expect(getKoreanFieldworkNotebookContinuationSeed(entry, 'nextWork')).toEqual({
            id: 'memo-1',
            sourceLabel: '메모 남은 작업',
            input: {
                observation: '바닥면 정리 중 원형 윤곽 확인.',
                interpretation: '',
                nextWork: '사진 보강.',
                evidenceNumbers: ''
            }
        });
        expect(getKoreanFieldworkNotebookContinuationSeed(entry, 'evidenceNumbers')).toMatchObject({
            sourceLabel: '메모 번호 보강',
            input: {
                nextWork: '사진 보강.\n사진·도면·스케치·유물·시료 번호를 이어서 확인.'
            }
        });
    });


    it('keeps soil profile photos and sketch memos in evidence-number follow-up review', () => {

        const soilProfilePhoto = createDoc('soil-photo-1', 'SoilProfilePhoto', '토층사진 1');
        const sketchMemo = createDoc('sketch-1', 'PenMemo', '스케치 1');
        const dailyLog = createDoc('daily-log-1', 'DailyLog', '2026-06-24 일지', {
            date: '2026-06-24',
            description: [
                '09:20 토층사진 1 - [관찰 내용] 1번 층 경계 확인.',
                '10:10 스케치 1 - [관찰 내용] 윤곽 보강.'
            ].join('\n')
        });

        const entries = getKoreanFieldworkNotebookEntries([
            soilProfilePhoto,
            sketchMemo,
            dailyLog
        ] as any);

        expect(entries.map(entry => ({
            id: entry.id,
            targetLabel: entry.targetLabel,
            targetCategoryLabel: entry.targetCategoryLabel,
            needsEvidenceNumbers: entry.needsEvidenceNumbers
        }))).toEqual([
            {
                id: 'daily-log-1-1',
                targetLabel: '스케치 1',
                targetCategoryLabel: '메모',
                needsEvidenceNumbers: true
            },
            {
                id: 'daily-log-1-0',
                targetLabel: '토층사진 1',
                targetCategoryLabel: '토층사진',
                needsEvidenceNumbers: true
            }
        ]);
    });


    it('omits old notebook records from the daily digest', () => {

        const oldMemo = createDoc('memo-old', 'PenMemo', 'M-old', {
            date: '2026-06-23',
            penMemoReviewedTranscript: '[다음 작업] 어제 작업.'
        });
        const todayMemo = createDoc('memo-today', 'PenMemo', 'M-today', {
            date: '2026-06-24',
            penMemoReviewedTranscript: '[다음 작업] 오늘 작업.'
        });

        const digest = makeKoreanFieldworkDailyNotebookDigest([oldMemo, todayMemo] as any, today);

        expect(digest.entries.map(entry => entry.sourceDocument.resource.id)).toEqual(['memo-today']);
    });


    it('filters notebook entries for the selected record', () => {

        const feature = createDoc('feature-1', 'Feature', 'F-1');
        const otherFeature = createDoc('feature-2', 'Feature', 'F-2');
        const memo = createDoc('memo-1', 'PenMemo', 'M-1', {
            date: '2026-06-24',
            penMemoReviewedTranscript: '[다음 작업] F-1 사진 보강.',
            relations: { depicts: ['feature-1'] }
        });
        const otherMemo = createDoc('memo-2', 'PenMemo', 'M-2', {
            date: '2026-06-24',
            penMemoReviewedTranscript: '[다음 작업] F-2 사진 보강.',
            relations: { depicts: ['feature-2'] }
        });

        const entries = getKoreanFieldworkNotebookEntriesForDocument(
            feature as any,
            [feature, otherFeature, memo, otherMemo] as any
        );

        expect(entries).toHaveLength(1);
        expect(entries[0].sourceDocument.resource.id).toBe('memo-1');
        expect(entries[0].targetLabel).toBe('F-1');
    });
});


const createDoc = (
    id: string,
    category: string,
    identifier: string,
    fields: { [fieldName: string]: unknown } = {}
) => ({
    _id: id,
    resource: {
        id,
        category,
        identifier,
        relations: {},
        ...fields
    },
    created: { user: 'tester', date: new Date('2026-06-24T08:00:00') },
    modified: [{ user: 'tester', date: new Date('2026-06-24T08:00:00') }]
});

function restoreTimeZone(previousTimeZone: string|undefined): void {

    if (previousTimeZone === undefined) {
        delete process.env.TZ;
    } else {
        process.env.TZ = previousTimeZone;
    }
}
