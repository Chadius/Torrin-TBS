import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../orchestrator/battleOrchestratorState"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddie } from "../battleSquaddie"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieMovementService } from "../../squaddie/movement"
import { BattleSquaddieUsesActionOnSquaddie } from "./battleSquaddieUsesActionOnSquaddie"
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { LabelService } from "../../ui/label"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { ResourceHandler } from "../../resource/resourceHandler"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { DamageType, SquaddieService } from "../../squaddie/squaddieService"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { SquaddieTargetsOtherSquaddiesAnimator } from "../animation/squaddieTargetsOtherSquaddiesAnimatior"
import { SquaddieSkipsAnimationAnimator } from "../animation/squaddieSkipsAnimationAnimator"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { SquaddieTurnService } from "../../squaddie/turn"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    VersusSquaddieResistance,
} from "../../action/template/actionEffectTemplate"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { isValidValue } from "../../utils/validityCheck"
import { CampaignService } from "../../campaign/campaign"
import { BattleHUDService } from "../hud/battleHUD/battleHUD"
import { MouseButton } from "../../utils/mouseConfig"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "../history/battleAction/battleActionSquaddieChange"
import { BattleActionService } from "../history/battleAction/battleAction"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { TargetConstraintsService } from "../../action/targetConstraints"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"
import { ActionResourceCostService } from "../../action/actionResourceCost"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { BattleHUDListener } from "../hud/battleHUD/battleHUDListener"

describe("BattleSquaddieUsesActionOnSquaddie", () => {
    let objectRepository: ObjectRepository
    let squaddieTemplateBase: SquaddieTemplate
    let battleSquaddieBase: BattleSquaddie
    let targetStatic: SquaddieTemplate
    let targetDynamic: BattleSquaddie
    let powerAttackLongswordAction: ActionTemplate
    let attackLongswordAction: ActionTemplate
    let monkKoanAction: ActionTemplate
    let squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie
    let mockResourceHandler: ResourceHandler
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    const targetDynamicSquaddieBattleSquaddieId = "target_dynamic_squaddie"
    let squaddieUpkeepSpy: MockInstance

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        objectRepository = ObjectRepositoryService.new()
        ;({
            squaddieTemplate: squaddieTemplateBase,
            battleSquaddie: battleSquaddieBase,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "Nahla",
            templateId: "static_squaddie",
            battleId: "dynamic_squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: objectRepository,
            attributes: ArmyAttributesService.new({
                movement: SquaddieMovementService.new({
                    movementPerAction: 2,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                }),
                maxHitPoints: 1,
            }),
            actionTemplateIds: [],
        }))
        ;({ squaddieTemplate: targetStatic, battleSquaddie: targetDynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Target",
                templateId: "target_static_squaddie",
                battleId: "target_dynamic_squaddie",
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: objectRepository,
                attributes: ArmyAttributesService.new({
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.PASS_THROUGH_WALLS]: true,
                        }),
                    }),
                    maxHitPoints: 3,
                }),
                actionTemplateIds: [],
            }))

        powerAttackLongswordAction = ActionTemplateService.new({
            name: "power attack longsword",
            id: "powerAttackLongsword",
            resourceCost: ActionResourceCostService.new({
                actionPoints: 3,
            }),
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                    damageDescriptions: {
                        [DamageType.BODY]: 9001,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            powerAttackLongswordAction
        )

        attackLongswordAction = ActionTemplateService.new({
            name: "attack longsword",
            id: "attackLongsword",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                    damageDescriptions: {
                        [DamageType.BODY]: 1,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            attackLongswordAction
        )

        monkKoanAction = ActionTemplateService.new({
            id: "koan",
            name: "koan",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 0,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.SKIP_ANIMATION]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            monkKoanAction
        )

        vi.spyOn(LabelService, "draw").mockReturnValue(null)
        squaddieUpkeepSpy = vi
            .spyOn(
                OrchestratorUtilities,
                "messageAndHighlightPlayableSquaddieTakingATurn"
            )
            .mockImplementation(() => {})

        squaddieUsesActionOnSquaddie = new BattleSquaddieUsesActionOnSquaddie()

        mockResourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        mockResourceHandler.getResource = vi
            .fn()
            .mockReturnValue({ width: 32, height: 32 })
    })

    afterEach(() => {
        squaddieUpkeepSpy.mockRestore()
    })

    const useMonkKoanAndReturnState = ({
        missionMap,
    }: {
        missionMap?: MissionMap
    }): GameEngineState => {
        const battleOrchestratorState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap,
                }),
            })

        const gameEngineState = GameEngineStateService.new({
            battleOrchestratorState,
            repository: objectRepository,
            resourceHandler: mockResourceHandler,
            campaign: CampaignService.default(),
        })

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: battleSquaddieBase.battleSquaddieId,
                },
                action: { actionTemplateId: monkKoanAction.id },
                effect: { squaddie: [] },
            })
        )
        BattleActionRecorderService.battleActionFinishedAnimating(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
            gameEngineState,
            battleSquaddieSelectedId: battleSquaddieBase.battleSquaddieId,
        })
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: battleSquaddieBase.battleSquaddieId,
                },
                action: {
                    actionTemplateId: monkKoanAction.id,
                },
                effect: {
                    squaddie: [],
                },
            })
        )

        SquaddieTurnService.spendActionPoints(
            battleSquaddieBase.squaddieTurn,
            powerAttackLongswordAction.resourceCost.actionPoints
        )
        return gameEngineState
    }

    const usePowerAttackLongswordAndReturnState = ({
        missionMap,
    }: {
        missionMap?: MissionMap
    }): GameEngineState => {
        if (isValidValue(missionMap)) {
            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: squaddieTemplateBase.squaddieId.templateId,
                battleSquaddieId: battleSquaddieBase.battleSquaddieId,
                coordinate: {
                    q: 0,
                    r: 0,
                },
            })
        }

        const battleOrchestratorState = BattleOrchestratorStateService.new({
            battleHUD: BattleHUDService.new({}),
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap,
            }),
        })

        const gameEngineState = GameEngineStateService.new({
            battleOrchestratorState,
            repository: objectRepository,
            resourceHandler: mockResourceHandler,
            campaign: CampaignService.default(),
        })

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
            gameEngineState,
            battleSquaddieSelectedId: battleSquaddieBase.battleSquaddieId,
        })

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            battleOrchestratorState.battleState.battleActionRecorder,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId: battleSquaddieBase.battleSquaddieId,
                },
                action: {
                    actionTemplateId: powerAttackLongswordAction.id,
                },
                effect: {
                    squaddie: [
                        BattleActionSquaddieChangeService.new({
                            damageExplanation: DamageExplanationService.new({
                                net: 9001,
                            }),
                            healingReceived: 0,
                            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                            battleSquaddieId: "target_dynamic_squaddie",
                        }),
                    ],
                },
            })
        )

        SquaddieTurnService.spendActionPoints(
            battleSquaddieBase.squaddieTurn,
            powerAttackLongswordAction.resourceCost.actionPoints
        )
        return gameEngineState
    }

    it("hides dead squaddies after the action animates", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })

        const gameEngineState = usePowerAttackLongswordAndReturnState({
            missionMap,
        })
        expect(
            MissionMapService.isSquaddieHiddenFromDrawing(
                missionMap,
                targetDynamic.battleSquaddieId
            )
        ).toBeFalsy()

        InBattleAttributesService.takeDamage({
            inBattleAttributes: targetDynamic.inBattleAttributes,
            damageToTake: targetStatic.attributes.maxHitPoints,
            damageType: DamageType.BODY,
        })
        expect(
            SquaddieService.isSquaddieAlive({
                battleSquaddie: targetDynamic,
                squaddieTemplate: targetStatic,
            })
        ).toBeFalsy()

        vi.spyOn(
            squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
            "update"
        ).mockImplementation(() => {})
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = vi
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "hasCompleted"
            )
            .mockReturnValue(true)

        squaddieUsesActionOnSquaddie.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()
        expect(
            MissionMapService.isSquaddieHiddenFromDrawing(
                missionMap,
                targetDynamic.battleSquaddieId
            )
        ).toBeTruthy()
    })

    it("clears the action builder when the action finishes animating", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })

        const gameEngineState = usePowerAttackLongswordAndReturnState({
            missionMap,
        })
        battleSquaddieBase.squaddieTurn.remainingActionPoints = 1

        vi.spyOn(
            squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
            "update"
        ).mockImplementation(() => {})
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = vi
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "hasCompleted"
            )
            .mockReturnValue(true)

        squaddieUsesActionOnSquaddie.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()

        squaddieUsesActionOnSquaddie.recommendStateChanges(gameEngineState)
        squaddieUsesActionOnSquaddie.reset(gameEngineState)

        expect(
            BattleActionDecisionStepService.isActionRecordComplete(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        ).toBeFalsy()
    })

    it("sends a message noting the animation is complete", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })

        const gameEngineState = usePowerAttackLongswordAndReturnState({
            missionMap,
        })
        battleSquaddieBase.squaddieTurn.remainingActionPoints = 1

        const messageSpy: MockInstance = vi.spyOn(
            gameEngineState.messageBoard,
            "sendMessage"
        )

        vi.spyOn(
            squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
            "update"
        ).mockImplementation(() => {})
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = vi
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "hasCompleted"
            )
            .mockReturnValue(true)

        squaddieUsesActionOnSquaddie.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()

        squaddieUsesActionOnSquaddie.recommendStateChanges(gameEngineState)
        squaddieUsesActionOnSquaddie.reset(gameEngineState)

        expect(messageSpy).toBeCalledWith({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        messageSpy.mockRestore()
    })

    describe("squaddie finishes acting", () => {
        let missionMap: MissionMap
        let gameEngineState: GameEngineState
        let messageSpy: MockInstance
        let animatorSpy: MockInstance
        let squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy: MockInstance
        beforeEach(() => {
            missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 "],
                }),
            })

            gameEngineState = usePowerAttackLongswordAndReturnState({
                missionMap,
            })

            messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
            animatorSpy = vi
                .spyOn(
                    squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                    "update"
                )
                .mockImplementation(() => {})
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = vi
                .spyOn(
                    squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                    "hasCompleted"
                )
                .mockReturnValue(true)
        })
        afterEach(() => {
            animatorSpy.mockRestore()
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy.mockRestore()
            messageSpy.mockRestore()
        })
        it("resets squaddie currently acting when it finishes acting", () => {
            squaddieUsesActionOnSquaddie.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
            expect(
                squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
            ).toBeCalled()
            expect(
                squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
            ).toBeTruthy()

            squaddieUsesActionOnSquaddie.recommendStateChanges(gameEngineState)
            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
            expect(animatorSpy).toHaveBeenCalled()
            expect(
                squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
            ).toHaveBeenCalled()
        })
        it("calls helper function to update squaddie after acting", () => {
            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )

            squaddieUsesActionOnSquaddie.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
            expect(
                squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
            ).toBeCalled()
            expect(
                squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
            ).toBeTruthy()

            squaddieUsesActionOnSquaddie.recommendStateChanges(gameEngineState)
            expect(squaddieUpkeepSpy).toBeCalled()
        })
    })

    it("uses the SquaddieTargetsOtherSquaddiesAnimator for appropriate situations and waits after it completes", () => {
        const gameEngineState = usePowerAttackLongswordAndReturnState({})

        const squaddieTargetsOtherSquaddiesAnimatorUpdateSpy = vi
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "update"
            )
            .mockImplementation(() => {})
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = vi
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "hasCompleted"
            )
            .mockReturnValue(false)
        squaddieUsesActionOnSquaddie.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })

        expect(
            squaddieUsesActionOnSquaddie.squaddieActionAnimator
        ).toBeInstanceOf(SquaddieTargetsOtherSquaddiesAnimator)
        expect(squaddieTargetsOtherSquaddiesAnimatorUpdateSpy).toBeCalled()
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()
        expect(
            squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
        ).toBeFalsy()

        squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy.mockReturnValue(
            true
        )
        squaddieUsesActionOnSquaddie.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(squaddieTargetsOtherSquaddiesAnimatorUpdateSpy).toBeCalled()
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()
        expect(
            squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
        ).toBeTruthy()

        squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy.mockRestore()
        squaddieTargetsOtherSquaddiesAnimatorUpdateSpy.mockRestore()
    })

    it("recommends the player hud when the battle action queue is empty ", () => {
        const gameEngineState = usePowerAttackLongswordAndReturnState({})

        const squaddieTargetsOtherSquaddiesAnimatorResetSpy = vi
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "reset"
            )
            .mockImplementation(() => {})

        squaddieUsesActionOnSquaddie.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(
            squaddieUsesActionOnSquaddie.squaddieActionAnimator
        ).toBeInstanceOf(SquaddieTargetsOtherSquaddiesAnimator)

        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder =
            BattleActionRecorderService.new()
        const stateChanges =
            squaddieUsesActionOnSquaddie.recommendStateChanges(gameEngineState)
        expect(stateChanges.nextMode).toEqual(
            BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
        )

        squaddieUsesActionOnSquaddie.reset(gameEngineState)
        expect(squaddieTargetsOtherSquaddiesAnimatorResetSpy).toBeCalled()
        squaddieTargetsOtherSquaddiesAnimatorResetSpy.mockRestore()
    })

    it("uses the SquaddieSkipsAnimationAnimator for actions that lack animation and waits after it completes", () => {
        const gameEngineState = useMonkKoanAndReturnState({})

        const squaddieSkipsAnimationAnimatorUpdateSpy = vi
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator,
                "update"
            )
            .mockImplementation(() => {})
        const squaddieSkipsAnimationAnimatorResetSpy = vi
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator,
                "reset"
            )
            .mockImplementation(() => {})
        const squaddieSkipsAnimationAnimatorHasCompletedSpy = vi
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator,
                "hasCompleted"
            )
            .mockReturnValue(false)
        squaddieUsesActionOnSquaddie.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })

        expect(
            squaddieUsesActionOnSquaddie.squaddieActionAnimator
        ).toBeInstanceOf(SquaddieSkipsAnimationAnimator)
        expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled()
        expect(squaddieSkipsAnimationAnimatorHasCompletedSpy).toBeCalled()
        expect(
            squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
        ).toBeFalsy()

        squaddieSkipsAnimationAnimatorHasCompletedSpy.mockReturnValue(true)
        squaddieUsesActionOnSquaddie.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled()
        expect(squaddieSkipsAnimationAnimatorHasCompletedSpy).toBeCalled()
        expect(
            squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
        ).toBeTruthy()

        squaddieUsesActionOnSquaddie.reset(gameEngineState)
        expect(squaddieSkipsAnimationAnimatorResetSpy).toBeCalled()
    })

    it("passes mouse events on to the animator", () => {
        const state = usePowerAttackLongswordAndReturnState({})

        const squaddieTargetsOtherSquaddiesAnimatorMouseEventHappenedSpy = vi
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "mouseEventHappened"
            )
            .mockImplementation(() => {})

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
            mouseButton: MouseButton.ACCEPT,
        }

        squaddieUsesActionOnSquaddie.mouseEventHappened(state, mouseEvent)
        expect(
            squaddieTargetsOtherSquaddiesAnimatorMouseEventHappenedSpy
        ).toBeCalled()
    })

    it("will generate message if the target was injured", () => {
        const missionMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })

        const gameEngineState = usePowerAttackLongswordAndReturnState({
            missionMap,
        })
        expect(
            MissionMapService.isSquaddieHiddenFromDrawing(
                missionMap,
                targetDynamic.battleSquaddieId
            )
        ).toBeFalsy()

        vi.spyOn(
            squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
            "update"
        ).mockImplementation(() => {})

        const messageBoardSendSpy: MockInstance = vi.spyOn(
            gameEngineState.messageBoard,
            "sendMessage"
        )

        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = vi
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "hasCompleted"
            )
            .mockReturnValue(true)

        squaddieUsesActionOnSquaddie.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()

        expect(messageBoardSendSpy).toBeCalledWith({
            type: MessageBoardMessageType.SQUADDIE_IS_INJURED,
            gameEngineState,
            battleSquaddieIdsThatWereInjured: [
                targetDynamicSquaddieBattleSquaddieId,
            ],
        })
        messageBoardSendSpy.mockRestore()
    })
})
