import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import { SquaddieTemplateService } from "../../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../../squaddie/id"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import { SquaddieResourceService } from "../../../../squaddie/resource"
import { SquaddieEmotion } from "../../../animation/actionAnimation/actionAnimationConstants"
import { BattleSquaddieService } from "../../../battleSquaddie"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../../action/template/actionTemplate"
import {
    ActionSelectedTile,
    ActionSelectedTileService,
} from "./actionSelectedTile"
import { ActionTilePosition } from "./actionTilePosition"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import * as mocks from "../../../../utils/test/mocks"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../utils/test/mocks"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ResourceHandler } from "../../../../resource/resourceHandler"

describe("Action Selected Tile", () => {
    let objectRepository: ObjectRepository
    let actionTemplate: ActionTemplate

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()

        const squaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                templateId: "JoeTheSoldier",
                name: "Joe the Soldier",
                affiliation: SquaddieAffiliation.PLAYER,
                resources: SquaddieResourceService.new({
                    actionSpritesByEmotion: {
                        [SquaddieEmotion.NEUTRAL]: "portrait-joe-the-soldier",
                    },
                }),
            }),
        })

        const battleSquaddie = BattleSquaddieService.new({
            battleSquaddieId: "battleJoeTheSoldier",
            squaddieTemplateId: "JoeTheSoldier",
        })

        ObjectRepositoryService.addSquaddie(
            objectRepository,
            squaddieTemplate,
            battleSquaddie
        )

        actionTemplate = ActionTemplateService.new({
            id: "actionTemplate",
            name: "Action Name",
            actionEffectTemplates: [],
            buttonIconResourceKey: "button-icon-resource-key",
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplate
        )
    })

    describe("creation", () => {
        let tile: ActionSelectedTile
        beforeEach(() => {
            tile = ActionSelectedTileService.new({
                objectRepository,
                horizontalPosition: ActionTilePosition.SELECTED_ACTION,
                actionTemplateId: actionTemplate.id,
                battleSquaddieId: "battleJoeTheSoldier",
            })
        })

        it("uses the action name", () => {
            expect(tile.actionName).toEqual("Action Name")
        })
        it("uses the resource id", () => {
            expect(tile.buttonIconResourceName).toEqual(
                "button-icon-resource-key"
            )
        })
    })

    describe("drawing", () => {
        let tile: ActionSelectedTile
        let graphicsBuffer: GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }
        const fakeImage = { width: 1, height: 1 }
        let getResourceSpy: MockInstance
        let resourceHandler: ResourceHandler

        beforeEach(() => {
            tile = ActionSelectedTileService.new({
                objectRepository,
                horizontalPosition: ActionTilePosition.SELECTED_ACTION,
                actionTemplateId: actionTemplate.id,
                battleSquaddieId: "battleJoeTheSoldier",
            })
            graphicsBuffer = new MockedP5GraphicsBuffer()
            graphicsBufferSpies =
                MockedGraphicsBufferService.addSpies(graphicsBuffer)
            resourceHandler = mocks.mockResourceHandler(graphicsBuffer)
            resourceHandler.getResource = vi.fn().mockReturnValue(fakeImage)
            getResourceSpy = vi.spyOn(resourceHandler, "getResource")
        })
        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        })

        it("will draw the action icon", () => {
            ActionSelectedTileService.draw({
                tile,
                graphicsContext: graphicsBuffer,
                resourceHandler,
                objectRepository,
            })

            expect(getResourceSpy).toBeCalledWith(
                actionTemplate.buttonIconResourceKey
            )

            expect(graphicsBufferSpies["image"]).toBeCalled()
            const drawSpyCalls = graphicsBufferSpies["image"].mock.calls
            expect(
                drawSpyCalls.some((call) => call[0] === fakeImage)
            ).toBeTruthy()
        })
        it("will draw the name of the action", () => {
            ActionSelectedTileService.draw({
                tile,
                graphicsContext: graphicsBuffer,
                resourceHandler,
                objectRepository,
            })
            expect(graphicsBufferSpies["text"]).toBeCalled()
            const drawSpyCalls = graphicsBufferSpies["text"].mock.calls
            expect(
                drawSpyCalls.some((call) => call[0] === actionTemplate.name)
            ).toBeTruthy()
        })
    })
})
