import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SyncStatus } from 'idai-field-core';
import React, { useCallback, useContext, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { PreferencesContext } from '@/contexts/preferences-context';
import { ProjectSettings } from '@/models/preferences';
import { normalizeProjectSettings } from '@/models/project-settings';
import Button from '@/components/common/Button';
import SyncSettingsModal from './SyncSettingsModal';

interface SyncSettingsButtonProps {
  status: SyncStatus;
  title?: string;
  variant?: 'transparent'|'secondary';
  style?: StyleProp<ViewStyle>;
}

const SyncSettingsButton: React.FC<SyncSettingsButtonProps> = ({
  status,
  title,
  variant = 'transparent',
  style,
}) => {
  const preferences = useContext(PreferencesContext);

  const [showSettings, setShowSettings] = useState<boolean>(false);

  const setSettings = useCallback(
    (settings: ProjectSettings) => {
      preferences.setProjectSettings(
        preferences.preferences.currentProject,
        settings
      );
    },
    [preferences]
  );

  const settings = normalizeProjectSettings(
    preferences.preferences.projects[preferences.preferences.currentProject]
  );

  return (
    <>
      {showSettings && (
        <SyncSettingsModal
          project={preferences.preferences.currentProject}
          status={status}
          settings={settings}
          onSettingsSet={(newSettings) => {
            setSettings(newSettings);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      <Button
        variant={variant}
        icon={React.cloneElement(getSyncStatusIcon(status), { size: 18 })}
        title={title}
        style={style}
        testID="sync-settings-button"
        onPress={() => setShowSettings(true)}
      />
    </>
  );
};

const getSyncStatusIcon = (syncStatus: SyncStatus) => {
  switch (syncStatus) {
    case SyncStatus.Offline:
      return <MaterialIcons name="cloud-off" />;
    case SyncStatus.Pulling:
      return <MaterialIcons name="cloud-download" />;
    case SyncStatus.Pushing:
      return <MaterialIcons name="cloud-upload" />;
    case SyncStatus.InSync:
      return <MaterialCommunityIcons name="cloud-check" />;
    default:
      return <MaterialCommunityIcons name="cloud-alert" />;
  }
};

export default SyncSettingsButton;
