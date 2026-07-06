# 데스크톱 설치와 실행

이 문서는 Git, 터미널, Python에 익숙하지 않은 사용자를 기준으로 작성했습니다.

## 가장 쉬운 실행

1. 받은 `BridgeDesk-user-package.zip` 파일의 압축을 풉니다.
2. 압축을 푼 폴더 안에서 `START_DESKTOP.cmd`를 더블클릭합니다.
3. 프로그램 창이 열리면 태블릿 현장 입력 목록과 HWP 보고서 초안을 확인합니다.

`dist\BridgeDesk\BridgeDesk.exe`가 들어 있는 배포본이라면 Python 설치 없이 실행됩니다. 이 파일이 없는 소스 배포본에서는 PC에 Python 3.11 이상이 필요합니다.

## 바탕화면 바로가기 만들기

1. `INSTALL_DESKTOP_SHORTCUTS.cmd`를 더블클릭합니다.
2. 바탕화면에 아래 바로가기가 생깁니다.
   - `BridgeDesk`
   - `BridgeDesk Tablet Server`
   - `BridgeDesk HWP Export`

## 태블릿 JSON 넣기

1. 태블릿에서 `JSON 내보내기`를 누릅니다.
2. 내려받은 JSON 파일을 데스크톱으로 옮깁니다.
3. `data\inbox` 폴더에 JSON 파일을 넣습니다.
4. `START_DESKTOP.cmd`를 다시 실행합니다.

`data\inbox`에 여러 JSON 파일을 넣어도 됩니다. BridgeDesk는 폴더 안의 모든 `*.json` 파일을 읽습니다.

## HWP 보고서용 파일 만들기

1. `EXPORT_HWP_REPORT.cmd`를 더블클릭합니다.
2. `exports\report-draft` 폴더가 열립니다.
3. 아래 파일을 사용합니다.
   - `hwp_report_draft.txt`: HWP 본문에 붙여넣기
   - `hwp_report_draft.html`: 표가 포함된 초안 확인
   - `field_findings.csv`: 표 형태 검수
   - `normalized_tablet_payload.json`: 정리된 원본 데이터 보관

## exe 다시 만들기

운영자가 프로그램을 수정한 뒤 새 실행 파일을 만들 때만 필요합니다.

1. `BUILD_DESKTOP_EXE.cmd`를 더블클릭합니다.
2. 빌드가 끝나면 `dist\BridgeDesk\BridgeDesk.exe`와 `dist\BridgeDeskTabletServer\BridgeDeskTabletServer.exe`가 만들어집니다.
3. 사용자에게는 `BUILD_USER_PACKAGE.cmd`로 만든 zip을 전달합니다.

## 자주 막히는 지점

- Windows SmartScreen이 경고하면 `추가 정보`를 누른 뒤 `실행`을 선택합니다.
- Python이 없다는 창이 뜨면 Python 3.11 이상을 설치하거나, `dist\BridgeDesk\BridgeDesk.exe`가 포함된 배포본을 받습니다.
- 한글이 깨져 보이면 `exports\report-draft\hwp_report_draft.txt`를 UTF-8로 여세요. HWP에서는 보통 정상적으로 붙여넣을 수 있습니다.
- 태블릿 자료가 안 보이면 JSON 파일이 `data\inbox` 바로 아래에 있는지 확인합니다.
