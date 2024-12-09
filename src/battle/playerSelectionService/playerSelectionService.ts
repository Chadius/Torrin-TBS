import { MouseClick, ScreenCoordinate } from "../../utils/mouseConfig"
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
import { KeyButtonName } from "../../utils/keyboardConfig"
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
import { BattleSquaddieSelectorService } from "../orchestratorComponents/battleSquaddieSelectorUtils"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { PopupWindowService } from "../hud/popupWindow"

export enum PlayerIntent {
    UNKNOWN = "UNKNOWN",
    START_OF_TURN_CLICK_ON_EMPTY_TILE = "START_OF_TURN_CLICK_ON_EMPTY_TILE",
    END_PHASE = "END_PHASE",
    START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE = "START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE",
    START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE = "START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE",
    START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE = "START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE",
    PEEK_AT_SQUADDIE = "PEEK_AT_SQUADDIE",
    SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_LOCATION = "SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_LOCATION",
    SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE = "SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE",
    SQUADDIE_SELECTED_DIFFERENT_SQUADDIE_MID_TURN = "SQUADDIE_SELECTED_DIFFERENT_SQUADDIE_MID_TURN",
    SQUADDIE_SELECTED_CANCEL_SQUADDIE_SELECTION = "SQUADDIE_SELECTED_CANCEL_SQUADDIE_SELECTION",
    PLAYER_SELECTS_AN_ACTION = "PLAYER_SELECTS_AN_ACTION",
    END_SQUADDIE_TURN = "END_SQUADDIE_TURN",
    SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE = "SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE",
}

export interface PlayerSelectionContextCalculationArgs {
    gameEngineState: GameEngineState
    mouseClick?: MouseClick
    mouseMovement?: ScreenCoordinate
    keyPress?: {
        keyButtonName: KeyButtonName
    }
    actionTemplateId?: string
    endTurnSelected?: boolean
}

export const PlayerSelectionContextCalculationArgsService = {
    new: ({
        gameEngineState,
        mouseClick,
        mouseMovement,
        keyPress,
        actionTemplateId,
        endTurnSelected,
    }: {
        gameEngineState: GameEngineState
        mouseClick?: MouseClick
        mouseMovement?: ScreenCoordinate
        keyPress?: {
            keyButtonName: KeyButtonName
        }
        actionTemplateId?: string
        endTurnSelected?: boolean
    }): PlayerSelectionContextCalculationArgs => ({
        gameEngineState,
        mouseClick,
        mouseMovement,
        keyPress,
        actionTemplateId,
        endTurnSelected,
    }),
}

export const PlayerSelectionService = {
    calculateContext: ({
        gameEngineState,
        mouseClick,
        mouseMovement,
        keyPress,
        actionTemplateId,
        endTurnSelected,
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

        const keyPressed = keyPress?.keyButtonName

        const mouseClickLocationIsOnMap: boolean =
            !!mouseClick &&
            !!clickedLocation &&
            TerrainTileMapService.isLocationOnMap(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
                clickedLocation
            )

        const playerClickedOnADifferentSquaddieThanTheActingSquaddie: boolean =
            clickedOnSquaddie &&
            clickedBattleSquaddieId !== battleSquaddieTryingToStartAnAction

        switch (true) {
            case battleSquaddieTryingToStartAnAction && playerSelectsAnAction:
                return PlayerSelectionContextService.new({
                    playerIntent: PlayerIntent.PLAYER_SELECTS_AN_ACTION,
                    actionTemplateId,
                    battleSquaddieId: battleSquaddieTryingToStartAnAction,
                    mouseClick,
                })
            case battleSquaddieTryingToStartAnAction && playerEndsTheirTurn:
                return PlayerSelectionContextService.new({
                    playerIntent: PlayerIntent.END_SQUADDIE_TURN,
                    battleSquaddieId: battleSquaddieTryingToStartAnAction,
                })
            case !hasAtLeastOnePlayerControllableSquaddie:
                return PlayerSelectionContextService.new({
                    playerIntent: PlayerIntent.END_PHASE,
                })
            case isSquaddieTakingATurn &&
                battleSquaddieTryingToStartAnAction &&
                clickedOnSquaddie &&
                squaddieIsNormallyControllableByPlayer:
                if (
                    !isDifferentSquaddieInRange(
                        battleSquaddieTryingToStartAnAction,
                        gameEngineState,
                        clickedLocation
                    )
                ) {
                    return PlayerSelectionContextService.new({
                        playerIntent:
                            PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE,
                        battleSquaddieId: battleSquaddieTryingToStartAnAction,
                        mouseClick,
                    })
                }

                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE,
                    battleSquaddieId: battleSquaddieTryingToStartAnAction,
                    mouseClick,
                })
            case !isSquaddieTakingATurn &&
                clickedOnSquaddie &&
                squaddieIsNormallyControllableByPlayer:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE,
                    battleSquaddieId: clickedBattleSquaddieId,
                    mouseClick,
                })
            case battleSquaddieTryingToStartAnAction &&
                clickedOnSquaddie &&
                !squaddieIsNormallyControllableByPlayer:
                if (
                    !isDifferentSquaddieInRange(
                        battleSquaddieTryingToStartAnAction,
                        gameEngineState,
                        clickedLocation
                    )
                ) {
                    return PlayerSelectionContextService.new({
                        playerIntent:
                            PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE_OUT_OF_RANGE,
                        battleSquaddieId: battleSquaddieTryingToStartAnAction,
                        mouseClick,
                    })
                }

                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE,
                    battleSquaddieId: battleSquaddieTryingToStartAnAction,
                    mouseClick,
                })
            case !isSquaddieTakingATurn &&
                clickedOnSquaddie &&
                !squaddieIsNormallyControllableByPlayer:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE,
                    battleSquaddieId: clickedBattleSquaddieId,
                    mouseClick,
                })
            case isSquaddieTakingATurn &&
                playerClickedOnADifferentSquaddieThanTheActingSquaddie &&
                !!mouseClick:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_DIFFERENT_SQUADDIE_MID_TURN,
                    battleSquaddieId: clickedBattleSquaddieId,
                    mouseClick,
                })
            case battleSquaddieTryingToStartAnAction &&
                mouseClickLocationIsOnMap:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_LOCATION,
                    battleSquaddieId: battleSquaddieTryingToStartAnAction,
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
                    battleSquaddieId: hoveredBattleSquaddieId,
                    mouseMovement,
                })
            case !!mouseClick && !isSquaddieTakingATurn:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.START_OF_TURN_CLICK_ON_EMPTY_TILE,
                    mouseClick,
                })
            case keyPressed === KeyButtonName.NEXT_SQUADDIE:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE,
                    keyPress: { keyButtonName: KeyButtonName.NEXT_SQUADDIE },
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
            ? ConvertCoordinateService.convertScreenCoordinatesToMapCoordinates(
                  {
                      screenX: context.mouseClick.x,
                      screenY: context.mouseClick.y,
                      ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                  }
              )
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
                    battleSquaddieSelectedId: context.battleSquaddieId,
                    selectionMethod: {
                        mouse: context.mouseClick,
                    },
                }
                gameEngineState.messageBoard.sendMessage(messageSent)
                return PlayerSelectionChangesService.new({ messageSent })
            case PlayerIntent.PEEK_AT_SQUADDIE:
                messageSent = {
                    type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: context.battleSquaddieId,
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
            case PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_LOCATION:
                messageSent = {
                    type: MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION,
                    battleSquaddieId: context.battleSquaddieId,
                    targetLocation: { q, r },
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
                    location: { q, r },
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
                        actorBattleSquaddieId: context.battleSquaddieId,
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
            case PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_SQUADDIE:
                return squaddieSelectedMoveSquaddieToSquaddie({
                    targetSquaddieLocation: { q, r },
                    context,
                    gameEngineState,
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
    screenCoordinate?: ScreenCoordinate
    gameEngineState: GameEngineState
}) => {
    const { q, r } = getClickedOnLocation({ screenCoordinate, gameEngineState })

    const { battleSquaddieId } = MissionMapService.getBattleSquaddieAtLocation(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        { q, r }
    )
    return battleSquaddieId
}

const getClickedOnLocation = ({
    screenCoordinate,
    gameEngineState,
}: {
    screenCoordinate: ScreenCoordinate
    gameEngineState: GameEngineState
}): HexCoordinate => {
    if (!screenCoordinate) {
        return undefined
    }

    const { q, r } =
        ConvertCoordinateService.convertScreenCoordinatesToMapCoordinates({
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
    const messageSent: MessageBoardMessage = {
        type: MessageBoardMessageType.PLAYER_SELECTS_ACTION_THAT_REQUIRES_A_TARGET,
        gameEngineState,
        actionTemplateId: context.actionTemplateId,
        battleSquaddieId: context.battleSquaddieId,
        mapStartingLocation: mapCoordinate,
        mouseLocation: {
            x: context.mouseClick.x,
            y: context.mouseClick.y,
        },
    }
    gameEngineState.messageBoard.sendMessage(messageSent)
    return PlayerSelectionChangesService.new({
        messageSent,
        battleOrchestratorMode: BattleOrchestratorMode.PLAYER_HUD_CONTROLLER,
    })
}

const isDifferentSquaddieInRange = (
    battleSquaddieTryingToStartAnAction: string,
    gameEngineState: GameEngineState,
    clickedLocation: HexCoordinate
) => {
    if (!battleSquaddieTryingToStartAnAction) {
        return false
    }

    const { battleSquaddieId: targetBattleSquaddieId } =
        MissionMapService.getBattleSquaddieAtLocation(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            clickedLocation
        )

    return (
        BattleSquaddieSelectorService.getBestActionAndLocationToActFrom({
            actorBattleSquaddieId: battleSquaddieTryingToStartAnAction,
            targetBattleSquaddieId,
            gameEngineState,
        }) != undefined
    )
}

const getBestActionAndLocationToActFrom = ({
    actorBattleSquaddieId,
    targetSquaddieLocation,
    gameEngineState,
}: {
    gameEngineState: GameEngineState
    actorBattleSquaddieId: string
    targetSquaddieLocation: { q: number; r: number }
}): {
    useThisActionTemplateId: string
    moveToThisLocation: HexCoordinate
} => {
    const { battleSquaddieId: targetBattleSquaddieId } =
        MissionMapService.getBattleSquaddieAtLocation(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            targetSquaddieLocation
        )

    if (!targetBattleSquaddieId) return undefined

    return BattleSquaddieSelectorService.getBestActionAndLocationToActFrom({
        actorBattleSquaddieId,
        targetBattleSquaddieId,
        gameEngineState,
    })
}

const squaddieSelectedMoveSquaddieToSquaddie = ({
    targetSquaddieLocation,
    context,
    gameEngineState,
}: {
    targetSquaddieLocation: { q: number; r: number }
    context: PlayerSelectionContext
    gameEngineState: GameEngineState
}): PlayerSelectionChanges => {
    const messageSent: MessageBoardMessage = {
        type: MessageBoardMessageType.MOVE_SQUADDIE_TO_LOCATION,
        battleSquaddieId: context.battleSquaddieId,
        targetLocation: getBestActionAndLocationToActFrom({
            actorBattleSquaddieId: context.battleSquaddieId,
            targetSquaddieLocation,
            gameEngineState,
        }).moveToThisLocation,
        gameEngineState,
    }
    gameEngineState.messageBoard.sendMessage(messageSent)
    return PlayerSelectionChangesService.new({ messageSent })
}
