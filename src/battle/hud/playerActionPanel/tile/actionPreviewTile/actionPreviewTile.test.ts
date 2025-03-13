import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../objectRepository"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../../../action/template/actionTemplate"
import { SquaddieAffiliation } from "../../../../../squaddie/squaddieAffiliation"
import {
    ActionPreviewTile,
    ActionPreviewTileService,
} from "./actionPreviewTile"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../../../gameEngine/gameEngine"
import { SquaddieRepositoryService } from "../../../../../utils/test/squaddie"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../../../../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../../../trait/traitStatusStorage"
import {
    DamageType,
    HealingType,
} from "../../../../../squaddie/squaddieService"

import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../../../utils/test/mocks"
import { BattleOrchestratorStateService } from "../../../../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../../../battleState/battleState"
import { CampaignService } from "../../../../../campaign/campaign"
import {
    MissionMap,
    MissionMapService,
} from "../../../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../../../hexMap/terrainTileMap"
import { BattleActionDecisionStepService } from "../../../../actionDecision/battleActionDecisionStep"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { ActionCalculator } from "../../../../calculator/actionCalculator/calculator"
import { DegreeOfSuccess } from "../../../../calculator/actionCalculator/degreeOfSuccess"
import {
    ActionEffectChangesService,
    CalculatedResultService,
} from "../../../../history/calculatedResult"
import { BattleActionActorContextService } from "../../../../history/battleAction/battleActionActorContext"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../../../../history/battleAction/battleActionSquaddieChange"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../../../../squaddie/attribute/attributeModifier"
import { InBattleAttributesService } from "../../../../stats/inBattleAttributes"
import {
    RollModifierType,
    RollResultService,
} from "../../../../calculator/actionCalculator/rollResult"
import { AttributeType } from "../../../../../squaddie/attribute/attributeType"

describe("Action Preview Tile", () => {
    let objectRepository: ObjectRepository
    let actionTemplateNeedsToHitArmor: ActionTemplate
    let gameEngineState: GameEngineState
    let tile: ActionPreviewTile
    let graphicsBufferSpies: { [key: string]: MockInstance }
    let graphicsBuffer: GraphicsBuffer
    let missionMap: MissionMap
    let forecastSpy: MockInstance

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        actionTemplateNeedsToHitArmor = ActionTemplateService.new({
            id: "actionTemplateNeedsToHitArmor",
            name: "Action needs to hit armor",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    damageDescriptions: {
                        [DamageType.BODY]: 2,
                    },
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                }),
            ],
            buttonIconResourceKey: "button-icon-resource-key",
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplateNeedsToHitArmor
        )

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "player",
            templateId: "player_0",
            battleId: "player_0",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository,
            actionTemplateIds: ["actionTemplateNeedsToHitArmor"],
        })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "enemy name",
            templateId: "enemy_0",
            battleId: "enemy_0",
            affiliation: SquaddieAffiliation.ENEMY,
            objectRepository,
            actionTemplateIds: ["actionTemplateNeedsToHitArmor"],
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
                actionTemplateId: "actionTemplateNeedsToHitArmor",
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
            it("will text the chance to critically succeed", () => {
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
                const forecastSpy = generateForecastSpy([
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "enemy_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.FAILURE,
                        damageExplanation: DamageExplanationService.new({
                            raw: 1,
                            absorbed: 0,
                            net: 1,
                        }),
                        chanceOfDegreeOfSuccess: 18,
                        attributesAfter: InBattleAttributesService.new({
                            currentHitPoints: 1,
                        }),
                    }),
                ])

                createAndDrawTile(
                    gameEngineState,
                    objectRepository,
                    graphicsBuffer
                )

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "50% miss"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
            it("will text the chance to miss even if there is no chance of critically missing", () => {
                const forecastSpy = generateForecastSpy([
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "enemy_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        chanceOfDegreeOfSuccess: 18,
                    }),
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "enemy_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.FAILURE,
                        chanceOfDegreeOfSuccess: 18,
                    }),
                ])

                createAndDrawTile(
                    gameEngineState,
                    objectRepository,
                    graphicsBuffer
                )

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "50% miss"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
            it("will text the chance to critically miss if there is no effect", () => {
                const forecastSpy = generateForecastSpy([
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "enemy_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
                        damageExplanation: DamageExplanationService.new({
                            raw: 0,
                            absorbed: 0,
                            net: 0,
                        }),
                        chanceOfDegreeOfSuccess: 18,
                    }),
                ])

                createAndDrawTile(
                    gameEngineState,
                    objectRepository,
                    graphicsBuffer
                )

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "50% botch"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
        })

        it("will text a forecast for a miss", () => {
            const forecastSpy = generateForecastSpy([
                BattleActionSquaddieChangeService.new({
                    battleSquaddieId: "enemy_0",
                    actorDegreeOfSuccess: DegreeOfSuccess.FAILURE,
                    damageExplanation: DamageExplanationService.new({
                        raw: 0,
                        absorbed: 0,
                        net: 0,
                    }),
                    chanceOfDegreeOfSuccess: 18,
                }),
                BattleActionSquaddieChangeService.new({
                    battleSquaddieId: "enemy_0",
                    actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
                    damageExplanation: DamageExplanationService.new({
                        raw: 0,
                        absorbed: 0,
                        net: 0,
                    }),
                    chanceOfDegreeOfSuccess: 18,
                }),
            ])

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
            expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                "50% botch"
            )
            expect(forecastSpy).toBeCalled()
            forecastSpy.mockRestore()
        })
        it("will text the results if no degree of success is needed", () => {
            const forecastSpy = generateForecastSpy([
                BattleActionSquaddieChangeService.new({
                    battleSquaddieId: "enemy_0",
                    actorDegreeOfSuccess: DegreeOfSuccess.NONE,
                    damageExplanation: DamageExplanationService.new({
                        raw: 0,
                        absorbed: 0,
                        net: 1,
                    }),
                    chanceOfDegreeOfSuccess: 36,
                    attributesAfter: InBattleAttributesService.new({
                        currentHitPoints: 1,
                    }),
                }),
            ])

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
                const forecastSpy = generateForecastSpy([
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "enemy_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        damageExplanation: DamageExplanationService.new({
                            raw: 0,
                            absorbed: 0,
                            net: 1,
                        }),
                        chanceOfDegreeOfSuccess: 36,
                        attributesAfter: InBattleAttributesService.new({
                            currentHitPoints: 1,
                        }),
                    }),
                ])

                createAndDrawTile(
                    gameEngineState,
                    objectRepository,
                    graphicsBuffer
                )

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "1 damage"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
            it("will text NO DAMAGE if the attack hits but deals 0 damage", () => {
                const forecastSpy = generateForecastSpy([
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "enemy_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
                        damageExplanation: DamageExplanationService.new({
                            raw: 0,
                            absorbed: 0,
                            net: 0,
                        }),
                        chanceOfDegreeOfSuccess: 36,
                    }),
                ])

                createAndDrawTile(
                    gameEngineState,
                    objectRepository,
                    graphicsBuffer
                )

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "NO DAMAGE"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
            it("will not text NO DAMAGE if the attack targets armor but misses", () => {
                const forecastSpy = generateForecastSpy([
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "enemy_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_FAILURE,
                        damageExplanation: DamageExplanationService.new({
                            raw: 0,
                            absorbed: 0,
                            net: 0,
                        }),
                        chanceOfDegreeOfSuccess: 36,
                    }),
                ])

                createAndDrawTile(
                    gameEngineState,
                    objectRepository,
                    graphicsBuffer
                )

                expect(
                    getAllDrawnText(graphicsBufferSpies["text"])
                ).not.includes("NO DAMAGE")
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
            it("will text KO if the attack hits and will reduce target to 0 hit points", () => {
                const forecastSpy = generateForecastSpy([
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "enemy_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
                        damageExplanation: DamageExplanationService.new({
                            raw: 10,
                            absorbed: 0,
                            net: 10,
                            willKo: true,
                        }),
                        chanceOfDegreeOfSuccess: 36,
                        attributesAfter: InBattleAttributesService.new({
                            currentHitPoints: 0,
                        }),
                    }),
                ])

                createAndDrawTile(
                    gameEngineState,
                    objectRepository,
                    graphicsBuffer
                )

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "KO!"
                )
                expect(forecastSpy).toBeCalled()
                forecastSpy.mockRestore()
            })
        })

        describe("helpful actions", () => {
            let healingAction: ActionTemplate
            let armorAction: ActionTemplate
            let helpfulActionSpy: MockInstance

            beforeEach(() => {
                healingAction = ActionTemplateService.new({
                    name: "heal self",
                    id: "heal_self",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                    true,
                            },
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
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

                armorAction = ActionTemplateService.new({
                    name: "armor up",
                    id: "armor_up",
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                    true,
                            },
                            attributeModifiers: [
                                AttributeModifierService.new({
                                    type: AttributeType.ARMOR,
                                    source: AttributeSource.CIRCUMSTANCE,
                                    amount: 1,
                                }),
                            ],
                        }),
                    ],
                })
                ObjectRepositoryService.addActionTemplate(
                    objectRepository,
                    armorAction
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
                if (helpfulActionSpy) helpfulActionSpy.mockRestore()
            })

            const useHelpfulActionOnSelf = (actionTemplateId: string) => {
                const actionStep = BattleActionDecisionStepService.new()
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep: actionStep,
                    battleSquaddieId: "player_0",
                })
                BattleActionDecisionStepService.addAction({
                    actionDecisionStep: actionStep,
                    actionTemplateId,
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
                helpfulActionSpy = generateForecastSpy([
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "player_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        healingReceived: 2,
                        chanceOfDegreeOfSuccess: 36,
                    }),
                ])

                useHelpfulActionOnSelf(healingAction.id)
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(
                    getAllDrawnText(graphicsBufferSpies["text"])
                ).not.includes("NO DAMAGE")

                expect(helpfulActionSpy).toHaveBeenCalled()
            })

            it("will show healing amount", () => {
                helpfulActionSpy = generateForecastSpy([
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "player_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        healingReceived: 2,
                        chanceOfDegreeOfSuccess: 36,
                    }),
                ])

                useHelpfulActionOnSelf(healingAction.id)
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "2 heal"
                )

                expect(helpfulActionSpy).toHaveBeenCalled()
            })

            it("will show NO CHANGE if there is no healing for a healing action", () => {
                helpfulActionSpy = vi
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

                useHelpfulActionOnSelf(healingAction.id)
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "NO CHANGE"
                )

                expect(helpfulActionSpy).toHaveBeenCalled()
            })

            it("will show changes in attributes if the template changes them", () => {
                helpfulActionSpy = generateForecastSpy([
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "player_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.NONE,
                        attributesBefore: InBattleAttributesService.new({}),
                        attributesAfter: InBattleAttributesService.new({
                            attributeModifiers: [
                                AttributeModifierService.new({
                                    type: AttributeType.ARMOR,
                                    source: AttributeSource.STATUS,
                                    amount: 1,
                                }),
                            ],
                        }),
                        chanceOfDegreeOfSuccess: 36,
                    }),
                ])

                useHelpfulActionOnSelf(armorAction.id)
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "+1 Armor"
                )

                expect(helpfulActionSpy).toHaveBeenCalled()
            })
            it("will not show changes in attributes if the template does not change them", () => {
                helpfulActionSpy = generateForecastSpy([
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: "player_0",
                        actorDegreeOfSuccess: DegreeOfSuccess.NONE,
                        healingReceived: 2,
                        attributesBefore: InBattleAttributesService.new({
                            attributeModifiers: [
                                AttributeModifierService.new({
                                    type: AttributeType.ARMOR,
                                    source: AttributeSource.STATUS,
                                    amount: 1,
                                }),
                            ],
                        }),
                        attributesAfter: InBattleAttributesService.new({
                            attributeModifiers: [
                                AttributeModifierService.new({
                                    type: AttributeType.ARMOR,
                                    source: AttributeSource.STATUS,
                                    amount: 1,
                                }),
                            ],
                        }),
                        chanceOfDegreeOfSuccess: 36,
                    }),
                ])

                useHelpfulActionOnSelf(healingAction.id)
                ActionPreviewTileService.draw({
                    tile: tile,
                    graphicsContext: graphicsBuffer,
                })

                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "2 heal"
                )

                expect(helpfulActionSpy).toHaveBeenCalled()
            })
        })

        describe("attribute modifiers", () => {
            let attributeActionSpy: MockInstance
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
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                    true,
                            },
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
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                    true,
                            },
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
                            squaddieAffiliationRelation: {
                                [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                                    true,
                            },
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
                                                        [RollModifierType.PROFICIENCY]: 2,
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
                                            attributesAfter:
                                                InBattleAttributesService.new({
                                                    currentHitPoints: 1,
                                                }),
                                        }),
                                    ],
                                }),
                            ],
                        })
                    )
                createAndDrawTile(
                    gameEngineState,
                    objectRepository,
                    graphicsBuffer
                )
            })

            it("will text roll modifiers", () => {
                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "-3 MAP"
                )
                expect(getAllDrawnText(graphicsBufferSpies["text"])).includes(
                    "+2 Prof"
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

const generateForecastSpy = (squaddieChanges: BattleActionSquaddieChange[]) =>
    vi.spyOn(ActionCalculator, "forecastResults").mockReturnValue(
        CalculatedResultService.new({
            actorBattleSquaddieId: "player_0",
            changesPerEffect: [
                ActionEffectChangesService.new({
                    actorContext: BattleActionActorContextService.new({}),
                    squaddieChanges,
                }),
            ],
        })
    )

const createAndDrawTile = (
    gameEngineState: GameEngineState,
    objectRepository: ObjectRepository,
    graphicsBuffer: GraphicsBuffer
) => {
    const tile = ActionPreviewTileService.new({
        gameEngineState,
        objectRepository,
    })

    ActionPreviewTileService.draw({
        tile: tile,
        graphicsContext: graphicsBuffer,
    })
}
