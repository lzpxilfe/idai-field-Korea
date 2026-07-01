import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createKoreanFieldworkProjectSetupResourceUpdates,
  createKoreanFieldworkBoundarySummaryStorageKey,
  createKoreanFieldworkDefaultInstitutionNameStorageKey,
  createKoreanFieldworkInvestigationModeStorageKey,
  createKoreanFieldworkProjectBoundaryDraftStorageKey,
  getKoreanFieldworkInvestigationMode,
  getKoreanFieldworkProjectSetupDefaultsFromDocument,
  loadKoreanFieldworkDefaultInstitutionName,
  loadKoreanFieldworkBoundarySummary,
  loadKoreanFieldworkProjectBoundaryDraft,
  loadKoreanFieldworkProjectSetupDefaults,
  loadKoreanFieldworkInvestigationModeId,
  removeKoreanFieldworkProjectBoundaryDraft,
  saveKoreanFieldworkDefaultInstitutionName,
  saveKoreanFieldworkBoundarySummary,
  saveKoreanFieldworkInvestigationModeId,
  saveKoreanFieldworkProjectBoundaryDraft,
} from './korean-fieldwork-investigation-mode';

describe('Korean fieldwork investigation mode', () => {
  beforeEach(() => {
    AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('keeps trench-based 조사 requirements separate from excavation flow', () => {
    expect(getKoreanFieldworkInvestigationMode('trialTrench')).toMatchObject({
      label: '시굴·표본조사',
      primaryAction: '트렌치부터 잡기',
      requirements: expect.arrayContaining([
        '토층 정리 여부',
        '피트 조사와 피트 토층도',
      ]),
    });
    expect(getKoreanFieldworkInvestigationMode('excavation')).toMatchObject({
      label: '발굴조사',
      primaryAction: '유구부터 기록',
      requirements: expect.arrayContaining([
        '조사 중 사진과 토층 확인',
        '스케치·약측·실측 연결',
        '유물 수습과 완료 사진',
      ]),
    });
  });

  it('persists the selected mode by project', async () => {
    await saveKoreanFieldworkInvestigationModeId('project-1', 'excavation');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      createKoreanFieldworkInvestigationModeStorageKey('project-1'),
      'excavation'
    );
    await expect(loadKoreanFieldworkInvestigationModeId('project-1'))
      .resolves.toBe('excavation');
  });

  it('persists the boundary summary by project without project-name prefixes', async () => {
    await saveKoreanFieldworkBoundarySummary(
      'area-2026',
      '  1구역 북쪽 능선부터 남쪽 농로까지  '
    );

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      createKoreanFieldworkBoundarySummaryStorageKey('area-2026'),
      '1구역 북쪽 능선부터 남쪽 농로까지'
    );
    await expect(loadKoreanFieldworkBoundarySummary('area-2026'))
      .resolves.toBe('1구역 북쪽 능선부터 남쪽 농로까지');

    await saveKoreanFieldworkBoundarySummary('area-2026', '   ');

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      createKoreanFieldworkBoundarySummaryStorageKey('area-2026')
    );
  });

  it('persists a drawn project boundary draft by project', async () => {
    const boundaryDraft = {
      center: { latitude: 37.133333, longitude: 127.166667 },
      coordinates: [
        { latitude: 37.1, longitude: 127.1 },
        { latitude: 37.1, longitude: 127.2 },
        { latitude: 37.2, longitude: 127.2 },
      ],
      mapTypeId: 'HYBRID' as const,
    };

    await saveKoreanFieldworkProjectBoundaryDraft('area-2026', boundaryDraft);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      createKoreanFieldworkProjectBoundaryDraftStorageKey('area-2026'),
      expect.any(String)
    );
    expect(JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]))
      .toEqual(boundaryDraft);
    await expect(loadKoreanFieldworkProjectBoundaryDraft('area-2026'))
      .resolves.toEqual(boundaryDraft);

    await removeKoreanFieldworkProjectBoundaryDraft('area-2026');

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      createKoreanFieldworkProjectBoundaryDraftStorageKey('area-2026')
    );
  });

  it('removes project boundary drafts with fewer than three usable points', async () => {
    await saveKoreanFieldworkProjectBoundaryDraft('area-2026', {
      coordinates: [
        { latitude: 37.1, longitude: 127.1 },
        { latitude: 37.1, longitude: 127.2 },
      ],
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      createKoreanFieldworkProjectBoundaryDraftStorageKey('area-2026')
    );
    await expect(loadKoreanFieldworkProjectBoundaryDraft('area-2026'))
      .resolves.toBeUndefined();
  });

  it('persists the default institution name separately from worker name', async () => {
    await saveKoreanFieldworkDefaultInstitutionName(
      '  한빛문화재연구원  '
    );

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      createKoreanFieldworkDefaultInstitutionNameStorageKey(),
      '한빛문화재연구원'
    );
    await expect(loadKoreanFieldworkDefaultInstitutionName())
      .resolves.toBe('한빛문화재연구원');

    await saveKoreanFieldworkDefaultInstitutionName('   ');

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      createKoreanFieldworkDefaultInstitutionNameStorageKey()
    );
  });

  it('loads project setup defaults from the project document when local storage is empty', async () => {
    const projectDocument = {
      resource: {
        projectBoundarySummary: '1구역 북쪽 능선부터 남쪽 농로까지',
        projectInvestigationMode: 'trialTrench',
        institution: '한빛문화재연구원',
      },
    } as any;

    await expect(loadKoreanFieldworkProjectSetupDefaults(
      'project-1',
      projectDocument
    )).resolves.toEqual({
      boundarySummary: '1구역 북쪽 능선부터 남쪽 농로까지',
      institutionName: '한빛문화재연구원',
      investigationModeId: 'trialTrench',
    });
  });

  it('builds synced project document updates with valid Korean fieldwork values', () => {
    expect(createKoreanFieldworkProjectSetupResourceUpdates({
      boundarySummary: '  1구역 북쪽 능선부터 남쪽 농로까지  ',
      institutionName: '  한빛문화재연구원  ',
      investigationModeId: 'excavation',
    })).toEqual({
      institution: '한빛문화재연구원',
      projectBoundarySetupState: 'draftBoundary',
      projectBoundarySummary: '1구역 북쪽 능선부터 남쪽 농로까지',
      projectInvestigationMode: 'excavation',
      shortDescription: '1구역 북쪽 능선부터 남쪽 농로까지',
    });
  });

  it('ignores invalid project document mode values', () => {
    expect(getKoreanFieldworkProjectSetupDefaultsFromDocument({
      resource: {
        projectBoundarySummary: '경계 기준',
        projectInvestigationMode: 'bad-mode',
      },
    } as any)).toEqual({
      boundarySummary: '경계 기준',
      investigationModeId: undefined,
    });
  });
});
