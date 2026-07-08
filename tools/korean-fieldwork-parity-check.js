#!/usr/bin/env node

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const reportOnly = process.argv.includes('--report');

const featureRows = [
  {
    id: 'project-setup',
    title: 'Project setup: mode, boundary, operator',
    tablet: [
      'mobile/components/Home/CreateProjectModal.tsx',
      'mobile/components/Home/CreateProjectModal.spec.tsx',
      'mobile/app/(tabs)/SettingsScreen.tsx',
      'mobile/test/screens/SettingsScreen.spec.tsx',
      'mobile/hooks/use-korean-fieldwork-project-setup-defaults.ts',
      'mobile/hooks/use-korean-fieldwork-project-setup-defaults.spec.ts',
      'mobile/components/Project/korean-fieldwork-investigation-mode.ts',
      'mobile/components/Project/korean-fieldwork-project-start.ts'
    ],
    desktop: [
      'desktop/src/app/components/project/create-project-modal.component.ts',
      'desktop/test/unit/components/project/create-project-modal.component.spec.ts',
      'desktop/src/app/components/project/project-information-modal.component.ts',
      'desktop/test/unit/components/project/project-information-modal.component.spec.ts',
      'desktop/src/app/components/settings/settings.component.ts',
      'desktop/src/app/components/settings/settings.html',
      'desktop/src/app/components/settings/settings.scss',
      'desktop/test/unit/components/settings/settings.component.spec.ts',
      'desktop/src/app/util/korean-fieldwork-project-setup.ts'
    ],
    tabletTests: [
      'mobile/components/Home/CreateProjectModal.spec.tsx',
      'mobile/components/Home/project-name-validation.spec.ts',
      'mobile/test/screens/SettingsScreen.spec.tsx',
      'mobile/hooks/use-korean-fieldwork-project-setup-defaults.spec.ts'
    ],
    desktopTests: [
      'desktop/test/unit/components/project/create-project-modal.component.spec.ts',
      'desktop/test/unit/components/project/project-information-modal.component.spec.ts',
      'desktop/test/unit/components/settings/settings.component.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-project-setup.spec.ts'
    ]
  },
  {
    id: 'map-provider-setup',
    title: 'Map provider keys and satellite boundary readiness',
    tablet: [
      'mobile/app/(tabs)/SettingsScreen.tsx',
      'mobile/components/Project/Map/BoundaryFileImportModal.tsx',
      'mobile/components/Project/Map/KakaoSatellitePicker.tsx',
      'mobile/components/Project/Map/MapBottomSheet.tsx',
      'mobile/components/Project/Map/boundary-file-import.ts',
      'mobile/components/Project/Map/kakao-satellite-picker-html.ts',
      'mobile/components/Project/Map/korean-fieldwork-map-provider-status.ts',
      'mobile/components/Project/Map/korean-fieldwork-map-start-panel.ts',
      'mobile/hooks/use-preferences.ts',
      'mobile/models/preferences.ts'
    ],
    desktop: [
      'desktop/src/app/components/settings/settings.component.ts',
      'desktop/src/app/components/settings/settings.html',
      'desktop/src/app/components/settings/settings.scss',
      'desktop/src/app/services/settings/settings.ts',
      'desktop/src/app/services/settings/settings-provider.ts',
      'desktop/src/app/services/settings/settings-serializer.ts',
      'desktop/src/app/util/korean-fieldwork-map-provider-settings.ts',
      'desktop/electron/main.js'
    ],
    tabletTests: [
      'mobile/test/screens/SettingsScreen.spec.tsx',
      'mobile/components/Project/Map/BoundaryFileImportModal.spec.tsx',
      'mobile/components/Project/Map/KakaoSatellitePicker.spec.tsx',
      'mobile/components/Project/Map/MapBottomSheet.spec.tsx',
      'mobile/components/Project/Map/boundary-file-import.spec.ts',
      'mobile/components/Project/Map/kakao-satellite-picker-html.spec.ts',
      'mobile/components/Project/Map/korean-fieldwork-map-provider-status.spec.ts',
      'mobile/components/Project/Map/korean-fieldwork-map-start-panel.spec.ts',
      'mobile/hooks/use-preferences.spec.ts'
    ],
    desktopTests: [
      'desktop/test/unit/components/settings/settings.component.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-map-provider-settings.spec.ts'
    ]
  },
  {
    id: 'guided-feature-recording',
    title: 'Guided feature recording: period, type, attributes',
    tablet: [
      'mobile/components/Project/KoreanFieldworkFeatureSketchReferencePanel.tsx',
      'mobile/components/Project/KoreanFieldworkFreeDrawingPanel.tsx',
      'mobile/components/Project/KoreanFieldworkQuickRecordPanel.tsx',
      'mobile/components/Project/korean-fieldwork-quick-record.ts',
      'mobile/components/Project/korean-fieldwork-feature-attributes.ts'
    ],
    desktop: [
      'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.component.ts',
      'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.html',
      'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.scss',
      'desktop/src/app/components/docedit/core/forms/geometry.scss',
      'desktop/src/app/components/docedit/core/korean-fieldwork-quick-record-panel.component.ts',
      'desktop/src/app/components/docedit/core/korean-fieldwork-feature-guidance-panel.component.ts',
      'desktop/src/app/components/resources/map/map/editable-map.component.ts',
      'desktop/src/app/components/resources/map/map/editable-map.html',
      'desktop/src/app/components/resources/map/map/map.scss',
      'core/src/tools/korean-fieldwork-feature-types.ts',
      'core/src/tools/korean-fieldwork-draft-defaults.ts',
      'desktop/src/app/util/korean-fieldwork-feature-guidance.ts'
    ],
    tabletTests: [
      'mobile/components/Project/KoreanFieldworkFeatureSketchReferencePanel.spec.tsx',
      'mobile/components/Project/KoreanFieldworkFreeDrawingPanel.spec.tsx',
      'mobile/components/Project/KoreanFieldworkQuickRecordPanel.spec.tsx',
      'mobile/components/Project/korean-fieldwork-quick-record.spec.ts',
      'mobile/components/Project/korean-fieldwork-feature-attributes.spec.ts'
    ],
    desktopTests: [
      'desktop/test/unit/components/docedit/core/korean-fieldwork-record-context-panel.component.spec.ts',
      'desktop/test/unit/components/docedit/core/korean-fieldwork-quick-record-panel.component.spec.ts',
      'desktop/test/unit/components/docedit/core/korean-fieldwork-feature-guidance-panel.component.spec.ts',
      'desktop/test/unit/components/resources/editable-map.component.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-feature-guidance.spec.ts'
    ]
  },
  {
    id: 'orientation',
    title: 'Orientation: long-axis bearing and reference',
    tablet: [
      'mobile/components/Project/KoreanFieldworkQuickRecordPanel.tsx',
      'mobile/components/Project/korean-fieldwork-quick-record.ts'
    ],
    desktop: [
      'desktop/src/app/components/docedit/core/korean-fieldwork-orientation-panel.component.ts',
      'desktop/src/app/util/korean-fieldwork-feature-guidance.ts'
    ],
    tabletTests: [
      'mobile/components/Project/KoreanFieldworkQuickRecordPanel.spec.tsx',
      'mobile/components/Project/korean-fieldwork-quick-record.spec.ts'
    ],
    desktopTests: [
      'desktop/test/unit/components/docedit/core/korean-fieldwork-orientation-panel.component.spec.ts'
    ]
  },
  {
    id: 'soil-color',
    title: 'Soil profile photo and Munsell review',
    tablet: [
      'mobile/components/Project/FieldworkPhotoAnnotationPanel.tsx',
      'mobile/components/Project/SoilProfileCameraButton.tsx',
      'mobile/components/Project/KoreanFieldworkSoilColorPanel.tsx',
      'mobile/components/Project/soil-color-photo-assist.ts'
    ],
    desktop: [
      'core/src/tools/korean-fieldwork-soil-color.ts',
      'desktop/src/app/components/docedit/core/korean-fieldwork-soil-color-panel.component.ts',
      'desktop/src/app/util/korean-fieldwork-soil-color-candidates.ts',
      'desktop/src/app/util/korean-fieldwork-soil-color-photo-assist.ts'
    ],
    tabletTests: [
      'mobile/components/Project/FieldworkPhotoAnnotationPanel.spec.tsx',
      'mobile/components/Project/SoilProfileCameraButton.spec.ts',
      'mobile/components/Project/KoreanFieldworkSoilColorPanel.spec.tsx',
      'mobile/components/Project/soil-color-photo-assist.spec.ts'
    ],
    desktopTests: [
      'desktop/test/unit/components/docedit/core/korean-fieldwork-soil-color-panel.component.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-soil-color-candidates.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-soil-color-photo-assist.spec.ts'
    ]
  },
  {
    id: 'selected-record-workbench',
    title: 'Selected record workbench and identifier revision',
    tablet: [
      'mobile/components/Project/KoreanFieldworkSelectedRecordWorkbench.tsx',
      'mobile/components/Project/korean-fieldwork-record-evidence.ts',
      'mobile/components/Project/korean-fieldwork-workbench.ts',
      'mobile/components/Project/korean-fieldwork-identifier-revision.ts'
    ],
    desktop: [
      'desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts',
      'desktop/src/app/util/korean-fieldwork-record-evidence.ts',
      'desktop/src/app/util/korean-fieldwork-workbench.ts',
      'core/src/tools/korean-fieldwork-identifier-revision.ts',
      'desktop/src/app/util/korean-fieldwork-identifier-revision.ts'
    ],
    tabletTests: [
      'mobile/components/Project/KoreanFieldworkSelectedRecordWorkbench.spec.tsx',
      'mobile/components/Project/korean-fieldwork-record-evidence.spec.ts',
      'mobile/components/Project/korean-fieldwork-workbench.spec.ts',
      'mobile/components/Project/korean-fieldwork-identifier-revision.spec.ts'
    ],
    desktopTests: [
      'desktop/test/unit/components/resources/korean-fieldwork-priority-strip.component.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-record-evidence.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-workbench.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-identifier-revision.spec.ts'
    ]
  },
  {
    id: 'daily-notebook',
    title: 'Daily notebook, follow-up notes, and evidence-linked summaries',
    tablet: [
      'mobile/components/Project/KoreanFieldworkDailyJournalCalendar.tsx',
      'mobile/components/Project/KoreanFieldworkFieldNotePanel.tsx',
      'mobile/components/Project/KoreanFieldworkNotebookLedger.tsx',
      'mobile/components/Project/KoreanFieldworkDailyNotebookDigest.tsx',
      'mobile/components/Project/korean-fieldwork-field-note-drafts.ts',
      'mobile/components/Project/korean-fieldwork-field-notes.ts',
      'mobile/components/Project/korean-fieldwork-handwriting.ts',
      'mobile/components/Project/korean-fieldwork-stylus-input.ts'
    ],
    desktop: [
      'desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts',
      'desktop/src/app/components/resources/korean-fieldwork-priority-strip.html',
      'desktop/src/app/components/resources/korean-fieldwork-priority-strip.scss',
      'desktop/src/app/util/korean-fieldwork-evidence-review.ts',
      'desktop/src/app/util/korean-fieldwork-notebook-digest.ts'
    ],
    tabletTests: [
      'mobile/components/Project/KoreanFieldworkDailyJournalCalendar.spec.tsx',
      'mobile/components/Project/KoreanFieldworkFieldNotePanel.spec.tsx',
      'mobile/components/Project/KoreanFieldworkNotebookLedger.spec.tsx',
      'mobile/components/Project/KoreanFieldworkDailyNotebookDigest.spec.tsx',
      'mobile/components/Project/korean-fieldwork-field-note-drafts.spec.ts',
      'mobile/components/Project/korean-fieldwork-field-notes.spec.ts',
      'mobile/components/Project/korean-fieldwork-handwriting.spec.ts',
      'mobile/components/Project/korean-fieldwork-stylus-input.spec.ts',
      'mobile/components/Project/korean-fieldwork-narrative-assist.spec.ts'
    ],
    desktopTests: [
      'desktop/test/unit/components/resources/korean-fieldwork-priority-strip.component.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-evidence-review.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-notebook-digest.spec.ts'
    ]
  },
  {
    id: 'progress-closeout',
    title: 'Progress board, hierarchy lanes, unit matrix, and closeout',
    tablet: [
      'mobile/components/Project/KoreanFieldworkHierarchyBoard.tsx',
      'mobile/components/Project/korean-fieldwork-hierarchy.ts',
      'mobile/components/Project/KoreanFieldworkProgressBoard.tsx',
      'mobile/components/Project/KoreanFieldworkOverviewChart.tsx',
      'mobile/components/Project/KoreanFieldworkUnitMatrix.tsx',
      'mobile/components/Project/korean-fieldwork-overview-chart.ts',
      'mobile/components/Project/korean-fieldwork-closeout.ts'
    ],
    desktop: [
      'desktop/src/app/util/korean-fieldwork-hierarchy.ts',
      'desktop/src/app/util/korean-fieldwork-overview-chart.ts',
      'desktop/src/app/util/korean-fieldwork-progress-board.ts',
      'desktop/src/app/util/korean-fieldwork-unit-matrix.ts',
      'desktop/src/app/util/korean-fieldwork-closeout.ts'
    ],
    tabletTests: [
      'mobile/components/Project/KoreanFieldworkHierarchyBoard.spec.tsx',
      'mobile/components/Project/korean-fieldwork-hierarchy.spec.ts',
      'mobile/components/Project/KoreanFieldworkProgressBoard.spec.tsx',
      'mobile/components/Project/KoreanFieldworkOverviewChart.spec.tsx',
      'mobile/components/Project/KoreanFieldworkUnitMatrix.spec.tsx',
      'mobile/components/Project/korean-fieldwork-overview-chart.spec.ts',
      'mobile/components/Project/korean-fieldwork-progress.spec.ts',
      'mobile/components/Project/korean-fieldwork-unit-matrix.spec.ts',
      'mobile/components/Project/korean-fieldwork-closeout.spec.ts',
      'mobile/components/Project/korean-fieldwork-closeout-actions.spec.ts'
    ],
    desktopTests: [
      'desktop/test/unit/util/korean-fieldwork-hierarchy.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-overview-chart.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-progress-board.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-unit-matrix.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-closeout.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-closeout-actions.spec.ts'
    ]
  },
  {
    id: 'scope-workflow',
    title: 'Scope summary, today actions, and workflow steps',
    tablet: [
      'mobile/components/Project/KoreanFieldworkInvestigationModePanel.tsx',
      'mobile/components/Project/KoreanFieldworkScopePanel.tsx',
      'mobile/components/Project/KoreanFieldworkTodayBoard.tsx',
      'mobile/components/Project/Map/korean-fieldwork-map-start-panel.ts',
      'mobile/components/Project/korean-fieldwork-system-records.ts',
      'mobile/components/Project/korean-fieldwork-today-actions.ts'
    ],
    desktop: [
      'desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts',
      'desktop/src/app/components/resources/korean-fieldwork-priority-strip.html',
      'desktop/src/app/util/korean-fieldwork-boundary-import-guidance.ts',
      'desktop/src/app/util/korean-fieldwork-boundary-summary.ts',
      'desktop/src/app/util/korean-fieldwork-operation-wrap.ts',
      'desktop/src/app/util/korean-fieldwork-workflow.ts',
      'desktop/src/app/util/korean-fieldwork-scope-summary.ts',
      'desktop/src/app/util/korean-fieldwork-system-records.ts',
      'desktop/src/app/util/korean-fieldwork-today-actions.ts'
    ],
    tabletTests: [
      'mobile/components/Project/KoreanFieldworkInvestigationModePanel.spec.tsx',
      'mobile/components/Project/KoreanFieldworkScopePanel.spec.tsx',
      'mobile/components/Project/KoreanFieldworkTodayBoard.spec.tsx',
      'mobile/components/Project/Map/korean-fieldwork-map-start-panel.spec.ts',
      'mobile/components/Project/korean-fieldwork-scope.spec.ts',
      'mobile/components/Project/korean-fieldwork-system-records.spec.ts',
      'mobile/components/Project/korean-fieldwork-today-actions.spec.ts'
    ],
    desktopTests: [
      'desktop/test/unit/components/resources/korean-fieldwork-priority-strip.component.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-boundary-summary.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-operation-wrap.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-workflow.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-scope-summary.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-system-records.spec.ts',
      'desktop/test/unit/util/korean-fieldwork-today-actions.spec.ts'
    ]
  },
  {
    id: 'report-handoff',
    title: 'Report handoff: tablet evidence to desktop HWP copy blocks',
    tablet: [
      'mobile/components/Project/korean-fieldwork-document-drafts.ts',
      'mobile/components/Project/korean-fieldwork-field-notes.ts',
      'mobile/hooks/use-fieldwork-image-sync.ts'
    ],
    desktop: [
      'core/src/tools/korean-fieldwork-document-drafts.ts',
      'core/src/tools/korean-fieldwork-record-contract.ts',
      'core/src/tools/korean-fieldwork-report-handoff.ts',
      'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.component.ts',
      'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.html',
      'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.scss',
      'desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts',
      'desktop/src/app/components/resources/korean-fieldwork-priority-strip.html',
      'desktop/src/app/components/resources/korean-fieldwork-priority-strip.scss',
      'desktop/src/app/util/korean-fieldwork-hwp-clipboard.ts'
    ],
    tabletTests: [
      'mobile/components/Project/korean-fieldwork-document-drafts.spec.ts',
      'mobile/components/Project/korean-fieldwork-field-notes.spec.ts',
      'mobile/hooks/use-fieldwork-image-sync.spec.ts'
    ],
    desktopTests: [
      'desktop/test/unit/components/docedit/core/korean-fieldwork-record-context-panel.component.spec.ts',
      'desktop/test/unit/components/resources/korean-fieldwork-priority-strip.component.spec.ts'
    ]
  },
  {
    id: 'compat-raw-fields',
    title: 'Compatibility raw fields stay secondary',
    tablet: [
      'mobile/components/common/forms/DocumentForm.tsx',
      'mobile/components/common/forms/DocumentForm.spec.tsx'
    ],
    desktop: [
      'desktop/src/app/components/docedit/core/edit-form.component.ts',
      'desktop/src/app/components/docedit/core/edit-form.html',
      'desktop/src/app/components/docedit/core/edit-form.scss',
      'desktop/test/unit/components/docedit/core/edit-form.component.spec.ts'
    ],
    tabletTests: [
      'mobile/components/common/forms/DocumentForm.spec.tsx'
    ],
    desktopTests: [
      'desktop/test/unit/components/docedit/core/edit-form.component.spec.ts'
    ]
  }
];

const releaseCriticalPatterns = [
  /^\.github\/workflows\/(desktop|mobile)\.yml$/,
  /^README\.md$/,
  /^docs\/korean-fieldwork\/android-tablet-install\.ko\.md$/,
  /^(INSTALL|DOWNLOAD)_LATEST_TABLET_APK\.cmd$/,
  /^install-idai-field-android-apk\.ps1$/,
  /^mobile\/README\.md$/,
  /^tools\/korean-fieldwork-(media-contract-check|parity-check|verify)\.js$/,
  /^core\/src\/datastore\/image\/(field-hub-file-url|image-sync-service)\.ts$/,
  /^core\/test\/datastore\/image\/(field-hub-file-url|image-sync-service)\.spec\.ts$/,
  /^core\/src\/datastore\/pouchdb\/(index|sync-service)\.ts$/,
  /^core\/test\/datastore\/pouchdb\/sync-service\.spec\.ts$/,
  /^core\/src\/model\/document\/image-document\.ts$/,
  /^core\/test\/model\/image-document\.spec\.ts$/,
  /^core\/src\/tools\/korean-fieldwork-readiness\.ts$/,
  /^core\/test\/tools\/korean-fieldwork-readiness\.spec\.ts$/,
  /^core\/src\/tools\/korean-fieldwork-record-contract\.ts$/,
  /^core\/test\/tools\/korean-fieldwork-record-contract\.spec\.ts$/,
  /^core\/src\/tools\/korean-fieldwork-draft-defaults\.ts$/,
  /^core\/test\/tools\/korean-fieldwork-draft-defaults\.spec\.ts$/,
  /^core\/src\/tools\/korean-fieldwork-report-handoff\.ts$/,
  /^core\/test\/tools\/korean-fieldwork-report-handoff\.spec\.ts$/,
  /^core\/src\/tools\/korean-fieldwork-soil-color\.ts$/,
  /^core\/test\/tools\/korean-fieldwork-soil-color\.spec\.ts$/,
  /^mobile\/app\/\(tabs\)\/ProjectScreen\/Document(Add|Edit)\.tsx$/,
  /^mobile\/app\/\(tabs\)\/ProjectScreen\/index\.tsx$/,
  /^mobile\/app\/\(tabs\)\/SettingsScreen\.tsx$/,
  /^mobile\/components\/Home\/CreateProjectModal(\.spec)?\.tsx$/,
  /^mobile\/components\/Home\/LoadProjectModal\.spec\.tsx$/,
  /^mobile\/components\/Home\/project-name-validation(\.spec)?\.ts$/,
  /^mobile\/components\/Project\/KoreanFieldwork.*\.(ts|tsx)$/,
  /^mobile\/components\/Project\/SoilProfileCameraButton(\.spec)?\.tsx?$/,
  /^mobile\/components\/Project\/Map\/korean-fieldwork-map-(provider-status|start-panel)(\.spec)?\.ts$/,
  /^mobile\/components\/Project\/korean-fieldwork-.*\.(ts|tsx)$/,
  /^mobile\/components\/Project\/soil-color-photo-assist(\.spec)?\.ts$/,
  /^mobile\/components\/common\/forms\/DocumentForm(\.spec)?\.tsx$/,
  /^mobile\/contexts\/project-context(\.spec)?\.tsx$/,
  /^mobile\/hooks\/use-(fieldwork-image-sync|preferences|search|sync)(\.spec)?\.ts$/,
  /^mobile\/hooks\/use-korean-fieldwork-project-setup-defaults(\.spec)?\.ts$/,
  /^mobile\/package\.json$/,
  /^mobile\/models\/project-settings(\.spec)?\.ts$/,
  /^mobile\/test\/screens\/.*\.spec\.tsx$/,
  /^desktop\/src\/app\/components\/docedit\/core\/edit-form\.(component\.ts|html|scss)$/,
  /^desktop\/src\/app\/components\/docedit\/core\/korean-fieldwork-.*\.(ts|html|scss)$/,
  /^desktop\/test\/unit\/components\/docedit\/core\/edit-form\.component\.spec\.ts$/,
  /^desktop\/src\/app\/components\/project\/(create-project-modal|project-information-modal)\.component\.(ts|html|scss)$/,
  /^desktop\/src\/app\/components\/project\/create-project-modal\.html$/,
  /^desktop\/src\/app\/components\/project\/download-project\.component\.(ts|html|scss)$/,
  /^desktop\/src\/app\/components\/settings\/settings\.(component\.)?(ts|html|scss)$/,
  /^desktop\/src\/app\/components\/image\/export\/image-export-modal\.component\.ts$/,
  /^desktop\/src\/app\/components\/image\/grid\/construct-grid\.ts$/,
  /^desktop\/src\/app\/services\/imagestore\/(export-images|image-tool-launcher|image-url-maker|remote-image-store)\.ts$/,
  /^desktop\/src\/app\/services\/imagestore\/manipulation\/(jimp|sharp)\/.*display-variant-creation\.ts$/,
  /^desktop\/src\/app\/services\/express-server\/express-server\.ts$/,
  /^desktop\/src\/app\/services\/settings\/settings(-provider|-serializer)?\.ts$/,
  /^desktop\/electron\/main\.js$/,
  /^desktop\/test\/unit\/components\/images\/grid\/construct-grid\.spec\.ts$/,
  /^desktop\/test\/unit\/services\/express-server\.spec\.ts$/,
  /^desktop\/test\/unit\/services\/imagestore\/(export-images|image-tool-launcher|image-url-maker|remote-image-store)\.spec\.ts$/,
  /^desktop\/test\/unit\/components\/project\/(create-project-modal|download-project|project-information-modal)\.component\.spec\.ts$/,
  /^desktop\/test\/unit\/components\/settings\/settings\.component\.spec\.ts$/,
  /^desktop\/src\/app\/components\/resources\/korean-fieldwork-priority-strip(\.component)?\.(ts|html|scss)$/,
  /^desktop\/src\/app\/util\/korean-fieldwork-.*\.ts$/,
  /^desktop\/test\/unit\/components\/docedit\/core\/korean-fieldwork-.*\.spec\.ts$/,
  /^desktop\/test\/unit\/components\/resources\/korean-fieldwork-priority-strip\.component\.spec\.ts$/,
  /^desktop\/test\/unit\/util\/korean-fieldwork-.*\.spec\.ts$/,
  /^server\/lib\/field_hub\/(cli|file_store|project)\.ex$/,
  /^server\/lib\/field_hub_web\/live\/project_(create|show)\.(ex|html\.heex)$/,
  /^server\/lib\/field_hub_web\/rest\/api\/(file|project)\.ex$/,
  /^server\/test\/field_hub\/(cli|file_store|project)_test\.exs$/,
  /^server\/test\/field_hub_web\/controllers\/api\/(file|project)_controller_test\.exs$/,
  /^server\/test\/field_hub_web\/live\/project_(create|show)_live_test\.exs$/
];

const classifiedSupportSourceGroups = [
  {
    reason: 'desktop docedit panel template and style companions',
    files: [
      'desktop/src/app/components/docedit/core/korean-fieldwork-feature-guidance-panel.html',
      'desktop/src/app/components/docedit/core/korean-fieldwork-feature-guidance-panel.scss',
      'desktop/src/app/components/docedit/core/korean-fieldwork-orientation-panel.html',
      'desktop/src/app/components/docedit/core/korean-fieldwork-orientation-panel.scss',
      'desktop/src/app/components/docedit/core/korean-fieldwork-quick-record-panel.html',
      'desktop/src/app/components/docedit/core/korean-fieldwork-quick-record-panel.scss',
      'desktop/src/app/components/docedit/core/korean-fieldwork-readiness-panel.html',
      'desktop/src/app/components/docedit/core/korean-fieldwork-readiness-panel.scss',
      'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.html',
      'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.scss',
      'desktop/src/app/components/docedit/core/korean-fieldwork-soil-color-panel.html',
      'desktop/src/app/components/docedit/core/korean-fieldwork-soil-color-panel.scss'
    ]
  },
  {
    reason: 'desktop support panels embedded in the fieldwork edit flow',
    files: [
      'desktop/src/app/components/docedit/core/korean-fieldwork-readiness-panel.component.ts',
      'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.component.ts'
    ]
  },
  {
    reason: 'desktop project and resource view templates/styles for feature-row components',
    files: [
      'desktop/src/app/components/project/create-project-modal.html',
      'desktop/src/app/components/project/create-project-modal.scss',
      'desktop/src/app/components/project/project-information-modal.html',
      'desktop/src/app/components/project/project-information-modal.scss',
      'desktop/src/app/components/resources/korean-fieldwork-priority-strip.html',
      'desktop/src/app/components/resources/korean-fieldwork-priority-strip.scss'
    ]
  },
  {
    reason: 'release verification tooling that keeps tablet and desktop fieldwork flows aligned',
    files: [
      'core/test/tools/korean-fieldwork-soil-color.spec.ts',
      'tools/korean-fieldwork-media-contract-check.js',
      'tools/korean-fieldwork-parity-check.js',
      'tools/korean-fieldwork-verify.js'
    ]
  },
  {
    reason: 'desktop local Field Hub-compatible file API bridge coverage for tablet uploads',
    files: [
      'desktop/src/app/services/express-server/express-server.ts',
      'desktop/test/unit/services/express-server.spec.ts'
    ]
  },
  {
    reason: 'desktop image export handover manifests for later report preparation',
    files: [
      'desktop/src/app/components/image/export/image-export-modal.component.ts',
      'desktop/src/app/services/imagestore/export-images.ts',
      'desktop/test/unit/services/imagestore/export-images.spec.ts'
    ]
  },
  {
    reason: 'desktop shared utilities consumed by feature-row panels',
    files: [
      'desktop/src/app/util/korean-fieldwork-checklist.ts',
      'desktop/src/app/util/korean-fieldwork-closeout-actions.ts',
      'desktop/src/app/util/korean-fieldwork-document-drafts.ts',
      'desktop/src/app/util/korean-fieldwork-draft-defaults.ts',
      'desktop/src/app/util/korean-fieldwork-issue-resolution.ts',
      'desktop/src/app/util/korean-fieldwork-record-actions.ts',
      'desktop/src/app/util/korean-fieldwork-record-work-filters.ts',
      'desktop/src/app/util/korean-fieldwork-today-stats.ts'
    ]
  },
  {
    reason: 'tablet project screen that composes fieldwork panels and closeout summaries',
    files: [
      'mobile/app/(tabs)/ProjectScreen/DocumentAdd.tsx',
      'mobile/app/(tabs)/ProjectScreen/DocumentEdit.tsx',
      'mobile/app/(tabs)/ProjectScreen/index.tsx'
    ]
  },
  {
    reason: 'tablet support panels composed into the project workbench',
    files: [
      'mobile/components/Project/KoreanFieldworkDraftContextPanel.tsx',
      'mobile/components/Project/KoreanFieldworkDraftContinuationPanel.tsx',
      'mobile/components/Project/KoreanFieldworkDraftPresetPanel.tsx',
      'mobile/components/Project/KoreanFieldworkDrawingSurveyPanel.tsx',
      'mobile/components/Project/KoreanFieldworkFeaturePitLinePanel.tsx',
      'mobile/components/Project/KoreanFieldworkFindSpotPanel.tsx',
      'mobile/components/Project/KoreanFieldworkFullscreenDrawingModal.tsx',
      'mobile/components/Project/KoreanFieldworkHierarchyBoard.tsx',
      'mobile/components/Project/KoreanFieldworkNarrativeAssistPanel.tsx',
      'mobile/components/Project/KoreanFieldworkRecordActionPanel.tsx',
      'mobile/components/Project/KoreanFieldworkRecordContextPanel.tsx',
      'mobile/components/Project/KoreanFieldworkSiteOverviewMap.tsx',
      'mobile/components/Project/KoreanFieldworkWorkbenchPanel.tsx'
    ]
  },
  {
    reason: 'tablet shared utilities consumed by feature-row panels',
    files: [
      'mobile/components/Project/Map/korean-fieldwork-drafts.ts',
      'mobile/components/Project/korean-fieldwork-add-options.ts',
      'mobile/components/Project/korean-fieldwork-categories.ts',
      'mobile/components/Project/korean-fieldwork-child-records.ts',
      'mobile/components/Project/korean-fieldwork-closeout-actions.ts',
      'mobile/components/Project/korean-fieldwork-document-drafts.ts',
      'mobile/components/Project/korean-fieldwork-draft-continuation.ts',
      'mobile/components/Project/korean-fieldwork-draft-presets.ts',
      'mobile/components/Project/korean-fieldwork-feature-types.ts',
      'mobile/components/Project/korean-fieldwork-hierarchy.ts',
      'mobile/components/Project/korean-fieldwork-issue-resolution.ts',
      'mobile/components/Project/korean-fieldwork-narrative-assist.ts',
      'mobile/components/Project/korean-fieldwork-navigation.ts',
      'mobile/components/Project/korean-fieldwork-operation-wrap.ts',
      'mobile/components/Project/korean-fieldwork-progress.ts',
      'mobile/components/Project/korean-fieldwork-project-setup-sync.ts',
      'mobile/components/Project/korean-fieldwork-record-actions.ts',
      'mobile/components/Project/korean-fieldwork-record-list-empty-state.ts',
      'mobile/components/Project/korean-fieldwork-record-selection.ts',
      'mobile/components/Project/korean-fieldwork-record-summary.ts',
      'mobile/components/Project/korean-fieldwork-record-work-filters.ts',
      'mobile/components/Project/korean-fieldwork-scope.ts',
      'mobile/components/Project/korean-fieldwork-unit-matrix.ts'
    ]
  }
];

const classifiedSupportSources = classifiedSupportSourceGroups
  .flatMap((group) => group.files);

const sourceInventoryPatterns = [
  /^mobile\/app\/\(tabs\)\/ProjectScreen\/Document(Add|Edit)\.tsx$/,
  /^mobile\/app\/\(tabs\)\/ProjectScreen\/index\.tsx$/,
  /^mobile\/app\/\(tabs\)\/SettingsScreen\.tsx$/,
  /^mobile\/components\/Home\/CreateProjectModal\.tsx$/,
  /^mobile\/components\/Project\/KoreanFieldwork.*\.tsx$/,
  /^mobile\/components\/Project\/korean-fieldwork-.*\.ts$/,
  /^mobile\/components\/Project\/soil-color-photo-assist\.ts$/,
  /^mobile\/components\/Project\/SoilProfileCameraButton\.tsx$/,
  /^mobile\/components\/Project\/Map\/korean-fieldwork-drafts\.ts$/,
  /^mobile\/components\/Project\/Map\/korean-fieldwork-map-(provider-status|start-panel)\.ts$/,
  /^mobile\/components\/common\/forms\/DocumentForm\.tsx$/,
  /^mobile\/hooks\/use-korean-fieldwork-project-setup-defaults\.ts$/,
  /^desktop\/src\/app\/components\/docedit\/core\/edit-form\.(component\.ts|html|scss)$/,
  /^desktop\/src\/app\/components\/docedit\/core\/korean-fieldwork-.*\.(ts|html|scss)$/,
  /^desktop\/src\/app\/components\/project\/(create-project-modal|project-information-modal)\.(component\.ts|html|scss)$/,
  /^desktop\/src\/app\/components\/settings\/settings\.(component\.ts|html|scss)$/,
  /^desktop\/src\/app\/components\/resources\/korean-fieldwork-priority-strip\.(component\.ts|html|scss)$/,
  /^desktop\/src\/app\/util\/korean-fieldwork-.*\.ts$/,
  /^tools\/korean-fieldwork-(media-contract-check|parity-check|verify)\.js$/
];

const sharedPriorityTaskIds = [
  'start-operation',
  'create-daily-log',
  'create-survey-boundary',
  'create-trench',
  'create-trench-profile-photo',
  'create-detected-feature',
  'create-trench-pit',
  'create-pit-profile-photo',
  'create-trench-photo',
  'create-pre-investigation-photo',
  'create-excavation-section',
  'create-excavation-profile-photo',
  'create-excavation-drawing'
];

const missing = [];
const missingCoverage = [];

for (const row of featureRows) {
  const missingTablet = row.tablet.filter((filePath) => !exists(filePath));
  const missingDesktop = row.desktop.filter((filePath) => !exists(filePath));
  const missingTabletTests = row.tabletTests.filter((filePath) => !exists(filePath));
  const missingDesktopTests = row.desktopTests.filter((filePath) => !exists(filePath));

  if (missingTablet.length > 0 || missingDesktop.length > 0) {
    missing.push({ row, missingTablet, missingDesktop });
  }

  if (missingTabletTests.length > 0 || missingDesktopTests.length > 0) {
    missingCoverage.push({ row, missingTabletTests, missingDesktopTests });
  }
}

const gitStatusEntries = getGitStatusEntries();
const untrackedCriticalFiles = gitStatusEntries
  .filter((entry) => entry.indexStatus === '?' && entry.worktreeStatus === '?')
  .map((entry) => entry.filePath)
  .filter(isReleaseCriticalFile)
  .sort();
const unstagedCriticalFiles = gitStatusEntries
  .filter((entry) => entry.indexStatus !== '?' && entry.worktreeStatus !== ' ')
  .map((entry) => entry.filePath)
  .filter(isReleaseCriticalFile)
  .sort();
const investigationModeFindings = compareInvestigationModes();
const guidedFeatureFindings = [
  ...compareGuidedFeatureTypes(),
  ...compareGuidedFeatureAttributes(),
  ...validateGuidedFeatureDraftDefaults()
];
const guidedFeatureConfigFindings = validateGuidedFeatureConfig();
const projectStartSequenceFindings = validateProjectStartSequence();
const projectSettingsFindings = validateProjectSettingsCompleteness();
const projectInvestigationModeWordingFindings = validateProjectInvestigationModeWording();
const priorityTaskFindings = validatePriorityTaskIds();
const rawFormFindings = validateRawFormFieldRules();
const reportHandoffFindings = validateReportHandoffPreSaveValidation();
const tabletInstallGuideFindings = validateTabletInstallGuide();
const identifierRevisionFindings = validateIdentifierRevisionContract();
const recordPanelOrderFindings = validateRecordPanelOrder();
const connectedRecordWordingFindings = validateConnectedRecordWording();
const scopeMetricWordingFindings = validateScopeMetricWording();
const soilColorReviewFindings = validateSoilColorReviewWorkflow();
const progressModeFindings = validateProgressModeAwareness();
const recordActionFindings = validateRecordActionEvidencePriority();
const recordEmptyStateFindings = validateRecordEmptyStateGuidance();
const verificationCoverageFindings = validateFieldworkVerificationCoverage();
const sourceInventoryFindings = findUnclassifiedSourceFiles();
const supportInventoryFindings = validateSupportSourceGroups();

printReport(
  missing,
  missingCoverage,
  untrackedCriticalFiles,
  unstagedCriticalFiles,
  investigationModeFindings,
  guidedFeatureFindings,
  guidedFeatureConfigFindings,
  projectStartSequenceFindings,
  projectSettingsFindings,
  projectInvestigationModeWordingFindings,
  priorityTaskFindings,
  rawFormFindings,
  reportHandoffFindings,
  tabletInstallGuideFindings,
  identifierRevisionFindings,
  recordPanelOrderFindings,
  connectedRecordWordingFindings,
  scopeMetricWordingFindings,
  soilColorReviewFindings,
  progressModeFindings,
  recordActionFindings,
  recordEmptyStateFindings,
  verificationCoverageFindings,
  sourceInventoryFindings,
  supportInventoryFindings
);

if (
  !reportOnly
  && (
    missing.length > 0
    || missingCoverage.length > 0
    || untrackedCriticalFiles.length > 0
    || unstagedCriticalFiles.length > 0
    || investigationModeFindings.length > 0
    || guidedFeatureFindings.length > 0
    || guidedFeatureConfigFindings.length > 0
    || projectStartSequenceFindings.length > 0
    || projectSettingsFindings.length > 0
    || projectInvestigationModeWordingFindings.length > 0
    || priorityTaskFindings.length > 0
    || rawFormFindings.length > 0
    || reportHandoffFindings.length > 0
    || tabletInstallGuideFindings.length > 0
    || identifierRevisionFindings.length > 0
    || recordPanelOrderFindings.length > 0
    || connectedRecordWordingFindings.length > 0
    || scopeMetricWordingFindings.length > 0
    || soilColorReviewFindings.length > 0
    || progressModeFindings.length > 0
    || recordActionFindings.length > 0
    || recordEmptyStateFindings.length > 0
    || verificationCoverageFindings.length > 0
    || sourceInventoryFindings.length > 0
    || supportInventoryFindings.length > 0
  )
) {
  process.exitCode = 1;
}

function exists(filePath) {
  return fs.existsSync(path.join(repoRoot, filePath));
}

function validateFieldworkVerificationCoverage() {
  const findings = [];
  let selectedPaths;

  try {
    selectedPaths = JSON.parse(childProcess.execFileSync(
      process.execPath,
      ['tools/korean-fieldwork-verify.js', '--list-test-paths'],
      { cwd: repoRoot, encoding: 'utf8' }
    ));
  } catch (error) {
    findings.push(`unable to inspect Korean fieldwork verifier test paths: ${error.message}`);
    return findings;
  }

  const desktopTests = new Set(selectedPaths.desktop || []);
  const mobileTests = new Set(selectedPaths.mobile || []);

  for (const row of featureRows) {
    for (const filePath of row.desktopTests) {
      const verifierPath = filePath.replace(/^desktop\//, '');
      if (!desktopTests.has(verifierPath)) {
        findings.push(`default verifier desktop tests omit ${row.id}: ${filePath}`);
      }
    }

    for (const filePath of row.tabletTests) {
      const verifierPath = filePath.replace(/^mobile\//, '');
      if (!mobileTests.has(verifierPath)) {
        findings.push(`default verifier tablet tests omit ${row.id}: ${filePath}`);
      }
    }
  }

  if (readTextFile('package.json').includes('--all-fieldwork-tests')) {
    findings.push('package scripts still depend on legacy --all-fieldwork-tests flag');
  }

  return findings;
}

function getGitStatusEntries() {
  let output = '';
  try {
    output = childProcess.execFileSync(
      'git',
      ['status', '--porcelain=v1', '--untracked-files=all'],
      { cwd: repoRoot, encoding: 'utf8' }
    );
  } catch (error) {
    console.warn('WARN unable to inspect git status:', error.message);
    return [];
  }

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseGitStatusLine)
    .filter((entry) => entry !== undefined);
}

function parseGitStatusLine(line) {
  const indexStatus = line[0];
  const worktreeStatus = line[1];
  const filePath = line.slice(3).split(' -> ').pop().replace(/\\/g, '/');

  if (!filePath) return undefined;

  return { indexStatus, worktreeStatus, filePath };
}

function isReleaseCriticalFile(filePath) {
  return releaseCriticalPatterns.some((pattern) => pattern.test(filePath));
}

function validateSupportSourceGroups() {
  const findings = [];
  const seen = new Set();

  for (const [index, group] of classifiedSupportSourceGroups.entries()) {
    if (!group.reason || group.reason.trim().length === 0) {
      findings.push(`support source group ${index + 1} has no reason`);
    }

    if (!Array.isArray(group.files) || group.files.length === 0) {
      findings.push(`support source group ${index + 1} has no files`);
      continue;
    }

    for (const filePath of group.files) {
      if (seen.has(filePath)) {
        findings.push(`support source is classified more than once: ${filePath}`);
      }
      seen.add(filePath);

      if (!exists(filePath)) {
        findings.push(`support source is classified but missing: ${filePath}`);
      }
    }
  }

  return findings;
}

function findUnclassifiedSourceFiles() {
  const registered = new Set([
    ...classifiedSupportSources,
    ...featureRows.flatMap((row) => [...row.tablet, ...row.desktop])
  ]);

  return getWatchedSourceFiles()
    .filter((filePath) => !registered.has(filePath))
    .sort();
}

function getWatchedSourceFiles() {
  return [
    ...walkRelative('mobile/app/(tabs)'),
    ...walkRelative('mobile/components/Home'),
    ...walkRelative('mobile/components/Project'),
    ...walkRelative('mobile/components/common/forms'),
    ...walkRelative('mobile/hooks'),
    ...walkRelative('desktop/src/app/components/docedit/core'),
    ...walkRelative('desktop/src/app/components/project'),
    ...walkRelative('desktop/src/app/components/settings'),
    ...walkRelative('desktop/src/app/components/resources'),
    ...walkRelative('desktop/src/app/util')
  ]
    .filter((filePath) => /\.(ts|tsx|html|scss)$/.test(filePath))
    .filter((filePath) => !/\.spec\./.test(filePath))
    .filter((filePath) => sourceInventoryPatterns.some((pattern) => pattern.test(filePath)));
}

function walkRelative(directory) {
  const absoluteDirectory = path.join(repoRoot, directory);
  if (!fs.existsSync(absoluteDirectory)) return [];

  return fs.readdirSync(absoluteDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      const filePath = path.join(directory, entry.name).replace(/\\/g, '/');

      return entry.isDirectory()
        ? walkRelative(filePath)
        : [filePath];
    });
}

function compareInvestigationModes() {
  const tabletModes = extractInvestigationModeOptions(
    'mobile/components/Project/korean-fieldwork-investigation-mode.ts',
    'KOREAN_FIELDWORK_INVESTIGATION_MODES',
    'id'
  );
  const desktopModes = extractInvestigationModeOptions(
    'desktop/src/app/util/korean-fieldwork-project-setup.ts',
    'KOREAN_FIELDWORK_INVESTIGATION_MODES',
    'value'
  );
  const allModeIds = sortUnique([
    ...Object.keys(tabletModes),
    ...Object.keys(desktopModes)
  ]);
  const findings = [];

  for (const modeId of allModeIds) {
    const tabletMode = tabletModes[modeId];
    const desktopMode = desktopModes[modeId];

    if (!tabletMode) {
      findings.push(`tablet investigation mode missing for desktop mode: ${modeId}`);
      continue;
    }
    if (!desktopMode) {
      findings.push(`desktop investigation mode missing for tablet mode: ${modeId}`);
      continue;
    }

    for (const propertyName of ['label', 'detail']) {
      if (tabletMode[propertyName] !== desktopMode[propertyName]) {
        findings.push(
          [
            `investigation mode ${propertyName} mismatch for ${modeId}:`,
            `tablet=${tabletMode[propertyName] || '(none)'}`,
            `desktop=${desktopMode[propertyName] || '(none)'}`
          ].join(' ')
        );
      }
    }
  }

  return findings;
}

function extractInvestigationModeOptions(filePath, arrayName, idPropertyName) {
  const text = readTextFile(filePath);
  const result = {};

  for (const objectText of extractTopLevelArrayObjects(text, arrayName)) {
    const modeId = extractStringProperty(objectText, idPropertyName);
    if (!modeId) continue;

    result[modeId] = {
      label: extractStringProperty(objectText, 'label'),
      detail: extractStringProperty(objectText, 'detail')
    };
  }

  return result;
}

function compareGuidedFeatureTypes() {
  const coreTypes = extractFeatureTypeOptions(
    'core/src/tools/korean-fieldwork-feature-types.ts',
    'KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS',
    'featureInterpretationTypeValue'
  );
  const desktopTypes = extractFeatureTypeOptions(
    'desktop/src/app/util/korean-fieldwork-feature-guidance.ts',
    'KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS',
    'interpretationValue'
  );
  const allTypes = sortUnique([
    ...Object.keys(coreTypes),
    ...Object.keys(desktopTypes)
  ]);
  const findings = [];
  const tabletWrapperText = readTextFile('mobile/components/Project/korean-fieldwork-feature-types.ts');
  const tabletDraftText = readTextFile('mobile/components/Project/korean-fieldwork-document-drafts.ts');
  const desktopDraftText = readTextFile('desktop/src/app/util/korean-fieldwork-document-drafts.ts');
  const coreDocumentDraftText = readTextFile('core/src/tools/korean-fieldwork-document-drafts.ts');

  if (!tabletWrapperText.includes("from 'idai-field-core'")
      || !tabletWrapperText.includes('KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS')
      || tabletWrapperText.includes('identifierPrefix:')) {
    findings.push('tablet feature type options must re-export the shared core feature type contract');
  }
  if (!coreDocumentDraftText.includes('getKoreanFieldworkFeatureIdentifierPrefix')
      || !coreDocumentDraftText.includes('getKoreanFieldworkFeatureInterpretationTypeValue')
      || !coreDocumentDraftText.includes('getKoreanFieldworkFeatureDraftValues')) {
    findings.push('core document drafts must own feature type prefixes and interpretation values');
  }
  if (!desktopDraftText.includes('getKoreanFieldworkFeatureDraftValues')
      || !tabletDraftText.includes('getKoreanFieldworkFeatureDraftValues')
      || desktopDraftText.includes('FEATURE_TYPE_IDENTIFIER_PREFIXES')) {
    findings.push('desktop feature drafts must use core feature type prefixes and interpretation values');
  }

  for (const featureType of allTypes) {
    if (!coreTypes[featureType]) {
      findings.push(
        `core feature type missing for desktop preset: ${featureType}`
      );
      continue;
    }
    if (!desktopTypes[featureType]) {
      findings.push(
        `desktop feature preset missing for core feature type: ${featureType}`
      );
      continue;
    }

    const coreInterpretation = coreTypes[featureType].interpretationValue;
    const desktopInterpretation = desktopTypes[featureType].interpretationValue;
    if (coreInterpretation !== desktopInterpretation) {
      findings.push(
        [
          `guided interpretation mismatch for ${featureType}:`,
          `core=${coreInterpretation || '(none)'}`,
          `desktop=${desktopInterpretation || '(none)'}`
        ].join(' ')
      );
    }
  }

  return findings;
}

function compareGuidedFeatureAttributes() {
  const tabletAttributes = extractTabletFeatureAttributes();
  const desktopAttributes = extractDesktopFeatureAttributes();
  const tabletLabels = extractTabletFeatureAttributeLabels();
  const configLabels = extractGuidedFeatureConfigLabels();
  const allFeatureTypes = sortUnique([
    ...Object.keys(tabletAttributes),
    ...Object.keys(desktopAttributes)
  ]);
  const findings = [];

  for (const featureType of allFeatureTypes) {
    const tabletFields = tabletAttributes[featureType] || {};
    const desktopFields = desktopAttributes[featureType] || {};
    const allFields = sortUnique([
      ...Object.keys(tabletFields),
      ...Object.keys(desktopFields)
    ]);

    for (const fieldName of allFields) {
      const tabletValues = tabletFields[fieldName] || [];
      const desktopValues = desktopFields[fieldName] || [];
      const missingTabletValues = desktopValues
        .filter((valueId) => !tabletValues.includes(valueId));
      const missingDesktopValues = tabletValues
        .filter((valueId) => !desktopValues.includes(valueId));

      if (tabletValues.length === 0 && desktopValues.length > 0) {
        findings.push(
          `tablet guided attribute field missing for ${featureType}: ${fieldName}`
        );
      } else if (desktopValues.length === 0 && tabletValues.length > 0) {
        findings.push(
          `desktop guided attribute field missing for ${featureType}: ${fieldName}`
        );
      }

      for (const valueId of missingTabletValues) {
        findings.push(
          `tablet guided value missing for ${featureType}.${fieldName}: ${valueId}`
        );
      }
      for (const valueId of missingDesktopValues) {
        findings.push(
          `desktop guided value missing for ${featureType}.${fieldName}: ${valueId}`
        );
      }

      for (const valueId of tabletValues) {
        const tabletLabel = tabletLabels[featureType]?.[fieldName]?.[valueId];
        const configLabel = configLabels[fieldName]?.[valueId];

        if (!tabletLabel) {
          findings.push(
            `tablet guided display label missing for ${featureType}.${fieldName}: ${valueId}`
          );
          continue;
        }
        if (!configLabel) continue;

        if (!areCompatibleKoreanFieldworkDisplayLabels(tabletLabel, configLabel)) {
          findings.push(
            [
              `guided display label mismatch for ${featureType}.${fieldName}.${valueId}:`,
              `tablet=${tabletLabel}`,
              `config=${configLabel}`
            ].join(' ')
          );
        }
      }
    }
  }

  return findings;
}

function validateGuidedFeatureDraftDefaults() {
  const findings = [];
  const tabletDraftText = readTextFile('mobile/components/Project/korean-fieldwork-document-drafts.ts');
  const tabletQuickRecordText = readTextFile('mobile/components/Project/KoreanFieldworkQuickRecordPanel.tsx');
  const tabletRecordContextText = readTextFile('mobile/components/Project/KoreanFieldworkRecordContextPanel.tsx');
  const tabletFieldNoteText = readTextFile('mobile/components/Project/KoreanFieldworkFieldNotePanel.tsx');
  const tabletMapBottomSheetText = readTextFile('mobile/components/Project/Map/MapBottomSheet.tsx');
  const desktopDraftText = readTextFile('desktop/src/app/util/korean-fieldwork-document-drafts.ts');
  const coreDocumentDraftText = readTextFile('core/src/tools/korean-fieldwork-document-drafts.ts');
  const coreDocumentDraftSpecText = readTextFile('core/test/tools/korean-fieldwork-document-drafts.spec.ts');
  const desktopDraftDefaultsText = readTextFile('desktop/src/app/util/korean-fieldwork-draft-defaults.ts');
  const coreDraftDefaultsText = readTextFile('core/src/tools/korean-fieldwork-draft-defaults.ts');
  const coreDraftDefaultsSpecText = readTextFile('core/test/tools/korean-fieldwork-draft-defaults.spec.ts');
  const desktopPlusButtonTemplateText = readTextFile('desktop/src/app/components/resources/plus-button.html');
  const desktopPlusButtonI18nText = [
    'de',
    'el',
    'en',
    'es',
    'fr',
    'it',
    'ko',
    'pt',
    'tr',
    'uk'
  ].map(locale => readTextFile(`desktop/src/app/i18n/angular/messages.${locale}.xlf`)).join('\n');
  const desktopFeatureGuidanceTemplateText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-feature-guidance-panel.html'
  );
  const desktopFeatureGuidanceComponentText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-feature-guidance-panel.component.ts'
  );
  const desktopFeatureGuidanceUtilText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-feature-guidance.ts'
  );
  const desktopQuickRecordText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-quick-record-panel.component.ts'
  );
  const desktopQuickRecordSpecText = readTextFile(
    'desktop/test/unit/components/docedit/core/korean-fieldwork-quick-record-panel.component.spec.ts'
  );
  const tabletAddModalText = readTextFile('mobile/components/Project/DocumentAddModal.tsx');
  const tabletAddModalSpecText = readTextFile('mobile/components/Project/DocumentAddModal.spec.tsx');
  const desktopRecordContextText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.component.ts'
  );
  const desktopRecordContextTemplateText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.html'
  );
  const desktopRecordContextStyleText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.scss'
  );
  const desktopGeometryFormStyleText = readTextFile(
    'desktop/src/app/components/docedit/core/forms/geometry.scss'
  );
  const desktopRecordContextSpecText = readTextFile(
    'desktop/test/unit/components/docedit/core/korean-fieldwork-record-context-panel.component.spec.ts'
  );
  const desktopEditableMapText = readTextFile(
    'desktop/src/app/components/resources/map/map/editable-map.component.ts'
  );
  const desktopEditableMapTemplateText = readTextFile(
    'desktop/src/app/components/resources/map/map/editable-map.html'
  );
  const desktopEditableMapStyleText = readTextFile(
    'desktop/src/app/components/resources/map/map/map.scss'
  );
  const desktopEditableMapSpecText = readTextFile(
    'desktop/test/unit/components/resources/editable-map.component.spec.ts'
  );
  const desktopPriorityStripText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts'
  );
  const desktopPriorityStripTemplateText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.html'
  );

  if (!coreDraftDefaultsText.includes('getKoreanFieldworkDraftFieldDefaults')
      || !coreDraftDefaultsText.includes('getKoreanFieldworkConfiguredDraftFieldDefaults')
      || !coreDraftDefaultsText.includes('KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE')
      || !coreDraftDefaultsText.includes('C.FEATURE_GROUP')
      || !coreDraftDefaultsSpecText.includes('Korean fieldwork draft defaults')) {
    findings.push('core draft defaults must define shared tablet and desktop draft field defaults');
  }
  if (!coreDocumentDraftText.includes('createKoreanFieldworkDraftBaseResource')
      || !coreDocumentDraftText.includes('createKoreanFieldworkDraftRelations')
      || !coreDocumentDraftText.includes('createKoreanFieldworkLinkedDraftIdentifier')
      || !coreDocumentDraftText.includes('createNextKoreanFieldworkFeatureIdentifier')
      || !coreDocumentDraftSpecText.includes('Korean fieldwork document drafts')) {
    findings.push('core document drafts must define shared tablet and desktop draft creation rules');
  }
  if (!tabletDraftText.includes('categoryName === C.FEATURE_GROUP')) {
    findings.push('tablet document drafts must treat FeatureGroup as a shared feature workflow draft category');
  }
  for (const [label, text] of [
    ['tablet document drafts', tabletDraftText],
    ['desktop document drafts', desktopDraftText]
  ]) {
    if (!text.includes('createKoreanFieldworkDraftBaseResource')
        || !text.includes('createKoreanFieldworkDraftRelations')) {
      findings.push(`${label} must reuse the shared core document draft contract`);
    }
    if (text.includes('DRAFT_IDENTIFIER_PREFIXES')) {
      findings.push(`${label} must not keep a local draft identifier prefix table`);
    }
  }
  for (const [label, text] of [
    ['tablet map drafts', readTextFile('mobile/components/Project/Map/korean-fieldwork-drafts.ts')],
    ['tablet document drafts', tabletDraftText],
    ['desktop draft defaults', desktopDraftDefaultsText]
  ]) {
    if (!text.includes('getKoreanFieldworkDraftFieldDefaults')
        && !text.includes('getKoreanFieldworkConfiguredDraftFieldDefaults')) {
      findings.push(`${label} must reuse the shared core draft default contract`);
    }
  }

  for (const [label, text] of [
    ['tablet', tabletDraftText],
    ['desktop', desktopDraftText]
  ]) {
    if (!text.includes('featureType?: string')) {
      findings.push(`${label} draft resource options do not accept featureType`);
    }
    if (!text.includes('options.featureType')) {
      findings.push(`${label} draft resource does not read featureType options`);
    }
    if (!text.includes('featureInterpretationType')
        && !text.includes('getKoreanFieldworkFeatureDraftValues')) {
      findings.push(`${label} feature drafts do not seed feature interpretation type`);
    }
  }

  if (!desktopDraftText.includes("options.featureType ?? 'unknown'")) {
    findings.push('desktop feature drafts must default to unknown feature type');
  }
  if (!tabletAddModalText.includes('KOREAN_FIELDWORK_FEATURE_TYPE_OPTIONS')) {
    findings.push('tablet add flow does not expose feature type options before creating Feature records');
  }
  if (!tabletAddModalText.includes('featureSketchFlatMapSurface')
      || !tabletAddModalText.includes('조사 경계 위 배치')
      || !tabletAddModalText.includes('featureSketchModeRail')
      || !tabletAddModalText.includes('featureSketchToolRail')
      || !tabletAddModalText.includes('featureLocationSketchTouchLayer')
      || !tabletAddModalText.includes('areSketchPointsEqual')
      || !tabletAddModalText.includes('height: 1280')
      || !tabletAddModalText.includes('reservedHeight = isFeatureWideLayout ? 352 : 180')
      || !tabletAddModalText.includes('minimumHeight = isFeatureWideLayout ? 440 : 460')
      || !tabletAddModalText.includes('maximumHeight = isFeatureWideLayout ? 860 : 760')
      || !tabletAddModalText.includes('featureLocationPanelWide')
      || !tabletAddModalText.includes('featureCreationLayoutWide')
      || !tabletAddModalText.includes("flexDirection: 'column'")
      || !tabletAddModalText.includes('featureCreationFormPaneWide')
      || !tabletAddModalText.includes('featureNamePanelWide')
      || !tabletAddModalText.includes('featureTypeGridWide')
      || !tabletAddModalText.includes('minHeight: 0')
      || !tabletAddModalText.includes('maxHeight: 352')
      || !tabletAddModalSpecText.includes('StyleSheet.flatten')
      || !tabletAddModalSpecText.includes('map-first tablet layout')
      || !tabletAddModalSpecText.includes('canvas.props.onStartShouldSetResponder')
      || !tabletAddModalSpecText.includes('featureLocationSketchTouchLayer')
      || tabletAddModalText.includes('지도처럼 위에서 보기')
      || tabletAddModalText.includes('평면 배치 지도')
      || !tabletAddModalSpecText.includes('featureSketchFlatMapSurface')) {
    findings.push('tablet add flow must place new features on a flat placement map surface');
  }
  if (!desktopRecordContextTemplateText.includes('flat-map-surface')
      || !desktopRecordContextTemplateText.includes('조사 경계 위 배치')
      || desktopRecordContextTemplateText.includes('지도처럼 위에서 보기')
      || desktopRecordContextTemplateText.includes('위성지도식 평면')
      || desktopRecordContextTemplateText.includes('평면 배치 지도')
      || !desktopRecordContextTemplateText.includes('satellite-field')
      || !desktopRecordContextTemplateText.includes('map-reference-card')
      || !desktopRecordContextTemplateText.includes('shape-reference-card')
      || !desktopRecordContextTemplateText.includes('korean-fieldwork-record-context-geometry-status')
      || !desktopRecordContextTemplateText.includes('setFeatureGeometryEditStatus(action.value)')
      || !desktopRecordContextStyleText.includes('.flat-map-surface')
      || !desktopRecordContextStyleText.includes('.satellite-road')
      || !desktopRecordContextStyleText.includes('.korean-fieldwork-record-context-geometry-status-button')
      || !desktopRecordContextStyleText.includes('height: clamp(220px, 30vh, 360px);')
      || !desktopRecordContextStyleText.includes('minmax(360px, 1.75fr) minmax(230px, 0.85fr)')
      || desktopRecordContextStyleText.includes('height: 148px;')
      || !desktopRecordContextSpecText.includes('flat placement map')) {
    findings.push('desktop record context must preview tablet feature placement as a flat placement map surface');
  }
  if (!desktopRecordContextText.includes('adjustedToAerialLayer')
      || !desktopRecordContextText.includes('adjustedToSurveyLine')
      || !desktopRecordContextText.includes('finalAccepted')
      || !desktopRecordContextText.includes('getFeatureGeometryStatusActions')
      || !desktopRecordContextSpecText.includes('tablet feature geometry status values')) {
    findings.push('desktop record context must read and update tablet feature geometry status values');
  }
  if (!desktopRecordContextText.includes('SURVEY_BOUNDARY_CATEGORY_NAME')
      || !desktopRecordContextText.includes('getSurveyBoundarySketchPoints')
      || !desktopRecordContextText.includes('getBoundaryCoordinatePairs')
      || !desktopRecordContextText.includes('makeFeatureLocationSketchFromGeometry')
      || !desktopRecordContextSpecText.includes('actual survey boundary on desktop')
      || !desktopRecordContextSpecText.includes('desktop polygon geometry as a feature placement preview')
      || !desktopRecordContextSpecText.includes('M 22.6 63 L 97.4 63 L 60 17 L 22.6 40 Z')) {
    findings.push('desktop record context must project tablet feature placement against actual survey boundary geometry');
  }
  if (!desktopGeometryFormStyleText.includes('clamp(360px, 48vh, 620px)')
      || !desktopGeometryFormStyleText.includes('min-height: 360px')) {
    findings.push('desktop geometry coordinate editor must be tall enough for map-first feature placement review');
  }
  if (!desktopEditableMapText.includes('isKoreanFieldworkFeaturePlacementEditor')
      || !desktopEditableMapText.includes('유구 평면 배치')
      || !desktopEditableMapText.includes('조사 경계 위')
      || !desktopEditableMapTemplateText.includes('map-editor-context-panel')
      || !desktopEditableMapTemplateText.includes('mdi-map-marker-path')
      || !desktopEditableMapStyleText.includes('#map-editor-context-panel')
      || !desktopEditableMapSpecText.includes('flat map placement')
      || !desktopEditableMapSpecText.includes('not a 3D overview')) {
    findings.push('desktop editable map must keep feature creation framed as flat survey-boundary placement');
  }
  if (!(desktopDraftDefaultsText.includes('위성지도나 평면도처럼 조사 경계 위에 유구 위치와 형태를 바로 얹으며 시작')
          || coreDraftDefaultsText.includes('KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE')
          || coreDraftDefaultsSpecText.includes('KOREAN_FIELDWORK_DESKTOP_FEATURE_TRACE_NOTE'))
      || desktopDraftDefaultsText.includes('조사 경계 위 평면지도에서 유구 위치와 형태를 그리며 시작')
      || coreDraftDefaultsText.includes('조사 경계 위 평면지도에서 유구 위치와 형태를 그리며 시작')) {
    findings.push('desktop feature draft defaults must use the same map-first placement wording as the tablet add flow');
  }
  if (!desktopPlusButtonTemplateText.includes('위성지도나 평면도처럼 조사 경계 위에 유구 위치와 형태를 바로 얹습니다.')
      || desktopPlusButtonTemplateText.includes('조사 경계 위 평면지도에 유구선을 그립니다.')
      || !desktopPlusButtonI18nText.includes('위성지도나 평면도처럼 조사 경계 위에 유구 위치와 형태를 바로 얹습니다.')
      || desktopPlusButtonI18nText.includes('조사 경계 위 평면지도에 유구선을 그립니다.')) {
    findings.push('desktop feature quick-create popover and i18n must describe feature placement as map-first, not an abstract feature-line drawing');
  }
  if (
    !tabletQuickRecordText.includes('getFeatureAttributeSectionTitle')
    || !tabletQuickRecordText.includes('핵심 속성')
  ) {
    findings.push('tablet guided feature panel must label type-specific attributes as core attributes');
  }
  if (
    !tabletQuickRecordText.includes('getKoreanFieldworkFeatureObservationPlaceholder')
    || !readTextFile('mobile/components/Project/korean-fieldwork-feature-attributes.ts')
        .includes('getKoreanFieldworkFeatureObservationPlaceholder')
  ) {
    findings.push('tablet guided feature panel must use feature-specific observation placeholders');
  }
  if (
    !readTextFile('mobile/components/Project/KoreanFieldworkQuickRecordPanel.spec.tsx')
      .includes('feature-specific placeholders')
    || !readTextFile('mobile/components/Project/korean-fieldwork-feature-attributes.spec.ts')
      .includes('type-specific observation placeholders')
  ) {
    findings.push('tablet guided feature panel tests must cover type-specific observation placeholders');
  }
  if (!tabletQuickRecordText.includes('유구 성격별 기록')) {
    findings.push('tablet guided feature panel must present feature-specific input as 유구 성격별 기록');
  }
  if (!hasOrderedSubstrings(tabletQuickRecordText, [
    'title="시대/시기"',
    'title="유구 성격"',
    'title={featureAttributeSectionTitle}'
  ])) {
    findings.push('tablet guided feature panel must keep 시대/시기 before 유구 성격 before 핵심 속성');
  }
  for (const source of [
    { label: 'tablet quick record', text: tabletQuickRecordText },
    { label: 'tablet field note', text: tabletFieldNoteText },
    { label: 'tablet map bottom sheet', text: tabletMapBottomSheetText }
  ]) {
    if (!source.text.includes('조사 단계 확인')) {
      findings.push(`${source.label} must label checklist input as 조사 단계 확인`);
    }
    if (source.text.includes('조사 흐름')) {
      findings.push(`${source.label} still labels checklist input as 조사 흐름`);
    }
  }
  if (!desktopFeatureGuidanceTemplateText.includes('유구 성격별 기록')) {
    findings.push('desktop guided feature panel must present feature-specific input as 유구 성격별 기록');
  }
  if (
    !desktopFeatureGuidanceComponentText.includes('getNarrativePlaceholder')
    || !desktopFeatureGuidanceTemplateText.includes('[placeholder]="getNarrativePlaceholder()"')
  ) {
    findings.push('desktop guided feature panel must expose selected feature templates as observation placeholders');
  }
  if (!desktopQuickRecordText.includes('조사 단계 확인')) {
    findings.push('desktop quick record panel must label checklist input as 조사 단계 확인');
  }
  if (!desktopQuickRecordText.includes('유구 진행')) {
    findings.push('desktop quick record panel must label feature status as 유구 진행');
  }
  if (!desktopQuickRecordSpecText.includes('field-facing labels')) {
    findings.push('desktop quick record panel test must cover field-facing labels');
  }
  if (!hasOrderedSubstrings(desktopFeatureGuidanceTemplateText, [
    'getPeriodFieldName()',
    'canSelectFeatureType()',
    'getCoreAttributeTitle'
  ])) {
    findings.push('desktop guided feature panel must keep 시대/시기 before 유구 성격 before 핵심 속성');
  }
  if (!readTextFile(
    'desktop/test/unit/components/docedit/core/korean-fieldwork-feature-guidance-panel.component.spec.ts'
  ).includes('field recording order')) {
    findings.push('desktop guided feature panel test must cover field recording order');
  }
  if (!readTextFile(
    'desktop/test/unit/components/docedit/core/korean-fieldwork-feature-guidance-panel.component.spec.ts'
  ).includes('observation placeholder')) {
    findings.push('desktop guided feature panel test must cover type-specific observation placeholders');
  }
  if (
    !desktopFeatureGuidanceTemplateText.includes('getCoreAttributeTitle')
    || !desktopFeatureGuidanceComponentText.includes('핵심 속성')
  ) {
    findings.push('desktop guided feature panel must label type-specific attributes as core attributes');
  }
  if (
    !desktopFeatureGuidanceUtilText.includes('getKoreanFieldworkFeatureGuidanceSelectedAttributeLabels')
    || !desktopFeatureGuidanceUtilText.includes("combustionPartRecorded: '연소부'")
    || !desktopRecordContextText.includes('getKoreanFieldworkFeatureGuidanceSelectedAttributeLabels')
    || !desktopRecordContextText.includes('핵심 속성 미기록')
  ) {
    findings.push('desktop opened-record context must summarize selected guided feature core attributes');
  }
  if (desktopFeatureGuidanceTemplateText.includes('유구 속성')) {
    findings.push('desktop guided feature panel still uses broad feature-attribute wording');
  }
  if (desktopFeatureGuidanceTemplateText.includes('세부 속성')) {
    findings.push('desktop guided feature panel still uses detail-form wording for type-specific attributes');
  }
  if (!desktopRecordContextText.includes('createFeatureContinuationRecord')) {
    findings.push('desktop continuation flow does not create typed Feature drafts');
  }
  if (!desktopRecordContextText.includes('KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS')) {
    findings.push('desktop continuation flow does not reuse guided Feature presets');
  }
  if (!desktopRecordContextTemplateText.includes('korean-fieldwork-record-context-feature-type')) {
    findings.push('desktop continuation flow does not render Feature type choices');
  }
  if (!desktopRecordContextText.includes('포함 위치: 현재 기록')) {
    findings.push('desktop continuation flow must describe child drafts with 포함 위치 wording');
  }
  if (desktopRecordContextText.includes('상위 기록') || desktopRecordContextText.includes('현재 기록에 묶어 두기')) {
    findings.push('desktop continuation flow still uses hierarchy/묶어 두기 wording');
  }
  if (!desktopRecordContextText.includes('유구로 만들기')) {
    findings.push('desktop continuation unknown Feature option must read 유구로 만들기');
  }
  if (!tabletRecordContextText.includes('포함 위치: {parentPath}')) {
    findings.push('tablet record context must show parent path as 포함 위치');
  }
  if (tabletRecordContextText.includes('parentPath ? ` · ${parentPath}`')) {
    findings.push('tablet record context still folds parent path into the title');
  }
  if (!desktopRecordContextTemplateText.includes('포함 위치: {{parentPathLabel}}')) {
    findings.push('desktop record context must show parent path as 포함 위치');
  }
  if (!desktopPriorityStripText.includes('pendingFeatureDraft')) {
    findings.push('desktop dashboard create flow does not pause Feature drafts for type selection');
  }
  if (!desktopPriorityStripText.includes('createPendingFeatureDraft')) {
    findings.push('desktop dashboard create flow does not create typed Feature drafts');
  }
  if (!desktopPriorityStripTemplateText.includes('korean-fieldwork-feature-draft-picker')) {
    findings.push('desktop dashboard create flow does not render Feature type choices');
  }
  if (!desktopPriorityStripTemplateText.includes('포함 위치')) {
    findings.push('desktop dashboard Feature draft picker must show parent scope as 포함 위치');
  }
  if (desktopPriorityStripTemplateText.includes('묶어 둘')) {
    findings.push('desktop dashboard Feature draft picker still uses ambiguous 묶어 둘 wording');
  }
  if (!desktopPriorityStripText.includes('유구로 만들기')) {
    findings.push('desktop dashboard unknown Feature draft option must read 유구로 만들기');
  }

  return findings;
}

function hasOrderedSubstrings(text, substrings) {
  let previousIndex = -1;

  for (const substring of substrings) {
    const index = text.indexOf(substring);
    if (index === -1 || index <= previousIndex) return false;
    previousIndex = index;
  }

  return true;
}

function validateGuidedFeatureConfig() {
  const findings = [];
  const config = readJsonFile('core/config/Config-KoreanFieldwork.json');
  const valuelists = readJsonFile('core/config/Library/Valuelists/Valuelists.json');
  const koreanLabels = readJsonFile('core/config/Library/Valuelists/Language.projects.ko.json');
  const englishLabels = readJsonFile('core/config/Library/Valuelists/Language.projects.en.json');
  const featureForm = config.forms?.['Feature:default'];
  const requiredFieldValues = collectGuidedFeatureAttributeFieldValues();

  if (!featureForm) {
    return ['Feature:default form is missing from Korean fieldwork configuration'];
  }

  for (const [fieldName, valueIds] of Object.entries(requiredFieldValues)) {
    const field = featureForm.fields?.[fieldName];
    const valuelistId = featureForm.valuelists?.[fieldName];

    if (!field) {
      findings.push(`guided config field missing in Feature:default: ${fieldName}`);
      continue;
    }

    if (field.inputType !== 'checkboxes') {
      findings.push(
        `guided config field must use checkboxes in Feature:default: ${fieldName}`
      );
    }

    if (!valuelistId) {
      findings.push(`guided config field has no valuelist in Feature:default: ${fieldName}`);
      continue;
    }

    const valuelist = valuelists[valuelistId];
    if (!valuelist) {
      findings.push(`guided valuelist missing for ${fieldName}: ${valuelistId}`);
      continue;
    }

    const orderedValueIds = Array.isArray(valuelist.order) ? valuelist.order : [];
    for (const valueId of valueIds) {
      if (!valuelist.values?.[valueId]) {
        findings.push(`guided valuelist value missing for ${fieldName}: ${valueId}`);
      }
      if (!orderedValueIds.includes(valueId)) {
        findings.push(`guided valuelist order missing for ${fieldName}: ${valueId}`);
      }
      if (!koreanLabels[valuelistId]?.values?.[valueId]?.label) {
        findings.push(`guided Korean valuelist label missing for ${fieldName}: ${valueId}`);
      }
      if (!englishLabels[valuelistId]?.values?.[valueId]?.label) {
        findings.push(`guided English valuelist label missing for ${fieldName}: ${valueId}`);
      }
    }
  }

  return findings;
}

function validatePriorityTaskIds() {
  const sources = [
    {
      label: 'tablet',
      filePath: 'mobile/components/Project/korean-fieldwork-today-actions.ts'
    },
    {
      label: 'desktop',
      filePath: 'desktop/src/app/util/korean-fieldwork-today-actions.ts'
    }
  ];
  const findings = [];

  for (const source of sources) {
    const text = readTextFile(source.filePath);

    for (const taskId of sharedPriorityTaskIds) {
      if (!text.includes(`id: '${taskId}'`)) {
        findings.push(`${source.label} priority task id missing: ${taskId}`);
      }
    }
  }

  const desktopTodayActionsText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-today-actions.ts'
  );
  const desktopPriorityStripText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts'
  );
  const desktopPriorityStripTemplateText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.html'
  );
  const desktopPriorityStripSpecText = readTextFile(
    'desktop/test/unit/components/resources/korean-fieldwork-priority-strip.component.spec.ts'
  );
  const desktopTodayActionsSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-today-actions.spec.ts'
  );

  for (const token of [
    'secondaryAction?: KoreanFieldworkPriorityTaskAction',
    'secondaryActionDetail?: string',
    "secondaryAction: { type: 'openImport' }",
    'secondaryActionLabel'
  ]) {
    if (!desktopTodayActionsText.includes(token)) {
      findings.push(`desktop priority tasks must expose boundary import secondary action token: ${token}`);
    }
  }
  if (!desktopPriorityStripText.includes('runPriorityTaskSecondaryAction')) {
    findings.push('desktop priority strip must run priority task secondary actions');
  }
  if (!desktopPriorityStripTemplateText.includes('korean-fieldwork-task-secondary-action')) {
    findings.push('desktop priority strip template must render priority task secondary actions');
  }
  const desktopBoundaryImportGuidanceText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-boundary-import-guidance.ts'
  );
  const boundaryImportSyncDetail =
    'SHP/DXF/GeoJSON은 태블릿에서 파일 선택으로 바로 가져오거나, 데스크톱에서 가져온 뒤 같은 프로젝트로 동기화해 조사 경계로 확인할 수 있습니다.';
  if (!desktopBoundaryImportGuidanceText.includes(boundaryImportSyncDetail)) {
    findings.push('desktop boundary import guidance must explain desktop import and tablet sync handoff');
  }
  if (!desktopPriorityStripTemplateText.includes('secondaryActionDetail ||')) {
    findings.push('desktop boundary import actions must expose sync handoff detail in tooltips');
  }
  if (!desktopTodayActionsSpecText.includes('secondaryAction: { type: \'openImport\' }')) {
    findings.push('desktop priority task tests must cover boundary import secondary action');
  }
  if (!desktopTodayActionsSpecText.includes(boundaryImportSyncDetail)
      || !desktopPriorityStripSpecText.includes(boundaryImportSyncDetail)) {
    findings.push('desktop boundary import tests must cover tablet sync handoff detail');
  }
  if (!desktopPriorityStripSpecText.includes('offers import as a secondary boundary setup action from priority tasks')) {
    findings.push('desktop priority strip tests must cover import secondary action execution');
  }
  const tabletMapText = readTextFile('mobile/components/Project/Map/Map.tsx');
  if (!tabletMapText.includes(boundaryImportSyncDetail)
      || !tabletMapText.includes('현장에서는 GPS 임시 경계나 위성지도 위치도 바로 보탤 수 있습니다.')) {
    findings.push('tablet boundary import info must match direct tablet file import and desktop sync handoff');
  }

  return findings;
}

function validateProjectStartSequence() {
  const findings = [];
  const mobileCreateText = readTextFile('mobile/components/Home/CreateProjectModal.tsx');
  const mobileCreateSpecText = readTextFile('mobile/components/Home/CreateProjectModal.spec.tsx');
  const mobileTabLayoutText = readTextFile('mobile/app/(tabs)/_layout.tsx');
  const mobileProjectScreenLayoutText = readTextFile('mobile/app/(tabs)/ProjectScreen/_layout.tsx');
  const mobileNavigationSpecText = readTextFile(
    'mobile/components/Project/korean-fieldwork-navigation.spec.ts'
  );
  const desktopCreateText = readTextFile(
    'desktop/src/app/components/project/create-project-modal.component.ts'
  );
  const desktopCreateTemplateText = readTextFile(
    'desktop/src/app/components/project/create-project-modal.html'
  );
  const desktopCreateSpecText = readTextFile(
    'desktop/test/unit/components/project/create-project-modal.component.spec.ts'
  );
  const mobileStartSteps = [
    '프로젝트 기본 조사 방식을 정합니다.',
    '조사 경계 기준을 문장으로 남깁니다.',
    '지도에서 경계를 직접 그리거나 SHP/DXF/GeoJSON을 가져옵니다.'
  ];
  const desktopStartSteps = [
    '프로젝트 기본 조사 방식을 정합니다.',
    '조사 경계 기준을 문장으로 남깁니다.',
    '프로젝트 생성 후 지도에서 경계를 그리거나 가져옵니다.'
  ];
  const boundaryHelp =
    '지도에서 도형을 그리거나 지원되는 파일 가져오기로 확정합니다.';
  const readyStatus =
    '준비 완료. 이 경계를 기준으로 프로젝트를 만들 수 있습니다.';
  const desktopReadyStatus =
    '프로젝트 생성 후 지도에서 조사 경계를 그리거나 가져와 확정하세요.';

  for (const step of mobileStartSteps) {
    if (!mobileCreateText.includes(step)) {
      findings.push(`tablet create-project start step missing: ${step}`);
    }
    if (!mobileCreateSpecText.includes(step)) {
      findings.push(`tablet create-project test does not cover start step: ${step}`);
    }
  }
  for (const step of desktopStartSteps) {
    if (!desktopCreateText.includes(step)) {
      findings.push(`desktop create-project start step missing: ${step}`);
    }
    if (!desktopCreateSpecText.includes(step)) {
      findings.push(`desktop create-project test does not cover start step: ${step}`);
    }
  }

  if (!mobileCreateText.includes(boundaryHelp)) {
    findings.push('tablet create-project boundary help must mention draw/import confirmation');
  }
  if (!desktopCreateTemplateText.includes(boundaryHelp)) {
    findings.push('desktop create-project boundary help must mention draw/import confirmation');
  }
  if (!mobileCreateText.includes(readyStatus)) {
    findings.push('tablet create-project ready status must point to draw/import confirmation');
  }
  if (!mobileCreateSpecText.includes(readyStatus)) {
    findings.push('tablet create-project test must cover draw/import ready status');
  }
  if (!desktopCreateText.includes(desktopReadyStatus)) {
    findings.push('desktop create-project ready status must point to draw/import confirmation');
  }
  if (!desktopCreateSpecText.includes(desktopReadyStatus)) {
    findings.push('desktop create-project test must cover draw/import ready status');
  }
  if (desktopCreateText.includes('KOREAN_FIELDWORK_DEFAULT_INVESTIGATION_MODE')) {
    findings.push('desktop create-project must require an explicit investigation-mode selection');
  }
  if (!desktopCreateText.includes("public koreanInvestigationMode: string = '';")) {
    findings.push('desktop create-project investigation mode must start empty');
  }
  if (!desktopCreateSpecText.includes('조사 방식을 선택해야 프로젝트를 만들 수 있습니다.')) {
    findings.push('desktop create-project test must cover missing investigation-mode status');
  }

  if (mobileProjectScreenLayoutText.includes('expo-router/drawer')
      || mobileProjectScreenLayoutText.includes('<Drawer')) {
    findings.push('tablet project screen must use stack navigation so a drawer overlay cannot block field-board touches');
  }
  if (!mobileProjectScreenLayoutText.includes("from 'expo-router'")
      || !mobileProjectScreenLayoutText.includes('Stack')) {
    findings.push('tablet project screen layout must use Stack navigation');
  }
  if (!mobileTabLayoutText.includes('canOpenKoreanFieldworkProject')) {
    findings.push('tablet record tab must block navigation until a project exists');
  }
  if (!mobileProjectScreenLayoutText.includes('ProjectRequiredState')) {
    findings.push('tablet project screen must show a project-required state when opened without a project');
  }
  if (!mobileNavigationSpecText.includes('blocks the field board when no project has been created or opened')) {
    findings.push('tablet navigation tests must cover blocking field board access without a project');
  }

  return findings;
}

function validateProjectSettingsCompleteness() {
  const findings = [];
  const mobileSettingsText = readTextFile('mobile/app/(tabs)/SettingsScreen.tsx');
  const mobileSettingsSpecText = readTextFile('mobile/test/screens/SettingsScreen.spec.tsx');
  const mobileMapProviderStatusText = readTextFile(
    'mobile/components/Project/Map/korean-fieldwork-map-provider-status.ts'
  );
  const mobileMapProviderStatusSpecText = readTextFile(
    'mobile/components/Project/Map/korean-fieldwork-map-provider-status.spec.ts'
  );
  const mobilePackageText = readTextFile('mobile/package.json');
  const mobileDocumentsMapText = readTextFile('mobile/components/Project/DocumentsMap.tsx');
  const mobileMapText = readTextFile('mobile/components/Project/Map/Map.tsx');
  const mobileMapBottomSheetText = readTextFile(
    'mobile/components/Project/Map/MapBottomSheet.tsx'
  );
  const mobileMapBottomSheetSpecText = readTextFile(
    'mobile/components/Project/Map/MapBottomSheet.spec.tsx'
  );
  const mobileKakaoSatellitePickerText = readTextFile(
    'mobile/components/Project/Map/KakaoSatellitePicker.tsx'
  );
  const mobileKakaoSatellitePickerHtmlText = readTextFile(
    'mobile/components/Project/Map/kakao-satellite-picker-html.ts'
  );
  const mobileKakaoSatellitePickerHtmlSpecText = readTextFile(
    'mobile/components/Project/Map/kakao-satellite-picker-html.spec.ts'
  );
  const mobileBoundaryFileImportModalText = readTextFile(
    'mobile/components/Project/Map/BoundaryFileImportModal.tsx'
  );
  const mobileBoundaryFileImportModalSpecText = readTextFile(
    'mobile/components/Project/Map/BoundaryFileImportModal.spec.tsx'
  );
  const mobileBoundaryFileImportText = readTextFile(
    'mobile/components/Project/Map/boundary-file-import.ts'
  );
  const mobileBoundaryFileImportSpecText = readTextFile(
    'mobile/components/Project/Map/boundary-file-import.spec.ts'
  );
  const desktopSettingsText = readTextFile('desktop/src/app/components/settings/settings.component.ts');
  const desktopSettingsTemplateText = readTextFile('desktop/src/app/components/settings/settings.html');
  const desktopSettingsStyleText = readTextFile('desktop/src/app/components/settings/settings.scss');
  const desktopSettingsSpecText = readTextFile(
    'desktop/test/unit/components/settings/settings.component.spec.ts'
  );
  const desktopSettingsModelText = readTextFile('desktop/src/app/services/settings/settings.ts');
  const desktopSettingsProviderText = readTextFile('desktop/src/app/services/settings/settings-provider.ts');
  const desktopSettingsSerializerText = readTextFile('desktop/src/app/services/settings/settings-serializer.ts');
  const desktopMainText = readTextFile('desktop/electron/main.js');
  const desktopMapProviderText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-map-provider-settings.ts'
  );
  const desktopMapProviderSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-map-provider-settings.spec.ts'
  );
  const desktopProjectSetupText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-project-setup.ts'
  );
  const desktopProjectSetupSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-project-setup.spec.ts'
  );
  const coreConfigurationNamesText = readTextFile('core/src/configuration/project-configuration-names.ts');
  const coreValuelistsText = readTextFile('core/config/Library/Valuelists/Valuelists.json');
  const coreValuelistKoText = readTextFile('core/config/Library/Valuelists/Language.projects.ko.json');
  const coreConfigurationSpecText = readTextFile('core/test/configuration/korean-fieldwork-configuration.spec.ts');
  const projectSetupTexts = [
    '프로젝트 기본 설정',
    '조사 방식',
    '조사 경계',
    '조사 방식은 오늘 할 일을 묻는 값이 아니라, 이 프로젝트가 어떤 조사인지 정하는 기본값입니다.',
    '프로젝트 초기에 정한 경계 기준입니다. 지도 도형은 조사 경계 기록으로 따로 남깁니다.'
  ];
  const mobilePersonalTexts = ['개인 기본값', '작업자 이름', '기관명'];

  for (const text of projectSetupTexts) {
    if (!mobileSettingsText.includes(text)) {
      findings.push(`tablet settings missing project setup text: ${text}`);
    }
    if (!desktopSettingsTemplateText.includes(text)) {
      findings.push(`desktop settings missing project setup text: ${text}`);
    }
  }

  for (const text of mobilePersonalTexts) {
    if (!mobileSettingsText.includes(text)) {
      findings.push(`tablet settings missing personal default text: ${text}`);
    }
    if (!mobileSettingsSpecText.includes(text)) {
      findings.push(`tablet settings test must cover personal/project split text: ${text}`);
    }
  }

  for (const text of ['프로젝트 기본 설정', '조사 방식', '조사 경계']) {
    if (!mobileSettingsSpecText.includes(text)) {
      findings.push(`tablet settings test must cover project setup control: ${text}`);
    }
  }

  for (const text of [
    'loads Korean fieldwork setup from the selected project document',
    'saves Korean fieldwork setup changes with general settings',
    'blocks saving Korean fieldwork setup changes until required project basics are filled in',
    'exposes tablet sync values in the Korean fieldwork settings section'
  ]) {
    if (!desktopSettingsSpecText.includes(text)) {
      findings.push(`desktop settings test missing coverage: ${text}`);
    }
  }

  if (!desktopSettingsTemplateText.includes('태블릿 연결')) {
    findings.push('desktop settings must expose tablet sync information for Korean fieldwork projects');
  }
  if (!desktopSettingsTemplateText.includes('조사 방식·경계와 야장 기록은 같은 프로젝트 문서로 동기화됩니다.')) {
    findings.push('desktop settings must explain tablet and desktop project setup sync');
  }
  if (!mobileSettingsText.includes('개인 기본값은 따로 저장할 수 있습니다. 조사 방식과 조사 경계를 채우면 프로젝트 기본값도 함께 저장됩니다.')) {
    findings.push('tablet settings must explain personal defaults and project setup can be saved separately');
  }

  for (const token of [
    'KoreanFieldworkProjectSetupDefaults',
    'getKoreanFieldworkProjectSetupDefaultsFromDocument',
    'getKoreanFieldworkInvestigationModeOption',
    'createKoreanFieldworkProjectSetupResourceUpdates'
  ]) {
    if (!desktopProjectSetupText.includes(token)) {
      findings.push(`desktop project setup utility missing tablet-sync helper: ${token}`);
    }
  }
  for (const token of [
    'loads tablet-synced setup defaults from the project document',
    'ignores invalid project document mode values while keeping boundary defaults',
    'builds partial tablet-sync project document updates'
  ]) {
    if (!desktopProjectSetupSpecText.includes(token)) {
      findings.push(`desktop project setup utility test missing tablet-sync coverage: ${token}`);
    }
  }
  if (!desktopSettingsText.includes('getKoreanFieldworkProjectSetupDefaultsFromDocument')) {
    findings.push('desktop settings must load project setup through the shared project setup defaults helper');
  }
  if (!desktopSettingsSpecText.includes('falls back to the default mode when a tablet-synced project document has an invalid mode')) {
    findings.push('desktop settings test must cover invalid tablet-synced project setup modes');
  }

  if (!mobileSettingsText.includes('mapProviderSettings')) {
    findings.push('tablet settings missing map provider settings object');
  }
  if (!mobileSettingsSpecText.includes('mapProviderSettings')) {
    findings.push('tablet settings test missing map provider settings object');
  }
  if (!desktopSettingsModelText.includes('mapProviderSettings')) {
    findings.push('desktop settings model missing map provider settings object');
  }

  for (const token of [
    'kakaoLocalRestApiKey',
    'kakaoMapJavaScriptKey',
    'kakaoNativeAppKey'
  ]) {
    if (!mobileSettingsText.includes(token)) {
      findings.push(`tablet settings missing map provider setting: ${token}`);
    }
    if (!mobileSettingsSpecText.includes(token)) {
      findings.push(`tablet settings test missing map provider setting: ${token}`);
    }
    if (!desktopSettingsTemplateText.includes(token)) {
      findings.push(`desktop settings template missing map provider binding: ${token}`);
    }
    if (!desktopMapProviderText.includes(token)) {
      findings.push(`desktop map provider utility missing setting: ${token}`);
    }
  }

  for (const label of [
    '지도 API 키',
    '카카오 Local REST 키',
    '카카오 지도 JavaScript 키',
    '카카오 Native App 키'
  ]) {
    if (!mobileSettingsText.includes(label)) {
      findings.push(`tablet settings missing map provider label: ${label}`);
    }
    if (!desktopSettingsTemplateText.includes(label)) {
      findings.push(`desktop settings missing map provider label: ${label}`);
    }
  }

  for (const token of [
    'setMapProviderSettings',
    'saves Kakao map provider keys without hardcoding them into project setup'
  ]) {
    if (!mobileSettingsSpecText.includes(token)) {
      findings.push(`tablet settings test missing Kakao key coverage: ${token}`);
    }
  }

  for (const token of [
    'getKoreanMapProviderNotice',
    'hasKoreanSatelliteMapDisplayKey'
  ]) {
    if (!desktopSettingsText.includes(token)) {
      findings.push(`desktop settings component missing map provider method: ${token}`);
    }
    if (!desktopSettingsTemplateText.includes(token)) {
      findings.push(`desktop settings template missing map provider method: ${token}`);
    }
  }

  if (!desktopSettingsStyleText.includes('korean-fieldwork-map-provider-settings')) {
    findings.push('desktop settings style must cover the map provider settings block');
  }
  if (!desktopSettingsSpecText.includes('tracks Kakao map provider keys in the Korean fieldwork settings section')) {
    findings.push('desktop settings test missing Kakao map provider key coverage');
  }
  if (!desktopSettingsSerializerText.includes("configToWrite['mapProviderSettings']")) {
    findings.push('desktop settings serializer must persist map provider settings');
  }
  if (!desktopSettingsProviderText.includes('normalizeKoreanFieldworkMapProviderSettings')) {
    findings.push('desktop settings provider must normalize map provider settings for existing configs');
  }
  if (!desktopMainText.includes('setMapProviderSettingsDefaults')) {
    findings.push('desktop Electron config defaults must include map provider settings');
  }

  for (const text of [
    'REST 키',
    'JavaScript 키',
    'Native App 키'
  ]) {
    if (!mobileMapProviderStatusText.includes(text)) {
      findings.push(`tablet map provider status missing key role wording: ${text}`);
    }
    if (!mobileMapProviderStatusSpecText.includes(text)) {
      findings.push(`tablet map provider status test missing key role wording: ${text}`);
    }
    if (!desktopMapProviderText.includes(text)) {
      findings.push(`desktop map provider utility missing key role wording: ${text}`);
    }
    if (!desktopMapProviderSpecText.includes(text)) {
      findings.push(`desktop map provider utility test missing key role wording: ${text}`);
    }
  }
  if (mobileMapProviderStatusText.includes('다음 구현 단계')) {
    findings.push('tablet map provider status must not expose implementation-stage wording');
  }
  if (mobileMapProviderStatusText.includes('Android Kakao Maps SDK 브리지')) {
    findings.push('tablet map provider status must not promise an SDK bridge as the active field path');
  }
  for (const [label, text] of [
    ['tablet map provider status', mobileMapProviderStatusText],
    ['tablet map provider status test', mobileMapProviderStatusSpecText],
    ['desktop map provider notice', desktopMapProviderText],
    ['desktop map provider notice test', desktopMapProviderSpecText]
  ]) {
    if (!text.includes('JavaScript 키 WebView 경로를 우선 사용')) {
      findings.push(`${label} must explain that JavaScript WebView is the active tablet satellite path`);
    }
    if (!text.includes('SHP/DXF/GeoJSON은 태블릿에서 파일 선택')) {
      findings.push(`${label} must explain direct tablet SHP/DXF/GeoJSON file selection`);
    }
    if (!text.includes('데스크톱에서 가져온 뒤 같은 프로젝트로 동기화')) {
      findings.push(`${label} must explain desktop boundary import sync handoff`);
    }
  }  if (!desktopMapProviderText.includes('return !!normalized.kakaoMapJavaScriptKey.trim();')
      || desktopMapProviderText.includes('|| !!normalized.kakaoNativeAppKey.trim()')
      || !desktopMapProviderSpecText.includes('kakaoNativeAppKey: \'native-key\'')
      || !desktopMapProviderSpecText.includes('})).toBe(false);')) {
    findings.push('desktop satellite map readiness must be true only for the active JavaScript WebView key');
  }

  if (!mobilePackageText.includes('react-native-webview')) {
    findings.push('tablet package missing react-native-webview for Kakao satellite picker');
  }
  if (!mobilePackageText.includes('expo-document-picker')) {
    findings.push('tablet package missing expo-document-picker for tablet SHP/DXF/GeoJSON file selection');
  }
  if (!mobileBoundaryFileImportText.includes('Enter a SHP, DXF, or GeoJSON file path.')) {
    findings.push('tablet boundary import empty-path guidance must mention GeoJSON');
  }
  if (!mobileBoundaryFileImportSpecText.includes('parses GeoJSON polygon boundaries for tablet-to-desktop sync')) {
    findings.push('tablet boundary import parser test must cover GeoJSON tablet-to-desktop sync');
  }
  for (const [label, text] of [
    ['tablet visible map actions', mobileDocumentsMapText],
    ['tablet selected-record map actions', mobileMapBottomSheetText],
    ['tablet selected-record map action test', mobileMapBottomSheetSpecText]
  ]) {
    if (!text.includes('SHP/DXF/GeoJSON')) {
      findings.push(`${label} must expose GeoJSON in the boundary file import action`);
    }
  }
  for (const token of [
    'DocumentPicker.getDocumentAsync',
    'boundaryFileImportPickButton',
    'copyToCacheDirectory: true'
  ]) {
    if (!mobileBoundaryFileImportModalText.includes(token)) {
      findings.push(`tablet boundary import modal missing document picker flow: ${token}`);
    }
  }
  for (const token of [
    'submits a file selected from the tablet document picker',
    'boundaryFileImportPickButton',
    'file:///storage/emulated/0/Download/boundary.shp'
  ]) {
    if (!mobileBoundaryFileImportModalSpecText.includes(token)) {
      findings.push(`tablet boundary import modal test missing document picker behavior: ${token}`);
    }
  }
  for (const token of [
    'KakaoSatellitePicker',
    'createSurveyBoundaryFromKakaoSatellite',
    'kakaoMapJavaScriptKey',
    'REFERENCE_BASEMAP_PROVIDER_KAKAO_HYBRID'
  ]) {
    if (!mobileMapText.includes(token)) {
      findings.push(`tablet map screen missing Kakao satellite boundary flow: ${token}`);
    }
  }
  for (const [label, text] of [
    ['core configuration constants', coreConfigurationNamesText],
    ['core valuelists', coreValuelistsText],
    ['core Korean valuelist labels', coreValuelistKoText],
    ['core configuration test', coreConfigurationSpecText],
    ['tablet map drafts', readTextFile('mobile/components/Project/Map/korean-fieldwork-drafts.ts')],
    ['tablet map drafts test', readTextFile('mobile/components/Project/Map/korean-fieldwork-drafts.spec.ts')]
  ]) {
    if (!text.includes('kakaoHybrid')) {
      findings.push(`${label} must preserve Kakao satellite boundary metadata as kakaoHybrid`);
    }
  }
  for (const token of [
    'WebView',
    'buildKakaoSatellitePickerHtml',
    'onPickLocation',
    'KAKAO_MAP_TYPE_OPTIONS',
    'kakao-map-type-'
  ]) {
    if (!mobileKakaoSatellitePickerText.includes(token)) {
      findings.push(`tablet Kakao satellite picker missing WebView flow: ${token}`);
    }
  }
  for (const token of [
    'dapi.kakao.com/v2/maps/sdk.js',
    'kakao.maps.MapTypeId.HYBRID',
    'window.ReactNativeWebView.postMessage',
    'setMapType(data.payload && data.payload.mapTypeId)'
  ]) {
    if (!mobileKakaoSatellitePickerHtmlText.includes(token)) {
      findings.push(`tablet Kakao satellite picker HTML missing SDK behavior: ${token}`);
    }
    if (!mobileKakaoSatellitePickerHtmlSpecText.includes(token)) {
      findings.push(`tablet Kakao satellite picker HTML test missing SDK behavior: ${token}`);
    }
  }

  return findings;
}

function validateProjectInvestigationModeWording() {
  const findings = [];
  const expectedProjectModePrompt =
    '시굴·발굴·지표·입회 중 이 프로젝트의 조사 방식을 정하세요.';
  const deprecatedModePrompt =
    '시굴·발굴·지표·입회 중 오늘의 조사 방식을 정하세요.';
  const desktopWorkflowText = readTextFile('desktop/src/app/util/korean-fieldwork-workflow.ts');
  const desktopWorkflowSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-workflow.spec.ts'
  );
  const desktopPriorityStripSpecText = readTextFile(
    'desktop/test/unit/components/resources/korean-fieldwork-priority-strip.component.spec.ts'
  );
  const desktopPriorityStripText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts'
  );
  const desktopPriorityStripTemplateText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.html'
  );
  const tabletSelectedRecordWorkbenchText = readTextFile(
    'mobile/components/Project/KoreanFieldworkSelectedRecordWorkbench.tsx'
  );
  const tabletSelectedRecordWorkbenchSpecText = readTextFile(
    'mobile/components/Project/KoreanFieldworkSelectedRecordWorkbench.spec.tsx'
  );
  const tabletMapText = readTextFile('mobile/components/Project/Map/Map.tsx');
  const tabletMapStartPanelText = readTextFile(
    'mobile/components/Project/Map/korean-fieldwork-map-start-panel.ts'
  );
  const tabletMapStartPanelSpecText = readTextFile(
    'mobile/components/Project/Map/korean-fieldwork-map-start-panel.spec.ts'
  );
  const tabletInvestigationModePanelText = readTextFile(
    'mobile/components/Project/KoreanFieldworkInvestigationModePanel.tsx'
  );
  const tabletInvestigationModePanelSpecText = readTextFile(
    'mobile/components/Project/KoreanFieldworkInvestigationModePanel.spec.tsx'
  );
  const desktopDraftDefaultsText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-draft-defaults.ts'
  );
  const coreDraftDefaultsText = readTextFile('core/src/tools/korean-fieldwork-draft-defaults.ts');
  const desktopDocumentDraftText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-document-drafts.ts'
  );
  const desktopTodayActionsText = readTextFile('desktop/src/app/util/korean-fieldwork-today-actions.ts');
  const desktopTodayActionsSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-today-actions.spec.ts');
  const desktopOperationWrapText = readTextFile('desktop/src/app/util/korean-fieldwork-operation-wrap.ts');
  const desktopHierarchyText = readTextFile('desktop/src/app/util/korean-fieldwork-hierarchy.ts');
  const desktopUnitMatrixText = readTextFile('desktop/src/app/util/korean-fieldwork-unit-matrix.ts');
  const desktopUnitMatrixSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-unit-matrix.spec.ts');
  const tabletUnitMatrixText = readTextFile('mobile/components/Project/korean-fieldwork-unit-matrix.ts');
  const tabletUnitMatrixComponentText = readTextFile('mobile/components/Project/KoreanFieldworkUnitMatrix.tsx');
  const tabletUnitMatrixSpecText = readTextFile('mobile/components/Project/korean-fieldwork-unit-matrix.spec.ts');
  const tabletUnitMatrixComponentSpecText = readTextFile('mobile/components/Project/KoreanFieldworkUnitMatrix.spec.tsx');
  const desktopRecordActionsText = readTextFile('desktop/src/app/util/korean-fieldwork-record-actions.ts');
  const desktopWorkbenchText = readTextFile('desktop/src/app/util/korean-fieldwork-workbench.ts');
  const desktopProgressBoardText = readTextFile('desktop/src/app/util/korean-fieldwork-progress-board.ts');
  const desktopCloseoutText = readTextFile('desktop/src/app/util/korean-fieldwork-closeout.ts');
  const desktopRecordContextPanelText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.component.ts'
  );
  const desktopRecordContextPanelSpecText = readTextFile(
    'desktop/test/unit/components/docedit/core/korean-fieldwork-record-context-panel.component.spec.ts'
  );
  const desktopFeatureGuidanceText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-feature-guidance.ts'
  );
  const desktopOrientationPanelTemplateText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-orientation-panel.html'
  );
  const tabletQuickRecordPanelText = readTextFile(
    'mobile/components/Project/KoreanFieldworkQuickRecordPanel.tsx'
  );
  const tabletFeatureAttributesText = readTextFile(
    'mobile/components/Project/korean-fieldwork-feature-attributes.ts'
  );
  const tabletFieldNotesText = readTextFile(
    'mobile/components/Project/korean-fieldwork-field-notes.ts'
  );
  const desktopNotebookDigestText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-notebook-digest.ts'
  );
  const koreanValuelistKoText = readTextFile(
    'core/config/Library/Valuelists/Language.projects.ko.json'
  );
  const koreanValuelistEnText = readTextFile(
    'core/config/Library/Valuelists/Language.projects.en.json'
  );
  const koreanFieldworkKoText = readTextFile(
    'core/config/Language-KoreanFieldwork.ko.json'
  );
  const mobileFieldFlowWordingSources = [
    {
      label: 'tablet project screen',
      text: readTextFile('mobile/app/(tabs)/ProjectScreen/index.tsx')
    },
    {
      label: 'tablet today actions',
      text: readTextFile('mobile/components/Project/korean-fieldwork-today-actions.ts')
    },
    {
      label: 'tablet workbench',
      text: readTextFile('mobile/components/Project/korean-fieldwork-workbench.ts')
    },
    {
      label: 'tablet progress',
      text: readTextFile('mobile/components/Project/korean-fieldwork-progress.ts')
    },
    {
      label: 'tablet closeout',
      text: readTextFile('mobile/components/Project/korean-fieldwork-closeout.ts')
    },
    {
      label: 'tablet draft continuation',
      text: readTextFile('mobile/components/Project/korean-fieldwork-draft-continuation.ts')
    },
    {
      label: 'tablet narrative assist',
      text: readTextFile('mobile/components/Project/korean-fieldwork-narrative-assist.ts')
    },
    {
      label: 'tablet draft context panel',
      text: readTextFile('mobile/components/Project/KoreanFieldworkDraftContextPanel.tsx')
    },
    {
      label: 'tablet scope panel',
      text: readTextFile('mobile/components/Project/KoreanFieldworkScopePanel.tsx')
    },
    {
      label: 'tablet field-flow tests',
      text: [
        'mobile/components/Project/korean-fieldwork-field-notes.spec.ts',
        'mobile/components/Project/korean-fieldwork-record-actions.spec.ts',
        'mobile/components/Project/korean-fieldwork-unit-matrix.spec.ts',
        'mobile/components/Project/KoreanFieldworkDraftContextPanel.spec.tsx'
      ].map(readTextFile).join('\n')
    }
  ];
  const featureFieldNoteAnchors = [
    'feature-field-note-flow',
    'feature-sketch-measure-evidence',
    '[스케치·약측]',
    '[사진·도면 번호]',
    '유구 성격을 확정하지 말고',
    '약도/평면/단면 스케치 번호',
    '유구명은 관찰·그림·사진 근거가 모이면 보완'
  ];
  const tabletNarrativeAssistText = mobileFieldFlowWordingSources.find(
    entry => entry.label === 'tablet narrative assist'
  )?.text ?? '';
  for (const requiredAnchor of featureFieldNoteAnchors) {
    if (!tabletNarrativeAssistText.includes(requiredAnchor)) {
      findings.push(`tablet narrative assist must bind feature descriptions to sketches/measurements: ${requiredAnchor}`);
    }
  }
  for (const requiredAnchor of ['스케치/약측 기준', '사진/도면 번호']) {
    if (!desktopFeatureGuidanceText.includes(requiredAnchor)) {
      findings.push(`desktop feature guidance templates must bind descriptions to sketch/measurement evidence: ${requiredAnchor}`);
    }
  }
  for (const { label, text } of [
    { label: 'tablet selected record workbench', text: tabletSelectedRecordWorkbenchText },
    { label: 'tablet selected record workbench test', text: tabletSelectedRecordWorkbenchSpecText },
    { label: 'desktop priority strip template', text: desktopPriorityStripTemplateText },
    { label: 'desktop priority strip test', text: desktopPriorityStripSpecText }
  ]) {
    if (!text.includes('선택한 기록')) {
      findings.push(`${label} must label the selected-record panel as 선택한 기록`);
    }
    if (text.includes('선택 기록 작업대')) {
      findings.push(`${label} still uses confusing selected-record workbench wording`);
    }
  }
  for (const requiredAnchor of [
    '유구 성격 미정이면 미정으로 두고',
    '평면·단면 스케치 번호',
    '약측값',
    '사진·도면 번호',
    '성격 미정/추정 사유'
  ]) {
    if (!tabletFeatureAttributesText.includes(requiredAnchor)) {
      findings.push(`tablet feature observation placeholders must bind descriptions to sketch/measurement evidence: ${requiredAnchor}`);
    }
  }
  for (const [label, text] of [
    ['tablet field notes', tabletFieldNotesText],
    ['desktop notebook digest', desktopNotebookDigestText]
  ]) {
    if (!text.includes('사진·도면·스케치·유물·시료 번호')) {
      findings.push(`${label} must include sketch numbers in field-note evidence numbering`);
    }
    if (!text.includes('사진·도면·유물·시료 번호')) {
      findings.push(`${label} must keep the previous evidence-number label as a parsing alias`);
    }
  }
  if (!koreanValuelistKoText.includes('"label": "조사 중 기록"')) {
    findings.push('Korean excavation context wording must fold quadrant/half-style investigation into 조사 중 기록');
  }
  if (!koreanValuelistEnText.includes('"label": "In-progress investigation record"')) {
    findings.push('English excavation context wording must fold quadrant investigation into an in-progress record');
  }
  for (const deprecatedText of ['조사 중 구획 기록', 'Quadrant investigation']) {
    if (koreanValuelistKoText.includes(deprecatedText) || koreanValuelistEnText.includes(deprecatedText)) {
      findings.push(`Korean fieldwork valuelists still expose deprecated investigation-method wording: ${deprecatedText}`);
    }
  }
  for (const [label, text] of [
    ['tablet quick record panel', tabletQuickRecordPanelText],
    ['desktop orientation panel', desktopOrientationPanelTemplateText]
  ]) {
    if (text.includes('방위 기준')) {
      findings.push(`${label} should not show a separate orientation-reference selector; use magnetic north by default`);
    }
  }
  if (koreanFieldworkKoText.includes('"label": "방위 기준"')
      || !koreanFieldworkKoText.includes('"label": "자북 메모"')) {
    findings.push('Korean fieldwork orientation reference label must read as a magnetic-north note, not a selectable bearing standard');
  }
  const projectModeDefinition =
    '조사 방식은 오늘 할 일을 묻는 값이 아니라, 이 프로젝트가 어떤 조사인지 정하는 기본값입니다.';

  if (!desktopWorkflowText.includes(expectedProjectModePrompt)) {
    findings.push('desktop workflow must describe investigation mode as a project-level setup choice');
  }
  if (desktopWorkflowText.includes(deprecatedModePrompt)) {
    findings.push('desktop workflow still describes investigation mode as today-specific');
  }
  if (!desktopWorkflowSpecText.includes(expectedProjectModePrompt)) {
    findings.push('desktop workflow test must cover project-level investigation-mode wording');
  }
  if (!desktopWorkflowText.includes('작업 순서')) {
    findings.push('desktop workflow must use 작업 순서 wording for sequence guidance');
  }
  if (desktopWorkflowText.includes('조사 흐름')) {
    findings.push('desktop workflow still uses broad 조사 흐름 wording');
  }
  if (!desktopWorkflowSpecText.includes('시굴·표본 작업 순서')) {
    findings.push('desktop workflow test must cover project-mode 작업 순서 wording');
  }
  const desktopFieldFlowWordingSources = [
    { label: 'desktop workflow', text: desktopWorkflowText },
    { label: 'desktop workflow test', text: desktopWorkflowSpecText },
    { label: 'desktop priority strip', text: desktopPriorityStripText },
    { label: 'desktop priority strip template', text: desktopPriorityStripTemplateText },
    { label: 'desktop priority strip test', text: desktopPriorityStripSpecText },
    { label: 'desktop today actions', text: desktopTodayActionsText },
    { label: 'desktop hierarchy', text: desktopHierarchyText },
    { label: 'desktop unit matrix', text: desktopUnitMatrixText },
    { label: 'desktop record actions', text: desktopRecordActionsText },
    { label: 'desktop workbench', text: desktopWorkbenchText },
    { label: 'desktop progress board', text: desktopProgressBoardText },
    { label: 'desktop closeout', text: desktopCloseoutText },
    { label: 'desktop record context panel', text: desktopRecordContextPanelText }
  ];
  for (const { label, text } of desktopFieldFlowWordingSources) {
    for (const forbiddenTerm of ['조사 기준', '기록 기준', '작업 단위', '조사 단위']) {
      if (text.includes(forbiddenTerm)) {
        findings.push(`${label} still uses confusing desktop field-flow wording: ${forbiddenTerm}`);
      }
    }
  }
  if (!desktopRecordContextPanelText.includes('pushProjectSetupChips')
      || !desktopRecordContextPanelText.includes('projectBoundarySummary')
      || !desktopRecordContextPanelText.includes('pushOperationRoleResponsibilityChip')
      || !desktopRecordContextPanelText.includes('operationRoleResponsibility')
      || !desktopRecordContextPanelText.includes('getKoreanFieldworkInvestigationModeOption')) {
    findings.push('desktop record context panel must keep tablet project setup and operation role responsibilities visible on opened Operation records');
  }
  if (desktopRecordContextPanelText.includes('PROJECT_INVESTIGATION_MODE_LABELS')) {
    findings.push('desktop record context panel must use the shared project setup investigation-mode labels');
  }
  if (!desktopRecordContextPanelSpecText.includes('keeps tablet project setup visible on desktop operation records')
      || !desktopRecordContextPanelSpecText.includes('조사 시굴·표본조사')
      || !desktopRecordContextPanelSpecText.includes('경계 1구역 북쪽 능선부터 남쪽 농로…')) {
    findings.push('desktop record context panel test must cover tablet project setup chips on Operation records with tablet wording');
  }
  if (!desktopRecordContextPanelSpecText.includes('keeps tablet operation role responsibilities visible on desktop operation records')
      || !desktopRecordContextPanelSpecText.includes('역할 안전 담당 · 사진 담당 · 작업일지 작성자 +1')) {
    findings.push('desktop record context panel test must cover tablet operation role responsibility chips on Operation records');
  }
  if (!desktopRecordContextPanelText.includes('pushSurveyBoundaryChips')
      || !desktopRecordContextPanelText.includes('getKoreanFieldworkBoundaryMethodLabel')
      || !desktopRecordContextPanelText.includes('surveyBoundarySource')) {
    findings.push('desktop record context panel must keep tablet imported boundary details visible on SurveyBoundary records');
  }
  if (!desktopRecordContextPanelSpecText.includes('keeps tablet imported boundary file details visible on desktop boundary records')
      || !desktopRecordContextPanelSpecText.includes('가져온 경계 boundary.geojson (EPSG:4326, 5점)')
      || !desktopRecordContextPanelSpecText.includes('GeoJSON 가져오기 · 가져온 참고자료')) {
    findings.push('desktop record context panel test must cover tablet imported boundary file details on SurveyBoundary records');
  }
  for (const { label, text } of mobileFieldFlowWordingSources) {
    for (const forbiddenTerm of ['조사 기준', '기록 기준', '작업 단위', '조사 단위', '현장단위']) {
      if (text.includes(forbiddenTerm)) {
        findings.push(`${label} still uses confusing tablet field-flow wording: ${forbiddenTerm}`);
      }
    }
  }
  if (!desktopWorkflowText.includes('조사 구역 기록')) {
    findings.push('desktop workflow must call the Operation step 조사 구역 기록');
  }
  if (!desktopTodayActionsText.includes('조사 구역 정리')) {
    findings.push('desktop today actions must use 조사 구역 정리 for legacy root records');
  }
  if (!desktopTodayActionsText.includes('getLegacyRootDocumentsForOperation')
      || !desktopOperationWrapText.includes('createOperationRelationUpdate')
      || !desktopOperationWrapText.includes('getOperationWrapConfirmationMessage')) {
    findings.push('desktop today actions must share tablet operation-wrap logic for legacy root records');
  }
  if (desktopTodayActionsText.includes("scopeParent?.resource?.category === C.FEATURE_GROUP")
      || desktopTodayActionsText.includes('getFirstDocumentByCategory(scopedDocuments, C.FEATURE_GROUP)')
      || desktopTodayActionsText.includes('getFirstDocumentByCategory(documents, C.FEATURE_GROUP)')) {
    findings.push('desktop today actions must not create new feature drafts under legacy related-feature groups');
  }
  if (desktopTodayActionsText.includes('const featureParent = getScopedDocumentByCategory(documents, C.TRENCH')
      || !desktopTodayActionsSpecText.includes('keeps excavation feature drafts on the operation even when old trenches exist')) {
    findings.push('desktop excavation today actions must keep new feature drafts on the operation by default');
  }
  if (!desktopTodayActionsSpecText.includes('skips legacy related-feature groups when choosing a desktop feature draft parent')
      || !desktopTodayActionsSpecText.includes('does not create new desktop features under a selected legacy related-feature group')) {
    findings.push('desktop today actions tests must cover skipping legacy related-feature groups for feature drafts');
  }
  if (!desktopPriorityStripTemplateText.includes('기록 진행표')) {
    findings.push('desktop priority strip template must label the unit matrix as 기록 진행표');
  }
  for (const [label, text] of [
    ['tablet unit matrix util', tabletUnitMatrixText],
    ['desktop unit matrix util', desktopUnitMatrixText]
  ]) {
    for (const token of ['FeatureOverview', 'statusLabel', 'nextActionLabel']) {
      if (!text.includes(token)) {
        findings.push(`${label} must expose all-feature overview rows with status and next-action labels: ${token}`);
      }
    }
  }
  if (!tabletUnitMatrixComponentText.includes('전체 유구 현황')
      || !desktopPriorityStripTemplateText.includes('전체 유구 현황')) {
    findings.push('tablet and desktop record panels must expose an 전체 유구 현황 table');
  }
  for (const [label, text] of [
    ['tablet unit matrix spec', tabletUnitMatrixSpecText],
    ['tablet unit matrix component spec', tabletUnitMatrixComponentSpecText],
    ['desktop unit matrix spec', desktopUnitMatrixSpecText],
    ['desktop priority strip spec', desktopPriorityStripSpecText]
  ]) {
    if (!text.includes('전체 유구 현황') && !text.includes('FeatureOverview')) {
      findings.push(`${label} must cover the all-feature overview table`);
    }
  }
  if (
    desktopWorkflowText.indexOf("id: 'mode'") === -1
    || desktopWorkflowText.indexOf("id: 'boundary'") === -1
    || desktopWorkflowText.indexOf("id: 'operation'") === -1
    || desktopWorkflowText.indexOf("id: 'mode'") > desktopWorkflowText.indexOf("id: 'boundary'")
    || desktopWorkflowText.indexOf("id: 'boundary'") > desktopWorkflowText.indexOf("id: 'operation'")
  ) {
    findings.push('desktop workflow must put investigation mode before survey boundary before fieldwork unit');
  }
  if (!hasOrderedSubstrings(tabletInvestigationModePanelText, [
    "id: 'mode'",
    "id: 'boundary'",
    "id: 'operation'"
  ])) {
    findings.push('tablet project setup panel must put investigation mode before survey boundary before fieldwork unit');
  }
  if (
    !tabletInvestigationModePanelSpecText.includes('expectSetupStepOrder')
    || !hasOrderedSubstrings(tabletInvestigationModePanelSpecText, [
      'setupStep_mode',
      'setupStep_boundary',
      'setupStep_operation'
    ])
  ) {
    findings.push('tablet investigation mode panel test must cover mode-boundary-operation setup order');
  }
  if (!desktopWorkflowSpecText.includes("['mode', 'current']")) {
    findings.push('desktop workflow test must make investigation mode the first setup step');
  }
  if (
    desktopWorkflowSpecText.indexOf("['boundary', 'todo']") === -1
    || desktopWorkflowSpecText.indexOf("['operation', 'todo']") === -1
    || desktopWorkflowSpecText.indexOf("['boundary', 'todo']")
      > desktopWorkflowSpecText.indexOf("['operation', 'todo']")
  ) {
    findings.push('desktop workflow test must cover survey boundary before fieldwork unit');
  }
  if (desktopWorkflowText.includes('!!boundarySummary || getCategoryCount')) {
    findings.push('desktop workflow must not mark survey boundary done from the project boundary summary alone');
  }
  if (!desktopWorkflowText.includes('기준만 있음. 지도에서 GPS 임시 경계를 만들거나 SHP/DXF/GeoJSON·위성지도 기준으로 확정하세요.')) {
    findings.push('desktop workflow must keep boundary-summary-only projects on GPS/file/satellite confirmation');
  }
  if (!desktopWorkflowText.includes('지도에서 조사 경계를 만들거나 SHP/DXF/GeoJSON·위성지도 기준으로 확정하세요.')) {
    findings.push('desktop workflow must route boundary setup through GPS/file/satellite wording');
  }
  if (!desktopWorkflowSpecText.includes("['boundary', 'attention']")) {
    findings.push('desktop workflow test must cover boundary-summary-only attention state');
  }
  if (!desktopPriorityStripSpecText.includes("['mode', 'current']")) {
    findings.push('desktop priority strip test must keep investigation mode before boundary');
  }
  if (!desktopPriorityStripSpecText.includes("['조사 선택', 'done']")) {
    findings.push('desktop priority strip test must show 조사 선택 before 조사 구역 in complete workflows');
  }
  if (!desktopPriorityStripSpecText.includes("['조사 구역 기록', 'done']")) {
    findings.push('desktop priority strip test must show 조사 구역 기록 in complete workflows');
  }
  if (
    desktopPriorityStripSpecText.indexOf("['조사 선택', 'done']") === -1
    || desktopPriorityStripSpecText.indexOf("['조사 구역', 'done']") === -1
    || desktopPriorityStripSpecText.indexOf("['조사 구역 기록', 'done']") === -1
    || desktopPriorityStripSpecText.indexOf("['조사 선택', 'done']")
      > desktopPriorityStripSpecText.indexOf("['조사 구역', 'done']")
    || desktopPriorityStripSpecText.indexOf("['조사 구역', 'done']")
      > desktopPriorityStripSpecText.indexOf("['조사 구역 기록', 'done']")
  ) {
    findings.push('desktop priority strip complete workflow order must put 조사 선택 before 조사 구역 before 조사 구역 기록');
  }
  if (!desktopPriorityStripText.includes('getTodayQuickActions')) {
    findings.push('desktop priority strip must expose today quick actions matching the tablet map board');
  }
  if (!desktopPriorityStripText.includes('runTodayQuickAction')) {
    findings.push('desktop priority strip must run today quick actions from the header');
  }
  if (!desktopPriorityStripText.includes("'create-survey-boundary',")) {
    findings.push('desktop today quick record action must prioritize survey boundary creation before field records');
  }
  if (desktopPriorityStripText.includes("task.id !== 'create-survey-boundary'")) {
    findings.push('desktop today quick record action still skips the survey boundary task');
  }
  if (!desktopPriorityStripSpecText.includes('경계 만들기')) {
    findings.push('desktop priority strip test must cover survey boundary as the first quick record action');
  }
  if (!tabletMapText.includes('getKoreanFieldworkMapStartPanelCopy')) {
    findings.push('tablet map start panel must use shared boundary-first start copy');
  }
  if (tabletMapStartPanelText.includes('현장 단위부터 시작')) {
    findings.push('tablet map start panel still tells users to start from fieldwork units');
  }
  if (!tabletMapStartPanelText.includes('조사 경계 생성')
      || !tabletMapStartPanelText.includes('GPS 임시 경계')
      || !tabletMapStartPanelText.includes('SHP/DXF/GeoJSON')
      || !tabletMapStartPanelText.includes('위성지도')) {
    findings.push('tablet map start panel must expose GPS, file import, and satellite boundary setup choices');
  }
  if (
    tabletMapText.indexOf("title={location ? startPanelCopy.primaryActionTitle : 'GPS 확인 중'}") === -1
    || tabletMapText.indexOf('title="트렌치 추가"') === -1
    || tabletMapText.indexOf("title={location ? startPanelCopy.primaryActionTitle : 'GPS 확인 중'}")
      > tabletMapText.indexOf('title="트렌치 추가"')
  ) {
    findings.push('tablet map start panel must put GPS boundary creation before trench creation');
  }
  if (!tabletMapStartPanelSpecText.includes('survey boundary confirmation wording')) {
    findings.push('tablet map start panel test must cover boundary-first startup wording');
  }
  if (!desktopPriorityStripTemplateText.includes('korean-fieldwork-today-quick-actions')) {
    findings.push('desktop priority strip template must render today quick actions');
  }
  for (const quickActionLabel of ['오늘 일지', '마감 점검']) {
    if (!desktopPriorityStripText.includes(quickActionLabel)) {
      findings.push(`desktop today quick action missing label: ${quickActionLabel}`);
    }
    if (!desktopPriorityStripSpecText.includes(quickActionLabel)) {
      findings.push(`desktop priority strip test must cover today quick action: ${quickActionLabel}`);
    }
  }
  if (!desktopPriorityStripSpecText.includes('유구 만들기')) {
    findings.push('desktop priority strip test must cover the next-record quick action');
  }
  if (
    !desktopDocumentDraftText.includes('boundarySummary?: string')
    || !desktopDocumentDraftText.includes('options.boundarySummary')
  ) {
    findings.push('desktop document drafts must accept and pass project boundary summaries');
  }
  for (const option of [
    'boundaryAccuracy?: string',
    'boundarySource?: string',
    'referenceBasemapProvider?: string'
  ]) {
    if (!desktopDocumentDraftText.includes(option)) {
      findings.push(`desktop document drafts must accept imported SurveyBoundary option: ${option}`);
    }
  }
  for (const option of [
    'boundaryAccuracy: options.boundaryAccuracy',
    'boundarySource: options.boundarySource',
    'referenceBasemapProvider: options.referenceBasemapProvider'
  ]) {
    if (!desktopDocumentDraftText.includes(option)) {
      findings.push(`desktop document drafts must pass imported SurveyBoundary option: ${option}`);
    }
  }
  if (!desktopDraftDefaultsText.includes('surveyBoundaryNote: boundarySummary')
      && !coreDraftDefaultsText.includes('surveyBoundaryNote: boundarySummary')) {
    findings.push('desktop SurveyBoundary defaults must copy project boundary summaries into surveyBoundaryNote');
  }
  for (const option of [
    'boundaryAccuracy?: string',
    'boundarySource?: string',
    'referenceBasemapProvider?: string',
    'options.boundaryAccuracy',
    'options.boundarySource',
    'options.referenceBasemapProvider'
  ]) {
    if (!desktopDraftDefaultsText.includes(option)
        && !coreDraftDefaultsText.includes(option)) {
      findings.push(`desktop SurveyBoundary defaults must support imported boundary metadata: ${option}`);
    }
  }
  const desktopDraftDefaultsSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-draft-defaults.spec.ts'
  );
  const desktopDocumentDraftSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-document-drafts.spec.ts'
  );
  for (const token of ['shpImport', 'importedReference', 'importedVectorLayer']) {
    if (!desktopDraftDefaultsSpecText.includes(token)) {
      findings.push(`desktop SurveyBoundary defaults test missing imported boundary token: ${token}`);
    }
    if (!desktopDocumentDraftSpecText.includes(token)) {
      findings.push(`desktop document draft test missing imported boundary token: ${token}`);
    }
  }
  if (
    !desktopPriorityStripText.includes('KOREAN_FIELDWORK_PROJECT_BOUNDARY_SUMMARY_FIELD')
    || !desktopPriorityStripText.includes('getProjectBoundarySummaryDraftValue')
  ) {
    findings.push('desktop quick SurveyBoundary drafts must read the project boundary summary');
  }
  if (!desktopPriorityStripSpecText.includes('surveyBoundaryNote: \'1구역 북쪽 능선부터 남쪽 농로까지\'')) {
    findings.push('desktop priority strip test must prove SurveyBoundary drafts copy the boundary summary');
  }

  for (const source of [
    {
      label: 'tablet settings',
      text: readTextFile('mobile/app/(tabs)/SettingsScreen.tsx')
    },
    {
      label: 'desktop settings',
      text: readTextFile('desktop/src/app/components/settings/settings.html')
    }
  ]) {
    if (!source.text.includes(projectModeDefinition)) {
      findings.push(`${source.label} must explain investigation mode as a project default`);
    }
  }

  return findings;
}

function validateRawFormFieldRules() {
  const findings = [];
  const tabletSource = 'mobile/components/common/forms/DocumentForm.tsx';
  const desktopSource = 'desktop/src/app/components/docedit/core/edit-form.component.ts';
  const tabletAuxiliaryGroups = extractStringCollection(
    tabletSource,
    'AUXILIARY_RAW_GROUP_NAMES'
  );
  const desktopSystemGroups = extractStringCollection(
    desktopSource,
    'SYSTEM_RAW_GROUP_NAMES'
  );
  const tabletPanelFields = extractStringCollection(
    tabletSource,
    'KOREAN_FIELDWORK_PANEL_FIELD_NAMES'
  );
  const tabletTriggerFields = extractStringCollection(
    tabletSource,
    'KOREAN_FIELDWORK_MODE_TRIGGER_FIELD_NAMES'
  );
  const tabletText = readTextFile(tabletSource);
  const desktopText = readTextFile(desktopSource);
  const desktopTemplateText = readTextFile('desktop/src/app/components/docedit/core/edit-form.html');
  const desktopEditFormSpecText = readTextFile('desktop/test/unit/components/docedit/core/edit-form.component.spec.ts');
  const desktopDoceditModuleText = readTextFile('desktop/src/app/components/docedit/docedit.module.ts');
  const desktopDoceditStyleText = readTextFile('desktop/src/app/components/docedit/docedit.scss');
  const koreanFieldworkConfigText = readTextFile('core/config/Config-KoreanFieldwork.json');
  const koreanFieldworkKoText = readTextFile('core/config/Language-KoreanFieldwork.ko.json');
  const koreanFieldworkEnText = readTextFile('core/config/Language-KoreanFieldwork.en.json');
  const tabletGroupLabelText = readTextFile('mobile/components/common/I18NLabel.tsx');
  const coreKoreanLibraryLabelsText = readTextFile('core/config/Library/Language.ko.json');
  const tabletDraftContextText = readTextFile('mobile/components/Project/KoreanFieldworkDraftContextPanel.tsx');
  const tabletAddModalText = readTextFile('mobile/components/Project/DocumentAddModal.tsx');
  const tabletProjectScreenText = readTextFile('mobile/app/(tabs)/ProjectScreen/index.tsx');
  const tabletSecondaryPanelText = [
    tabletProjectScreenText,
    readTextFile('mobile/components/Project/KoreanFieldworkQuickRecordPanel.tsx')
  ].join('\n');
  const rawStorageSummary = '새 유구 기록은 위의 시대/시기·유구 성격·유구별 핵심 속성·야장 메모만 입력하면 충분합니다. 이 영역은 이전 양식에서 가져온 값이 있을 때만 확인합니다.';
  const auxiliaryRawStorageLabel = '가져온 기존 항목';
  const forbiddenAuxiliaryRawStorageTerms = [
    '기존 값 확인',
    '유구 기록은 위의 시대/시기·유구 성격·유구별 핵심 속성·추가 관찰만으로 충분합니다.',
    '새 유구 기록은 위의 시대/시기·유구 성격·유구별 핵심 속성·추가 관찰만 입력하면 충분합니다.',
    '필요 시 추가 필드',
    '확인 중인 추가 항목',
    '가져온 값·특수 필드 확인',
    '특수 필드를 검토',
    '보조 원자료',
    '호환용 보조 필드',
    '확인 중인 보조 항목'
  ];
  const rawFormTextChecks = [
    { label: 'tablet raw form', text: tabletText },
    {
      label: 'tablet add form test',
      text: readTextFile('mobile/components/Project/DocumentAdd.spec.tsx')
    },
    {
      label: 'tablet edit form test',
      text: readTextFile('mobile/components/Project/DocumentEdit.spec.tsx')
    },
    { label: 'desktop raw form', text: desktopTemplateText }
  ];
  const hiddenKoreanFieldworkHelperPanelTokens = [
    'korean-fieldwork-draft-preset-panel',
    'korean-fieldwork-narrative-assist-panel',
    'korean-fieldwork-draft-continuation-panel',
    'KoreanFieldworkDraftPresetPanelComponent',
    'KoreanFieldworkNarrativeAssistPanelComponent',
    '기록 템플릿',
    '서술 보조',
    '저장 후 이어가기'
  ];
  const guidedFieldNames = Object.keys(collectGuidedFeatureAttributeFieldValues());
  const tabletUsesDerivedFeatureAttributeFields = (
    tabletText.match(/\.\.\.KOREAN_FIELDWORK_FEATURE_ATTRIBUTE_FIELD_NAMES/g) ?? []
  ).length >= 2;
  const tabletSketchFieldNames = [
    'featureLocationSketch',
    'featureFreeDrawingStrokes',
    'featureFreeDrawingUpdatedAt'
  ];

  findings.push(
    ...compareStringSets(
      tabletAuxiliaryGroups,
      desktopSystemGroups,
      'tablet auxiliary raw group missing for desktop system group',
      'desktop system raw group missing for tablet auxiliary group'
    )
  );

  for (const fieldName of guidedFieldNames) {
    if (!tabletUsesDerivedFeatureAttributeFields && !tabletPanelFields.includes(fieldName)) {
      findings.push(`tablet raw form panel-field list missing guided attribute field: ${fieldName}`);
    }
    if (!tabletUsesDerivedFeatureAttributeFields && !tabletTriggerFields.includes(fieldName)) {
      findings.push(`tablet raw form trigger list missing guided attribute field: ${fieldName}`);
    }
  }

  if (!tabletUsesDerivedFeatureAttributeFields) {
    findings.push('tablet raw form must derive guided feature fields from feature attributes');
  }

  if (!desktopText.includes('...KOREAN_FIELDWORK_FEATURE_GUIDANCE_FIELD_NAMES')) {
    findings.push('desktop raw form must derive guided feature fields from presets');
  }

  for (const fieldName of tabletSketchFieldNames) {
    if (!tabletText.includes(`'${fieldName}'`)) {
      findings.push(`tablet raw form panel-field list missing tablet sketch field: ${fieldName}`);
    }
    if (!desktopText.includes(`'${fieldName}'`)) {
      findings.push(`desktop raw form panel-field list missing tablet sketch field: ${fieldName}`);
    }
    if (!koreanFieldworkConfigText.includes(`"${fieldName}"`)) {
      findings.push(`KoreanFieldwork config missing tablet sketch field: ${fieldName}`);
    }
    if (!koreanFieldworkKoText.includes(`"${fieldName}"`) || !koreanFieldworkEnText.includes(`"${fieldName}"`)) {
      findings.push(`KoreanFieldwork languages missing tablet sketch field label: ${fieldName}`);
    }
  }

  if (!tabletText.includes(rawStorageSummary)) {
    findings.push('tablet raw form missing Korean fieldwork raw-storage summary');
  }
  if (!desktopTemplateText.includes(rawStorageSummary)) {
    findings.push('desktop raw form missing Korean fieldwork raw-storage summary');
  }
  if (!tabletText.includes(auxiliaryRawStorageLabel)) {
    findings.push('tablet raw form missing auxiliary raw-storage label');
  }
  if (!desktopTemplateText.includes(auxiliaryRawStorageLabel)) {
    findings.push('desktop raw form missing auxiliary raw-storage label');
  }
  for (const { label, text } of rawFormTextChecks) {
    for (const forbiddenTerm of forbiddenAuxiliaryRawStorageTerms) {
      if (text.includes(forbiddenTerm)) {
        findings.push(`${label} still uses legacy auxiliary raw-storage wording: ${forbiddenTerm}`);
      }
    }
  }
  for (const hiddenPanelToken of hiddenKoreanFieldworkHelperPanelTokens) {
    for (const { label, text } of [
      { label: 'desktop edit form template', text: desktopTemplateText },
      { label: 'desktop docedit module', text: desktopDoceditModuleText },
      { label: 'desktop docedit stylesheet', text: desktopDoceditStyleText }
    ]) {
      if (text.includes(hiddenPanelToken)) {
        findings.push(`${label} must keep tablet-hidden Korean fieldwork helper panel out of the edit flow: ${hiddenPanelToken}`);
      }
    }
  }
  if (!desktopEditFormSpecText.includes('tablet-hidden Korean fieldwork helper panels')) {
    findings.push('desktop edit form test must prove tablet-hidden helper panels stay out of the main edit flow');
  }
  if (!tabletText.includes('getVisibleRawGroups(category, resource)')) {
    findings.push('tablet raw form must decide auxiliary visibility from current resource values');
  }
  if (!tabletText.includes('KOREAN_FIELDWORK_MANAGED_CATEGORY_NAMES')) {
    findings.push('tablet raw form must keep guided mode for managed Korean fieldwork categories');
  }
  if (!desktopText.includes('KOREAN_FIELDWORK_MANAGED_CATEGORY_NAMES')) {
    findings.push('desktop raw form must keep guided mode for managed Korean fieldwork categories');
  }
  if (!tabletText.includes('groupHasRawStorageValue(group, resource)')) {
    findings.push('tablet raw form must hide blank auxiliary fields in Korean fieldwork mode');
  }
  if (!tabletText.includes('rawFieldHasValue(field, resource)')) {
    findings.push('tablet raw form must show only imported auxiliary fields that already have values');
  }
  if (!desktopText.includes('rawStorageFieldHasValue(field)')) {
    findings.push('desktop raw form must show only imported auxiliary fields that already have values');
  }
  if (!readTextFile('mobile/components/common/forms/DocumentForm.spec.tsx').includes('shows only imported fields')
      || !readTextFile('desktop/test/unit/components/docedit/core/edit-form.component.spec.ts').includes('emptyLegacyNote')) {
    findings.push('raw form tests must prove empty auxiliary fields stay hidden after expanding imported values');
  }
  for (const { label, text } of [
    { label: 'tablet common group labels', text: tabletGroupLabelText },
    { label: 'desktop Korean library labels', text: coreKoreanLibraryLabelsText }
  ]) {
    for (const expectedLabel of ['포함 위치', '식별 정보', '자료 관리', '작업 기록']) {
      if (!text.includes(expectedLabel)) {
        findings.push(`${label} must use field-facing raw group label: ${expectedLabel}`);
      }
    }
  }
  if (!tabletDraftContextText.includes('포함 위치') || !tabletAddModalText.includes('포함 위치')) {
    findings.push('tablet feature creation context must describe parent scope as 포함 위치');
  }
  if (tabletDraftContextText.includes('상위 기록') || tabletAddModalText.includes('상위 기록')
      || tabletDraftContextText.includes('묶음 위치') || tabletAddModalText.includes('묶음 위치')) {
    findings.push('tablet feature creation context still uses hierarchy/ambiguous scope wording');
  }
  if (!tabletSecondaryPanelText.includes('현장 보조판 보기')) {
    findings.push('tablet fieldwork screens must label secondary panels as 현장 보조판 보기');
  }
  if (tabletSecondaryPanelText.includes('자료 관리 보기') || tabletSecondaryPanelText.includes('자료 관리 접기')) {
    findings.push('tablet fieldwork screens still label secondary panels as 자료 관리');
  }

  return findings;
}

function validateRecordPanelOrder() {
  const findings = [];
  const desktopPriorityStripText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts'
  );
  const desktopPriorityStripSpecText = readTextFile(
    'desktop/test/unit/components/resources/korean-fieldwork-priority-strip.component.spec.ts'
  );
  const desktopDocumentDraftText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-document-drafts.ts'
  );
  const desktopHierarchyText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-hierarchy.ts'
  );
  const desktopPriorityStripTemplateText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.html'
  );
  const desktopPriorityStripStyleText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.scss'
  );
  const desktopNotebookDigestText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-notebook-digest.ts'
  );
  const desktopNotebookDigestSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-notebook-digest.spec.ts'
  );
  const desktopEvidenceReviewText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-evidence-review.ts'
  );
  const desktopEvidenceReviewSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-evidence-review.spec.ts'
  );
  const desktopReadinessPanelText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-readiness-panel.component.ts'
  );
  const desktopReadinessPanelSpecText = readTextFile(
    'desktop/test/unit/components/docedit/core/korean-fieldwork-readiness-panel.component.spec.ts'
  );
  const desktopRecordContextPanelText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.component.ts'
  );
  const desktopRecordContextPanelTemplateText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.html'
  );
  const desktopRecordContextPanelStyleText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.scss'
  );
  const desktopRecordContextPanelSpecText = readTextFile(
    'desktop/test/unit/components/docedit/core/korean-fieldwork-record-context-panel.component.spec.ts'
  );
  const desktopWorkbenchText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-workbench.ts'
  );
  const desktopWorkbenchSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-workbench.spec.ts'
  );
  const tabletFieldNotesText = readTextFile(
    'mobile/components/Project/korean-fieldwork-field-notes.ts'
  );
  const tabletFieldNotesSpecText = readTextFile(
    'mobile/components/Project/korean-fieldwork-field-notes.spec.ts'
  );
  const tabletHierarchyBoardText = readTextFile(
    'mobile/components/Project/KoreanFieldworkHierarchyBoard.tsx'
  );

  assertSourceOrder(
    findings,
    'tablet add record form',
    readTextFile('mobile/app/(tabs)/ProjectScreen/DocumentAdd.tsx'),
    [
      '<KoreanFieldworkDraftContextPanel',
      '<KoreanFieldworkQuickRecordPanel',
      '<KoreanFieldworkSoilColorPanel'
    ]
  );

  assertSourceOrder(
    findings,
    'tablet edit record form',
    readTextFile('mobile/app/(tabs)/ProjectScreen/DocumentEdit.tsx'),
    [
      '<KoreanFieldworkRecordContextPanel',
      '<KoreanFieldworkRecordActionPanel',
      '<KoreanFieldworkQuickRecordPanel',
      '<KoreanFieldworkSoilColorPanel'
    ]
  );

  assertSourceOrder(
    findings,
    'desktop edit record form',
    readTextFile('desktop/src/app/components/docedit/core/edit-form.html'),
    [
      '<korean-fieldwork-record-context-panel',
      '<korean-fieldwork-readiness-panel',
      '<korean-fieldwork-feature-guidance-panel',
      '<korean-fieldwork-quick-record-panel',
      '<korean-fieldwork-orientation-panel',
      '<korean-fieldwork-soil-color-panel'
    ]
  );

  if (
    !desktopPriorityStripText.includes('recordMemoTemplate: true')
    || !desktopDocumentDraftText.includes('recordMemoTemplate?: boolean')
  ) {
    findings.push('desktop selected-record PenMemo drafts must enable the field-note template');
  }
  if (
    !desktopPriorityStripText.includes('continueNotebookEntry')
    || !desktopPriorityStripText.includes('getKoreanFieldworkNotebookContinuationSeed')
    || !desktopDocumentDraftText.includes('recordMemoContinuation?:')
    || !desktopNotebookDigestText.includes('getKoreanFieldworkNotebookContinuationSeed')
  ) {
    findings.push('desktop notebook follow-ups must be continuable as seeded PenMemo drafts');
  }
  if (
    !desktopDocumentDraftText.includes('관찰 내용')
    || !desktopDocumentDraftText.includes('스케치·약측/근거 번호')
    || !desktopDocumentDraftText.includes('다음 작업')
    || !desktopDocumentDraftText.includes('makeRecordMemoTemplate')
  ) {
    findings.push('desktop selected-record PenMemo draft template must bind observation to sketch/measurement evidence');
  }
  if (!desktopPriorityStripSpecText.includes('description: \'[관찰 내용]\\n\\n[스케치·약측/근거 번호]\\n\\n[다음 작업]\'')) {
    findings.push('desktop priority strip test must prove selected-record PenMemo drafts include the note template');
  }
  if (!desktopWorkbenchText.includes('getPenMemoSketchSummaryLabel')
      || !desktopWorkbenchText.includes('reasons.push(getPenMemoSketchSummaryLabel')) {
    findings.push('desktop workbench must carry tablet sketch memo size into the selected-record work list');
  }
  if (!desktopWorkbenchSpecText.includes('스케치 메모 1획/1점')) {
    findings.push('desktop workbench test must prove tablet sketch memo size appears before opening the record');
  }
  if (!desktopPriorityStripText.includes('getNotebookRecentEntries')) {
    findings.push('desktop notebook panel must expose recent notebook entries like the tablet ledger');
  }
  if (!readTextFile('desktop/src/app/components/resources/korean-fieldwork-priority-strip.html')
      .includes('korean-fieldwork-notebook-strip-kind">최근')) {
    findings.push('desktop notebook panel template must render recent notebook rows');
  }
  if (!readTextFile('desktop/src/app/components/resources/korean-fieldwork-priority-strip.html')
      .includes('korean-fieldwork-notebook-strip-continue')) {
    findings.push('desktop notebook panel template must render continuation buttons');
  }
  if (!desktopPriorityStripSpecText.includes('hasNotebookRecentEntries')) {
    findings.push('desktop priority strip test must cover recent notebook rows');
  }
  if (!desktopPriorityStripSpecText.includes('continues notebook entries as seeded PenMemo drafts')) {
    findings.push('desktop priority strip test must cover notebook continuation drafts');
  }
  if (!desktopNotebookDigestSpecText.includes('builds continuation seeds for notebook follow-ups')) {
    findings.push('desktop notebook digest test must cover continuation seed creation');
  }
  if (!desktopNotebookDigestText.includes('boundaryMemoPreview')
      || !desktopNotebookDigestText.includes('boundaryMemoImportedAtLabel')
      || !desktopNotebookDigestText.includes('workMemoUpdatedAtLabel')
      || !desktopNotebookDigestText.includes('dailyLogContent')
      || !desktopNotebookDigestText.includes('contentLabel')
      || !desktopNotebookDigestText.includes('evidenceRoleLabel')
      || !desktopNotebookDigestText.includes('reviewLabel')
      || !desktopPriorityStripTemplateText.includes('korean-fieldwork-notebook-journal-boundary-preview')
      || !desktopPriorityStripTemplateText.includes('summary.boundaryMemoImportedAtLabel')
      || !desktopPriorityStripTemplateText.includes('summary.workMemoUpdatedAtLabel')
      || !desktopPriorityStripTemplateText.includes('summary.contentLabel')
      || !desktopPriorityStripTemplateText.includes('summary.evidenceRoleLabel')
      || !desktopPriorityStripTemplateText.includes('summary.reviewLabel')
      || !desktopPriorityStripStyleText.includes('korean-fieldwork-notebook-journal-boundary-preview')
      || !desktopNotebookDigestSpecText.includes('boundaryMemoPreview')
      || !desktopNotebookDigestSpecText.includes('경계 가져옴')
      || !desktopNotebookDigestSpecText.includes('작업일지 수정')
      || !desktopNotebookDigestSpecText.includes('classification-only logs')
      || !desktopPriorityStripSpecText.includes('작업일지 수정')
      || !desktopPriorityStripSpecText.includes('당일 사실기록')
      || !desktopPriorityStripSpecText.includes('boundaryMemoPreview')) {
    findings.push('desktop notebook panel must preview tablet daily-journal boundary handwriting, imported boundary date, last work-memo update, and daily log classification fields, not only count it');
  }
  if (!desktopNotebookDigestText.includes('export function createDailyJournalSummary')
      || !desktopRecordContextPanelText.includes('getDailyJournalSummary')
      || !desktopRecordContextPanelText.includes('dailyLogInvestigatorCount')
      || !desktopRecordContextPanelText.includes('dailyLogWorkMemoUpdatedAt')
      || !desktopRecordContextPanelText.includes('dailyLogContent')
      || !desktopRecordContextPanelText.includes('dailyLogEvidenceRole')
      || !desktopRecordContextPanelText.includes('dailyLogReview')
      || !desktopRecordContextPanelTemplateText.includes('korean-fieldwork-record-context-daily-summary')
      || !desktopRecordContextPanelStyleText.includes('korean-fieldwork-record-context-daily-summary-chip')
      || !desktopRecordContextPanelTemplateText.includes('dailyJournalSummary.workMemoUpdatedAtLabel')
      || !desktopRecordContextPanelTemplateText.includes('dailyJournalSummary.contentLabel')
      || !desktopRecordContextPanelTemplateText.includes('dailyJournalSummary.evidenceRoleLabel')
      || !desktopRecordContextPanelTemplateText.includes('dailyJournalSummary.reviewLabel')
      || !desktopRecordContextPanelSpecText.includes('작업일지 수정')
      || !desktopRecordContextPanelSpecText.includes('당일 사실기록')
      || !desktopRecordContextPanelSpecText.includes('personnel, equipment, and safety on opened DailyLog records')) {
    findings.push('desktop record context must summarize tablet daily-journal personnel, equipment, safety, last work-memo update, and daily log classification fields on opened DailyLog records');
  }
  if (!desktopRecordContextPanelText.includes('getDailyJournalBoundaryMemoPreview')
      || !desktopRecordContextPanelText.includes('dailyLogBoundaryMemoImportedAt')
      || !desktopRecordContextPanelText.includes('dailyLogBoundaryMemoStrokes')
      || !desktopRecordContextPanelTemplateText.includes('korean-fieldwork-record-context-daily-boundary')
      || !desktopRecordContextPanelTemplateText.includes('boundaryMemoPreview.importedAt')
      || !desktopRecordContextPanelStyleText.includes('korean-fieldwork-record-context-daily-boundary-svg')
      || !desktopRecordContextPanelSpecText.includes('opened DailyLog records')) {
    findings.push('desktop record context must preview tablet daily-journal boundary handwriting and imported boundary date on opened DailyLog records');
  }
  if (!tabletHierarchyBoardText.includes('이어진 기록')
      || !tabletHierarchyBoardText.includes('포함 위치')) {
    findings.push('tablet hierarchy board must describe connected records with field-facing wording');
  }
  if (!desktopHierarchyText.includes('makeKoreanFieldworkHierarchyLanes')
      || !desktopPriorityStripText.includes('makeKoreanFieldworkHierarchyLanes')
      || !desktopPriorityStripTemplateText.includes('이어진 기록')
      || !desktopPriorityStripTemplateText.includes('포함 위치')) {
    findings.push('desktop records panel must mirror tablet connected-record hierarchy lanes with field-facing wording');
  }
  if (!desktopPriorityStripSpecText.includes('connected record hierarchy lanes')
      || !desktopPriorityStripSpecText.includes('getHierarchyScopeLabel')) {
    findings.push('desktop priority strip test must cover connected record hierarchy lanes');
  }
  if (!desktopEvidenceReviewText.includes('pendingPenMemoTranscriptions')
      || !desktopEvidenceReviewText.includes('getPendingPenMemoTranscriptionDocuments')
      || !desktopEvidenceReviewText.includes('getPendingPenMemoTranscriptionIssues')
      || !desktopEvidenceReviewText.includes('getPenMemoSketchSummaries')
      || !desktopEvidenceReviewText.includes('getPenMemoSketchSummaryLabel')
      || !desktopEvidenceReviewText.includes('getPenMemoSketchPreview')
      || !desktopEvidenceReviewText.includes('getPenMemoTranscriptionSummaryLabel')
      || !desktopEvidenceReviewText.includes('penMemoSketchSummaries')
      || !desktopEvidenceReviewText.includes('penMemoTranscriptionSummaries')
      || !desktopEvidenceReviewText.includes('pen-memo-handwriting-transcription')
      || !desktopEvidenceReviewText.includes('penMemoTranscription')) {
    findings.push('desktop evidence review must carry tablet PenMemo transcription backlog into readiness summaries');
  }
  if (!desktopEvidenceReviewSpecText.includes('tablet handwriting PenMemo')
      || !desktopEvidenceReviewSpecText.includes('tablet sketch memo')
      || !desktopEvidenceReviewSpecText.includes('penMemoSketchSummaries')
      || !desktopEvidenceReviewSpecText.includes('스케치 메모 1획/1점')
      || !desktopEvidenceReviewSpecText.includes('태블릿 손글씨 원자료')
      || !desktopEvidenceReviewSpecText.includes('desktop SVG previews')
      || !desktopEvidenceReviewSpecText.includes('pen-memo-handwriting-transcription')
      || !desktopEvidenceReviewSpecText.includes('pen-memo-auto-transcript-review')
      || !desktopEvidenceReviewSpecText.includes('penMemoTranscription')) {
    findings.push('desktop evidence review test must cover tablet handwriting PenMemo transcription backlog');
  }
  if (!desktopReadinessPanelText.includes('pendingPenMemoTranscriptions')
      || !desktopReadinessPanelText.includes('getPenMemoTranscriptionSummaryLabels')
      || !desktopReadinessPanelText.includes('penMemoSketchSummaries')
      || !desktopReadinessPanelText.includes('스케치 메모')
      || !desktopReadinessPanelText.includes('야장 전사')
      || !desktopReadinessPanelText.includes('전사 대기')
      || !desktopReadinessPanelText.includes('soilColorCandidateSummaries')
      || !desktopReadinessPanelText.includes('토색 후보')) {
    findings.push('desktop readiness panel must show PenMemo transcription backlog as field-facing evidence review');
  }
  if (!desktopReadinessPanelSpecText.includes('pendingPenMemoTranscriptions')
      || !desktopReadinessPanelSpecText.includes('penMemoSketches')
      || !desktopReadinessPanelSpecText.includes('스케치 메모')
      || !desktopReadinessPanelSpecText.includes('태블릿 손글씨 원자료')
      || !desktopReadinessPanelSpecText.includes('canOpenIssueDocument')
      || !desktopReadinessPanelSpecText.includes('야장 전사')
      || !desktopReadinessPanelSpecText.includes('soilColorCandidates')
      || !desktopReadinessPanelSpecText.includes('먼셀 후보 10YR 4/3')) {
    findings.push('desktop readiness panel test must cover PenMemo transcription backlog labels');
  }
  if (!desktopEvidenceReviewText.includes('soilColorCandidateSummaries')
      || !desktopEvidenceReviewText.includes('getSoilColorCandidateSummaries')
      || !desktopEvidenceReviewSpecText.includes('photo-derived soil color candidates')) {
    findings.push('desktop evidence review must carry tablet photo-derived soil color candidates into review panels');
  }
  if (!desktopRecordContextPanelText.includes('getSoilColorCandidateSummaries')
      || !desktopRecordContextPanelText.includes('getPenMemoSketchSummaryLabel')
      || !desktopRecordContextPanelText.includes('getPenMemoSketchPreview')
      || !desktopRecordContextPanelText.includes('evidenceInsights')
      || !desktopRecordContextPanelTemplateText.includes('getEvidenceInsights()')
      || !desktopRecordContextPanelTemplateText.includes('korean-fieldwork-record-context-sketch-preview')
      || !desktopRecordContextPanelSpecText.includes('먼셀 후보 10YR 4/3')
      || !desktopRecordContextPanelSpecText.includes('태블릿 야장 전사')
      || !desktopRecordContextPanelSpecText.includes('sketchPreview')) {
    findings.push('desktop record context panel must render tablet soil-color candidates and sketch memo details inside the opened record');
  }
  if (!desktopRecordContextPanelText.includes('pushFeatureAttributeChip')
      || !desktopRecordContextPanelText.includes('formatFeatureAttributeLabels')
      || !desktopRecordContextPanelSpecText.includes('가마 핵심 연소부·소성부')
      || !desktopRecordContextPanelSpecText.includes('가마 핵심 속성 미기록')) {
    findings.push('desktop record context panel must render guided feature core attributes inside the opened record');
  }
  if (!desktopRecordContextPanelText.includes('pushFeaturePeriodChip')
      || !desktopRecordContextPanelText.includes('FEATURE_PERIOD_LABELS')
      || !desktopRecordContextPanelText.includes("'period'")
      || !desktopRecordContextPanelSpecText.includes('tablet feature period values')
      || !desktopRecordContextPanelSpecText.includes('시기 조선')) {
    findings.push('desktop record context panel must render tablet feature period values inside the opened record');
  }
  if (!desktopRecordContextPanelText.includes('pushFeatureStratigraphyReviewChips')
      || !desktopRecordContextPanelText.includes('featureFillInterpretation')
      || !desktopRecordContextPanelText.includes('soilTextureFieldAssessment')
      || !desktopRecordContextPanelSpecText.includes('tablet feature stratigraphy and soil checks')
      || !desktopRecordContextPanelSpecText.includes('해석 내부토 귀속 주의')
      || !desktopRecordContextPanelSpecText.includes('토성 판정 정량분석 대조 필요')) {
    findings.push('desktop record context panel must summarize tablet feature-segment stratigraphy and soil checklists inside the opened record');
  }
  if (!desktopRecordContextPanelText.includes('pushSurveyPredictionReviewChip')
      || !desktopRecordContextPanelText.includes('soilMapPredictionVerification')
      || !desktopRecordContextPanelSpecText.includes('tablet soil-map prediction checks')
      || !desktopRecordContextPanelSpecText.includes('예측 토양도 토양도 반영깊이 한계 확인')) {
    findings.push('desktop record context panel must summarize tablet soil-map prediction verification on opened Survey records');
  }
  if (!desktopRecordContextPanelText.includes('pushSourceEvidenceVerificationChip')
      || !desktopRecordContextPanelText.includes('SOURCE_EVIDENCE_VERIFICATION_LABELS')
      || !desktopRecordContextPanelText.includes('sourceEvidenceVerification')
      || !desktopRecordContextPanelSpecText.includes('source evidence caption checks')
      || !desktopRecordContextPanelSpecText.includes('캡션 대조 필요')) {
    findings.push('desktop record context panel must summarize source evidence caption verification inside the opened record');
  }
  if (!desktopRecordContextPanelText.includes('pushMediaReviewChip')
      || !desktopRecordContextPanelText.includes('MEDIA_REVIEW_FIELDS')
      || !desktopRecordContextPanelText.includes('mediaQualityCheck')
      || !desktopRecordContextPanelText.includes('reportCrossCheck')
      || !desktopRecordContextPanelSpecText.includes('tablet media review values')
      || !desktopRecordContextPanelSpecText.includes('초점 흔들림')) {
    findings.push('desktop record context panel must summarize tablet media review values inside opened media records');
  }
  if (!desktopRecordContextPanelText.includes('pushImageUploadChip')
      || !desktopRecordContextPanelText.includes('hasConfirmedKoreanFieldworkImageUpload')
      || !desktopRecordContextPanelText.includes('MEDIA_LOCAL_URI_FIELDS')
      || !desktopRecordContextPanelSpecText.includes('confirmed tablet image uploads')
      || !desktopRecordContextPanelSpecText.includes('백업 업로드 확인')) {
    findings.push('desktop record context panel must summarize tablet image upload and backup status inside opened media records');
  }
  for (const { label, text } of [
    { label: 'desktop notebook digest', text: desktopNotebookDigestText },
    { label: 'tablet field notes', text: tabletFieldNotesText }
  ]) {
    if (!text.includes('createNotebookEntryFromRecordFieldNote')
        || !text.includes("getStringField(document, 'fieldNote')")
        || !text.includes('RECORD_FIELD_NOTE_SOURCE_LABEL')) {
      findings.push(`${label} must surface tablet fieldNote values as notebook entries`);
    }
    const evidenceNumberCategoryChecks = label === 'desktop notebook digest'
      ? [
        {
          pattern: /EVIDENCE_NUMBER_CATEGORIES[\s\S]*'SoilProfilePhoto'/,
          finding: `${label} must require evidence numbers for soil profile photo note targets`
        },
        {
          pattern: /EVIDENCE_NUMBER_CATEGORIES[\s\S]*'PenMemo'/,
          finding: `${label} must require evidence numbers for sketch memo note targets`
        }
      ]
      : [
        {
          pattern: /shouldPromptEvidenceNumbers[\s\S]*C\.SOIL_PROFILE_PHOTO/,
          finding: `${label} must require evidence numbers for soil profile photo note targets`
        },
        {
          pattern: /shouldPromptEvidenceNumbers[\s\S]*C\.PEN_MEMO/,
          finding: `${label} must require evidence numbers for sketch memo note targets`
        }
      ];

    for (const check of evidenceNumberCategoryChecks) {
      if (!check.pattern.test(text)) {
        findings.push(check.finding);
      }
    }
    if (!text.includes('FIELD_NOTE_SECTION_ALIASES')
        || !text.includes('근거 번호')
        || !text.includes('스케치·약측/근거 번호')) {
      findings.push(`${label} must accept old and sketch/measurement evidence-number section labels`);
    }
    if (!text.includes('hasMeaningfulFieldNoteText')) {
      findings.push(`${label} must ignore field-note section templates without content`);
    }
  }
  for (const { label, text } of [
    { label: 'desktop notebook digest test', text: desktopNotebookDigestSpecText },
    { label: 'tablet field notes test', text: tabletFieldNotesSpecText }
  ]) {
    if (!text.includes('builds notebook entries from tablet fieldNote saved on selected records')) {
      findings.push(`${label} must cover direct tablet fieldNote notebook entries`);
    }
    if (!text.includes('keeps soil profile photos and sketch memos in evidence-number follow-up review')) {
      findings.push(`${label} must cover soil profile photo and sketch memo evidence-number follow-up review`);
    }
    if (!text.includes('[관찰 내용]\\n\\n[근거 번호]\\n\\n[다음 작업]')) {
      findings.push(`${label} must cover empty field-note templates`);
    }
    if (!text.includes('[근거 번호] 사진 12')) {
      findings.push(`${label} must cover short evidence-number labels`);
    }
  }

  return findings;
}

function assertSourceOrder(findings, label, text, markers) {
  let previousIndex = -1;
  let previousMarker = '';

  for (const marker of markers) {
    const index = text.indexOf(marker);

    if (index === -1) {
      findings.push(`${label} missing panel marker: ${marker}`);
      continue;
    }

    if (previousIndex !== -1 && index < previousIndex) {
      findings.push(`${label} must place ${marker} after ${previousMarker}`);
    }

    previousIndex = index;
    previousMarker = marker;
  }
}

function validateReportHandoffPreSaveValidation() {
  const findings = [];
  const coreRecordContractText = readTextFile('core/src/tools/korean-fieldwork-record-contract.ts');
  const coreRecordContractSpecText = readTextFile('core/test/tools/korean-fieldwork-record-contract.spec.ts');
  const coreReportHandoffText = readTextFile('core/src/tools/korean-fieldwork-report-handoff.ts');
  const coreReportHandoffSpecText = readTextFile('core/test/tools/korean-fieldwork-report-handoff.spec.ts');
  const coreReadinessText = readTextFile('core/src/tools/korean-fieldwork-readiness.ts');
  const desktopChecklistText = readTextFile('desktop/src/app/util/korean-fieldwork-checklist.ts');
  const tabletAddText = readTextFile('mobile/app/(tabs)/ProjectScreen/DocumentAdd.tsx');
  const tabletEditText = readTextFile('mobile/app/(tabs)/ProjectScreen/DocumentEdit.tsx');
  const tabletPackageText = readTextFile('mobile/package.json');
  const tabletWorkflowText = readTextFile('.github/workflows/mobile.yml');
  const desktopPriorityStripText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts'
  );
  const desktopPriorityStripTemplateText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.html'
  );
  const desktopPriorityStripStyleText = readTextFile(
    'desktop/src/app/components/resources/korean-fieldwork-priority-strip.scss'
  );
  const desktopPriorityStripSpecText = readTextFile(
    'desktop/test/unit/components/resources/korean-fieldwork-priority-strip.component.spec.ts'
  );
  const desktopRecordContextText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.component.ts'
  );
  const desktopRecordContextTemplateText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.html'
  );
  const desktopRecordContextStyleText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.scss'
  );
  const desktopRecordContextSpecText = readTextFile(
    'desktop/test/unit/components/docedit/core/korean-fieldwork-record-context-panel.component.spec.ts'
  );
  const desktopHwpClipboardText = readTextFile('desktop/src/app/util/korean-fieldwork-hwp-clipboard.ts');

  if (!coreReportHandoffText.includes('validateKoreanFieldworkReportHandoffCandidate')
      || !coreReportHandoffText.includes('KoreanFieldworkReportHandoffValidation')
      || !coreReportHandoffText.includes('getKoreanFieldworkReportHandoffSaveMessage')
      || !coreReportHandoffText.includes('getKoreanFieldworkReportHandoffValidationDetailMessage')
      || !coreReportHandoffText.includes('RELATION_REQUIRED_CATEGORIES')
      || !coreReportHandoffText.includes('MEDIA_URI_FIELDS')) {
    findings.push('core report handoff must expose reusable pre-save validation for tablet and desktop report copy readiness');
  }
  if (!coreReportHandoffSpecText.includes('tablet save warnings for desktop HWP handoff gaps')
      || !tabletAddText.includes('getKoreanFieldworkReportHandoffSaveMessage')
      || !tabletEditText.includes('getKoreanFieldworkReportHandoffSaveMessage')
      || tabletAddText.includes('getReportHandoffSaveMessage')
      || tabletEditText.includes('getReportHandoffSaveMessage')) {
    findings.push('tablet save flows must use the shared core HWP handoff save message, including concrete review details');
  }
  if (!tabletPackageText.includes('"test:ci": "jest --watchAll=false --runInBand"')
      || !tabletWorkflowText.includes('mobile-handoff-tests')
      || !tabletWorkflowText.includes('branches:')
      || !tabletWorkflowText.includes('Run tablet HWP handoff tests')
      || !tabletWorkflowText.includes('npm run test:ci -- --runTestsByPath components/Project/DocumentAdd.spec.tsx components/Project/DocumentEdit.spec.tsx')
      || !tabletWorkflowText.includes("startsWith(github.ref, 'refs/tags/')")
      || !tabletWorkflowText.includes("github.event_name == 'workflow_dispatch'")) {
    findings.push('mobile CI must run focused tablet HWP handoff tests on branch changes while keeping APK builds gated to tags, PRs, or manual runs');
  }
  if (!coreReportHandoffText.includes('normalizeKoreanFieldworkHwpPlainText')
      || !coreReportHandoffText.includes(".replace(/\\r\\n?/g, '\\n')")
      || !coreReportHandoffText.includes(".replace(/\\n/g, '\\r\\n')")
      || !coreReportHandoffSpecText.includes('normalizes HWP copy text as plain Windows clipboard text')) {
    findings.push('core report handoff must normalize HWP copy blocks as plain Windows clipboard text');
  }
  if (!coreReportHandoffText.includes('KoreanFieldworkReportHandoffCopySection')
      || !coreReportHandoffText.includes('copySections: makeCopySections')
      || !coreReportHandoffSpecText.includes('copySections.map(section => section.id)')) {
    findings.push('core report handoff must expose section-level HWP copy blocks for selective desktop pasting');
  }
  if (!coreReportHandoffText.includes('evidenceDetails')
      || !coreReportHandoffText.includes('issueDetails')
      || !coreReportHandoffText.includes('relationDetails')
      || !coreReportHandoffText.includes('getEvidenceDetails')
      || !coreReportHandoffText.includes('getIssueDetails')
      || !coreReportHandoffText.includes('getRelationDetails')
      || !coreReportHandoffText.includes('EVIDENCE_DETAILS')) {
    findings.push('core report handoff copy blocks must include concrete relation, evidence, and issue details, not only counts');
  }
  if (!coreReportHandoffText.includes('getSoilProfilePhotoEvidenceSummary')
      || !coreReportHandoffText.includes('getFieldworkPhotoEvidenceSummary')
      || !coreReportHandoffText.includes('getPhotoReportMetadataSummary')
      || !coreReportHandoffText.includes('getDrawingEvidenceSummary')
      || !coreReportHandoffText.includes('getMediaRecordSummary')
      || !coreReportHandoffText.includes('getMediaDetailSummary')
      || !coreReportHandoffText.includes('getFindEvidenceSummary')
      || !coreReportHandoffText.includes('getSampleEvidenceSummary')
      || !coreReportHandoffText.includes('FIND_EVIDENCE_SUMMARY_FIELDS')
      || !coreReportHandoffText.includes('SAMPLE_EVIDENCE_SUMMARY_FIELDS')
      || !coreReadinessText.includes('isPresentIn')
      || !coreReportHandoffText.includes('getLocationDrawingDetailSummary')
      || !coreReportHandoffText.includes('getDailyLogDetailSummary')
      || !coreReportHandoffText.includes('getFieldNoteDetailSummary')
      || !coreReportHandoffText.includes('getSummaryFieldValue')
      || !coreRecordContractText.includes('isKoreanFieldworkRecordValuelistField')
      || !coreRecordContractText.includes('getKoreanFieldworkProjectValuelistValueLabel')
      || !coreReportHandoffText.includes('soilProfileColorSwatches')
      || !coreReportHandoffText.includes('featureLocationSketch')
      || !coreReportHandoffText.includes('featureFreeDrawingStrokes')
      || !coreReportHandoffText.includes('dailyLogBoundaryMemoStrokes')
      || !coreReportHandoffText.includes('dailyLogContent')
      || !coreReportHandoffText.includes('fieldNote')
      || !coreReportHandoffText.includes('fieldworkPhotoAnnotationStrokes')
      || !coreReportHandoffText.includes('soilProfilePhotoAnnotationStrokes')
      || !coreReportHandoffText.includes('soilProfileLayerMarkers')
      || !coreReportHandoffText.includes('drawingSketchStrokes')
      || !coreReportHandoffText.includes('SOIL_COLOR_SAMPLE_SOURCE_PATTERN')
      || !coreReportHandoffText.includes('RGB_SAMPLE_LOCATION_PATTERN')
      || !coreReportHandoffSpecText.includes('soil profile color sample locations into HWP copy blocks')
      || !coreReportHandoffSpecText.includes('feature location sketches without dumping tablet sketch JSON')
      || !coreReportHandoffSpecText.includes('daily log journal fields into HWP copy blocks')
      || !coreReportHandoffSpecText.includes('selected-record tablet field notes into HWP copy blocks')
      || !coreReportHandoffSpecText.includes('recovers soil profile eyedropper locations from layer swatches')
      || !coreReportHandoffSpecText.includes('prefers accepted layer color sample locations')
      || !coreReportHandoffSpecText.includes('photo report metadata into HWP copy blocks')
      || !coreReportHandoffSpecText.includes('tablet media metadata as direct HWP copy summaries')
      || !coreReportHandoffSpecText.includes('tablet drawing sketches without dumping stroke JSON')
      || !coreReportHandoffSpecText.includes('find and sample collection notes into HWP copy blocks')
      || !coreReportHandoffSpecText.includes('\\uc6d0\\ubcf8 \\ud30c\\uc77c: pit-001.jpg')
      || !coreReportHandoffSpecText.includes('\\uc6d0\\ubcf8 \\ud30c\\uc77c: pit-before.jpg')
      || !coreReportHandoffSpecText.includes('\\ud06c\\uae30: 4032x3024')
      || !coreReportHandoffSpecText.includes('\\uc720\\ubb3c \\uad00\\ub9ac \\uc808\\ucc28')
      || !coreReportHandoffSpecText.includes('\\uc2dc\\ub8cc \\ucc44\\ucde8')
      || !coreReportHandoffSpecText.includes('\\uc704\\uce58 \\uc57d\\ub3c4: \\uc788\\uc74c')
      || !coreReportHandoffSpecText.includes('\\uc790\\uc720 \\uc2a4\\ucf00\\uce58: \\uc788\\uc74c')
      || !coreReportHandoffSpecText.includes('\\uc791\\uc5c5\\uc77c\\uc9c0 \\uacbd\\uacc4 \\uba54\\ubaa8: \\uc788\\uc74c')
      || !coreReportHandoffSpecText.includes('\\ud604\\uc7a5\\uba54\\ubaa8: \\uad00\\ucc30')
      || !coreReportHandoffSpecText.includes('\\ud1a0\\uce35\\uc120 \\ud45c\\uc2dc: \\uc788\\uc74c')
      || !coreReportHandoffSpecText.includes('\\uc0ac\\uc9c4 \\ud45c\\uc2dc: \\uc788\\uc74c')
      || !coreReportHandoffSpecText.includes('1\\uce35: RGB')
      || !desktopPriorityStripSpecText.includes('RGB 111/87/61 @ 20%/50%')
      || !desktopPriorityStripSpecText.includes('1\\uce35: RGB')
      || !desktopPriorityStripSpecText.includes('\\uc6d0\\ubcf8 \\ud30c\\uc77c: pit-001.jpg')
      || !desktopPriorityStripSpecText.includes('\\uc6d0\\ubcf8 \\ud30c\\uc77c: soil-photo-1.jpg')
      || !desktopPriorityStripSpecText.includes('\\ud06c\\uae30: 4032x3024')
      || !desktopPriorityStripSpecText.includes('\\uc2a4\\ud3ec\\uc774\\ub4dc \\uc704\\uce58')
      || !desktopPriorityStripSpecText.includes('\\uc704\\uce58 \\uc57d\\ub3c4: \\uc788\\uc74c')
      || !desktopPriorityStripSpecText.includes('\\uc790\\uc720 \\uc2a4\\ucf00\\uce58: \\uc788\\uc74c')
      || !desktopPriorityStripSpecText.includes('\\uc791\\uc5c5\\uc77c\\uc9c0 \\uacbd\\uacc4 \\uba54\\ubaa8: \\uc788\\uc74c')
      || !desktopPriorityStripSpecText.includes('\\ud604\\uc7a5\\uba54\\ubaa8: \\uad00\\ucc30')
      || !desktopPriorityStripSpecText.includes('\\uadfc\\uac70 \\ubc88\\ud638')
      || !desktopPriorityStripSpecText.includes('\\uc720\\ubb3c find-001')
      || !desktopPriorityStripSpecText.includes('\\uc2dc\\ub8cc sample-001')
      || !desktopPriorityStripSpecText.includes('\\uc2dc\\ub8cc \\ucc44\\ucde8')
      || !desktopPriorityStripSpecText.includes('\\uce35 \\ubc88\\ud638 \\ud45c\\uc2dc: \\uc788\\uc74c')
      || !desktopPriorityStripSpecText.includes('\\ud0dc\\ube14\\ub9bf \\uc2a4\\ucf00\\uce58: \\uc788\\uc74c')) {
    findings.push('report handoff HWP copy blocks must carry soil profile color swatches, tablet daily logs, selected-record field notes, tablet feature sketches, tablet photo/drawing annotations, tablet eyedropper sample locations, and tablet find/sample collection notes');
  }
  if (!coreRecordContractText.includes('KOREAN_FIELDWORK_FEATURE_INVESTIGATION_CHECKLIST_LABELS')
      || !coreRecordContractText.includes('KOREAN_FIELDWORK_RECORD_VALUE_LABELS')
      || !coreRecordContractText.includes('getKoreanFieldworkFeatureInvestigationChecklistSummary')
      || !coreRecordContractText.includes('getKoreanFieldworkRecordFieldValueSummary')
      || !coreRecordContractText.includes('getKoreanFieldworkFeaturePeriodSummary')
      || !coreRecordContractText.includes('KOREAN_FIELDWORK_TRIAL_TRENCH_CHECKLIST_STEPS')
      || !coreRecordContractText.includes('geometrySource')
      || !coreRecordContractText.includes('featureGeometryEditStatus')
      || !coreRecordContractText.includes('surveyBoundarySource')
      || !coreRecordContractSpecText.includes('tablet quick-record value labels')
      || !coreRecordContractSpecText.includes('tablet investigation checklist order and Korean labels')
      || !coreReportHandoffText.includes('getFeatureTypeDetailSummary')
      || !coreReportHandoffText.includes('getPeriodDetailSummary')
      || !coreReportHandoffText.includes('getKoreanFieldworkFeatureTypeLabel')
      || !coreReportHandoffText.includes('getKoreanFieldworkFeatureTypeLabelFromInterpretationType')
      || !coreReportHandoffSpecText.includes('feature type choices into HWP copy blocks')
      || !coreReportHandoffText.includes('getInvestigationStatusDetailSummary')
      || !coreReportHandoffText.includes('getKoreanFieldworkFeatureInvestigationChecklistSummary')
      || !coreReportHandoffText.includes('featureInvestigationChecklist')
      || !coreReportHandoffSpecText.includes('investigation checklist steps into HWP copy blocks')
      || !coreReportHandoffSpecText.includes("not.toContain('preInvestigationPhotoTaken')")
      || !coreReportHandoffSpecText.includes("not.toContain('duringFieldwork')")
      || !coreReportHandoffSpecText.includes("not.toContain('bronzeAge')")
      || !coreReportHandoffSpecText.includes("not.toContain('gpsApproximate')")
      || !coreReportHandoffSpecText.includes("not.toContain('roughSketch')")
      || !coreReportHandoffSpecText.includes("not.toContain('shpImport')")
      || !desktopPriorityStripSpecText.includes("not.toContain('pitFeature')")
      || !desktopPriorityStripSpecText.includes("not.toContain('sameDayFieldRecord')")
      || !desktopPriorityStripSpecText.includes("not.toContain('bronzeAge')")
      || !desktopPriorityStripSpecText.includes("not.toContain('gpsApproximate')")
      || !desktopPriorityStripSpecText.includes("not.toContain('shpImport')")
      || !desktopChecklistText.includes('getSharedKoreanFieldworkChecklistSteps')
      || !desktopPriorityStripSpecText.includes("not.toContain('preInvestigationPhotoTaken')")) {
    findings.push('report handoff HWP copy blocks must carry tablet feature type, period, status, quality, verification, geometry, and investigation checklist values with shared Korean labels instead of raw valuelist keys');
  }
  if (!coreReportHandoffText.includes('getPenMemoEvidenceSummary')
      || !coreReportHandoffText.includes('hasStrokeEvidence')
      || !coreReportHandoffSpecText.includes('handwritten tablet pen memos without dumping stroke JSON')
      || !coreReportHandoffSpecText.includes('empty tablet handwriting stroke containers')
      || !desktopPriorityStripSpecText.includes('\\ud544\\uae30 \\uc6d0\\ubcf8: \\uc788\\uc74c')
      || !desktopPriorityStripSpecText.includes("not.toContain('\"strokes\"')")) {
    findings.push('report handoff HWP copy blocks must summarize tablet handwritten PenMemo strokes without leaking stroke JSON');
  }
  if (!coreReportHandoffText.includes('buildEvidenceBundle')
      || !coreReadinessText.includes('getKoreanFieldworkCloseoutReviewIssues')
      || !coreReadinessText.includes('fieldwork-photo-annotation-review')
      || !coreReadinessText.includes('pen-memo-auto-transcript-review')
      || !coreReadinessText.includes('soil-profile-color-swatches-missing')) {
    findings.push('core report handoff evidence bundles must carry tablet closeout review issues into HWP copy blocks');
  }
  if (!coreReportHandoffSpecText.includes('validates a tablet draft before saving it for desktop report handoff')
      || !coreReportHandoffSpecText.includes('reports pre-save handoff gaps')) {
    findings.push('core report handoff tests must prove tablet draft pre-save validation and HWP gap detection');
  }
  if (!coreReportHandoffSpecText.includes('evidenceDetails.join')
      || !coreReportHandoffSpecText.includes('issueDetails.join')
      || !coreReportHandoffSpecText.includes('relationDetails')
      || !coreReportHandoffText.includes('formatReportHandoffIssueDetail')
      || coreReportHandoffText.includes('`(${issue.ruleId})`')
      || !coreReportHandoffSpecText.includes('fieldwork-photo-upload-missing')
      || !coreReportHandoffSpecText.includes('fieldwork-photo-annotation-review')
      || !coreReportHandoffSpecText.includes('pen-memo-auto-transcript-review')
      || !coreReportHandoffSpecText.includes("not.toContain('fieldwork-photo-upload-missing')")
      || !coreReportHandoffSpecText.includes("not.toContain('pen-memo-auto-transcript-review')")
      || !desktopPriorityStripSpecText.includes("not.toContain('fieldwork-photo-upload-missing')")) {
    findings.push('core report handoff tests must prove relation labels, evidence, readiness issues, and closeout issues are carried into HWP copy blocks without leaking internal rule ids');
  }
  for (const [label, text] of [
    ['tablet add screen', tabletAddText],
    ['tablet edit screen', tabletEditText]
  ]) {
    if (!text.includes('validateKoreanFieldworkReportHandoffCandidate')
        || !text.includes('getKoreanFieldworkReportHandoffSaveMessage')
        || !text.includes("reportHandoffValidation.status === 'review' ? 5000 : 3000")) {
      findings.push(`${label} must validate desktop report handoff before saving tablet records`);
    }
  }
  if (!desktopPriorityStripText.includes('makeKoreanFieldworkReportHandoff')
      || !desktopPriorityStripText.includes('copyReportHandoffItem')
      || !desktopPriorityStripText.includes('reportHandoffCopyAllText')) {
    findings.push('desktop report handoff panel must keep using the same core copy-block contract');
  }
  if (!desktopHwpClipboardText.includes('normalizeKoreanFieldworkHwpPlainText')
      || !desktopHwpClipboardText.includes('electronClipboard.clear?.()')
      || !desktopHwpClipboardText.includes("electronClipboard.write({ text: plainText, html: '' })")
      || !desktopPriorityStripText.includes('writeKoreanFieldworkHwpClipboardText')
      || !desktopPriorityStripSpecText.includes("write).toHaveBeenCalledWith({ text: featureItem.copyText, html: '' })")) {
    findings.push('desktop report handoff copy must use text-only clipboard writes for HWP-safe paste');
  }
  if (!desktopPriorityStripTemplateText.includes('previewItem.copySections')
      || !desktopPriorityStripTemplateText.includes('korean-fieldwork-report-handoff-copy-section')
      || !desktopPriorityStripText.includes('copyReportHandoffSection')
      || !desktopPriorityStripText.includes('getReportHandoffSectionCopyActionLabel')
      || !desktopPriorityStripStyleText.includes('.korean-fieldwork-report-handoff-copy-section')
      || !desktopPriorityStripSpecText.includes('copyReportHandoffSection')
      || !desktopPriorityStripSpecText.includes('evidenceSection.copyText')) {
    findings.push('desktop report handoff preview must support section-level HWP copy buttons for selective pasting');
  }
  if (!desktopRecordContextText.includes('makeKoreanFieldworkReportHandoff')
      || !desktopRecordContextText.includes('writeKoreanFieldworkHwpClipboardText')
      || !desktopRecordContextText.includes('copyReportHandoffSection')
      || !desktopRecordContextTemplateText.includes('korean-fieldwork-record-context-hwp')
      || !desktopRecordContextTemplateText.includes('reportItem.copySections')
      || !desktopRecordContextStyleText.includes('.korean-fieldwork-record-context-hwp')
      || !desktopRecordContextSpecText.includes('exposes current record HWP copy blocks in the desktop record context')
      || !desktopRecordContextSpecText.includes('copyReportHandoffSection')) {
    findings.push('desktop record context panel must expose current-record HWP copy blocks using the shared handoff contract');
  }
  if (!desktopPriorityStripTemplateText.includes('korean-fieldwork-report-handoff-details')
      || !desktopPriorityStripTemplateText.includes('item.relationDetails')
      || !desktopPriorityStripTemplateText.includes('item.evidenceDetails')
      || !desktopPriorityStripTemplateText.includes('item.issueDetails')
      || !desktopPriorityStripTemplateText.includes('korean-fieldwork-report-handoff-preview')
      || !desktopPriorityStripTemplateText.includes('previewItem.copyText')
      || !desktopPriorityStripTemplateText.includes('korean-fieldwork-report-handoff-overflow')
      || !desktopPriorityStripText.includes('REPORT_HANDOFF_COLLAPSED_LIMIT')
      || !desktopPriorityStripText.includes('hasReportHandoffOverflow')
      || !desktopPriorityStripText.includes('toggleReportHandoffItems')
      || !desktopPriorityStripStyleText.includes('.korean-fieldwork-report-handoff-detail')
      || !desktopPriorityStripStyleText.includes('&.relation')
      || !desktopPriorityStripStyleText.includes('.korean-fieldwork-report-handoff-copy-preview')
      || !desktopPriorityStripStyleText.includes('.korean-fieldwork-report-handoff-overflow')
      || !desktopPriorityStripSpecText.includes('photoItem!.relationDetails')
      || !desktopPriorityStripSpecText.includes('featureItem.evidenceDetails')
      || !desktopPriorityStripSpecText.includes('featureItem.issueDetails')
      || !desktopPriorityStripSpecText.includes('getReportHandoffPreviewItem')
      || !desktopPriorityStripSpecText.includes('expands report handoff lists')) {
    findings.push('desktop report handoff panel must render and test relation details, evidence details, issue details, visible HWP copy previews, and expandable full record lists');
  }

  return findings;
}

function validateTabletInstallGuide() {
  const findings = [];
  const rootReadmeText = readTextFile('README.md');
  const tabletInstallDocText = readTextFile('docs/korean-fieldwork/android-tablet-install.ko.md');
  const tabletInstallScriptText = readTextFile('install-idai-field-android-apk.ps1');
  const tabletInstallShortcutText = readTextFile('INSTALL_LATEST_TABLET_APK.cmd');
  const tabletInstallOtherDriveShortcutText = readTextFile('INSTALL_LATEST_TABLET_APK_TO_OTHER_DRIVE.cmd');
  const tabletDownloadShortcutText = readTextFile('DOWNLOAD_LATEST_TABLET_APK.cmd');
  const tabletDownloadOtherDriveShortcutText = readTextFile('DOWNLOAD_LATEST_TABLET_APK_TO_OTHER_DRIVE.cmd');
  const tabletReadmeText = readTextFile('mobile/README.md');
  const desktopWorkflowText = readTextFile('.github/workflows/desktop.yml');
  const tabletWorkflowText = readTextFile('.github/workflows/mobile.yml');

  if (!tabletWorkflowText.includes('name: idai-field-mobile-android-apk')) {
    findings.push('mobile workflow must publish the Android APK artifact under the documented name');
  }
  if (!tabletInstallScriptText.includes('[switch]$FromLatestArtifact')
      || !tabletInstallScriptText.includes('[switch]$DownloadOnly')
      || !tabletInstallScriptText.includes('gh run download')
      || !tabletInstallScriptText.includes('run-$($artifactRun.Run.databaseId)')
      || !tabletInstallScriptText.includes('[string]$WorkDirectory')
      || !tabletInstallScriptText.includes('IDAI_FIELD_ANDROID_WORKDIR')
      || !tabletInstallScriptText.includes('Resolve-ApkDownloadDirectory')
      || !tabletInstallScriptText.includes('Resolve-PlatformToolsCacheDirectory')) {
    findings.push('tablet APK installer must install or download the newest Mobile GitHub Actions APK artifact for post-change tablet checks');
  }
  if (!tabletInstallShortcutText.includes('-FromLatestArtifact -DownloadPlatformTools')
      || !tabletInstallShortcutText.includes('IDAI_FIELD_ANDROID_WORKDIR')
      || !tabletInstallShortcutText.includes('install-idai-field-android-apk.ps1')
      || !tabletDownloadShortcutText.includes('-FromLatestArtifact -DownloadOnly')
      || !tabletDownloadShortcutText.includes('IDAI_FIELD_ANDROID_WORKDIR')
      || !tabletDownloadShortcutText.includes('install-idai-field-android-apk.ps1')) {
    findings.push('root tablet APK shortcuts must provide double-click install and download-only entry points');
  }
  if (!tabletInstallOtherDriveShortcutText.includes('DEFAULT_WORKDIR=G:\\idai-field-android')
      || !tabletInstallOtherDriveShortcutText.includes('-WorkDirectory "%WORKDIR%"')
      || !tabletInstallOtherDriveShortcutText.includes('-FromLatestArtifact -DownloadPlatformTools')
      || !tabletDownloadOtherDriveShortcutText.includes('DEFAULT_WORKDIR=G:\\idai-field-android')
      || !tabletDownloadOtherDriveShortcutText.includes('-WorkDirectory "%WORKDIR%"')
      || !tabletDownloadOtherDriveShortcutText.includes('-FromLatestArtifact -DownloadOnly')) {
    findings.push('root tablet APK shortcuts must include prompted other-drive entry points for low-C-drive Windows users');
  }
  for (const [label, text] of [
    ['root README', rootReadmeText],
    ['tablet README', tabletReadmeText],
    ['Android tablet install guide', tabletInstallDocText]
  ]) {
    if (!text.includes('-FromLatestArtifact -DownloadPlatformTools')
        || !text.includes('-FromLatestArtifact -DownloadOnly')
        || !text.includes('INSTALL_LATEST_TABLET_APK.cmd')
        || !text.includes('DOWNLOAD_LATEST_TABLET_APK.cmd')
        || !text.includes('-WorkDirectory G:\\idai-field-android')
        || !text.includes('IDAI_FIELD_ANDROID_WORKDIR')) {
      findings.push(`${label} must document both direct latest APK install and download-only tablet handoff commands`);
    }
  }
  if (!rootReadmeText.includes('Field Desktop의 `보고서/HWP 복사` 패널')
      || !rootReadmeText.includes('일반 텍스트 클립보드')) {
    findings.push('root README must explain the tablet-to-Field-Desktop-to-HWP copy flow without making BridgeDesk the primary destination');
  }
  if (!desktopWorkflowText.includes('Run Korean fieldwork parity check')
      || !desktopWorkflowText.includes('tools/korean-fieldwork-*.js')
      || !desktopWorkflowText.includes('docs/korean-fieldwork/**')
      || !desktopWorkflowText.includes('README.md')
      || !desktopWorkflowText.includes('INSTALL_LATEST_TABLET_APK.cmd')
      || !desktopWorkflowText.includes('INSTALL_LATEST_TABLET_APK_TO_OTHER_DRIVE.cmd')
      || !desktopWorkflowText.includes('DOWNLOAD_LATEST_TABLET_APK.cmd')
      || !desktopWorkflowText.includes('DOWNLOAD_LATEST_TABLET_APK_TO_OTHER_DRIVE.cmd')) {
    findings.push('desktop workflow must run parity checks when Korean fieldwork install guides or verifier scripts change');
  }

  return findings;
}

function validateIdentifierRevisionContract() {
  const findings = [];
  const coreText = readTextFile('core/src/tools/korean-fieldwork-identifier-revision.ts');
  const coreSpecText = readTextFile('core/test/tools/korean-fieldwork-identifier-revision.spec.ts');
  const tabletText = readTextFile('mobile/components/Project/korean-fieldwork-identifier-revision.ts');
  const tabletSpecText = readTextFile('mobile/components/Project/korean-fieldwork-identifier-revision.spec.ts');
  const desktopText = readTextFile('desktop/src/app/util/korean-fieldwork-identifier-revision.ts');
  const desktopSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-identifier-revision.spec.ts');

  if (!coreText.includes('KOREAN_FIELDWORK_IDENTIFIER_REVISION_CATEGORIES')
      || !coreText.includes('C.FEATURE_GROUP')
      || !coreText.includes('C.FEATURE')
      || !coreText.includes('C.FEATURE_SEGMENT')
      || !coreText.includes('getKoreanFieldworkIdentifierRevisionUpdates')) {
    findings.push('core identifier revision contract must own report renumbering categories and update logic');
  }
  if (!coreSpecText.includes('FeatureGroup')
      || !coreSpecText.includes('keeps field and report identifiers distinct for HWP numbering')) {
    findings.push('core identifier revision tests must prove FeatureGroup support and field/report identifier separation');
  }
  for (const [label, text] of [
    ['tablet identifier revision wrapper', tabletText],
    ['desktop identifier revision wrapper', desktopText]
  ]) {
    if (!text.includes("from 'idai-field-core'")
        || !text.includes('getKoreanFieldworkIdentifierRevisionUpdates')
        || text.includes('const IDENTIFIER_REVISION_CATEGORIES')) {
      findings.push(`${label} must re-export the shared core identifier revision contract instead of duplicating it`);
    }
  }
  if (!tabletSpecText.includes('C.FEATURE_GROUP')
      || !tabletSpecText.includes(')).toBe(true)')
      || !desktopSpecText.includes('FeatureGroup')
      || !desktopSpecText.includes(')).toBe(true)')) {
    findings.push('tablet and desktop identifier revision tests must agree that FeatureGroup is report-renumberable');
  }

  return findings;
}

function validateConnectedRecordWording() {
  const findings = [];
  const sources = [
    {
      label: 'tablet progress board',
      filePath: 'mobile/components/Project/KoreanFieldworkProgressBoard.tsx'
    },
    {
      label: 'tablet record action panel',
      filePath: 'mobile/components/Project/KoreanFieldworkRecordActionPanel.tsx'
    },
    {
      label: 'tablet project record list',
      filePath: 'mobile/app/(tabs)/ProjectScreen/index.tsx'
    },
    {
      label: 'tablet connected-record board',
      filePath: 'mobile/components/Project/KoreanFieldworkHierarchyBoard.tsx'
    },
    {
      label: 'desktop progress board template',
      filePath: 'desktop/src/app/components/resources/korean-fieldwork-priority-strip.html'
    },
    {
      label: 'desktop record context panel',
      filePath: 'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.component.ts'
    }
  ];
  const deprecatedTerms = ['묶인 기록', '관련 기록'];

  for (const source of sources) {
    const text = readTextFile(source.filePath);

    if (!text.includes('이어진 기록')) {
      findings.push(`${source.label} must describe child/context records as 이어진 기록`);
    }
    for (const term of deprecatedTerms) {
      if (text.includes(term)) {
        findings.push(`${source.label} still uses relationship-heavy wording: ${term}`);
      }
    }
  }

  for (const source of [
    {
      label: 'tablet progress board test',
      filePath: 'mobile/components/Project/KoreanFieldworkProgressBoard.spec.tsx'
    },
    {
      label: 'tablet record action panel test',
      filePath: 'mobile/components/Project/KoreanFieldworkRecordActionPanel.spec.tsx'
    },
    {
      label: 'tablet connected-record board test',
      filePath: 'mobile/components/Project/KoreanFieldworkHierarchyBoard.spec.tsx'
    },
    {
      label: 'desktop record context panel test',
      filePath: 'desktop/test/unit/components/docedit/core/korean-fieldwork-record-context-panel.component.spec.ts'
    }
  ]) {
    if (!readTextFile(source.filePath).includes('이어진 기록')) {
      findings.push(`${source.label} must cover 이어진 기록 wording`);
    }
  }

  return findings;
}

function validateScopeMetricWording() {
  const findings = [];
  const desktopBoundarySummaryText = readTextFile('desktop/src/app/util/korean-fieldwork-boundary-summary.ts');
  const desktopBoundarySummarySpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-boundary-summary.spec.ts'
  );
  const desktopScopeSummaryText = readTextFile('desktop/src/app/util/korean-fieldwork-scope-summary.ts');
  const desktopScopeSummarySpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-scope-summary.spec.ts'
  );
  const desktopOperationWrapSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-operation-wrap.spec.ts'
  );
  const desktopWorkflowText = readTextFile('desktop/src/app/util/korean-fieldwork-workflow.ts');
  const desktopWorkflowSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-workflow.spec.ts');
  const sources = [
    {
      label: 'tablet scope panel',
      filePath: 'mobile/components/Project/KoreanFieldworkScopePanel.tsx'
    },
    {
      label: 'tablet scope panel test',
      filePath: 'mobile/components/Project/KoreanFieldworkScopePanel.spec.tsx'
    },
    {
      label: 'desktop priority strip',
      filePath: 'desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts'
    },
    {
      label: 'desktop priority strip test',
      filePath: 'desktop/test/unit/components/resources/korean-fieldwork-priority-strip.component.spec.ts'
    }
  ];

  for (const source of sources) {
    const text = readTextFile(source.filePath);

    if (!text.includes('현장 기록')) {
      findings.push(`${source.label} must label scope structure counts as 현장 기록`);
    }
    if (text.includes("label: '구조'") || text.includes('구조 ${this.scopeSummary.structureCount}')) {
      findings.push(`${source.label} still exposes scope metric as 구조`);
    }
  }

  if (!desktopScopeSummaryText.includes('조사 구역 확정 필요')) {
    findings.push('desktop scope summary must distinguish boundary summary from confirmed map/import boundary');
  }
  if (!desktopScopeSummaryText.includes('조사 경계 필요')) {
    findings.push('desktop scope summary must ask for survey boundary setup with field wording');
  }
  if (!desktopScopeSummaryText.includes('기준만 있음. GPS 임시 경계, SHP/DXF/GeoJSON, 위성지도 중 하나로 확정하세요.')) {
    findings.push('desktop scope summary must route boundary-summary-only projects back to GPS/file/satellite confirmation');
  }
  if (!desktopScopeSummaryText.includes('GPS 임시 경계, SHP/DXF/GeoJSON, 위성지도 기준으로 확정한 경계가 없습니다.')) {
    findings.push('desktop scope summary must name GPS, file, and satellite boundary sources when no boundary exists');
  }
  if (!desktopScopeSummaryText.includes('legacyRootRecordCount')
      || !desktopScopeSummaryText.includes('getLegacyRootDocumentsForOperation')
      || !desktopScopeSummaryText.includes('부모 없이 떠 있는 기존 기록')) {
    findings.push('desktop scope summary must count parentless legacy records before operation creation');
  }
  if (!desktopScopeSummarySpecText.includes('조사 경계 필요')) {
    findings.push('desktop scope summary test must cover boundary setup before records');
  }
  if (!desktopScopeSummarySpecText.includes('조사 구역 확정 필요')) {
    findings.push('desktop scope summary test must cover boundary-summary-only confirmation state');
  }
  if (!desktopScopeSummarySpecText.includes('legacyRootRecordCount')
      || !desktopOperationWrapSpecText.includes('getLegacyRootDocumentsForOperation')
      || !desktopOperationWrapSpecText.includes('createOperationRelationUpdate')) {
    findings.push('desktop scope tests must cover legacy record wrapping under a new operation');
  }
  if (!desktopBoundarySummaryText.includes('카카오 위성지도 기준')
      || !desktopBoundarySummaryText.includes('SHP 가져오기')
      || !desktopBoundarySummaryText.includes('GPS 임시')) {
    findings.push('desktop boundary summary must expose GPS, import, and Kakao satellite boundary sources');
  }
  if (!desktopBoundarySummarySpecText.includes('카카오 위성지도 기준')
      || !desktopBoundarySummarySpecText.includes('SHP 가져오기 · 가져온 참고자료')
      || !desktopBoundarySummarySpecText.includes('GPS 임시 · GPS 대략')) {
    findings.push('desktop boundary summary test must cover GPS, import, and Kakao satellite labels');
  }
  if (!desktopBoundarySummarySpecText.includes('summarizes tablet GeoJSON boundary imports after sync to desktop')
      || !desktopBoundarySummarySpecText.includes('geoJsonImport')
      || !desktopBoundarySummarySpecText.includes('GeoJSON')) {
    findings.push('desktop boundary summary test must cover tablet GeoJSON imports after sync');
  }
  if (!desktopBoundarySummarySpecText.includes('keeps tablet imported boundary file details visible with the project boundary summary')
      || !desktopBoundarySummarySpecText.includes('boundary.geojson (EPSG:4326, 5점)')
      || !desktopBoundarySummaryText.includes('getBoundaryImportDetailLabel')) {
    findings.push('desktop boundary summary must keep tablet imported file names and coordinate counts visible');
  }
  if (!desktopScopeSummaryText.includes('getKoreanFieldworkBoundarySummaryLabel')
      || !desktopWorkflowText.includes('getKoreanFieldworkBoundarySummaryLabel')) {
    findings.push('desktop scope and workflow summaries must use the shared boundary source label helper');
  }
  if (!desktopScopeSummarySpecText.includes('SHP 가져오기 · 가져온 참고자료')
      || !desktopWorkflowSpecText.includes('카카오 위성지도 기준')) {
    findings.push('desktop scope/workflow tests must prove confirmed boundary source labels are visible');
  }

  return findings;
}

function validateSoilColorReviewWorkflow() {
  const findings = [];
  const reviewStatuses = ['manualRecorded', 'candidatesAvailable', 'reviewed', 'notRun'];
  const panelSources = [
    {
      label: 'tablet soil color panel',
      filePath: 'mobile/components/Project/KoreanFieldworkSoilColorPanel.tsx'
    },
    {
      label: 'desktop soil color panel',
      filePath: 'desktop/src/app/components/docedit/core/korean-fieldwork-soil-color-panel.component.ts'
    }
  ];
  const panelTemplates = [
    {
      label: 'tablet soil color panel template',
      filePath: 'mobile/components/Project/KoreanFieldworkSoilColorPanel.tsx'
    },
    {
      label: 'desktop soil color panel template',
      filePath: 'desktop/src/app/components/docedit/core/korean-fieldwork-soil-color-panel.html'
    }
  ];
  const panelTests = [
    {
      label: 'tablet soil color panel test',
      filePath: 'mobile/components/Project/KoreanFieldworkSoilColorPanel.spec.tsx'
    },
    {
      label: 'desktop soil color panel test',
      filePath: 'desktop/test/unit/components/docedit/core/korean-fieldwork-soil-color-panel.component.spec.ts'
    }
  ];
  const assistGenerators = [
    {
      label: 'tablet soil color assist utility',
      filePath: 'mobile/components/Project/soil-color-photo-assist.ts'
    },
    {
      label: 'desktop soil color assist utility',
      filePath: 'desktop/src/app/util/korean-fieldwork-soil-color-photo-assist.ts'
    }
  ];
  const tabletCameraText = readTextFile('mobile/components/Project/SoilProfileCameraButton.tsx');
  const tabletCameraTestText = readTextFile('mobile/components/Project/SoilProfileCameraButton.spec.ts');
  const desktopCloseoutText = readTextFile('desktop/src/app/util/korean-fieldwork-closeout.ts');
  const desktopCloseoutSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-closeout.spec.ts');
  const tabletCloseoutText = readTextFile('mobile/components/Project/korean-fieldwork-closeout.ts');
  const tabletCloseoutSpecText = readTextFile('mobile/components/Project/korean-fieldwork-closeout.spec.ts');
  const desktopWorkbenchText = readTextFile('desktop/src/app/util/korean-fieldwork-workbench.ts');
  const desktopWorkbenchSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-workbench.spec.ts');
  const desktopCandidateText = readTextFile('desktop/src/app/util/korean-fieldwork-soil-color-candidates.ts');
  const desktopCandidateSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-soil-color-candidates.spec.ts');
  const desktopAssistText = readTextFile('desktop/src/app/util/korean-fieldwork-soil-color-photo-assist.ts');
  const desktopAssistSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-soil-color-photo-assist.spec.ts');
  const sharedSoilColorText = readTextFile('core/src/tools/korean-fieldwork-soil-color.ts');
  const sharedSoilColorSpecText = readTextFile('core/test/tools/korean-fieldwork-soil-color.spec.ts');
  const tabletAssistText = readTextFile('mobile/components/Project/soil-color-photo-assist.ts');
  const desktopEvidenceReviewText = readTextFile('desktop/src/app/util/korean-fieldwork-evidence-review.ts');
  const desktopEvidenceReviewSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-evidence-review.spec.ts');
  const desktopRecordContextPanelText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.component.ts'
  );
  const desktopRecordContextPanelSpecText = readTextFile(
    'desktop/test/unit/components/docedit/core/korean-fieldwork-record-context-panel.component.spec.ts'
  );

  for (const source of panelSources) {
    const text = readTextFile(source.filePath);

    for (const status of reviewStatuses) {
      if (!text.includes(status)) {
        findings.push(`${source.label} missing soil color review status: ${status}`);
      }
    }
    if (!text.includes('soilColorAssistCandidates')) {
      findings.push(`${source.label} must keep photo-derived Munsell candidates editable`);
    }
    if (!text.includes('soilProfileColorSwatches')) {
      findings.push(`${source.label} must store reviewed numbered Munsell swatches`);
    }
    if (!text.includes('appendEmptyNumberedSoilColorRow')
        && !text.includes('appendEmptySoilColorRow')) {
      findings.push(`${source.label} must support adding an empty numbered soil color row`);
    }
  }

  for (const source of panelTemplates) {
    const text = readTextFile(source.filePath);

    if (!text.includes('먼셀값')
        && !text.includes('먼셀 조합')) {
      findings.push(`${source.label} must use Korean Munsell label wording`);
    }
    if (text.includes('Munsell 값')) {
      findings.push(`${source.label} still uses mixed-language Munsell label`);
    }
    if (!text.includes('토색 메모')) {
      findings.push(`${source.label} must expose soil color memo wording`);
    }
    if (!text.includes('사진 판독 후보')
        && !text.includes('사진에서 찍은 토색')) {
      findings.push(`${source.label} must label photo-derived candidates as 사진 판독 후보`);
    }
    if (!text.includes('사진에서 읽은 먼셀 후보')
        && !text.includes('먼셀 후보')) {
      findings.push(`${source.label} must explain photo-derived candidates as Munsell candidates`);
    }
    if (text.includes('보정표')) {
      findings.push(`${source.label} still uses 보정표 instead of 보정판`);
    }
  }

  const tabletSoilColorPanelText = readTextFile('mobile/components/Project/KoreanFieldworkSoilColorPanel.tsx');
  const tabletSoilColorPanelSpecText = readTextFile('mobile/components/Project/KoreanFieldworkSoilColorPanel.spec.tsx');
  if (!tabletSoilColorPanelText.includes('MUNSELL_HUE_OPTIONS')
      || !tabletSoilColorPanelText.includes('MUNSELL_VALUE_OPTIONS')
      || !tabletSoilColorPanelText.includes('MUNSELL_CHROMA_OPTIONS')) {
    findings.push('tablet soil color panel must build Munsell values from hue, value, and chroma controls');
  }
  if (!tabletSoilColorPanelText.includes('soilColorLayerInput_')) {
    findings.push('tablet soil color panel must render one editable input per soil layer');
  }
  if (!tabletSoilColorPanelText.includes('renameSoilColorRowNumber')
      || !tabletSoilColorPanelText.includes('soilColorLayerNumberEdit_')
      || !tabletSoilColorPanelSpecText.includes('edits a soil layer number through a numeric modal')) {
    findings.push('tablet soil color panel must let fieldworkers rename layer numbers');
  }
  if (tabletSoilColorPanelText.includes('soilColorCaptureCondition')
      || tabletSoilColorPanelText.includes('CAPTURE_CONDITION_OPTIONS')) {
    findings.push('tablet soil color panel must keep photo capture-condition fields out of the fast soil color UI');
  }
  const desktopSoilColorPanelText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-soil-color-panel.component.ts'
  );
  const desktopSoilColorPanelTemplateText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-soil-color-panel.html'
  );
  const desktopSoilColorPanelSpecText = readTextFile(
    'desktop/test/unit/components/docedit/core/korean-fieldwork-soil-color-panel.component.spec.ts'
  );
  if (desktopSoilColorPanelText.includes('soilColorCaptureCondition')
      || desktopSoilColorPanelText.includes('captureConditionOptions')
      || desktopSoilColorPanelTemplateText.includes('촬영 조건')
      || desktopSoilColorPanelTemplateText.includes('fields.captureCondition')
      || !desktopSoilColorPanelSpecText.includes("not.toContain('촬영 조건')")) {
    findings.push('desktop soil color panel must keep photo capture-condition fields out of the fast soil color UI');
  }
  if (!desktopSoilColorPanelText.includes('renameSoilColorRowNumber')
      || !desktopSoilColorPanelText.includes('applyActiveSoilColorRowNumber')
      || !desktopSoilColorPanelTemplateText.includes('korean-fieldwork-soil-color-row-number-editor')
      || !desktopSoilColorPanelSpecText.includes('renames the selected numbered Munsell swatch row')
      || !desktopSoilColorPanelSpecText.includes('duplicate layer number is entered')) {
    findings.push('desktop soil color panel must let fieldworkers rename numbered layer color rows');
  }

  for (const source of panelTests) {
    const text = readTextFile(source.filePath);

    for (const status of reviewStatuses) {
      if (!text.includes(status)) {
        findings.push(`${source.label} must cover soil color review status: ${status}`);
      }
    }
    if (!text.includes('soilColorAssistCandidates')) {
      findings.push(`${source.label} must cover editable photo-derived Munsell candidates`);
    }
    if (!text.includes('soilProfileColorSwatches')) {
      findings.push(`${source.label} must cover reviewed numbered Munsell swatches`);
    }
    if (!text.includes('next largest numbered row')
        && !text.includes('next empty numbered swatch row')) {
      findings.push(`${source.label} must cover next-number soil color row insertion`);
    }
  }

  if (!readTextFile(
    'desktop/test/unit/components/docedit/core/korean-fieldwork-soil-color-panel.component.spec.ts'
  ).includes('field-facing soil color labels')) {
    findings.push('desktop soil color panel test must cover field-facing labels');
  }
  if (!desktopSoilColorPanelText.includes('extractMunsellCandidateOptions')
      || desktopSoilColorPanelText.includes('RegExpMatchArray')) {
    findings.push('desktop soil color panel must use shared Munsell candidate parser instead of inline regex');
  }
  if (!desktopSoilColorPanelSpecText.includes('shared Munsell candidate parser')) {
    findings.push('desktop soil color panel test must cover the shared Munsell candidate parser');
  }
  if (!desktopCandidateText.includes('getSoilColorSampleSourceLabel')
      || !desktopCandidateText.includes('SOIL_COLOR_SAMPLE_SOURCE_PATTERN')
      || !desktopCandidateSpecText.includes('tablet eyedropper sample locations')) {
    findings.push('desktop soil color candidate parser must preserve tablet eyedropper sample locations');
  }
  if (!desktopSoilColorPanelText.includes('getAssistSampleSourceLabel')
      || !readTextFile('desktop/src/app/components/docedit/core/korean-fieldwork-soil-color-panel.html')
        .includes('korean-fieldwork-soil-color-sample-source')
      || !desktopSoilColorPanelSpecText.includes('tablet eyedropper sample locations')) {
    findings.push('desktop soil color panel must show tablet eyedropper sample locations next to candidates');
  }
  if (!desktopSoilColorPanelText.includes('getAcceptedAssistCandidateRowValue')
      || !desktopSoilColorPanelText.includes('getSoilColorSampleSuffixFromAssistSource')
      || !desktopSoilColorPanelTemplateText.includes('korean-fieldwork-soil-color-layer-sample-source')
      || !desktopSoilColorPanelSpecText.includes('accepted desktop layer rows')
      || !desktopSoilColorPanelSpecText.includes('keeps accepted eyedropper sample locations')) {
    findings.push('desktop soil color panel must carry tablet eyedropper locations into accepted layer rows and preserve them during review edits');
  }
  if (!desktopSoilColorPanelText.includes('getSoilColorPhotoSampleRows')
      || !desktopSoilColorPanelText.includes('sampleMarkerStyle')
      || !desktopSoilColorPanelTemplateText.includes('korean-fieldwork-soil-color-photo-sample-map')
      || !desktopSoilColorPanelTemplateText.includes('토층 사진 스포이드 위치')
      || !desktopSoilColorPanelSpecText.includes('numbered markers over the desktop soil profile photo')) {
    findings.push('desktop soil color panel must show accepted tablet eyedropper locations as markers over the soil profile photo');
  }
  if (!desktopEvidenceReviewText.includes('sampleSourceLabel')
      || !desktopEvidenceReviewText.includes('document.resource.soilProfileColorSwatches')
      || !desktopEvidenceReviewSpecText.includes('sampleSourceLabel')
      || !desktopEvidenceReviewSpecText.includes('prefers accepted layer sample locations')
      || !desktopRecordContextPanelText.includes('샘플 위치')
      || !desktopRecordContextPanelSpecText.includes('샘플 위치')
      || !desktopRecordContextPanelSpecText.includes('샘플 위치: 1층: RGB')) {
    findings.push('desktop evidence review must carry tablet eyedropper sample locations into review and narrative append text');
  }
  if (!desktopAssistText.includes('createSoilColorAssistUpdatesForImageUploadAtPoint')
      || !desktopAssistText.includes('getPointSampleLabel')
      || !desktopAssistText.includes('사진 선택 지점')
      || !desktopAssistSpecText.includes('selected uploaded image point')
      || !desktopAssistSpecText.includes('사진 선택 지점 20%/50%')
      || !desktopAssistSpecText.includes('사진 선택 지점 80%/50%')) {
    findings.push('desktop soil color photo assist must sample Munsell candidates from selected uploaded image points');
  }
  if (!sharedSoilColorText.includes('MUNSELL_ARCHAEOLOGY_CHIP_DATA')
      || !sharedSoilColorText.includes('deltaE2000')
      || !sharedSoilColorText.includes('CANDIDATE_COUNT = 5')
      || !sharedSoilColorSpecText.includes('expanded Munsell archaeology chip table')
      || !sharedSoilColorSpecText.includes('2.5GY 2.5/10')) {
    findings.push('core soil color engine must keep the expanded Munsell archaeology candidate table and parser covered');
  }
  for (const [label, text] of [
    ['tablet soil color assist utility', tabletAssistText],
    ['desktop soil color assist utility', desktopAssistText]
  ]) {
    if (!text.includes("from 'idai-field-core'")
        || !text.includes('getNearestMunsellCandidates')) {
      findings.push(`${label} must use the shared core soil color candidate engine`);
    }
  }
  if (!desktopCandidateText.includes("from 'idai-field-core'")
      || !desktopCandidateText.includes('extractMunsellCandidateOptions')) {
    findings.push('desktop soil color candidate parser must use the shared core Munsell candidate parser');
  }

  for (const source of assistGenerators) {
    const text = readTextFile(source.filePath);

    if (!text.includes('candidatesAvailable')) {
      findings.push(`${source.label} must leave photo-derived Munsell values as candidates`);
    }
    if (text.includes('reviewed') || text.includes('manualRecorded')) {
      findings.push(`${source.label} must not auto-confirm photo-derived Munsell candidates`);
    }
    if (!text.includes('먼셀값')) {
      findings.push(`${source.label} must use Korean field wording 먼셀값 in user-facing fallback text`);
    }
    if (text.includes('Munsell 값')) {
      findings.push(`${source.label} still uses mixed-language Munsell 값 wording`);
    }
  }

  if (!desktopCloseoutText.includes('사진에서 읽은 먼셀 후보')) {
    findings.push('desktop closeout must explain photo-derived soil color values as 먼셀 후보');
  }
  if (!desktopCloseoutText.includes('먼셀값')) {
    findings.push('desktop closeout must use Korean field wording 먼셀값');
  }
  if (!desktopCloseoutText.includes('getMunsellCandidateSummaryLabel')
      || !desktopCloseoutSpecText.includes('먼셀 후보 10YR 4/3')) {
    findings.push('desktop closeout must carry exact photo-derived Munsell candidate values into review issues');
  }
  if (!desktopWorkbenchText.includes('getMunsellCandidateSummaryLabel')
      || !desktopWorkbenchSpecText.includes('먼셀 후보 10YR 4/3')) {
    findings.push('desktop workbench must show exact photo-derived Munsell candidate values before opening the record');
  }
  if (!desktopCandidateText.includes('extractMunsellCandidateOptions')
      || !desktopCandidateText.includes("from 'idai-field-core'")
      || !desktopCandidateText.includes('먼셀 후보')
      || !desktopCandidateSpecText.includes('GLEY 1 5/N')
      || !desktopCandidateSpecText.includes('2.5GY 2.5/10')) {
    findings.push('desktop Munsell candidate parser must mirror tablet candidate extraction for review surfaces');
  }
  if (desktopCloseoutText.includes('Munsell 값') || desktopCloseoutText.includes('Munsell 후보')) {
    findings.push('desktop closeout still uses mixed-language Munsell wording');
  }

  for (const [label, text] of [
    ['desktop closeout', desktopCloseoutText],
    ['tablet closeout', tabletCloseoutText]
  ]) {
    if (!text.includes('getPhotoAnnotationCloseoutIssues')
        || !text.includes('fieldwork-photo-annotation-review')
        || !text.includes('soil-profile-photo-annotation-review')
        || !text.includes('shortDescription')) {
      findings.push(`${label} must turn tablet photo annotations into closeout review work until they are described`);
    }
  }
  for (const [label, text] of [
    ['desktop closeout test', desktopCloseoutSpecText],
    ['tablet closeout test', tabletCloseoutSpecText]
  ]) {
    if (!text.includes('adds closeout review issues for tablet photo annotations without descriptions')
        || !text.includes('fieldwork-photo-annotation-review')
        || !text.includes('soil-profile-photo-annotation-review')) {
      findings.push(`${label} must cover annotated tablet photos in closeout`);
    }
  }

  if (!tabletCameraText.includes('createSoilColorAssistUpdatesFromPhotoBase64')) {
    findings.push('tablet soil profile camera must request photo-derived Munsell candidate updates');
  }
  if (!tabletCameraTestText.includes('candidatesAvailable')) {
    findings.push('tablet soil profile camera test must keep photo-derived Munsell values as candidates');
  }
  if (tabletCameraText.includes('reviewed') || tabletCameraText.includes('manualRecorded')) {
    findings.push('tablet soil profile camera must not auto-confirm photo-derived Munsell candidates');
  }

  return findings;
}

function validateProgressModeAwareness() {
  const findings = [];
  const tabletSource = 'mobile/components/Project/korean-fieldwork-progress.ts';
  const desktopSource = 'desktop/src/app/util/korean-fieldwork-progress-board.ts';
  const tabletText = readTextFile(tabletSource);
  const desktopText = readTextFile(desktopSource);
  const tabletProgressSpecText = readTextFile('mobile/components/Project/korean-fieldwork-progress.spec.ts');
  const coreRecordContractText = readTextFile('core/src/tools/korean-fieldwork-record-contract.ts');
  const desktopChecklistText = readTextFile('desktop/src/app/util/korean-fieldwork-checklist.ts');
  const desktopChecklistSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-checklist.spec.ts');
  const tabletOverviewText = readTextFile('mobile/components/Project/korean-fieldwork-overview-chart.ts');
  const tabletOverviewSpecText = readTextFile('mobile/components/Project/korean-fieldwork-overview-chart.spec.ts');
  const desktopOverviewText = readTextFile('desktop/src/app/util/korean-fieldwork-overview-chart.ts');
  const desktopOverviewSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-overview-chart.spec.ts');
  const desktopUnitMatrixText = readTextFile('desktop/src/app/util/korean-fieldwork-unit-matrix.ts');
  const desktopProgressSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-progress-board.spec.ts');
  const tabletUnitMatrixText = readTextFile('mobile/components/Project/korean-fieldwork-unit-matrix.ts');
  const tabletUnitMatrixSpecText = readTextFile('mobile/components/Project/korean-fieldwork-unit-matrix.spec.ts');
  const desktopUnitMatrixSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-unit-matrix.spec.ts');
  const tabletWorkbenchText = readTextFile('mobile/components/Project/korean-fieldwork-workbench.ts');
  const tabletWorkbenchPanelText = readTextFile('mobile/components/Project/KoreanFieldworkWorkbenchPanel.tsx');
  const tabletWorkbenchSpecText = readTextFile('mobile/components/Project/korean-fieldwork-workbench.spec.ts');
  const tabletWorkbenchPanelSpecText = readTextFile('mobile/components/Project/KoreanFieldworkWorkbenchPanel.spec.tsx');
  const desktopWorkbenchText = readTextFile('desktop/src/app/util/korean-fieldwork-workbench.ts');
  const desktopWorkbenchSpecText = readTextFile('desktop/test/unit/util/korean-fieldwork-workbench.spec.ts');
  const desktopPriorityStripText = readTextFile('desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts');
  const desktopNotebookDigestText = readTextFile('desktop/src/app/util/korean-fieldwork-notebook-digest.ts');
  const tabletTrialTrenchChecklistValues = [
    'trenchSoilCleaned',
    'trenchFeatureChecked',
    'trenchPitOpened',
    'trenchPitProfileDrawn',
    'trenchOverviewPhotoTaken',
    'trenchObliquePhotoTaken',
    'soilProfilePhotoLinked',
    'inProgressPhotoTaken',
    'penMemoReviewed'
  ];
  const checklistContractText = desktopChecklistText.includes('getSharedKoreanFieldworkChecklistSteps')
    ? coreRecordContractText
    : desktopChecklistText;
  const excavationDetail = '제토 뒤 확인한 유구를 조사 경계 안에 먼저 기록하세요.';
  const excavationAction = '유구 기록';

  if (!tabletText.includes('investigationModeId')) {
    findings.push('tablet progress board does not accept the investigation mode');
  }
  if (!tabletText.includes("investigationModeId === 'excavation'")) {
    findings.push('tablet progress board does not branch excavation progress toward features');
  }
  if (!desktopText.includes('investigationMode')) {
    findings.push('desktop progress board does not accept the investigation mode');
  }
  if (!desktopText.includes("investigationMode === 'excavation'")) {
    findings.push('desktop progress board does not branch excavation progress toward features');
  }

  for (const source of [
    { label: 'tablet', text: tabletText },
    { label: 'desktop', text: desktopText }
  ]) {
    if (!source.text.includes(excavationDetail)) {
      findings.push(`${source.label} progress board missing excavation feature-first detail`);
    }
    if (!source.text.includes(excavationAction)) {
      findings.push(`${source.label} progress board missing excavation feature action`);
    }
  }
  for (const value of tabletTrialTrenchChecklistValues) {
    if (!checklistContractText.includes(`'${value}'`)) {
      findings.push(`desktop checklist utility must count tablet trial-trench step ${value}`);
    }
  }
  if (!desktopText.includes('getKoreanFieldworkChecklistMetrics([document, ...descendants], investigationMode)')) {
    findings.push('desktop progress board must use shared tablet checklist metrics across scoped descendants');
  }
  if (!desktopOverviewText.includes('getKoreanFieldworkChecklistMetrics(documents, investigationMode)')) {
    findings.push('desktop overview chart must use shared tablet checklist metrics');
  }
  if (desktopOverviewText.includes("createSegment('featureGroup'")
      || desktopOverviewText.includes('유구군')
      || !desktopOverviewSpecText.includes("not.toContain('featureGroup')")) {
    findings.push('desktop overview chart must hide legacy FeatureGroup as a top-level chart segment like the tablet chart');
  }
  for (const { label, text } of [
    { label: 'desktop progress board', text: desktopText },
    { label: 'desktop notebook digest', text: desktopNotebookDigestText },
    { label: 'desktop priority strip', text: desktopPriorityStripText }
  ]) {
    if (!text.includes("FeatureGroup: '관련 유구'") || text.includes("FeatureGroup: '유구군'")) {
      findings.push(`${label} must label legacy FeatureGroup records as 관련 유구`);
    }
  }
  for (const source of [
    { label: 'tablet', text: tabletOverviewText, specText: tabletOverviewSpecText },
    { label: 'desktop', text: desktopOverviewText, specText: desktopOverviewSpecText }
  ]) {
    if (!/DIRECT_FIELDWORK_PHOTO_CATEGORIES[\s\S]*C\.FIND[\s\S]*C\.FIND_COLLECTION[\s\S]*C\.SAMPLE/.test(source.text)) {
      findings.push(`${source.label} overview chart must count direct Find/Sample tablet photos as photo evidence`);
    }
    if (!source.specText.includes('photoEvidenceCount).toBe(3)')
        || !source.specText.includes('사진 3 · 도면/메모 2 · 유물/시료 1')) {
      findings.push(`${source.label} overview chart tests must cover direct Find/Sample tablet photos as photo evidence`);
    }
  }
  if (!desktopUnitMatrixText.includes('getKoreanFieldworkChecklistSteps(document.resource.category, investigationMode)')) {
    findings.push('desktop unit matrix must use shared tablet checklist steps');
  }
  if (!tabletWorkbenchText.includes('getKoreanFieldworkChecklistQuickOptions(investigationModeId)')
      || !tabletWorkbenchText.includes('isKoreanFieldworkChecklistRecord(document.resource.category, investigationModeId)')) {
    findings.push('tablet workbench must use investigation-mode checklist steps');
  }
  if (!tabletWorkbenchPanelText.includes('getKoreanFieldworkWorkbenchItems(')
      || !/maxItems,\r?\n      investigationModeId/.test(tabletWorkbenchPanelText)) {
    findings.push('tablet workbench panel must pass the investigation mode into workbench items');
  }
  if (!desktopWorkbenchText.includes('getKoreanFieldworkChecklistSteps(document.resource.category, investigationMode)')
      || !desktopWorkbenchText.includes('countKoreanFieldworkChecklistDone(document, checklistSteps)')) {
    findings.push('desktop workbench must use shared tablet checklist steps');
  }
  if (!desktopPriorityStripText.includes('makeKoreanFieldworkWorkbenchItems(documents, 6, investigationMode)')) {
    findings.push('desktop priority strip must pass the investigation mode into workbench items');
  }
  if (!desktopChecklistSpecText.includes('uses the tablet trial-trench checklist values on desktop')
      || !desktopChecklistSpecText.includes('includes pen memo review in feature checklist totals')) {
    findings.push('desktop checklist tests must cover tablet trial-trench values and PenMemo review totals');
  }
  if (!desktopProgressSpecText.includes('keeps confirmed tablet records in investigation until all workflow steps are checked')) {
    findings.push('desktop progress board tests must keep partial tablet workflow checks out of closeout');
  }
  if (!tabletText.includes("'sketches'")
      || !tabletUnitMatrixText.includes("'sketches'")
      || !desktopText.includes('+ evidenceBundle.penMemos.length')
      || !desktopUnitMatrixText.includes('+ evidenceBundle.penMemos.length')) {
    findings.push('tablet and desktop progress/unit evidence counts must include tablet PenMemo sketch evidence');
  }
  if (!tabletProgressSpecText.includes('counts tablet sketch memos as fieldwork evidence')
      || !tabletUnitMatrixSpecText.includes('counts sketch memos in the feature overview evidence label')
      || !desktopProgressSpecText.includes('counts tablet sketch memos as evidence in desktop progress')
      || !desktopUnitMatrixSpecText.includes('counts tablet sketch memos as feature overview evidence')) {
    findings.push('tablet and desktop progress/unit tests must cover PenMemo sketch evidence counts');
  }
  if (!tabletWorkbenchSpecText.includes('counts pen memo review as a tablet workflow step')
      || !tabletWorkbenchSpecText.includes('uses the investigation mode to surface trial-trench workflow progress')) {
    findings.push('tablet workbench tests must cover PenMemo review and trial-trench progress');
  }
  if (!tabletWorkbenchPanelSpecText.includes('passes the investigation mode into tablet workbench progress')) {
    findings.push('tablet workbench panel tests must prove investigation mode is passed through');
  }
  if (!desktopWorkbenchSpecText.includes('counts PenMemo review as a desktop workflow step')
      || !desktopWorkbenchSpecText.includes('uses the investigation mode to surface trial-trench workflow progress on desktop')) {
    findings.push('desktop workbench tests must cover PenMemo review and trial-trench progress');
  }

  return findings;
}

function validateRecordActionEvidencePriority() {
  const findings = [];
  const desktopSource = 'desktop/src/app/util/korean-fieldwork-record-actions.ts';
  const mobileSource = 'mobile/components/Project/korean-fieldwork-record-actions.ts';
  const desktopScopeSource = 'desktop/src/app/util/korean-fieldwork-scope-summary.ts';
  const desktopRecordContextSource = 'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.component.ts';
  const desktopRecordContextTemplate = 'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.html';
  const desktopRecordContextSpec = 'desktop/test/unit/components/docedit/core/korean-fieldwork-record-context-panel.component.spec.ts';
  const desktopRecordEvidenceSource = 'desktop/src/app/util/korean-fieldwork-record-evidence.ts';
  const desktopRecordEvidenceSpec = 'desktop/test/unit/util/korean-fieldwork-record-evidence.spec.ts';
  const desktopDocumentDraftSource = 'desktop/src/app/util/korean-fieldwork-document-drafts.ts';
  const desktopDocumentDraftSpec = 'desktop/test/unit/util/korean-fieldwork-document-drafts.spec.ts';
  const mobileDraftContinuationSource = 'mobile/components/Project/korean-fieldwork-draft-continuation.ts';
  const mobileDraftContinuationSpec = 'mobile/components/Project/korean-fieldwork-draft-continuation.spec.ts';
  const desktopCategories = extractStringCollectionInOrder(
    desktopSource,
    'PREFERRED_EVIDENCE_CATEGORIES'
  );
  const mobileChipIds = extractStringCollectionInOrder(
    mobileSource,
    'PREFERRED_EVIDENCE_ACTION_IDS'
  );
  const desktopScopeEvidenceCategories = extractStringCollectionInOrder(
    desktopScopeSource,
    'EVIDENCE_CATEGORIES'
  );
  const desktopChipIds = desktopCategories.map(mapEvidenceCategoryToChipId);
  const expectedChipIds = ['soilProfilePhotos', 'photos', 'drawings', 'finds', 'samples'];
  const desktopRecordContextText = readTextFile(desktopRecordContextSource);
  const desktopRecordContextTemplateText = readTextFile(desktopRecordContextTemplate);
  const desktopRecordContextStyleText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.scss'
  );
  const desktopRecordContextSpecText = readTextFile(desktopRecordContextSpec);
  const desktopRecordEvidenceText = readTextFile(desktopRecordEvidenceSource);
  const desktopRecordEvidenceSpecText = readTextFile(desktopRecordEvidenceSpec);
  const coreRecordContractText = readTextFile('core/src/tools/korean-fieldwork-record-contract.ts');
  const coreRecordContractSpecText = readTextFile(
    'core/test/tools/korean-fieldwork-record-contract.spec.ts'
  );
  const coreReadinessText = readTextFile('core/src/tools/korean-fieldwork-readiness.ts');
  const coreReadinessSpecText = readTextFile('core/test/tools/korean-fieldwork-readiness.spec.ts');
  const desktopRecordWorkFilterText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-record-work-filters.ts'
  );
  const desktopRecordWorkFilterSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-record-work-filters.spec.ts'
  );
  const mobileRecordWorkFilterText = readTextFile(
    'mobile/components/Project/korean-fieldwork-record-work-filters.ts'
  );
  const mobileRecordWorkFilterSpecText = readTextFile(
    'mobile/components/Project/korean-fieldwork-record-work-filters.spec.ts'
  );
  const desktopNotebookDigestText = readTextFile(
    'desktop/src/app/util/korean-fieldwork-notebook-digest.ts'
  );
  const desktopNotebookDigestSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-notebook-digest.spec.ts'
  );
  const desktopDocumentDraftText = readTextFile(desktopDocumentDraftSource);
  const desktopDocumentDraftSpecText = readTextFile(desktopDocumentDraftSpec);
  const coreDocumentDraftText = readTextFile('core/src/tools/korean-fieldwork-document-drafts.ts');
  const mobileDraftContinuationText = readTextFile(mobileDraftContinuationSource);
  const mobileDraftContinuationSpecText = readTextFile(mobileDraftContinuationSpec);
  const mobileRecordEvidenceText = readTextFile(
    'mobile/components/Project/korean-fieldwork-record-evidence.ts'
  );
  const mobileRecordEvidenceSpecText = readTextFile(
    'mobile/components/Project/korean-fieldwork-record-evidence.spec.ts'
  );
  const mobileFieldNotesText = readTextFile(
    'mobile/components/Project/korean-fieldwork-field-notes.ts'
  );
  const mobileFieldNotesSpecText = readTextFile(
    'mobile/components/Project/korean-fieldwork-field-notes.spec.ts'
  );
  const mobileFieldNotePanelText = readTextFile(
    'mobile/components/Project/KoreanFieldworkFieldNotePanel.tsx'
  );
  const mobileFieldNotePanelSpecText = readTextFile(
    'mobile/components/Project/KoreanFieldworkFieldNotePanel.spec.tsx'
  );
  const mobileRecordActionText = readTextFile(mobileSource);
  const mobileRecordActionSpecText = readTextFile(
    'mobile/components/Project/korean-fieldwork-record-actions.spec.ts'
  );
  const mobileRecordContextText = readTextFile(
    'mobile/components/Project/KoreanFieldworkRecordContextPanel.tsx'
  );
  const desktopRecordActionText = readTextFile(desktopSource);
  const desktopRecordActionSpecText = readTextFile(
    'desktop/test/unit/util/korean-fieldwork-record-actions.spec.ts'
  );
  const evidenceMetricLabels = [
    '피트',
    '토색 메모',
    '사진',
    '토층사진',
    '도면',
    '약도·스케치',
    '야장 메모',
    '스케치 메모',
    '유물',
    '시료'
  ];

  if (!coreRecordContractText.includes('KOREAN_FIELDWORK_CATEGORIES')
      || !coreRecordContractText.includes('KOREAN_FIELDWORK_EVIDENCE_DEFINITIONS')
      || !coreRecordContractText.includes("id: 'featureSegments'")
      || !coreRecordContractText.includes("id: 'sketches'")
      || !coreRecordContractText.includes('KOREAN_FIELDWORK_REPORT_HANDOFF_CATEGORY_RANK')
      || !coreRecordContractSpecText.includes('Korean fieldwork record contract')) {
    findings.push('core record contract must define shared categories, labels, report ranks, and evidence chips');
  }
  for (const [label, text] of [
    ['tablet record evidence source', mobileRecordEvidenceText],
    ['desktop record evidence source', desktopRecordEvidenceText]
  ]) {
    if (!text.includes("from 'idai-field-core'")
        || !text.includes('getKoreanFieldworkEvidenceChips')
        || !text.includes('KoreanFieldworkEvidenceChip')) {
      findings.push(`${label} must re-export the shared core evidence-chip contract`);
    }
  }
  for (const [label, text] of [
    ['core record contract', coreRecordContractText],
    ['core record contract test', coreRecordContractSpecText],
    ['tablet record evidence test', mobileRecordEvidenceSpecText],
    ['desktop record evidence test', desktopRecordEvidenceSpecText],
    ['tablet record actions', mobileRecordActionText],
    ['tablet record context panel', mobileRecordContextText]
  ]) {
    if (text.includes("'pits'") || text.includes('"pits"')) {
      findings.push(`${label} must use featureSegments instead of the old tablet-only pits id`);
    }
  }

  if (desktopCategories.includes('PenMemo')) {
    findings.push('desktop missing-evidence priority must not treat PenMemo as evidence');
  }
  if (desktopScopeEvidenceCategories.includes('PenMemo')) {
    findings.push('desktop scope evidence count must not treat PenMemo as core evidence');
  }

  if (JSON.stringify(desktopChipIds) !== JSON.stringify(expectedChipIds)) {
    findings.push(
      `desktop missing-evidence priority mismatch: ${desktopChipIds.join(',')}`
    );
  }

  if (JSON.stringify(mobileChipIds) !== JSON.stringify(expectedChipIds)) {
    findings.push(
      `tablet missing-evidence priority mismatch: ${mobileChipIds.join(',')}`
    );
  }
  if (!mobileRecordActionText.includes('OPEN_EVIDENCE_ACTION_IDS')
      || !mobileRecordActionText.includes("'sketches'")
      || !mobileRecordActionSpecText.includes('counts and opens existing sketch memo evidence')) {
    findings.push('tablet record actions must count existing PenMemo sketches and offer them as openable evidence');
  }
  if (!desktopRecordActionText.includes('makeKoreanFieldworkEvidenceReview')) {
    findings.push('desktop record actions must use expanded evidence review issues, including tablet PenMemo transcription backlog');
  }
  if (!desktopRecordActionText.includes('OPEN_EVIDENCE_CATEGORIES')
      || !desktopRecordActionText.includes("'PenMemo'")
      || !desktopRecordActionText.includes('getOpenEvidenceAction(linkedDocuments)')
      || !desktopRecordActionSpecText.includes('opens existing tablet evidence records before neutral follow-up drafts')) {
    findings.push('desktop record actions must expose existing tablet evidence records as openable actions');
  }
  if (!desktopRecordActionText.includes('FEATURE_LOCATION_SKETCH_FIELD')
      || !desktopRecordActionText.includes('current-feature-location-sketch')
      || !desktopRecordActionText.includes('hasGeometryCoordinates')
      || !desktopRecordActionText.includes('위성지도나 평면도처럼 조사 경계 위에 얹은 유구 위치와 형태')
      || desktopRecordActionText.includes('태블릿 평면지도 위치 스케치')
      || !desktopRecordActionSpecText.includes('flat-map feature sketch after tablet placement exists')
      || !desktopRecordActionSpecText.includes('flat-map feature sketch after desktop geometry exists')
      || !desktopRecordActionSpecText.includes('map-first boundary placement')) {
    findings.push('desktop record actions must surface missing tablet flat-map feature placement');
  }
  if (!desktopRecordActionSpecText.includes('tablet handwriting PenMemo transcription')
      || !desktopRecordActionSpecText.includes('스케치 메모 1획/1점')
      || !desktopRecordActionSpecText.includes('pen-memo-handwriting-transcription')) {
    findings.push('desktop record actions test must cover tablet handwriting PenMemo transcription backlog');
  }
  if (!desktopRecordContextSpecText.includes('openable record action')
      || !desktopRecordContextSpecText.includes('스케치 메모 1획/1점')
      || !desktopRecordContextSpecText.includes('pen-memo-handwriting-transcription')) {
    findings.push('desktop record context panel test must prove tablet PenMemo backlog is an openable action');
  }
  const desktopContextActionRailIndex = desktopRecordContextTemplateText.indexOf('primary-action-rail');
  const desktopContextFeatureSketchIndex =
    desktopRecordContextTemplateText.indexOf('korean-fieldwork-record-context-feature-sketch');
  const desktopContextEvidenceIndex =
    desktopRecordContextTemplateText.indexOf('korean-fieldwork-record-context-evidence');
  if (!desktopRecordContextTemplateText.includes('class="korean-fieldwork-record-context-actions primary-action-rail"')
      || !desktopRecordContextTemplateText.includes('class="korean-fieldwork-record-context-actions empty primary-action-rail"')
      || !desktopRecordContextStyleText.includes('.korean-fieldwork-record-context-actions.primary-action-rail')
      || !desktopRecordContextStyleText.includes('background: #f7fbf8;')
      || !desktopRecordContextSpecText.includes('first context rail before review sections')
      || desktopContextActionRailIndex < 0
      || desktopContextActionRailIndex > desktopContextFeatureSketchIndex
      || desktopContextActionRailIndex > desktopContextEvidenceIndex) {
    findings.push('desktop record context panel must surface immediate record actions before review sections');
  }

  if (!desktopRecordContextText.includes('getKoreanFieldworkEvidenceChips')
      || !desktopRecordEvidenceText.includes('KoreanFieldworkEvidenceChip')) {
    findings.push('desktop record context panel must reuse shared record evidence chips');
  }
  if (!desktopRecordWorkFilterText.includes('getKoreanFieldworkEvidenceChips(document, allDocuments)')
      || desktopRecordWorkFilterText.includes('buildEvidenceBundle')) {
    findings.push('desktop record work missing-evidence filter must reuse shared tablet evidence chips');
  }
  if (!desktopRecordWorkFilterSpecText.includes('uses shared evidence chips for missing-evidence decisions')) {
    findings.push('desktop record work filter tests must cover shared evidence-chip missing-evidence decisions');
  }
  for (const [label, text] of [
    ['tablet record work filter', mobileRecordWorkFilterText],
    ['desktop record work filter', desktopRecordWorkFilterText],
    ['tablet field notes', mobileFieldNotesText],
    ['desktop daily notebook digest', desktopNotebookDigestText]
  ]) {
    if (!text.includes('KOREAN_FIELDWORK_TIME_ZONE_OFFSET_MINUTES')
        || !text.includes('getUTCFullYear')) {
      findings.push(`${label} must use the fixed Korean fieldwork date instead of the device-local date`);
    }
  }
  if (!mobileRecordWorkFilterSpecText.includes('uses the Korean fieldwork date for tablet today filtering')
      || !desktopRecordWorkFilterSpecText.includes('uses the Korean fieldwork date for desktop today filtering')
      || !mobileFieldNotesSpecText.includes('uses the Korean fieldwork date for tablet memos and daily logs')
      || !desktopNotebookDigestSpecText.includes('uses the Korean fieldwork date for desktop daily notebook digests')) {
    findings.push('tablet and desktop date tests must cover Korean fieldwork dates outside the device timezone');
  }
  if (!desktopRecordContextTemplateText.includes('자료 확인')) {
    findings.push('desktop record context panel must render evidence metric heading');
  }
  for (const label of evidenceMetricLabels) {
    if (!coreRecordContractText.includes(label)
        && !desktopRecordContextText.includes(label)
        && !desktopRecordEvidenceSpecText.includes(label)
        && !desktopRecordContextSpecText.includes(label)) {
      findings.push(`desktop record context evidence metric missing label: ${label}`);
    }
  }
  if (!desktopRecordEvidenceSpecText.includes('summarizes field evidence attached to a feature record')
      || !desktopRecordEvidenceSpecText.includes('keeps non-structural evidence records compact')) {
    findings.push('desktop record evidence tests must mirror tablet evidence-chip coverage');
  }
  if (!coreRecordContractText.includes('KOREAN_FIELDWORK_PHOTO_ATTACHMENT_TARGET_CATEGORIES')
      || !coreRecordContractText.includes('FIND_COLLECTION')
      || !coreRecordContractText.includes('SAMPLE')) {
    findings.push('core record evidence chips must expose direct photos on Find/FindCollection/Sample records');
  }
  if (!mobileRecordEvidenceSpecText.includes('keeps direct tablet photos visible on find, find collection, and sample records')
      || !desktopRecordEvidenceSpecText.includes('keeps direct tablet photos visible on find, find collection, and sample records')
      || !desktopRecordContextSpecText.includes('shows direct tablet photos on desktop find records')) {
    findings.push('tablet and desktop record evidence tests must cover direct tablet photos on Find/Sample records');
  }
  if (!mobileRecordEvidenceSpecText.includes('find collection')
      || !mobileRecordEvidenceSpecText.includes('fieldworkPhotoUri: \'file:///tablet/photos/find-collection-1.jpg\'')
      || !desktopRecordEvidenceSpecText.includes('find collection')
      || !desktopRecordEvidenceSpecText.includes('fieldworkPhotoUri: \'file:///tablet/photos/find-collection-1.jpg\'')) {
    findings.push('tablet and desktop record evidence tests must cover direct tablet photos on FindCollection records');
  }
  if (!coreReadinessText.includes("filterByCategory(relatedDocuments, 'Find')")
      || !coreReadinessText.includes("filterByCategory(relatedDocuments, 'FindCollection')")
      || !coreReadinessSpecText.includes("find-collection-1', 'FindCollection'")
      || !coreReadinessSpecText.includes("['find-1', 'find-collection-1']")
      || !mobileRecordEvidenceSpecText.includes("documentIds: ['find-collection-1']")
      || !desktopRecordEvidenceSpecText.includes("documentIds: ['find-collection-1']")) {
    findings.push('core, tablet, and desktop evidence bundles must count linked FindCollection records as find evidence');
  }
  if (!coreRecordContractText.includes("id: 'sketches'")
      || !coreRecordContractText.includes("bundleKey: 'penMemos'")
      || !coreRecordContractText.includes('PEN_MEMO')) {
    findings.push('core record contract must expose PenMemo as a visible sketch evidence chip');
  }
  for (const [label, text] of [
    ['tablet record evidence test', mobileRecordEvidenceSpecText],
    ['desktop record evidence test', desktopRecordEvidenceSpecText]
  ]) {
    if (!text.includes("id: 'sketches'")
        || !text.includes('약도·스케치')
        || (!text.includes('PenMemo') && !text.includes('C.PEN_MEMO'))) {
      findings.push(`${label} must cover the visible sketch evidence chip`);
    }
  }
  if (!mobileFieldNotesText.includes("'sketches'")
      || !mobileFieldNotesText.includes('약도·스케치')
      || !mobileFieldNotesText.includes('/스케치|약도|손그림|약측|그림/')
      || !mobileFieldNotesSpecText.includes("'sketches'")
      || !mobileFieldNotePanelText.includes("case 'sketches'")
      || !mobileFieldNotePanelSpecText.includes('fieldNoteFollowUpAction_sketches')) {
    findings.push('tablet field notes must make sketches a first-class follow-up evidence action');
  }
  if (mobileFieldNotesText.includes('pattern: /사진|촬영|전경|세부|보강/')) {
    findings.push('tablet field note photo follow-up must not treat generic 보강 as photo evidence');
  }
  for (const categoryToken of ['FEATURE', 'FEATURE_SEGMENT']) {
    if (!new RegExp(
      `\\[C\\.${categoryToken}\\]: \\[[\\s\\S]*?C\\.DRAWING,[\\s\\S]*?C\\.PEN_MEMO,[\\s\\S]*?C\\.FIND`
    ).test(coreDocumentDraftText)
        || !desktopDocumentDraftText.includes('getCoreKoreanFieldworkContinuationActions')) {
      findings.push(`core/desktop continuation priority must keep PenMemo before finds/samples for ${categoryToken}`);
    }
    if (!new RegExp(
      `\\[C\\.${categoryToken}\\]: \\[[\\s\\S]*?C\\.DRAWING,[\\s\\S]*?C\\.PEN_MEMO,[\\s\\S]*?C\\.FIND`
    ).test(mobileDraftContinuationText)) {
      findings.push(`tablet continuation priority must keep PenMemo before finds/samples for ${categoryToken}`);
    }
  }
  if (!desktopDocumentDraftSpecText.includes('keeps sketch memos visible before finds and samples')) {
    findings.push('desktop document draft tests must prove sketch memos remain visible before finds and samples');
  }
  if (!mobileDraftContinuationSpecText.includes('prefers sketch memos before finds and samples')) {
    findings.push('tablet draft continuation tests must prove sketch memos are preferred before finds and samples');
  }
  for (const label of ['토색 메모', '사진', '피트', '야장 메모', '스케치 메모']) {
    if (!desktopRecordContextSpecText.includes(label)) {
      findings.push(`desktop record context test must cover evidence metric: ${label}`);
    }
  }

  return findings;
}

function validateRecordEmptyStateGuidance() {
  const findings = [];
  const tabletText = readTextFile('mobile/components/Project/korean-fieldwork-record-list-empty-state.ts');
  const tabletRecordActionText = readTextFile('mobile/components/Project/KoreanFieldworkRecordActionPanel.tsx');
  const desktopText = readTextFile('desktop/src/app/components/resources/korean-fieldwork-priority-strip.component.ts');
  const desktopTemplateText = readTextFile('desktop/src/app/components/resources/korean-fieldwork-priority-strip.html');
  const desktopRecordContextText = readTextFile(
    'desktop/src/app/components/docedit/core/korean-fieldwork-record-context-panel.html'
  );
  const emptyRecordActionDetail = '현재 기록에서 바로 이어갈 필수 작업은 없습니다.';

  for (const title of [
    '아직 기록이 없습니다',
    '검색 결과가 없습니다',
    '선택한 조건에 맞는 기록이 없습니다',
    '표시할 기록이 없습니다'
  ]) {
    if (!tabletText.includes(title)) {
      findings.push(`tablet record list empty-state title missing: ${title}`);
    }
  }

  for (const title of [
    '확인 필요 기록이 없습니다',
    '조사 중 기록이 없습니다',
    '자료 보강 대상이 없습니다',
    '오늘 작성 기록이 없습니다',
    '표시할 기록 작업이 없습니다'
  ]) {
    if (!desktopText.includes(title)) {
      findings.push(`desktop record work empty-state title missing: ${title}`);
    }
  }

  if (!desktopTemplateText.includes('getFilteredRecordWorkEmptyState().detail')) {
    findings.push('desktop record work empty state must render a detail message');
  }

  if (!tabletRecordActionText.includes(emptyRecordActionDetail)) {
    findings.push('tablet record action panel missing no-immediate-action guidance');
  }
  if (!desktopRecordContextText.includes(emptyRecordActionDetail)) {
    findings.push('desktop record context panel missing no-immediate-action guidance');
  }

  return findings;
}

function mapEvidenceCategoryToChipId(categoryName) {
  switch (categoryName) {
    case 'Photo':
      return 'photos';
    case 'SoilProfilePhoto':
      return 'soilProfilePhotos';
    case 'Drawing':
      return 'drawings';
    case 'Find':
      return 'finds';
    case 'Sample':
      return 'samples';
    default:
      return categoryName;
  }
}

function compareStringSets(leftValues, rightValues, leftMissingMessage, rightMissingMessage) {
  const findings = [];

  for (const value of rightValues) {
    if (!leftValues.includes(value)) {
      findings.push(`${leftMissingMessage}: ${value}`);
    }
  }
  for (const value of leftValues) {
    if (!rightValues.includes(value)) {
      findings.push(`${rightMissingMessage}: ${value}`);
    }
  }

  return findings;
}

function collectGuidedFeatureAttributeFieldValues() {
  const result = {};

  for (const source of [
    extractTabletFeatureAttributes(),
    extractDesktopFeatureAttributes()
  ]) {
    for (const featureFields of Object.values(source)) {
      for (const [fieldName, valueIds] of Object.entries(featureFields)) {
        result[fieldName] = sortUnique([
          ...(result[fieldName] || []),
          ...valueIds
        ]);
      }
    }
  }

  return result;
}

function extractFeatureTypeOptions(filePath, arrayName, interpretationPropertyName) {
  const text = readTextFile(filePath);
  const result = {};

  for (const objectText of extractTopLevelArrayObjects(text, arrayName)) {
    const featureType = extractStringProperty(objectText, 'featureType')
      || extractStringProperty(objectText, 'value');

    if (!featureType) continue;

    result[featureType] = {
      interpretationValue: extractStringProperty(
        objectText,
        interpretationPropertyName
      )
    };
  }

  return result;
}

function extractTabletFeatureAttributes() {
  const text = readTextFile(
    'mobile/components/Project/korean-fieldwork-feature-attributes.ts'
  );
  const result = {};
  const typePattern = /^  ([A-Za-z0-9_]+): \[([\s\S]*?)^  \],?/gm;
  let typeMatch;

  while ((typeMatch = typePattern.exec(text)) !== null) {
    result[typeMatch[1]] = extractFieldValueGroups(typeMatch[2], 'options');
  }

  return result;
}

function extractTabletFeatureAttributeLabels() {
  const text = readTextFile(
    'mobile/components/Project/korean-fieldwork-feature-attributes.ts'
  );
  const result = {};
  const typePattern = /^  ([A-Za-z0-9_]+): \[([\s\S]*?)^  \],?/gm;
  let typeMatch;

  while ((typeMatch = typePattern.exec(text)) !== null) {
    result[typeMatch[1]] = extractFieldValueLabels(typeMatch[2]);
  }

  return result;
}

function extractDesktopFeatureAttributes() {
  const text = readTextFile(
    'desktop/src/app/util/korean-fieldwork-feature-guidance.ts'
  );
  const result = {};

  for (const objectText of extractTopLevelArrayObjects(
    text,
    'KOREAN_FIELDWORK_FEATURE_GUIDANCE_PRESETS'
  )) {
    const featureType = extractStringProperty(objectText, 'featureType');
    if (!featureType) continue;

    result[featureType] = extractFieldValueGroups(objectText, 'valueIds');
  }

  return result;
}

function extractGuidedFeatureConfigLabels() {
  const config = readJsonFile('core/config/Config-KoreanFieldwork.json');
  const koreanLabels = readJsonFile('core/config/Library/Valuelists/Language.projects.ko.json');
  const valuelistByField = config.forms?.['Feature:default']?.valuelists ?? {};
  const fieldValues = collectGuidedFeatureAttributeFieldValues();
  const result = {};

  for (const fieldName of Object.keys(fieldValues)) {
    const valuelistId = valuelistByField[fieldName];
    const values = koreanLabels[valuelistId]?.values ?? {};

    result[fieldName] = {};
    for (const valueId of fieldValues[fieldName]) {
      if (values[valueId]?.label) {
        result[fieldName][valueId] = values[valueId].label;
      }
    }
  }

  return result;
}

function extractFieldValueGroups(text, valuesPropertyName) {
  const result = {};
  const pattern = new RegExp(
    `fieldName: '([^']+)'[\\s\\S]*?${valuesPropertyName}: \\[([\\s\\S]*?)\\n\\s*\\]`,
    'g'
  );
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const valuePattern = valuesPropertyName === 'options'
      ? /value: '([^']+)'/g
      : /'([^']+)'/g;

    result[match[1]] = sortUnique(
      Array.from(match[2].matchAll(valuePattern))
        .map((valueMatch) => valueMatch[1])
    );
  }

  return result;
}

function extractFieldValueLabels(text) {
  const result = {};
  const pattern = new RegExp(
    `fieldName: '([^']+)'[\\s\\S]*?options: \\[([\\s\\S]*?)\\n\\s*\\]`,
    'g'
  );
  let match;

  while ((match = pattern.exec(text)) !== null) {
    result[match[1]] = {};

    for (const optionMatch of match[2].matchAll(/value: '([^']+)', label: '([^']+)'/g)) {
      result[match[1]][optionMatch[1]] = optionMatch[2];
    }
  }

  return result;
}

function areCompatibleKoreanFieldworkDisplayLabels(tabletLabel, configLabel) {
  const normalizedTabletLabel = normalizeKoreanFieldworkDisplayLabel(tabletLabel);
  const normalizedConfigLabel = normalizeKoreanFieldworkDisplayLabel(configLabel);

  return normalizedTabletLabel === normalizedConfigLabel
    || normalizedConfigLabel.startsWith(normalizedTabletLabel);
}

function normalizeKoreanFieldworkDisplayLabel(label) {
  return label
    .replace(/\s+/g, '')
    .replace(/(기록|확인|조사|주의)$/, '');
}

function extractTopLevelArrayObjects(text, arrayName) {
  const markerIndex = text.indexOf(arrayName);
  if (markerIndex === -1) return [];

  const assignmentIndex = text.indexOf('=', markerIndex);
  if (assignmentIndex === -1) return [];

  const arrayStart = text.indexOf('[', assignmentIndex);
  if (arrayStart === -1) return [];

  const objects = [];
  let braceDepth = 0;
  let objectStart = -1;
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let index = arrayStart + 1; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      inString = true;
      quote = char;
      continue;
    }

    if (char === '{') {
      if (braceDepth === 0) objectStart = index;
      braceDepth += 1;
    } else if (char === '}') {
      braceDepth -= 1;
      if (braceDepth === 0 && objectStart >= 0) {
        objects.push(text.slice(objectStart, index + 1));
      }
    } else if (char === ']' && braceDepth === 0) {
      break;
    }
  }

  return objects;
}

function extractStringCollection(filePath, markerName) {
  const text = readTextFile(filePath);
  const markerIndex = text.indexOf(markerName);
  if (markerIndex === -1) return [];

  const arrayStart = text.indexOf('[', markerIndex);
  if (arrayStart === -1) return [];

  const arrayEnd = findMatchingSquareBracket(text, arrayStart);
  if (arrayEnd === -1) return [];

  return sortUnique(
    Array.from(text.slice(arrayStart + 1, arrayEnd).matchAll(/'([^']+)'/g))
      .map((match) => match[1])
  );
}

function extractStringCollectionInOrder(filePath, markerName) {
  const text = readTextFile(filePath);
  const markerIndex = text.indexOf(markerName);
  if (markerIndex === -1) return [];

  const arrayStart = text.indexOf('[', markerIndex);
  if (arrayStart === -1) return [];

  const arrayEnd = findMatchingSquareBracket(text, arrayStart);
  if (arrayEnd === -1) return [];

  return Array.from(text.slice(arrayStart + 1, arrayEnd).matchAll(/'([^']+)'/g))
    .map((match) => match[1]);
}

function findMatchingSquareBracket(text, startIndex) {
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      inString = true;
      quote = char;
      continue;
    }

    if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function extractStringProperty(text, propertyName) {
  const pattern = new RegExp(`${propertyName}: '([^']+)'`);
  return text.match(pattern)?.[1];
}

function readTextFile(filePath) {
  return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

function readJsonFile(filePath) {
  return JSON.parse(readTextFile(filePath));
}

function sortUnique(values) {
  return Array.from(new Set(values)).sort();
}

function printReport(
  missingRows,
  missingCoverageRows,
  untrackedFiles,
  unstagedFiles,
  investigationModeFindings,
  guidedFindings,
  guidedFeatureConfigFindings,
  projectStartSequenceFindings,
  projectSettingsFindings,
  projectInvestigationModeWordingFindings,
  priorityTaskFindings,
  rawFormFindings,
  reportHandoffFindings,
  tabletInstallGuideFindings,
  identifierRevisionFindings,
  recordPanelOrderFindings,
  connectedRecordWordingFindings,
  scopeMetricWordingFindings,
  soilColorReviewFindings,
  progressModeFindings,
  recordActionFindings,
  recordEmptyStateFindings,
  verificationCoverageFindings,
  sourceInventoryFindings,
  supportInventoryFindings
) {
  console.log('Korean fieldwork desktop-tablet parity check');
  console.log('');
  console.log('Feature rows:');

  for (const row of featureRows) {
    const hasIssue = missingRows.some((candidate) => candidate.row.id === row.id);
    console.log(`- ${hasIssue ? 'MISSING' : 'OK'} ${row.id}: ${row.title}`);
  }

  console.log('');

  if (missingRows.length === 0) {
    console.log('No missing counterpart files were found.');
  } else {
    console.log('Missing counterpart files:');
    for (const entry of missingRows) {
      for (const filePath of entry.missingTablet) {
        console.log(`- tablet missing for ${entry.row.id}: ${filePath}`);
      }
      for (const filePath of entry.missingDesktop) {
        console.log(`- desktop missing for ${entry.row.id}: ${filePath}`);
      }
    }
  }

  console.log('');

  if (missingCoverageRows.length === 0) {
    console.log('Every feature row has tablet and desktop test coverage files.');
  } else {
    console.log('Missing feature-row test coverage files:');
    for (const entry of missingCoverageRows) {
      for (const filePath of entry.missingTabletTests) {
        console.log(`- tablet test missing for ${entry.row.id}: ${filePath}`);
      }
      for (const filePath of entry.missingDesktopTests) {
        console.log(`- desktop test missing for ${entry.row.id}: ${filePath}`);
      }
    }
  }

  console.log('');

  if (sourceInventoryFindings.length === 0) {
    console.log('Every Korean fieldwork source file is assigned to a feature row or support inventory.');
  } else {
    console.log('Korean fieldwork source files need feature-row or support classification:');
    for (const filePath of sourceInventoryFindings) {
      console.log(`- ${filePath}`);
    }
  }

  console.log('');

  if (supportInventoryFindings.length === 0) {
    console.log('Every support inventory entry has a reason and an existing source file.');
  } else {
    console.log('Support inventory classification issues:');
    for (const finding of supportInventoryFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (verificationCoverageFindings.length === 0) {
    console.log('The default Korean fieldwork verifier includes every feature-row coverage test.');
  } else {
    console.log('Korean fieldwork verifier coverage gaps:');
    for (const finding of verificationCoverageFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (investigationModeFindings.length === 0) {
    console.log('No investigation mode definition mismatches were found.');
  } else {
    console.log('Investigation mode definition mismatches:');
    for (const finding of investigationModeFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (guidedFindings.length === 0) {
    console.log('No guided feature definition mismatches were found.');
  } else {
    console.log('Guided feature definition mismatches:');
    for (const finding of guidedFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (guidedFeatureConfigFindings.length === 0) {
    console.log('No guided feature configuration or valuelist gaps were found.');
  } else {
    console.log('Guided feature configuration or valuelist gaps:');
    for (const finding of guidedFeatureConfigFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (projectStartSequenceFindings.length === 0) {
    console.log('No project start-sequence gaps were found.');
  } else {
    console.log('Project start-sequence gaps:');
    for (const finding of projectStartSequenceFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (projectSettingsFindings.length === 0) {
    console.log('No project settings completeness gaps were found.');
  } else {
    console.log('Project settings completeness gaps:');
    for (const finding of projectSettingsFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (projectInvestigationModeWordingFindings.length === 0) {
    console.log('No project investigation-mode wording gaps were found.');
  } else {
    console.log('Project investigation-mode wording gaps:');
    for (const finding of projectInvestigationModeWordingFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (priorityTaskFindings.length === 0) {
    console.log('No shared priority task id gaps were found.');
  } else {
    console.log('Shared priority task id gaps:');
    for (const finding of priorityTaskFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (rawFormFindings.length === 0) {
    console.log('No raw-form hiding rule gaps were found.');
  } else {
    console.log('Raw-form hiding rule gaps:');
    for (const finding of rawFormFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (reportHandoffFindings.length === 0) {
    console.log('No report handoff pre-save validation gaps were found.');
  } else {
    console.log('Report handoff pre-save validation gaps:');
    for (const finding of reportHandoffFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (tabletInstallGuideFindings.length === 0) {
    console.log('No tablet install guide gaps were found.');
  } else {
    console.log('Tablet install guide gaps:');
    for (const finding of tabletInstallGuideFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (identifierRevisionFindings.length === 0) {
    console.log('No identifier revision contract gaps were found.');
  } else {
    console.log('Identifier revision contract gaps:');
    for (const finding of identifierRevisionFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (recordPanelOrderFindings.length === 0) {
    console.log('No record panel order gaps were found.');
  } else {
    console.log('Record panel order gaps:');
    for (const finding of recordPanelOrderFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (connectedRecordWordingFindings.length === 0) {
    console.log('No connected-record wording gaps were found.');
  } else {
    console.log('Connected-record wording gaps:');
    for (const finding of connectedRecordWordingFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (scopeMetricWordingFindings.length === 0) {
    console.log('No scope metric wording gaps were found.');
  } else {
    console.log('Scope metric wording gaps:');
    for (const finding of scopeMetricWordingFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (soilColorReviewFindings.length === 0) {
    console.log('No soil-color review workflow gaps were found.');
  } else {
    console.log('Soil-color review workflow gaps:');
    for (const finding of soilColorReviewFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (progressModeFindings.length === 0) {
    console.log('No progress mode-awareness gaps were found.');
  } else {
    console.log('Progress mode-awareness gaps:');
    for (const finding of progressModeFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (recordActionFindings.length === 0) {
    console.log('No record action evidence-priority gaps were found.');
  } else {
    console.log('Record action evidence-priority gaps:');
    for (const finding of recordActionFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (recordEmptyStateFindings.length === 0) {
    console.log('No record empty-state guidance gaps were found.');
  } else {
    console.log('Record empty-state guidance gaps:');
    for (const finding of recordEmptyStateFindings) {
      console.log(`- ${finding}`);
    }
  }

  console.log('');

  if (untrackedFiles.length === 0) {
    console.log('No release-critical untracked files were found.');
  } else {
    console.log('Release-critical files are untracked:');
    for (const filePath of untrackedFiles) {
      console.log(`- ${filePath}`);
    }
  }

  console.log('');

  if (unstagedFiles.length === 0) {
    console.log('No release-critical unstaged changes were found.');
  } else {
    console.log('Release-critical files have unstaged changes:');
    for (const filePath of unstagedFiles) {
      console.log(`- ${filePath}`);
    }
  }

  if (
    reportOnly
    && (
      missingRows.length > 0
      || missingCoverageRows.length > 0
      || untrackedFiles.length > 0
      || unstagedFiles.length > 0
      || investigationModeFindings.length > 0
      || guidedFindings.length > 0
      || guidedFeatureConfigFindings.length > 0
      || projectStartSequenceFindings.length > 0
      || projectSettingsFindings.length > 0
      || projectInvestigationModeWordingFindings.length > 0
      || priorityTaskFindings.length > 0
      || rawFormFindings.length > 0
      || recordPanelOrderFindings.length > 0
      || identifierRevisionFindings.length > 0
      || connectedRecordWordingFindings.length > 0
      || scopeMetricWordingFindings.length > 0
      || soilColorReviewFindings.length > 0
      || progressModeFindings.length > 0
      || recordActionFindings.length > 0
      || recordEmptyStateFindings.length > 0
      || verificationCoverageFindings.length > 0
      || sourceInventoryFindings.length > 0
      || supportInventoryFindings.length > 0
    )
  ) {
    console.log('');
    console.log('Report-only mode: findings were reported without failing the command.');
  }
}
