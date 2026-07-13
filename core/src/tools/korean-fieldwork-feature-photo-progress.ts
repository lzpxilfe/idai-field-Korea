export const KOREAN_FIELDWORK_FEATURE_PHOTO_MILESTONES = [
    {
        value: 'preInvestigationPhotoTaken',
        label: '조사 전 사진'
    },
    {
        value: 'inProgressPhotoTaken',
        label: '조사 중 사진'
    },
    {
        value: 'completionPhotoTaken',
        label: '완료 사진'
    }
] as const;

export type KoreanFieldworkFeaturePhotoMilestoneValue =
    typeof KOREAN_FIELDWORK_FEATURE_PHOTO_MILESTONES[number]['value'];

export type KoreanFieldworkFeaturePhotoProgressStage =
    'unrecorded'
    | 'preInvestigation'
    | 'investigating'
    | 'completed';

export type KoreanFieldworkFeatureRecordingStatus =
    'candidate'
    | 'investigating'
    | 'confirmed';

export interface KoreanFieldworkFeaturePhotoProgress {
    stage: KoreanFieldworkFeaturePhotoProgressStage;
    label: string;
    recordingStatus: KoreanFieldworkFeatureRecordingStatus;
    progressPercent: number;
    checkedCount: number;
    totalCount: number;
    checkedValues: KoreanFieldworkFeaturePhotoMilestoneValue[];
    missingValues: KoreanFieldworkFeaturePhotoMilestoneValue[];
    nextMilestoneValue?: KoreanFieldworkFeaturePhotoMilestoneValue;
}

const PHOTO_MILESTONE_VALUES = new Set<string>(
    KOREAN_FIELDWORK_FEATURE_PHOTO_MILESTONES.map(({ value }) => value)
);

export function getKoreanFieldworkFeaturePhotoProgress(
    checklistValue: unknown
): KoreanFieldworkFeaturePhotoProgress {

    const checklistValues = new Set(
        Array.isArray(checklistValue)
            ? checklistValue.filter((value): value is string => typeof value === 'string')
            : []
    );
    const checkedValues = KOREAN_FIELDWORK_FEATURE_PHOTO_MILESTONES
        .map(({ value }) => value)
        .filter(value => checklistValues.has(value));
    const missingValues = KOREAN_FIELDWORK_FEATURE_PHOTO_MILESTONES
        .map(({ value }) => value)
        .filter(value => !checklistValues.has(value));

    if (checklistValues.has('completionPhotoTaken')) {
        return makeProgress(
            'completed',
            '완료',
            'confirmed',
            100,
            checkedValues,
            missingValues
        );
    }

    if (checklistValues.has('inProgressPhotoTaken')) {
        return makeProgress(
            'investigating',
            '조사 중',
            'investigating',
            67,
            checkedValues,
            missingValues,
            'completionPhotoTaken'
        );
    }

    if (checklistValues.has('preInvestigationPhotoTaken')) {
        return makeProgress(
            'preInvestigation',
            '조사 전',
            'candidate',
            33,
            checkedValues,
            missingValues,
            'inProgressPhotoTaken'
        );
    }

    return makeProgress(
        'unrecorded',
        '사진 미확인',
        'candidate',
        0,
        checkedValues,
        missingValues,
        'preInvestigationPhotoTaken'
    );
}

export function isKoreanFieldworkFeaturePhotoMilestone(
    value: string
): value is KoreanFieldworkFeaturePhotoMilestoneValue {

    return PHOTO_MILESTONE_VALUES.has(value);
}

function makeProgress(
    stage: KoreanFieldworkFeaturePhotoProgressStage,
    label: string,
    recordingStatus: KoreanFieldworkFeatureRecordingStatus,
    progressPercent: number,
    checkedValues: KoreanFieldworkFeaturePhotoMilestoneValue[],
    missingValues: KoreanFieldworkFeaturePhotoMilestoneValue[],
    nextMilestoneValue?: KoreanFieldworkFeaturePhotoMilestoneValue
): KoreanFieldworkFeaturePhotoProgress {

    return {
        stage,
        label,
        recordingStatus,
        progressPercent,
        checkedCount: checkedValues.length,
        totalCount: KOREAN_FIELDWORK_FEATURE_PHOTO_MILESTONES.length,
        checkedValues,
        missingValues,
        nextMilestoneValue
    };
}
