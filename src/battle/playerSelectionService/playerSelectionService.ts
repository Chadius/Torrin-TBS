/*
CONTEXT

The current team
Can the player control any squaddie on this team?
Is the click on the map
Is the Main Summary Window open and it can expire
Did you click on a squaddie?
Is this squaddie controllable by the player
Did you click on the squaddie who is taking their turn?
Did you click on the same squaddie who is shown in the MAIN summary window?
Did you click on the same squaddie who is shown in the TARGET summary window?
 */

/*
SCENARIO (TODO change these into result-oriented names)
playerMakesMoveAction
selectSquaddieAndOpenHUD
reactToSelectingSquaddieThenSelectingSquaddieNotDuringTurn
reactToSelectingSquaddieThenSelectingSquaddieDuringTurn
reactToSelectingSquaddieThenSelectingSquaddie
reactToSelectingSquaddieThenSelectingMap
PlayerClickedOnAPlayableSquaddie
PlayerClickedOnANonPlayableSquaddie
PlayerClickedOnAnUnoccupiedTileOnTheMap
PlayerClickedOffMapWhenNoOneIsTakingATurn
PlayerCannotControlAnySquaddie
 */

/*
INTENT
PlayerSelectsMap
PlayerClearsMapHighlightAndSquaddieSelection
PlayerSelectsSquaddieToStartTurn
PlayerTriesToMoveSquaddie
PlayerSelectsSquaddieToPreview
PlayerSelectsATargetSquaddieToUseActionOn
PlayerSelectsASquaddieMidTurnButItIsInvalid
 */

import { MouseClick } from "../../utils/mouseConfig"
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
import { SquaddieSummaryPopoverPosition } from "../hud/playerActionPanel/squaddieSummaryPopover"
import { KeyButtonName } from "../../utils/keyboardConfig"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"

export enum PlayerIntent {
    UNKNOWN = "UNKNOWN",
    START_OF_TURN_CLICK_ON_EMPTY_TILE = "START_OF_TURN_CLICK_ON_EMPTY_TILE",
    END_PHASE = "END_PHASE",
    START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE = "START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE",
    START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE = "START_OF_TURN_CLICK_ON_SQUADDIE_UNCONTROLLABLE",
    START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE = "START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE",
    PEEK_AT_SQUADDIE = "PEEK_AT_SQUADDIE",
    SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_LOCATION = "SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_LOCATION",
    SQUADDIE_SELECTED_SELECTED_DIFFERENT_SQUADDIE_MID_TURN = "SQUADDIE_SELECTED_SELECTED_DIFFERENT_SQUADDIE_MID_TURN",
}

export const PlayerSelectionService = {
    calculateContext: ({
        gameEngineState,
        mouseClick,
        mouseMovement,
        buttonPress,
    }: {
        gameEngineState: GameEngineState
        mouseClick?: MouseClick
        mouseMovement?: { x: number; y: number }
        buttonPress?: {
            keyButtonName: KeyButtonName
        }
    }): PlayerSelectionContext => {
        const isSquaddieTakingATurn: boolean =
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            )
        const battleSquaddieIdCurrentlyTakingATurn: string =
            gameEngineState?.battleOrchestratorState?.battleState
                ?.actionsThisRound?.battleSquaddieId

        const hasAtLeastOnePlayerControllableSquaddie: boolean =
            playerCanControlAtLeastOneSquaddie(gameEngineState)

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

        const keyPressed = buttonPress?.keyButtonName

        const squaddieActorIsSet = BattleActionDecisionStepService.isActorSet(
            gameEngineState.battleOrchestratorState.battleState
                .playerBattleActionBuilderState
        )

        switch (true) {
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
                    battleSquaddieId: clickedBattleSquaddieId,
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
                clickedBattleSquaddieId !==
                    battleSquaddieIdCurrentlyTakingATurn &&
                !!mouseClick &&
                clickedOnSquaddie:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_SELECTED_DIFFERENT_SQUADDIE_MID_TURN,
                    battleSquaddieId: clickedBattleSquaddieId,
                    mouseClick,
                })
            case squaddieActorIsSet && !!mouseClick:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.SQUADDIE_SELECTED_MOVE_SQUADDIE_TO_LOCATION,
                    battleSquaddieId: clickedBattleSquaddieId,
                    mouseClick,
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
                })
            case keyPressed === KeyButtonName.NEXT_SQUADDIE:
                return PlayerSelectionContextService.new({
                    playerIntent:
                        PlayerIntent.START_OF_TURN_SELECT_NEXT_CONTROLLABLE_SQUADDIE,
                    buttonPress: KeyButtonName.NEXT_SQUADDIE,
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
        const { q, r } = !!context.mouseClick
            ? ConvertCoordinateService.convertScreenCoordinatesToMapCoordinates(
                  {
                      screenX: context.mouseClick.x,
                      screenY: context.mouseClick.y,
                      camera: gameEngineState.battleOrchestratorState
                          .battleState.camera,
                  }
              )
            : { q: 0, r: 0 }

        switch (context.playerIntent) {
            case PlayerIntent.END_PHASE:
                return PlayerSelectionChangesService.new({
                    battleOrchestratorMode:
                        BattleOrchestratorMode.COMPUTER_SQUADDIE_SELECTOR,
                })
            case PlayerIntent.START_OF_TURN_CLICK_ON_SQUADDIE_PLAYABLE:
                messageSent = {
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                    battleSquaddieSelectedId: context.battleSquaddieId,
                    selectionMethod: {
                        mouseClick: context.mouseClick,
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
                        mouseMovement: context.mouseMovement,
                    },
                    squaddieSummaryPopoverPosition:
                        SquaddieSummaryPopoverPosition.SELECT_MAIN,
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
            case PlayerIntent.SQUADDIE_SELECTED_SELECTED_DIFFERENT_SQUADDIE_MID_TURN:
                messageSent = {
                    type: MessageBoardMessageType.PLAYER_SELECTS_DIFFERENT_SQUADDIE_MID_TURN,
                    gameEngineState,
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
} => {
    if (mouseClick === undefined) {
        return {
            clickedOnSquaddie: false,
            squaddieIsNormallyControllableByPlayer: false,
            battleSquaddieId: undefined,
        }
    }
    const battleSquaddieId = getBattleSquaddieIdAtLocation({
        x: mouseClick.x,
        y: mouseClick.y,
        gameEngineState,
    })

    if (battleSquaddieId === undefined) {
        return {
            clickedOnSquaddie: false,
            squaddieIsNormallyControllableByPlayer: false,
            battleSquaddieId: undefined,
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
        x: mouseMovement.x,
        y: mouseMovement.y,
        gameEngineState,
    })

    return {
        hoveredOverSquaddie: !!battleSquaddieId,
        battleSquaddieId,
    }
}

const getBattleSquaddieIdAtLocation = ({
    x,
    y,
    gameEngineState,
}: {
    x: number
    y: number
    gameEngineState: GameEngineState
}) => {
    const { q, r } =
        ConvertCoordinateService.convertScreenCoordinatesToMapCoordinates({
            screenX: x,
            screenY: y,
            camera: gameEngineState.battleOrchestratorState.battleState.camera,
        })

    const { battleSquaddieId } = MissionMapService.getBattleSquaddieAtLocation(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        { q, r }
    )
    return battleSquaddieId
}
