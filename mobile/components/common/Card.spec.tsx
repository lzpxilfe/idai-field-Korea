import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import Card from './Card';

describe('Card', () => {
  it('keeps later array styles so full-screen tablet modals are not squeezed', () => {
    const { getByTestId } = render(
      <Card
        style={[
          { maxHeight: '84%', width: '72%' },
          { height: '96%', maxHeight: '98%', width: '99%' },
        ]}
        testID="card"
      >
        <Text>유구 추가</Text>
      </Card>
    );

    expect(getByTestId('card').props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ backgroundColor: 'white' }),
      expect.objectContaining({
        height: '96%',
        maxHeight: '98%',
        width: '99%',
      }),
    ]));
  });
});
