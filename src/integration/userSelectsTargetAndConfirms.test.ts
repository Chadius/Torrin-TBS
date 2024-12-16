import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import {
    GameEngineState,
    GameEngineStateService,
} from "../gameEngine/gameEngine"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"
import { BattleSquaddie, BattleSquaddieService } from "../battle/battleSquaddie"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ResourceHandler } from "../resource/resourceHandler"
import { MissionMap, MissionMapService } from "../missionMap/missionMap"
import { BattlePlayerSquaddieTarget } from "../battle/orchestratorComponents/battlePlayerSquaddieTarget"
import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import {
    ActionEffectTemplate,
    ActionEffectTemplateService,
} from "../action/template/actionEffectTemplate"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import { SquaddieIdService } from "../squaddie/id"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { TerrainTileMapService } from "../hexMap/terrainTileMap"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { BattleCamera } from "../battle/battleCamera"
import { BattlePhaseStateService } from "../battle/orchestratorComponents/battlePhaseController"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { CampaignService } from "../campaign/campaign"
import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
} from "../battle/orchestrator/battleOrchestratorComponent"
import { DegreeOfSuccess } from "../battle/calculator/actionCalculator/degreeOfSuccess"
import { BattleOrchestratorMode } from "../battle/orchestrator/battleOrchestrator"
import { SquaddieTargetsOtherSquaddiesAnimator } from "../battle/animation/squaddieTargetsOtherSquaddiesAnimatior"
import { BattleSquaddieUsesActionOnSquaddie } from "../battle/orchestratorComponents/battleSquaddieUsesActionOnSquaddie"
import { DamageType } from "../squaddie/squaddieService"
import { SquaddieSkipsAnimationAnimator } from "../battle/animation/squaddieSkipsAnimationAnimator"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../battle/hud/summaryHUD"
import { BattlePlayerActionConfirm } from "../battle/orchestratorComponents/battlePlayerActionConfirm"
import { BattleHUDListener } from "../battle/hud/battleHUD"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../battle/actionDecision/battleActionDecisionStep"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../battle/history/battleAction/battleActionSquaddieChange"
import { InBattleAttributesService } from "../battle/stats/inBattleAttributes"
import { BattleActionRecorderService } from "../battle/history/battleAction/battleActionRecorder"
import { TargetConstraintsService } from "../action/targetConstraints"
import { ArmyAttributesService } from "../squaddie/armyAttributes"
import { ActionResourceCostService } from "../action/actionResourceCost"
import { BattlePlayerActionConfirmSpec } from "./spec/battlePlayerActionConfirmSpec"
import { BattlePlayerActionTargetSpec } from "./spec/battlePlayerSquaddieTargetSpec"

describe("User Selects Target and Confirms", () => {
    let objectRepository: ObjectRepository
    let gameEngineState: GameEngineState

    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie
    let player2BattleSquaddie: BattleSquaddie

    let enemySquaddieTemplate: SquaddieTemplate
    let enemyBattleSquaddie: BattleSquaddie

    let attackAction: ActionTemplate

    let resourceHandler: ResourceHandler
    let missionMap: MissionMap

    let targeting: BattlePlayerSquaddieTarget
    let confirm: BattlePlayerActionConfirm
    let graphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        attackAction = ActionTemplateService.new({
            id: "action",
            name: "action",
            resourceCost: ActionResourceCostService.new({
                actionPoints: 2,
            }),
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.TARGET_FOE]: true,
                    }),
                    damageDescriptions: { [DamageType.BODY]: 1 },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            attackAction
        )

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            actionTemplateIds: [attackAction.id],
        })
        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            playerSquaddieTemplate
        )

        playerBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            playerBattleSquaddie
        )

        player2BattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 2",
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            player2BattleSquaddie
        )

        graphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(graphicsContext)
        resourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue({ width: 32, height: 32 })

        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 "],
            }),
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            coordinate: {
                q: 0,
                r: 1,
            },
        })

        enemySquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "enemy",
                affiliation: SquaddieAffiliation.ENEMY,
                templateId: "enemy",
            }),
            actionTemplateIds: [attackAction.id],
        })
        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            enemySquaddieTemplate
        )

        enemyBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: enemySquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "enemy 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            enemyBattleSquaddie
        )

        targeting = new BattlePlayerSquaddieTarget()
        confirm = new BattlePlayerActionConfirm()
    })

    it("Clicking a target should show the confirmation window", () => {
        const playerBattleActionBuilderState =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: playerBattleActionBuilderState,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: playerBattleActionBuilderState,
            actionTemplateId: attackAction.id,
        })

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: enemySquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
            coordinate: {
                q: 0,
                r: 2,
            },
        })

        BattleActionDecisionStepService.setConsideredTarget({
            actionDecisionStep: playerBattleActionBuilderState,
            targetLocation: { q: 0, r: 2 },
        })

        gameEngineState = getGameEngineState({
            repository: objectRepository,
            missionMap,
            resourceHandler,
            playerBattleActionBuilderState,
        })

        targeting.update({ gameEngineState, graphicsContext, resourceHandler })

        BattlePlayerActionTargetSpec.clickOnMapAtCoordinates({
            targeting,
            gameEngineState,
            q: 0,
            r: 2,
        })
        targeting.update({ gameEngineState, graphicsContext, resourceHandler })

        expect(targeting.hasSelectedValidTarget).toBeTruthy()
        expect(
            BattleActionDecisionStepService.isActorSet(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        ).toBeTruthy()
        expect(
            BattleActionDecisionStepService.isActionSet(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        ).toBeTruthy()
        expect(
            BattleActionDecisionStepService.isTargetConsidered(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        ).toBeTruthy()
        expect(
            BattleActionDecisionStepService.isTargetConfirmed(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        ).toBeFalsy()
    })

    describe("Confirming attack", () => {
        beforeEach(() => {
            ;({ gameEngineState } = clickOnEnemy({
                actionTemplate: attackAction,
                attackerBattleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                targetBattleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                targetBattleTemplateId: enemyBattleSquaddie.squaddieTemplateId,
                targeting,
                repository: objectRepository,
                missionMap,
                graphicsContext,
                resourceHandler,
            }))
        })

        const confirmMethods = [
            {
                name: "mouse clicks confirm",
                action: () => {
                    BattlePlayerActionConfirmSpec.clickOnConfirmTarget({
                        confirm,
                        gameEngineState,
                    })
                },
            },
            {
                name: "keyboard presses accept",
                action: () => {
                    keyboardPressToConfirmTarget({ confirm, gameEngineState })
                },
            },
        ]

        it.each(confirmMethods)(
            `After Squaddie Targets is confirmed, will process the first action template via $name`,
            ({ action }) => {
                action()
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder.actionsAlreadyAnimatedThisTurn
                const battleAction =
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                expect(battleAction.actor.actorBattleSquaddieId).toEqual(
                    "player 0"
                )
                expect(battleAction.action.actionTemplateId).toEqual(
                    attackAction.id
                )
                expect(battleAction.effect.squaddie).toHaveLength(1)
                const squaddieChange = battleAction.effect.squaddie[0]
                expect(squaddieChange).toEqual(
                    BattleActionSquaddieChangeService.new({
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        damageExplanation: DamageExplanationService.new({
                            raw: 1,
                            net: 1,
                        }),
                        healingReceived: 0,
                        attributesAfter: InBattleAttributesService.new({
                            armyAttributes: ArmyAttributesService.new({
                                armorClass: 0,
                                maxHitPoints: 5,
                                movement: {
                                    crossOverPits: false,
                                    movementPerAction: 2,
                                    passThroughWalls: false,
                                    ignoreTerrainCost: false,
                                    passThroughSquaddies: false,
                                },
                            }),
                            currentHitPoints: 4,
                        }),
                        attributesBefore: InBattleAttributesService.new({
                            armyAttributes: ArmyAttributesService.new({
                                armorClass: 0,
                                maxHitPoints: 5,
                                movement: {
                                    crossOverPits: false,
                                    movementPerAction: 2,
                                    passThroughWalls: false,
                                    ignoreTerrainCost: false,
                                    passThroughSquaddies: false,
                                },
                            }),
                            currentHitPoints: 5,
                        }),
                        battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                    })
                )
            }
        )

        it.each(confirmMethods)(
            `Knows the confirm system is done via $name`,
            ({ action }) => {
                action()
                expect(confirm.hasCompleted(gameEngineState)).toBeTruthy()
            }
        )

        it.each(confirmMethods)(
            `Next mode should be the Squaddie Actor via $name`,
            ({ action }) => {
                action()
                const battleOrchestratorChanges =
                    confirm.recommendStateChanges(gameEngineState)
                expect(battleOrchestratorChanges.nextMode).toEqual(
                    BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                )
            }
        )

        it.each(confirmMethods)(
            `Will add the expected battle action to the queue via $name`,
            ({ action }) => {
                action()
                const actualBattleAction =
                    BattleActionRecorderService.peekAtAnimationQueue(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder
                    )
                expect(actualBattleAction.actor.actorBattleSquaddieId).toEqual(
                    playerBattleSquaddie.battleSquaddieId
                )
                expect(actualBattleAction.action.actionTemplateId).toEqual(
                    attackAction.id
                )
                expect(
                    actualBattleAction.effect.squaddie[0].battleSquaddieId
                ).toEqual(enemyBattleSquaddie.battleSquaddieId)
                expect(actualBattleAction.effect.squaddie[0]).toEqual(
                    BattleActionSquaddieChangeService.new({
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        damageExplanation: DamageExplanationService.new({
                            raw: 1,
                            net: 1,
                        }),
                        healingReceived: 0,
                        attributesAfter: InBattleAttributesService.new({
                            armyAttributes: ArmyAttributesService.new({
                                armorClass: 0,
                                maxHitPoints: 5,
                                movement: {
                                    crossOverPits: false,
                                    movementPerAction: 2,
                                    passThroughWalls: false,
                                    ignoreTerrainCost: false,
                                    passThroughSquaddies: false,
                                },
                            }),
                            currentHitPoints: 4,
                        }),
                        attributesBefore: InBattleAttributesService.new({
                            armyAttributes: ArmyAttributesService.new({
                                armorClass: 0,
                                maxHitPoints: 5,
                                movement: {
                                    crossOverPits: false,
                                    movementPerAction: 2,
                                    passThroughWalls: false,
                                    ignoreTerrainCost: false,
                                    passThroughSquaddies: false,
                                },
                            }),
                            currentHitPoints: 5,
                        }),
                        battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                    })
                )
            }
        )
    })

    describe("Canceling attack", () => {
        beforeEach(() => {
            ;({ gameEngineState } = clickOnEnemy({
                actionTemplate: attackAction,
                attackerBattleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                targetBattleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
                targetBattleTemplateId: enemyBattleSquaddie.squaddieTemplateId,
                targeting,
                repository: objectRepository,
                missionMap,
                graphicsContext,
                resourceHandler,
            }))
        })

        const cancelMethods = [
            {
                name: "mouse clicks ACCEPT on the CANCEL button",
                action: () => {
                    BattlePlayerActionConfirmSpec.clickOnCancelButton({
                        confirm,
                        gameEngineState,
                    })
                },
            },
            {
                name: "mouse clicks CANCEL",
                action: () => {
                    BattlePlayerActionConfirmSpec.clickCancelButton({
                        confirm,
                        gameEngineState,
                    })
                },
            },
            {
                name: "keyboard presses CANCEL",
                action: () => {
                    BattlePlayerActionConfirmSpec.pressCancelKey({
                        confirm,
                        gameEngineState,
                    })
                },
            },
        ]

        it.each(cancelMethods)(
            `does complete the confirm module via $name`,
            ({ action }) => {
                action()
                expect(confirm.hasCompleted(gameEngineState)).toBeTruthy()
            }
        )

        it.each(cancelMethods)(
            `did not select a valid target via $name`,
            ({ action }) => {
                action()
                expect(
                    BattleActionDecisionStepService.isTargetConsidered(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeFalsy()
            }
        )

        it.each(cancelMethods)(
            `did not confirm an action via $name`,
            ({ action }) => {
                action()
                expect(
                    BattleActionDecisionStepService.isTargetConfirmed(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeFalsy()
            }
        )
    })

    describe("Animator chooses correct mode", () => {
        let squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie
        let squaddieTargetsOtherSquaddiesAnimatorUpdateSpy: jest.SpyInstance
        let squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy: jest.SpyInstance
        let squaddieSkipsAnimationAnimatorUpdateSpy: jest.SpyInstance
        let squaddieSkipsAnimationAnimatorHasCompletedSpy: jest.SpyInstance

        beforeEach(() => {
            squaddieUsesActionOnSquaddie =
                new BattleSquaddieUsesActionOnSquaddie()
            squaddieTargetsOtherSquaddiesAnimatorUpdateSpy = jest
                .spyOn(
                    squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                    "update"
                )
                .mockImplementation()
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest
                .spyOn(
                    squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                    "hasCompleted"
                )
                .mockReturnValue(false)

            squaddieSkipsAnimationAnimatorUpdateSpy = jest
                .spyOn(
                    squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator,
                    "update"
                )
                .mockImplementation()
            squaddieSkipsAnimationAnimatorHasCompletedSpy = jest
                .spyOn(
                    squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator,
                    "hasCompleted"
                )
                .mockReturnValue(false)
        })

        describe("select next phase based on how the action animates", () => {
            const clickAndConfirmWithAttackAction = (
                attackAction: ActionTemplate
            ) => {
                ;({ gameEngineState } = clickOnEnemy({
                    actionTemplate: attackAction,
                    attackerBattleSquaddieId:
                        playerBattleSquaddie.battleSquaddieId,
                    targetBattleSquaddieId:
                        enemyBattleSquaddie.battleSquaddieId,
                    targetBattleTemplateId:
                        enemyBattleSquaddie.squaddieTemplateId,
                    targeting,
                    repository: objectRepository,
                    missionMap,
                    graphicsContext,
                    resourceHandler,
                }))
                BattlePlayerActionConfirmSpec.clickOnConfirmTarget({
                    confirm,
                    gameEngineState,
                })

                confirm.recommendStateChanges(gameEngineState)
                confirm.reset(gameEngineState)
            }

            it("If the action animates we should switch to SquaddieSquaddieAnimation", () => {
                clickAndConfirmWithAttackAction(attackAction)

                squaddieUsesActionOnSquaddie.update({
                    gameEngineState,
                    graphicsContext,
                    resourceHandler,
                })

                expect(
                    squaddieUsesActionOnSquaddie.squaddieActionAnimator
                ).toBeInstanceOf(SquaddieTargetsOtherSquaddiesAnimator)
                expect(
                    squaddieTargetsOtherSquaddiesAnimatorUpdateSpy
                ).toBeCalled()
                expect(
                    squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
                ).toBeCalled()
                expect(
                    squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
                ).toBeFalsy()
            })

            it("If the action does not animate we should switch to the non-animating phase", () => {
                ;(
                    attackAction
                        .actionEffectTemplates[0] as ActionEffectTemplate
                ).traits.booleanTraits[Trait.SKIP_ANIMATION] = true
                clickAndConfirmWithAttackAction(attackAction)

                squaddieUsesActionOnSquaddie.update({
                    gameEngineState,
                    graphicsContext,
                    resourceHandler,
                })

                expect(
                    squaddieUsesActionOnSquaddie.squaddieActionAnimator
                ).toBeInstanceOf(SquaddieSkipsAnimationAnimator)
                expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled()
                expect(
                    squaddieSkipsAnimationAnimatorHasCompletedSpy
                ).toBeCalled()
                expect(
                    squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
                ).toBeFalsy()
            })
        })
    })
})

const getGameEngineState = ({
    repository,
    missionMap,
    resourceHandler,
    playerBattleActionBuilderState,
}: {
    repository: ObjectRepository
    missionMap: MissionMap
    resourceHandler: ResourceHandler
    playerBattleActionBuilderState: BattleActionDecisionStep
}): GameEngineState => {
    const gameEngineState = GameEngineStateService.new({
        battleOrchestratorState: BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                camera: new BattleCamera(0, 0),
                battlePhaseState: BattlePhaseStateService.new({
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                }),
                missionMap,
            }),
        }),
        repository,
        resourceHandler,
        campaign: CampaignService.default(),
    })

    const battleHUDListener = new BattleHUDListener("testBattleListener")
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION
    )
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION
    )
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_CONFIRMS_ACTION
    )
    gameEngineState.messageBoard.addListener(
        battleHUDListener,
        MessageBoardMessageType.PLAYER_SELECTS_TARGET_LOCATION
    )

    gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
        playerBattleActionBuilderState

    gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
        SummaryHUDStateService.new({
            screenSelectionCoordinates: { x: 0, y: 0 },
        })
    SummaryHUDStateService.createActorTiles({
        summaryHUDState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState,
        resourceHandler: gameEngineState.resourceHandler,
        objectRepository: gameEngineState.repository,
        gameEngineState,
    })

    return gameEngineState
}

const clickOnEnemy = ({
    actionTemplate,
    attackerBattleSquaddieId,
    targetBattleSquaddieId,
    targetBattleTemplateId,
    targeting,
    repository,
    missionMap,
    graphicsContext,
    resourceHandler,
}: {
    actionTemplate: ActionTemplate
    attackerBattleSquaddieId: string
    targetBattleSquaddieId: string
    targetBattleTemplateId: string
    targeting: BattlePlayerSquaddieTarget
    repository: ObjectRepository
    missionMap: MissionMap
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}) => {
    const playerBattleActionBuilderState = BattleActionDecisionStepService.new()
    BattleActionDecisionStepService.setActor({
        actionDecisionStep: playerBattleActionBuilderState,
        battleSquaddieId: attackerBattleSquaddieId,
    })
    BattleActionDecisionStepService.addAction({
        actionDecisionStep: playerBattleActionBuilderState,
        actionTemplateId: actionTemplate.id,
    })

    MissionMapService.addSquaddie({
        missionMap,
        squaddieTemplateId: targetBattleTemplateId,
        battleSquaddieId: targetBattleSquaddieId,
        coordinate: {
            q: 0,
            r: 2,
        },
    })

    BattleActionDecisionStepService.setConsideredTarget({
        actionDecisionStep: playerBattleActionBuilderState,
        targetLocation: { q: 0, r: 2 },
    })

    const gameEngineState = getGameEngineState({
        repository,
        missionMap,
        resourceHandler,
        playerBattleActionBuilderState,
    })

    targeting.update({ gameEngineState, graphicsContext, resourceHandler })

    BattlePlayerActionTargetSpec.clickOnMapAtCoordinates({
        targeting,
        gameEngineState,
        q: 0,
        r: 2,
    })
    targeting.update({ gameEngineState, graphicsContext, resourceHandler })

    return {
        gameEngineState,
    }
}

const keyboardPressToConfirmTarget = ({
    confirm,
    gameEngineState,
}: {
    confirm: BattlePlayerActionConfirm
    gameEngineState: GameEngineState
}) => {
    const confirmSelectionPress: OrchestratorComponentKeyEvent = {
        eventType: OrchestratorComponentKeyEventType.PRESSED,
        keyCode: JSON.parse(process.env.KEYBOARD_SHORTCUTS_BINDINGS_ACCEPT)[0],
    }

    confirm.keyEventHappened(gameEngineState, confirmSelectionPress)
}
