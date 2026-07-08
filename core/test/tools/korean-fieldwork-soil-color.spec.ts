import {
    extractMunsellCandidateOptions,
    getNearestMunsellCandidates,
    hasMunsellCandidateOptions,
    parseSoilProfileColorSwatchRows,
    SOIL_COLOR_MUNSELL_REFERENCES,
    updateSoilProfileColorSwatchMunsellValue,
    updateSoilProfileColorSwatchNoteValue,
    updateSoilProfileColorSwatchSampleValue
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
    it('parses soil profile swatches with field notes and tablet eyedropper locations', () => {

        const rows = parseSoilProfileColorSwatchRows(
            '1: 10YR 4/3 dark fill RGB 111/87/61 @ 20%/50%\n2: gray clay'
        );

        expect(rows[0]).toEqual({
            munsell: '10YR 4/3',
            note: 'dark fill',
            number: 1,
            sample: {
                blue: 61,
                green: 87,
                label: 'RGB 111/87/61 @ 20%/50%',
                point: {
                    xPercent: 20,
                    yPercent: 50
                },
                pointLabel: '20%/50%',
                red: 111
            },
            value: '10YR 4/3 dark fill RGB 111/87/61 @ 20%/50%'
        });
        expect(rows[1]).toEqual({
            munsell: '',
            note: 'gray clay',
            number: 2,
            value: 'gray clay'
        });
    });


    it('preserves layer notes and sample coordinates when desktop reviewers change Munsell values', () => {

        expect(updateSoilProfileColorSwatchMunsellValue(
            '1: 10YR 4/3 dark fill RGB 111/87/61 @ 20%/50%',
            1,
            '7.5YR 4/4'
        )).toBe('1: 7.5YR 4/4 dark fill RGB 111/87/61 @ 20%/50%');

        expect(updateSoilProfileColorSwatchNoteValue(
            '1: 10YR 4/3 dark fill RGB 111/87/61 @ 20%/50%',
            1,
            'lower fill'
        )).toBe('1: 10YR 4/3 lower fill RGB 111/87/61 @ 20%/50%');
    });


    it('writes sampled Munsell candidates without dropping existing layer notes', () => {

        expect(updateSoilProfileColorSwatchSampleValue(
            '1: 10YR 4/3\n2: charcoal rich fill',
            2,
            '2.5Y 5/3',
            '\uc0ac\uc9c4 \uc120\ud0dd \uc9c0\uc810 80%/50% \ud3c9\uade0 RGB 139/128/88\n1: 2.5Y 5/3'
        )).toBe('1: 10YR 4/3\n2: 2.5Y 5/3 charcoal rich fill RGB 139/128/88 @ 80%/50%');
    });
});
