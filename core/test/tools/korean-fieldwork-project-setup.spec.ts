import {
    createKoreanFieldworkProjectSetupResourceUpdates,
    getKoreanFieldworkInvestigationMode,
    getKoreanFieldworkInvestigationModeLabel,
    getKoreanFieldworkProjectSetupDefaultsFromDocument,
    shouldUseKoreanFieldworkTrenchWorkflow
} from '../../src/tools/korean-fieldwork-project-setup';


describe('Korean fieldwork project setup', () => {

    it('keeps tablet and desktop investigation mode labels in the shared core contract', () => {

        const trialTrenchMode = getKoreanFieldworkInvestigationMode('trialTrench')!;
        const excavationMode = getKoreanFieldworkInvestigationMode('excavation')!;

        expect(trialTrenchMode.id).toBe('trialTrench');
        expect(trialTrenchMode.label).toBe('시굴·표본조사');
        expect(trialTrenchMode.detail).toBe('트렌치 단위로 조사 과정과 확인 결과를 기록');
        expect(trialTrenchMode.primaryAction).toBe('트렌치부터 잡기');
        expect(trialTrenchMode.requirements).toContain('트렌치 번호와 위치');
        expect(trialTrenchMode.requirements).toContain('토층 정리 여부');
        expect(trialTrenchMode.requirements).toContain('피트 조사와 피트 토층도');

        expect(excavationMode.id).toBe('excavation');
        expect(excavationMode.label).toBe('발굴조사');
        expect(excavationMode.primaryAction).toBe('유구부터 기록');
        expect(excavationMode.requirements).toContain('조사 중 사진과 토층 확인');
        expect(excavationMode.requirements).toContain('스케치·약측·실측 연결');
        expect(excavationMode.requirements).toContain('유물 수습과 완료 사진');
        expect(getKoreanFieldworkInvestigationModeLabel('unknownMode')).toBe('unknownMode');
    });


    it('distinguishes trench workflow mode from other project modes', () => {

        expect(shouldUseKoreanFieldworkTrenchWorkflow('trialTrench')).toBe(true);
        expect(shouldUseKoreanFieldworkTrenchWorkflow('excavation')).toBe(false);
    });


    it('loads tablet-synced setup defaults from project documents', () => {

        expect(getKoreanFieldworkProjectSetupDefaultsFromDocument({
            resource: {
                id: 'project',
                identifier: 'project',
                category: 'Project',
                relations: {},
                projectInvestigationMode: 'trialTrench',
                projectBoundarySummary: '  1구역 북쪽 능선부터 남쪽 농로까지  ',
                institution: '  한빛문화재연구원  '
            }
        } as any)).toEqual({
            investigationModeId: 'trialTrench',
            boundarySummary: '1구역 북쪽 능선부터 남쪽 농로까지',
            institutionName: '한빛문화재연구원'
        });
    });


    it('ignores invalid mode values while keeping boundary defaults', () => {

        expect(getKoreanFieldworkProjectSetupDefaultsFromDocument({
            resource: {
                id: 'project',
                identifier: 'project',
                category: 'Project',
                relations: {},
                projectInvestigationMode: 'bad-mode',
                projectBoundarySummary: '1구역 경계'
            }
        } as any)).toEqual({
            investigationModeId: undefined,
            boundarySummary: '1구역 경계'
        });
    });


    it('builds project document updates for tablet and desktop setup flows', () => {

        expect(createKoreanFieldworkProjectSetupResourceUpdates({
            investigationModeId: 'surfaceSurvey'
        })).toEqual({
            projectInvestigationMode: 'surfaceSurvey'
        });
        expect(createKoreanFieldworkProjectSetupResourceUpdates({
            boundarySummary: '  2구역 남쪽 구릉  ',
            institutionName: '  한빛문화재연구원  '
        })).toEqual({
            institution: '한빛문화재연구원',
            projectBoundarySetupState: 'draftBoundary',
            projectBoundarySummary: '2구역 남쪽 구릉',
            shortDescription: '2구역 남쪽 구릉'
        });
    });
});
