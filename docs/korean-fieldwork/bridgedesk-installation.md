# BridgeDesk 설치와 실행 입구

BridgeDesk는 태블릿 발굴 현장기록을 데스크톱에서 검수하고 HWP 보고서 초안으로 넘기기 위한 보조 도구입니다. 기존 iDAI.field 앱을 대체하지 않고, 한국어 발굴조사 업무 흐름을 정리하기 위한 별도 실험 도구로 `tools/bridgedesk` 아래에 묶었습니다.

## 바로 실행

저장소 루트에서 아래 파일을 더블클릭합니다.

- `START_BRIDGEDESK_DESKTOP.cmd`: 데스크톱 검수 화면 실행
- `START_BRIDGEDESK_TABLET_SERVER.cmd`: 태블릿 입력 화면 서버 실행
- `EXPORT_BRIDGEDESK_HWP_REPORT.cmd`: HWP 보고서 작성용 TXT/HTML/CSV/JSON 생성

자세한 안내는 `tools/bridgedesk/README.md`와 `tools/bridgedesk/docs/INSTALL_DESKTOP.md`, `tools/bridgedesk/docs/INSTALL_TABLET.md`를 확인합니다.

## 태블릿 자료 흐름

1. 데스크톱에서 `START_BRIDGEDESK_TABLET_SERVER.cmd`를 실행합니다.
2. 태블릿 브라우저에서 표시된 주소를 열고 홈 화면에 추가합니다.
3. 발굴 현장 기록을 입력한 뒤 JSON을 내보냅니다.
4. JSON 파일을 `tools/bridgedesk/data/inbox`에 넣습니다.
5. `START_BRIDGEDESK_DESKTOP.cmd` 또는 `EXPORT_BRIDGEDESK_HWP_REPORT.cmd`를 실행합니다.

## 배포 파일 만들기

운영자가 사용자용 zip이나 exe를 다시 만들 때는 `tools/bridgedesk/BUILD_DESKTOP_EXE.cmd`와 `tools/bridgedesk/BUILD_USER_PACKAGE.cmd`를 실행합니다. 생성물은 `tools/bridgedesk/dist`에 만들어지며, 저장소에는 기본적으로 커밋하지 않습니다.
