import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SyncStatus } from 'idai-field-core';
import Button from '@/components/common/Button';
import Heading from '@/components/common/Heading';
import TitleBar from '@/components/common/TitleBar';

interface DisconnectPouchFormProps {
    project: string;
    status: SyncStatus;
    url: string;
    onDisconnect: () => void;
    onClose: () => void;
}

const DisconnectPouchForm: React.FC<DisconnectPouchFormProps> = ({
    project,
    status,
    url,
    onDisconnect,
    onClose,
}) => {
    return (
        <>
            <TitleBar
                title={ <Heading>데스크톱 연결</Heading> }
                left={ <Button
                    title="닫기"
                    variant="transparent"
                    icon={ <Ionicons name="close-outline" size={ 16 } /> }
                    onPress={ onClose }
                /> }
                right={ <Button
                    variant="danger"
                    testID="sync-disconnect-submit"
                    onPress={ onDisconnect }
                    title="연결 해제"
                /> }
            />
            <View style={ styles.content }>
                <Text style={ styles.label }>프로젝트 ID</Text>
                <Text selectable style={ styles.value }>{ project }</Text>
                <Text style={ styles.label }>데스크톱 주소</Text>
                <Text selectable style={ styles.value }>{ url }</Text>
                <View style={ styles.statusBox }>
                    <Text style={ styles.statusTitle }>{ getConnectedStatusLabel(status) }</Text>
                    <Text style={ styles.statusText }>
                        기록 전송 완료 뒤에도 데스크톱의 원본 사진 수신과 백업 상태를 확인하세요.
                    </Text>
                </View>
            </View>
        </>
    );
};

const getConnectedStatusLabel = (status: SyncStatus): string => {
    switch (status) {
        case SyncStatus.InSync:
            return '문서 기록 전송 완료';
        case SyncStatus.Pushing:
            return '현장 기록 전송 중';
        case SyncStatus.Pulling:
            return '데스크톱 변경 받는 중';
        case SyncStatus.AuthenticationError:
            return '비밀번호 확인 필요';
        case SyncStatus.AuthorizationError:
            return '프로젝트 수신 준비 필요';
        case SyncStatus.Error:
            return '연결 확인 필요';
        default:
            return '데스크톱 연결됨';
    }
};

const styles = StyleSheet.create({
    content: {
        padding: 18,
    },
    label: {
        color: '#667085',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 12,
    },
    value: {
        color: '#1d2939',
        fontSize: 15,
        fontWeight: '800',
        marginTop: 4,
    },
    statusBox: {
        backgroundColor: '#f3faf5',
        borderColor: '#a6d5b2',
        borderRadius: 6,
        borderWidth: 1,
        marginTop: 20,
        padding: 14,
    },
    statusTitle: {
        color: '#14532d',
        fontSize: 15,
        fontWeight: '900',
    },
    statusText: {
        color: '#475467',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 6,
    },
});

export default DisconnectPouchForm;
