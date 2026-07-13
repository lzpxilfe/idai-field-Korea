import { SyncStatus } from 'idai-field-core';

export type KoreanFieldworkDesktopHandoffTone =
  'neutral'|'active'|'success'|'warning';

export type KoreanFieldworkDesktopHandoffIcon =
  'cloud-off-outline'
  |'cloud-sync-outline'
  |'cloud-upload-outline'
  |'cloud-download-outline'
  |'cloud-check-outline'
  |'cloud-alert'
  |'cloud-outline';

export interface KoreanFieldworkDesktopHandoffState {
  label: string;
  detail: string;
  icon: KoreanFieldworkDesktopHandoffIcon;
  tone: KoreanFieldworkDesktopHandoffTone;
}

export const getKoreanFieldworkDesktopHandoffState = (
  status: SyncStatus,
  connected: boolean
): KoreanFieldworkDesktopHandoffState => {
  if (!connected) {
    return {
      label: '데스크톱 연결 안 됨',
      detail: '데스크톱에서 같은 프로젝트 ID를 받을 준비를 한 뒤 연결하세요.',
      icon: 'cloud-off-outline',
      tone: 'neutral',
    };
  }

  switch (status) {
    case SyncStatus.Connecting:
      return {
        label: '데스크톱 확인 중',
        detail: '같은 Wi-Fi의 데스크톱과 프로젝트 저장소를 확인하고 있습니다.',
        icon: 'cloud-sync-outline',
        tone: 'active',
      };
    case SyncStatus.Pushing:
      return {
        label: '현장 기록 전송 중',
        detail: '태블릿에서 추가한 기록을 데스크톱으로 보내고 있습니다.',
        icon: 'cloud-upload-outline',
        tone: 'active',
      };
    case SyncStatus.Pulling:
      return {
        label: '데스크톱 변경 받는 중',
        detail: '사무실에서 정리한 최신 기록을 태블릿으로 받고 있습니다.',
        icon: 'cloud-download-outline',
        tone: 'active',
      };
    case SyncStatus.InSync:
      return {
        label: '기록 전송 완료',
        detail: '문서 기록은 일치합니다. 원본 사진 수신과 데스크톱 백업도 확인하세요.',
        icon: 'cloud-check-outline',
        tone: 'success',
      };
    case SyncStatus.AuthenticationError:
      return {
        label: '비밀번호 확인 필요',
        detail: '데스크톱 설정에 표시된 연결 비밀번호를 다시 입력하세요.',
        icon: 'cloud-alert',
        tone: 'warning',
      };
    case SyncStatus.AuthorizationError:
      return {
        label: '프로젝트 수신 준비 필요',
        detail: '데스크톱에서 이 프로젝트 ID를 받을 준비했는지 확인하세요.',
        icon: 'cloud-alert',
        tone: 'warning',
      };
    case SyncStatus.Error:
      return {
        label: '연결 확인 필요',
        detail: '데스크톱 실행 상태, 같은 Wi-Fi, 서버 URL을 확인하세요.',
        icon: 'cloud-alert',
        tone: 'warning',
      };
    default:
      return {
        label: '동기화 대기',
        detail: '데스크톱을 실행하면 현장 기록 전송을 다시 시작합니다.',
        icon: 'cloud-outline',
        tone: 'neutral',
      };
  }
};
