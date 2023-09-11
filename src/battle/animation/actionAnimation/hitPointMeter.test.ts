import {MockedP5GraphicsContext} from "../../../utils/test/mocks";
import {ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME} from "./actionAnimationConstants";
import {HIT_POINT_METER_HP_WIDTH, HitPointMeter} from "./hitPointMeter";

describe('Hit Point Meter', () => {
    let hitPointMeter: HitPointMeter;
    let hue: number;
    let textDrawSpy: jest.SpyInstance;
    let rectDrawSpy: jest.SpyInstance;
    let strokeSpy: jest.SpyInstance;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        hue = 30;
        hitPointMeter = new HitPointMeter({
            maxHitPoints: 5,
            currentHitPoints: 3,
            left: 10,
            top: 50,
            hue,
        });

        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        textDrawSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text");
        rectDrawSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "rect");
        strokeSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "stroke");
    });

    it('knows to draw the current and max hit points', () => {
        hitPointMeter.draw(mockedP5GraphicsContext);

        expect(textDrawSpy).toBeCalledTimes(2);
        expect(textDrawSpy.mock.calls[0][0]).toBe("3");
        expect(textDrawSpy.mock.calls[1][0]).toBe("/5");

        const currentHitPointDrawLocation = {
            left: textDrawSpy.mock.calls[0][1],
            top: textDrawSpy.mock.calls[0][2]
        };

        const maxHitPointDrawLocation = {
            left: textDrawSpy.mock.calls[1][1],
            top: textDrawSpy.mock.calls[1][2]
        };

        expect(currentHitPointDrawLocation.top).toBe(maxHitPointDrawLocation.top);
        expect(currentHitPointDrawLocation.left).toBeLessThan(maxHitPointDrawLocation.left);
    });

    it('knows to draw the max hit points outline first, and then the current hit points', () => {
        hitPointMeter.draw(mockedP5GraphicsContext);

        expect(strokeSpy).toBeCalledTimes(1);
        expect(strokeSpy.mock.calls[0][0]).toBe(hue);

        expect(rectDrawSpy).toBeCalledTimes(2);
        expect(rectDrawSpy.mock.calls[0][2]).toBeGreaterThanOrEqual(5 * HIT_POINT_METER_HP_WIDTH);
        expect(rectDrawSpy.mock.calls[0][2]).toBeLessThan(6 * HIT_POINT_METER_HP_WIDTH);

        expect(rectDrawSpy.mock.calls[1][2]).toBe(3 * HIT_POINT_METER_HP_WIDTH);
    });

    describe('hit point change', () => {
        it('will draw hit point change with a brighter color', () => {
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            hitPointMeter.changeHitPoints(-2);
            hitPointMeter.draw(mockedP5GraphicsContext);

            expect(rectDrawSpy).toBeCalledTimes(3);
            expect(rectDrawSpy.mock.calls[2][2]).toBe(2 * HIT_POINT_METER_HP_WIDTH);
        });

        it('will animate the length of the changed hit points when damaged', () => {
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            hitPointMeter.changeHitPoints(-2);
            hitPointMeter.draw(mockedP5GraphicsContext);

            expect(textDrawSpy).toBeCalledTimes(2);
            expect(textDrawSpy.mock.calls[0][0]).toBe("1");
            expect(textDrawSpy.mock.calls[1][0]).toBe("/5");

            expect(rectDrawSpy).toBeCalledTimes(3);
            expect(rectDrawSpy.mock.calls[2][2]).toBeCloseTo(2 * HIT_POINT_METER_HP_WIDTH);
            jest.spyOn(Date, 'now').mockImplementation(() => ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME / 2);

            hitPointMeter.draw(mockedP5GraphicsContext);
            expect(rectDrawSpy).toBeCalledTimes(6);
            expect(rectDrawSpy.mock.calls[5][2]).toBeCloseTo(1 * HIT_POINT_METER_HP_WIDTH);

            jest.spyOn(Date, 'now').mockImplementation(() => ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME);
            hitPointMeter.draw(mockedP5GraphicsContext);
            expect(rectDrawSpy).toBeCalledTimes(9);
            expect(rectDrawSpy.mock.calls[8][2]).toBeCloseTo(0);

            jest.spyOn(Date, 'now').mockImplementation(() => ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME + 1);
            hitPointMeter.draw(mockedP5GraphicsContext);
            expect(rectDrawSpy).toBeCalledTimes(11);
        });

        it('will animate the length of the changed hit points when healed', () => {
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            hitPointMeter.changeHitPoints(2);
            hitPointMeter.draw(mockedP5GraphicsContext);

            expect(textDrawSpy).toBeCalledTimes(2);
            expect(textDrawSpy.mock.calls[0][0]).toBe("5");
            expect(textDrawSpy.mock.calls[1][0]).toBe("/5");
            expect(rectDrawSpy).toBeCalledTimes(3);
            expect(rectDrawSpy.mock.calls[2][2]).toBeCloseTo(0);
            jest.spyOn(Date, 'now').mockImplementation(() => ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME / 2);

            hitPointMeter.draw(mockedP5GraphicsContext);
            expect(rectDrawSpy).toBeCalledTimes(6);
            expect(rectDrawSpy.mock.calls[5][2]).toBeCloseTo(1 * HIT_POINT_METER_HP_WIDTH);

            jest.spyOn(Date, 'now').mockImplementation(() => ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME);
            hitPointMeter.draw(mockedP5GraphicsContext);
            expect(rectDrawSpy).toBeCalledTimes(9);
            expect(rectDrawSpy.mock.calls[8][2]).toBeCloseTo(2 * HIT_POINT_METER_HP_WIDTH);

            jest.spyOn(Date, 'now').mockImplementation(() => ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME + 1);
            hitPointMeter.draw(mockedP5GraphicsContext);
            expect(rectDrawSpy).toBeCalledTimes(11);
        });
    });
});
