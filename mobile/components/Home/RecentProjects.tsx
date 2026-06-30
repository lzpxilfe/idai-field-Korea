import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '@/components/common/Button';
import { colors } from '@/utils/colors';
import { getProjectDisplayName } from '@/constants/sample-project';

interface RecentProjectsProps {
  setSelectedProject: (project: string) => void;
  recentProjects: string[];
  openProject: (project: string) => void;
  setIsDeleteModalOpen: (open: boolean) => void;
}

const MAX_VISIBLE_RECENT_PROJECTS = 5;

const RecentProjects: React.FC<RecentProjectsProps> = ({
  setSelectedProject,
  recentProjects,
  openProject,
  setIsDeleteModalOpen,
}) => {
  const visibleRecentProjects = recentProjects.slice(0, MAX_VISIBLE_RECENT_PROJECTS);

  const confirmDeleteProject = (project: string) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  return (
    <View style={styles.recentProjectsCard} testID="recent-projects-card">
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>최근 프로젝트</Text>
      </View>

      {visibleRecentProjects.map((project, index) => (
        <View
          key={project}
          style={styles.projectRow}
          testID={`recent-project-row-${index}`}
        >
          <TouchableOpacity
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={`${getProjectDisplayName(project)} 프로젝트 열기`}
            onPress={() => openProject(project)}
            style={styles.projectOpenButton}
            testID={index === 0 ? 'open-project-button' : `open-project-button-${index}`}
          >
            <Ionicons
              name="folder-open-outline"
              size={20}
              color={colors.primary}
              style={styles.projectIcon}
            />
            <Text style={styles.projectName} numberOfLines={1}>
              {getProjectDisplayName(project)}
            </Text>
          </TouchableOpacity>

          <Button
            style={styles.deleteButton}
            testID={index === 0 ? 'delete-project-button' : `delete-project-button-${index}`}
            icon={<Ionicons name="trash-outline" size={16} />}
            onPress={() => confirmDeleteProject(project)}
            variant="danger"
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  recentProjectsCard: {
    backgroundColor: colors.secondary,
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  headerContainer: {
    marginBottom: 8,
  },
  headerText: {
    fontWeight: '600',
    fontSize: 16,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    marginTop: 6,
  },
  projectOpenButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.lightgray,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectIcon: {
    marginRight: 8,
  },
  projectName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  deleteButton: {
    width: 44,
    minHeight: 44,
  },
});

export default RecentProjects;
