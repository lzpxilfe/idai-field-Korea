import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import KoreanFieldworkPenMemoTranscriptionPanel
  from './KoreanFieldworkPenMemoTranscriptionPanel';
import {
  isKoreanHandwritingRecognitionAvailable,
  recognizeKoreanHandwriting,
} from '@/services/korean-handwriting-recognition';

jest.mock('@/services/korean-handwriting-recognition', () => ({
  isKoreanHandwritingRecognitionAvailable: jest.fn(),
  recognizeKoreanHandwriting: jest.fn(),
}));

const mockIsAvailable = isKoreanHandwritingRecognitionAvailable as jest.Mock;
const mockRecognize = recognizeKoreanHandwriting as jest.Mock;

describe('KoreanFieldworkPenMemoTranscriptionPanel', () => {
  beforeEach(() => {
    mockIsAvailable.mockReturnValue(true);
    mockRecognize.mockResolvedValue({
      candidates: ['바닥면 원형 확인', '바닥면 윤곽 확인'],
      engine: 'ml-kit-digital-ink-ko-19',
      modelDownloaded: true,
      text: '바닥면 원형 확인',
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('recognizes pen strokes and preserves automatic and reviewed text separately', async () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkPenMemoTranscriptionPanel
        onUpdateResourceFields={onUpdateResourceFields}
        resource={{
          category: 'PenMemo',
          penMemoStrokes: JSON.stringify({
            version: 1,
            strokes: [{ points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] }],
          }),
          penMemoTranscriptionStatus: 'pending',
        }}
      />
    );

    fireEvent.press(getByTestId('penMemoRecognizeButton'));

    await waitFor(() => expect(mockRecognize).toHaveBeenCalled());
    expect(onUpdateResourceFields).toHaveBeenCalledWith({
      penMemoAutoTranscript: '바닥면 원형 확인',
      penMemoRecognitionEngine: 'ml-kit-digital-ink-ko-19',
      penMemoTranscriptionStatus: 'autoTranscribed',
    });

    fireEvent.changeText(
      getByTestId('penMemoReviewedTranscriptInput'),
      '바닥면에서 원형 윤곽 확인'
    );
    fireEvent.press(getByTestId('penMemoConfirmTranscript'));

    expect(onUpdateResourceFields).toHaveBeenLastCalledWith({
      penMemoReviewedTranscript: '바닥면에서 원형 윤곽 확인',
      penMemoTranscriptionStatus: 'reviewed',
    });
  });

  it('keeps recognition disabled until handwriting exists', () => {
    const onUpdateResourceFields = jest.fn();
    const { getByTestId } = render(
      <KoreanFieldworkPenMemoTranscriptionPanel
        onUpdateResourceFields={onUpdateResourceFields}
        resource={{
          category: 'PenMemo',
          penMemoStrokes: '{"version":1,"strokes":[]}',
        }}
      />
    );

    fireEvent.press(getByTestId('penMemoRecognizeButton'));

    expect(getByTestId('penMemoRecognitionMessage').props.children)
      .toBe('먼저 펜으로 메모를 써 주세요.');
    expect(mockRecognize).not.toHaveBeenCalled();
    expect(onUpdateResourceFields).not.toHaveBeenCalled();
  });

  it('does not appear on non memo records', () => {
    const { queryByTestId } = render(
      <KoreanFieldworkPenMemoTranscriptionPanel
        onUpdateResourceFields={jest.fn()}
        resource={{ category: 'Feature' }}
      />
    );

    expect(queryByTestId('penMemoTranscriptionPanel')).toBeNull();
  });
});
