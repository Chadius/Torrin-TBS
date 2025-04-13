import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../objectRepository"
import { SquaddieAffiliation } from "../../../../../squaddie/squaddieAffiliation"
import { SquaddieTemplateService } from "../../../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../../../squaddie/id"
import {
    BattleSquaddie,
    BattleSquaddieService,
} from "../../../../battleSquaddie"
import * as mocks from "../../../../../utils/test/mocks"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../../utils/test/mocks"
import { ResourceHandler } from "../../../../../resource/resourceHandler"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../../graphicsConstants"
import { ActionTilePosition } from "../actionTilePosition"
import {
    SquaddieStatusTile,
    SquaddieStatusTileService,
    SquaddieStatusTileUIObjects,
} from "./squaddieStatusTile"
import { DamageType } from "../../../../../squaddie/squaddieService"
import { InBattleAttributesService } from "../../../../stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../../../../squaddie/attribute/attributeModifier"
import { SquaddieTurnService } from "../../../../../squaddie/turn"
import {
    MissionMap,
    MissionMapService,
} from "../../../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../../../hexMap/terrainTileMap"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ProficiencyLevel } from "../../../../../squaddie/armyAttributes"
import { AttributeType } from "../../../../../squaddie/attribute/attributeType"
import { DataBlobService } from "../../../../../utils/dataBlob/dataBlob"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../../../gameEngine/gameEngine"
import { CampaignService } from "../../../../../campaign/campaign"
import { BattleStateService } from "../../../../battleState/battleState"
import { BattlePhase } from "../../../../orchestratorComponents/battlePhaseTracker"
import { BattleOrchestratorStateService } from "../../../../orchestrator/battleOrchestratorState"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../../../action/template/actionTemplate"
import { ActionResourceCostService } from "../../../../../action/actionResourceCost"
import { BattleActionDecisionStepService } from "../../../../actionDecision/battleActionDecisionStep"
import { RectArea, RectAreaService } from "../../../../../ui/rectArea"
import { DrawHorizontalMeterActionDataBlob } from "../../../horizontalBar/drawHorizontalMeterAction"

describe("Squaddie Status Tile", () => {
    let objectRepository: ObjectRepository
    let tile: SquaddieStatusTile
    let resourceHandler: ResourceHandler
    let mockP5GraphicsContext: MockedP5GraphicsBuffer
    let graphicsBufferSpies: { [key: string]: MockInstance }
    let gameEngineState: GameEngineState

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        mockP5GraphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(mockP5GraphicsContext)
        resourceHandler.loadResource = vi
            .fn()
            .mockReturnValue({ width: 1, height: 1 })
        graphicsBufferSpies = MockedGraphicsBufferService.addSpies(
            mockP5GraphicsContext
        )
        gameEngineState = GameEngineStateService.new({
            resourceHandler,
            repository: objectRepository,
            campaign: CampaignService.default(),
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.new({
                    missionMap: MissionMapService.default(),
                    campaignId: "test campaign",
                    missionId: "missionId",
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.PLAYER,
                        turnCount: 0,
                    },
                }),
            }),
        })
    })

    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
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
                affiliation,
                gameEngineState,
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

            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        })
    })

    describe("hit points and absorb", () => {
        let battleSquaddie: BattleSquaddie
        beforeEach(() => {
            ;({ tile, battleSquaddie } = createSquaddieOfGivenAffiliation({
                gameEngineState,
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
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
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
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
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
        const drawMeter = () => {
            const tile = SquaddieStatusTileService.new({
                gameEngineState,
                battleSquaddieId: "battleJoeTheSoldier",
                horizontalPosition: ActionTilePosition.ACTOR_STATUS,
            })

            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })
            return tile
        }
        describe("hit point meter", () => {
            it("should draw a meter representing the current and maximum hit points", () => {
                battleSquaddie.inBattleAttributes.currentHitPoints = 1
                const tile = drawMeter()

                const uiObjects =
                    DataBlobService.get<SquaddieStatusTileUIObjects>(
                        tile.data,
                        "uiObjects"
                    )

                const dataBlob = uiObjects.hitPoints.actionPointMeterDataBlob
                expect(
                    DataBlobService.get<number>(dataBlob, "currentValue")
                ).toEqual(1)
                expect(
                    DataBlobService.get<number>(dataBlob, "maxValue")
                ).toEqual(
                    battleSquaddie.inBattleAttributes.armyAttributes
                        .maxHitPoints
                )
            })

            it("should not glow when above 50% hit points", () => {
                battleSquaddie.inBattleAttributes.currentHitPoints = 10
                battleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints = 10
                const tile = drawMeter()
                const uiObjects =
                    DataBlobService.get<SquaddieStatusTileUIObjects>(
                        tile.data,
                        "uiObjects"
                    )

                const currentValueFillAlphaPeriod = DataBlobService.get<number>(
                    uiObjects.hitPoints.actionPointMeterDataBlob,
                    "currentValueFillAlphaPeriod"
                )
                expect(currentValueFillAlphaPeriod).toBeUndefined()
            })

            const currentValueGlowsTests = [
                {
                    name: "pulse slowly when at or under 50% hit points",
                    currentHitPoints: 5,
                    maxHitPoints: 10,
                    shouldGlowQuickly: false,
                },
                {
                    name: "pulse quickly when at or under 20% hit points",
                    currentHitPoints: 2,
                    maxHitPoints: 10,
                    shouldGlowQuickly: true,
                },
                {
                    name: "pulse slowly when when max hit points is less than 5 and current is not at full",
                    currentHitPoints: 4,
                    maxHitPoints: 5,
                    shouldGlowQuickly: false,
                },
                {
                    name: "pulse quickly when max hit points is less than 5 and current is very low",
                    currentHitPoints: 1,
                    maxHitPoints: 3,
                    shouldGlowQuickly: true,
                },
            ]

            it.each(currentValueGlowsTests)(
                `$name`,
                ({ currentHitPoints, maxHitPoints }) => {
                    battleSquaddie.inBattleAttributes.currentHitPoints =
                        currentHitPoints
                    battleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints =
                        maxHitPoints
                    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(500)
                    const tile = drawMeter()
                    const uiObjects =
                        DataBlobService.get<SquaddieStatusTileUIObjects>(
                            tile.data,
                            "uiObjects"
                        )

                    const currentValueFillAlphaPeriod =
                        DataBlobService.get<number>(
                            uiObjects.hitPoints.actionPointMeterDataBlob,
                            "currentValueFillAlphaPeriod"
                        )

                    expect(currentValueFillAlphaPeriod).not.toBeUndefined()
                    expect(dateSpy).toBeCalled()
                    dateSpy.mockRestore()
                }
            )
            it("will glow at different speeds", () => {
                const glowValues = currentValueGlowsTests.map((testInfo) => {
                    const {
                        name,
                        currentHitPoints,
                        maxHitPoints,
                        shouldGlowQuickly,
                    } = testInfo
                    battleSquaddie.inBattleAttributes.currentHitPoints =
                        currentHitPoints
                    battleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints =
                        maxHitPoints
                    const tile = drawMeter()
                    const uiObjects =
                        DataBlobService.get<SquaddieStatusTileUIObjects>(
                            tile.data,
                            "uiObjects"
                        )

                    const currentValueFillAlphaPeriod =
                        DataBlobService.get<number>(
                            uiObjects.hitPoints.actionPointMeterDataBlob,
                            "currentValueFillAlphaPeriod"
                        )

                    return {
                        name,
                        currentValueFillAlphaPeriod,
                        shouldGlowQuickly,
                    }
                })
                const glowsQuickly = glowValues.filter(
                    (val) => val.shouldGlowQuickly
                )
                const glowsSlowly = glowValues.filter(
                    (val) => !val.shouldGlowQuickly
                )

                const quickerGlowsSlowerThanSlow = glowsQuickly.reduce(
                    (errors, glowQuick) => {
                        const slowIsFasterThanQuickly = glowsSlowly.filter(
                            (glowSlow) =>
                                glowSlow.currentValueFillAlphaPeriod <=
                                glowQuick.currentValueFillAlphaPeriod
                        )
                        if (slowIsFasterThanQuickly.length === 0) return errors
                        return [
                            ...errors,
                            ...slowIsFasterThanQuickly.map((glowSlow) => ({
                                shouldBeQuicker: {
                                    name: glowQuick.name,
                                    period: glowQuick.currentValueFillAlphaPeriod,
                                },
                                butSlowerThan: {
                                    name: glowSlow.name,
                                    period: glowSlow.currentValueFillAlphaPeriod,
                                },
                            })),
                        ]
                    },
                    []
                )

                expect(quickerGlowsSlowerThanSlow).toHaveLength(0)
            })

            const segmentValueTests = [
                {
                    name: "1 HP should always have a segment divider",
                    currentHitPoints: 1,
                    maxHitPoints: 3,
                    expectedVerticalLineValueLocations: [1],
                },
                {
                    name: "Less than 10 Max HP has 1 per HP",
                    currentHitPoints: 10,
                    maxHitPoints: 10,
                    expectedVerticalLineValueLocations: [
                        1, 2, 3, 4, 5, 6, 7, 8, 9,
                    ],
                },
                {
                    name: "More than 10 HP will have a segment per 5 until the last 5",
                    currentHitPoints: 7,
                    maxHitPoints: 15,
                    expectedVerticalLineValueLocations: [
                        1, 5, 10, 11, 12, 13, 14,
                    ],
                },
            ]

            it.each(segmentValueTests)(
                `$name`,
                ({
                    currentHitPoints,
                    maxHitPoints,
                    expectedVerticalLineValueLocations,
                }) => {
                    battleSquaddie.inBattleAttributes.currentHitPoints =
                        currentHitPoints
                    battleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints =
                        maxHitPoints
                    const tile = drawMeter()

                    const uiObjects =
                        DataBlobService.get<SquaddieStatusTileUIObjects>(
                            tile.data,
                            "uiObjects"
                        )

                    const drawingArea = DataBlobService.get<RectArea>(
                        uiObjects.hitPoints.actionPointMeterDataBlob,
                        "drawingArea"
                    )
                    const outlineStrokeBorder =
                        DataBlobService.get<number>(
                            uiObjects.hitPoints.actionPointMeterDataBlob,
                            "outlineStrokeWeight"
                        ) ?? 0

                    const topOfLine =
                        RectAreaService.top(drawingArea) + outlineStrokeBorder

                    const getXValuesOfVerticalLineCalls = (): number[] =>
                        graphicsBufferSpies["line"].mock.calls
                            .filter(
                                (args) =>
                                    args.length == 4 &&
                                    args[0] == args[2] &&
                                    args[1] == topOfLine
                            )
                            .map((args) => args[0])

                    const verticalLines = getXValuesOfVerticalLineCalls()

                    const expectedHorizontalPositions =
                        expectedVerticalLineValueLocations.map((value) => {
                            const left = RectAreaService.left(drawingArea)
                            const width = RectAreaService.width(drawingArea)
                            return left + (width * value) / maxHitPoints
                        })

                    expect(verticalLines).toHaveLength(
                        expectedHorizontalPositions.length
                    )
                    for (let i = 0; i < verticalLines.length; i++) {
                        expect(verticalLines[i]).toBeCloseTo(
                            expectedHorizontalPositions[i]
                        )
                    }
                }
            )
        })

        describe("will draw a bar for absorb hit points", () => {
            let absorbBar: DrawHorizontalMeterActionDataBlob
            let hitPointBar: DrawHorizontalMeterActionDataBlob
            let maxHitPoints: number = 5
            let absorbPoints: number = 2

            beforeEach(() => {
                battleSquaddie.inBattleAttributes.currentHitPoints =
                    maxHitPoints
                battleSquaddie.inBattleAttributes.armyAttributes.maxHitPoints =
                    maxHitPoints
                InBattleAttributesService.addActiveAttributeModifier(
                    battleSquaddie.inBattleAttributes,
                    AttributeModifierService.new({
                        type: AttributeType.ABSORB,
                        amount: absorbPoints,
                        source: AttributeSource.CIRCUMSTANCE,
                    })
                )
                const tile = drawMeter()
                const uiObjects =
                    DataBlobService.get<SquaddieStatusTileUIObjects>(
                        tile.data,
                        "uiObjects"
                    )
                absorbBar = uiObjects.hitPoints.absorbBar
                hitPointBar = uiObjects.hitPoints.actionPointMeterDataBlob
            })
            it("will expect the width to be proportional to the hit point bar", () => {
                const absorbBarDrawingArea = DataBlobService.get<RectArea>(
                    absorbBar,
                    "drawingArea"
                )

                const hitPointBarDrawingArea = DataBlobService.get<RectArea>(
                    hitPointBar,
                    "drawingArea"
                )
                expect(RectAreaService.width(absorbBarDrawingArea)).toBeCloseTo(
                    (RectAreaService.width(hitPointBarDrawingArea) *
                        absorbPoints) /
                        maxHitPoints
                )
            })
            it("will draw 1 vertical segment per absorb", () => {
                expect(
                    DataBlobService.get<number>(
                        absorbBar,
                        "currentValueSegmentDivisionInterval"
                    )
                ).toEqual(1)
            })
        })
    })

    describe("action points", () => {
        let battleSquaddie: BattleSquaddie
        let actionCosts1ActionPoint: ActionTemplate

        beforeEach(() => {
            const squaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "JoeTheSoldier",
                    name: "Joe the Soldier",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
            })
            battleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: "battleJoeTheSoldier",
                squaddieTemplateId: "JoeTheSoldier",
            })

            ObjectRepositoryService.addSquaddie({
                repo: gameEngineState.repository,
                squaddieTemplate: squaddieTemplate,
                battleSquaddie: battleSquaddie,
            })

            actionCosts1ActionPoint = ActionTemplateService.new({
                id: "action costs 1 action point",
                name: "action costs 1 action point",
                resourceCost: ActionResourceCostService.new({
                    actionPoints: 1,
                }),
            })

            ObjectRepositoryService.addActionTemplate(
                gameEngineState.repository,
                actionCosts1ActionPoint
            )

            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: "battleJoeTheSoldier",
            })
        })
        it("should draw the current number of action points", () => {
            SquaddieTurnService.spendActionPointsForMovement({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionPoints: 1,
            })
            const tile = SquaddieStatusTileService.new({
                gameEngineState,
                battleSquaddieId: "battleJoeTheSoldier",
                horizontalPosition: ActionTilePosition.ACTOR_STATUS,
            })
            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
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
        it("should draw a meter representing the current action points when the user considers an action", () => {
            SquaddieTurnService.spendActionPointsForMovement({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionPoints: 1,
            })
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.actionTemplateId =
                "action costs 1 action point"
            const tile = SquaddieStatusTileService.new({
                gameEngineState,
                battleSquaddieId: "battleJoeTheSoldier",
                horizontalPosition: ActionTilePosition.ACTOR_STATUS,
            })

            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
                tile.data,
                "uiObjects"
            )

            const dataBlob = uiObjects.actionPoints.actionPointMeterDataBlob
            expect(
                DataBlobService.get<number>(dataBlob, "currentValue")
            ).toEqual(2)
            expect(
                DataBlobService.get<number>(dataBlob, "highlightedValue")
            ).toEqual(1)
            expect(DataBlobService.get<number>(dataBlob, "maxValue")).toEqual(3)
        })

        it("should empty the meter when player considers ending the turn", () => {
            SquaddieTurnService.spendActionPointsForMovement({
                squaddieTurn: battleSquaddie.squaddieTurn,
                actionPoints: 2,
            })
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.endTurn =
                true
            const tile = SquaddieStatusTileService.new({
                gameEngineState,
                battleSquaddieId: "battleJoeTheSoldier",
                horizontalPosition: ActionTilePosition.ACTOR_STATUS,
            })

            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
                tile.data,
                "uiObjects"
            )

            const dataBlob = uiObjects.actionPoints.actionPointMeterDataBlob
            expect(
                DataBlobService.get<number>(dataBlob, "currentValue")
            ).toEqual(1)
            expect(
                DataBlobService.get<number>(dataBlob, "highlightedValue")
            ).toEqual(1)
        })

        it("should mark points when player considers moving", () => {
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.movement =
                {
                    coordinates: [],
                    destination: { q: 0, r: 0 },
                    actionPointCost: 2,
                }

            const tile = SquaddieStatusTileService.new({
                gameEngineState,
                battleSquaddieId: "battleJoeTheSoldier",
                horizontalPosition: ActionTilePosition.ACTOR_STATUS,
            })

            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
            })

            SquaddieStatusTileService.draw({
                tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            const uiObjects = DataBlobService.get<SquaddieStatusTileUIObjects>(
                tile.data,
                "uiObjects"
            )

            const dataBlob = uiObjects.actionPoints.actionPointMeterDataBlob
            expect(
                DataBlobService.get<number>(dataBlob, "currentValue")
            ).toEqual(3)
            expect(
                DataBlobService.get<number>(dataBlob, "highlightedValue")
            ).toEqual(2)
        })
    })

    describe("movement", () => {
        let battleSquaddie: BattleSquaddie
        beforeEach(() => {
            ;({ tile, battleSquaddie } = createSquaddieOfGivenAffiliation({
                gameEngineState,
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
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
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
                gameEngineState,
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
            gameEngineState.battleOrchestratorState.battleState.missionMap =
                missionMap
            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
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
                gameEngineState,
                affiliation: SquaddieAffiliation.PLAYER,
            }))
        })
        it("should draw the armor class for the squaddie", () => {
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
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
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
                gameEngineState,
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
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
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
                    name: "Hustle",
                    attributeType: AttributeType.HUSTLE,
                    expectedIconKey: "attribute-icon-hustle",
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
                        missionMap:
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap,
                        playerConsideredActions:
                            gameEngineState.battleOrchestratorState.battleState
                                .playerConsideredActions,
                        battleActionDecisionStep:
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionDecisionStep,
                        objectRepository: gameEngineState.repository,
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
                        missionMap:
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap,
                        playerConsideredActions:
                            gameEngineState.battleOrchestratorState.battleState
                                .playerConsideredActions,
                        battleActionDecisionStep:
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionDecisionStep,
                        objectRepository: gameEngineState.repository,
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
            const ignoreTerrainCostAttributeIcon = "attribute-icon-hustle"

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
                    type: AttributeType.HUSTLE,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 1,
                })
            )

            SquaddieStatusTileService.updateTileUsingSquaddie({
                tile,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                playerConsideredActions:
                    gameEngineState.battleOrchestratorState.battleState
                        .playerConsideredActions,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                objectRepository: gameEngineState.repository,
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
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    playerConsideredActions:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerConsideredActions,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    objectRepository: gameEngineState.repository,
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
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    playerConsideredActions:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerConsideredActions,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    objectRepository: gameEngineState.repository,
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

const createSquaddieOfGivenAffiliation = ({
    gameEngineState,
    affiliation,
}: {
    gameEngineState: GameEngineState
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
        repo: gameEngineState.repository,
        squaddieTemplate: squaddieTemplate,
        battleSquaddie: battleSquaddie,
    })

    const tile = SquaddieStatusTileService.new({
        gameEngineState,
        battleSquaddieId: "battleJoeTheSoldier",
        horizontalPosition: ActionTilePosition.ACTOR_STATUS,
    })
    return { tile, battleSquaddie }
}
