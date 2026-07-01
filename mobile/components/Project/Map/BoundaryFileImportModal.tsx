import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, {
  useEffect,
  useState,
} from 'react';
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

  useEffect(() => {
    if (visible) {
      setErrorMessage(undefined);
      return;
    }

    setErrorMessage(undefined);
    setFilePath('');
    setIsImporting(false);
  }, [visible]);

  const pickBoundaryFile = async () => {
    setErrorMessage(undefined);
    try {
      const DocumentPicker = require('expo-document-picker') as typeof import(
        'expo-document-picker'
      );
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          'application/geo+json',
          'application/json',
          'application/octet-stream',
          'application/x-esri-shape',
          'application/dxf',
          'image/vnd.dxf',
          'text/plain',
          '*/*',
        ],
      });
      if (!result.canceled) setFilePath(result.assets[0]?.uri ?? '');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const submitImport = async () => {
    const normalizedPath = filePath.trim();
    if (!normalizedPath) {
      setErrorMessage('태블릿에서 .shp, .dxf, .geojson 파일을 선택하거나 파일 경로를 입력하세요.');
      return;
    }

    setErrorMessage(undefined);
    setIsImporting(true);
    try {
      await onImport(normalizedPath);
      setFilePath('');
    } catch (error) {
      setErrorMessage(getImportErrorMessage(error));
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
                <Text style={styles.title}>SHP/DXF/GeoJSON 경계 가져오기</Text>
              </View>
              <Button
                icon={<Ionicons name="close-outline" size={18} />}
                onPress={onClose}
                testID="boundaryFileImportCloseButton"
                variant="transparent"
              />
            </View>
            <Text style={styles.description}>
              태블릿 안의 경계 파일을 선택하거나 파일 경로를 입력해 조사 경계로 저장합니다.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isImporting}
              onChangeText={setFilePath}
              placeholder="/storage/emulated/0/Android/data/kr.idai.fieldmobile/files/boundary.shp"
              style={styles.input}
              testID="boundaryFileImportPathInput"
              value={filePath}
            />
            <View style={styles.pickRow}>
              <Button
                icon={<MaterialIcons name="folder-open" size={18} />}
                isDisabled={isImporting}
                onPress={() => { void pickBoundaryFile(); }}
                testID="boundaryFileImportPickButton"
                title="파일 선택"
                variant="secondary"
              />
            </View>
            <Text style={styles.helpText}>
              .shp, .dxf, .geojson을 지원합니다. 일반 Download 경로가 막히면 파일 선택을 사용하세요.
              .prj 좌표계 파일까지 함께 쓰려면 앱이 읽을 수 있는 같은 폴더의 경로를 직접 입력하세요.
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

const getImportErrorMessage = (error: unknown): string => {
  const message = getErrorMessage(error);
  if (
    message.includes("isn't readable")
    || message.includes('readAsStringAsync')
  ) {
    return `${message}\nAndroid가 직접 경로 접근을 막았습니다. 파일 선택으로 가져오거나 앱 전용 폴더 경로를 사용하세요.`;
  }

  return message;
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
  pickRow: {
    alignItems: 'flex-start',
    marginTop: 8,
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
