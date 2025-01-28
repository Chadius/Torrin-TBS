import { MouseClick, ScreenLocation } from "../../utils/mouseConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { OrchestratorUtilities } from "../orchestratorComponents/orchestratorUtils"
import {
    PlayerSelectionContext,
    PlayerSelectionContextService,
} from "./playerSelectionContext"
import {
    PlayerSelectionChanges,
    PlayerSelectionChangesService,
} from "./playerSelectionChanges"
import { BattleStateService } from "../orchestrator/battleState"
import { isValidValue } from "../../utils/validityCheck"
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

export enum PlayerIntent {
    UNKNOWN = "UNKNOWN",
    START_OF_TURN_CLICK_ON_EMPTY_TILE = "START_OF_TURN_CLICK_ON_EMPTY_TILE",
    END_PHASE = "END_PHASE",
    START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE = "START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE",
    START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE = "START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE",
    START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE = "START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE",
    PEEK_AT_SQUADDIE = "PEEK_AT_SQUADDIE",
    SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_COORDINATE = "SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_COORDINATE",
    SQUADDIE_SELECTED_DIFFERENT_SQUADDIE_MID_TURN = "SQUADDIE_SELECTED_DIFFERENT_SQUADDIE_MID_TURN",
    SQUADDIE_SELECTED_CANCEL_SQUADDIE_SELECTION = "SQUADDIE_SELECTED_CANCEL_SQUADDIE_SELECTION",
    PLAYER_SELECTS_AN_ACTION = "PLAYER_SELECTS_AN_ACTION",
    END_SQUADDIE_TURN = "END_SQUADDIE_TURN",
    SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE = "SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE",
}

export interface PlayerSelectionContextCalculationArgs {
    gameEngineState: GameEngineState
    mouseClick?: MouseClick
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
        mouseClick?: MouseClick
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
        const isSquaddieTakingATurn: boolean =
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            )
        let battleSquaddieIdCurrentlyTakingATurn: string =
            OrchestratorUtilities.getBattleSquaddieIdCurrentlyTakingATurn({
                gameEngineState,
            })

        const hasAtLeastOnePlayerControllableSquaddie: boolean =
            playerCanControlAtLeastOneSquaddie(gameEngineState)

        const clickedLocation: HexCoordinate = mouseClick
            ? getClickedOnLocation({
                  gameEngineState,
                  screenCoordinate: { x: mouseClick.x, y: mouseClick.y },
              })
            : undefined

        const playerSelectsAnAction: boolean = !!actionTemplateId
        const playerEndsTheirTurn: boolean = !!endTurnSelected
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

        const battleSquaddieTryingToStartAnAction: string =
            battleSquaddieIdCurrentlyMakingADecision ||
            battleSquaddieIdCurrentlyTakingATurn

        const {
            clickedOnSquaddie,
            battleSquaddieId: clickedBattleSquaddieId,
            squaddieIsNormallyControllableByPlayer,
        } = getSquaddiePlayerClickedOn({
            gameEngineState,
            mouseClick,
        })

        const {
            hoveredOverSquaddie,
            battleSquaddieId: hoveredBattleSquaddieId,
        } = getSquaddiePlayerHoveredOver({
            gameEngineState,
            mouseMovement,
        })

        const mouseClickLocationIsOnMap: boolean =
            !!mouseClick &&
            !!clickedLocation &&
            TerrainTileMapService.isCoordinateOnMap(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
                clickedLocation
            )

        const playerClickedOnADifferentSquaddieThanTheActingSquaddie: boolean =
            clickedOnSquaddie &&
            clickedBattleSquaddieId !== battleSquaddieTryingToStartAnAction

        switch (true) {
            case battleSquaddieTryingToStartAnAction && playerSelectsAnAction:
                return calculateContextWhenPlayerSelectsAnAction({
                    gameEngineState,
                    actionTemplateId,
                    actorBattleSquaddieId: battleSquaddieTryingToStartAnAction,
                    mouseClick,
                })
            case battleSquaddieTryingToStartAnAction && playerEndsTheirTurn:
                return PlayerSelectionContextService.new({
                    playerIntent: PlayerIntent.END_SQUADDIE_TURN,
                    actorBattleSquaddieId: battleSquaddieTryingToStartAnAction,
                })
            case !hasAtLeastOnePlayerControllableSquaddie:
                return PlayerSelectionContextService.new({
                    playerIntent: PlayerIntent.END_PHASE,
                })
            case !isSquaddieTakingATurn &&
                clickedOnSquaddie &&
                squaddieIsNormallyControllableByPlayer:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE,
                    actorBattleSquaddieId: clickedBattleSquaddieId,
                    mouseClick,
                })
            case !isSquaddieTakingATurn &&
                clickedOnSquaddie &&
                !squaddieIsNormallyControllableByPlayer:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE,
                    actorBattleSquaddieId: clickedBattleSquaddieId,
                    mouseClick,
                })
            case isSquaddieTakingATurn &&
                playerClickedOnADifferentSquaddieThanTheActingSquaddie &&
                !!mouseClick:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_DIFFERENT_SQUADDIE_MID_TURN,
                    actorBattleSquaddieId: clickedBattleSquaddieId,
                    mouseClick,
                })
            case battleSquaddieTryingToStartAnAction &&
                mouseClickLocationIsOnMap:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_COORDINATE,
                    actorBattleSquaddieId: battleSquaddieTryingToStartAnAction,
                    mouseClick,
                })
            case battleSquaddieTryingToStartAnAction &&
                !!mouseClick &&
                !mouseClickLocationIsOnMap &&
                !isSquaddieTakingATurn:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_CANCEL_SQUADDIE_SELECTION,
                })
            case hoveredOverSquaddie:
                return PlayerSelectionContextService.new({
                    playerIntent: PlayerIntent.PEEK_AT_SQUADDIE,
                    actorBattleSquaddieId: hoveredBattleSquaddieId,
                    mouseMovement,
                })
            case !!mouseClick && !isSquaddieTakingATurn:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.START_OF_TURN_CLICK_ON_EMPTY_TILE,
                    mouseClick,
                })
            case playerInputActions.includes(PlayerInputAction.NEXT):
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE,
                    playerInputActions: [PlayerInputAction.NEXT],
                })
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
                  screenX: context.mouseClick.x,
                  screenY: context.mouseClick.y,
                  ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
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
                    gameEngineState,
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
                    gameEngineState,
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({ messageSent })
            case PlayerIntent.SQUADDIE_SELECTED_CANCEL_SQUADDIE_SELECTION:
                messageSent = {
                    type: MessageBoardMessageType.PLAYER_CANCELS_SQUADDIE_SELECTION,
                    gameEngineState,
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({ messageSent })
            case PlayerIntent.START_OF_TURN_CLICK_ON_EMPTY_TILE:
                messageSent = {
                    type: MessageBoardMessageType.PLAYER_SELECTS_EMPTY_TILE,
                    gameEngineState,
                    coordinate: { q, r },
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
                        screenX: context.mouseClick.x,
                        screenY: context.mouseClick.y,
                        camera: gameEngineState.battleOrchestratorState
                            .battleState.camera,
                        text: `${targetSquaddieTemplate.squaddieId.name} is out of range`,
                        coordinateSystem: CoordinateSystem.SCREEN,
                    }),
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({ messageSent })
        }
        return PlayerSelectionChangesService.new({})
    },
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
    mouseClick: MouseClick
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
        screenCoordinate: {
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

const getSquaddiePlayerHoveredOver = ({
    gameEngineState,
    mouseMovement,
}: {
    gameEngineState: GameEngineState
    mouseMovement: { x: number; y: number }
}): {
    hoveredOverSquaddie: boolean
    battleSquaddieId: string
} => {
    if (mouseMovement === undefined) {
        return {
            hoveredOverSquaddie: false,
            battleSquaddieId: undefined,
        }
    }
    const battleSquaddieId = getBattleSquaddieIdAtLocation({
        screenCoordinate: {
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

const getBattleSquaddieIdAtLocation = ({
    screenCoordinate,
    gameEngineState,
}: {
    screenCoordinate?: ScreenLocation
    gameEngineState: GameEngineState
}) => {
    const { q, r } = getClickedOnLocation({ screenCoordinate, gameEngineState })

    const { battleSquaddieId } =
        MissionMapService.getBattleSquaddieAtCoordinate(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            { q, r }
        )
    return battleSquaddieId
}

const getClickedOnLocation = ({
    screenCoordinate,
    gameEngineState,
}: {
    screenCoordinate: ScreenLocation
    gameEngineState: GameEngineState
}): HexCoordinate => {
    if (!screenCoordinate) {
        return undefined
    }

    const { q, r } =
        ConvertCoordinateService.convertScreenLocationToMapCoordinates({
            screenX: screenCoordinate.x,
            screenY: screenCoordinate.y,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
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
    const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        battleSquaddieId
    )

    let messageSent: MessageBoardMessage
    if (context.targetBattleSquaddieIds.length > 0) {
        messageSent = {
            type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_WITH_KNOWN_TARGETS,
            gameEngineState,
            actionTemplateId: context.actionTemplateId,
            actorBattleSquaddieId: context.actorBattleSquaddieId,
            mapStartingCoordinate: mapCoordinate,
            targetBattleSquaddieIds: context.targetBattleSquaddieIds,
        }
    } else {
        messageSent = {
            type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET,
            gameEngineState,
            actionTemplateId: context.actionTemplateId,
            battleSquaddieId: context.actorBattleSquaddieId,
            mapStartingCoordinate: mapCoordinate,
            mouseLocation: {
                x: context.mouseClick.x,
                y: context.mouseClick.y,
            },
        }
    }

    gameEngineState.messageBoard.sendMessage(messageSent)
    return PlayerSelectionChangesService.new({
        messageSent,
        battleOrchestratorMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
    })
}

const calculateContextWhenPlayerSelectsAnAction = ({
    gameEngineState,
    actionTemplateId,
    actorBattleSquaddieId,
    mouseClick,
}: {
    gameEngineState: GameEngineState
    actionTemplateId: string
    actorBattleSquaddieId: string
    mouseClick: MouseClick
}) => {
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
        return PlayerSelectionContextService.new({
            playerIntent: PlayerIntent.PLAYER_SELECTS_AN_ACTION,
            actionTemplateId,
            actorBattleSquaddieId: actorBattleSquaddieId,
            mouseClick,
            targetBattleSquaddieIds: [actorBattleSquaddieId],
        })
    }

    const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            actorBattleSquaddieId
        )
    )

    const potentialTargetBattleSquaddieIds =
        TargetingResultsService.findValidTargets({
            map: gameEngineState.battleOrchestratorState.battleState.missionMap,
            actionTemplate,
            actionEffectSquaddieTemplate:
                actionTemplate.actionEffectTemplates[0],
            actingSquaddieTemplate: squaddieTemplate,
            actingBattleSquaddie: battleSquaddie,
            squaddieRepository: gameEngineState.repository,
        }).battleSquaddieIdsInRange

    return PlayerSelectionContextService.new({
        playerIntent: PlayerIntent.PLAYER_SELECTS_AN_ACTION,
        actionTemplateId,
        actorBattleSquaddieId: actorBattleSquaddieId,
        mouseClick,
        targetBattleSquaddieIds:
            potentialTargetBattleSquaddieIds.length <= 1
                ? potentialTargetBattleSquaddieIds
                : [],
    })
}
