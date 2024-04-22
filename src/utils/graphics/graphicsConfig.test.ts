import {GraphicsConfig, ScreenDimensions} from "./graphicsConfig";

describe('graphics config', () => {
    describe('isCoordinateOnScreen', () => {
        const coordinateTests = [
            {
                expected: true,
                x: 0,
                y: 0,
            },
            {
                expected: true,
                x: ScreenDimensions.SCREEN_WIDTH - 1,
                y: 0,
            },
            {
                expected: true,
                x: 0,
                y: ScreenDimensions.SCREEN_HEIGHT - 1,
            },
            {
                expected: true,
                x: ScreenDimensions.SCREEN_WIDTH - 1,
                y: ScreenDimensions.SCREEN_HEIGHT - 1,
            },
            {
                expected: false,
                x: -1,
                y: 0,
            },
            {
                expected: false,
                x: 0,
                y: -1,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH,
                y: 0,
            },
            {
                expected: false,
                x: 0,
                y: ScreenDimensions.SCREEN_HEIGHT,
            },
        ]

        it.each(coordinateTests)(`isCoordinateOnScreen test is $expected coordinates ($x, $y) `, ({
                                                                                                      expected,
                                                                                                      x,
                                                                                                      y,
                                                                                                  }) => {
            expect(GraphicsConfig.isCoordinateOnScreen(x, y)).toEqual(expected);
        });
    });
    describe('isCoordinateWithinMiddleThirdOfScreen', () => {
        const coordinateTests = [
            {
                expected: true,
                x: ScreenDimensions.SCREEN_WIDTH * 0.5,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.5,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.3,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.5,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.7,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.5,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.5,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.3,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.5,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.7,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.3,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.3,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.3,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.7,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.7,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.7,
            },
            {
                expected: false,
                x: ScreenDimensions.SCREEN_WIDTH * 0.3,
                y: ScreenDimensions.SCREEN_HEIGHT * 0.7,
            },
        ]

        it.each(coordinateTests)(`isCoordinateWithinMiddleThirdOfScreen test is $expected coordinates ($x, $y) `, ({
                                                                                                                       expected,
                                                                                                                       x,
                                                                                                                       y,
                                                                                                                   }) => {
            expect(GraphicsConfig.isCoordinateWithinMiddleThirdOfScreen(x, y)).toEqual(expected);
        });
    });
});
