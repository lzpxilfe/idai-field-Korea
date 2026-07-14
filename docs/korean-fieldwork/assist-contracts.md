# 한국형 현장 보조 기능 데이터 계약

이 문서는 토층 사진 해석 보조와 근거 기반 보고서 초안을 iDAI.field에 붙이기 전에 먼저 고정한 공통 데이터 계약을 설명한다. 현재 구현은 `core`의 타입, 파서, 검증기와 단위 테스트까지만 포함한다. 기존 기록 폼, 프로젝트 설정, 데스크톱·태블릿 화면, 원격 서비스 연결은 변경하지 않는다.

## 구현 범위

- `korean-fieldwork-assist-run.ts`: 보조 실행의 입력, 엔진, 버전, 결과, 실패와 보안 경계
- `korean-fieldwork-assist-geometry.ts`: 토층 사진 위 경계선, 층 맥락, 관찰점, 층위 관계와 토색 후보
- `korean-fieldwork-report-draft.ts`: 검색 실행, 검증된 인용, 주장별 근거 범위, 보고서 초안과 검토 계보
- `korean-fieldwork-assist-sidecar.ts`: 실행과 결과를 원문 밖에서 함께 보존하는 versioned JSON 묶음
- `korean-fieldwork-assist-sidecar-operations.ts`: 저장 revision을 소비하되 새 revision을 만들지 않는 생성·추가·병합 제안
- 각 계약의 `schemaVersion`은 현재 `1`이며, 알 수 없는 미래 버전을 임의 변환하지 않는다.
- 다섯 모듈은 `core/src/tools/index.ts`에서 내보낸다.

이 단계에서 기존 iDAI.field 문서 필드를 덮어쓰지 않는다. 보조 결과는 제안 데이터이며, 사용자가 검토하고 승인하기 전까지 관찰 기록이나 보고서 본문이 아니다.

## 공통 실행 기록

`KoreanFieldworkAssistRun`은 다음 정보를 함께 고정한다.

1. 실행 ID, 기능 종류, 시작·완료 시각과 상태
2. 작업자 ID
3. 입력 문서 ID와 문서 revision
4. 사진 입력의 media ID와 원본 SHA-256
5. 엔진 이름·버전·실행 위치와 모델 ID·revision
6. 직렬화 가능한 JSON 매개변수
7. 실행이 실제로 만든 결과 ID
8. 안전하게 공개 가능한 경고와 실패 요약

완료되지 않은 실행은 영속 결과 ID를 게시할 수 없다. `Date`, `Map`, 희소 배열, 순환 객체처럼 JSON 직렬화 전후 의미가 바뀌는 값도 저장 매개변수로 인정하지 않는다. API key, authorization, bearer, credential, password, secret, token 계열 이름은 중첩 위치와 표기 변형을 포함해 거부한다. 실제 비밀값은 플랫폼의 안전한 저장소에 두고 이 계약에는 넣지 않는다.

제안 출처는 `manual`, `assist`, `legacyImport`, `edited`로 구분한다. 각 출처에 맞지 않는 실행 ID, 이전 항목 ID, 레거시 필드 이름을 함께 넣을 수 없다. 검토 상태는 `proposed`, `accepted`, `rejected`, `superseded`이며, 결정된 상태에는 검토자와 유효한 UTC 시각이 필요하다.

## 토층 사진 해석

사진 좌표는 다음 중 하나를 명시한다.

- `sourcePixel`: 원본 이미지의 경계 좌표
- `imageNormalized10000`: 가로·세로를 각각 0부터 10000까지 정규화한 좌표

좌표계, 원본 크기, 파일 SHA-256, 문서 revision을 함께 보존하므로 원본 사진이 바뀌면 기존 해석을 오래된 결과로 판정할 수 있다. 경계선, 맥락 다각형, 관찰점과 층위 관계는 서로 다른 타입이다. 맥락 다각형은 암묵적으로 닫히며 중복 꼭짓점, 자기 교차, 면적이 없는 형태를 거부한다.

승인된 층위 관계는 승인된 맥락만 참조할 수 있다. `sameAs` 관계는 동치 집합으로 먼저 축약한 뒤 `above`, `below`, `cuts`, `fills`의 순환을 검사한다. 편집본은 같은 종류의 기존 항목을 참조해야 하며, 하나의 폐기된 항목에 승인된 후속 항목이 둘 이상 생길 수 없다.

실행 종류와 결과 종류도 교차 검증한다.

| 실행 종류 | 허용 결과 |
|---|---|
| `soilProfileBoundarySuggestion` | `interfacePolyline` |
| `soilProfileContextSuggestion` | `contextPolygon`, `stratigraphicRelation` |
| `soilColorPhotoEstimate` | 사진 추정 근거를 가진 `soilColorSample` 관찰점 |

사진 토색 추정에는 원본 픽셀 격자 안의 정수 sample 좌표, RGB, 보정 방식, 1부터 끊김없이 매긴 Munsell 후보와 실행 계보가 필요하다. 선택값은 후보 중 하나여야 한다. 현장에서 직접 대조한 Munsell 값은 `fieldMeasured`로 따로 저장하며 사진 추정 RGB나 후보를 섞지 않는다.

## 근거 기반 보고서 초안

보고서 초안 payload는 서로 다른 두 실행을 포함한다.

1. 완료된 `reportRetrieval` 실행
2. 완료된 `reportDraft` 실행

검색 실행은 인용 ID와 입력 보고서 revision을, 생성 실행은 대상 기록·인용 자료·프롬프트 버전·색인 버전을 고정한다. 대상 기록에는 입력 SHA-256이 필수다. 두 실행의 ID는 같을 수 없다.

초안이 사용할 수 있는 인용은 검증 완료 상태뿐이다. 인용에는 출처 문서와 revision, page 또는 chunk ID, 접근 등급, 인용문 SHA-256이 필요하다. 사람이 읽는 label만으로는 재현 가능한 위치가 아니므로 근거 위치로 인정하지 않는다.

초안 텍스트의 공백이 아닌 모든 범위는 다음 중 하나에 연결되어야 한다.

- 생성 실행에 고정된 현장 기록
- 검증된 citation ID

주장 범위는 겹치거나 빠질 수 없다. 검색 자료를 현장 기록인 것처럼 직접 참조해 인용 검증을 우회할 수도 없다. 실행이 만든 초안과 사용자가 명시적으로 편집한 후속 초안은 구분하며, 승인된 편집본은 정확히 하나의 `superseded` 전임자를 대체한다.

## Assist sidecar v1

`KoreanFieldworkAssistSidecar`는 기존 iDAI.field 문서 안에 임시 결과를 섞지 않고 옆에서 보존하는 휴대 가능한 JSON 계약이다.

```json
{
  "schemaVersion": 1,
  "targetDocumentId": "feature-1",
  "assistRuns": [],
  "soilProfileInterpretations": [],
  "reportDraftPayloads": []
}
```

한 sidecar는 하나의 `targetDocumentId`에 귀속한다. 다만 원문 revision을 top-level 최신값으로 하나만 두지 않는다. 토층 payload와 보고서 payload가 각각 입력 revision과 SHA-256을 고정하므로, 같은 문서의 과거 결과와 현재 결과를 감사 이력으로 함께 둘 수 있다.

sidecar 본문에는 `_id`, `_rev`, `_conflicts`, 생성·수정 시각, 자체 해시를 넣지 않는다. 이 값들은 PouchDB나 파일 저장 adapter가 관리할 저장 봉투의 책임이다. core의 순수 함수는 저장 revision을 검사하고 병합할 내용을 제안할 뿐, 성공한 저장처럼 새 `_rev`를 만들어 내지 않는다.

### PouchDB 내부 저장 adapter

`KoreanFieldworkAssistSidecarStore`는 같은 프로젝트 PouchDB 안에서 sidecar를 전용 내부 문서로 저장한다.

- 문서 ID는 `idai-field-internal:korean-fieldwork-assist-sidecar:` 접두사와 URL 인코딩한 대상 문서 ID를 결합한다.
- 저장 봉투의 `kind`는 `koreanFieldworkAssistSidecar`이며 `_id`와 `_rev`는 sidecar 본문 밖에 둔다.
- 생성과 patch 저장은 PouchDB가 반환한 실제 `_rev`만 `storageRevision`으로 공개한다.
- patch는 먼저 읽은 `_rev`와 호출자가 제시한 revision을 비교하고, 저장 직전 다른 쓰기가 끼어든 경우 PouchDB의 409 conflict도 `staleStorageRevision`으로 반환한다.
- 내용이 바뀌지 않은 patch는 쓰기를 생략하고 기존 `_rev`를 그대로 유지한다.
- 내부 문서는 일반 관찰 문서 인덱스와 일반 문서 변경 알림에서 제외하지만, 같은 프로젝트 DB의 복제 대상에는 남는다.

### 안정 키와 계보 검사

- 실행은 `runId`로 식별하며 sidecar 전체에서 유일해야 한다.
- 토층 payload의 안정 키는 `documentRevision + sourceField + mediaId`다. 같은 source slot에서 SHA-256, 이미지 크기 또는 좌표계가 갈리면 새 버전으로 추측하지 않고 충돌로 취급한다.
- 보고서 payload의 안정 키는 생성 `assistRun.runId`다.
- 보고서 안에 내장된 검색·생성 run은 top-level `assistRuns`에도 있어야 하며, 입력 순서를 포함해 같은 snapshot이어야 한다. 검색·few-shot 입력 순서는 결과에 영향을 줄 수 있으므로 재정렬하지 않는다.
- 완료된 실행의 모든 output ID는 토층 항목, citation 또는 초안으로 양방향 해소되어야 한다. 현재 결과 payload가 없는 `spatialProcessing` 실행은 output이 비어 있을 때만 감사 이력으로 둘 수 있다.
- 같은 output ID를 서로 다른 실행이 소유할 수 없다. 같은 citation ID를 여러 보고서가 재사용하려면 검증 상태, locator, revision과 해시가 모두 같은 snapshot이어야 한다.
- 같은 대상 문서 revision은 하나의 보고서 입력 SHA-256만 가질 수 있다. 해시가 갈리면 서로 다른 승인 슬롯으로 인정하지 않고 손상 또는 잘못된 pin으로 거부한다.
- 같은 문서 revision과 입력 해시에 대해 서로 다른 생성 실행의 초안 두 개를 동시에 승인할 수 없다.

토층 payload를 검사할 때는 그 payload 항목이 실제로 참조한 run만 골라 기존 토층 link 검증기에 전달한다. 이 규칙 때문에 한 sidecar 안에 여러 원문 revision의 토층 결과가 있어도 서로의 실행을 잘못 누락 결과로 판정하지 않는다.

### 최신성 판정

구조적으로 유효한 과거 결과를 삭제하거나 invalid로 만들지 않고 별도 함수로 다음 상태를 판정한다.

| 상태 | 의미 |
|---|---|
| `current` | revision과 내용 pin이 모두 현재 원문과 같다. |
| `revisionOnly` | revision은 달라졌지만 같은 source slot의 내용 해시와 크기가 같다. |
| `contentChanged` | 문서, source field, media ID, 해시, 크기 또는 보고서 입력 해시가 달라졌다. |
| `missing` | 비교할 현재 원문이 없다. |

`revisionOnly`도 자동 재승인의 근거가 아니다. 새 revision에서 사람이 다시 확인할 수 있도록 구분해 주는 상태일 뿐이다. 과거 payload의 pin을 고쳐 쓰는 rebase도 하지 않고, 새 실행과 새 payload를 추가한다.

SHA-256 pin은 입력에서 대문자를 허용하더라도 sidecar 경계에서 소문자로 정규화한다. 따라서 최신성 판정과 같은 revision의 입력 snapshot 비교는 대소문자 표기 차이에 흔들리지 않는다.

### 생성, 추가와 보수적 병합

`createKoreanFieldworkAssistSidecar`는 완전한 교차검증을 통과한 값만 만든다. `applyKoreanFieldworkAssistSidecarPatch`는 caller가 읽은 `storageRevision`과 기대 revision이 정확히 같을 때만 append/upsert를 제안한다. revision이 다르면 `staleStorageRevision` 충돌이며, 반환값의 `baseStorageRevision`은 adapter가 실제 compare-and-swap 저장에 다시 사용해야 한다.

v1 patch에는 삭제나 tombstone이 없다. 한쪽에 없는 항목을 삭제로 추측하지 않고 합집합으로 보존하며, 사용하지 않을 제안은 `rejected`, 대체된 제안은 유효한 편집 계보와 `superseded`로 표현한다. 같은 요청을 다시 적용한 no-op은 `changed: false`인 성공으로 반환해 재시도를 안전하게 만든다.

자동 병합 범위는 의도적으로 좁다.

- 서로 다른 ID의 실행과 결과는 합집합으로 보존한다.
- 같은 ID의 완전히 같은 snapshot은 하나로 정리한다.
- 실행 상태는 같은 입력·엔진·매개변수일 때 `running`에서 하나의 완료 상태로만 진행할 수 있다.
- review는 같은 내용에서 `proposed → accepted | rejected`, 유효한 후속 계보가 있을 때 `accepted → superseded`만 진행할 수 있다.
- 같은 ID의 좌표, 본문, claim, provenance, citation, 입력, 엔진 또는 terminal 결과가 다르면 `contentConflict`다.
- 같은 저장 revision이 다른 본문을 가리키면 `revisionCollision`이다.
- 두 유효한 branch를 합친 뒤 층위 순환, 승인 후속본 분기 또는 복수 승인 초안이 생기면 `semanticConflict`다.

시각이나 로컬 clock을 이용한 last-write-wins는 사용하지 않는다. 병합 결과는 `parentStorageRevisions`와 정규화된 sidecar를 반환하는 저장 제안일 뿐이며, 저장 adapter가 성공하기 전까지 새 revision으로 취급하면 안 된다.

### 결정적 직렬화

정규화 함수는 sidecar가 새로 정의한 top-level registry만 정렬한다. run은 `runId`, 토층 payload는 source key, 보고서 payload는 generation run ID를 쓴다. 기존 하위 계약이 소유한 실행 입력·output ID·citation·draft·claim·geometry·relation 배열은 순서 의미를 임의로 set으로 바꾸지 않고 그대로 보존한다. JSON 객체 key는 정렬하되 `__proto__` 같은 합법적인 JSON key도 own property로 보존한다. 모델 재현성, 검색 순위, 그림 겹침 순서, claim offset과 원문 SHA-256의 의미를 지키기 위해서다.

`serializeKoreanFieldworkAssistSidecar`는 검증에 실패한 값을 직렬화하지 않는다. import가 재귀 호출 stack을 소진하지 않도록 JSON 깊이는 128, 전체 node 수는 100,000으로 제한하며, 한도를 넘으면 예외 대신 invalid 결과를 반환한다. 반환된 canonical bytes의 전송용 SHA-256이 필요하면 저장 계층에서 계산하며, self-hash를 sidecar 안에 다시 넣어 순환 의존을 만들지 않는다.

문자열은 단일 string 1,000,000 UTF-16 code unit, 객체 key와 value를 합친 총 string 길이 8,000,000 code unit, 최종 JSON 직렬화 결과 16,000,000 code unit을 넘지 못한다. raw 문자열 import도 `JSON.parse` 전에 같은 16,000,000 code unit 상한을 먼저 검사한다. 이 제한은 대형 문서 자체를 sidecar에 넣기 위한 것이 아니라, 원문은 기존 문서와 파일 저장소에 남기고 sidecar에는 pin, provenance, 제안 결과만 담기 위한 보호선이다.

현재 sidecar는 core의 데이터 경계다. `InformationAsset` 범주, `Document` 모델, 프로젝트 설정, PouchDB 문서, 관계, UI 필드에는 아직 연결하지 않았다. 특히 기존 `InformationAsset`은 보고서 PDF·GIS·사진 DB·백업 같은 장기보존 자산용이므로 보조 실행 상태 저장소로 재정의하지 않는다.

## UI와 아이콘 원칙

현재 커밋은 버튼이나 아이콘을 추가하지 않는다. 이후 UI를 붙일 때는 다음 규칙을 적용한다.

- 버튼, 상태, 메뉴에 emoji 또는 운영체제 글리프를 사용하지 않는다.
- 필요한 아이콘은 이 포크 전용 원본 8비트 pixel-art 세트로 직접 제작한다.
- 기본 논리 격자는 16×16, 배포 자산은 투명 배경의 indexed-color PNG를 우선한다.
- 확대는 정수 배율과 `image-rendering: pixelated`를 사용해 픽셀이 흐려지지 않게 한다.
- 한 세트 안에서 윤곽선 굵기, 광원 방향과 제한 팔레트를 통일한다.
- 아이콘만으로 의미를 강요하지 않고 한국어 버튼 label 또는 접근성 이름을 함께 제공한다.
- 승인, 거부, 경고를 색상 차이만으로 구분하지 않는다.

아이콘 자산은 실제 버튼 목록이 확정될 때 만든다. 쓰이지 않는 장식 아이콘을 먼저 늘리지 않는다.

## 후속 통합 순서

1. 완료: sidecar 저장 adapter와 전용 숨은 저장 범주를 만들고 실제 `_rev` compare-and-swap을 연결한다.
2. 기존 관찰 필드는 읽기만 하고 보조 결과를 별도 제안으로 저장한다.
3. 태블릿과 데스크톱에 같은 검토·승인·되돌리기 흐름을 구현한다.
4. 토층 사진 처리는 로컬 우선을 유지하고 외부 전송은 명시적 동의와 정책 검사를 거친다.
5. 보고서 검색 서비스에는 인증, 프로젝트별 ACL, 색인 격리, 업로드 제한과 호출 quota를 둔다.
6. 실제 버튼이 생기는 단계에서 8비트 아이콘 세트와 접근성 검증을 함께 추가한다.
7. 전체 패리티 검사와 플랫폼별 빌드를 통과한 뒤 기존 작업 브랜치에 선택적으로 합류한다.

이 순서를 지키면 외부 서비스나 모델이 없어도 기존 기록·편집 기능은 그대로 작동하며, 보조 결과를 자동 확정값으로 오인하는 일을 막을 수 있다.
