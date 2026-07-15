import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';
import {
  hasKoreanFieldworkHandwriting,
  normalizeKoreanFieldworkHandwritingStrokes,
} from './korean-fieldwork-handwriting';
import {
  isKoreanHandwritingRecognitionAvailable,
  recognizeKoreanHandwriting,
} from '@/services/korean-handwriting-recognition';

interface Props {
  onUpdateResourceFields: (updates: Record<string, unknown>) => void;
  resource: Record<string, unknown>;
}

type RecognitionState = 'idle' | 'recognizing' | 'success' | 'error';

const KoreanFieldworkPenMemoTranscriptionPanel: React.FC<Props> = ({
  onUpdateResourceFields,
  resource,
}) => {
  const isPenMemo = resource.category === KOREAN_FIELDWORK_CATEGORIES.PEN_MEMO;
  const savedAutoTranscript = getText(resource.penMemoAutoTranscript);
  const savedReviewedTranscript = getText(resource.penMemoReviewedTranscript);
  const savedStatus = getText(resource.penMemoTranscriptionStatus) || 'pending';
  const hasHandwriting = useMemo(
    () => hasKoreanFieldworkHandwriting(
      normalizeKoreanFieldworkHandwritingStrokes(resource.penMemoStrokes)
    ),
    [resource.penMemoStrokes]
  );
  const [recognitionState, setRecognitionState] =
    useState<RecognitionState>('idle');
  const [message, setMessage] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [reviewedTranscript, setReviewedTranscript] =
    useState(savedReviewedTranscript || savedAutoTranscript);

  useEffect(() => {
    if (recognitionState === 'recognizing') return;
    setReviewedTranscript(savedReviewedTranscript || savedAutoTranscript);
  }, [recognitionState, savedAutoTranscript, savedReviewedTranscript]);

  if (!isPenMemo) return null;

  const recognize = async () => {
    if (!hasHandwriting) {
      setRecognitionState('error');
      setMessage('먼저 펜으로 메모를 써 주세요.');
      return;
    }
    if (!isKoreanHandwritingRecognitionAvailable()) {
      setRecognitionState('error');
      setMessage('최신 현장기록 앱을 설치하면 태블릿에서 필기를 읽을 수 있습니다.');
      return;
    }

    setRecognitionState('recognizing');
    setMessage('한국어 필기 모델을 준비하고 메모를 읽는 중입니다.');
    try {
      const result = await recognizeKoreanHandwriting(
        resource.penMemoStrokes,
        savedReviewedTranscript || savedAutoTranscript
      );
      if (!result.text) throw new Error('인식된 글자가 없습니다.');

      const nextCandidates = result.candidates.length > 0
        ? result.candidates
        : [result.text];
      setCandidates(nextCandidates);
      setReviewedTranscript(result.text);
      setRecognitionState('success');
      setMessage('자동으로 읽었습니다. 아래 글자를 확인하고 확정해 주세요.');
      onUpdateResourceFields({
        penMemoAutoTranscript: result.text,
        penMemoRecognitionEngine: result.engine,
        penMemoTranscriptionStatus: 'autoTranscribed',
      });
    } catch (error) {
      setRecognitionState('error');
      setMessage(getRecognitionErrorMessage(error));
      onUpdateResourceFields({ penMemoTranscriptionStatus: 'failed' });
    }
  };

  const confirmTranscript = () => {
    const text = reviewedTranscript.trim();
    if (!text) {
      setRecognitionState('error');
      setMessage('확정할 글자를 입력해 주세요.');
      return;
    }

    onUpdateResourceFields({
      penMemoReviewedTranscript: text,
      penMemoTranscriptionStatus: 'reviewed',
    });
    setRecognitionState('success');
    setMessage('검토한 글자를 확정했습니다. 필기 원본도 함께 보존됩니다.');
  };

  const statusLabel = getStatusLabel(savedStatus);

  return (
    <View style={styles.panel} testID="penMemoTranscriptionPanel">
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <MaterialIcons name="document-scanner" size={19} color="#344054" />
          <Text style={styles.title}>필기를 글자로 저장</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={styles.description}>
        펜 획 원본은 그대로 보관하고, 태블릿에서 읽은 글자를 보고서용 텍스트로 함께 저장합니다.
      </Text>

      <TouchableOpacity
        activeOpacity={0.84}
        disabled={recognitionState === 'recognizing'}
        onPress={recognize}
        style={[
          styles.recognizeButton,
          recognitionState === 'recognizing' && styles.buttonDisabled,
        ]}
        testID="penMemoRecognizeButton"
      >
        {recognitionState === 'recognizing'
          ? <ActivityIndicator color="#ffffff" size="small" />
          : <MaterialIcons name="auto-fix-high" size={18} color="#ffffff" />}
        <Text style={styles.recognizeButtonText}>
          {recognitionState === 'recognizing' ? '필기 읽는 중' : '이 필기 읽기'}
        </Text>
      </TouchableOpacity>

      {!!message && (
        <Text
          style={[
            styles.message,
            recognitionState === 'error' && styles.errorMessage,
          ]}
          testID="penMemoRecognitionMessage"
        >
          {message}
        </Text>
      )}

      {candidates.length > 1 && (
        <View style={styles.candidateRow} testID="penMemoRecognitionCandidates">
          {candidates.slice(0, 3).map((candidate) => (
            <TouchableOpacity
              key={candidate}
              activeOpacity={0.8}
              onPress={() => setReviewedTranscript(candidate)}
              style={styles.candidateButton}
            >
              <Text style={styles.candidateText}>{candidate}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {(!!savedAutoTranscript || recognitionState === 'success') && (
        <View style={styles.transcriptSection}>
          <Text style={styles.inputLabel}>읽은 글자 확인</Text>
          <TextInput
            multiline
            onChangeText={setReviewedTranscript}
            placeholder="인식된 글자를 확인하고 틀린 부분만 고쳐 주세요."
            placeholderTextColor="#98a2b3"
            style={styles.transcriptInput}
            testID="penMemoReviewedTranscriptInput"
            textAlignVertical="top"
            value={reviewedTranscript}
          />
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={confirmTranscript}
            style={styles.confirmButton}
            testID="penMemoConfirmTranscript"
          >
            <MaterialIcons name="task-alt" size={17} color="#ffffff" />
            <Text style={styles.confirmButtonText}>검토한 글자 확정</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const getText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'autoTranscribed': return '자동 인식됨';
    case 'reviewed': return '검토 완료';
    case 'failed': return '다시 읽기 필요';
    default: return '필기 대기';
  }
};

const getRecognitionErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (/download|network|MODEL_DOWNLOAD/i.test(message)) {
    return '한국어 필기 모델을 처음 준비하려면 잠시 인터넷 연결이 필요합니다. 연결 후 다시 눌러 주세요.';
  }
  return message || '필기를 읽지 못했습니다. 한 줄씩 또박또박 쓴 뒤 다시 시도해 주세요.';
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#f8fafc',
    borderColor: '#d0d5dd',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleRow: { alignItems: 'center', flexDirection: 'row' },
  title: { color: '#1d2939', fontSize: 15, fontWeight: '900', marginLeft: 7 },
  statusBadge: { backgroundColor: '#eef4ff', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { color: '#3538cd', fontSize: 10, fontWeight: '900' },
  description: { color: '#667085', fontSize: 12, lineHeight: 18, marginTop: 8 },
  recognizeButton: {
    alignItems: 'center',
    backgroundColor: '#2f6f4e',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 46,
  },
  buttonDisabled: { opacity: 0.68 },
  recognizeButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '900', marginLeft: 7 },
  message: { color: '#027a48', fontSize: 11, lineHeight: 17, marginTop: 8 },
  errorMessage: { color: '#b42318' },
  candidateRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3, marginTop: 8 },
  candidateButton: { backgroundColor: '#ffffff', borderColor: '#b2ccff', borderRadius: 6, borderWidth: 1, margin: 3, paddingHorizontal: 10, paddingVertical: 7 },
  candidateText: { color: '#1849a9', fontSize: 12, fontWeight: '800' },
  transcriptSection: { marginTop: 12 },
  inputLabel: { color: '#344054', fontSize: 12, fontWeight: '900' },
  transcriptInput: { backgroundColor: '#ffffff', borderColor: '#d0d5dd', borderRadius: 7, borderWidth: 1, color: '#1d2939', fontSize: 14, lineHeight: 21, marginTop: 6, minHeight: 100, padding: 10 },
  confirmButton: { alignItems: 'center', alignSelf: 'flex-end', backgroundColor: '#175cd3', borderRadius: 7, flexDirection: 'row', marginTop: 8, paddingHorizontal: 13, paddingVertical: 10 },
  confirmButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900', marginLeft: 6 },
});

export default KoreanFieldworkPenMemoTranscriptionPanel;
