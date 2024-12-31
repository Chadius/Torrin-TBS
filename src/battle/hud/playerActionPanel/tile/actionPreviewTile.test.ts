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
import { DamageType, HealingType } from "../../../../squaddie/squaddieService"

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
import {
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "../../../../squaddie/attributeModifier"
import { InBattleAttributesService } from "../../../stats/inBattleAttributes"
import {
    RollModifierType,
    RollResultService,
} from "../../../calculator/actionCalculator/rollResult"

describe("Action Preview Tile", () => {
    let objectRepository: ObjectRepository
    let actionTemplateNeedsToHit: ActionTemplate
    let gameEngineState: GameEngineState
    let tile: ActionPreviewTile
    let graphicsBufferSpies: { [key: string]: MockInstance }
    let graphicsBuffer: GraphicsBuffer
    let missionMap: MissionMap
    let forecastSpy: MockInstance

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

        graphicsBuffer = new MockedP5GraphicsBuffer()
        graphicsBufferSpies =
            MockedGraphicsBufferService.addSpies(graphicsBuffer)
    })

    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
        if (forecastSpy) forecastSpy.mockRestore()
    })

    describe("drawing", () => {
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
                                            chanceOfDegreeOfSuccess: 18,
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
                    "50% miss"
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
                                            chanceOfDegreeOfSuccess: 18,
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
                    "50% botch"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
        })

        it("will not text a forecast for a miss if it has no effect", () => {
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
                                        chanceOfDegreeOfSuccess: 18,
                                    }),
                                    BattleActionSquaddieChangeService.new({
                                        battleSquaddieId: "enemy_0",
                                        actorDegreeOfSuccess:
                                            DegreeOfSuccess.CRITICAL_FAILURE,
                                        damageExplanation:
                                            DamageExplanationService.new({
                                                raw: 0,
                                                absorbed: 0,
                                                net: 0,
                                            }),
                                        chanceOfDegreeOfSuccess: 18,
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
                "50% miss"
            )
            expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                "50% botch"
            )
            expect(forecastSpy).toBeCalled()
            forecastSpy.mockRestore()
        })
        it("will text the results if no degree of success is needed", () => {
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
                                            DegreeOfSuccess.NONE,
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

            expect(getAllDrawnText(graphicsBufferSpies["text"])).not.includes(
                "100% "
            )
            expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                "1 damage"
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

        describe("helpful actions", () => {
            let healingAction: ActionTemplate
            let healingActionSpy: MockInstance

            beforeEach(() => {
                healingAction = ActionTemplateService.new({
                    name: "heal self",
                    id: "heal_self",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.TARGET_SELF]: true,
                                    [Trait.HEALING]: true,
                                }
                            ),
                            healingDescriptions: {
                                [HealingType.LOST_HIT_POINTS]: 2,
                            },
                        }),
                    ],
                })
                ObjectRepositoryService.addActionTemplate(
                    objectRepository,
                    healingAction
                )

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
                gameEngineState = GameEngineStateService.new({
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                campaignId: "test campaign",
                                missionId: "test mission",
                                missionMap,
                            }),
                        }
                    ),
                    repository: objectRepository,
                    campaign: CampaignService.default(),
                })
            })

            afterEach(() => {
                if (healingActionSpy) healingActionSpy.mockRestore()
            })

            const useHealingActionOnSelf = () => {
                const actionStep = BattleActionDecisionStepService.new()
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep: actionStep,
                    battleSquaddieId: "player_0",
                })
                BattleActionDecisionStepService.addAction({
                    actionDecisionStep: actionStep,
                    actionTemplateId: healingAction.id,
                })
                BattleActionDecisionStepService.setConfirmedTarget({
                    actionDecisionStep: actionStep,
                    targetCoordinate: { q: 0, r: 0 },
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
            }

            it("will not show NO DAMAGE if the action is helpful but deals no damage", () => {
                healingActionSpy = vi
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
                                            battleSquaddieId: "player_0",
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.SUCCESS,
                                            healingReceived: 2,
                                            chanceOfDegreeOfSuccess: 36,
                                        }),
                                    ],
                                }),
                            ],
                        })
                    )

                useHealingActionOnSelf()
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(
                    getAllDrawnText(graphicsBufferSpies["text"])
                ).not.includes("NO DAMAGE")

                expect(healingActionSpy).toHaveBeenCalled()
            })

            it("will show healing amount", () => {
                healingActionSpy = vi
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
                                            battleSquaddieId: "player_0",
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.SUCCESS,
                                            healingReceived: 2,
                                            chanceOfDegreeOfSuccess: 36,
                                        }),
                                    ],
                                }),
                            ],
                        })
                    )

                useHealingActionOnSelf()
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "2 heal"
                )

                expect(healingActionSpy).toHaveBeenCalled()
            })

            it("will show NO CHANGE if there is no healing for a healing action", () => {
                healingActionSpy = vi
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
                                            battleSquaddieId: "player_0",
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.NONE,
                                            healingReceived: 0,
                                            chanceOfDegreeOfSuccess: 36,
                                            attributesBefore:
                                                InBattleAttributesService.new(
                                                    {}
                                                ),
                                            attributesAfter:
                                                InBattleAttributesService.new(
                                                    {}
                                                ),
                                        }),
                                    ],
                                }),
                            ],
                        })
                    )

                useHealingActionOnSelf()
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "NO CHANGE"
                )

                expect(healingActionSpy).toHaveBeenCalled()
            })
        })

        describe("attribute modifiers", () => {
            let attributeActionSpy: MockInstance
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
                gameEngineState = GameEngineStateService.new({
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                campaignId: "test campaign",
                                missionId: "test mission",
                                missionMap,
                            }),
                        }
                    ),
                    repository: objectRepository,
                    campaign: CampaignService.default(),
                })
            })

            afterEach(() => {
                if (attributeActionSpy) attributeActionSpy.mockRestore()
            })

            const useActionOnSelf = (actionTemplateId: string) => {
                const actionStep = BattleActionDecisionStepService.new()
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep: actionStep,
                    battleSquaddieId: "player_0",
                })
                BattleActionDecisionStepService.addAction({
                    actionDecisionStep: actionStep,
                    actionTemplateId: actionTemplateId,
                })
                BattleActionDecisionStepService.setConfirmedTarget({
                    actionDecisionStep: actionStep,
                    targetCoordinate: { q: 0, r: 0 },
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
            }

            it("will text binary attribute effect", () => {
                let elusiveAction = ActionTemplateService.new({
                    name: "action",
                    id: "action",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.TARGET_SELF]: true,
                                }
                            ),
                            attributeModifiers: [
                                AttributeModifierService.new({
                                    type: AttributeType.ELUSIVE,
                                    amount: 2,
                                    duration: 1,
                                    source: AttributeSource.STATUS,
                                }),
                            ],
                        }),
                    ],
                })
                ObjectRepositoryService.addActionTemplate(
                    objectRepository,
                    elusiveAction
                )

                attributeActionSpy = vi
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
                                            battleSquaddieId: "player_0",
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.SUCCESS,
                                            healingReceived: 0,
                                            attributesBefore:
                                                InBattleAttributesService.new(
                                                    {}
                                                ),
                                            attributesAfter: {
                                                ...InBattleAttributesService.new(
                                                    {}
                                                ),
                                                attributeModifiers: [
                                                    AttributeModifierService.new(
                                                        {
                                                            type: AttributeType.ELUSIVE,
                                                            amount: 1,
                                                            duration: 1,
                                                            source: AttributeSource.STATUS,
                                                        }
                                                    ),
                                                ],
                                            },
                                            chanceOfDegreeOfSuccess: 36,
                                        }),
                                    ],
                                }),
                            ],
                        })
                    )

                useActionOnSelf("action")
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "Elusive"
                )

                expect(attributeActionSpy).toBeCalled()
            })
            it("will text an attribute amount", () => {
                let elusiveAction = ActionTemplateService.new({
                    name: "action",
                    id: "action",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.TARGET_SELF]: true,
                                }
                            ),
                            attributeModifiers: [
                                AttributeModifierService.new({
                                    type: AttributeType.ABSORB,
                                    amount: 2,
                                    duration: 1,
                                    source: AttributeSource.STATUS,
                                }),
                            ],
                        }),
                    ],
                })
                ObjectRepositoryService.addActionTemplate(
                    objectRepository,
                    elusiveAction
                )

                attributeActionSpy = vi
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
                                            healingReceived: 0,
                                            attributesBefore:
                                                InBattleAttributesService.new(
                                                    {}
                                                ),
                                            attributesAfter: {
                                                ...InBattleAttributesService.new(
                                                    {}
                                                ),
                                                attributeModifiers: [
                                                    AttributeModifierService.new(
                                                        {
                                                            type: AttributeType.ABSORB,
                                                            amount: 2,
                                                            duration: 1,
                                                            source: AttributeSource.STATUS,
                                                        }
                                                    ),
                                                ],
                                            },
                                            chanceOfDegreeOfSuccess: 36,
                                        }),
                                    ],
                                }),
                            ],
                        })
                    )

                useActionOnSelf("action")
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "+2 Absorb"
                )

                expect(attributeActionSpy).toBeCalled()
            })

            it("will text NO CHANGE if there is no healing and no attribute effects", () => {
                let noChangeAction = ActionTemplateService.new({
                    name: "action",
                    id: "action",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.TARGET_SELF]: true,
                                }
                            ),
                            attributeModifiers: [],
                        }),
                    ],
                })
                ObjectRepositoryService.addActionTemplate(
                    objectRepository,
                    noChangeAction
                )

                attributeActionSpy = vi
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
                                            battleSquaddieId: "player_0",
                                            actorDegreeOfSuccess:
                                                DegreeOfSuccess.SUCCESS,
                                            healingReceived: 0,
                                            attributesBefore:
                                                InBattleAttributesService.new(
                                                    {}
                                                ),
                                            attributesAfter:
                                                InBattleAttributesService.new(
                                                    {}
                                                ),
                                            chanceOfDegreeOfSuccess: 36,
                                        }),
                                    ],
                                }),
                            ],
                        })
                    )

                useActionOnSelf("action")
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "NO CHANGE"
                )

                expect(attributeActionSpy).toBeCalled()
            })
        })

        describe("action context", () => {
            beforeEach(() => {
                forecastSpy = vi
                    .spyOn(ActionCalculator, "forecastResults")
                    .mockReturnValue(
                        CalculatedResultService.new({
                            actorBattleSquaddieId: "player_0",
                            changesPerEffect: [
                                ActionEffectChangesService.new({
                                    actorContext:
                                        BattleActionActorContextService.new({
                                            actingSquaddieRoll:
                                                RollResultService.new({
                                                    rollModifiers: {
                                                        [RollModifierType.MULTIPLE_ATTACK_PENALTY]:
                                                            -3,
                                                        [RollModifierType.TIER]: 2,
                                                    },
                                                }),
                                            targetSquaddieModifiers: {
                                                enemy_0: [
                                                    {
                                                        type: AttributeType.ABSORB,
                                                        amount: 1,
                                                    },
                                                ],
                                                enemy_1: [
                                                    {
                                                        type: AttributeType.ABSORB,
                                                        amount: 9001,
                                                    },
                                                ],
                                            },
                                        }),
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
            })

            it("will text roll modifiers", () => {
                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "-3 MAP"
                )
                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "+2 Tier"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })

            it("will text target modifiers for the targeted squaddie", () => {
                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "+1 Absorb"
                )
                expect(
                    getAllDrawnText(graphicsBufferSpies["text"])
                ).not.includes("+9001 Absorb")
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
        })
    })
})

const getAllDrawnText = (textSpy: MockInstance) =>
    textSpy.mock.calls.map((args) => args[0])
