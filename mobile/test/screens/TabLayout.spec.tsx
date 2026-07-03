import { render } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import TabLayout from '../../app/(tabs)/_layout';

const mockUsePreferences = jest.fn();
const mockTabScreens: Record<string, any>[] = [];

jest.mock('@/hooks/use-preferences', () => ({
  __esModule: true,
  default: () => mockUsePreferences(),
  getDefaultPreferences: () => ({
    currentProject: '',
    languages: ['ko'],
    mapProviderSettings: {
      kakaoLocalRestApiKey: '',
      kakaoMapJavaScriptKey: '',
      kakaoNativeAppKey: '',
    },
    projects: {},
    recentProjects: [],
    username: '',
  }),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Tabs = ({ children }: { children: React.ReactNode }) => {
    React.Children.forEach(children, (child: React.ReactNode) => {
      const candidate = child as { props?: Record<string, unknown> } | undefined;
      if (candidate?.props?.name) {
        mockTabScreens.push(candidate.props);
      }
    });

    return <View testID="tabs-root" />;
  };
  Tabs.Screen = () => null;

  return {
    router: {
      replace: jest.fn(),
    },
    Tabs,
  };
});

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/contexts/labels/LabelsContextProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/common/Toast/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/common/Toast/Toast', () => ({
  Toast: () => {
    const React = require('react');
    const { Text } = require('react-native');

    return <Text>toast</Text>;
  },
}));

describe('TabLayout record tab guard', () => {
  const alertSpy = jest.spyOn(Alert, 'alert')
    .mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockTabScreens.length = 0;
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it('blocks the record tab and explains that a project must be opened first', () => {
    mockUsePreferences.mockReturnValue(createPreferences({
      currentProject: '',
      projects: {},
    }));

    render(<TabLayout />);
    const event = { preventDefault: jest.fn() };
    getProjectScreen().listeners.tabPress(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      '프로젝트가 필요합니다',
      '기록을 시작하려면 먼저 새 프로젝트를 만들거나 기존 프로젝트를 열어주세요.',
      [{ text: '확인' }]
    );
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('opens the field board overview when the current project exists', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    mockUsePreferences.mockReturnValue(createPreferences({
      currentProject: 'fieldwork-1',
      projects: {
        'fieldwork-1': {
          connected: false,
          mapSettings: {},
          password: '',
          url: '',
        },
      },
    }));

    render(<TabLayout />);
    const event = { preventDefault: jest.fn() };
    getProjectScreen().listeners.tabPress(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/ProjectScreen',
      params: { fieldBoardReset: '1700000000000' },
    });
    nowSpy.mockRestore();
  });
});

const getProjectScreen = () => {
  const screen = mockTabScreens.find((candidate) =>
    candidate.name === 'ProjectScreen'
  );
  if (!screen) throw new Error('ProjectScreen tab was not rendered.');

  return screen as {
    listeners: {
      tabPress: (event: { preventDefault: () => void }) => void;
    };
  };
};

const createPreferences = ({
  currentProject,
  projects,
}: {
  currentProject: string;
  projects: Record<string, unknown>;
}) => ({
  preferences: {
    currentProject,
    languages: ['ko'],
    mapProviderSettings: {
      kakaoLocalRestApiKey: '',
      kakaoMapJavaScriptKey: '',
      kakaoNativeAppKey: '',
    },
    projects,
    recentProjects: [],
    username: 'tester',
  },
  getMapSettings: jest.fn(),
  removeProject: jest.fn(),
  setCurrentProject: jest.fn(),
  setLanguages: jest.fn(),
  setMapProviderSettings: jest.fn(),
  setMapSettings: jest.fn(),
  setProjectSettings: jest.fn(),
  setUsername: jest.fn(),
});
