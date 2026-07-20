import { Document } from 'idai-field-core';
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KoreanFieldworkHandwritingStroke,
  KoreanFieldworkHandwritingTool,
  normalizeKoreanFieldworkHandwritingStrokes,
  serializeKoreanFieldworkHandwriting,
} from './korean-fieldwork-handwriting';
import { getKoreanFieldworkFeatureSketchDrawingBackground }
  from './korean-fieldwork-feature-sketch-background';
import KoreanFieldworkFullscreenDrawingModal, {
  DEFAULT_FIELDWORK_BRUSH_COLOR,
  DEFAULT_FIELDWORK_BRUSH_WIDTH,
  DEFAULT_FIELDWORK_DRAWING_TOOL,
} from './KoreanFieldworkFullscreenDrawingModal';

interface Props {
  document: Document;
  isVisible: boolean;
  onClose: (savedDocument?: Document) => void;
  onSave: (updatedDocument: Document) => Promise<Document>;
}

const FEATURE_STROKES_FIELD = 'featureFreeDrawingStrokes';
const FEATURE_UPDATED_AT_FIELD = 'featureFreeDrawingUpdatedAt';

export const mergeKoreanFieldworkFeatureFreeSketch = (
  latestDocument: Document,
  sketchDocument: Document
): Document => ({
  ...latestDocument,
  resource: {
    ...latestDocument.resource,
    [FEATURE_STROKES_FIELD]:
      (sketchDocument.resource as Record<string, unknown>)[FEATURE_STROKES_FIELD],
    [FEATURE_UPDATED_AT_FIELD]:
      (sketchDocument.resource as Record<string, unknown>)[FEATURE_UPDATED_AT_FIELD],
  },
});

const KoreanFieldworkFeatureFreeSketchModal: React.FC<Props> = ({
  document,
  isVisible,
  onClose,
  onSave,
}) => {
  const sourceStrokes = useMemo(
    () => normalizeKoreanFieldworkHandwritingStrokes(
      (document.resource as Record<string, unknown>)[FEATURE_STROKES_FIELD]
    ),
    [document.resource]
  );
  const background = useMemo(
    () => getKoreanFieldworkFeatureSketchDrawingBackground(
      (document.resource as Record<string, unknown>).featureLocationSketch
    ),
    [document.resource]
  );
  const [strokes, setStrokes] =
    useState<KoreanFieldworkHandwritingStroke[]>(sourceStrokes);
  const [brushColor, setBrushColor] = useState(DEFAULT_FIELDWORK_BRUSH_COLOR);
  const [brushWidth, setBrushWidth] = useState(DEFAULT_FIELDWORK_BRUSH_WIDTH);
  const [drawingTool, setDrawingTool] =
    useState<KoreanFieldworkHandwritingTool>(DEFAULT_FIELDWORK_DRAWING_TOOL);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const wasVisibleRef = useRef(false);
  const initialSerializedStrokesRef = useRef(
    serializeKoreanFieldworkHandwriting(sourceStrokes)
  );

  useEffect(() => {
    if (isVisible && !wasVisibleRef.current) {
      setStrokes(sourceStrokes);
      initialSerializedStrokesRef.current =
        serializeKoreanFieldworkHandwriting(sourceStrokes);
      setBrushColor(DEFAULT_FIELDWORK_BRUSH_COLOR);
      setBrushWidth(DEFAULT_FIELDWORK_BRUSH_WIDTH);
      setDrawingTool(DEFAULT_FIELDWORK_DRAWING_TOOL);
      setIsSaving(false);
      setSaveError(undefined);
    }
    if (!isVisible && wasVisibleRef.current) {
      setIsSaving(false);
      setSaveError(undefined);
    }
    wasVisibleRef.current = isVisible;
  }, [isVisible, sourceStrokes]);

  const closeEditor = async () => {
    if (isSaving) return;

    const serializedStrokes = serializeKoreanFieldworkHandwriting(strokes);
    if (serializedStrokes === initialSerializedStrokesRef.current) {
      onClose();
      return;
    }

    setIsSaving(true);
    setSaveError(undefined);
    try {
      const savedDocument = await onSave({
        ...document,
        resource: {
          ...document.resource,
          [FEATURE_STROKES_FIELD]: serializedStrokes,
          [FEATURE_UPDATED_AT_FIELD]: new Date().toISOString(),
        },
      });
      initialSerializedStrokesRef.current = serializedStrokes;
      setIsSaving(false);
      onClose(savedDocument);
    } catch (error) {
      setIsSaving(false);
      setSaveError(getSaveErrorText(error));
    }
  };

  return (
    <KoreanFieldworkFullscreenDrawingModal
      background={background}
      brushColor={brushColor}
      brushWidth={brushWidth}
      drawingTool={drawingTool}
      isCloseDisabled={isSaving}
      isVisible={isVisible}
      onBrushColorChange={(color) => {
        setBrushColor(color);
        setDrawingTool('pen');
      }}
      onBrushWidthChange={setBrushWidth}
      onClose={() => void closeEditor()}
      onDrawingToolChange={setDrawingTool}
      onUpdateStrokes={setStrokes}
      statusText={isSaving
        ? '유구 스케치를 저장하는 중입니다.'
        : saveError}
      statusTone={saveError ? 'error' : 'neutral'}
      strokes={strokes}
      testIDPrefix="featureParentSketch"
      title="유구 형태 자유 스케치"
    />
  );
};

const getSaveErrorText = (error: unknown): string => {
  const detail = getErrorMessage(error);

  return detail
    ? `유구 스케치를 저장하지 못했습니다: ${detail}`
    : '유구 스케치를 저장하지 못했습니다. 다시 닫아 재시도해 주세요.';
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message.trim();
  if (typeof error === 'string') return error.trim();
  if (error && typeof error === 'object' && 'message' in error) {
    return getErrorMessage((error as { message?: unknown }).message);
  }

  return '';
};

export default KoreanFieldworkFeatureFreeSketchModal;
