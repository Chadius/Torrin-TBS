import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {RectAreaService} from "../../ui/rectArea";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {LabelService} from "../../ui/label";
import {PopupWindow, PopupWindowService, PopupWindowStatus} from "./popupWindow";
import {BattleCamera} from "../battleCamera";

describe('PopUp', () => {
    let popup: PopupWindow;
    let graphicsContext: MockedP5GraphicsContext;
    let drawRectSpy: jest.SpyInstance;

    beforeEach(() => {
        popup = PopupWindowService.new({
            label: LabelService.new({
                padding: 0,
                area: RectAreaService.new({
                    left: 200,
                    top: 300,
                    width: 100,
                    height: 50,
                }),
                textSize: 18,
                text: "pop up!",
                fontColor: [0, 0, 100]
            })
        })

        graphicsContext = new MockedP5GraphicsContext();

        drawRectSpy = jest.spyOn(graphicsContext, "rect");
    })

    afterEach(() => {
        drawRectSpy.mockRestore();
    })

    it('Starts in Inactive state', () => {
        expect(popup.status).toEqual(PopupWindowStatus.INACTIVE)
    })
    it('Can be set to Active state', () => {
        PopupWindowService.changeStatus(popup, PopupWindowStatus.ACTIVE)
        expect(popup.status).toEqual(PopupWindowStatus.ACTIVE)
    })
    it('Can be drawn at the same location if no camera is used', () => {
        PopupWindowService.changeStatus(popup, PopupWindowStatus.ACTIVE)
        PopupWindowService.setCamera(popup, new BattleCamera(0, 0))
        PopupWindowService.draw(popup, graphicsContext)
        expect(drawRectSpy).toHaveBeenCalledWith(
            RectAreaService.left(popup.label.textBox.area),
            RectAreaService.top(popup.label.textBox.area),
            RectAreaService.width(popup.label.textBox.area),
            RectAreaService.height(popup.label.textBox.area),
        )
    })
    it('Can be drawn at the same location if a camera is used but it is on screen', () => {
        PopupWindowService.changeStatus(popup, PopupWindowStatus.ACTIVE)
        PopupWindowService.setCamera(popup, new BattleCamera())
        PopupWindowService.draw(popup, graphicsContext)
        expect(drawRectSpy).toHaveBeenCalledWith(
            RectAreaService.left(popup.label.textBox.area),
            RectAreaService.top(popup.label.textBox.area),
            RectAreaService.width(popup.label.textBox.area),
            RectAreaService.height(popup.label.textBox.area),
        )
    })
    describe('drawn using offscreen coordinates', () => {
        const tests = [
            {
                name: "above screen",
                worldX: 100,
                worldY: ScreenDimensions.SCREEN_HEIGHT * -10,
                expectation: (popupWindow: PopupWindow) =>
                    RectAreaService.top(popupWindow.label.rectangle.area) === 0
                    && RectAreaService.top(popupWindow.label.textBox.area) === 0
                ,
            },
            {
                name: "below screen",
                worldX: 300,
                worldY: ScreenDimensions.SCREEN_HEIGHT * 10,
                expectation: (popupWindow: PopupWindow) =>
                    RectAreaService.bottom(popupWindow.label.rectangle.area) === ScreenDimensions.SCREEN_HEIGHT
                    && RectAreaService.bottom(popupWindow.label.textBox.area) === ScreenDimensions.SCREEN_HEIGHT
                ,
            },
            {
                name: "left of screen",
                worldX: ScreenDimensions.SCREEN_WIDTH * -10,
                worldY: 10,
                expectation: (popupWindow: PopupWindow) =>
                    RectAreaService.left(popupWindow.label.rectangle.area) === 0
                    && RectAreaService.left(popupWindow.label.textBox.area) === 0
                ,
            },
            {
                name: "right of screen",
                worldX: ScreenDimensions.SCREEN_WIDTH * 10,
                worldY: 20,
                expectation: (popupWindow: PopupWindow) =>
                    RectAreaService.right(popupWindow.label.rectangle.area) === ScreenDimensions.SCREEN_WIDTH
                    && RectAreaService.right(popupWindow.label.textBox.area) === ScreenDimensions.SCREEN_WIDTH
                ,
            }
        ];
        it.each(tests)(`$name will always be drawn`, ({
                                                          name,
                                                          worldX,
                                                          worldY,
                                                          expectation,
                                                      }) => {
            popup = PopupWindowService.new({
                label: LabelService.new({
                    padding: 0,
                    area: RectAreaService.new({
                        left: worldX,
                        top: worldY,
                        width: 100,
                        height: 50,
                    }),
                    textSize: 18,
                    text: "pop up!",
                    fontColor: [0, 0, 100],
                }),
                camera: new BattleCamera()
            })
            PopupWindowService.changeStatus(popup, PopupWindowStatus.ACTIVE)
            PopupWindowService.draw(popup, graphicsContext)
            expect(expectation(popup)).toBeTruthy()
        })
    });
    it('Will not be drawn if Inactive', () => {
        PopupWindowService.changeStatus(popup, PopupWindowStatus.INACTIVE)
        PopupWindowService.draw(popup, graphicsContext)
        expect(drawRectSpy).not.toBeCalled()
    });
    describe('set popup to Inactive after timer expires', () => {
        let popup: PopupWindow;
        let graphicsContext: MockedP5GraphicsContext;
        let dateSpy: jest.SpyInstance;

        beforeEach(() => {
            popup = PopupWindowService.new({
                label: LabelService.new({
                    padding: 0,
                    area: RectAreaService.new({
                        left: 0,
                        top: 0,
                        width: 100,
                        height: 50,
                    }),
                    textSize: 18,
                    text: "pop up!",
                    fontColor: [0, 0, 100],
                }),
                camera: new BattleCamera()
            })
            PopupWindowService.changeStatus(popup, PopupWindowStatus.ACTIVE)
            graphicsContext = new MockedP5GraphicsContext()
            dateSpy = jest.spyOn(Date, "now").mockReturnValue(0)
        })

        afterEach(() => {
            dateSpy.mockRestore()
        })

        it('will not change status to inactive if no timer is set', () => {
            dateSpy.mockReturnValue(10000)
            PopupWindowService.draw(popup, graphicsContext)

            expect(popup.status).toEqual(PopupWindowStatus.ACTIVE)
        })

        it('will not change status to inactive if it is not time yet', () => {
            PopupWindowService.setInactiveAfterTimeElapsed(popup, 1000)
            dateSpy.mockReturnValue(0)
            PopupWindowService.draw(popup, graphicsContext)

            expect(popup.status).toEqual(PopupWindowStatus.ACTIVE)
        })

        it('will change status to inactive if time has passed', () => {
            PopupWindowService.setInactiveAfterTimeElapsed(popup, 1000)
            dateSpy.mockReturnValue(10000)
            PopupWindowService.draw(popup, graphicsContext)

            expect(popup.status).toEqual(PopupWindowStatus.INACTIVE)
        })

        it('will change status to inactive if delay is 0', () => {
            PopupWindowService.setInactiveAfterTimeElapsed(popup, 0)
            PopupWindowService.draw(popup, graphicsContext)

            expect(popup.status).toEqual(PopupWindowStatus.INACTIVE)
        })
    })
})
