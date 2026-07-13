import { SyncStatus } from 'idai-field-core';
import { getKoreanFieldworkDesktopHandoffState } from './korean-fieldwork-desktop-handoff-state';

describe('getKoreanFieldworkDesktopHandoffState', () => {
  it('does not claim records were handed off before a desktop is configured', () => {
    const state = getKoreanFieldworkDesktopHandoffState(
      SyncStatus.InSync,
      false
    );

    expect(state.label).toBe('데스크톱 연결 안 됨');
    expect(state.detail).toContain('같은 프로젝트 ID');
  });

  it('distinguishes document sync from original image and backup checks', () => {
    const state = getKoreanFieldworkDesktopHandoffState(
      SyncStatus.InSync,
      true
    );

    expect(state.label).toBe('기록 전송 완료');
    expect(state.detail).toContain('원본 사진');
    expect(state.detail).toContain('백업');
  });

  it('directs authorization failures to the desktop receive preparation step', () => {
    const state = getKoreanFieldworkDesktopHandoffState(
      SyncStatus.AuthorizationError,
      true
    );

    expect(state.label).toBe('프로젝트 수신 준비 필요');
    expect(state.detail).toContain('프로젝트 ID');
  });
});
