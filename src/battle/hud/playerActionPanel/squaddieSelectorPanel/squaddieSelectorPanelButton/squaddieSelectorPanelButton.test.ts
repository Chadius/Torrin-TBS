import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../objectRepository"
import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../../../../resource/resourceHandler"
import { SquaddieTemplateService } from "../../../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../../../squaddie/id"
import { SquaddieAffiliation } from "../../../../../squaddie/squaddieAffiliation"
import { SquaddieResourceService } from "../../../../../squaddie/resource"
import { BattleSquaddieService } from "../../../../battleSquaddie"
import * as mocks from "../../../../../utils/test/mocks"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../../utils/test/mocks"
import {
    SquaddieSelectorPanelButton,
    SquaddieSelectorPanelButtonService,
} from "./squaddieSelectorPanelButton"
import { RectArea, RectAreaService } from "../../../../../ui/rectArea"
import { ScreenDimensions } from "../../../../../utils/graphics/graphicsConfig"
import { MouseButton, MousePress } from "../../../../../utils/mouseConfig"

describe("Squaddie Selector Panel Button", () => {
    let objectRepository: ObjectRepository
    let graphicsContext: GraphicsBuffer
    let graphicsBufferSpies: { [key: string]: MockInstance }
    let resourceHandler: ResourceHandler

    const squaddieToAdd = {
        squaddieTemplateId: "playerSquaddieTemplate0",
        battleSquaddieId: "playerBattleSquaddieId0",
        name: "Player Squaddie 0",
        mapIconResourceKey: "playerSquaddieMapIcon0",
    }

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()

        const squaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                squaddieTemplateId: squaddieToAdd.squaddieTemplateId,
                name: squaddieToAdd.name,
                affiliation: SquaddieAffiliation.PLAYER,
                resources: SquaddieResourceService.new({
                    mapIconResourceKey: squaddieToAdd.mapIconResourceKey,
                }),
            }),
        })
        const battleSquaddie = BattleSquaddieService.new({
            battleSquaddieId: squaddieToAdd.battleSquaddieId,
            squaddieTemplate,
        })
        ObjectRepositoryService.addSquaddie({
            repo: objectRepository,
            battleSquaddie,
            squaddieTemplate,
        })

        graphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(graphicsContext)
        resourceHandler.loadResource = vi
            .fn()
            .mockReturnValue({ width: 1, height: 1 })
        graphicsBufferSpies =
            MockedGraphicsBufferService.addSpies(graphicsContext)
    })

    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
    })

    const drawButtonAtIndex = (squaddieIndex: number) => {
        let button = SquaddieSelectorPanelButtonService.new({
            battleSquaddieId: squaddieToAdd.battleSquaddieId,
            squaddieIndex: squaddieIndex,
        })

        SquaddieSelectorPanelButtonService.draw({
            button,
            graphicsContext,
            resourceHandler,
            objectRepository,
        })
        return button
    }

    describe("drawing a panel", () => {
        beforeEach(() => {
            drawButtonAtIndex(0)
        })

        it("will draw a button with the squaddie icon", () => {
            expect(graphicsBufferSpies["image"]).toBeCalled()
        })

        it("will render the name of the squaddie", () => {
            expect(graphicsBufferSpies["text"]).toBeCalledWith(
                expect.stringMatching(`${squaddieToAdd.name}`),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
        })

        it("will draw a background with a border", () => {
            expect(graphicsBufferSpies["strokeWeight"]).toBeCalled()
            expect(graphicsBufferSpies["rect"]).toBeCalled()
        })
    })

    describe("panel locations", () => {
        it("should draw the first button on screen", () => {
            let button0 = drawButtonAtIndex(0)
            expect(
                RectAreaService.left(button0.data.uiObjects!.drawingArea)
            ).toBeGreaterThanOrEqual(0)
            expect(
                RectAreaService.right(button0.data.uiObjects!.drawingArea)
            ).toBeLessThanOrEqual(ScreenDimensions.SCREEN_WIDTH)
            expect(
                RectAreaService.width(button0.data.uiObjects!.drawingArea)
            ).toBeGreaterThan(0)
            expect(
                RectAreaService.top(button0.data.uiObjects!.drawingArea)
            ).toBeGreaterThanOrEqual(0)
            expect(
                RectAreaService.bottom(button0.data.uiObjects!.drawingArea)
            ).toBeLessThanOrEqual(ScreenDimensions.SCREEN_HEIGHT)
            expect(
                RectAreaService.height(button0.data.uiObjects!.drawingArea)
            ).toBeGreaterThan(0)
        })

        it("should draw the first two buttons on the same row", () => {
            let button0 = drawButtonAtIndex(0)
            let button1 = drawButtonAtIndex(1)

            expect(
                RectAreaService.top(button0.data.uiObjects!.drawingArea)
            ).toEqual(RectAreaService.top(button1.data.uiObjects!.drawingArea))

            expect(
                RectAreaService.right(button0.data.uiObjects!.drawingArea)
            ).toBeLessThanOrEqual(
                RectAreaService.left(button1.data.uiObjects!.drawingArea)
            )
        })

        it("should draw two buttons per row, from the bottom up", () => {
            let button0 = drawButtonAtIndex(0)
            let button2 = drawButtonAtIndex(2)

            expect(
                RectAreaService.left(button0.data.uiObjects!.drawingArea)
            ).toEqual(RectAreaService.left(button2.data.uiObjects!.drawingArea))

            expect(
                RectAreaService.top(button0.data.uiObjects!.drawingArea)
            ).toBeGreaterThanOrEqual(
                RectAreaService.bottom(button2.data.uiObjects!.drawingArea)
            )
        })
    })

    describe("change status", () => {
        it("can change the button status upon creation", () => {
            let button = SquaddieSelectorPanelButtonService.new({
                battleSquaddieId: squaddieToAdd.battleSquaddieId,
                squaddieIndex: 0,
                squaddieIsControllable: true,
                squaddieIsSelected: true,
            })

            expect(
                SquaddieSelectorPanelButtonService.isSelected(button)
            ).toBeTruthy()
            expect(
                SquaddieSelectorPanelButtonService.isControllable(button)
            ).toBeTruthy()
        })

        it("can change the button status", () => {
            let button = SquaddieSelectorPanelButtonService.new({
                battleSquaddieId: squaddieToAdd.battleSquaddieId,
                squaddieIndex: 0,
            })

            SquaddieSelectorPanelButtonService.updateStatus({
                button,
                squaddieIsControllable: true,
                squaddieIsSelected: true,
            })

            expect(
                SquaddieSelectorPanelButtonService.isSelected(button)
            ).toBeTruthy()
            expect(
                SquaddieSelectorPanelButtonService.isControllable(button)
            ).toBeTruthy()
        })

        it("if the argument is undefined the status does not change", () => {
            let button = SquaddieSelectorPanelButtonService.new({
                battleSquaddieId: squaddieToAdd.battleSquaddieId,
                squaddieIndex: 0,
            })

            SquaddieSelectorPanelButtonService.updateStatus({
                button,
                squaddieIsControllable: true,
                squaddieIsSelected: true,
            })

            SquaddieSelectorPanelButtonService.updateStatus({
                button,
                squaddieIsControllable: false,
            })

            expect(
                SquaddieSelectorPanelButtonService.isSelected(button)
            ).toBeTruthy()
            expect(
                SquaddieSelectorPanelButtonService.isControllable(button)
            ).toBe(false)
        })
    })

    const drawButtonAndGetLastSpyCallArgs = <T>({
        button,
        graphicsSpy,
        expectedNumberOfCalls,
    }: {
        button: SquaddieSelectorPanelButton
        graphicsSpy: MockInstance
        expectedNumberOfCalls?: number
    }): T => {
        graphicsSpy.mockClear()
        SquaddieSelectorPanelButtonService.draw({
            button,
            graphicsContext,
            resourceHandler,
            objectRepository,
        })

        expect(graphicsSpy).toHaveBeenCalledTimes(expectedNumberOfCalls ?? 1)
        return graphicsSpy.mock.calls.slice(-1)[0] as T
    }

    describe("selected details", () => {
        it("uses a different stroke color and weight when the squaddie is selected", () => {
            let button = SquaddieSelectorPanelButtonService.new({
                battleSquaddieId: squaddieToAdd.battleSquaddieId,
                squaddieIndex: 0,
                squaddieIsSelected: false,
                squaddieIsControllable: true,
            })

            let strokeColorBeforeSelected: number[] =
                drawButtonAndGetLastSpyCallArgs<number[]>({
                    button: button,
                    graphicsSpy: graphicsBufferSpies["stroke"],
                })
            let strokeWeightBeforeSelected: number =
                drawButtonAndGetLastSpyCallArgs<number>({
                    button: button,
                    expectedNumberOfCalls: 4,
                    graphicsSpy: graphicsBufferSpies["strokeWeight"],
                })

            SquaddieSelectorPanelButtonService.updateStatus({
                button,
                squaddieIsSelected: true,
                squaddieIsControllable: true,
            })

            let strokeColorAfterSelected: number[] =
                drawButtonAndGetLastSpyCallArgs<number[]>({
                    button: button,
                    graphicsSpy: graphicsBufferSpies["stroke"],
                })
            let strokeWeightAfterSelected: number =
                drawButtonAndGetLastSpyCallArgs<number>({
                    button: button,
                    expectedNumberOfCalls: 4,
                    graphicsSpy: graphicsBufferSpies["strokeWeight"],
                })

            expect(strokeColorBeforeSelected).not.toEqual(
                strokeColorAfterSelected
            )
            expect(strokeWeightBeforeSelected).not.toEqual(
                strokeWeightAfterSelected
            )
        })
        it("has a larger size when the squaddie is selected", () => {
            let button = SquaddieSelectorPanelButtonService.new({
                battleSquaddieId: squaddieToAdd.battleSquaddieId,
                squaddieIndex: 0,
                squaddieIsSelected: false,
                squaddieIsControllable: true,
            })

            let backgroundRectangleBeforeSelected: number[] =
                drawButtonAndGetLastSpyCallArgs<number[]>({
                    button: button,
                    graphicsSpy: graphicsBufferSpies["rect"],
                })

            SquaddieSelectorPanelButtonService.updateStatus({
                button,
                squaddieIsSelected: true,
                squaddieIsControllable: true,
            })

            let backgroundRectangleAfterSelected: number[] =
                drawButtonAndGetLastSpyCallArgs<number[]>({
                    button: button,
                    graphicsSpy: graphicsBufferSpies["rect"],
                })

            expect(backgroundRectangleBeforeSelected[2]).not.toEqual(
                backgroundRectangleAfterSelected[2]
            )
            expect(backgroundRectangleBeforeSelected[3]).not.toEqual(
                backgroundRectangleAfterSelected[3]
            )
        })
        it("uses a different background color when the squaddie is selected", () => {
            let button = SquaddieSelectorPanelButtonService.new({
                battleSquaddieId: squaddieToAdd.battleSquaddieId,
                squaddieIndex: 0,
                squaddieIsSelected: false,
                squaddieIsControllable: true,
            })

            SquaddieSelectorPanelButtonService.draw({
                button,
                graphicsContext,
                resourceHandler,
                objectRepository,
            })
            let fillColorWhenNotSelected: number[] = [
                ...(button.data.uiObjects!.background!.fillColor || []),
            ]

            SquaddieSelectorPanelButtonService.updateStatus({
                button,
                squaddieIsSelected: true,
            })

            SquaddieSelectorPanelButtonService.draw({
                button,
                graphicsContext,
                resourceHandler,
                objectRepository,
            })
            let fillColorWhenSelected: number[] = [
                ...(button.data.uiObjects!.background!.fillColor || []),
            ]

            expect(fillColorWhenNotSelected).not.toEqual(fillColorWhenSelected)
        })
    })

    describe("controllable details", () => {
        it("uses a different background color when the squaddie is controllable", () => {
            let button = SquaddieSelectorPanelButtonService.new({
                battleSquaddieId: squaddieToAdd.battleSquaddieId,
                squaddieIndex: 0,
                squaddieIsSelected: false,
                squaddieIsControllable: true,
            })

            SquaddieSelectorPanelButtonService.draw({
                button,
                graphicsContext,
                resourceHandler,
                objectRepository,
            })
            let fillColorWhenControllable: number[] = [
                ...(button.data.uiObjects!.background!.fillColor || []),
            ]

            SquaddieSelectorPanelButtonService.updateStatus({
                button,
                squaddieIsSelected: false,
                squaddieIsControllable: false,
            })

            SquaddieSelectorPanelButtonService.draw({
                button,
                graphicsContext,
                resourceHandler,
                objectRepository,
            })
            let fillColorWhenUncontrollable: number[] = [
                ...(button.data.uiObjects!.background!.fillColor || []),
            ]

            expect(fillColorWhenControllable).not.toEqual(
                fillColorWhenUncontrollable
            )
        })
    })

    describe("selecting a button via mouse click", () => {
        it("knows when the mouse wants to select it", () => {
            let button = SquaddieSelectorPanelButtonService.new({
                battleSquaddieId: squaddieToAdd.battleSquaddieId,
                squaddieIndex: 0,
                squaddieIsControllable: true,
                squaddieIsSelected: true,
            })
            SquaddieSelectorPanelButtonService.draw({
                button,
                graphicsContext,
                resourceHandler,
                objectRepository,
            })

            const selectingMouseClick: MousePress = {
                button: MouseButton.ACCEPT,
                x: RectAreaService.centerX(button.data.uiObjects!.drawingArea),
                y: RectAreaService.centerY(button.data.uiObjects!.drawingArea),
            }

            expect(
                SquaddieSelectorPanelButtonService.isMouseSelecting({
                    button,
                    mouseClick: selectingMouseClick,
                })
            ).toBeTruthy()
        })
        it("cannot select until the button is drawn", () => {
            let button = SquaddieSelectorPanelButtonService.new({
                battleSquaddieId: squaddieToAdd.battleSquaddieId,
                squaddieIndex: 0,
                squaddieIsControllable: true,
                squaddieIsSelected: true,
            })

            const selectingMouseClick: MousePress = {
                button: MouseButton.ACCEPT,
                x: 0,
                y: 0,
            }

            expect(
                SquaddieSelectorPanelButtonService.isMouseSelecting({
                    button,
                    mouseClick: selectingMouseClick,
                })
            ).toBeFalsy()
        })
        describe("knows when the mouse is clicking but not selecting it", () => {
            const clickTests = [
                {
                    name: "left",
                    mouseButton: MouseButton.ACCEPT,
                    getMouseLocation: (drawingArea: RectArea) => ({
                        x: RectAreaService.left(drawingArea) - 9001,
                        y: RectAreaService.centerY(drawingArea),
                    }),
                },
                {
                    name: "right",
                    mouseButton: MouseButton.ACCEPT,
                    getMouseLocation: (drawingArea: RectArea) => ({
                        x: RectAreaService.right(drawingArea) + 9001,
                        y: RectAreaService.centerY(drawingArea),
                    }),
                },
                {
                    name: "above",
                    mouseButton: MouseButton.ACCEPT,
                    getMouseLocation: (drawingArea: RectArea) => ({
                        x: RectAreaService.centerX(drawingArea),
                        y: RectAreaService.top(drawingArea) - 9001,
                    }),
                },
                {
                    name: "below",
                    mouseButton: MouseButton.ACCEPT,
                    getMouseLocation: (drawingArea: RectArea) => ({
                        x: RectAreaService.centerX(drawingArea),
                        y: RectAreaService.bottom(drawingArea) + 9001,
                    }),
                },
                {
                    name: "wrong button",
                    mouseButton: MouseButton.CANCEL,
                    getMouseLocation: (drawingArea: RectArea) => ({
                        x: RectAreaService.centerX(drawingArea),
                        y: RectAreaService.centerY(drawingArea),
                    }),
                },
            ]

            it.each(clickTests)(
                "$name",
                ({ mouseButton, getMouseLocation }) => {
                    let button = SquaddieSelectorPanelButtonService.new({
                        battleSquaddieId: squaddieToAdd.battleSquaddieId,
                        squaddieIndex: 0,
                        squaddieIsControllable: true,
                        squaddieIsSelected: true,
                    })
                    SquaddieSelectorPanelButtonService.draw({
                        button,
                        graphicsContext,
                        resourceHandler,
                        objectRepository,
                    })

                    const selectingMouseClick: MousePress = {
                        button: mouseButton,
                        ...getMouseLocation(button.data.uiObjects!.drawingArea),
                    }

                    expect(
                        SquaddieSelectorPanelButtonService.isMouseSelecting({
                            button,
                            mouseClick: selectingMouseClick,
                        })
                    ).toBeFalsy()
                }
            )
        })
    })
})
