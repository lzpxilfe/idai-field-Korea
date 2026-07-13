import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SyncStatus } from 'idai-field-core';
import React, { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PreferencesContext } from '@/contexts/preferences-context';
import { normalizeProjectSettings } from '@/models/project-settings';
import SyncSettingsButton from './SyncSettingsButton';
import {
  getKoreanFieldworkDesktopHandoffState,
  KoreanFieldworkDesktopHandoffState,
} from './korean-fieldwork-desktop-handoff-state';

interface KoreanFieldworkDesktopHandoffPanelProps {
  projectId: string;
  status?: SyncStatus;
}

const KoreanFieldworkDesktopHandoffPanel: React.FC<
  KoreanFieldworkDesktopHandoffPanelProps
> = ({ projectId, status = SyncStatus.Offline }) => {
  const preferences = useContext(PreferencesContext);
  const projectSettings = normalizeProjectSettings(
    preferences.preferences.projects[projectId]
  );
  const state = getKoreanFieldworkDesktopHandoffState(
    status,
    projectSettings.connected
  );

  return (
    <View
      style={[styles.panel, getPanelToneStyle(state.tone)]}
      testID="desktop-handoff-panel"
    >
      <View style={[styles.iconWrap, getIconWrapToneStyle(state.tone)]}>
        <MaterialCommunityIcons
          name={state.icon}
          size={22}
          color={getIconColor(state.tone)}
        />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.eyebrow}>사무실 인계</Text>
        <Text style={styles.statusLabel}>{state.label}</Text>
        <Text style={styles.detail}>{state.detail}</Text>
        <Text style={styles.connectionLine} numberOfLines={1}>
          프로젝트 {projectId}
          {projectSettings.connected && projectSettings.url
            ? ` · ${projectSettings.url}`
            : ''}
        </Text>
      </View>
      <SyncSettingsButton
        status={status}
        title={projectSettings.connected ? '연결 설정' : '데스크톱 연결'}
        variant={projectSettings.connected ? 'transparent' : 'secondary'}
        style={styles.settingsButton}
      />
    </View>
  );
};

const getIconColor = (tone: KoreanFieldworkDesktopHandoffState['tone']) => {
  switch (tone) {
    case 'active':
      return '#175cd3';
    case 'success':
      return '#15703d';
    case 'warning':
      return '#9a3412';
    default:
      return '#475467';
  }
};

const getPanelToneStyle = (
  tone: KoreanFieldworkDesktopHandoffState['tone']
) => {
  switch (tone) {
    case 'active':
      return styles.activePanel;
    case 'success':
      return styles.successPanel;
    case 'warning':
      return styles.warningPanel;
    default:
      return styles.neutralPanel;
  }
};

const getIconWrapToneStyle = (
  tone: KoreanFieldworkDesktopHandoffState['tone']
) => {
  switch (tone) {
    case 'active':
      return styles.activeIconWrap;
    case 'success':
      return styles.successIconWrap;
    case 'warning':
      return styles.warningIconWrap;
    default:
      return styles.neutralIconWrap;
  }
};

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#d0d5dd',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 104,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  neutralPanel: {
    backgroundColor: '#ffffff',
  },
  activePanel: {
    backgroundColor: '#f5f9ff',
  },
  successPanel: {
    backgroundColor: '#f3faf5',
  },
  warningPanel: {
    backgroundColor: '#fff8f1',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 6,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  neutralIconWrap: {
    backgroundColor: '#eef2f6',
  },
  activeIconWrap: {
    backgroundColor: '#e8f1ff',
  },
  successIconWrap: {
    backgroundColor: '#dff3e5',
  },
  warningIconWrap: {
    backgroundColor: '#ffead5',
  },
  textWrap: {
    flex: 1,
    marginHorizontal: 12,
    minWidth: 0,
  },
  eyebrow: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '800',
  },
  statusLabel: {
    color: '#1d2939',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  detail: {
    color: '#475467',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  connectionLine: {
    color: '#667085',
    fontSize: 11,
    marginTop: 3,
  },
  settingsButton: {
    minWidth: 104,
  },
});

export default KoreanFieldworkDesktopHandoffPanel;
