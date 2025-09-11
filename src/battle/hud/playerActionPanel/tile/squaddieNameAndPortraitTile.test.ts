import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../../../squaddie/squaddieAffiliation"
import { SquaddieTemplateService } from "../../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../../squaddie/id"
import { BattleSquaddieService } from "../../../battleSquaddie"
import {
    SquaddieNameAndPortraitTile,
    SquaddieNameAndPortraitTileService,
} from "./squaddieNameAndPortraitTile"
import { SquaddieResourceService } from "../../../../squaddie/resource"
import { SquaddieEmotion } from "../../../animation/actionAnimation/actionAnimationConstants"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../../../battleSquaddieTeam"
import * as mocks from "../../../../utils/test/mocks"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../utils/test/mocks"
import { ResourceHandler } from "../../../../resource/resourceHandler"
import { RectAreaService } from "../../../../ui/rectArea"
import { ScreenDimensions } from "../../../../utils/graphics/graphicsConfig"
import { WINDOW_SPACING } from "../../../../ui/constants"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../graphicsConstants"
import { ActionTilePosition } from "./actionTilePosition"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { TileAttributeLabelStackService } from "./tileAttributeLabel/tileAttributeLabelStack"
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "../../../stats/inBattleAttributes"
import { Glossary } from "../../../../campaign/glossary/glossary"
import {
    ArmyAttributesService,
    DefaultArmyAttributes,
} from "../../../../squaddie/armyAttributes"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../../../squaddie/attribute/attributeModifier"
import { Attribute } from "../../../../squaddie/attribute/attribute"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { getResultOrThrowError } from "../../../../utils/resultOrError"

describe("Squaddie Name and Portrait Tile", () => {
    let objectRepository: ObjectRepository

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
    })

    it("Can read a squaddie to populate all of its needed fields", () => {
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

        const tile: SquaddieNameAndPortraitTile =
            SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
                objectRepository,
                battleSquaddieId: "battleJoeTheSoldier",
                team: undefined,
                horizontalPosition: ActionTilePosition.ACTOR_NAME,
                glossary: new Glossary(),
            })

        expect(tile.squaddieName).toBe("Joe the Soldier")
        expect(tile.squaddiePortraitResourceKey).toBe(
            "portrait-joe-the-soldier"
        )
    })

    it("Will use the squaddie's affiliation icon if they do not have a portrait icon", () => {
        const squaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                squaddieTemplateId: "GenericEnemy",
                name: "Generic Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
            }),
        })

        const battleSquaddie = BattleSquaddieService.new({
            battleSquaddieId: "generic_enemy_1",
            squaddieTemplateId: "GenericEnemy",
        })

        ObjectRepositoryService.addSquaddie({
            repo: objectRepository,
            squaddieTemplate: squaddieTemplate,
            battleSquaddie: battleSquaddie,
        })

        const enemyTeam: BattleSquaddieTeam = BattleSquaddieTeamService.new({
            id: "the bad guys",
            affiliation: SquaddieAffiliation.ENEMY,
            name: "the bad guys",
            battleSquaddieIds: [battleSquaddie.battleSquaddieId],
            iconResourceKey: "affiliate-bad-guys-icon",
        })

        const tile: SquaddieNameAndPortraitTile =
            SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
                objectRepository,
                battleSquaddieId: "generic_enemy_1",
                team: enemyTeam,
                horizontalPosition: ActionTilePosition.ACTOR_NAME,
                glossary: new Glossary(),
            })

        expect(tile.squaddieName).toBe("Generic Enemy")
        expect(tile.squaddiePortraitResourceKey).toBe("affiliate-bad-guys-icon")
    })

    describe("background color set by affiliation", () => {
        let tile: SquaddieNameAndPortraitTile
        let resourceHandler: ResourceHandler
        let mockP5GraphicsContext: MockedP5GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }

        const tests = [
            {
                affiliation: SquaddieAffiliation.PLAYER,
            },
        ]

        beforeEach(() => {
            ;({ mockP5GraphicsContext, resourceHandler, graphicsBufferSpies } =
                mockGraphicsCalls(
                    mockP5GraphicsContext,
                    resourceHandler,
                    graphicsBufferSpies
                ))
        })

        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        })

        it.each(tests)(`$affiliation`, ({ affiliation }) => {
            ;({ tile, objectRepository } = createSquaddieOfGivenAffiliation({
                objectRepository,
                affiliation,
                tile,
            }))

            SquaddieNameAndPortraitTileService.draw({
                tile: tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(graphicsBufferSpies["rect"]).toBeCalled()
            expect(graphicsBufferSpies["fill"]).toBeCalledWith(
                HUE_BY_SQUADDIE_AFFILIATION[affiliation],
                expect.anything(),
                expect.anything()
            )

            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        })
    })

    const mockGraphicsCalls = (
        mockP5GraphicsContext: MockedP5GraphicsBuffer,
        resourceHandler: ResourceHandler,
        graphicsBufferSpies: {
            [p: string]: MockInstance
        }
    ) => {
        mockP5GraphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(mockP5GraphicsContext)
        resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(false)
        resourceHandler.loadResource = vi.fn().mockImplementation(() => {})
        graphicsBufferSpies = MockedGraphicsBufferService.addSpies(
            mockP5GraphicsContext
        )
        return { mockP5GraphicsContext, resourceHandler, graphicsBufferSpies }
    }
    const setupDrawingMocks = (
        tile: SquaddieNameAndPortraitTile,
        mockP5GraphicsContext: MockedP5GraphicsBuffer,
        resourceHandler: ResourceHandler,
        graphicsBufferSpies: {
            [p: string]: MockInstance
        }
    ) => {
        ;({ tile, objectRepository } = createSquaddieOfGivenAffiliation({
            objectRepository,
            tile,
        }))
        ;({ mockP5GraphicsContext, resourceHandler, graphicsBufferSpies } =
            mockGraphicsCalls(
                mockP5GraphicsContext,
                resourceHandler,
                graphicsBufferSpies
            ))
        return {
            tile,
            mockP5GraphicsContext,
            resourceHandler,
            graphicsBufferSpies,
        }
    }
    describe("portrait", () => {
        let tile: SquaddieNameAndPortraitTile
        let resourceHandler: ResourceHandler
        let mockP5GraphicsContext: MockedP5GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }

        beforeEach(() => {
            ;({
                mockP5GraphicsContext,
                resourceHandler,
                graphicsBufferSpies,
                tile,
            } = setupDrawingMocks(
                tile,
                mockP5GraphicsContext,
                resourceHandler,
                graphicsBufferSpies
            ))
        })

        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        })

        describe("drawing", () => {
            beforeEach(() => {
                resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(true)
                resourceHandler.getResource = vi
                    .fn()
                    .mockReturnValue({ width: 32, height: 32 })
                graphicsBufferSpies["image"] = vi.spyOn(
                    mockP5GraphicsContext,
                    "image"
                )
                graphicsBufferSpies["textWidth"] = vi
                    .spyOn(mockP5GraphicsContext, "textWidth")
                    .mockReturnValue(10)

                SquaddieNameAndPortraitTileService.draw({
                    tile: tile,
                    graphicsContext: mockP5GraphicsContext,
                    resourceHandler,
                })
            })

            it("positions the image against the bottom of the screen", () => {
                expect(
                    RectAreaService.centerX(tile.portraitImage.drawArea)
                ).toBeCloseTo(ScreenDimensions.SCREEN_WIDTH / 24)

                expect(
                    RectAreaService.bottom(tile.portraitImage.drawArea)
                ).toBeCloseTo(ScreenDimensions.SCREEN_HEIGHT)
            })

            it("tries to draw the imageUI", () => {
                expect(graphicsBufferSpies["image"]).toBeCalled()
            })
        })
    })

    describe("squaddie name", () => {
        let tile: SquaddieNameAndPortraitTile
        let resourceHandler: ResourceHandler
        let mockP5GraphicsContext: MockedP5GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }

        beforeEach(() => {
            ;({
                mockP5GraphicsContext,
                resourceHandler,
                graphicsBufferSpies,
                tile,
            } = setupDrawingMocks(
                tile,
                mockP5GraphicsContext,
                resourceHandler,
                graphicsBufferSpies
            ))
        })

        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        })

        it("does not create the text until we try to draw", () => {
            graphicsBufferSpies["textWidth"] = vi
                .spyOn(mockP5GraphicsContext, "textWidth")
                .mockReturnValue(10)

            expect(tile.squaddieNameTextBox).toBeUndefined()
            SquaddieNameAndPortraitTileService.draw({
                tile: tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })
            expect(tile.squaddieNameTextBox).not.toBeUndefined()
        })

        it("positions the text on top near the left corner", () => {
            const boundingBox =
                SquaddieNameAndPortraitTileService.getBoundingBoxBasedOnActionPanelPosition(
                    ActionTilePosition.ACTOR_NAME
                )

            SquaddieNameAndPortraitTileService.draw({
                tile: tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(
                RectAreaService.top(tile.squaddieNameTextBox.area)
            ).toBeCloseTo(
                ScreenDimensions.SCREEN_HEIGHT -
                    RectAreaService.height(boundingBox) +
                    WINDOW_SPACING.SPACING1
            )

            expect(
                RectAreaService.left(tile.squaddieNameTextBox.area)
            ).toBeCloseTo(
                RectAreaService.left(boundingBox) + WINDOW_SPACING.SPACING1
            )
        })

        it("tries to draw the text", () => {
            SquaddieNameAndPortraitTileService.draw({
                tile: tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(graphicsBufferSpies["text"]).toBeCalled()
        })
    })

    describe("tileAttributeLabelStack", () => {
        let tile: SquaddieNameAndPortraitTile
        let battleSquaddie: any
        let inBattleAttributes: InBattleAttributes
        let glossary: Glossary

        beforeEach(() => {
            glossary = new Glossary()
            ;({ tile, objectRepository } = createSquaddieOfGivenAffiliation({
                objectRepository,
                tile,
            }))

            inBattleAttributes = InBattleAttributesService.new({
                armyAttributes: ArmyAttributesService.new({
                    ...DefaultArmyAttributes,
                    maxHitPoints: 5,
                }),
                currentHitPoints: 5,
                attributeModifiers: [
                    AttributeModifierService.new({
                        type: Attribute.ARMOR,
                        source: AttributeSource.CIRCUMSTANCE,
                        amount: 2,
                        duration: 3,
                    }),
                    AttributeModifierService.new({
                        type: Attribute.HUSTLE,
                        source: AttributeSource.SPIRITUAL,
                        amount: 1,
                        duration: 2,
                    }),
                ],
            })

            battleSquaddie = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    tile.battleSquaddieId
                )
            ).battleSquaddie
            battleSquaddie.inBattleAttributes = inBattleAttributes
        })

        it("creates tileAttributeLabelStack from squaddie InBattleAttributes", () => {
            const updatedTile =
                SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
                    battleSquaddieId: "battleJoeTheSoldier",
                    team: undefined,
                    horizontalPosition: ActionTilePosition.ACTOR_NAME,
                    objectRepository,
                    glossary,
                })

            expect(updatedTile.glossaryLabelStack.labels).toHaveLength(2)
            expect(updatedTile.glossaryLabelStack.labels[0].title).toEqual(
                "Armor +2"
            )
            expect(updatedTile.glossaryLabelStack.labels[1].title).toEqual(
                "Hustle"
            )
        })

        it("creates empty tileAttributeLabelStack when squaddie has no attribute modifiers", () => {
            battleSquaddie.inBattleAttributes = InBattleAttributesService.new({
                armyAttributes: ArmyAttributesService.new({
                    ...DefaultArmyAttributes,
                    maxHitPoints: 5,
                }),
                currentHitPoints: 5,
            })

            const updatedTile =
                SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
                    battleSquaddieId: "battleJoeTheSoldier",
                    team: undefined,
                    horizontalPosition: ActionTilePosition.ACTOR_NAME,
                    objectRepository,
                    glossary,
                })

            expect(updatedTile.glossaryLabelStack).toBeDefined()
            expect(updatedTile.glossaryLabelStack.labels).toHaveLength(0)
        })

        it("filters out inactive attribute modifiers", () => {
            const inactiveModifier = AttributeModifierService.new({
                type: Attribute.MOVEMENT,
                source: AttributeSource.SPIRITUAL,
                amount: 1,
                duration: 0,
            })
            inBattleAttributes.attributeModifiers.push(inactiveModifier)

            const updatedTile =
                SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
                    battleSquaddieId: "battleJoeTheSoldier",
                    team: undefined,
                    horizontalPosition: ActionTilePosition.ACTOR_NAME,
                    objectRepository,
                    glossary,
                })

            expect(updatedTile.glossaryLabelStack.labels).toHaveLength(2)
            expect(
                updatedTile.glossaryLabelStack.labels.some((label) =>
                    label.title.includes("Movement")
                )
            ).toBe(false)
        })

        it("handles binary attribute modifiers correctly", () => {
            battleSquaddie.inBattleAttributes = InBattleAttributesService.new({
                armyAttributes: ArmyAttributesService.new({
                    ...DefaultArmyAttributes,
                    maxHitPoints: 5,
                }),
                currentHitPoints: 5,
                attributeModifiers: [
                    AttributeModifierService.new({
                        type: Attribute.HUSTLE,
                        source: AttributeSource.SPIRITUAL,
                        amount: 1,
                        duration: 2,
                    }),
                    AttributeModifierService.new({
                        type: Attribute.ELUSIVE,
                        source: AttributeSource.CIRCUMSTANCE,
                        amount: 1,
                    }),
                ],
            })

            const updatedTile =
                SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
                    battleSquaddieId: "battleJoeTheSoldier",
                    team: undefined,
                    horizontalPosition: ActionTilePosition.ACTOR_NAME,
                    objectRepository,
                    glossary,
                })

            expect(updatedTile.glossaryLabelStack.labels).toHaveLength(2)
            expect(updatedTile.glossaryLabelStack.labels[0].title).toEqual(
                "Hustle"
            )
            expect(updatedTile.glossaryLabelStack.labels[1].title).toEqual(
                "Elusive"
            )
        })

        it("handles negative attribute modifiers", () => {
            battleSquaddie.inBattleAttributes = InBattleAttributesService.new({
                armyAttributes: ArmyAttributesService.new({
                    ...DefaultArmyAttributes,
                    maxHitPoints: 5,
                }),
                currentHitPoints: 5,
                attributeModifiers: [
                    AttributeModifierService.new({
                        type: Attribute.ARMOR,
                        source: AttributeSource.CIRCUMSTANCE,
                        amount: -2,
                        duration: 3,
                    }),
                    AttributeModifierService.new({
                        type: Attribute.MOVEMENT,
                        source: AttributeSource.MARTIAL,
                        amount: -1,
                        numberOfUses: 2,
                    }),
                ],
            })

            const updatedTile =
                SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
                    battleSquaddieId: "battleJoeTheSoldier",
                    team: undefined,
                    horizontalPosition: ActionTilePosition.ACTOR_NAME,
                    objectRepository,
                    glossary,
                })

            expect(updatedTile.glossaryLabelStack.labels).toHaveLength(2)
            expect(updatedTile.glossaryLabelStack.labels[0].title).toEqual(
                "Armor -2"
            )
            expect(updatedTile.glossaryLabelStack.labels[1].title).toEqual(
                "Movement -1"
            )
        })

        it("includes attribute source in label descriptions", () => {
            const updatedTile =
                SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
                    battleSquaddieId: "battleJoeTheSoldier",
                    team: undefined,
                    horizontalPosition: ActionTilePosition.ACTOR_NAME,
                    objectRepository,
                    glossary,
                })

            const armorLabel = updatedTile.glossaryLabelStack.labels.find(
                (label) => label.title.includes("Armor")
            )
            const hustleLabel = updatedTile.glossaryLabelStack.labels.find(
                (label) => label.title.includes("Hustle")
            )

            expect(armorLabel.description.text).toContain("Circumstance")
            expect(hustleLabel.description.text).toContain("Spiritual")
        })
    })

    describe("drawing", () => {
        let tile: SquaddieNameAndPortraitTile
        let graphicsBuffer: GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }
        const fakeImage = { width: 1, height: 1 }
        let resourceHandler: ResourceHandler

        beforeEach(() => {
            ;({ tile, objectRepository } = createSquaddieOfGivenAffiliation({
                objectRepository,
                tile,
            }))

            const glossary = new Glossary()
            const inBattleAttributes = InBattleAttributesService.new({
                armyAttributes: ArmyAttributesService.new({
                    ...DefaultArmyAttributes,
                    maxHitPoints: 5,
                }),
                currentHitPoints: 5,
                attributeModifiers: [
                    AttributeModifierService.new({
                        type: Attribute.ARMOR,
                        source: AttributeSource.CIRCUMSTANCE,
                        amount: 2,
                        duration: 3,
                    }),
                ],
            })

            const battleSquaddie = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    tile.battleSquaddieId
                )
            ).battleSquaddie
            battleSquaddie.inBattleAttributes = inBattleAttributes

            tile = SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
                battleSquaddieId: "battleJoeTheSoldier",
                team: undefined,
                horizontalPosition: ActionTilePosition.ACTOR_NAME,
                objectRepository,
                glossary,
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

        it("will draw the tileAttributeLabelStack", () => {
            let stackSpy = vi.spyOn(TileAttributeLabelStackService, "draw")
            SquaddieNameAndPortraitTileService.draw({
                tile,
                graphicsContext: graphicsBuffer,
                resourceHandler,
            })
            expect(stackSpy).toBeCalled()
            stackSpy.mockRestore()
        })

        it("will pass mouse movement events to the tileAttributeLabelStack", () => {
            let mouseMovedSpy = vi.spyOn(
                TileAttributeLabelStackService,
                "mouseMoved"
            )
            SquaddieNameAndPortraitTileService.mouseMoved({
                tile,
                mouseLocation: { x: 0, y: 0 },
            })
            expect(mouseMovedSpy).toBeCalled()
            mouseMovedSpy.mockRestore()
        })
    })
})

const createSquaddieOfGivenAffiliation = ({
    objectRepository,
    tile,
    affiliation,
}: {
    objectRepository: ObjectRepository
    tile: SquaddieNameAndPortraitTile
    affiliation?: TSquaddieAffiliation
}) => {
    objectRepository = ObjectRepositoryService.new()
    const squaddieTemplate = SquaddieTemplateService.new({
        squaddieId: SquaddieIdService.new({
            squaddieTemplateId: "JoeTheSoldier",
            name: "Joe the Soldier",
            affiliation: affiliation ?? SquaddieAffiliation.PLAYER,
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

    const glossary = new Glossary()
    tile = SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
        objectRepository,
        battleSquaddieId: "battleJoeTheSoldier",
        team: undefined,
        horizontalPosition: ActionTilePosition.ACTOR_NAME,
        glossary,
    })
    return { objectRepository, tile }
}
