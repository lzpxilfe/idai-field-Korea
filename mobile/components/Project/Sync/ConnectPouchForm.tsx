import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { ProjectSettings } from '@/models/preferences';
import { normalizeProjectSettings } from '@/models/project-settings';
import {
    getSyncUrlInvalidText,
    validateSyncUrl,
} from '@/utils/sync-url-validation';
import Button from '@/components/common/Button';
import Column from '@/components/common/Column';
import Heading from '@/components/common/Heading';
import Input from '@/components/common/Input';
import TitleBar from '@/components/common/TitleBar';

interface ConnectPouchFormProps {
    project?: string;
    settings: ProjectSettings,
    onConnect: (settings: ProjectSettings) => void;
    onClose: () => void;
}

const ConnectPouchForm: React.FC<ConnectPouchFormProps> = ({ project, settings, onConnect, onClose }) => {

    const normalizedSettings = normalizeProjectSettings(settings);
    const [url, setUrl] = useState<string>(normalizedSettings.url);
    const [urlTouched, setUrlTouched] = useState<boolean>(
        normalizedSettings.url.trim().length > 0
    );
    const [password, setPassword] = useState<string>(normalizedSettings.password);
    const syncUrlValidation = validateSyncUrl(url);
    const syncUrl = syncUrlValidation.url;
    const syncPassword = password.trim();
    const showUrlError = urlTouched && !syncUrlValidation.isValid;
    const canConnect = syncUrlValidation.isValid && syncPassword.length > 0;

    const onSubmit = () => {

        if (!canConnect) return;
        Keyboard.dismiss();
        onConnect({
            ...normalizedSettings,
            url: syncUrl,
            password: syncPassword,
            connected: true,
        });
    };

    return (
        <>
            <TitleBar
                title={ <Heading>동기화 연결</Heading> }
                left={ <Button
                    title="닫기"
                    variant="transparent"
                    icon={ <Ionicons name="close-outline" size={ 16 } /> }
                    onPress={ onClose }
                /> }
                right={ <Button
                    variant="success"
                    title="연결"
                    testID="sync-connect-submit"
                    isDisabled={ !canConnect }
                    onPress={ onSubmit }
                /> }
            />
            <Column>
                { project && (
                    <View style={ styles.projectNotice }>
                        <Text style={ styles.projectNoticeLabel }>연결할 프로젝트 ID</Text>
                        <Text selectable style={ styles.projectIdentifier }>{ project }</Text>
                        <Text style={ styles.projectNoticeText }>
                            태블릿에서 먼저 만든 프로젝트라면 데스크톱 설정에서 이 ID를 ‘받을 준비’한 뒤 연결하세요.
                        </Text>
                    </View>
                ) }
                <Input placeholder="URL"
                    testID="sync-url-input"
                    value={ url }
                    onChangeText={ (value) => {
                        setUrlTouched(true);
                        setUrl(value);
                    } }
                    autoCapitalize="none"
                    autoCorrect={ false }
                    autoFocus
                    invalidText={ getSyncUrlInvalidText(syncUrlValidation) }
                    isValid={ showUrlError ? false : undefined }
                />
                <Input placeholder="비밀번호"
                    testID="sync-password-input"
                    secureTextEntry
                    value={ password }
                    onChangeText={ setPassword }
                    autoCapitalize="none"
                    autoCorrect={ false }
                />
            </Column>
        </>
    );
};

const styles = StyleSheet.create({
    projectNotice: {
        backgroundColor: '#f3f7f5',
        borderColor: '#b9d4c4',
        borderRadius: 6,
        borderWidth: 1,
        marginBottom: 12,
        padding: 12,
    },
    projectNoticeLabel: {
        color: '#526272',
        fontSize: 12,
        fontWeight: '700',
    },
    projectIdentifier: {
        color: '#20313a',
        fontSize: 16,
        fontWeight: '900',
        marginTop: 3,
    },
    projectNoticeText: {
        color: '#526272',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 8,
    },
});

export default ConnectPouchForm;
