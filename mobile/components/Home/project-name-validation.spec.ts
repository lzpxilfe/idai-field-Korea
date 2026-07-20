import {
  createServerCompatibleProjectId,
  getLocalProjectNameInvalidText,
  getProjectNameInvalidText,
  LOCAL_PROJECT_NAME_MAX_LENGTH,
  PROJECT_IDENTIFIER_MAX_LENGTH,
  validateProjectName,
} from './project-name-validation';
import { SAMPLE_PROJECT_ID } from '@/constants/sample-project';

const invalidFormatText =
  '프로젝트 이름은 소문자로 시작하고 소문자, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있으며 30자 이하여야 합니다.';

describe('project name validation', () => {
  it('normalizes project names before checking availability', () => {
    expect(validateProjectName('  fieldwork-1  ', [' fieldwork-1 '])).toEqual({
      alreadyExists: true,
      displayName: 'fieldwork-1',
      hasUnsafeCharacters: false,
      isAvailable: false,
      isPresent: true,
      isReserved: false,
      isTooLong: false,
      projectId: 'fieldwork-1',
    });
  });

  it('treats empty names as missing instead of duplicate', () => {
    const validation = validateProjectName('   ', ['']);

    expect(validation).toEqual({
      alreadyExists: false,
      displayName: '',
      hasUnsafeCharacters: false,
      isAvailable: false,
      isPresent: false,
      isReserved: false,
      isTooLong: false,
      projectId: '',
    });
    expect(getProjectNameInvalidText(validation)).toBe(
      '프로젝트 이름을 입력해야 합니다.'
    );
  });

  it('uses the duplicate-name message only for existing projects', () => {
    expect(getProjectNameInvalidText(
      validateProjectName('fieldwork-1', ['fieldwork-1'])
    )).toBe('이미 있는 프로젝트 이름입니다.');
  });

  it('accepts server-compatible project names', () => {
    expect(validateProjectName('fieldwork-1').isAvailable).toBe(true);
    expect(validateProjectName('fieldwork_1').isAvailable).toBe(true);
    expect(validateProjectName('f1').isAvailable).toBe(true);
  });

  it('rejects names that the server would reject', () => {
    for (const projectName of [
      'Fieldwork-1',
      '1fieldwork',
      '_fieldwork',
      '-fieldwork',
      'field/work',
      'field work',
      'field.work',
    ]) {
      const validation = validateProjectName(projectName);

      expect(validation.hasUnsafeCharacters).toBe(true);
      expect(validation.isAvailable).toBe(false);
      expect(getProjectNameInvalidText(validation)).toBe(invalidFormatText);
    }
  });

  it('accepts Korean field site names for local project creation', () => {
    for (const projectName of [
      '반다비 유적',
      '서울 종로구 반다비 유적 1구역',
      'Bandabi 발굴조사 2026',
      '반다비 유적(시굴)',
    ]) {
      const validation = validateProjectName(projectName, [], { mode: 'local' });

      expect(validation.hasUnsafeCharacters).toBe(false);
      expect(validation.isAvailable).toBe(true);
      expect(validation.displayName).toBe(projectName);
      expect(validation.projectId).toBe(createServerCompatibleProjectId(projectName));
      expect(validation.projectId).toMatch(/^[a-z][a-z0-9_-]{0,29}$/);
    }
  });

  it('keeps 테스트 as the display name and creates a stable link ID', () => {
    const validation = validateProjectName('테스트', [], { mode: 'local' });

    expect(validation.displayName).toBe('테스트');
    expect(validation.projectId).toBe('fieldwork-119k6d');
  });

  it('keeps path-like characters out of local project names', () => {
    const validation = validateProjectName('반다비/1구역', [], { mode: 'local' });

    expect(validation.hasUnsafeCharacters).toBe(true);
    expect(validation.isAvailable).toBe(false);
    expect(getLocalProjectNameInvalidText(validation)).toBe(
      '프로젝트 이름에는 / \\ : * ? " < > | 문자나 줄바꿈을 사용할 수 없습니다. 한글, 숫자, 영문, 띄어쓰기는 사용할 수 있습니다.'
    );
  });

  it('allows longer local names than server database names', () => {
    const projectName = '반다비 유적 '.repeat(6).trim();

    expect(projectName.length).toBeGreaterThan(PROJECT_IDENTIFIER_MAX_LENGTH);
    expect(projectName.length).toBeLessThanOrEqual(LOCAL_PROJECT_NAME_MAX_LENGTH);
    const validation = validateProjectName(projectName, [], { mode: 'local' });

    expect(validation.isAvailable).toBe(true);
    expect(validation.projectId.length).toBeLessThanOrEqual(PROJECT_IDENTIFIER_MAX_LENGTH);
    expect(validateProjectName(projectName).isAvailable).toBe(false);
  });

  it('rejects names exceeding the server maximum length', () => {
    const projectName = 'a'.repeat(PROJECT_IDENTIFIER_MAX_LENGTH + 1);
    const validation = validateProjectName(projectName);

    expect(validation.isTooLong).toBe(true);
    expect(validation.isAvailable).toBe(false);
    expect(getProjectNameInvalidText(validation)).toBe(invalidFormatText);
  });

  it('rejects app-reserved project names', () => {
    const validation = validateProjectName(SAMPLE_PROJECT_ID);

    expect(validation).toEqual({
      alreadyExists: false,
      displayName: SAMPLE_PROJECT_ID,
      hasUnsafeCharacters: false,
      isAvailable: false,
      isPresent: true,
      isReserved: true,
      isTooLong: false,
      projectId: SAMPLE_PROJECT_ID,
    });
    expect(getProjectNameInvalidText(validation)).toBe(
      '앱에서 쓰는 예약 이름입니다.'
    );
  });
});
