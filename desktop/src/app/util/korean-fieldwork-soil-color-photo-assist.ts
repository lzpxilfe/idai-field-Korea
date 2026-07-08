import * as sharpModule from 'sharp';

import {
    formatSoilProfileColorPhotoSampleSourceLabel,
    getNearestMunsellCandidates,
    normalizeSoilProfileColorPhotoSampleCoordinate,
    RgbSample,
    SoilColorCandidate,
    SoilColorConfidence,
    SOIL_PROFILE_COLOR_CENTRAL_SAMPLE_SOURCE_LABEL
} from 'idai-field-core';
import { ImageManipulation } from '../services/imagestore/manipulation/image-manipulation';


export { getNearestMunsellCandidates };

export type SoilColorAssistStatus = 'candidatesAvailable'|'lowConfidence'|'notRun';

export interface SoilColorAssistUpdates {
    soilColorAssistCandidates?: string;
    soilColorAssistStatus?: SoilColorAssistStatus;
}

export interface SoilColorSamplePoint {
    x: number;
    y: number;
}


const TARGET_CATEGORY = 'SoilProfilePhoto';
const SAMPLE_SIZE = 96;


export async function createSoilColorAssistUpdatesForImageUpload(
        categoryName: string, buffer: Buffer): Promise<SoilColorAssistUpdates> {

    if (categoryName !== TARGET_CATEGORY) return {};

    try {
        const averageRgb: RgbSample = await getCentralAverageRgb(buffer);
        const candidates: SoilColorCandidate[] = getNearestMunsellCandidates(averageRgb);

        return {
            soilColorAssistCandidates:
                formatCandidates(averageRgb, candidates, SOIL_PROFILE_COLOR_CENTRAL_SAMPLE_SOURCE_LABEL),
            soilColorAssistStatus: getAssistStatus(candidates[0])
        };
    } catch (_err) {
        return {
            soilColorAssistCandidates: '사진 색상 샘플을 읽지 못했습니다. 먼셀값을 직접 확인하세요.',
            soilColorAssistStatus: 'lowConfidence'
        };
    }
}


export async function createSoilColorAssistUpdatesForImageUploadAtPoint(
        categoryName: string, buffer: Buffer, point: SoilColorSamplePoint): Promise<SoilColorAssistUpdates> {

    if (categoryName !== TARGET_CATEGORY) return {};

    try {
        const averageRgb: RgbSample = await getPointAverageRgb(buffer, point);
        const candidates: SoilColorCandidate[] = getNearestMunsellCandidates(averageRgb);

        return {
            soilColorAssistCandidates:
                formatCandidates(averageRgb, candidates, formatSoilProfileColorPhotoSampleSourceLabel(point)),
            soilColorAssistStatus: getAssistStatus(candidates[0])
        };
    } catch (_err) {
        return {
            soilColorAssistCandidates: '선택한 사진 지점의 색상 샘플을 읽지 못했습니다. 먼셀값을 직접 확인하세요.',
            soilColorAssistStatus: 'lowConfidence'
        };
    }
}


async function getPointAverageRgb(buffer: Buffer, point: SoilColorSamplePoint): Promise<RgbSample> {

    const { data, info } = await getSharp()(buffer, {
        failOn: 'none',
        limitInputPixels: ImageManipulation.MAX_INPUT_PIXELS
    })
        .autoOrient()
        .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'inside' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const centerX: number = clamp(
        Math.round((normalizeSoilProfileColorPhotoSampleCoordinate(point.x) / 10000) * (info.width - 1)),
        0,
        info.width - 1
    );
    const centerY: number = clamp(
        Math.round((normalizeSoilProfileColorPhotoSampleCoordinate(point.y) / 10000) * (info.height - 1)),
        0,
        info.height - 1
    );
    const radius: number = Math.max(2, Math.round(Math.min(info.width, info.height) * 0.025));
    const xStart: number = Math.max(0, centerX - radius);
    const xEnd: number = Math.min(info.width - 1, centerX + radius);
    const yStart: number = Math.max(0, centerY - radius);
    const yEnd: number = Math.min(info.height - 1, centerY + radius);
    let red: number = 0;
    let green: number = 0;
    let blue: number = 0;
    let count: number = 0;

    for (let y: number = yStart; y <= yEnd; y++) {
        for (let x: number = xStart; x <= xEnd; x++) {
            const offset: number = ((y * info.width) + x) * info.channels;
            red += data[offset] ?? 0;
            green += data[offset + 1] ?? 0;
            blue += data[offset + 2] ?? 0;
            count++;
        }
    }

    return {
        blue: Math.round(blue / count),
        green: Math.round(green / count),
        red: Math.round(red / count)
    };
}


async function getCentralAverageRgb(buffer: Buffer): Promise<RgbSample> {

    const { data, info } = await getSharp()(buffer, {
        failOn: 'none',
        limitInputPixels: ImageManipulation.MAX_INPUT_PIXELS
    })
        .autoOrient()
        .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'inside' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const xStart: number = Math.floor(info.width * 0.35);
    const xEnd: number = Math.ceil(info.width * 0.65);
    const yStart: number = Math.floor(info.height * 0.35);
    const yEnd: number = Math.ceil(info.height * 0.65);
    let red: number = 0;
    let green: number = 0;
    let blue: number = 0;
    let count: number = 0;

    for (let y: number = yStart; y < yEnd; y++) {
        for (let x: number = xStart; x < xEnd; x++) {
            const offset: number = ((y * info.width) + x) * info.channels;
            red += data[offset] ?? 0;
            green += data[offset + 1] ?? 0;
            blue += data[offset + 2] ?? 0;
            count++;
        }
    }

    return {
        blue: Math.round(blue / count),
        green: Math.round(green / count),
        red: Math.round(red / count)
    };
}


function getSharp(): any {

    const candidate: any = sharpModule as any;

    return typeof candidate === 'function'
        ? candidate
        : candidate.default;
}


function formatCandidates(averageRgb: RgbSample, candidates: SoilColorCandidate[], label: string): string {

    return [
        `${label} ${averageRgb.red}/${averageRgb.green}/${averageRgb.blue}`,
        ...candidates.map((candidate, index) =>
            `${index + 1}: ${candidate.munsell} (${getConfidenceLabel(candidate.confidence)}, 차이 ${candidate.deltaE.toFixed(1)})`
        )
    ].join('\n');
}


function getAssistStatus(candidate: SoilColorCandidate|undefined): SoilColorAssistStatus {

    return candidate?.confidence === 'low'
        ? 'lowConfidence'
        : 'candidatesAvailable';
}


function clamp(value: number, min: number, max: number): number {

    return Math.max(min, Math.min(max, value));
}


function getConfidenceLabel(confidence: SoilColorConfidence): string {

    if (confidence === 'high') return '높음';
    if (confidence === 'medium') return '보통';
    return '낮음';
}
