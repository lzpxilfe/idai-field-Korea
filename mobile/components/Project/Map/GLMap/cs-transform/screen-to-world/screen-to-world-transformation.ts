import { LayoutRectangle } from 'react-native';
import { identity4, Matrix4 } from 'react-native-redash';
import { defineWorldCoordinateSystem } from '../constants';
import type { CSBox } from '../types';
/**
 * Transforms screen coordinate system to world cs
 * and takes care of the different y axis directions of the coordinate systems
 * ^
 * |y       ---
 * |    to  |
 * ---      |y
 * world     screen
 * @screen Screen rectangle
 * @returns transformation matrix from screen to world
 */
export const getScreenToWorldTransformationMatrix = (screen: LayoutRectangle): Matrix4 => {
    if (!isUsableScreenDimension(screen.width) || !isUsableScreenDimension(screen.height)) {
        return identity4;
    }

    const viewport = getAspectPreservingWorldViewport(screen);
    const scaleX = viewport.width / screen.width;
    const scaleY = viewport.height / screen.height;

    return [
        scaleX, 0, 0, viewport.minX,
        0, -1 * scaleY, 0, viewport.minY + viewport.height,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
};

export const getAspectPreservingWorldViewport = (screen: LayoutRectangle): CSBox => {
    const worldCS = defineWorldCoordinateSystem();
    if (!isUsableScreenDimension(screen.width) || !isUsableScreenDimension(screen.height)) {
        return worldCS;
    }

    const screenAspectRatio = screen.width / screen.height;
    const worldAspectRatio = worldCS.width / worldCS.height;

    if (screenAspectRatio >= worldAspectRatio) {
        const width = worldCS.height * screenAspectRatio;

        return {
            height: worldCS.height,
            minX: worldCS.minX - ((width - worldCS.width) / 2),
            minY: worldCS.minY,
            width,
        };
    }

    const height = worldCS.width / screenAspectRatio;

    return {
        height,
        minX: worldCS.minX,
        minY: worldCS.minY - ((height - worldCS.height) / 2),
        width: worldCS.width,
    };
};

const isUsableScreenDimension = (value: number): boolean =>
    Number.isFinite(value) && value > 0;
