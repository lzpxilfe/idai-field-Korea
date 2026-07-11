import { SAMPLE_PROJECT_ID } from '@/constants/sample-project';

export interface ProjectNameValidation {
  alreadyExists: boolean;
  displayName: string;
  hasUnsafeCharacters: boolean;
  isAvailable: boolean;
  isPresent: boolean;
  isReserved: boolean;
  isTooLong: boolean;
  projectId: string;
}

export const PROJECT_IDENTIFIER_MAX_LENGTH = 30;
export const LOCAL_PROJECT_NAME_MAX_LENGTH = 80;

interface ProjectNameValidationOptions {
  mode?: 'server' | 'local';
}

export const validateProjectName = (
  projectName: string,
  existingProjects: readonly string[] = [],
  options: ProjectNameValidationOptions = {}
): ProjectNameValidation => {
  const validationMode = options.mode ?? 'server';
  const displayName = normalizeProjectId(projectName);
  const projectId = validationMode === 'local'
    ? createServerCompatibleProjectId(displayName)
    : displayName;
  const projectLookupKey = createProjectLookupKey(projectId);
  const displayNameLookupKey = createProjectLookupKey(displayName);
  const isPresent = displayName.length > 0;
  const alreadyExists = isPresent && existingProjects.some((existingProject) =>
    hasMatchingExistingProjectName(existingProject, projectLookupKey, displayNameLookupKey)
  );
  const isReserved =
    projectLookupKey === createProjectLookupKey(SAMPLE_PROJECT_ID)
    || displayNameLookupKey === createProjectLookupKey(SAMPLE_PROJECT_ID);
  const maxLength = validationMode === 'local'
    ? LOCAL_PROJECT_NAME_MAX_LENGTH
    : PROJECT_IDENTIFIER_MAX_LENGTH;
  const isTooLong = (validationMode === 'local' ? displayName : projectId).length > maxLength;
  const hasUnsafeCharacters =
    isPresent
    && !isReserved
    && (validationMode === 'local'
      ? !hasLocalProjectName(displayName)
      : !hasServerCompatibleProjectName(projectId));

  return {
    alreadyExists,
    displayName,
    hasUnsafeCharacters,
    isAvailable:
      isPresent && !alreadyExists && !isReserved && !isTooLong && !hasUnsafeCharacters,
    isPresent,
    isReserved,
    isTooLong,
    projectId,
  };
};

export const createServerCompatibleProjectId = (projectName: string): string => {
  const displayName = normalizeProjectId(projectName);
  if (!displayName) return '';

  if (
    displayName.length <= PROJECT_IDENTIFIER_MAX_LENGTH
    && hasServerCompatibleProjectName(displayName)
  ) {
    return displayName;
  }

  const hash = createProjectNameHash(displayName);
  const asciiSlug = displayName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[^a-z]+/, '')
    .replace(/[-_]+$/g, '');
  const fallbackSlug = 'fieldwork';
  const maxBaseLength = PROJECT_IDENTIFIER_MAX_LENGTH - hash.length - 1;
  const base = (asciiSlug || fallbackSlug)
    .slice(0, maxBaseLength)
    .replace(/[-_]+$/g, '') || fallbackSlug.slice(0, maxBaseLength);

  return `${base}-${hash}`;
};

export const getProjectNameInvalidText = (
  validation: ProjectNameValidation
): string =>
  validation.alreadyExists
    ? '이미 있는 프로젝트 이름입니다.'
    : validation.isReserved
      ? '앱에서 쓰는 예약 이름입니다.'
      : validation.isTooLong || validation.hasUnsafeCharacters
        ? '프로젝트 이름은 소문자로 시작하고 소문자, 숫자, 밑줄(_), 하이픈(-)만 사용할 수 있으며 30자 이하여야 합니다.'
        : '프로젝트 이름을 입력해야 합니다.';

export const getLocalProjectNameInvalidText = (
  validation: ProjectNameValidation
): string =>
  validation.alreadyExists
    ? '이미 있는 프로젝트 이름입니다.'
    : validation.isReserved
      ? '앱에서 쓰는 예약 이름입니다.'
      : validation.isTooLong
        ? `프로젝트 이름은 ${LOCAL_PROJECT_NAME_MAX_LENGTH}자 이하로 입력하세요.`
        : validation.hasUnsafeCharacters
          ? '프로젝트 이름에는 / \\ : * ? " < > | 문자나 줄바꿈을 사용할 수 없습니다. 한글, 숫자, 영문, 띄어쓰기는 사용할 수 있습니다.'
          : '프로젝트 이름을 입력해야 합니다.';

const normalizeProjectId = (projectName: string): string => projectName.trim();

const createProjectLookupKey = (projectId: string): string =>
  projectId.toLocaleLowerCase();

const hasMatchingExistingProjectName = (
  existingProject: string,
  projectLookupKey: string,
  displayNameLookupKey: string
): boolean => {
  const normalizedExistingProject = normalizeProjectId(existingProject);
  const existingLookupKey = createProjectLookupKey(normalizedExistingProject);

  return existingLookupKey === projectLookupKey
    || existingLookupKey === displayNameLookupKey
    || createProjectLookupKey(
      createServerCompatibleProjectId(normalizedExistingProject)
    ) === projectLookupKey;
};

const hasServerCompatibleProjectName = (projectId: string): boolean =>
  /^[a-z][0-9a-z_-]*$/.test(projectId);

const hasLocalProjectName = (projectId: string): boolean =>
  !/[\u0000-\u001f\u007f/\\:*?"<>|]/.test(projectId);

const createProjectNameHash = (value: string): string => {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash.toString(36).padStart(6, '0').slice(0, 6);
};
