import { Measurement, NewResource } from 'idai-field-core';

const FEATURE_MEASUREMENT_FIELD_NAMES = [
  'dimensionLength',
  'dimensionWidth',
  'dimensionVerticalExtent',
] as const;

export const serializeKoreanFieldworkFeatureMeasurements = (
  resource: NewResource
): string | undefined => {
  const fields = getValidFeatureMeasurementFields(resource);

  return Object.keys(fields).length > 0 ? JSON.stringify(fields) : undefined;
};

export const parseKoreanFieldworkFeatureMeasurements = (
  serializedFields: string | undefined
): Record<string, Measurement[]> => {
  if (!serializedFields?.trim()) return {};

  try {
    const parsedFields = JSON.parse(serializedFields);
    if (!isRecord(parsedFields)) return {};

    return getValidFeatureMeasurementFields(parsedFields);
  } catch {
    return {};
  }
};

const getValidFeatureMeasurementFields = (
  resource: Record<string, unknown>
): Record<string, Measurement[]> => {
  const result: Record<string, Measurement[]> = {};

  FEATURE_MEASUREMENT_FIELD_NAMES.forEach((fieldName) => {
    const fieldValue = resource[fieldName];
    if (!Array.isArray(fieldValue)) return;

    const measurements = fieldValue.filter(isValidDimensionMeasurement);
    if (measurements.length > 0) result[fieldName] = measurements;
  });

  return result;
};

const isValidDimensionMeasurement = (value: unknown): value is Measurement =>
  Measurement.isMeasurement(value)
  && Number.isFinite(value.inputValue)
  && value.inputValue > 0
  && ['mm', 'cm', 'm'].includes(value.inputUnit);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
