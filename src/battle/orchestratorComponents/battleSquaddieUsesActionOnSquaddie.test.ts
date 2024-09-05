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
import { CreateNewSquaddieMovementWithTraits } from "../../squaddie/movement"
import { BattleSquaddieUsesActionOnSquaddie } from "./battleSquaddieUsesActionOnSquaddie"
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { LabelService } from "../../ui/label"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { ResourceHandler } from "../../resource/resourceHandler"
import { makeResult } from "../../utils/ResultOrError"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { Recording, RecordingService } from "../history/recording"
import { BattleEvent, BattleEventService } from "../history/battleEvent"
import { DamageType, IsSquaddieAlive } from "../../squaddie/squaddieService"
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
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../action/template/actionEffectSquaddieTemplate"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import { DecidedActionSquaddieEffectService } from "../../action/decided/decidedActionSquaddieEffect"
import {
    SquaddieSquaddieResults,
    SquaddieSquaddieResultsService,
} from "../history/squaddieSquaddieResults"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { isValidValue } from "../../utils/validityCheck"
import { CampaignService } from "../../campaign/campaign"
import { BattleHUDListener, BattleHUDService } from "../hud/battleHUD"
import { MouseButton, MouseClickService } from "../../utils/mouseConfig"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattleActionSquaddieChangeService } from "../history/battleActionSquaddieChange"
import { BattleActionActionContextService } from "../history/battleAction"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"

describe("BattleSquaddieUsesActionOnSquaddie", () => {
    let squaddieRepository: ObjectRepository
    let squaddieTemplateBase: SquaddieTemplate
    let battleSquaddieBase: BattleSquaddie
    let targetStatic: SquaddieTemplate
    let targetDynamic: BattleSquaddie
    let powerAttackLongswordAction: ActionTemplate
    let attackLongswordAction: ActionTemplate
    let monkKoanAction: ActionTemplate
    let squaddieUsesActionOnSquaddie: BattleSquaddieUsesActionOnSquaddie
    let mockResourceHandler: jest.Mocked<ResourceHandler>
    let battleEventRecording: Recording
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    const targetDynamicSquaddieBattleSquaddieId = "target_dynamic_squaddie"

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        squaddieRepository = ObjectRepositoryService.new()
        ;({
            squaddieTemplate: squaddieTemplateBase,
            battleSquaddie: battleSquaddieBase,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "Torrin",
            templateId: "static_squaddie",
            battleId: "dynamic_squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: squaddieRepository,
            attributes: {
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                }),
                maxHitPoints: 1,
                armorClass: 0,
            },
            actionTemplateIds: [],
        }))
        ;({ squaddieTemplate: targetStatic, battleSquaddie: targetDynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Target",
                templateId: "target_static_squaddie",
                battleId: "target_dynamic_squaddie",
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: squaddieRepository,
                attributes: {
                    movement: CreateNewSquaddieMovementWithTraits({
                        movementPerAction: 2,
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.PASS_THROUGH_WALLS]: true,
                        }),
                    }),
                    maxHitPoints: 3,
                    armorClass: 0,
                },
                actionTemplateIds: [],
            }))

        powerAttackLongswordAction = ActionTemplateService.new({
            name: "power attack longsword",
            id: "powerAttackLongsword",
            actionPoints: 3,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: 9001,
                    },
                }),
            ],
        })

        attackLongswordAction = ActionTemplateService.new({
            name: "attack longsword",
            id: "attackLongsword",
            actionPoints: 1,
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: 1,
                    },
                }),
            ],
        })

        monkKoanAction = ActionTemplateService.new({
            id: "koan",
            name: "koan",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.SKIP_ANIMATION]: true,
                    }),
                    maximumRange: 0,
                    minimumRange: 0,
                }),
            ],
        })

        jest.spyOn(LabelService, "draw").mockReturnValue(null)
        jest.spyOn(
            OrchestratorUtilities,
            "drawSquaddieReachBasedOnSquaddieTurnAndAffiliation"
        ).mockImplementation(() => {})

        squaddieUsesActionOnSquaddie = new BattleSquaddieUsesActionOnSquaddie()

        mockResourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        mockResourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult(null))

        battleEventRecording = { history: [] }
    })

    const useMonkKoanAndReturnState = ({
        missionMap,
    }: {
        missionMap?: MissionMap
    }): GameEngineState => {
        const processedAction = ProcessedActionService.new({
            decidedAction: undefined,
            processedActionEffects: [
                ProcessedActionSquaddieEffectService.new({
                    decidedActionEffect: DecidedActionSquaddieEffectService.new(
                        {
                            template: monkKoanAction
                                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                            target: { q: 0, r: 0 },
                        }
                    ),
                }),
            ],
        })

        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: battleSquaddieBase.battleSquaddieId,
            startingLocation: { q: 0, r: 0 },
            previewedActionTemplateId: monkKoanAction.name,
            processedActions: [processedAction],
        })

        const newEvent: BattleEvent = BattleEventService.new({
            processedAction,
            results: SquaddieSquaddieResultsService.new({
                squaddieChanges: [],
                actionContext: BattleActionActionContextService.new({
                    actingSquaddieRoll: {
                        occurred: false,
                        rolls: [],
                    },
                }),
                actingBattleSquaddieId: battleSquaddieBase.battleSquaddieId,
                targetedBattleSquaddieIds: [],
            }),
        })
        RecordingService.addEvent(battleEventRecording, newEvent)

        const battleOrchestratorState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap,
                    recording: battleEventRecording,
                    actionsThisRound,
                }),
            })

        const gameEngineState = GameEngineStateService.new({
            battleOrchestratorState,
            repository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            campaign: CampaignService.default(),
        })

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
            gameEngineState,
            battleSquaddieSelectedId: battleSquaddieBase.battleSquaddieId,
            selectionMethod: {
                mouseClick: MouseClickService.new({
                    x: 0,
                    y: 0,
                    button: MouseButton.ACCEPT,
                }),
            },
        })

        SquaddieTurnService.spendActionPoints(
            battleSquaddieBase.squaddieTurn,
            powerAttackLongswordAction.actionPoints
        )
        return gameEngineState
    }

    const usePowerAttackLongswordAndReturnState = ({
        missionMap,
    }: {
        missionMap?: MissionMap
    }): GameEngineState => {
        const results: SquaddieSquaddieResults =
            SquaddieSquaddieResultsService.new({
                actingBattleSquaddieId: battleSquaddieBase.battleSquaddieId,
                actionContext: BattleActionActionContextService.new({
                    actingSquaddieRoll: {
                        occurred: false,
                        rolls: [],
                    },
                    actingSquaddieModifiers: [],
                }),
                targetedBattleSquaddieIds: ["target_dynamic_squaddie"],
                squaddieChanges: [
                    BattleActionSquaddieChangeService.new({
                        damageTaken: 9001,
                        healingReceived: 0,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                        battleSquaddieId: "target_dynamic_squaddie",
                    }),
                ],
            })
        const processedAction = ProcessedActionService.new({
            decidedAction: undefined,
            processedActionEffects: [
                ProcessedActionSquaddieEffectService.new({
                    decidedActionEffect: DecidedActionSquaddieEffectService.new(
                        {
                            template: powerAttackLongswordAction
                                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                            target: { q: 0, r: 0 },
                        }
                    ),
                    results,
                }),
            ],
        })

        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: battleSquaddieBase.battleSquaddieId,
            startingLocation: { q: 0, r: 0 },
            previewedActionTemplateId: powerAttackLongswordAction.name,
            processedActions: [processedAction],
        })

        const newEvent: BattleEvent = BattleEventService.new({
            processedAction,
            results,
        })
        RecordingService.addEvent(battleEventRecording, newEvent)

        if (isValidValue(missionMap)) {
            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: squaddieTemplateBase.squaddieId.templateId,
                battleSquaddieId: battleSquaddieBase.battleSquaddieId,
                location: {
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
                actionsThisRound,
                recording: battleEventRecording,
            }),
        })

        const gameEngineState = GameEngineStateService.new({
            battleOrchestratorState,
            repository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            campaign: CampaignService.default(),
        })

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
            gameEngineState,
            battleSquaddieSelectedId: battleSquaddieBase.battleSquaddieId,
            selectionMethod: {
                mouseClick: MouseClickService.new({
                    x: 0,
                    y: 0,
                    button: MouseButton.ACCEPT,
                }),
            },
        })

        SquaddieTurnService.spendActionPoints(
            battleSquaddieBase.squaddieTurn,
            powerAttackLongswordAction.actionPoints
        )
        return gameEngineState
    }

    const useAttackActionAndReturnState = ({
        missionMap,
        actionTemplate,
    }: {
        missionMap?: MissionMap
        actionTemplate: ActionTemplate
    }): GameEngineState => {
        const results: SquaddieSquaddieResults =
            SquaddieSquaddieResultsService.sanitize({
                actingBattleSquaddieId: battleSquaddieBase.battleSquaddieId,
                actingContext: BattleActionActionContextService.new({
                    actingSquaddieModifiers: [],
                    actingSquaddieRoll: {
                        occurred: false,
                        rolls: [],
                    },
                }),
                targetedBattleSquaddieIds: [
                    targetDynamicSquaddieBattleSquaddieId,
                ],
                squaddieChanges: [
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: targetDynamicSquaddieBattleSquaddieId,
                        damageTaken: 1,
                        healingReceived: 0,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    }),
                ],
            })
        const processedAction = ProcessedActionService.new({
            decidedAction: undefined,
            processedActionEffects: [
                ProcessedActionSquaddieEffectService.new({
                    decidedActionEffect: DecidedActionSquaddieEffectService.new(
                        {
                            template: actionTemplate
                                .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                            target: { q: 0, r: 0 },
                        }
                    ),
                    results,
                }),
            ],
        })

        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: battleSquaddieBase.battleSquaddieId,
            startingLocation: { q: 0, r: 0 },
            previewedActionTemplateId: actionTemplate.name,
            processedActions: [processedAction],
        })

        const newEvent: BattleEvent = BattleEventService.new({
            processedAction,
            results,
        })
        RecordingService.addEvent(battleEventRecording, newEvent)

        if (isValidValue(missionMap)) {
            MissionMapService.addSquaddie({
                missionMap,
                squaddieTemplateId: squaddieTemplateBase.squaddieId.templateId,
                battleSquaddieId: battleSquaddieBase.battleSquaddieId,
                location: {
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
                actionsThisRound,
                recording: battleEventRecording,
            }),
        })

        const gameEngineState = GameEngineStateService.new({
            battleOrchestratorState,
            repository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            campaign: CampaignService.default(),
        })

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
            gameEngineState,
            battleSquaddieSelectedId: battleSquaddieBase.battleSquaddieId,
            selectionMethod: {
                mouseClick: MouseClickService.new({
                    x: 0,
                    y: 0,
                    button: MouseButton.ACCEPT,
                }),
            },
        })

        SquaddieTurnService.spendActionPoints(
            battleSquaddieBase.squaddieTurn,
            actionTemplate.actionPoints
        )
        return gameEngineState
    }

    it("hides dead squaddies after the action animates", () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })

        const state = usePowerAttackLongswordAndReturnState({ missionMap })
        expect(
            missionMap.isSquaddieHiddenFromDrawing(
                targetDynamic.battleSquaddieId
            )
        ).toBeFalsy()

        InBattleAttributesService.takeDamage(
            targetDynamic.inBattleAttributes,
            targetStatic.attributes.maxHitPoints,
            DamageType.BODY
        )
        expect(
            IsSquaddieAlive({
                battleSquaddie: targetDynamic,
                squaddieTemplate: targetStatic,
            })
        ).toBeFalsy()

        jest.spyOn(
            squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
            "update"
        ).mockImplementation()
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "hasCompleted"
            )
            .mockReturnValue(true)

        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext)
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()
        expect(
            missionMap.isSquaddieHiddenFromDrawing(
                targetDynamic.battleSquaddieId
            )
        ).toBeTruthy()
    })

    it("clears the action builder when the action finishes animating", () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })

        const actionBuilderSpy: jest.SpyInstance = jest.spyOn(
            OrchestratorUtilities,
            "resetActionBuilderIfActionIsComplete"
        )
        const gameEngineState = usePowerAttackLongswordAndReturnState({
            missionMap,
        })
        battleSquaddieBase.squaddieTurn.remainingActionPoints = 1

        jest.spyOn(
            squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
            "update"
        ).mockImplementation()
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "hasCompleted"
            )
            .mockReturnValue(true)

        squaddieUsesActionOnSquaddie.update(
            gameEngineState,
            mockedP5GraphicsContext
        )
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()

        squaddieUsesActionOnSquaddie.recommendStateChanges(gameEngineState)
        squaddieUsesActionOnSquaddie.reset(gameEngineState)

        expect(actionBuilderSpy).toBeCalledWith(gameEngineState)
        expect(
            BattleActionDecisionStepService.isActionRecordComplete(
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState
            )
        ).toBeFalsy()
    })

    it("sends a message noting the animation is complete", () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })

        const gameEngineState = usePowerAttackLongswordAndReturnState({
            missionMap,
        })
        battleSquaddieBase.squaddieTurn.remainingActionPoints = 1

        const messageSpy: jest.SpyInstance = jest.spyOn(
            gameEngineState.messageBoard,
            "sendMessage"
        )

        jest.spyOn(
            squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
            "update"
        ).mockImplementation()
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "hasCompleted"
            )
            .mockReturnValue(true)

        squaddieUsesActionOnSquaddie.update(
            gameEngineState,
            mockedP5GraphicsContext
        )
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()

        squaddieUsesActionOnSquaddie.recommendStateChanges(gameEngineState)
        squaddieUsesActionOnSquaddie.reset(gameEngineState)

        expect(messageSpy).toBeCalledWith({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
        })
        messageSpy.mockRestore()
    })

    it("resets squaddie currently acting when it runs out of actions and finishes acting", () => {
        const orchestratorUtilsSpy: jest.SpyInstance = jest.spyOn(
            OrchestratorUtilities,
            "clearActionsThisRoundIfSquaddieCannotAct"
        )

        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })

        const gameEngineState = usePowerAttackLongswordAndReturnState({
            missionMap,
        })
        battleSquaddieBase.squaddieTurn.remainingActionPoints = 0

        const animatorSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "update"
            )
            .mockImplementation()
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "hasCompleted"
            )
            .mockReturnValue(true)

        squaddieUsesActionOnSquaddie.update(
            gameEngineState,
            mockedP5GraphicsContext
        )
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()
        expect(
            squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
        ).toBeTruthy()

        squaddieUsesActionOnSquaddie.recommendStateChanges(gameEngineState)
        expect(orchestratorUtilsSpy).toBeCalledWith(gameEngineState)
        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState
        ).toBeUndefined()
        expect(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
        ).toBeUndefined()

        animatorSpy.mockRestore()
        orchestratorUtilsSpy.mockRestore()
    })

    it("reopens HUD on squaddie when it finishes animating and can still act", () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 "],
            }),
        })

        const gameEngineState = usePowerAttackLongswordAndReturnState({
            missionMap,
        })
        const battleHUDListener = new BattleHUDListener("battleHUDListener")
        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
        )

        battleSquaddieBase.squaddieTurn.remainingActionPoints = 1

        jest.spyOn(
            squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
            "update"
        ).mockImplementation()
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "hasCompleted"
            )
            .mockReturnValue(true)

        squaddieUsesActionOnSquaddie.update(
            gameEngineState,
            mockedP5GraphicsContext
        )
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()
        expect(
            squaddieUsesActionOnSquaddie.hasCompleted(gameEngineState)
        ).toBeTruthy()

        squaddieUsesActionOnSquaddie.recommendStateChanges(gameEngineState)
        squaddieUsesActionOnSquaddie.reset(gameEngineState)
        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.showSummaryHUD
        ).toBeTruthy()
        expect(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
        ).not.toBeUndefined()
    })

    it("uses the SquaddieTargetsOtherSquaddiesAnimator for appropriate situations and waits after it completes", () => {
        const state = usePowerAttackLongswordAndReturnState({})

        const squaddieTargetsOtherSquaddiesAnimatorUpdateSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "update"
            )
            .mockImplementation()
        const squaddieTargetsOtherSquaddiesAnimatorResetSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "reset"
            )
            .mockImplementation()
        const squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "hasCompleted"
            )
            .mockReturnValue(false)
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext)

        expect(
            squaddieUsesActionOnSquaddie.squaddieActionAnimator
        ).toBeInstanceOf(SquaddieTargetsOtherSquaddiesAnimator)
        expect(squaddieTargetsOtherSquaddiesAnimatorUpdateSpy).toBeCalled()
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeFalsy()

        squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy.mockReturnValue(
            true
        )
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext)
        expect(squaddieTargetsOtherSquaddiesAnimatorUpdateSpy).toBeCalled()
        expect(
            squaddieTargetsOtherSquaddiesAnimatorHasCompletedSpy
        ).toBeCalled()
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeTruthy()

        const stateChanges =
            squaddieUsesActionOnSquaddie.recommendStateChanges(state)
        expect(stateChanges.nextMode).toBeUndefined()
        expect(stateChanges.displayMap).toBeTruthy()

        squaddieUsesActionOnSquaddie.reset(state)
        expect(squaddieTargetsOtherSquaddiesAnimatorResetSpy).toBeCalled()
    })

    it("uses the SquaddieSkipsAnimationAnimator for actions that lack animation and waits after it completes", () => {
        const state = useMonkKoanAndReturnState({})

        const squaddieSkipsAnimationAnimatorUpdateSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator,
                "update"
            )
            .mockImplementation()
        const squaddieSkipsAnimationAnimatorResetSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator,
                "reset"
            )
            .mockImplementation()
        const squaddieSkipsAnimationAnimatorHasCompletedSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieSkipsAnimationAnimator,
                "hasCompleted"
            )
            .mockReturnValue(false)
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext)

        expect(
            squaddieUsesActionOnSquaddie.squaddieActionAnimator
        ).toBeInstanceOf(SquaddieSkipsAnimationAnimator)
        expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled()
        expect(squaddieSkipsAnimationAnimatorHasCompletedSpy).toBeCalled()
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeFalsy()

        squaddieSkipsAnimationAnimatorHasCompletedSpy.mockReturnValue(true)
        squaddieUsesActionOnSquaddie.update(state, mockedP5GraphicsContext)
        expect(squaddieSkipsAnimationAnimatorUpdateSpy).toBeCalled()
        expect(squaddieSkipsAnimationAnimatorHasCompletedSpy).toBeCalled()
        expect(squaddieUsesActionOnSquaddie.hasCompleted(state)).toBeTruthy()

        squaddieUsesActionOnSquaddie.reset(state)
        expect(squaddieSkipsAnimationAnimatorResetSpy).toBeCalled()
    })

    it("passes mouse events on to the animator", () => {
        const state = usePowerAttackLongswordAndReturnState({})

        const squaddieTargetsOtherSquaddiesAnimatorMouseEventHappenedSpy = jest
            .spyOn(
                squaddieUsesActionOnSquaddie.squaddieTargetsOtherSquaddiesAnimator,
                "mouseEventHappened"
            )
            .mockImplementation()

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
        const gameEngineState = useAttackActionAndReturnState({
            actionTemplate: attackLongswordAction,
        })
        const messageBoardSendSpy: jest.SpyInstance = jest.spyOn(
            gameEngineState.messageBoard,
            "sendMessage"
        )

        squaddieUsesActionOnSquaddie.recommendStateChanges(gameEngineState)
        squaddieUsesActionOnSquaddie.reset(gameEngineState)

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
