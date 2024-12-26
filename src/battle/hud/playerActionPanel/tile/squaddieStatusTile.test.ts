import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import { SquaddieTemplateService } from "../../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../../squaddie/id"
import { BattleSquaddie, BattleSquaddieService } from "../../../battleSquaddie"
import * as mocks from "../../../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../../../utils/test/mocks"
import { ResourceHandler } from "../../../../resource/resourceHandler"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../graphicsConstants"
import { ActionTilePosition } from "./actionTilePosition"
import {
    SquaddieStatusTile,
    SquaddieStatusTileService,
} from "./squaddieStatusTile"
import { DamageType } from "../../../../squaddie/squaddieService"
import { InBattleAttributesService } from "../../../stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "../../../../squaddie/attributeModifier"
import { SquaddieTurnService } from "../../../../squaddie/turn"
import {
    MissionMap,
    MissionMapService,
} from "../../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../../hexMap/terrainTileMap"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ProficiencyLevel } from "../../../../squaddie/armyAttributes"

describe("Squaddie Status Tile", () => {
    let objectRepository: ObjectRepository
    let tile: SquaddieStatusTile
    let resourceHandler: ResourceHandler
    let mockP5GraphicsContext: MockedP5GraphicsBuffer
    let graphicsBufferSpies: { [key: string]: MockInstance }

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        mockP5GraphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(mockP5GraphicsContext)
        resourceHandler.loadResource = vi
            .fn()
            .mockReturnValue({ width: 1, height: 1 })
        graphicsBufferSpies = {}
        graphicsBufferSpies["text"] = vi
            .spyOn(mockP5GraphicsContext, "text")
            .mockReturnValue()
        graphicsBufferSpies["image"] = vi
            .spyOn(mockP5GraphicsContext, "image")
            .mockReturnValue()
        graphicsBufferSpies["rect"] = vi
            .spyOn(mockP5GraphicsContext, "rect")
            .mockReturnValue()
        graphicsBufferSpies["fill"] = vi
            .spyOn(mockP5GraphicsContext, "fill")
            .mockReturnValue()
        graphicsBufferSpies["textWidth"] = vi
            .spyOn(mockP5GraphicsContext, "textWidth")
            .mockReturnValue(10)
    })

    afterEach(() => {
        resetSpies(graphicsBufferSpies)
    })

    describe("background color set by affiliation", () => {
        const tests = [
            {
                affiliation: SquaddieAffiliation.PLAYER,
            },
            {
                affiliation: SquaddieAffiliation.ENEMY,
            },
            {
                affiliation: SquaddieAffiliation.ALLY,
            },
            {
                affiliation: SquaddieAffiliation.NONE,
            },
        ]

        it.each(tests)(`$affiliation`, ({ affiliation }) => {
            ;({ tile } = createSquaddieOfGivenAffiliation({
                objectRepository,
                affiliation,
            }))

            resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(false)
            SquaddieStatusTileService.draw({
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

            resetSpies(graphicsBufferSpies)
        })
    })

    describe("hit points and absorb", () => {
        let battleSquaddie: BattleSquaddie
        beforeEach(() => {
            ;({ tile, battleSquaddie } = createSquaddieOfGivenAffiliation({
                objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
            }))
        })
        it("should draw the maximum number of hit points", () => {
            InBattleAttributesService.takeDamage({
                inBattleAttributes: battleSquaddie.inBattleAttributes,
                damageToTake: 1,
                damageType: DamageType.UNKNOWN,
            })
            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                objectRepository,
                graphicsContext: mockP5GraphicsContext,
                missionMap: MissionMapService.default(),
                resourceHandler,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(graphicsBufferSpies["text"]).toBeCalledWith(
                expect.stringMatching(
                    `HP ${battleSquaddie.inBattleAttributes.currentHitPoints}/${battleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints}`
                ),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
        })
        it("should draw the amount of absorb", () => {
            const absorb1Damage = AttributeModifierService.new({
                type: AttributeType.ABSORB,
                amount: 1,
                source: AttributeSource.CIRCUMSTANCE,
            })
            InBattleAttributesService.addActiveAttributeModifier(
                battleSquaddie.inBattleAttributes,
                absorb1Damage
            )
            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                objectRepository,
                graphicsContext: mockP5GraphicsContext,
                missionMap: MissionMapService.default(),
                resourceHandler,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(graphicsBufferSpies["text"]).toBeCalledWith(
                expect.stringContaining(
                    `HP ${battleSquaddie.inBattleAttributes.currentHitPoints} + 1/${battleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints}`
                ),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
        })
    })

    describe("action points", () => {
        let battleSquaddie: BattleSquaddie
        beforeEach(() => {
            ;({ tile, battleSquaddie } = createSquaddieOfGivenAffiliation({
                objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
            }))
        })
        it("should draw the current number of action points", () => {
            SquaddieTurnService.spendActionPoints(
                battleSquaddie.squaddieTurn,
                1
            )
            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                objectRepository,
                graphicsContext: mockP5GraphicsContext,
                missionMap: MissionMapService.default(),
                resourceHandler,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(graphicsBufferSpies["text"]).toBeCalledWith(
                expect.stringMatching(`AP 2`),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
        })
    })

    describe("movement", () => {
        let battleSquaddie: BattleSquaddie
        beforeEach(() => {
            ;({ tile, battleSquaddie } = createSquaddieOfGivenAffiliation({
                objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
            }))
        })
        it("should draw the amount of movement", () => {
            const increaseMovementBy1 = AttributeModifierService.new({
                type: AttributeType.MOVEMENT,
                amount: 3,
                source: AttributeSource.CIRCUMSTANCE,
            })
            InBattleAttributesService.addActiveAttributeModifier(
                battleSquaddie.inBattleAttributes,
                increaseMovementBy1
            )

            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                objectRepository,
                graphicsContext: mockP5GraphicsContext,
                missionMap: MissionMapService.default(),
                resourceHandler,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(graphicsBufferSpies["text"]).toBeCalledWith(
                expect.stringContaining(`Move 2 +3`),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
        })
    })

    describe("coordinate", () => {
        let battleSquaddie: BattleSquaddie
        let missionMap: MissionMap
        beforeEach(() => {
            ;({ tile, battleSquaddie } = createSquaddieOfGivenAffiliation({
                objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
            }))
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 2 "],
                }),
            })
        })
        it("should draw the current coordinate for the squaddie", () => {
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                squaddieTemplateId: battleSquaddie.squaddieTemplateId,
                coordinate: { q: 0, r: 2 },
            })

            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                objectRepository,
                missionMap,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(graphicsBufferSpies["text"]).toBeCalledWith(
                expect.stringMatching(`(0, 2)`),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
        })
    })

    describe("defenses", () => {
        let battleSquaddie: BattleSquaddie
        beforeEach(() => {
            ;({ tile, battleSquaddie } = createSquaddieOfGivenAffiliation({
                objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
            }))
        })
        it("should draw the armor class for the squaddie", () => {
            battleSquaddie.inBattleAttributes.armyAttributes.armorClass = 5
            battleSquaddie.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.NOVICE,
                base: -2,
            }
            battleSquaddie.inBattleAttributes.armyAttributes.tier = 1
            InBattleAttributesService.addActiveAttributeModifier(
                battleSquaddie.inBattleAttributes,
                AttributeModifierService.new({
                    type: AttributeType.ARMOR,
                    amount: 2,
                    source: AttributeSource.CIRCUMSTANCE,
                })
            )
            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                objectRepository,
                missionMap: MissionMapService.default(),
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(graphicsBufferSpies["text"]).toBeCalledWith(
                expect.stringContaining(`Armor 6 +2`),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
        })
    })

    describe("attribute modifiers", () => {
        let getResourceSpy: MockInstance
        let battleSquaddie: BattleSquaddie
        const fakeImage = { width: 1, height: 1 }

        beforeEach(() => {
            ;({ tile, battleSquaddie } = createSquaddieOfGivenAffiliation({
                objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
            }))

            resourceHandler.getResource = vi.fn().mockReturnValue(fakeImage)
            getResourceSpy = vi.spyOn(resourceHandler, "getResource")
        })

        afterEach(() => {
            getResourceSpy.mockRestore()
        })

        it("will not draw attribute modifier icons until it loads", () => {
            const armorAttributeIcon = "attribute-icon-armor"
            const isResourceLoadedSpy = (resourceHandler.isResourceLoaded = vi
                .fn()
                .mockReturnValue(false))

            InBattleAttributesService.addActiveAttributeModifier(
                battleSquaddie.inBattleAttributes,
                AttributeModifierService.new({
                    type: AttributeType.ARMOR,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 1,
                })
            )

            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                objectRepository,
                missionMap: MissionMapService.default(),
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(isResourceLoadedSpy).toBeCalledWith(armorAttributeIcon)
            expect(graphicsBufferSpies["image"]).not.toBeCalled()

            resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(true)

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(getResourceSpy).toBeCalledWith(armorAttributeIcon)
            expect(graphicsBufferSpies["image"]).toBeCalled()

            const drawSpyCalls = graphicsBufferSpies["image"].mock.calls
            expect(
                drawSpyCalls.some((call) => call[0] === fakeImage)
            ).toBeTruthy()

            isResourceLoadedSpy.mockRestore()
        })

        describe("will draw the attribute icon", () => {
            const drawAttributeTests = [
                {
                    name: "Armor",
                    attributeType: AttributeType.ARMOR,
                    expectedIconKey: "attribute-icon-armor",
                },
                {
                    name: "Movement",
                    attributeType: AttributeType.MOVEMENT,
                    expectedIconKey: "attribute-icon-movement",
                },
                {
                    name: "Ignore Terrain Cost",
                    attributeType: AttributeType.IGNORE_TERRAIN_COST,
                    expectedIconKey: "attribute-icon-ignore-terrain-cost",
                },
                {
                    name: "Elusive",
                    attributeType: AttributeType.ELUSIVE,
                    expectedIconKey: "attribute-icon-elusive",
                },
            ]

            it.each(drawAttributeTests)(
                `$name`,
                ({ attributeType, expectedIconKey }) => {
                    const isResourceLoadedSpy =
                        (resourceHandler.isResourceLoaded = vi
                            .fn()
                            .mockImplementation(
                                (resourceKey: string) =>
                                    resourceKey === expectedIconKey
                            ))

                    InBattleAttributesService.addActiveAttributeModifier(
                        battleSquaddie.inBattleAttributes,
                        AttributeModifierService.new({
                            type: attributeType,
                            source: AttributeSource.CIRCUMSTANCE,
                            amount: 1,
                        })
                    )

                    SquaddieStatusTileService.updateTileUsingSquaddie({
                        tile,
                        objectRepository,
                        missionMap: MissionMapService.default(),
                        graphicsContext: mockP5GraphicsContext,
                        resourceHandler,
                    })

                    SquaddieStatusTileService.draw({
                        tile,
                        graphicsContext: mockP5GraphicsContext,
                        resourceHandler,
                    })

                    expect(isResourceLoadedSpy).toBeCalledWith(expectedIconKey)
                    expect(graphicsBufferSpies["image"]).toBeCalled()

                    const drawSpyCalls = graphicsBufferSpies["image"].mock.calls
                    expect(
                        drawSpyCalls.some((call) => call[0] === fakeImage)
                    ).toBeTruthy()
                    isResourceLoadedSpy.mockRestore()
                }
            )
        })

        describe("will draw comparison icons to show the amount of an attribute modifier", () => {
            const armorAttributeIcon = "attribute-icon-armor"
            const drawAmountTests: {
                name: string
                amount: number
                expectedComparisonIconResourceKey: string
                expectedText: string
            }[] = [
                {
                    name: "+1",
                    amount: 1,
                    expectedComparisonIconResourceKey: "attribute-up",
                    expectedText: "\\+1",
                },
                {
                    name: "-3",
                    amount: -3,
                    expectedComparisonIconResourceKey: "attribute-down",
                    expectedText: "-3",
                },
            ]

            it.each(drawAmountTests)(
                `$name`,
                ({
                    amount,
                    expectedText,
                    expectedComparisonIconResourceKey,
                }) => {
                    expect(amount).not.toEqual(0)

                    let fakeAttributeImage = { width: 1, height: 1 }
                    let fakeComparisonImage = { width: 2, height: 2 }
                    resourceHandler.getResource = vi
                        .fn()
                        .mockImplementation((key) => {
                            if (key === armorAttributeIcon) {
                                return fakeAttributeImage
                            }
                            return fakeComparisonImage
                        })
                    getResourceSpy = vi.spyOn(resourceHandler, "getResource")
                    const isResourceLoadedSpy =
                        (resourceHandler.isResourceLoaded = vi
                            .fn()
                            .mockReturnValue(true))

                    InBattleAttributesService.addActiveAttributeModifier(
                        battleSquaddie.inBattleAttributes,
                        AttributeModifierService.new({
                            type: AttributeType.ARMOR,
                            source: AttributeSource.CIRCUMSTANCE,
                            amount,
                        })
                    )

                    SquaddieStatusTileService.updateTileUsingSquaddie({
                        tile,
                        objectRepository,
                        missionMap: MissionMapService.default(),
                        graphicsContext: mockP5GraphicsContext,
                        resourceHandler,
                    })

                    SquaddieStatusTileService.draw({
                        tile,
                        graphicsContext: mockP5GraphicsContext,
                        resourceHandler,
                    })

                    expect(isResourceLoadedSpy).toBeCalledWith(
                        expectedComparisonIconResourceKey
                    )
                    expect(getResourceSpy).toBeCalledWith(
                        expectedComparisonIconResourceKey
                    )

                    expect(graphicsBufferSpies["image"]).toBeCalled()

                    const drawSpyCalls = graphicsBufferSpies["image"].mock.calls
                    expect(
                        drawSpyCalls.some(
                            (call) =>
                                call[0].width === fakeComparisonImage.width
                        )
                    ).toBeTruthy()

                    expect(graphicsBufferSpies["text"]).toBeCalledWith(
                        expect.stringMatching(expectedText),
                        expect.anything(),
                        expect.anything(),
                        expect.anything(),
                        expect.anything()
                    )
                }
            )
        })

        it("will not draw comparison icons for binary attributes", () => {
            const ignoreTerrainCostAttributeIcon =
                "attribute-icon-ignore-terrain-cost"

            let fakeAttributeImage = { width: 1, height: 1 }
            let fakeComparisonImage = { width: 2, height: 2 }
            resourceHandler.getResource = vi.fn().mockImplementation((key) => {
                if (key === ignoreTerrainCostAttributeIcon) {
                    return fakeAttributeImage
                }
                return fakeComparisonImage
            })
            getResourceSpy = vi.spyOn(resourceHandler, "getResource")
            const isResourceLoadedSpy = (resourceHandler.isResourceLoaded = vi
                .fn()
                .mockReturnValue(true))

            InBattleAttributesService.addActiveAttributeModifier(
                battleSquaddie.inBattleAttributes,
                AttributeModifierService.new({
                    type: AttributeType.IGNORE_TERRAIN_COST,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 1,
                })
            )

            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                objectRepository,
                missionMap: MissionMapService.default(),
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(isResourceLoadedSpy).not.toBeCalledWith("attribute-up")
            expect(getResourceSpy).not.toBeCalledWith("attribute-up")

            expect(graphicsBufferSpies["image"]).toBeCalled()

            const drawSpyCalls = graphicsBufferSpies["image"].mock.calls
            expect(
                drawSpyCalls.some(
                    (call) => call[0].width === fakeComparisonImage.width
                )
            ).toBeFalsy()

            const textSpyCalls = graphicsBufferSpies["text"].mock.calls
            expect(textSpyCalls.some((call) => call[0] === "+1")).toBeFalsy()
        })

        describe("maintain icons since previous update", () => {
            let fakeAttributeImage = {
                width: 1,
                height: 1,
            }
            let fakeComparisonImage = {
                width: 2,
                height: 2,
            }

            beforeEach(() => {
                InBattleAttributesService.addActiveAttributeModifier(
                    battleSquaddie.inBattleAttributes,
                    AttributeModifierService.new({
                        type: AttributeType.ARMOR,
                        source: AttributeSource.CIRCUMSTANCE,
                        amount: 1,
                        duration: 1,
                    })
                )

                resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(true)
                resourceHandler.getResource = vi
                    .fn()
                    .mockImplementation((key) => {
                        if (key.includes("attribute-icon")) {
                            return fakeAttributeImage
                        }
                        return fakeComparisonImage
                    })
                getResourceSpy = vi.spyOn(resourceHandler, "getResource")

                SquaddieStatusTileService.updateTileUsingSquaddie({
                    tile,
                    objectRepository,
                    missionMap: MissionMapService.default(),
                    graphicsContext: mockP5GraphicsContext,
                    resourceHandler,
                })

                SquaddieStatusTileService.draw({
                    tile,
                    graphicsContext: mockP5GraphicsContext,
                    resourceHandler,
                })
            })
            it("will remove icons and not draw them again if the duration expires", () => {
                InBattleAttributesService.decreaseModifiersBy1Round(
                    battleSquaddie.inBattleAttributes
                )

                graphicsBufferSpies["image"].mockClear()

                SquaddieStatusTileService.updateTileUsingSquaddie({
                    tile,
                    objectRepository,
                    missionMap: MissionMapService.default(),
                    graphicsContext: mockP5GraphicsContext,
                    resourceHandler,
                })

                SquaddieStatusTileService.draw({
                    tile,
                    graphicsContext: mockP5GraphicsContext,
                    resourceHandler,
                })

                const drawSpyCalls = graphicsBufferSpies["image"].mock.calls
                expect(
                    drawSpyCalls.some((call) =>
                        [fakeAttributeImage, fakeComparisonImage].includes(
                            call[0]
                        )
                    )
                ).toBeFalsy()
            })
        })
    })
})

const resetSpies = (spies: { [key: string]: MockInstance }) => {
    Object.values(spies ?? {}).forEach((spy) => {
        spy.mockRestore()
    })
}

const createSquaddieOfGivenAffiliation = ({
    objectRepository,
    affiliation,
}: {
    objectRepository: ObjectRepository
    affiliation?: SquaddieAffiliation
}) => {
    const squaddieTemplate = SquaddieTemplateService.new({
        squaddieId: SquaddieIdService.new({
            templateId: "JoeTheSoldier",
            name: "Joe the Soldier",
            affiliation: affiliation ?? SquaddieAffiliation.PLAYER,
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

    const tile = SquaddieStatusTileService.new({
        objectRepository,
        battleSquaddieId: "battleJoeTheSoldier",
        horizontalPosition: ActionTilePosition.ACTOR_STATUS,
    })
    return { tile, battleSquaddie }
}
