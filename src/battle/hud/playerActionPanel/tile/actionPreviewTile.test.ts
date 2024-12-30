import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../../action/template/actionTemplate"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import {
    ActionPreviewTile,
    ActionPreviewTileService,
} from "./actionPreviewTile"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../../gameEngine/gameEngine"
import { SquaddieRepositoryService } from "../../../../utils/test/squaddie"
import { ActionEffectTemplateService } from "../../../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../../trait/traitStatusStorage"
import { DamageType } from "../../../../squaddie/squaddieService"

import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../utils/test/mocks"
import { BattleOrchestratorStateService } from "../../../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../../orchestrator/battleState"
import { CampaignService } from "../../../../campaign/campaign"
import {
    MissionMap,
    MissionMapService,
} from "../../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../../hexMap/terrainTileMap"
import { BattleActionDecisionStepService } from "../../../actionDecision/battleActionDecisionStep"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ActionCalculator } from "../../../calculator/actionCalculator/calculator"
import { DegreeOfSuccess } from "../../../calculator/actionCalculator/degreeOfSuccess"
import {
    ActionEffectChangesService,
    CalculatedResultService,
} from "../../../history/calculatedResult"
import { BattleActionActorContextService } from "../../../history/battleAction/battleActionActorContext"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../../../history/battleAction/battleActionSquaddieChange"

describe("Action Preview Tile", () => {
    let objectRepository: ObjectRepository
    let actionTemplateNeedsToHit: ActionTemplate
    let gameEngineState: GameEngineState
    let tile: ActionPreviewTile

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        actionTemplateNeedsToHit = ActionTemplateService.new({
            id: "actionTemplateNeedsToHit",
            name: "Action needs to hit",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.TARGET_FOE]: true,
                        [Trait.ATTACK]: true,
                    }),
                    damageDescriptions: {
                        [DamageType.BODY]: 2,
                    },
                }),
            ],
            buttonIconResourceKey: "button-icon-resource-key",
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplateNeedsToHit
        )

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "player",
            templateId: "player_0",
            battleId: "player_0",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository,
            actionTemplateIds: ["actionTemplateNeedsToHit"],
        })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "enemy name",
            templateId: "enemy_0",
            battleId: "enemy_0",
            affiliation: SquaddieAffiliation.ENEMY,
            objectRepository,
            actionTemplateIds: ["actionTemplateNeedsToHit"],
        })
    })

    describe("drawing", () => {
        let graphicsBuffer: GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }
        let missionMap: MissionMap

        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 "],
                }),
            })

            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: "player_0",
                squaddieTemplateId: "player_0",
                coordinate: { q: 0, r: 0 },
            })

            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: "enemy_0",
                squaddieTemplateId: "enemy name",
                coordinate: { q: 0, r: 1 },
            })

            gameEngineState = GameEngineStateService.new({
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        campaignId: "test campaign",
                        missionId: "test mission",
                        missionMap,
                    }),
                }),
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            const actionStep = BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionStep,
                battleSquaddieId: "player_0",
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionStep,
                actionTemplateId: "actionTemplateNeedsToHit",
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionStep,
                targetCoordinate: { q: 0, r: 1 },
            })
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                actionStep

            tile = ActionPreviewTileService.new({
                gameEngineState,
                objectRepository,
            })
            graphicsBuffer = new MockedP5GraphicsBuffer()
            graphicsBufferSpies =
                MockedGraphicsBufferService.addSpies(graphicsBuffer)
        })

        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        })

        it("will draw the background", () => {
            ActionPreviewTileService.draw({
                tile: tile,
                graphicsContext: graphicsBuffer,
            })
            expect(graphicsBufferSpies["rect"]).toBeCalled()
        })

        it("will text the name of the target", () => {
            ActionPreviewTileService.draw({
                tile: tile,
                graphicsContext: graphicsBuffer,
            })

            expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                "enemy name"
            )
        })

        describe("chance of degrees of success", () => {
            it("will text the chance to crit", () => {
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })
                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "3% crit"
                )
            })
            it("will text the chance to hit", () => {
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "69% hit"
                )
            })
            it("will text the chance to miss if there is an effect", () => {
                const forecastSpy = vi
                    .spyOn(ActionCalculator, "forecastResults")
                    .mockReturnValue(
                        CalculatedResultService.new({
                            actorBattleSquaddieId: "player_0",
                            changesPerEffect: [
                                ActionEffectChangesService.new({
                                    actorContext:
                                        BattleActionActorContextService.new({}),
                                    squaddieChanges: [
                                        BattleActionSquaddieChangeService.new({
                                            battleSquaddieId: "enemy_0",
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.FAILURE,
                                            damageExplanation:
                                                DamageExplanationService.new({
                                                    raw: 1,
                                                    absorbed: 0,
                                                    net: 1,
                                                }),
                                            chanceOfDegreeOfSuccess: 36,
                                        }),
                                    ],
                                }),
                            ],
                        })
                    )

                tile = ActionPreviewTileService.new({
                    gameEngineState,
                    objectRepository,
                })

                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "100% miss"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
            it("will text the chance to critically miss if there is an effect", () => {
                const forecastSpy = vi
                    .spyOn(ActionCalculator, "forecastResults")
                    .mockReturnValue(
                        CalculatedResultService.new({
                            actorBattleSquaddieId: "player_0",
                            changesPerEffect: [
                                ActionEffectChangesService.new({
                                    actorContext:
                                        BattleActionActorContextService.new({}),
                                    squaddieChanges: [
                                        BattleActionSquaddieChangeService.new({
                                            battleSquaddieId: "enemy_0",
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.CRITICAL_FAILURE,
                                            damageExplanation:
                                                DamageExplanationService.new({
                                                    raw: 1,
                                                    absorbed: 0,
                                                    net: 1,
                                                }),
                                            chanceOfDegreeOfSuccess: 36,
                                        }),
                                    ],
                                }),
                            ],
                        })
                    )

                tile = ActionPreviewTileService.new({
                    gameEngineState,
                    objectRepository,
                })

                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "100% botch"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
        })

        it("will not text a forecast if it has no effect", () => {
            const forecastSpy = vi
                .spyOn(ActionCalculator, "forecastResults")
                .mockReturnValue(
                    CalculatedResultService.new({
                        actorBattleSquaddieId: "player_0",
                        changesPerEffect: [
                            ActionEffectChangesService.new({
                                actorContext:
                                    BattleActionActorContextService.new({}),
                                squaddieChanges: [
                                    BattleActionSquaddieChangeService.new({
                                        battleSquaddieId: "enemy_0",
                                        actorDegreeOfSuccess:
                                            DegreeOfSuccess.FAILURE,
                                        damageExplanation:
                                            DamageExplanationService.new({
                                                raw: 0,
                                                absorbed: 0,
                                                net: 0,
                                            }),
                                        chanceOfDegreeOfSuccess: 36,
                                    }),
                                ],
                            }),
                        ],
                    })
                )

            tile = ActionPreviewTileService.new({
                gameEngineState,
                objectRepository,
            })

            ActionPreviewTileService.draw({
                tile: tile,
                graphicsContext: graphicsBuffer,
            })

            expect(getAllDrawnText(graphicsBufferSpies["text"])).not.includes(
                "100% miss"
            )
            expect(forecastSpy).toBeCalled()
            forecastSpy.mockRestore()
        })

        describe("draw damage", () => {
            it("will text damage dealt", () => {
                const forecastSpy = vi
                    .spyOn(ActionCalculator, "forecastResults")
                    .mockReturnValue(
                        CalculatedResultService.new({
                            actorBattleSquaddieId: "player_0",
                            changesPerEffect: [
                                ActionEffectChangesService.new({
                                    actorContext:
                                        BattleActionActorContextService.new({}),
                                    squaddieChanges: [
                                        BattleActionSquaddieChangeService.new({
                                            battleSquaddieId: "enemy_0",
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.SUCCESS,
                                            damageExplanation:
                                                DamageExplanationService.new({
                                                    raw: 0,
                                                    absorbed: 0,
                                                    net: 1,
                                                }),
                                            chanceOfDegreeOfSuccess: 36,
                                        }),
                                    ],
                                }),
                            ],
                        })
                    )

                tile = ActionPreviewTileService.new({
                    gameEngineState,
                    objectRepository,
                })

                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "1 damage"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
            it("will text NO DAMAGE if the attack hits but deals 0 damage", () => {
                const forecastSpy = vi
                    .spyOn(ActionCalculator, "forecastResults")
                    .mockReturnValue(
                        CalculatedResultService.new({
                            actorBattleSquaddieId: "player_0",
                            changesPerEffect: [
                                ActionEffectChangesService.new({
                                    actorContext:
                                        BattleActionActorContextService.new({}),
                                    squaddieChanges: [
                                        BattleActionSquaddieChangeService.new({
                                            battleSquaddieId: "enemy_0",
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.CRITICAL_SUCCESS,
                                            damageExplanation:
                                                DamageExplanationService.new({
                                                    raw: 0,
                                                    absorbed: 0,
                                                    net: 0,
                                                }),
                                            chanceOfDegreeOfSuccess: 36,
                                        }),
                                    ],
                                }),
                            ],
                        })
                    )

                tile = ActionPreviewTileService.new({
                    gameEngineState,
                    objectRepository,
                })

                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "NO DAMAGE"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
        })
    })
})

const getAllDrawnText = (textSpy: MockInstance) =>
    textSpy.mock.calls.map((args) => args[0])
