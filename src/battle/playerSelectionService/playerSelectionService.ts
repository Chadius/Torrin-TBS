import { MousePress, ScreenLocation } from "../../utils/mouseConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { OrchestratorUtilities } from "../orchestratorComponents/orchestratorUtils"
import {
    MovementDecision,
    PlayerSelectionContext,
    PlayerSelectionContextService,
} from "./playerSelectionContext"
import {
    PlayerSelectionChanges,
    PlayerSelectionChangesService,
} from "./playerSelectionChanges"
import { BattleStateService } from "../battleState/battleState"
import { isValidValue } from "../../utils/objectValidityCheck"
import { BattleSquaddieTeamService } from "../battleSquaddieTeam"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { MissionMapService } from "../../missionMap/missionMap"
import { ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import {
    MessageBoardMessage,
    MessageBoardMessageType,
} from "../../message/messageBoardMessage"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    CoordinateSystem,
    HexCoordinate,
} from "../../hexMap/hexCoordinate/hexCoordinate"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { PopupWindowService } from "../hud/popupWindow/popupWindow"
import { PlayerInputAction } from "../../ui/playerInput/playerInputState"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../../action/template/actionEffectTemplate"
import { TargetingResultsService } from "../targeting/targetingService"
import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import { SelectorComposite } from "../../utils/behaviorTree/composite/selector/selector"
import { BattleSquaddieSelectorService } from "../orchestratorComponents/battleSquaddieSelectorUtils"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { PlayerClicksOnSquaddieSelectorPanel } from "./contextCalculator/playerClicksOnSquaddieSelectorPanel"
import { PlayerMovesOffMapToCancelConsideredActions } from "./contextCalculator/playerMovesOffMapToCancelConsideredActions"
import { SearchPathAdapterService } from "../../search/searchPathAdapter/searchPathAdapter"

export interface PlayerContextDataBlob extends DataBlob {
    data: {
        playerSelectionContextCalculationArgs: PlayerSelectionContextCalculationArgs
        playerSelectionContext?: PlayerSelectionContext
    }
}

export enum PlayerIntent {
    UNKNOWN = "UNKNOWN",
    END_PHASE = "END_PHASE",
    START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE = "START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE",
    START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE = "START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE",
    START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE = "START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE",
    PEEK_AT_SQUADDIE = "PEEK_AT_SQUADDIE",
    SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_COORDINATE = "SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_COORDINATE",
    CONSIDER_MOVING_SQUADDIE = "CONSIDER_MOVING_SQUADDIE",
    SQUADDIE_SELECTED_DIFFERENT_SQUADDIE_MID_TURN = "SQUADDIE_SELECTED_DIFFERENT_SQUADDIE_MID_TURN",
    CANCEL_SQUADDIE_CONSIDERED_ACTIONS = "CANCEL_SQUADDIE_CONSIDERED_ACTIONS",
    PLAYER_SELECTS_AN_ACTION = "PLAYER_SELECTS_AN_ACTION",
    END_SQUADDIE_TURN = "END_SQUADDIE_TURN",
    SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE = "SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE",
}

export interface PlayerSelectionContextCalculationArgs {
    gameEngineState: GameEngineState
    mouseClick?: MousePress
    mouseMovement?: ScreenLocation
    actionTemplateId?: string
    endTurnSelected?: boolean
    playerInputActions: PlayerInputAction[]
}

export const PlayerSelectionContextCalculationArgsService = {
    new: ({
        gameEngineState,
        mouseClick,
        mouseMovement,
        actionTemplateId,
        endTurnSelected,
        playerInputActions,
    }: {
        gameEngineState: GameEngineState
        mouseClick?: MousePress
        mouseMovement?: ScreenLocation
        actionTemplateId?: string
        endTurnSelected?: boolean
        playerInputActions: PlayerInputAction[]
    }): PlayerSelectionContextCalculationArgs => ({
        gameEngineState,
        mouseClick,
        mouseMovement,
        actionTemplateId,
        endTurnSelected,
        playerInputActions,
    }),
}

export const PlayerSelectionService = {
    calculateContext: ({
        gameEngineState,
        mouseClick,
        mouseMovement,
        actionTemplateId,
        endTurnSelected,
        playerInputActions,
    }: PlayerSelectionContextCalculationArgs): PlayerSelectionContext => {
        const dataBlob: PlayerContextDataBlob = {
            data: {
                playerSelectionContextCalculationArgs: {
                    gameEngineState,
                    mouseClick,
                    mouseMovement,
                    actionTemplateId,
                    endTurnSelected,
                    playerInputActions,
                },
            },
        }

        const calculateBehaviorTree = new CollectDataForContext(dataBlob)
        calculateBehaviorTree.run()

        const selectWorkingBehaviorTree = new SelectorComposite(dataBlob, [
            new PlayerSelectsAnActionBehavior(dataBlob),
            new PlayerEndsSquaddieTurnBehavior(dataBlob),
            new EndPhaseIfPlayerLacksControllableSquaddiesBehavior(dataBlob),
            new PlayerClicksOnPlayableSquaddieBeforeTurnStartsBehavior(
                dataBlob
            ),
            new PlayerClicksOnUncontrollableSquaddieBeforeTurnStartsBehavior(
                dataBlob
            ),
            new AfterSquaddieStartsTurnPlayerClicksADifferentSquaddieBehavior(
                dataBlob
            ),
            new PlayerClicksOnSquaddieSelectorPanel(dataBlob),
            new PlayerClicksOnTheMapToMoveTheSelectedSquaddieBehavior(dataBlob),
            new PlayerPressesNextButtonBehavior(dataBlob),
            new PlayerMovesOffMapToCancelConsideredActions(dataBlob),
            new PlayerHoversOverSquaddieToPeekAtItBehavior(dataBlob),
            new PlayerConsidersMovementForSelectedSquaddie(dataBlob),
        ])

        if (selectWorkingBehaviorTree.run()) {
            return DataBlobService.get<PlayerSelectionContext>(
                dataBlob,
                "playerSelectionContext"
            )
        }

        return PlayerSelectionContextService.new({
            playerIntent: PlayerIntent.UNKNOWN,
        })
    },
    applyContextToGetChanges: ({
        context,
        gameEngineState,
    }: {
        context: PlayerSelectionContext
        gameEngineState: GameEngineState
    }): PlayerSelectionChanges => {
        let messageSent: MessageBoardMessage
        const { q, r } = context.mouseClick
            ? ConvertCoordinateService.convertScreenLocationToMapCoordinates({
                  screenLocation: context.mouseClick,
                  cameraLocation:
                      gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
              })
            : { q: 0, r: 0 }
        let endTurnBattleAction: BattleAction
        const { squaddieTemplate: targetSquaddieTemplate } =
            getSquaddiePlayerClickedOn({
                gameEngineState,
                mouseClick: context.mouseClick,
            })

        switch (context.playerIntent) {
            case PlayerIntent.END_PHASE:
                return PlayerSelectionChangesService.new({
                    battleOrchestratorMode:
                        BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR,
                })
            case PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE:
            case PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE:
                messageSent = {
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: context.actorBattleSquaddieId,
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({ messageSent })
            case PlayerIntent.PEEK_AT_SQUADDIE:
                messageSent = {
                    type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    objectRepository: gameEngineState.repository,
                    campaignResources: gameEngineState.campaign.resources,
                    battleSquaddieSelectedId: context.actorBattleSquaddieId,
                    selectionMethod: {
                        mouse: context.mouseMovement,
                    },
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({ messageSent })
            case PlayerIntent.START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE:
                messageSent = {
                    type: MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE,
                    gameEngineState,
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({ messageSent })
            case PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_COORDINATE:
                messageSent = {
                    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_COORDINATE,
                    battleSquaddieId: context.actorBattleSquaddieId,
                    targetCoordinate: { q, r },
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    objectRepository: gameEngineState.repository,
                    messageBoard: gameEngineState.messageBoard,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    campaignResources: gameEngineState.campaign.resources,
                    battleState:
                        gameEngineState.battleOrchestratorState.battleState,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({ messageSent })
            case PlayerIntent.CANCEL_SQUADDIE_CONSIDERED_ACTIONS:
                messageSent = {
                    type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                    playerConsideredActions:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerConsideredActions,
                    playerDecisionHUD:
                        gameEngineState.battleOrchestratorState
                            .playerDecisionHUD,
                    playerCommandState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState.playerCommandState,
                    objectRepository: gameEngineState.repository,
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({ messageSent })
            case PlayerIntent.PLAYER_SELECTS_AN_ACTION:
                return playerSelectsAnAction({
                    gameEngineState,
                    context,
                })
            case PlayerIntent.END_SQUADDIE_TURN:
                endTurnBattleAction = BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId: context.actorBattleSquaddieId,
                    },
                    action: { isEndTurn: true },
                    effect: { endTurn: true },
                })

                messageSent = {
                    type: MessageBoardMessageType.PLAYER_ENDS_TURN,
                    gameEngineState,
                    battleAction: endTurnBattleAction,
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({
                    messageSent,
                    battleOrchestratorMode:
                        BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
                })
            case PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE:
                messageSent = {
                    type: MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID,
                    gameEngineState,
                    popupWindow: PopupWindowService.newWarningWindow({
                        screenLocation: context.mouseClick,
                        camera: gameEngineState.battleOrchestratorState
                            .battleState.camera,
                        text: `${targetSquaddieTemplate.squaddieId.name} is out of range`,
                        coordinateSystem: CoordinateSystem.SCREEN,
                    }),
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({ messageSent })
            case PlayerIntent.CONSIDER_MOVING_SQUADDIE:
                if (context.movement == undefined) {
                    messageSent = {
                        type: MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS,
                        missionMap:
                            gameEngineState.battleOrchestratorState.battleState
                                .missionMap,
                        summaryHUDState:
                            gameEngineState.battleOrchestratorState
                                .battleHUDState.summaryHUDState,
                        battleActionDecisionStep:
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionDecisionStep,
                        battleActionRecorder:
                            gameEngineState.battleOrchestratorState.battleState
                                .battleActionRecorder,
                        playerConsideredActions:
                            gameEngineState.battleOrchestratorState.battleState
                                .playerConsideredActions,
                        playerDecisionHUD:
                            gameEngineState.battleOrchestratorState
                                .playerDecisionHUD,
                        playerCommandState:
                            gameEngineState.battleOrchestratorState
                                .battleHUDState.summaryHUDState
                                .playerCommandState,
                        objectRepository: gameEngineState.repository,
                    }
                    gameEngineState.messageBoard.sendMessage(messageSent)
                    return PlayerSelectionChangesService.new({ messageSent })
                }

                messageSent = {
                    type: MessageBoardMessageType.PLAYER_CONSIDERS_MOVEMENT,
                    playerConsideredActions:
                        gameEngineState.battleOrchestratorState.battleState
                            .playerConsideredActions,
                    summaryHUDState:
                        gameEngineState.battleOrchestratorState.battleHUDState
                            .summaryHUDState,
                    playerDecisionHUD:
                        gameEngineState.battleOrchestratorState
                            .playerDecisionHUD,
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    objectRepository: gameEngineState.repository,
                    movementDecision: context.movement,
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({ messageSent })
        }
        return PlayerSelectionChangesService.new({})
    },
    addPlayerSelectionContextToDataBlob: (
        dataBlob: PlayerContextDataBlob,
        playerSelectionContext: PlayerSelectionContext
    ) => addPlayerSelectionContextToDataBlob(dataBlob, playerSelectionContext),
}

const playerCanControlAtLeastOneSquaddie = (
    gameEngineState: GameEngineState
): boolean => {
    const currentTeam = BattleStateService.getCurrentTeam(
        gameEngineState.battleOrchestratorState.battleState,
        gameEngineState.repository
    )
    if (!isValidValue(currentTeam)) {
        return false
    }
    return BattleSquaddieTeamService.canPlayerControlAnySquaddieOnThisTeamRightNow(
        currentTeam,
        gameEngineState.repository
    )
}

const getSquaddiePlayerClickedOn = ({
    gameEngineState,
    mouseClick,
}: {
    gameEngineState: GameEngineState
    mouseClick: MousePress
}): {
    clickedOnSquaddie: boolean
    squaddieIsNormallyControllableByPlayer: boolean
    battleSquaddieId: string
    squaddieTemplate: SquaddieTemplate
} => {
    if (mouseClick === undefined) {
        return {
            clickedOnSquaddie: false,
            squaddieIsNormallyControllableByPlayer: false,
            battleSquaddieId: undefined,
            squaddieTemplate: undefined,
        }
    }
    const battleSquaddieId = getBattleSquaddieIdAtLocation({
        screenLocation: {
            x: mouseClick.x,
            y: mouseClick.y,
        },
        gameEngineState,
    })

    if (battleSquaddieId === undefined) {
        return {
            clickedOnSquaddie: false,
            squaddieIsNormallyControllableByPlayer: false,
            battleSquaddieId: undefined,
            squaddieTemplate: undefined,
        }
    }

    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieId
        )
    )

    const { squaddieIsNormallyControllableByPlayer } =
        SquaddieService.canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })

    return {
        clickedOnSquaddie: true,
        squaddieIsNormallyControllableByPlayer,
        battleSquaddieId,
        squaddieTemplate,
    }
}

const getBattleSquaddieIdAtLocation = ({
    screenLocation,
    gameEngineState,
}: {
    screenLocation?: ScreenLocation
    gameEngineState: GameEngineState
}) => {
    const { q, r } = getCoordinateAtLocation({
        screenLocation,
        gameEngineState,
    })

    const { battleSquaddieId } =
        MissionMapService.getBattleSquaddieAtCoordinate(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            { q, r }
        )
    return battleSquaddieId
}

const getCoordinateAtLocation = ({
    screenLocation,
    gameEngineState,
}: {
    screenLocation: ScreenLocation
    gameEngineState: GameEngineState
}): HexCoordinate => {
    if (!screenLocation) {
        return undefined
    }

    const { q, r } =
        ConvertCoordinateService.convertScreenLocationToMapCoordinates({
            screenLocation,
            cameraLocation:
                gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
        })

    return { q, r }
}

const playerSelectsAnAction = ({
    gameEngineState,
    context,
}: {
    gameEngineState: GameEngineState
    context: PlayerSelectionContext
}) => {
    const actionBuilderState =
        gameEngineState.battleOrchestratorState.battleState
            .battleActionDecisionStep
    const battleSquaddieId =
        BattleActionDecisionStepService.getActor(
            actionBuilderState
        ).battleSquaddieId
    const { currentMapCoordinate } = MissionMapService.getByBattleSquaddieId(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        battleSquaddieId
    )

    let messageSent: MessageBoardMessage = {
        type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_TEMPLATE,
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
        objectRepository: gameEngineState.repository,
        summaryHUDState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState,
        battleActionDecisionStep:
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep,
        messageBoard: gameEngineState.messageBoard,
        actionTemplateId: context.actionTemplateId,
        battleSquaddieId: context.actorBattleSquaddieId,
        mapStartingCoordinate: currentMapCoordinate,
    }

    gameEngineState.messageBoard.sendMessage(messageSent)
    return PlayerSelectionChangesService.new({
        messageSent,
        battleOrchestratorMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
    })
}

const getBattleSquaddieTryingToStartAnAction = (
    gameEngineState: GameEngineState
) => {
    let battleSquaddieIdCurrentlyTakingATurn: string =
        OrchestratorUtilities.getBattleSquaddieIdCurrentlyTakingATurn({
            gameEngineState,
        })

    const battleSquaddieIdCurrentlyMakingADecision: string =
        BattleActionDecisionStepService.isActorSet(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
            ? BattleActionDecisionStepService.getActor(
                  gameEngineState.battleOrchestratorState.battleState
                      .battleActionDecisionStep
              ).battleSquaddieId
            : undefined

    return (
        battleSquaddieIdCurrentlyMakingADecision ||
        battleSquaddieIdCurrentlyTakingATurn
    )
}

class CollectDataForContext implements BehaviorTreeTask {
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const contextCalculationArgs =
            DataBlobService.get<PlayerSelectionContextCalculationArgs>(
                this.dataBlob,
                "playerSelectionContextCalculationArgs"
            )

        const isSquaddieTakingATurn: boolean =
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn({
                battleActionDecisionStep:
                    contextCalculationArgs.gameEngineState
                        .battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleActionRecorder:
                    contextCalculationArgs.gameEngineState
                        .battleOrchestratorState.battleState
                        .battleActionRecorder,
            })

        DataBlobService.add<boolean>(
            this.dataBlob,
            "isSquaddieTakingATurn",
            isSquaddieTakingATurn
        )

        const hasAtLeastOnePlayerControllableSquaddie: boolean =
            playerCanControlAtLeastOneSquaddie(
                contextCalculationArgs.gameEngineState
            )

        DataBlobService.add<boolean>(
            this.dataBlob,
            "hasAtLeastOnePlayerControllableSquaddie",
            hasAtLeastOnePlayerControllableSquaddie
        )

        this.calculatePlayerActionSelection(contextCalculationArgs)

        const battleSquaddieTryingToStartAnAction: string =
            getBattleSquaddieTryingToStartAnAction(
                contextCalculationArgs.gameEngineState
            )
        DataBlobService.add<string>(
            this.dataBlob,
            "battleSquaddieTryingToStartAnAction",
            battleSquaddieTryingToStartAnAction
        )

        const {
            clickedOnSquaddie,
            battleSquaddieId: clickedBattleSquaddieId,
            squaddieIsNormallyControllableByPlayer,
        } = getSquaddiePlayerClickedOn({
            gameEngineState: contextCalculationArgs.gameEngineState,
            mouseClick: contextCalculationArgs.mouseClick,
        })
        DataBlobService.add<boolean>(
            this.dataBlob,
            "clickedOnSquaddie",
            clickedOnSquaddie
        )
        DataBlobService.add<string>(
            this.dataBlob,
            "clickedBattleSquaddieId",
            clickedBattleSquaddieId
        )
        DataBlobService.add<boolean>(
            this.dataBlob,
            "squaddieIsNormallyControllableByPlayer",
            squaddieIsNormallyControllableByPlayer
        )
        this.calculateHoveredLocation(contextCalculationArgs)
        this.calculateClickedLocation(contextCalculationArgs)

        const playerClickedOnADifferentSquaddieThanTheActingSquaddie: boolean =
            clickedOnSquaddie &&
            clickedBattleSquaddieId !== battleSquaddieTryingToStartAnAction

        DataBlobService.add<boolean>(
            this.dataBlob,
            "playerClickedOnADifferentSquaddieThanTheActingSquaddie",
            playerClickedOnADifferentSquaddieThanTheActingSquaddie
        )
        return true
    }

    private calculateHoveredLocation(
        contextCalculationArgs: PlayerSelectionContextCalculationArgs
    ) {
        const {
            hoveredOverSquaddie,
            battleSquaddieId: hoveredBattleSquaddieId,
        } = this.getSquaddiePlayerHoveredOver({
            gameEngineState: contextCalculationArgs.gameEngineState,
            mouseMovement: contextCalculationArgs.mouseMovement,
        })
        DataBlobService.add<boolean>(
            this.dataBlob,
            "hoveredOverSquaddie",
            hoveredOverSquaddie
        )
        DataBlobService.add<string>(
            this.dataBlob,
            "hoveredBattleSquaddieId",
            hoveredBattleSquaddieId
        )

        const hoveredMapCoordinate = getCoordinateAtLocation({
            gameEngineState: contextCalculationArgs.gameEngineState,
            screenLocation: contextCalculationArgs.mouseMovement,
        })
        const hoveredOnTheMap = TerrainTileMapService.isCoordinateOnMap(
            contextCalculationArgs.gameEngineState.battleOrchestratorState
                .battleState.missionMap.terrainTileMap,
            hoveredMapCoordinate
        )

        DataBlobService.add<HexCoordinate>(
            this.dataBlob,
            "hoveredMapLocation",
            hoveredOnTheMap ? hoveredMapCoordinate : undefined
        )
    }

    private calculateClickedLocation(
        contextCalculationArgs: PlayerSelectionContextCalculationArgs
    ) {
        const clickedLocation: HexCoordinate = contextCalculationArgs.mouseClick
            ? getCoordinateAtLocation({
                  gameEngineState: contextCalculationArgs.gameEngineState,
                  screenLocation: {
                      x: contextCalculationArgs.mouseClick.x,
                      y: contextCalculationArgs.mouseClick.y,
                  },
              })
            : undefined
        const mouseClickLocationIsOnMap: boolean =
            !!contextCalculationArgs.mouseClick &&
            !!clickedLocation &&
            TerrainTileMapService.isCoordinateOnMap(
                contextCalculationArgs.gameEngineState.battleOrchestratorState
                    .battleState.missionMap.terrainTileMap,
                clickedLocation
            )
        DataBlobService.add<boolean>(
            this.dataBlob,
            "mouseClickLocationIsOnMap",
            mouseClickLocationIsOnMap
        )
    }

    private calculatePlayerActionSelection(
        contextCalculationArgs: PlayerSelectionContextCalculationArgs
    ) {
        const playerSelectsAnAction: boolean =
            !!contextCalculationArgs.actionTemplateId
        const playerEndsTheirTurn: boolean =
            !!contextCalculationArgs.endTurnSelected
        DataBlobService.add<boolean>(
            this.dataBlob,
            "playerSelectsAnAction",
            playerSelectsAnAction
        )
        DataBlobService.add<boolean>(
            this.dataBlob,
            "playerEndsTheirTurn",
            playerEndsTheirTurn
        )
    }

    private getSquaddiePlayerHoveredOver({
        gameEngineState,
        mouseMovement,
    }: {
        gameEngineState: GameEngineState
        mouseMovement: { x: number; y: number }
    }): {
        hoveredOverSquaddie: boolean
        battleSquaddieId: string
    } {
        if (mouseMovement === undefined) {
            return {
                hoveredOverSquaddie: false,
                battleSquaddieId: undefined,
            }
        }
        const battleSquaddieId = getBattleSquaddieIdAtLocation({
            screenLocation: {
                x: mouseMovement.x,
                y: mouseMovement.y,
            },
            gameEngineState,
        })

        return {
            hoveredOverSquaddie: !!battleSquaddieId,
            battleSquaddieId,
        }
    }
}

class PlayerSelectsAnActionBehavior implements BehaviorTreeTask {
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const battleSquaddieTryingToStartAnAction: string =
            DataBlobService.get<string>(
                this.dataBlob,
                "battleSquaddieTryingToStartAnAction"
            )
        const actorBattleSquaddieId = battleSquaddieTryingToStartAnAction

        const playerSelectsAnAction = DataBlobService.get<boolean>(
            this.dataBlob,
            "playerSelectsAnAction"
        )
        if (!(battleSquaddieTryingToStartAnAction && playerSelectsAnAction)) {
            return false
        }

        const playerSelectionContextCalculationArgs =
            DataBlobService.get<PlayerSelectionContextCalculationArgs>(
                this.dataBlob,
                "playerSelectionContextCalculationArgs"
            )
        const { gameEngineState, actionTemplateId, mouseClick } =
            playerSelectionContextCalculationArgs

        const actionTemplate: ActionTemplate =
            ObjectRepositoryService.getActionTemplateById(
                gameEngineState.repository,
                actionTemplateId
            )
        if (
            ActionEffectTemplateService.doesItOnlyTargetSelf(
                actionTemplate.actionEffectTemplates[0]
            )
        ) {
            addPlayerSelectionContextToDataBlob(
                this.dataBlob,
                PlayerSelectionContextService.new({
                    playerIntent: PlayerIntent.PLAYER_SELECTS_AN_ACTION,
                    actionTemplateId,
                    actorBattleSquaddieId: actorBattleSquaddieId,
                    mouseClick,
                    targetBattleSquaddieIds: [actorBattleSquaddieId],
                })
            )
            return true
        }

        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                actorBattleSquaddieId
            )
        )

        const potentialTargetBattleSquaddieIds =
            TargetingResultsService.findValidTargets({
                map: gameEngineState.battleOrchestratorState.battleState
                    .missionMap,
                actionTemplate,
                actionEffectSquaddieTemplate:
                    actionTemplate.actionEffectTemplates[0],
                actingSquaddieTemplate: squaddieTemplate,
                actingBattleSquaddie: battleSquaddie,
                squaddieRepository: gameEngineState.repository,
            }).battleSquaddieIdsInRange

        addPlayerSelectionContextToDataBlob(
            this.dataBlob,
            PlayerSelectionContextService.new({
                playerIntent: PlayerIntent.PLAYER_SELECTS_AN_ACTION,
                actionTemplateId,
                actorBattleSquaddieId: actorBattleSquaddieId,
                mouseClick,
                targetBattleSquaddieIds: potentialTargetBattleSquaddieIds,
            })
        )
        return true
    }
}

const addPlayerSelectionContextToDataBlob = (
    dataBlob: PlayerContextDataBlob,
    playerSelectionContext: PlayerSelectionContext
) => {
    DataBlobService.add<PlayerSelectionContext>(
        dataBlob,
        "playerSelectionContext",
        playerSelectionContext
    )
}

class PlayerEndsSquaddieTurnBehavior implements BehaviorTreeTask {
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const battleSquaddieTryingToStartAnAction: string =
            DataBlobService.get<string>(
                this.dataBlob,
                "battleSquaddieTryingToStartAnAction"
            )
        const playerEndsTheirTurn = DataBlobService.get<boolean>(
            this.dataBlob,
            "playerEndsTheirTurn"
        )

        if (!(battleSquaddieTryingToStartAnAction && playerEndsTheirTurn)) {
            return false
        }

        addPlayerSelectionContextToDataBlob(
            this.dataBlob,
            PlayerSelectionContextService.new({
                playerIntent: PlayerIntent.END_SQUADDIE_TURN,
                actorBattleSquaddieId: battleSquaddieTryingToStartAnAction,
            })
        )
        return true
    }
}

class EndPhaseIfPlayerLacksControllableSquaddiesBehavior
    implements BehaviorTreeTask
{
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const hasAtLeastOnePlayerControllableSquaddie =
            DataBlobService.get<boolean>(
                this.dataBlob,
                "hasAtLeastOnePlayerControllableSquaddie"
            )

        if (hasAtLeastOnePlayerControllableSquaddie) {
            return false
        }

        addPlayerSelectionContextToDataBlob(
            this.dataBlob,
            PlayerSelectionContextService.new({
                playerIntent: PlayerIntent.END_PHASE,
            })
        )
        return true
    }
}

class PlayerClicksOnPlayableSquaddieBeforeTurnStartsBehavior
    implements BehaviorTreeTask
{
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const isSquaddieTakingATurn = DataBlobService.get<boolean>(
            this.dataBlob,
            "isSquaddieTakingATurn"
        )

        const clickedOnSquaddie = DataBlobService.get<boolean>(
            this.dataBlob,
            "clickedOnSquaddie"
        )

        const squaddieIsNormallyControllableByPlayer =
            DataBlobService.get<boolean>(
                this.dataBlob,
                "squaddieIsNormallyControllableByPlayer"
            )

        if (
            !(
                !isSquaddieTakingATurn &&
                clickedOnSquaddie &&
                squaddieIsNormallyControllableByPlayer
            )
        ) {
            return false
        }

        const clickedBattleSquaddieId = DataBlobService.get<string>(
            this.dataBlob,
            "clickedBattleSquaddieId"
        )

        const playerSelectionContextCalculationArgs =
            DataBlobService.get<PlayerSelectionContextCalculationArgs>(
                this.dataBlob,
                "playerSelectionContextCalculationArgs"
            )
        const { mouseClick } = playerSelectionContextCalculationArgs

        addPlayerSelectionContextToDataBlob(
            this.dataBlob,
            PlayerSelectionContextService.new({
                playerIntent:
                    PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE,
                actorBattleSquaddieId: clickedBattleSquaddieId,
                mouseClick,
            })
        )
        return true
    }
}

class PlayerClicksOnUncontrollableSquaddieBeforeTurnStartsBehavior
    implements BehaviorTreeTask
{
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const isSquaddieTakingATurn = DataBlobService.get<boolean>(
            this.dataBlob,
            "isSquaddieTakingATurn"
        )

        const clickedOnSquaddie = DataBlobService.get<boolean>(
            this.dataBlob,
            "clickedOnSquaddie"
        )

        const squaddieIsNormallyControllableByPlayer =
            DataBlobService.get<boolean>(
                this.dataBlob,
                "squaddieIsNormallyControllableByPlayer"
            )

        if (
            !(
                !isSquaddieTakingATurn &&
                clickedOnSquaddie &&
                !squaddieIsNormallyControllableByPlayer
            )
        ) {
            return false
        }

        const clickedBattleSquaddieId = DataBlobService.get<string>(
            this.dataBlob,
            "clickedBattleSquaddieId"
        )

        const playerSelectionContextCalculationArgs =
            DataBlobService.get<PlayerSelectionContextCalculationArgs>(
                this.dataBlob,
                "playerSelectionContextCalculationArgs"
            )
        const { mouseClick } = playerSelectionContextCalculationArgs

        addPlayerSelectionContextToDataBlob(
            this.dataBlob,
            PlayerSelectionContextService.new({
                playerIntent:
                    PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE,
                actorBattleSquaddieId: clickedBattleSquaddieId,
                mouseClick,
            })
        )
        return true
    }
}

class AfterSquaddieStartsTurnPlayerClicksADifferentSquaddieBehavior
    implements BehaviorTreeTask
{
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const isSquaddieTakingATurn = DataBlobService.get<boolean>(
            this.dataBlob,
            "isSquaddieTakingATurn"
        )

        const playerClickedOnADifferentSquaddieThanTheActingSquaddie =
            DataBlobService.get<boolean>(
                this.dataBlob,
                "playerClickedOnADifferentSquaddieThanTheActingSquaddie"
            )

        const playerSelectionContextCalculationArgs =
            DataBlobService.get<PlayerSelectionContextCalculationArgs>(
                this.dataBlob,
                "playerSelectionContextCalculationArgs"
            )
        const { mouseClick } = playerSelectionContextCalculationArgs

        if (
            !(
                isSquaddieTakingATurn &&
                playerClickedOnADifferentSquaddieThanTheActingSquaddie &&
                !!mouseClick
            )
        ) {
            return false
        }

        const clickedBattleSquaddieId = DataBlobService.get<string>(
            this.dataBlob,
            "clickedBattleSquaddieId"
        )

        addPlayerSelectionContextToDataBlob(
            this.dataBlob,
            PlayerSelectionContextService.new({
                playerIntent:
                    PlayerIntent.SQUADDIE_SELECTED_DIFFERENT_SQUADDIE_MID_TURN,
                actorBattleSquaddieId: clickedBattleSquaddieId,
                mouseClick,
            })
        )
        return true
    }
}

class PlayerClicksOnTheMapToMoveTheSelectedSquaddieBehavior
    implements BehaviorTreeTask
{
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const battleSquaddieTryingToStartAnAction: string =
            DataBlobService.get<string>(
                this.dataBlob,
                "battleSquaddieTryingToStartAnAction"
            )

        const mouseClickLocationIsOnMap = DataBlobService.get<boolean>(
            this.dataBlob,
            "mouseClickLocationIsOnMap"
        )

        const playerSelectionContextCalculationArgs =
            DataBlobService.get<PlayerSelectionContextCalculationArgs>(
                this.dataBlob,
                "playerSelectionContextCalculationArgs"
            )
        const { mouseClick } = playerSelectionContextCalculationArgs

        if (
            !(battleSquaddieTryingToStartAnAction && mouseClickLocationIsOnMap)
        ) {
            return false
        }

        addPlayerSelectionContextToDataBlob(
            this.dataBlob,
            PlayerSelectionContextService.new({
                playerIntent:
                    PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_COORDINATE,
                actorBattleSquaddieId: battleSquaddieTryingToStartAnAction,
                mouseClick,
            })
        )
        return true
    }
}

class PlayerHoversOverSquaddieToPeekAtItBehavior implements BehaviorTreeTask {
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const hoveredOverSquaddie = DataBlobService.get<boolean>(
            this.dataBlob,
            "hoveredOverSquaddie"
        )

        const hoveredBattleSquaddieId = DataBlobService.get<string>(
            this.dataBlob,
            "hoveredBattleSquaddieId"
        )

        const playerSelectionContextCalculationArgs =
            DataBlobService.get<PlayerSelectionContextCalculationArgs>(
                this.dataBlob,
                "playerSelectionContextCalculationArgs"
            )
        const { mouseMovement } = playerSelectionContextCalculationArgs

        if (!hoveredOverSquaddie) {
            return false
        }

        addPlayerSelectionContextToDataBlob(
            this.dataBlob,
            PlayerSelectionContextService.new({
                playerIntent: PlayerIntent.PEEK_AT_SQUADDIE,
                actorBattleSquaddieId: hoveredBattleSquaddieId,
                mouseMovement,
            })
        )
        return true
    }
}

class PlayerPressesNextButtonBehavior implements BehaviorTreeTask {
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const playerSelectionContextCalculationArgs =
            DataBlobService.get<PlayerSelectionContextCalculationArgs>(
                this.dataBlob,
                "playerSelectionContextCalculationArgs"
            )
        const { playerInputActions } = playerSelectionContextCalculationArgs

        if (!playerInputActions.includes(PlayerInputAction.NEXT)) {
            return false
        }

        addPlayerSelectionContextToDataBlob(
            this.dataBlob,
            PlayerSelectionContextService.new({
                playerIntent:
                    PlayerIntent.START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE,
                playerInputActions: [PlayerInputAction.NEXT],
            })
        )
        return true
    }
}

class PlayerConsidersMovementForSelectedSquaddie implements BehaviorTreeTask {
    dataBlob: PlayerContextDataBlob

    constructor(dataBlob: PlayerContextDataBlob) {
        this.dataBlob = dataBlob
    }

    run(): boolean {
        const hoveredMapCoordinate = DataBlobService.get<HexCoordinate>(
            this.dataBlob,
            "hoveredMapLocation"
        )

        const battleSquaddieTryingToStartAnAction: string =
            DataBlobService.get<string>(
                this.dataBlob,
                "battleSquaddieTryingToStartAnAction"
            )

        if (!battleSquaddieTryingToStartAnAction || !hoveredMapCoordinate) {
            return false
        }

        const playerSelectionContextCalculationArgs =
            DataBlobService.get<PlayerSelectionContextCalculationArgs>(
                this.dataBlob,
                "playerSelectionContextCalculationArgs"
            )
        const { gameEngineState } = playerSelectionContextCalculationArgs

        const movementDecision = this.getMovementDecisionForCoordinate({
            gameEngineState,
            battleSquaddieId: battleSquaddieTryingToStartAnAction,
            coordinate: hoveredMapCoordinate,
        })

        addPlayerSelectionContextToDataBlob(
            this.dataBlob,
            PlayerSelectionContextService.new({
                playerIntent: PlayerIntent.CONSIDER_MOVING_SQUADDIE,
                movement: movementDecision,
            })
        )
        return true
    }

    getMovementDecisionForCoordinate({
        coordinate,
        gameEngineState,
        battleSquaddieId,
    }: {
        coordinate: HexCoordinate
        gameEngineState: GameEngineState
        battleSquaddieId: string
    }): MovementDecision {
        const cached =
            gameEngineState.battleOrchestratorState.battleState.mapDataBlob.get<MovementDecision>(
                coordinate
            )
        if (cached !== undefined) return cached

        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                gameEngineState.repository,
                battleSquaddieId
            )
        )

        const { unSpentActionPoints } = SquaddieService.getActionPointSpend({
            battleSquaddie,
        })

        const closestRoute =
            BattleSquaddieSelectorService.getClosestRouteForSquaddieToReachDestination(
                {
                    gameEngineState,
                    battleSquaddie,
                    squaddieTemplate,
                    distanceRangeFromDestination: {
                        minimum: 0,
                        maximum: 0,
                    },
                    actionPointsRemaining:
                        squaddieTemplate.squaddieId.affiliation ===
                        SquaddieAffiliation.PLAYER
                            ? unSpentActionPoints
                            : 0,
                    stopCoordinate: coordinate,
                }
            )

        if (closestRoute == undefined) {
            gameEngineState.battleOrchestratorState.battleState.mapDataBlob.add<MovementDecision>(
                coordinate,
                undefined
            )
            return undefined
        }

        const actionPointCost = SearchPathAdapterService.getNumberOfMoveActions(
            {
                path: closestRoute,
                movementPerAction:
                    SquaddieService.getSquaddieMovementAttributes({
                        squaddieTemplate,
                        battleSquaddie,
                    }).net.movementPerAction,
            }
        )

        const movementDecision: MovementDecision = {
            actionPointCost,
            coordinates: SearchPathAdapterService.getCoordinates(closestRoute),
            destination: SearchPathAdapterService.getHead(closestRoute),
        }
        gameEngineState.battleOrchestratorState.battleState.mapDataBlob.add<MovementDecision>(
            coordinate,
            movementDecision
        )
        return movementDecision
    }
}
