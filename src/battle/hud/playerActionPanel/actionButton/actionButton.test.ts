import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { RectArea, RectAreaService } from "../../../../ui/rectArea"
import * as mocks from "../../../../utils/test/mocks"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../utils/test/mocks"
import { MouseButton } from "../../../../utils/mouseConfig"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../../action/template/actionTemplate"
import { ResourceHandler } from "../../../../resource/resourceHandler"
import { ActionButton, ActionButtonService } from "./actionButton"

describe("Action Button", () => {
    let buttonArea: RectArea
    let actionTemplate: ActionTemplate
    let objectRepository: ObjectRepository
    let actionButton: ActionButton

    beforeEach(() => {
        buttonArea = RectAreaService.new({
            left: 10,
            top: 20,
            width: 30,
            height: 40,
        })

        actionTemplate = ActionTemplateService.new({
            id: "water cannon",
            name: "Water Cannon",
            buttonIconResourceKey: "button-resource-icon",
        })
        objectRepository = ObjectRepositoryService.new()
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplate
        )

        actionButton = ActionButtonService.new({
            actionTemplateId: actionTemplate.id,
            objectRepository,
            buttonArea,
        })
    })

    describe("mouse interactions", () => {
        it("knows it should be considered when the user has hovered the mouse over it", () => {
            expect(
                ActionButtonService.shouldConsiderActionBecauseOfMouseMovement(
                    actionButton,
                    {
                        x: RectAreaService.left(buttonArea) - 100,
                        y: RectAreaService.bottom(buttonArea) + 9001,
                    }
                )
            ).toBe(false)

            expect(
                ActionButtonService.shouldConsiderActionBecauseOfMouseMovement(
                    actionButton,
                    {
                        x: RectAreaService.centerX(buttonArea),
                        y: RectAreaService.centerY(buttonArea),
                    }
                )
            ).toBe(true)
        })
        it("knows it should be selected when the mouse clicks on it", () => {
            expect(
                ActionButtonService.shouldSelectActionBecauseOfMouseButton(
                    actionButton,
                    {
                        button: MouseButton.ACCEPT,
                        x: RectAreaService.left(buttonArea) - 100,
                        y: RectAreaService.bottom(buttonArea) + 9001,
                    }
                )
            ).toBe(false)

            expect(
                ActionButtonService.shouldSelectActionBecauseOfMouseButton(
                    actionButton,
                    {
                        button: MouseButton.ACCEPT,
                        x: RectAreaService.centerX(buttonArea),
                        y: RectAreaService.centerY(buttonArea),
                    }
                )
            ).toBe(true)
        })
    })

    describe("drawing", () => {
        let graphicsBuffer: MockedP5GraphicsBuffer
        let graphicsSpies: { [p: string]: MockInstance }
        let resourceHandler: ResourceHandler

        beforeEach(() => {
            graphicsBuffer = new MockedP5GraphicsBuffer()
            graphicsSpies = MockedGraphicsBufferService.addSpies(graphicsBuffer)

            resourceHandler = mocks.mockResourceHandler(graphicsBuffer)
            resourceHandler.getResource = vi
                .fn()
                .mockReturnValue({ width: 32, height: 32 })
        })

        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsSpies)
        })

        it("tries to load the resource key", () => {
            ActionButtonService.draw({
                actionButton,
                graphicsBuffer,
                resourceHandler,
            })

            expect(resourceHandler.getResource).toHaveBeenCalledWith(
                actionTemplate.buttonIconResourceKey
            )
        })

        it("draws the action's name", () => {
            ActionButtonService.draw({
                actionButton,
                graphicsBuffer,
                resourceHandler,
            })
            expect(graphicsSpies["text"]).toBeCalledWith(
                actionTemplate.name,
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
        })
        it("will apply a pulsing border around the key when considered or selected", () => {
            const dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
            ActionButtonService.draw({
                actionButton,
                graphicsBuffer,
                resourceHandler,
                selected: true,
            })

            expect(graphicsSpies["stroke"]).toBeCalledWith(
                actionButton.layout.selectedBorder.strokeHue,
                actionButton.layout.selectedBorder.strokeSaturation,
                expect.any(Number)
            )

            expect(graphicsSpies["strokeWeight"]).toBeCalledWith(
                actionButton.layout.selectedBorder.strokeWeight
            )

            expect(dateSpy).toBeCalled()
            dateSpy.mockRestore()
        })

        it("will fade the icon if it is disabled", () => {
            ActionButtonService.draw({
                actionButton,
                graphicsBuffer,
                resourceHandler,
                fade: true,
            })

            expect(graphicsSpies["fill"]).toBeCalledWith(
                actionButton.layout.disabled.fillColor[0],
                actionButton.layout.disabled.fillColor[1],
                actionButton.layout.disabled.fillColor[2],
                expect.any(Number)
            )
        })
        it("can get overall dimensions", () => {
            graphicsSpies["textWidth"].mockReturnValue(9001)
            const boundingBox: RectArea =
                ActionButtonService.getExpectedDrawBoundingBox(
                    actionButton,
                    graphicsBuffer
                )
            expect(RectAreaService.left(boundingBox)).toBe(10)
            expect(RectAreaService.top(boundingBox)).toBe(20)
            expect(RectAreaService.height(boundingBox)).toBeGreaterThan(32)
            expect(RectAreaService.width(boundingBox)).toBeGreaterThan(9001)
        })
    })

    describe("action template overrides", () => {
        let actionButtonWithOverrides: ActionButton
        let graphicsBuffer: MockedP5GraphicsBuffer
        let graphicsSpies: { [p: string]: MockInstance }
        let resourceHandler: ResourceHandler

        beforeEach(() => {
            actionButtonWithOverrides = ActionButtonService.new({
                objectRepository,
                buttonArea: RectAreaService.new({
                    left: 10,
                    top: 20,
                    width: 30,
                    height: 40,
                }),
                actionTemplateId: undefined,
                defaultButtonIconResourceKey: undefined,
                actionTemplateOverride: {
                    name: "Custom Action Name",
                    buttonIconResourceKey: "custom-icon-resource-key",
                },
            })

            graphicsBuffer = new MockedP5GraphicsBuffer()
            graphicsSpies = MockedGraphicsBufferService.addSpies(graphicsBuffer)

            resourceHandler = mocks.mockResourceHandler(graphicsBuffer)
            resourceHandler.getResource = vi
                .fn()
                .mockReturnValue({ width: 32, height: 32 })

            ActionButtonService.draw({
                actionButton: actionButtonWithOverrides,
                graphicsBuffer,
                resourceHandler,
            })
        })
        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsSpies)
        })
        it("will use the override to set the icon resource key", () => {
            expect(
                actionButtonWithOverrides.uiObjects.buttonIcon.resourceKey
            ).toEqual("custom-icon-resource-key")
        })
        it("will use the override to set the action name", () => {
            expect(actionButtonWithOverrides.uiObjects.actionName.text).toEqual(
                "Custom Action Name"
            )
        })
    })
})
