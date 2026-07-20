import React, {
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Animated, Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import {
    HandlerStateChangeEvent,
    PanGestureHandler,
    PanGestureHandlerEventPayload,
    State
} from 'react-native-gesture-handler';
//taken from https://snack.expo.io/@adamgrzybowski/react-native-gesture-handler-demo

interface BottomSheetProps {
    snapPointsFromTop: number[];
    children?: ReactNode;
}

const USE_NATIVE_DRIVER = true;
const HEADER_HEIGHT = 10;


const BottomSheet: React.FC<BottomSheetProps> = (props) => {

    const [windowHeight, setWindowHeight] = useState<number>(Dimensions.get('window').height);
    const SNAP_POINTS_FROM_TOP = useMemo(
        () => props.snapPointsFromTop.map(value => value * windowHeight),
        [props.snapPointsFromTop, windowHeight]
    );
    const START = SNAP_POINTS_FROM_TOP[0];
    const END = SNAP_POINTS_FROM_TOP[SNAP_POINTS_FROM_TOP.length - 1];

    const masterdrawer = useRef();
    const drawer = useRef();
    const drawerheader = useRef();
    const scroll = useRef();

    const [lastSnap, setLastSnap] = useState<number>(END);

    const lastScrollYValue = useRef(0);
    const lastScrollY = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const listenerId = lastScrollY.addListener(({ value }) => {
            lastScrollYValue.current = value;
        });

        return () => {
            lastScrollY.removeListener(listenerId);
        };
    }, [lastScrollY]);

    const dragY = useRef(new Animated.Value(9)).current;
    const _onGestureEvent = useMemo(
        () => Animated.event(
            [{ nativeEvent: { translationY: dragY } }],
            { useNativeDriver: USE_NATIVE_DRIVER }
        ),
        [dragY]
    );
    const negativeOne = useRef(new Animated.Value(-1)).current;
    const reverseLastScrollY = useMemo(
        () => Animated.multiply(negativeOne, lastScrollY),
        [lastScrollY, negativeOne]
    );

    const translateYOffset = useRef(new Animated.Value(END)).current;
    const translateY = useMemo(() => Animated.add(
        translateYOffset,
        Animated.add(dragY, reverseLastScrollY)
    ).interpolate({
            inputRange: [START, END],
            outputRange: [START, END],
            extrapolate: 'clamp',
        }), [
            dragY,
            END,
            reverseLastScrollY,
            START,
            translateYOffset,
        ]);


    const _onHandlerStateChange = useCallback(({
        nativeEvent,
    }: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
        
        if (nativeEvent.oldState === State.ACTIVE) {
            let { translationY } = nativeEvent;
            const { velocityY } = nativeEvent;
            translationY -= lastScrollYValue.current;
            const dragToss = 0.05;
            const endOffsetY =
            lastSnap + translationY + dragToss * velocityY;
    
            let destSnapPoint = SNAP_POINTS_FROM_TOP[0];
            for (let i = 0; i < SNAP_POINTS_FROM_TOP.length; i++) {
                const snapPoint = SNAP_POINTS_FROM_TOP[i];
                const distFromSnap = Math.abs(snapPoint - endOffsetY);
                if (distFromSnap < Math.abs(destSnapPoint - endOffsetY)) {
                    destSnapPoint = snapPoint;
                }
            }
            setLastSnap(destSnapPoint);
            translateYOffset.extractOffset();
            translateYOffset.setValue(translationY);
            translateYOffset.flattenOffset();
            dragY.setValue(0);
            Animated.spring(translateYOffset, {
            velocity: velocityY,
            tension: 68,
            friction: 12,
            toValue: destSnapPoint,
            useNativeDriver: USE_NATIVE_DRIVER,
            }).start();
        }
    }, [
        dragY,
        lastSnap,
        SNAP_POINTS_FROM_TOP,
        translateYOffset,
    ]);
    
    const _onHeaderHandlerStateChange = useCallback(({
        nativeEvent,
    }: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {

        if (nativeEvent.oldState === State.BEGAN) {
            lastScrollY.setValue(0);
        }
        _onHandlerStateChange({ nativeEvent });
    }, [_onHandlerStateChange, lastScrollY]);
    

    const handleLayoutChange = useCallback((_event: LayoutChangeEvent) => {
        const nextHeight = Dimensions.get('window').height;
        setWindowHeight((currentHeight) =>
            currentHeight === nextHeight ? currentHeight : nextHeight
        );
    }, []);


    return (
        <View
            style={ [styles.container, StyleSheet.absoluteFillObject ] }
            pointerEvents="box-none"
            onLayout={ handleLayoutChange }>
            <Animated.View
                style={ [
                    StyleSheet.absoluteFillObject,
                    { transform: [{ translateY }] }] }>
                <PanGestureHandler
                    ref={ drawerheader }
                    simultaneousHandlers={ [scroll, masterdrawer] }
                    shouldCancelWhenOutside={ false }
                    onGestureEvent={ _onGestureEvent }
                    onHandlerStateChange={ _onHeaderHandlerStateChange }>
                    <Animated.View style={ styles.header } >
                        <Animated.View style={ styles.icon } />
                    </Animated.View>
                </PanGestureHandler>
                <PanGestureHandler
                    ref={ drawer }
                    simultaneousHandlers={ [scroll, masterdrawer] }
                    shouldCancelWhenOutside={ false }
                    onGestureEvent={ _onGestureEvent }
                    onHandlerStateChange={ _onHandlerStateChange }>
                    <Animated.View style={ styles.mainContent }>
                        {props.children}
                    </Animated.View>
                </PanGestureHandler>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        elevation: 15,
        shadowColor: 'black',
        shadowOpacity: 0.25,
        shadowRadius: 5,
    },
    mainContent: {
        flex: 1,
    },
    header: {
        height: HEADER_HEIGHT,
        backgroundColor: 'white',
        alignItems: 'center',
    },
    icon: {
        backgroundColor: '#ccc',
        width: 35,
        height: 6,
        borderRadius: 5
    }
  });

export default BottomSheet;
