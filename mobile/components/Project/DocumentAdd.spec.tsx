import {
  cleanup,
  fireEvent,
  render,
  RenderAPI,
  waitFor,
} from '@testing-library/react-native';
import {
  CategoryForm,
  createCategory,
  Document,
  Forest,
  IdGenerator,
  Labels,
  NewDocument,
  PouchdbDatastore,
  ProjectConfiguration,
} from 'idai-field-core';
import PouchDB from 'pouchdb-node';
import React from 'react';
import { t2 } from '@/test_data/test_docs/t2';
import { si1 } from '@/test_data/test_docs/si1';
import { ConfigurationContext } from '@/contexts/configuration-context';
import LabelsContext from '@/contexts/labels/labels-context';
import { PreferencesContext } from '@/contexts/preferences-context';
import { ProjectContext } from '@/contexts/project-context';
import { Preferences } from '@/models/preferences';
import { DocumentRepository } from '@/repositories/document-repository';
import loadConfiguration from '@/services/config/load-configuration';
import { ToastProvider } from '@/components/common/Toast/ToastProvider';
import DocumentAdd from '@/app/(tabs)/ProjectScreen/DocumentAdd';
import { defaultMapSettings } from '@/components/Project/Map/map-settings';

const category = 'Pottery';

const mockNavigate = jest.fn();
const mockUseGlobalSearchParams = jest.fn();
const setCurrentProject = jest.fn();
const setUsername = jest.fn();
const setProjectSettings = jest.fn();
const setLanguages = jest.fn();
const removeProject = jest.fn();
const setMapSettings = jest.fn();
const getMapSettings = jest.fn();
const setMapProviderSettings = jest.fn();
const mockShowToast = jest.fn();

jest.mock('@/repositories/document-repository');
jest.mock('@/hooks/use-pouchdb-datastore', () => ({
  __esModule: true,
  default: jest.fn(),
  destroyPouchDbDatastore: jest.fn(),
}));
jest.mock('@/contexts/project-context', () => {
  const React = require('react');
  return { ProjectContext: React.createContext(null) };
});
jest.mock('@/hooks/use-toast', () => ({
  __esModule: true,
  default: () => ({ showToast: mockShowToast }),
}));
jest.mock('dateformat', () => jest.fn(() => '2026-01-01'));
jest.mock('expo-barcode-scanner');
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockWebView = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      postMessage: jest.fn(),
    }));

    return <View {...props} />;
  });
  MockWebView.displayName = 'MockWebView';

  return { WebView: MockWebView };
});
jest.mock('expo-router', () => ({
  router: { navigate: (...args: any[]) => mockNavigate(...args) },
  useGlobalSearchParams: () => mockUseGlobalSearchParams(),
}));

describe('DocumentAdd', () => {
  let project: string;
  let preferences: Preferences;
  let repository: DocumentRepository;
  let config: ProjectConfiguration;
  let pouchdbDatastore: PouchdbDatastore;
  let renderAPI: RenderAPI;
  const observationDescription = 'This is a test document';

  beforeEach(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    project = createTestProjectName('document-add');
    preferences = createPreferences(project);
    mockUseGlobalSearchParams.mockReturnValue({
      parentDocId: t2.resource.id,
      categoryName: category,
    });

    pouchdbDatastore = new PouchdbDatastore(
      (name: string) => new PouchDB(name),
      new IdGenerator()
    );
    await pouchdbDatastore.createDb(
      project,
      {
        _id: 'project',
        resource: {
          id: 'project',
          identifier: 'project',
          category: 'Project',
          relations: {},
        },
        created: { user: 'test', date: new Date(0) },
        modified: [],
      },
      undefined,
      true
    );
    const categories: Forest<CategoryForm> = [
      createCategory('Feature'),
      createCategory(category),
    ];
    repository = await DocumentRepository.init(
      'testuser',
      createProjectConfiguration(categories),
      pouchdbDatastore
    );

    config = await loadConfiguration(
      pouchdbDatastore,
      project,
      preferences.languages,
      preferences.username
    );
    renderAPI = render(
      <ToastProvider>
        <PreferencesContext.Provider
          value={{
            preferences,
            setCurrentProject,
            setUsername,
            setProjectSettings,
            setLanguages,
            removeProject,
            setMapSettings,
            getMapSettings,
            setMapProviderSettings,
          }}
        >
          <LabelsContext.Provider value={{ labels: new Labels(() => ['en']) }}>
            <ConfigurationContext.Provider value={config}>
              <ProjectContext.Provider value={{ repository } as any}>
                <DocumentAdd />
              </ProjectContext.Provider>
            </ConfigurationContext.Provider>
          </LabelsContext.Provider>
        </PreferencesContext.Provider>
      </ToastProvider>
    );
  });

  afterEach(async () => {
    await pouchdbDatastore?.getDb()?.close?.();
    if (pouchdbDatastore && project) await pouchdbDatastore.destroyDb(project);
    cleanup();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockNavigate.mockClear();
    mockShowToast.mockClear();
    mockUseGlobalSearchParams.mockReset();
  });

  it('should render component correctly', async () => {
    await waitFor(() => renderAPI.getByTestId('documentForm'));

    expect(renderAPI.queryByTestId('documentForm')).toBeTruthy();
  });

  it('shows the Korean fieldwork draft context above the add form', async () => {
    await waitFor(() => renderAPI.getByTestId('documentForm'));

    expect(renderAPI.queryByTestId('koreanFieldworkDraftContextPanel'))
      .toBeTruthy();
  });

  it('does not show assist panels above detailed form fields', async () => {
    await waitFor(() => renderAPI.getByTestId('documentForm'));

    expect(renderAPI.queryByTestId('koreanFieldworkDraftPresetPanel')).toBeNull();
    expect(renderAPI.queryByTestId('koreanFieldworkNarrativeAssistPanel')).toBeNull();
    expect(renderAPI.queryByTestId('koreanFieldworkDraftContinuationPanel')).toBeNull();
    expect(renderAPI.queryByText('기록 템플릿')).toBeNull();
    expect(renderAPI.queryByText('서술 보조')).toBeNull();
    expect(renderAPI.queryByText('저장 후 이어가기')).toBeNull();
  });

  it('keeps compatibility fields out of a fresh fieldwork draft', async () => {
    await waitFor(() => renderAPI.getByTestId('documentForm'));

    expect(renderAPI.queryByTestId('fullFormCollapsedSummary')).toBeNull();
    expect(renderAPI.queryByTestId('fullFormToggle')).toBeNull();
    expect(renderAPI.queryByText('가져온 기존 항목')).toBeNull();
    expect(renderAPI.queryByText(
      '새 유구 기록은 위의 시대/시기·유구 성격·유구별 핵심 속성·야장 메모만 입력하면 충분합니다. 이 영역은 이전 양식에서 가져온 값이 있을 때만 확인합니다.'
    ))
      .toBeNull();
    expect(renderAPI.queryByText(/기존 항목 \d+개 확인 중/)).toBeNull();
    expect(renderAPI.queryByTestId('groupSelect_stem')).toBeNull();
  });

  it('should create a new Document with entered values and correctly set relations field', async () => {
    const { getByTestId } = renderAPI;

    await waitFor(() => getByTestId('documentForm'));

    fireEvent.changeText(
      getByTestId('quickRecordInput_description'),
      observationDescription
    );
    fireEvent.press(getByTestId('saveDocBtn'));

    await waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
    expect(repository.create).toHaveBeenCalledWith({
      resource: expect.objectContaining({
        identifier: 'pottery-1700000000000',
        description: observationDescription,
        category,
      }),
    } as NewDocument);
  });

  it.each([
    ['Find', 'T2 유물 1'],
    ['Sample', 'T2 시료 1'],
  ])('saves a %s field record from the tablet add flow', async (
    categoryName,
    expectedIdentifier
  ) => {
    cleanup();
    mockUseGlobalSearchParams.mockReturnValue({
      parentDocId: t2.resource.id,
      categoryName,
      returnTo: 'fieldBoard',
    });
    renderAPI = renderDocumentAddScreen(
      preferences,
      createProjectConfiguration([createCategory(categoryName)]),
      repository,
      [t2]
    );

    await waitFor(() => renderAPI.getByTestId('documentForm'));
    fireEvent.press(renderAPI.getByTestId('saveDocBtn'));

    await waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
    expect(repository.create).toHaveBeenCalledWith({
      resource: expect.objectContaining({
        category: categoryName,
        identifier: expectedIdentifier,
      }),
    } as NewDocument);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/ProjectScreen'));
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does not run two creates when the tablet save button is tapped twice', async () => {
    await waitFor(() => renderAPI.getByTestId('documentForm'));

    fireEvent.press(renderAPI.getByTestId('saveDocBtn'));
    fireEvent.press(renderAPI.getByTestId('saveDocBtn'));

    await waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
  });

  it('shows the datastore error when creating a field record fails', async () => {
    (repository.create as jest.Mock).mockRejectedValueOnce([
      'GENERIC_ERROR',
      new Error('disk full'),
    ]);
    await waitFor(() => renderAPI.getByTestId('documentForm'));

    fireEvent.press(renderAPI.getByTestId('saveDocBtn'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('GENERIC_ERROR / disk full')
    ));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps entered draft values when live documents change', async () => {
    cleanup();
    renderAPI = renderDocumentAddScreen(preferences, config, repository, [t2]);

    await waitFor(() => renderAPI.getByTestId('documentForm'));
    fireEvent.changeText(
      renderAPI.getByTestId('quickRecordInput_description'),
      observationDescription
    );

    renderAPI.rerender(getDocumentAddScreen(
      preferences,
      config,
      repository,
      [
        t2,
        {
          ...t2,
          resource: {
            ...t2.resource,
            id: 'remote-change',
            identifier: 'remote-change',
          },
        },
      ]
    ));

    expect(renderAPI.getByTestId('quickRecordInput_description').props.value)
      .toBe(observationDescription);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should navigate back to DocumentsMap after object hast been created', async () => {
    const { getByTestId } = renderAPI;
    const highlightedDocId = 'id'; //see mock of DocumentRepository class

    await waitFor(() => getByTestId('documentForm'));

    fireEvent.changeText(
      getByTestId('quickRecordInput_description'),
      observationDescription
    );
    fireEvent.press(getByTestId('saveDocBtn'));

    await waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/ProjectScreen/DocumentsMap',
      params: { highlightedDocId },
    });
  });

  it('does not interrupt ordinary record creation with a success toast', async () => {
    const { getByTestId } = renderAPI;

    await waitFor(() => getByTestId('documentForm'));

    fireEvent.changeText(
      getByTestId('quickRecordInput_description'),
      observationDescription
    );
    fireEvent.press(getByTestId('saveDocBtn'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('adds a drawing sketch canvas to new drawing records', async () => {
    cleanup();
    mockUseGlobalSearchParams.mockReturnValue({
      parentDocId: t2.resource.id,
      categoryName: 'Drawing',
    });
    renderAPI = renderDocumentAddScreen(preferences, config, repository);

    await waitFor(() => renderAPI.getByTestId('koreanFieldworkFreeDrawingPanel'));
    drawStroke(renderAPI);
    fireEvent.press(renderAPI.getByTestId('saveDocBtn'));

    await waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
    expect(repository.create).toHaveBeenCalledWith({
      resource: expect.objectContaining({
        category: 'Drawing',
        drawingSketchStrokes: expect.stringContaining('"strokes"'),
        drawingSketchUpdatedAt: expect.any(String),
      }),
    } as NewDocument);
  });

  it('keeps a new pen memo intact while editing its parent Feature sketch', async () => {
    cleanup();
    const latestFeature = {
      ...si1,
      resource: {
        ...si1.resource,
        description: '데스크톱에서 나중에 저장한 설명',
        period: { value: 'joseon' },
      },
    } as Document;
    jest.spyOn(repository, 'get').mockImplementation(async (resourceId: string) =>
      resourceId === si1.resource.id ? latestFeature : t2);
    mockUseGlobalSearchParams.mockReturnValue({
      parentDocId: si1.resource.id,
      categoryName: 'PenMemo',
    });
    renderAPI = renderDocumentAddScreen(
      preferences,
      createProjectConfiguration([createCategory('PenMemo')]),
      repository,
      [si1]
    );

    await waitFor(() => renderAPI.getByTestId('koreanFieldworkFreeDrawingPanel'));
    expect(renderAPI.getByTestId('featureSketchReferencePanel')).toBeTruthy();
    expect(renderAPI.queryByTestId('fieldworkFreeDrawingFullscreenCanvas')).toBeNull();
    expect(renderAPI.queryByTestId('groupSelect_koreanFieldwork')).toBeNull();
    fireEvent.press(renderAPI.getByTestId('fieldworkFreeDrawingFullscreen'));
    fireEvent(
      renderAPI.getByTestId('fieldworkFreeDrawingFullscreenCanvas'),
      'message',
      {
        nativeEvent: {
          data: JSON.stringify({
            payload: [{
              points: [
                { x: 1000, y: 1000 },
                { x: 3000, y: 3000 },
              ],
              tool: 'pen',
              width: 5,
            }],
            type: 'strokes',
          }),
        },
      }
    );
    fireEvent.press(renderAPI.getByTestId('fieldworkFreeDrawingFullscreenClose'));
    fireEvent.press(renderAPI.getByTestId('featureShapeSketchPreview'));
    fireEvent.press(renderAPI.getByTestId('featureShapeSketchPreview'));
    const featureSketchCanvas = await waitFor(() =>
      renderAPI.getByTestId('featureParentSketchFullscreenCanvas'));
    fireEvent(featureSketchCanvas, 'message', {
      nativeEvent: {
        data: JSON.stringify({
          payload: [{
            color: '#dc2626',
            points: [
              { x: 2500, y: 2500 },
              { x: 7500, y: 7500 },
            ],
            tool: 'pen',
            width: 5,
          }],
          type: 'strokes',
        }),
      },
    });
    fireEvent.press(
      renderAPI.getByTestId('featureParentSketchFullscreenClose')
    );
    await waitFor(() => expect(repository.update).toHaveBeenCalledTimes(1));
    fireEvent.press(renderAPI.getByTestId('saveDocBtn'));

    await waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
    expect(repository.update).toHaveBeenCalledWith(expect.objectContaining({
      resource: expect.objectContaining({
        id: si1.resource.id,
        category: 'Feature',
        featureFreeDrawingStrokes: expect.stringContaining('"strokes"'),
      }),
    }));
    const updatedFeature = (repository.update as jest.Mock).mock.calls[0][0];
    expect(updatedFeature.resource.featureLocationSketch)
      .toBe(si1.resource.featureLocationSketch);
    expect(updatedFeature.resource.description)
      .toBe('데스크톱에서 나중에 저장한 설명');
    expect(updatedFeature.resource.period).toEqual({ value: 'joseon' });
    expect(repository.create).toHaveBeenCalledWith({
      resource: expect.objectContaining({
        category: 'PenMemo',
        penMemoStrokes: expect.stringContaining('"strokes"'),
      }),
    } as NewDocument);
  });

  it('keeps tablet draft saves quiet even when later HWP handoff will need review', async () => {
    cleanup();
    mockUseGlobalSearchParams.mockReturnValue({
      parentDocId: t2.resource.id,
      categoryName: 'Photo',
    });
    renderAPI = renderDocumentAddScreen(preferences, config, repository);

    await waitFor(() => renderAPI.getByTestId('documentForm'));
    fireEvent.press(renderAPI.getByTestId('saveDocBtn'));

    await waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

const renderDocumentAddScreen = (
  preferences: Preferences,
  config: ProjectConfiguration,
  repository: DocumentRepository,
  documents?: any[]
): RenderAPI => render(getDocumentAddScreen(preferences, config, repository, documents));

const getDocumentAddScreen = (
  preferences: Preferences,
  config: ProjectConfiguration,
  repository: DocumentRepository,
  documents?: any[]
) => (
  <ToastProvider>
    <PreferencesContext.Provider
      value={{
        preferences,
        setCurrentProject,
        setUsername,
        setProjectSettings,
        setLanguages,
        removeProject,
        setMapSettings,
        getMapSettings,
        setMapProviderSettings,
      }}
    >
      <LabelsContext.Provider value={{ labels: new Labels(() => ['en']) }}>
        <ConfigurationContext.Provider value={config}>
          <ProjectContext.Provider value={{ repository, documents } as any}>
            <DocumentAdd />
          </ProjectContext.Provider>
        </ConfigurationContext.Provider>
      </LabelsContext.Provider>
    </PreferencesContext.Provider>
  </ToastProvider>
);

const drawStroke = (renderAPI: RenderAPI) => {
  const canvas = renderAPI.getByTestId('fieldworkFreeDrawingCanvas');
  fireEvent(canvas, 'responderGrant', {
    nativeEvent: { locationX: 32, locationY: 28 },
  });
  fireEvent(canvas, 'responderMove', {
    nativeEvent: { locationX: 160, locationY: 140 },
  });
  fireEvent(canvas, 'responderRelease', {
    nativeEvent: { locationX: 160, locationY: 140 },
  });
};

const createProjectConfiguration = (
  forms: Forest<CategoryForm>
): ProjectConfiguration =>
  new ProjectConfiguration({
    forms,
    categories: {},
    relations: [],
    commonFields: {},
    valuelists: {},
    projectLanguages: [],
  });

const createPreferences = (project: string): Preferences => ({
  username: 'testUser',
  currentProject: project,
  languages: ['en'],
  recentProjects: [project],
  mapProviderSettings: {
    kakaoLocalRestApiKey: '',
    kakaoMapJavaScriptKey: '',
    kakaoNativeAppKey: '',
  },
  projects: {
    [project]: {
      url: '',
      password: '',
      connected: true,
      mapSettings: defaultMapSettings(),
    },
  },
});

const createTestProjectName = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2)}`;
