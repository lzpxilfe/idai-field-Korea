export interface FieldworkPhotoSize {
  height: number;
  width: number;
}

export interface FieldworkPhotoRect extends FieldworkPhotoSize {
  left: number;
  top: number;
}

export interface FieldworkPhotoNormalizedPoint {
  x: number;
  y: number;
}

export const MAX_FIELDWORK_PHOTO_COORDINATE = 10000;

export const getContainedImageFrame = (
  canvasSize: FieldworkPhotoSize,
  imageSize: FieldworkPhotoSize
): FieldworkPhotoRect => {
  if (
    canvasSize.height <= 0
    || canvasSize.width <= 0
    || imageSize.height <= 0
    || imageSize.width <= 0
  ) {
    return {
      height: canvasSize.height,
      left: 0,
      top: 0,
      width: canvasSize.width,
    };
  }

  const scale = Math.min(
    canvasSize.width / imageSize.width,
    canvasSize.height / imageSize.height
  );
  const width = imageSize.width * scale;
  const height = imageSize.height * scale;

  return {
    height,
    left: (canvasSize.width - width) / 2,
    top: (canvasSize.height - height) / 2,
    width,
  };
};

export const normalizeFieldworkPhotoCoordinate = (value: number): number =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_FIELDWORK_PHOTO_COORDINATE, Math.round(value)))
    : 0;

export const denormalizeFieldworkPhotoPoint = (
  point: FieldworkPhotoNormalizedPoint,
  imageFrame: FieldworkPhotoRect
) => ({
  x: imageFrame.left
    + ((point.x / MAX_FIELDWORK_PHOTO_COORDINATE) * imageFrame.width),
  y: imageFrame.top
    + ((point.y / MAX_FIELDWORK_PHOTO_COORDINATE) * imageFrame.height),
});
