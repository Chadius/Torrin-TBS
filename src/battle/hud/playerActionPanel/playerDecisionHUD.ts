import { MessageBoardListener } from "../../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessagePlayerCancelsPlayerActionConsiderations,
    MessageBoardMessagePlayerConsidersAction,
    MessageBoardMessagePlayerSelectionIsInvalid,
    MessageBoardMessageSelectAndLockNextSquaddie,
    MessageBoardMessageType,
} from "../../../message/messageBoardMessage"
import { isValidValue } from "../../../utils/validityCheck"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    PopupWindow,
    PopupWindowService,
    PopupWindowStatus,
} from "../popupWindow/popupWindow"
import { SquaddieStatusTileService } from "./tile/squaddieStatusTile/squaddieStatusTile"
import { ActionTilePosition } from "./tile/actionTilePosition"
import { OrchestratorUtilities } from "../../orchestratorComponents/orchestratorUtils"
import { BattleHUDStateService } from "../battleHUD/battleHUDState"
import { PlayerConsideredActionsService } from "../../battleState/playerConsideredActions"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { BattleStateService } from "../../battleState/battleState"
import { MissionMapService } from "../../../missionMap/missionMap"
import { MissionMapSquaddieCoordinateService } from "../../../missionMap/squaddieCoordinate"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"

const INVALID_SELECTION_POP_UP_DURATION_MS = 2000

export class PlayerDecisionHUDListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        switch (message.type) {
            case MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID:
                PlayerDecisionHUDService.createPlayerInvalidSelectionPopup({
                    message,
                    popupWindow: message.popupWindow,
                    playerDecisionHUD:
                        message.gameEngineState.battleOrchestratorState
                            .playerDecisionHUD,
                })
                break
            case MessageBoardMessageType.PLAYER_CONSIDERS_ACTION:
                playerConsidersAction(message)
                break
            case MessageBoardMessageType.PLAYER_CANCELS_PLAYER_ACTION_CONSIDERATIONS:
                cancelPlayerActionConsiderations(message)
                break
            case MessageBoardMessageType.SELECT_AND_LOCK_NEXT_SQUADDIE:
                selectAndLockNextSquaddie(message)
                break
        }
    }
}

export enum PopupWindowType {
    PLAYER_INVALID_SELECTION = "PLAYER_INVALID_SELECTION",
}

export interface PlayerDecisionHUD {
    popupWindows: {
        [key in PopupWindowType]: PopupWindow
    }
}

export const PlayerDecisionHUDService = {
    new: (): PlayerDecisionHUD => {
        return {
            popupWindows: {
                [PopupWindowType.PLAYER_INVALID_SELECTION]: undefined,
            },
        }
    },
    draw: (
        playerDecisionHUD: PlayerDecisionHUD,
        graphicsContext: GraphicsBuffer
    ) => {
        Object.values(playerDecisionHUD.popupWindows)
            .filter(isValidValue)
            .forEach((popupWindow) => {
                PopupWindowService.draw(popupWindow, graphicsContext)
            })
    },
    setPopupWindow: (
        playerDecisionHUD: PlayerDecisionHUD,
        popupWindow: PopupWindow,
        popupWindowType: PopupWindowType
    ) => setPopupWindow(playerDecisionHUD, popupWindow, popupWindowType),
    clearPopupWindow: (
        playerDecisionHUD: PlayerDecisionHUD,
        popupWindowType: PopupWindowType
    ) => {
        playerDecisionHUD.popupWindows[popupWindowType] = undefined
    },
    createPlayerInvalidSelectionPopup: ({
        playerDecisionHUD,
        popupWindow,
    }: {
        playerDecisionHUD: PlayerDecisionHUD
        message: MessageBoardMessagePlayerSelectionIsInvalid
        popupWindow: PopupWindow
    }) => {
        PopupWindowService.changeStatus(popupWindow, PopupWindowStatus.ACTIVE)

        PopupWindowService.setInactiveAfterTimeElapsed(
            popupWindow,
            INVALID_SELECTION_POP_UP_DURATION_MS
        )

        setPopupWindow(
            playerDecisionHUD,
            popupWindow,
            PopupWindowType.PLAYER_INVALID_SELECTION
        )
    },
}

const setPopupWindow = (
    playerDecisionHUD: PlayerDecisionHUD,
    popupWindow: PopupWindow,
    popupWindowType: PopupWindowType
) => {
    playerDecisionHUD.popupWindows[popupWindowType] = popupWindow
}

const playerConsidersAction = (
    message: MessageBoardMessagePlayerConsidersAction
) => {
    const gameEngineState = message.gameEngineState

    switch (true) {
        case !!message.useAction.actionTemplateId:
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.actionTemplateId =
                message.useAction.actionTemplateId
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.endTurn =
                false
            break
        case !!message.useAction.isEndTurn:
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.actionTemplateId =
                undefined
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.endTurn =
                true
            break
        case !!message.useAction.movement:
            gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.movement =
                message.useAction.movement
            break
    }

    if (message.cancelAction?.actionTemplate) {
        gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.actionTemplateId =
            undefined
        gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.endTurn =
            false
    }

    if (message.cancelAction?.movement) {
        gameEngineState.battleOrchestratorState.battleState.playerConsideredActions.movement =
            undefined
    }

    if (
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState
            .squaddieStatusTiles[ActionTilePosition.ACTOR_STATUS]
    ) {
        SquaddieStatusTileService.updateTileUsingSquaddie({
            tile: gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieStatusTiles[
                ActionTilePosition.ACTOR_STATUS
            ],
            gameEngineState,
        })
    }

    PlayerDecisionHUDService.clearPopupWindow(
        gameEngineState.battleOrchestratorState.playerDecisionHUD,
        PopupWindowType.PLAYER_INVALID_SELECTION
    )
}

const cancelPlayerActionConsiderations = (
    message: MessageBoardMessagePlayerCancelsPlayerActionConsiderations
) => {
    const gameEngineState = message.gameEngineState
    playerConsidersAction({
        useAction: {
            actionTemplateId: "",
            isEndTurn: false,
            movement: undefined,
        },
        type: MessageBoardMessageType.PLAYER_CONSIDERS_ACTION,
        gameEngineState,
        cancelAction: {
            actionTemplate: true,
            movement: true,
        },
    })
}

const selectAndLockNextSquaddie = (
    message: MessageBoardMessageSelectAndLockNextSquaddie
) => {
    const gameEngineState = message.gameEngineState

    createSquaddieSelectorPanel(gameEngineState)

    const squaddieCurrentlyTakingATurn =
        OrchestratorUtilities.getBattleSquaddieIdCurrentlyTakingATurn({
            gameEngineState,
        })

    if (squaddieCurrentlyTakingATurn) {
        panCameraToSquaddie(gameEngineState, squaddieCurrentlyTakingATurn)
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
            gameEngineState,
            battleSquaddieSelectedId: squaddieCurrentlyTakingATurn,
        })
        return
    }

    const nextBattleSquaddieId = BattleHUDStateService.getNextSquaddieId({
        battleHUDState: gameEngineState.battleOrchestratorState.battleHUDState,
        objectRepository: gameEngineState.repository,
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
        selectedBattleSquaddieId: BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                ?.battleActionDecisionStep
        )?.battleSquaddieId,
    })

    if (nextBattleSquaddieId == undefined) {
        return
    }

    panCameraToSquaddie(gameEngineState, nextBattleSquaddieId)

    gameEngineState.battleOrchestratorState.battleState.playerConsideredActions =
        PlayerConsideredActionsService.new()

    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
        gameEngineState,
        battleSquaddieSelectedId: nextBattleSquaddieId,
    })
}

const createSquaddieSelectorPanel = (gameEngineState: GameEngineState) => {
    const currentTeam = BattleStateService.getCurrentTeam(
        gameEngineState.battleOrchestratorState.battleState,
        gameEngineState.repository
    )

    if (
        gameEngineState.battleOrchestratorState.battleHUDState
            .squaddieListing === undefined ||
        gameEngineState.battleOrchestratorState.battleHUDState.squaddieListing
            .teamId != currentTeam.id
    ) {
        BattleHUDStateService.resetSquaddieListingForTeam({
            battleHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState,
            team: currentTeam,
            objectRepository: gameEngineState.repository,
            battleActionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
        })
    }
}

const panCameraToSquaddie = (
    gameEngineState: GameEngineState,
    nextBattleSquaddieId: string
) => {
    const selectedMapCoordinates = MissionMapService.getByBattleSquaddieId(
        gameEngineState.battleOrchestratorState.battleState.missionMap,
        nextBattleSquaddieId
    )
    if (MissionMapSquaddieCoordinateService.isValid(selectedMapCoordinates)) {
        const selectedWorldCoordinates =
            ConvertCoordinateService.convertMapCoordinatesToWorldLocation({
                mapCoordinate: {
                    q: selectedMapCoordinates.mapCoordinate.q,
                    r: selectedMapCoordinates.mapCoordinate.r,
                },
            })
        gameEngineState.battleOrchestratorState.battleState.camera.pan({
            xDestination: selectedWorldCoordinates.x,
            yDestination: selectedWorldCoordinates.y,
            timeToPan: 500,
            respectConstraints: true,
        })
    }
}
