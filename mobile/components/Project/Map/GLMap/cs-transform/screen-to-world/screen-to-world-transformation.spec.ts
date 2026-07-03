import { identity4 } from 'react-native-redash';
import { processTransform2d } from '../matrix-utils/matrix-utils';
import {
  getAspectPreservingWorldViewport,
  getScreenToWorldTransformationMatrix,
} from './screen-to-world-transformation';

describe('screen-to-world transformation', () => {
  it('returns a finite fallback matrix while the map has no measured size', () => {
    expect(getScreenToWorldTransformationMatrix({
      height: 0,
      width: 0,
      x: 0,
      y: 0,
    })).toEqual(identity4);
  });

  it('returns a finite matrix for a measured tablet screen', () => {
    const matrix = getScreenToWorldTransformationMatrix({
      height: 1340,
      width: 800,
      x: 0,
      y: 0,
    });

    expect(matrix.every(Number.isFinite)).toBe(true);
  });

  it('preserves map aspect ratio on wide screens', () => {
    const screen = {
      height: 400,
      width: 800,
      x: 0,
      y: 0,
    };
    const matrix = getScreenToWorldTransformationMatrix(screen);

    expect(getAspectPreservingWorldViewport(screen)).toEqual({
      height: 1000,
      minX: -500,
      minY: 0,
      width: 2000,
    });
    expect(processTransform2d(matrix, [400, 200])).toEqual([500, 500]);
    expect(processTransform2d(matrix, [500, 200])).toEqual([750, 500]);
    expect(processTransform2d(matrix, [400, 100])).toEqual([500, 750]);
  });

  it('preserves map aspect ratio on tall tablet screens', () => {
    const screen = {
      height: 800,
      width: 400,
      x: 0,
      y: 0,
    };
    const matrix = getScreenToWorldTransformationMatrix(screen);

    expect(getAspectPreservingWorldViewport(screen)).toEqual({
      height: 2000,
      minX: 0,
      minY: -500,
      width: 1000,
    });
    expect(processTransform2d(matrix, [200, 400])).toEqual([500, 500]);
    expect(processTransform2d(matrix, [300, 400])).toEqual([750, 500]);
    expect(processTransform2d(matrix, [200, 300])).toEqual([500, 750]);
  });
});
