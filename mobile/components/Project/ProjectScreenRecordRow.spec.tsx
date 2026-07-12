import { fireEvent, render } from '@testing-library/react-native';
import {
  createCategory,
  Document,
  ProjectConfiguration,
} from 'idai-field-core';
import React from 'react';
import { RecordRow } from '@/app/(tabs)/ProjectScreen';
import { ConfigurationContext } from '@/contexts/configuration-context';
import { KOREAN_FIELDWORK_CATEGORIES } from './korean-fieldwork-categories';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    MaterialIcons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock('@/components/common/CategoryIcon', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    __esModule: true,
    default: () => <Text>category-icon</Text>,
  };
});

jest.mock('@/contexts/preferences-context', () => {
  const React = require('react');

  return {
    PreferencesContext: React.createContext({
      preferences: {
        currentProject: 'test-project',
        projects: {},
      },
    }),
  };
});

jest.mock('@/contexts/project-context', () => {
  const React = require('react');

  return {
    ProjectContext: React.createContext({}),
  };
});

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), push: jest.fn() },
  useGlobalSearchParams: () => ({}),
}));

describe('ProjectScreen RecordRow', () => {
  it('restores pit-line drawing inside an expanded feature row', () => {
    const onUpdateResourceFields = jest.fn();
    const feature = createFeature();
    const { getByTestId } = render(
      <ConfigurationContext.Provider value={createConfiguration()}>
        <RecordRow
          categoryLabel="유구"
          contextPath={undefined}
          document={feature}
          documents={[feature]}
          isDeleting={false}
          issueCount={0}
          onAddChild={jest.fn()}
          onAddEvidence={jest.fn()}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
          onOpen={jest.fn()}
          onOpenEvidence={jest.fn()}
          onUpdateResourceFields={onUpdateResourceFields}
          selected={true}
        />
      </ConfigurationContext.Provider>
    );

    const canvas = getByTestId('featurePitLineCanvas');
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 64, locationY: 66 },
    });
    fireEvent(canvas, 'responderGrant', {
      nativeEvent: { locationX: 250, locationY: 170 },
    });

    expect(onUpdateResourceFields).toHaveBeenCalledWith(expect.objectContaining({
      featureSoilPitLines: expect.stringContaining('soil-pit-line-1'),
    }));
  });
});

const createFeature = (): Document => ({
  _id: 'feature-1',
  resource: {
    id: 'feature-1',
    identifier: '1호 유구',
    category: KOREAN_FIELDWORK_CATEGORIES.FEATURE,
    relations: { isRecordedIn: ['operation-1'] },
    featureLocationSketch: JSON.stringify({
      center: { x: 50, y: 50 },
      points: [
        { x: 20, y: 20 },
        { x: 80, y: 20 },
        { x: 80, y: 80 },
        { x: 20, y: 80 },
      ],
      rotation: 0,
      scale: 100,
      shape: 'polygon',
      version: 2,
    }),
  },
  created: { user: 'tester', date: new Date(0) },
  modified: [],
});

const createConfiguration = (): ProjectConfiguration =>
  new ProjectConfiguration({
    categories: {},
    commonFields: {},
    forms: [createCategory(KOREAN_FIELDWORK_CATEGORIES.FEATURE)],
    projectLanguages: [],
    relations: [],
    valuelists: {},
  });
