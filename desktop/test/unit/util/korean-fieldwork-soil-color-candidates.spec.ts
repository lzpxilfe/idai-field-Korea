import {
    extractMunsellCandidateOptions,
    getMunsellCandidateSummaryLabel,
    getSoilColorSampleSourceLabel
} from '../../../src/app/util/korean-fieldwork-soil-color-candidates';


describe('korean-fieldwork-soil-color-candidates', () => {

    it('extracts unique Munsell options from photo-derived candidate text', () => {

        const candidates = extractMunsellCandidateOptions([
            '사진 중앙부 평균 RGB 111/87/61',
            '1: 10YR 4/3 (높음, 차이 0.0)',
            '2: 7.5YR 4/3 (보통, 차이 8.1)',
            '3: 10YR 4/3 (중복)',
            '4: GLEY 1 5/N (낮음)',
            '5: 2.5GY 2.5/10 (낮음)',
            '6: N 4/0 (낮음)'
        ].join('\n'));

        expect(candidates).toEqual([
            '10YR 4/3',
            '7.5YR 4/3',
            'GLEY 1 5/N',
            '2.5GY 2.5/10',
            'N 4/0'
        ]);
    });


    it('builds a concise desktop review label for candidate lists', () => {

        expect(getMunsellCandidateSummaryLabel(
            '1: 10YR 4/3 (높음)\n2: 7.5YR 4/3 (보통)'
        )).toBe('먼셀 후보 10YR 4/3, 7.5YR 4/3');

        expect(getMunsellCandidateSummaryLabel('사진 색상 샘플을 읽지 못했습니다.')).toBe('');
    });


    it('keeps tablet eyedropper sample locations visible for desktop review', () => {

        expect(getSoilColorSampleSourceLabel([
            '사진 선택 지점 20%/50% 평균 RGB 111/87/61',
            '1: 10YR 4/3 (높음, 차이 0.0)'
        ].join('\n'))).toBe('사진 선택 지점 20%/50% 평균 RGB 111/87/61');

        expect(getSoilColorSampleSourceLabel([
            '사진 중앙부 평균 RGB 111/87/61',
            '1: 10YR 4/3 (높음, 차이 0.0)'
        ].join('\n'))).toBe('사진 중앙부 평균 RGB 111/87/61');
    });


    it('prefers accepted layer sample locations over temporary photo candidate source text', () => {

        expect(getSoilColorSampleSourceLabel([
            '사진 선택 지점 80%/45% 평균 RGB 139/128/88',
            '1: 2.5Y 5/3 (높음, 차이 0.0)'
        ].join('\n'), [
            '1: 10YR 4/3 RGB 111/87/61 @ 20%/50%',
            '2: 2.5Y 5/3 RGB 139/128/88 @ 80%/45%'
        ].join('\n'))).toBe(
            '1층: RGB 111/87/61 @ 20%/50%, 2층: RGB 139/128/88 @ 80%/45%'
        );
    });
});
