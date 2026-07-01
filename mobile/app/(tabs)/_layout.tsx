import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreferencesContext } from '@/contexts/preferences-context';
import usePreferences from '@/hooks/use-preferences';
import { ToastProvider } from '@/components/common/Toast/ToastProvider';
import { Toast } from '@/components/common/Toast/Toast';
import LabelsContextProvider from '@/contexts/labels/LabelsContextProvider';
import {
  canOpenKoreanFieldworkProject,
  getKoreanFieldworkFieldBoardOverviewRoute,
} from '@/components/Project/korean-fieldwork-navigation';

export default function TabLayout() {
  const preferences = usePreferences();
  const canOpenRecordTab = canOpenKoreanFieldworkProject(
    preferences.preferences
  );

  return (
    <SafeAreaProvider>
      <PreferencesContext.Provider value={preferences}>
        <LabelsContextProvider>
          <ToastProvider>
            <Tabs
              screenOptions={{
                tabBarActiveTintColor: 'blue',
                headerShown: false,
              }}
            >
              <Tabs.Screen
                name="index"
                options={{
                  title: '홈',
                  tabBarIcon: ({ color }) => (
                    <FontAwesome size={28} name="home" color={color} />
                  ),
                }}
              />
              <Tabs.Screen
                name="SettingsScreen"
                options={{
                  title: '설정',
                  tabBarIcon: ({ color }) => (
                    <FontAwesome size={28} name="cog" color={color} />
                  ),
                }}
              />
              <Tabs.Screen
                name="ProjectScreen"
                options={{
                  title: '기록',
                  tabBarIcon: ({ color }) => (
                    <FontAwesome
                      size={28}
                      name="edit"
                      color={canOpenRecordTab ? color : '#9aa3a7'}
                    />
                  ),
                  tabBarButton: (props) => (
                    <Pressable
                      {...props}
                      accessibilityState={{
                        ...(props.accessibilityState ?? {}),
                        disabled: !canOpenRecordTab,
                      }}
                      disabled={!canOpenRecordTab}
                    />
                  ),
                }}
                listeners={{
                  tabPress: (event) => {
                    event.preventDefault();
                    if (!canOpenRecordTab) {
                      router.replace('/');
                      return;
                    }

                    router.replace(getKoreanFieldworkFieldBoardOverviewRoute(
                      Date.now().toString()
                    ));
                  },
                }}
              />
            </Tabs>
            <Toast />
          </ToastProvider>
        </LabelsContextProvider>
      </PreferencesContext.Provider>
    </SafeAreaProvider>
  );
}
