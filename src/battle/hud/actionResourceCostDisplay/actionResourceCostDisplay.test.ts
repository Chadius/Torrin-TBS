import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
} from "vitest"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionResourceCostDisplay,
    ActionResourceCostDisplayService,
} from "./actionResourceCostDisplay"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { RectAreaService } from "../../../ui/rectArea"

describe("ActionResourceCostDisplay", () => {
    let objectRepository: ObjectRepository
    let oneActionPointAction: ActionTemplate

    beforeEach(() => {
        oneActionPointAction = ActionTemplateService.new({
            id: "oneActionPointAction",
            name: "oneActionPointAction",
        })
    })

    describe("creation", () => {
        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                oneActionPointAction
            )
        })

        it("will throw an error if no action template id is given", () => {
            const shouldThrowError = () => {
                ActionResourceCostDisplayService.new({
                    objectRepository,
                    actionTemplateId: undefined,
                    drawingArea: RectAreaService.new({
                        top: 0,
                        left: 0,
                        width: 100,
                        height: 20,
                    }),
                })
            }

            expect(shouldThrowError).toThrow("actionTemplateId must be defined")
        })
    })

    describe("drawing", () => {
        let graphicsContext: GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }
        let display: ActionResourceCostDisplay

        beforeEach(() => {
            graphicsContext = new MockedP5GraphicsBuffer()
            graphicsBufferSpies =
                MockedGraphicsBufferService.addSpies(graphicsContext)
        })

        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        })

        it("will draw a rectangle", () => {
            display = ActionResourceCostDisplayService.new({
                objectRepository,
                actionTemplateId: oneActionPointAction.id,
                drawingArea: RectAreaService.new({
                    top: 0,
                    left: 0,
                    width: 100,
                    height: 20,
                }),
            })
            ActionResourceCostDisplayService.draw({
                actionResourceCostDisplay: display,
                graphicsContext,
            })

            expect(graphicsBufferSpies["rect"]).toBeCalled()
        })
    })
})
