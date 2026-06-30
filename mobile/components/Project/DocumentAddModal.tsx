import { Ionicons } from '@expo/vector-icons';
import { CategoryForm, Document, Tree } from 'idai-field-core';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import type { DimensionValue } from 'react-native';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ConfigurationContext } from '@/contexts/configuration-context';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import CategoryIcon from '@/components/common/CategoryIcon';
import Heading from '@/components/common/Heading';
import Input from '@/components/common/Input';
import TitleBar from '@/components/common/TitleBar';
import LabelsContext from '@/contexts/labels/labels-context';
import {
  getKoreanFieldworkAddOptions,
  KoreanFieldworkAddOption,
  KOREAN_FIELDWORK_HIERARCHY_HELP,
} from './korean-fieldwork-add-options';
import {
  getKoreanFieldworkCategoryLabel,
  KOREAN_FIELDWORK_CATEGORY_ORDER,
  KOREAN_FIELDWORK_CATEGORIES,
} from './korean-fieldwork-categories';
import { canCreateKoreanFieldworkChildRecord } from './korean-fieldwork-child-records';
import {
  getKoreanFieldworkFeatureInvestigationSteps,
  KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS,
} from './korean-fieldwork-feature-types';

const ICON_SIZE = 34;
const FEATURE_SKETCH_CANVAS_DEFAULT_SIZE = {
  height: 150,
  width: 260,
};
const FEATURE_SKETCH_SCALE_STEP = 10;
const FEATURE_SKETCH_ROTATION_STEP = 15;
const FEATURE_LOCATION_SKETCH_SHAPES = [
  { id: 'point', label: '점', icon: 'location-outline' },
  { id: 'polygon', label: '점 연결', icon: 'git-merge-outline' },
  { id: 'rectangle', label: '사각형', icon: 'square-outline' },
  { id: 'oval', label: '타원', icon: 'ellipse-outline' },
] as const;
type FeatureLocationSketchShape =
  typeof FEATURE_LOCATION_SKETCH_SHAPES[number]['id'];
type FeatureSketchPoint = {
  x: number;
  y: number;
};

interface AddModalProps {
  onAddCategory: (
    categoryName: string,
    parentDoc: Document | undefined,
    draftParams?: Record<string, string>
  ) => void;
  onClose: () => void;
  parentDoc?: Document;
}

const DocumentAddModal: React.FC<AddModalProps> = ({
  onAddCategory,
  onClose,
  parentDoc,
}) => {
  const config = useContext(ConfigurationContext);
  const { labels } = useContext(LabelsContext);
  const [expandedFeatureGuideType, setExpandedFeatureGuideType] = useState<string>();
  const [featureIdentifier, setFeatureIdentifier] = useState('');
  const [featureIdentifierWasRequested, setFeatureIdentifierWasRequested] =
    useState(false);
  const [isChoosingFeatureType, setIsChoosingFeatureType] = useState(false);
  const [featureLocationShape, setFeatureLocationShape] =
    useState<FeatureLocationSketchShape>('point');
  const [featureSketchPoints, setFeatureSketchPoints] = useState<FeatureSketchPoint[]>([]);
  const [featureSketchCenter, setFeatureSketchCenter] =
    useState<FeatureSketchPoint>({ x: 50, y: 50 });
  const [featureSketchScale, setFeatureSketchScale] = useState(100);
  const [featureSketchRotation, setFeatureSketchRotation] = useState(0);
  const [featureSketchWasEdited, setFeatureSketchWasEdited] = useState(false);
  const [featureSketchCanvasSize, setFeatureSketchCanvasSize] =
    useState(FEATURE_SKETCH_CANVAS_DEFAULT_SIZE);

  const isAllowedCategory = useCallback(
    (category: CategoryForm) =>
      !!parentDoc && canCreateKoreanFieldworkChildRecord(category, parentDoc, config),
    [parentDoc, config]
  );

  const allowedCategories = useMemo(
    () => Tree.flatten(config.getCategories())
      .filter(isAllowedCategory)
      .sort(compareKoreanFieldworkCategories),
    [config, isAllowedCategory]
  );

  const categoriesByName = useMemo(
    () => new Map(allowedCategories.map((category) => [category.name, category])),
    [allowedCategories]
  );

  const optionGroups = useMemo(
    () => getKoreanFieldworkAddOptions(
      parentDoc?.resource.category ?? '',
      allowedCategories.map((category) => category.name)
    ),
    [allowedCategories, parentDoc]
  );

  if (!parentDoc) return null;
  const parentCategory = config.getCategory(parentDoc.resource.category);
  if (!parentCategory) return null;
  const hasPrimaryOptions = optionGroups.primary.length > 0;
  const hasOtherOptions = optionGroups.other.length > 0;
  const parentCategoryLabel = labels?.get(parentCategory)
    ?? getKoreanFieldworkCategoryLabel(parentCategory.name);

  const openAddOption = (option: KoreanFieldworkAddOption) => {
    if (option.categoryName === KOREAN_FIELDWORK_CATEGORIES.FEATURE) {
      setExpandedFeatureGuideType(undefined);
      setFeatureIdentifier('');
      setFeatureIdentifierWasRequested(false);
      resetFeatureLocationSketch();
      setIsChoosingFeatureType(true);
      return;
    }

    onAddCategory(option.categoryName, parentDoc);
  };

  const renderOption = (option: KoreanFieldworkAddOption) => {
    const category = categoriesByName.get(option.categoryName);
    if (!category) return null;

    return (
      <TouchableOpacity
        key={option.categoryName}
        activeOpacity={0.86}
        style={styles.optionRow}
        onPress={() => openAddOption(option)}
        testID={`addCategory_${option.categoryName}`}
      >
        <CategoryIcon category={category} size={ICON_SIZE} />
        <View style={styles.optionText}>
          <Text style={styles.optionLabel}>{option.label}</Text>
          <Text style={styles.optionDescription} numberOfLines={2}>
            {option.description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#475467" />
      </TouchableOpacity>
    );
  };

  const resetFeatureLocationSketch = () => {
    setFeatureLocationShape('point');
    setFeatureSketchPoints([]);
    setFeatureSketchCenter({ x: 50, y: 50 });
    setFeatureSketchScale(100);
    setFeatureSketchRotation(0);
    setFeatureSketchWasEdited(false);
  };

  const selectFeatureLocationShape = (shape: FeatureLocationSketchShape) => {
    setFeatureLocationShape(shape);
    setFeatureSketchWasEdited(true);
    if (shape !== 'polygon' && featureSketchPoints.length > 1) {
      setFeatureSketchPoints([featureSketchCenter]);
    }
  };

  const handleFeatureSketchLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (height > 0 && width > 0) {
      setFeatureSketchCanvasSize({ height, width });
    }
  };

  const handleFeatureSketchPress = (event: GestureResponderEvent) => {
    const point = getSketchPointFromPress(
      event,
      featureSketchCanvasSize
    );
    setFeatureSketchWasEdited(true);

    if (featureLocationShape === 'polygon') {
      setFeatureSketchPoints((points) => [...points, point].slice(-8));
      setFeatureSketchCenter(point);
      return;
    }

    setFeatureSketchCenter(point);
    setFeatureSketchPoints([point]);
  };

  const adjustFeatureSketchScale = (delta: number) => {
    setFeatureSketchWasEdited(true);
    setFeatureSketchScale((scale) => clamp(scale + delta, 60, 160));
  };

  const adjustFeatureSketchRotation = (delta: number) => {
    setFeatureSketchWasEdited(true);
    setFeatureSketchRotation((rotation) => {
      const nextRotation = rotation + delta;
      if (nextRotation > 180) return nextRotation - 360;
      if (nextRotation < -180) return nextRotation + 360;
      return nextRotation;
    });
  };

  const undoFeatureSketchPoint = () => {
    setFeatureSketchWasEdited(true);
    if (featureLocationShape === 'polygon') {
      setFeatureSketchPoints((points) => points.slice(0, -1));
      return;
    }

    setFeatureSketchPoints([]);
  };

  const renderFeatureSketchPreview = () => {
    if (featureLocationShape === 'rectangle' || featureLocationShape === 'oval') {
      return (
        <View
          pointerEvents="none"
          style={[
            styles.featureSketchShapePreview,
            featureLocationShape === 'oval' && styles.featureSketchOvalPreview,
            getFeatureSketchShapeStyle(
              featureSketchCenter,
              featureSketchScale,
              featureSketchRotation
            ),
          ]}
          testID="featureSketchShapePreview"
        >
          <View style={styles.featureSketchShapeCenter} />
        </View>
      );
    }

    const points = featureLocationShape === 'polygon'
      ? featureSketchPoints
      : (featureSketchPoints.length > 0 ? featureSketchPoints : [featureSketchCenter]);

    return points.map((point, index) => (
      <View
        key={`${point.x}-${point.y}-${index}`}
        pointerEvents="none"
        style={[styles.featureSketchPoint, getFeatureSketchPointStyle(point)]}
        testID={`featureSketchPoint_${index}`}
      >
        <Text style={styles.featureSketchPointText}>{index + 1}</Text>
      </View>
    ));
  };

  const renderFeatureLocationSketchPanel = () => (
    <View style={styles.featureLocationPanel}>
      <View style={styles.featureLocationHeader}>
        <View>
          <Text style={styles.featureLocationTitle}>유구 위치 스케치</Text>
          <Text style={styles.featureLocationDetail}>
            대략 위치와 형태를 먼저 남기고, 지도 보정은 나중에 이어서 합니다.
          </Text>
        </View>
        {featureSketchWasEdited && (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={resetFeatureLocationSketch}
            style={styles.featureSketchIconButton}
            testID="featureSketchReset"
          >
            <Ionicons name="refresh-outline" size={17} color="#475467" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.featureSketchModeRow}>
        {FEATURE_LOCATION_SKETCH_SHAPES.map((shape) => {
          const isSelected = shape.id === featureLocationShape;

          return (
            <TouchableOpacity
              activeOpacity={0.84}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={shape.id}
              onPress={() => selectFeatureLocationShape(shape.id)}
              style={[
                styles.featureSketchModeButton,
                isSelected && styles.featureSketchModeButtonSelected,
              ]}
              testID={`featureSketchMode_${shape.id}`}
            >
              <Ionicons
                name={shape.icon as keyof typeof Ionicons.glyphMap}
                size={15}
                color={isSelected ? '#175cd3' : '#526272'}
              />
              <Text style={[
                styles.featureSketchModeText,
                isSelected && styles.featureSketchModeTextSelected,
              ]}>
                {shape.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Pressable
        onLayout={handleFeatureSketchLayout}
        onPress={handleFeatureSketchPress}
        style={styles.featureSketchCanvas}
        testID="featureLocationSketchCanvas"
      >
        <View pointerEvents="none" style={styles.featureSketchNorthBand}>
          <Text style={styles.featureSketchNorthText}>N</Text>
        </View>
        <View pointerEvents="none" style={styles.featureSketchVerticalAxis} />
        <View pointerEvents="none" style={styles.featureSketchHorizontalAxis} />
        {renderFeatureSketchPreview()}
      </Pressable>
      <View style={styles.featureSketchToolbar}>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={undoFeatureSketchPoint}
          style={styles.featureSketchToolButton}
          testID="featureSketchUndo"
        >
          <Ionicons name="arrow-undo-outline" size={16} color="#344054" />
          <Text style={styles.featureSketchToolText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => adjustFeatureSketchRotation(-FEATURE_SKETCH_ROTATION_STEP)}
          style={styles.featureSketchToolButton}
          testID="featureSketchRotateLeft"
        >
          <Ionicons name="return-up-back-outline" size={16} color="#344054" />
          <Text style={styles.featureSketchToolText}>회전</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => adjustFeatureSketchRotation(FEATURE_SKETCH_ROTATION_STEP)}
          style={styles.featureSketchToolButton}
          testID="featureSketchRotateRight"
        >
          <Ionicons name="return-up-forward-outline" size={16} color="#344054" />
          <Text style={styles.featureSketchToolText}>회전</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => adjustFeatureSketchScale(-FEATURE_SKETCH_SCALE_STEP)}
          style={styles.featureSketchToolButton}
          testID="featureSketchScaleDown"
        >
          <Ionicons name="remove-outline" size={16} color="#344054" />
          <Text style={styles.featureSketchToolText}>크기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => adjustFeatureSketchScale(FEATURE_SKETCH_SCALE_STEP)}
          style={styles.featureSketchToolButton}
          testID="featureSketchScaleUp"
        >
          <Ionicons name="add-outline" size={16} color="#344054" />
          <Text style={styles.featureSketchToolText}>크기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFeatureTypePicker = () => {
    const featureCategory = categoriesByName.get(KOREAN_FIELDWORK_CATEGORIES.FEATURE);
    if (!featureCategory) return null;

    const toggleFeatureGuide = (featureType: string) => {
      setExpandedFeatureGuideType((currentType) =>
        currentType === featureType ? undefined : featureType);
    };
    const normalizedFeatureIdentifier = featureIdentifier.trim();
    const canCreateFeature = normalizedFeatureIdentifier.length > 0;

    const updateFeatureIdentifier = (value: string) => {
      setFeatureIdentifier(value);
      if (value.trim().length > 0) setFeatureIdentifierWasRequested(false);
    };

    const createFeature = (featureType: string) => {
      if (!canCreateFeature) {
        setFeatureIdentifierWasRequested(true);
        return;
      }

      onAddCategory(
        KOREAN_FIELDWORK_CATEGORIES.FEATURE,
        parentDoc,
        {
          featureType,
          identifier: normalizedFeatureIdentifier,
          ...getFeatureLocationSketchDraftParams({
            center: featureSketchCenter,
            isEdited: featureSketchWasEdited,
            points: featureSketchPoints,
            rotation: featureSketchRotation,
            scale: featureSketchScale,
            shape: featureLocationShape,
          }),
        }
      );
    };

    const renderFeatureInvestigationGuide = (featureType: string) => (
      <View style={styles.featureGuide}>
        <Text style={styles.featureGuideTitle}>조사 참고</Text>
        <Text style={styles.featureGuideNote}>
          현장 상황에 맞게 바꿔도 되는 참고용 순서입니다.
        </Text>
        <Text style={styles.featureGuideSteps} numberOfLines={2}>
          {getKoreanFieldworkFeatureInvestigationSteps(featureType)
            .slice(0, 3)
            .join(' → ')}
        </Text>
      </View>
    );

    return (
      <View>
        <View style={styles.parentPanel}>
          <Text style={styles.parentLabel} numberOfLines={1}>
            포함 위치: {parentDoc.resource.identifier}
          </Text>
          <Text style={styles.parentMeta}>
            성격이 보이면 고르고, 애매하면 유구로 먼저 시작합니다.
          </Text>
          <Text style={styles.hierarchyHelp}>
            {KOREAN_FIELDWORK_HIERARCHY_HELP}
          </Text>
        </View>
        <View style={styles.featureNamePanel}>
          <Input
            autoFocus
            isValid={!featureIdentifierWasRequested || canCreateFeature}
            invalidText="유구명을 먼저 입력하세요."
            label="유구명"
            onChangeText={updateFeatureIdentifier}
            placeholder="예: 1호 수혈"
            returnKeyType="done"
            testID="featureIdentifierInput"
            value={featureIdentifier}
          />
          <Text style={styles.featureNameHint}>
            유구명만 먼저 적어도 됩니다. 성격과 세부 정보는 조사하면서 계속 채우고 고칠 수 있습니다.
          </Text>
        </View>
        {renderFeatureLocationSketchPanel()}
        <View style={styles.startUnknownFeature}>
          <View style={styles.featureTypeHeader}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => createFeature('unknown')}
              style={[
                styles.featureTypeCreateArea,
                !canCreateFeature && styles.featureTypeCreateAreaWaiting,
              ]}
              testID="featureType_startUnknown"
            >
              <Ionicons name="add-circle-outline" size={22} color="#027a48" />
              <View style={styles.featureTypeText}>
                <Text style={styles.featureTypeLabel} numberOfLines={1}>
                  유구로 바로 만들기
                </Text>
                <Text style={styles.featureTypeDescription} numberOfLines={2}>
                  시기와 성격은 조사하면서 다시 고칠 수 있습니다.
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityLabel="유구 조사 참고 보기"
              onPress={() => toggleFeatureGuide('startUnknown')}
              style={styles.featureHelpButton}
              testID="featureTypeHelp_startUnknown"
            >
              <Ionicons
                name={expandedFeatureGuideType === 'startUnknown'
                  ? 'close-circle-outline'
                  : 'help-circle-outline'}
                size={22}
                color="#2f6f4e"
              />
            </TouchableOpacity>
          </View>
          {expandedFeatureGuideType === 'startUnknown'
            && renderFeatureInvestigationGuide('unknown')}
        </View>
        <View style={styles.featureTypeGrid}>
          {KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS.map((option) => (
            <View
              key={option.value}
              style={styles.featureTypeOption}
            >
              <View style={styles.featureTypeHeader}>
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={() => createFeature(option.value)}
                  style={[
                    styles.featureTypeCreateArea,
                    !canCreateFeature && styles.featureTypeCreateAreaWaiting,
                  ]}
                  testID={`featureType_${option.value}`}
                >
                  <CategoryIcon category={featureCategory} size={24} />
                  <View style={styles.featureTypeText}>
                    <Text style={styles.featureTypeLabel} numberOfLines={1}>
                      {option.label}
                    </Text>
                    <Text style={styles.featureTypeDescription} numberOfLines={2}>
                      {option.description}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityLabel={`${option.label} 조사 참고 보기`}
                  onPress={() => toggleFeatureGuide(option.value)}
                  style={styles.featureHelpButton}
                  testID={`featureTypeHelp_${option.value}`}
                >
                  <Ionicons
                    name={expandedFeatureGuideType === option.value
                      ? 'close-circle-outline'
                      : 'help-circle-outline'}
                    size={22}
                    color="#475467"
                  />
                </TouchableOpacity>
              </View>
              {expandedFeatureGuideType === option.value
                && renderFeatureInvestigationGuide(option.value)}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal
      onRequestClose={onClose}
      animationType="fade"
      transparent
      visible={true}
    >
      <Pressable
        onPress={onClose}
        style={styles.container}
        testID="documentAddModalBackdrop"
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={styles.cardShell}
        >
          <Card style={styles.card}>
          <TitleBar
            title={
              <>
                <CategoryIcon category={parentCategory} size={25} />
                <Heading style={styles.heading}>
                  {isChoosingFeatureType ? '유구 추가' : '기록 종류 선택'}
                </Heading>
              </>
            }
            left={
              <Button
                title={isChoosingFeatureType ? '뒤로' : '닫기'}
                variant="transparent"
                icon={<Ionicons
                  name={isChoosingFeatureType ? 'chevron-back-outline' : 'close-outline'}
                  size={16}
                />}
                onPress={isChoosingFeatureType
                  ? () => {
                    setExpandedFeatureGuideType(undefined);
                    setFeatureIdentifierWasRequested(false);
                    resetFeatureLocationSketch();
                    setIsChoosingFeatureType(false);
                  }
                  : onClose}
              />
            }
          />
          <ScrollView style={styles.categories}>
            {isChoosingFeatureType ? renderFeatureTypePicker() : (
              <>
                <View style={styles.parentPanel}>
                  <Text style={styles.parentLabel} numberOfLines={1}>
                    포함 위치: {parentDoc.resource.identifier}
                  </Text>
                  <Text style={styles.parentMeta}>
                    {parentCategoryLabel}에 포함할 기록을 고르세요.
                  </Text>
                  <Text style={styles.hierarchyHelp}>
                    {KOREAN_FIELDWORK_HIERARCHY_HELP}
                  </Text>
                </View>

                {hasPrimaryOptions && (
                  <View style={styles.optionSection}>
                    <Text style={styles.sectionTitle}>권장 기록</Text>
                    {optionGroups.primary.map(renderOption)}
                  </View>
                )}

                {hasOtherOptions && (
                  <View style={styles.optionSection}>
                    <Text style={styles.sectionTitle}>그 밖의 기록</Text>
                    {optionGroups.other.map(renderOption)}
                  </View>
                )}

                {!hasPrimaryOptions && !hasOtherOptions && (
                  <View style={styles.emptyState}>
                    <Ionicons name="information-circle-outline" size={24} color="#667085" />
                    <Text style={styles.emptyTitle}>
                      이어 만들 수 있는 기록이 없습니다
                    </Text>
                    <Text style={styles.emptyText}>
                      지금 조사 방식에 맞는 현재 범위를 먼저 선택해 주세요.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const compareKoreanFieldworkCategories = (
  categoryA: CategoryForm,
  categoryB: CategoryForm
): number => {
  const indexA = KOREAN_FIELDWORK_CATEGORY_ORDER.indexOf(categoryA.name);
  const indexB = KOREAN_FIELDWORK_CATEGORY_ORDER.indexOf(categoryB.name);
  const orderA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
  const orderB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;

  return orderA === orderB
    ? categoryA.name.localeCompare(categoryB.name)
    : orderA - orderB;
};

const getFeatureLocationSketchDraftParams = ({
  center,
  isEdited,
  points,
  rotation,
  scale,
  shape,
}: {
  center: FeatureSketchPoint;
  isEdited: boolean;
  points: FeatureSketchPoint[];
  rotation: number;
  scale: number;
  shape: FeatureLocationSketchShape;
}): Record<string, string> => {
  if (!isEdited) return {};

  const sketchPoints = shape === 'polygon'
    ? points
    : (points.length > 0 ? points : [center]);
  const payload = {
    version: 1,
    shape,
    center: roundSketchPoint(center),
    points: sketchPoints.map(roundSketchPoint),
    rotation,
    scale,
  };
  const note = getFeatureLocationSketchNote(payload);

  return {
    featureGeometryRevisionNote: note,
    featureLocationSketch: JSON.stringify(payload),
    shortDescription: note,
  };
};

const getFeatureLocationSketchNote = ({
  center,
  points,
  rotation,
  scale,
  shape,
}: {
  center: FeatureSketchPoint;
  points: FeatureSketchPoint[];
  rotation: number;
  scale: number;
  shape: FeatureLocationSketchShape;
}): string => {
  if (shape === 'polygon') {
    return `위치 스케치: 점 연결 ${points.length}점, 마지막 ${formatSketchPoint(
      points[points.length - 1] ?? center
    )}`;
  }

  return `위치 스케치: ${getFeatureLocationSketchShapeLabel(shape)}, 중심 ${formatSketchPoint(
    center
  )}, 크기 ${scale}%, 회전 ${rotation}°`;
};

const getFeatureLocationSketchShapeLabel = (
  shape: FeatureLocationSketchShape
): string => {
  switch (shape) {
    case 'oval':
      return '타원';
    case 'polygon':
      return '점 연결';
    case 'rectangle':
      return '사각형';
    default:
      return '점';
  }
};

const getSketchPointFromPress = (
  event: GestureResponderEvent,
  canvasSize: { height: number; width: number }
): FeatureSketchPoint => {
  const width = Math.max(1, canvasSize.width);
  const height = Math.max(1, canvasSize.height);

  return {
    x: clamp((event.nativeEvent.locationX / width) * 100, 0, 100),
    y: clamp((event.nativeEvent.locationY / height) * 100, 0, 100),
  };
};

const getFeatureSketchPointStyle = (point: FeatureSketchPoint) => ({
  left: toPercent(point.x),
  top: toPercent(point.y),
});

const getFeatureSketchShapeStyle = (
  center: FeatureSketchPoint,
  scale: number,
  rotation: number
) => ({
  left: toPercent(center.x),
  top: toPercent(center.y),
  transform: [
    { scale: scale / 100 },
    { rotate: `${rotation}deg` },
  ],
});

const roundSketchPoint = (point: FeatureSketchPoint): FeatureSketchPoint => ({
  x: Math.round(point.x),
  y: Math.round(point.y),
});

const formatSketchPoint = (point: FeatureSketchPoint): string =>
  `${Math.round(point.x)}%, ${Math.round(point.y)}%`;

const toPercent = (value: number): DimensionValue =>
  `${value}%` as DimensionValue;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.42)',
  },
  card: {
    maxHeight: '84%',
    padding: 10,
    width: '72%',
  },
  cardShell: {
    alignItems: 'center',
    width: '100%',
  },
  heading: {
    marginLeft: 10,
  },
  categories: {
    margin: 10,
  },
  parentPanel: {
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  parentLabel: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '800',
  },
  parentMeta: {
    color: '#526272',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  hierarchyHelp: {
    color: '#2f6f4e',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  featureNamePanel: {
    backgroundColor: 'white',
    borderColor: '#b9c7d5',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  featureNameHint: {
    color: '#526272',
    fontSize: 12,
    lineHeight: 16,
    marginHorizontal: 5,
    marginTop: 2,
  },
  featureLocationPanel: {
    backgroundColor: '#f8fafc',
    borderColor: '#b9c7d5',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  featureLocationHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  featureLocationTitle: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '900',
  },
  featureLocationDetail: {
    color: '#526272',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  featureSketchIconButton: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    marginLeft: 8,
    width: 30,
  },
  featureSketchModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  featureSketchModeButton: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 5,
    marginRight: 6,
    minHeight: 32,
    paddingHorizontal: 8,
  },
  featureSketchModeButtonSelected: {
    backgroundColor: '#eff8ff',
    borderColor: '#84caff',
  },
  featureSketchModeText: {
    color: '#526272',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  featureSketchModeTextSelected: {
    color: '#175cd3',
  },
  featureSketchCanvas: {
    backgroundColor: 'white',
    borderColor: '#98a2b3',
    borderRadius: 6,
    borderWidth: 1,
    height: 150,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  featureSketchNorthBand: {
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    borderBottomColor: '#d0d5dd',
    borderBottomWidth: 1,
    height: 20,
    justifyContent: 'center',
  },
  featureSketchNorthText: {
    color: '#2f6f4e',
    fontSize: 11,
    fontWeight: '900',
  },
  featureSketchVerticalAxis: {
    backgroundColor: '#e4e7ec',
    bottom: 0,
    left: '50%',
    position: 'absolute',
    top: 20,
    width: 1,
  },
  featureSketchHorizontalAxis: {
    backgroundColor: '#e4e7ec',
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  featureSketchPoint: {
    alignItems: 'center',
    backgroundColor: '#175cd3',
    borderColor: 'white',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    marginLeft: -10,
    marginTop: -10,
    position: 'absolute',
    width: 20,
  },
  featureSketchPointText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
  },
  featureSketchShapePreview: {
    alignItems: 'center',
    backgroundColor: 'rgba(47, 111, 78, 0.18)',
    borderColor: '#2f6f4e',
    borderRadius: 5,
    borderWidth: 2,
    height: 46,
    justifyContent: 'center',
    marginLeft: -36,
    marginTop: -23,
    position: 'absolute',
    width: 72,
  },
  featureSketchOvalPreview: {
    borderRadius: 24,
  },
  featureSketchShapeCenter: {
    backgroundColor: '#2f6f4e',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  featureSketchToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 7,
  },
  featureSketchToolButton: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginRight: 6,
    minHeight: 30,
    paddingHorizontal: 8,
  },
  featureSketchToolText: {
    color: '#344054',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 3,
  },
  optionSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  optionRow: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionText: {
    flex: 1,
    marginLeft: 10,
    paddingRight: 10,
  },
  optionLabel: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '900',
  },
  optionDescription: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  featureTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureTypeOption: {
    alignItems: 'stretch',
    backgroundColor: 'white',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 76,
    paddingHorizontal: 10,
    paddingVertical: 9,
    width: '49%',
  },
  startUnknownFeature: {
    alignItems: 'stretch',
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 70,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  featureTypeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  featureTypeCreateArea: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minHeight: 52,
  },
  featureTypeCreateAreaWaiting: {
    opacity: 0.58,
  },
  featureTypeText: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
  },
  featureTypeLabel: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '900',
  },
  featureTypeDescription: {
    color: '#667085',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  featureHelpButton: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    marginLeft: 8,
    width: 34,
  },
  featureGuide: {
    borderTopColor: '#eaecf0',
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 7,
  },
  featureGuideTitle: {
    color: '#475467',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 3,
  },
  featureGuideNote: {
    color: '#667085',
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 3,
  },
  featureGuideSteps: {
    color: '#344054',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  emptyState: {
    alignItems: 'center',
    borderColor: '#d0d5dd',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyTitle: {
    color: '#27343b',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
  },
  emptyText: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default DocumentAddModal;
