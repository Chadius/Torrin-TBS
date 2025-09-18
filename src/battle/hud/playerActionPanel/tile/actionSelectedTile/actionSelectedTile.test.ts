import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../objectRepository"
import { SquaddieTemplateService } from "../../../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../../../squaddie/id"
import { SquaddieAffiliation } from "../../../../../squaddie/squaddieAffiliation"
import { SquaddieResourceService } from "../../../../../squaddie/resource"
import { SquaddieEmotion } from "../../../../animation/actionAnimation/actionAnimationConstants"
import { BattleSquaddieService } from "../../../../battleSquaddie"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../../../action/template/actionTemplate"
import {
    ActionSelectedTile,
    ActionSelectedTileService,
} from "./actionSelectedTile"
import { ActionTilePosition } from "../actionTilePosition"
import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import * as mocks from "../../../../../utils/test/mocks"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../../utils/test/mocks"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ResourceHandler } from "../../../../../resource/resourceHandler"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../../../../action/template/actionEffectTemplate"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../../../../squaddie/attribute/attributeModifier"
import {
    Attribute,
    AttributeTypeService,
} from "../../../../../squaddie/attribute/attribute"
import { Glossary } from "../../../../../campaign/glossary/glossary"
import { TileAttributeLabelStackService } from "../tileAttributeLabel/tileAttributeLabelStack"

describe("Action Selected Tile", () => {
    let objectRepository: ObjectRepository
    let actionTemplate: ActionTemplate

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()

        const squaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                squaddieTemplateId: "JoeTheSoldier",
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

        ObjectRepositoryService.addSquaddie({
            repo: objectRepository,
            squaddieTemplate: squaddieTemplate,
            battleSquaddie: battleSquaddie,
        })

        actionTemplate = ActionTemplateService.new({
            id: "actionTemplate",
            name: "Action Name",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                    },
                    attributeModifiers: [
                        AttributeModifierService.new({
                            type: Attribute.MOVEMENT,
                            source: AttributeSource.MARTIAL,
                            amount: 1,
                        }),
                    ],
                }),
            ],
            buttonIconResourceKey: "button-icon-resource-key",
            userInformation: {
                userReadableDescription: "userReadableDescription",
                customGlossaryTerms: [
                    {
                        name: "info",
                        definition: "customGlossaryTerm0",
                    },
                ],
            },
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
                glossary: new Glossary(),
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
        it("creates a stack for labels", () => {
            expect(tile.glossaryLabelStack.labels).toHaveLength(2)
            expect(tile.glossaryLabelStack.labels[0]!.iconResourceKey).toEqual(
                AttributeTypeService.getAttributeIconResourceKeyForAttributeType(
                    Attribute.MOVEMENT
                )
            )
            expect(tile.glossaryLabelStack.labels[1]!.description.text).toEqual(
                "customGlossaryTerm0"
            )
        })
    })

    describe("drawing", () => {
        let tile: ActionSelectedTile
        let graphicsBuffer: GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }
        const fakeImage = { width: 1, height: 1 }
        let resourceHandler: ResourceHandler

        beforeEach(() => {
            tile = ActionSelectedTileService.new({
                objectRepository,
                horizontalPosition: ActionTilePosition.SELECTED_ACTION,
                actionTemplateId: actionTemplate.id,
                battleSquaddieId: "battleJoeTheSoldier",
                glossary: new Glossary(),
            })
            graphicsBuffer = new MockedP5GraphicsBuffer()
            graphicsBufferSpies =
                MockedGraphicsBufferService.addSpies(graphicsBuffer)
            resourceHandler = mocks.mockResourceHandler(graphicsBuffer)
            resourceHandler.getResource = vi.fn().mockReturnValue(fakeImage)
        })
        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        })

        it("will draw the label stack", () => {
            let stackSpy = vi.spyOn(TileAttributeLabelStackService, "draw")
            ActionSelectedTileService.draw({
                tile,
                graphicsContext: graphicsBuffer,
                objectRepository,
                resourceHandler,
            })
            expect(stackSpy).toBeCalled()
            stackSpy.mockRestore()
        })
        it("will pass mouse movement events to the stack", () => {
            let mouseMovedSpy = vi.spyOn(
                TileAttributeLabelStackService,
                "mouseMoved"
            )
            ActionSelectedTileService.mouseMoved({
                tile,
                mouseLocation: { x: 0, y: 0 },
            })
            expect(mouseMovedSpy).toBeCalled()
            mouseMovedSpy.mockRestore()
        })
    })
})
