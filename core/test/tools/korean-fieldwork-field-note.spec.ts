import {
    buildKoreanFieldworkFieldNoteText,
    extractKoreanFieldworkFieldNoteInput,
    getKoreanFieldworkFieldNoteReportPreview,
    hasMeaningfulKoreanFieldworkFieldNoteText,
    parseKoreanFieldworkFieldNote,
    shouldPromptKoreanFieldworkFieldNoteNextWork
} from '../../src/tools/korean-fieldwork-field-note';


describe('Korean fieldwork field note contract', () => {

    it('builds and parses tablet field-note sections through one shared contract', () => {

        const text = buildKoreanFieldworkFieldNoteText({
            observation: '\ubc14\ub2e5\uba74\uc5d0\uc11c \uc6d0\ud615 \uc724\uacfd \ud655\uc778.',
            interpretation: '\uc8fc\uacf5 \uac00\ub2a5\uc131.',
            nextWork: '\ub2e8\uba74 \uc0ac\uc9c4 \ubcf4\uac15.',
            evidenceNumbers: '\uc0ac\uc9c4 12, \ub3c4\uba74 3'
        });

        expect(text).toBe([
            '[\uad00\ucc30 \ub0b4\uc6a9] \ubc14\ub2e5\uba74\uc5d0\uc11c \uc6d0\ud615 \uc724\uacfd \ud655\uc778.',
            '[\ud574\uc11d] \uc8fc\uacf5 \uac00\ub2a5\uc131.',
            '[\ub2e4\uc74c \uc791\uc5c5] \ub2e8\uba74 \uc0ac\uc9c4 \ubcf4\uac15.',
            '[\uc0ac\uc9c4\u00b7\ub3c4\uba74\u00b7\uc2a4\ucf00\uce58\u00b7\uc720\ubb3c\u00b7\uc2dc\ub8cc \ubc88\ud638] '
                + '\uc0ac\uc9c4 12, \ub3c4\uba74 3'
        ].join('\n'));
        expect(extractKoreanFieldworkFieldNoteInput(text)).toEqual({
            observation: '\ubc14\ub2e5\uba74\uc5d0\uc11c \uc6d0\ud615 \uc724\uacfd \ud655\uc778.',
            interpretation: '\uc8fc\uacf5 \uac00\ub2a5\uc131.',
            nextWork: '\ub2e8\uba74 \uc0ac\uc9c4 \ubcf4\uac15.',
            evidenceNumbers: '\uc0ac\uc9c4 12, \ub3c4\uba74 3'
        });
    });


    it('accepts legacy evidence-number headings used by tablet and desktop notes', () => {

        expect(extractKoreanFieldworkFieldNoteInput([
            '[\uad00\ucc30 \ub0b4\uc6a9] \uce35 \uacbd\uacc4 \ud655\uc778.',
            '[\uadfc\uac70 \ubc88\ud638] \uc0ac\uc9c4 12, \ub3c4\uba74 3'
        ].join('\n'))).toEqual({
            observation: '\uce35 \uacbd\uacc4 \ud655\uc778.',
            interpretation: '',
            nextWork: '',
            evidenceNumbers: '\uc0ac\uc9c4 12, \ub3c4\uba74 3'
        });
        expect(extractKoreanFieldworkFieldNoteInput([
            '09:30 pit-001 - [\uad00\ucc30 \ub0b4\uc6a9] \ubc14\ub2e5\uba74 \uc815\ub9ac.',
            '[\uc2a4\ucf00\uce58\u00b7\uc57d\uce21/\uadfc\uac70 \ubc88\ud638] \uc57d\uce21 A, \uc0ac\uc9c4 14'
        ].join('\n'))).toEqual({
            observation: '\ubc14\ub2e5\uba74 \uc815\ub9ac.',
            interpretation: '',
            nextWork: '',
            evidenceNumbers: '\uc57d\uce21 A, \uc0ac\uc9c4 14'
        });
    });


    it('keeps handwriting coordinates available as evidence without leaking JSON into HWP sections', () => {

        const parsed = parseKoreanFieldworkFieldNote([
            '[\uad00\ucc30 \ub0b4\uc6a9] \ubc14\ub2e5\uba74 \uc815\ub9ac.',
            '[\uc190\uadf8\ub9bc \uc88c\ud45c] {"version":1,"strokes":[{"points":[{"x":10,"y":20}]}]}'
        ].join('\n'), { omitJsonLines: true });

        expect(parsed.sections.observation).toBe('\ubc14\ub2e5\uba74 \uc815\ub9ac.');
        expect(parsed.hasHandwritingEvidence).toBe(true);
        expect(parsed.fallbackLines.join('\n')).not.toContain('"strokes"');
        expect(hasMeaningfulKoreanFieldworkFieldNoteText(
            '[\uad00\ucc30 \ub0b4\uc6a9]\n[\uadfc\uac70 \ubc88\ud638]'
        )).toBe(false);
    });


    it('builds tablet report-preview sentences through the shared desktop handoff contract', () => {

        const feature = makeDocument('feature-1', 'Feature', '수혈 1');

        expect(getKoreanFieldworkFieldNoteReportPreview({}, feature)).toBeUndefined();
        expect(getKoreanFieldworkFieldNoteReportPreview({
            observation: '바닥면에서 원형 윤곽을 확인.',
            interpretation: '주공 가능성이 있다.',
            nextWork: '사진 보강 후 단면 정리.',
            evidenceNumbers: '사진 12, 도면 3'
        }, feature)).toEqual({
            title: '수혈 1 보고서 정리 문장',
            sentence: '유구 수혈 1은 바닥면에서 원형 윤곽을 확인. 주공 가능성이 있다.',
            supportingDetail: '근거 번호: 사진 12, 도면 3 · 다음 작업: 사진 보강 후 단면 정리.',
            missingParts: []
        });
        expect(getKoreanFieldworkFieldNoteReportPreview({
            observation: '평면 형태 확인.'
        }, feature)?.missingParts).toEqual([
            '관찰과 구분한 해석',
            '사진·도면·스케치·유물·시료 번호',
            '다음 작업'
        ]);
        expect(getKoreanFieldworkFieldNoteReportPreview({
            observation: '배수로로 이어지는 선형 흔적 확인.'
        }, makeDocument('feature-2', 'Feature', '유구 2'))?.sentence)
            .toBe('유구 2는 배수로로 이어지는 선형 흔적 확인.');
        expect(shouldPromptKoreanFieldworkFieldNoteNextWork(feature)).toBe(true);
        expect(shouldPromptKoreanFieldworkFieldNoteNextWork(
            makeDocument('photo-1', 'Photo', '사진 1')
        )).toBe(false);
    });
});


function makeDocument(id: string, category: string, identifier: string) {

    return {
        resource: {
            id,
            identifier,
            category,
            relations: {}
        }
    } as any;
}
