import * as p5 from "p5"
import { MessageBoardListener } from "../../../message/messageBoardListener"
import {
    MessageBoardMessage,
    MessageBoardMessagePlayerSelectionIsInvalid,
    MessageBoardMessageType,
} from "../../../message/messageBoardMessage"
import { isValidValue } from "../../../utils/validityCheck"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import {
    PopupWindow,
    PopupWindowService,
    PopupWindowStatus,
} from "../popupWindow"
import { LabelService, TextBoxMargin } from "../../../ui/label"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { CoordinateSystem } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { HEX_TILE_WIDTH } from "../../../graphicsConstants"
import { RectAreaService } from "../../../ui/rectArea"
import { VERTICAL_ALIGN } from "../../../ui/constants"

export const WARNING_POPUP_TEXT_SIZE = 16
export const WARNING_POPUP_TEXT_WIDTH_MULTIPLIER = 0.5
const INVALID_SELECTION_POP_UP_DURATION_MS = 2000

const warningPopupConstants: {
    width: number
    label: {
        fillColor: number[]
        textSize: number
        vertAlign: p5.VERT_ALIGN
        fontColor: number[]
    } & TextBoxMargin
    height: number
} = {
    label: {
        textSize: WARNING_POPUP_TEXT_SIZE,
        fontColor: [245, 20, 90],
        fillColor: [60, 40, 10],
        vertAlign: VERTICAL_ALIGN.CENTER,
        textBoxMargin: 8,
    },
    width: 150,
    height: 80,
}

export class PlayerDecisionHUDListener implements MessageBoardListener {
    messageBoardListenerId: string

    constructor(messageBoardListenerId: string) {
        this.messageBoardListenerId = messageBoardListenerId
    }

    receiveMessage(message: MessageBoardMessage): void {
        if (
            message.type === MessageBoardMessageType.PLAYER_SELECTION_IS_INVALID
        ) {
            PlayerDecisionHUDService.createPlayerInvalidSelectionPopup(
                message.gameEngineState.battleOrchestratorState
                    .playerDecisionHUD,
                message
            )
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
    createPlayerInvalidSelectionPopup: (
        playerDecisionHUD: PlayerDecisionHUD,
        message: MessageBoardMessagePlayerSelectionIsInvalid
    ) => {
        let gameEngineState = message.gameEngineState

        let { popupText, labelArea, camera } =
            calculatePlayerInvalidSelectionPopup({ gameEngineState, message })

        const invalidSelectionPopupWindow: PopupWindow = PopupWindowService.new(
            {
                label: LabelService.new({
                    area: labelArea,
                    text: popupText,
                    ...warningPopupConstants.label,
                }),
                coordinateSystem: message.coordinateSystem,
                camera,
            }
        )
        PopupWindowService.changeStatus(
            invalidSelectionPopupWindow,
            PopupWindowStatus.ACTIVE
        )

        PopupWindowService.setInactiveAfterTimeElapsed(
            invalidSelectionPopupWindow,
            INVALID_SELECTION_POP_UP_DURATION_MS
        )

        setPopupWindow(
            playerDecisionHUD,
            invalidSelectionPopupWindow,
            PopupWindowType.PLAYER_INVALID_SELECTION
        )
    },
}

const calculatePlayerInvalidSelectionPopup = ({
    gameEngineState,
    message,
}: {
    gameEngineState: GameEngineState
    message: MessageBoardMessagePlayerSelectionIsInvalid
}) => {
    let left: number
    let top: number
    if (message.coordinateSystem === CoordinateSystem.WORLD) {
        ;({ worldX: left, worldY: top } =
            ConvertCoordinateService.convertScreenCoordinatesToWorldCoordinates(
                {
                    screenX: message.selectionLocation.x,
                    screenY: message.selectionLocation.y,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                }
            ))
        left -= warningPopupConstants.width / 2
        top += HEX_TILE_WIDTH
    } else {
        left = message.selectionLocation.x
        top = message.selectionLocation.y
    }

    let labelArea = RectAreaService.new({
        left,
        top,
        width: message.width ?? warningPopupConstants.width,
        height: message.height ?? warningPopupConstants.height,
    })
    return {
        popupText: message.reason,
        labelArea,
        camera:
            message.coordinateSystem === CoordinateSystem.WORLD
                ? gameEngineState.battleOrchestratorState.battleState.camera
                : undefined,
    }
}

const setPopupWindow = (
    playerDecisionHUD: PlayerDecisionHUD,
    popupWindow: PopupWindow,
    popupWindowType: PopupWindowType
) => {
    playerDecisionHUD.popupWindows[popupWindowType] = popupWindow
}
