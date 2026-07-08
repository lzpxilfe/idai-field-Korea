import {
    extractMunsellCandidateOptions,
    getNearestMunsellCandidates,
    hasMunsellCandidateOptions,
    SOIL_COLOR_MUNSELL_REFERENCES
} from '../../src/tools/korean-fieldwork-soil-color';


describe('Korean fieldwork soil color candidate engine', () => {

    it('uses the expanded Munsell archaeology chip table for tablet and desktop parity', () => {

        expect(SOIL_COLOR_MUNSELL_REFERENCES.length).toBeGreaterThan(200);
        expect(SOIL_COLOR_MUNSELL_REFERENCES.some(
            reference => reference.munsell === '5YR 4/4'
        )).toBe(true);
        expect(SOIL_COLOR_MUNSELL_REFERENCES.some(
            reference => reference.munsell === '2.5GY 5/4'
        )).toBe(true);
    });


    it('returns the same nearest candidates used by tablet soil-photo sampling', () => {

        const candidates = getNearestMunsellCandidates({
            blue: 88,
            green: 128,
            red: 139
        });

        expect(candidates[0].munsell).toBe('2.5Y 5/4');
        expect(candidates[0].confidence).toBe('high');
        expect(candidates.length).toBe(5);
    });


    it('ignores empty candidate text from partial desktop review records', () => {

        expect(extractMunsellCandidateOptions(undefined)).toEqual([]);
        expect(extractMunsellCandidateOptions(null)).toEqual([]);
        expect(hasMunsellCandidateOptions(undefined)).toBe(false);
    });


    it('extracts full tablet Munsell candidate syntax for desktop review surfaces', () => {

        expect(extractMunsellCandidateOptions([
            '1: 10YR 4/3 (높음)',
            '2: GLEY 1 5/N (보통)',
            '3: 2.5GY 2.5/10 (낮음)',
            '4: N 4/0 (낮음)',
            '5: 10YR 4/3 (중복)'
        ].join('\n'))).toEqual([
            '10YR 4/3',
            'GLEY 1 5/N',
            '2.5GY 2.5/10',
            'N 4/0'
        ]);
        expect(hasMunsellCandidateOptions('사진 색상 샘플을 읽지 못했습니다.')).toBe(false);
    });
});
