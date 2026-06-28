import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Button from '@/components/common/Button';

interface BoundaryFileImportModalProps {
  onClose: () => void;
  onImport: (filePath: string) => Promise<void>;
  visible: boolean;
}

const BoundaryFileImportModal: React.FC<BoundaryFileImportModalProps> = ({
  onClose,
  onImport,
  visible,
}) => {
  const [filePath, setFilePath] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isImporting, setIsImporting] = useState(false);

  const submitImport = async () => {
    const normalizedPath = filePath.trim();
    if (!normalizedPath) {
      setErrorMessage('태블릿 안의 .shp 또는 .dxf 파일 경로를 입력하세요.');
      return;
    }

    setErrorMessage(undefined);
    setIsImporting(true);
    try {
      await onImport(normalizedPath);
      setFilePath('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoider}
      >
        <Pressable
          onPress={onClose}
          style={styles.backdrop}
          testID="boundaryFileImportBackdrop"
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.card}
          >
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <MaterialIcons name="folder-open" size={22} color="#24495d" />
                <Text style={styles.title}>SHP/DXF/CSV 경계 가져오기</Text>
              </View>
              <Button
                icon={<Ionicons name="close-outline" size={18} />}
                onPress={onClose}
                testID="boundaryFileImportCloseButton"
                variant="transparent"
              />
            </View>
            <Text style={styles.description}>
              현재 지도에 남아 있지 않은 건물, 구 지형, 발굴 전 도면은
              태블릿 파일 경로에서 불러온 벡터 경계를 기준으로 저장합니다.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isImporting}
              onChangeText={setFilePath}
              placeholder="/storage/emulated/0/Download/boundary.shp"
              style={styles.input}
              testID="boundaryFileImportPathInput"
              value={filePath}
            />
            <Text style={styles.helpText}>
              .shp, .dxf, .geojson을 지원합니다. .prj가 같은 폴더에 있으면
              좌표계를 함께 읽습니다.
            </Text>
            {errorMessage && (
              <Text
                style={styles.errorText}
                testID="boundaryFileImportError"
              >
                {errorMessage}
              </Text>
            )}
            <View style={styles.actions}>
              <Button
                onPress={onClose}
                title="취소"
                variant="secondary"
              />
              <Button
                isDisabled={isImporting}
                onPress={() => { void submitImport(); }}
                testID="boundaryFileImportSubmitButton"
                title={isImporting ? '가져오는 중' : '경계로 저장'}
                variant="success"
              />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default BoundaryFileImportModal;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  return '파일을 읽어 경계를 만들지 못했습니다.';
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 6,
    maxWidth: 620,
    padding: 18,
    width: '100%',
  },
  description: {
    color: '#526272',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  errorText: {
    color: '#a43b3b',
    fontSize: 13,
    marginTop: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  helpText: {
    color: '#6b7780',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  input: {
    borderColor: '#b8c5cf',
    borderRadius: 5,
    borderWidth: 1,
    color: '#20313a',
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  keyboardAvoider: {
    flex: 1,
  },
  title: {
    color: '#20313a',
    fontSize: 18,
    fontWeight: '800',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
