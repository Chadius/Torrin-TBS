import { Button, ButtonStatus } from "../../ui/button"
import { MouseButton } from "../../utils/mouseConfig"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { Label, LabelService } from "../../ui/label"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../ui/constants"
import { isValidValue } from "../../utils/validityCheck"
import {
    SaveSaveState,
    SaveSaveStateService,
} from "../../dataLoader/saveSaveState"
import { LoadSaveStateService } from "../../dataLoader/loadSaveState"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import { OrchestratorUtilities } from "../orchestratorComponents/orchestratorUtils"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { FileState } from "../../gameEngine/fileState"

export enum FileAccessHUDMessage {
    SAVE_SUCCESS = "Saved!",
    SAVE_FAILED = "Save Failed",
    LOAD_FAILED = "Load Failed",
    SAVE_IN_PROGRESS = "Saving...",
}

export const FileAccessHUDDesign = {
    MESSAGE_DISPLAY_DURATION: 2000,
    LOAD_BUTTON: {
        AREA: {
            startColumn: 11,
            endColumn: 11,
            top: 10,
            bottom: 40,
            margin: [0, WINDOW_SPACING.SPACING1, 0, 0],
        },
        READY_RECTANGLE: {
            fillColor: [10, 2, 192],
            strokeColor: [16, 16, 16],
            strokeWeight: 2,
        },
        ACTIVE_RECTANGLE: {
            fillColor: [10, 2, 192],
            strokeColor: [10, 16, 16],
            strokeWeight: 4,
        },
        HOVER_RECTANGLE: {
            fillColor: [10, 2, 224],
            strokeColor: [10, 16, 32],
            strokeWeight: 10,
        },
        DISABLED_RECTANGLE: {
            fillColor: [10, 2, 32],
            strokeColor: [16, 16, 16],
            strokeWeight: 2,
        },
        FONT_COLOR: [20, 5, 16],
        PADDING: WINDOW_SPACING.SPACING1,
        TEXT: "Load",
        TEXT_SIZE: 14,
    },
    SAVE_BUTTON: {
        AREA: {
            startColumn: 10,
            endColumn: 10,
            top: 10,
            bottom: 40,
            margin: [0, WINDOW_SPACING.SPACING1, 0, 0],
        },
        READY_RECTANGLE: {
            fillColor: [10, 2, 192],
            strokeColor: [16, 16, 16],
            strokeWeight: 2,
        },
        ACTIVE_RECTANGLE: {
            fillColor: [10, 2, 192],
            strokeColor: [16, 16, 16],
            strokeWeight: 4,
        },
        HOVER_RECTANGLE: {
            fillColor: [10, 2, 224],
            strokeColor: [10, 16, 32],
            strokeWeight: 10,
        },
        DISABLED_RECTANGLE: {
            fillColor: [10, 2, 32],
            strokeColor: [16, 16, 16],
            strokeWeight: 2,
        },
        FONT_COLOR: [20, 5, 16],
        PADDING: WINDOW_SPACING.SPACING1,
        TEXT: "Save",
        TEXT_SIZE: 14,
    },
    MESSAGE_LABEL: {
        AREA: {
            startColumn: 8,
            endColumn: 9,
            top: 10,
            bottom: 60,
        },
        RECTANGLE: {
            noFill: true,
            noStroke: true,
        },
        FONT_COLOR: [0, 0, 100],
        PADDING: WINDOW_SPACING.SPACING1,
        TEXT_SIZE: 20,
    },
}

export interface FileAccessHUD {
    saveButton: Button
    loadButton: Button
    messageLabel: Label
    messageDisplayStartTime: number
    message: string
}

export const FileAccessHUDService = {
    new: ({}: {}): FileAccessHUD => {
        const fileAccessHUD: FileAccessHUD = {
            loadButton: undefined,
            saveButton: undefined,
            messageLabel: undefined,
            messageDisplayStartTime: undefined,
            message: undefined,
        }
        createUIObjects(fileAccessHUD)
        return fileAccessHUD
    },
    mouseMoved: ({
        fileAccessHUD,
        mouseX,
        mouseY,
    }: {
        fileAccessHUD: FileAccessHUD
        mouseX: number
        mouseY: number
    }) => {
        fileAccessHUD.loadButton.mouseMoved(mouseX, mouseY, undefined)
        fileAccessHUD.saveButton.mouseMoved(mouseX, mouseY, undefined)
    },
    mouseClicked: ({
        fileAccessHUD,
        mouseButton,
        mouseX,
        mouseY,
        fileState,
    }: {
        fileAccessHUD: FileAccessHUD
        mouseButton: MouseButton
        mouseX: number
        mouseY: number
        fileState: FileState
    }) => {
        if (mouseButton !== MouseButton.ACCEPT) {
            return
        }
        fileAccessHUD.loadButton.mouseClicked(mouseX, mouseY, {
            fileAccessHUD,
            fileState,
        })
        fileAccessHUD.saveButton.mouseClicked(mouseX, mouseY, {
            fileAccessHUD,
            fileState,
        })
    },
    updateBasedOnGameEngineState: (
        fileAccessHUD: FileAccessHUD,
        gameEngineState: GameEngineState
    ) => {
        if (
            !gameEngineState.battleOrchestratorState.battleState
                .battlePhaseState ||
            gameEngineState.battleOrchestratorState.battleState.battlePhaseState
                .currentAffiliation !== BattlePhase.PLAYER
        ) {
            return disableButtons(fileAccessHUD)
        }

        if (
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            )
        ) {
            return disableButtons(fileAccessHUD)
        }

        return changeButtonStatusBasedOnMessage(fileAccessHUD)
    },
    updateButtonStatus: (fileAccessHUD: FileAccessHUD) => {
        changeButtonStatusBasedOnMessage(fileAccessHUD)
    },
    updateStatusMessage: (
        fileAccessHUD: FileAccessHUD,
        fileState: FileState
    ): string => {
        return updateStatusMessage(fileAccessHUD, fileState)
    },
    draw: (fileAccessHUD: FileAccessHUD, graphicsContext: GraphicsBuffer) => {
        fileAccessHUD.loadButton.draw(graphicsContext)
        fileAccessHUD.saveButton.draw(graphicsContext)
        if (isValidValue(fileAccessHUD.messageLabel.textBox.text)) {
            LabelService.draw(fileAccessHUD.messageLabel, graphicsContext)
        }
    },
    enableButtons: (fileAccessHUD: FileAccessHUD) => {
        return enableButtons(fileAccessHUD)
    },
}

const updateStatusMessage = (
    fileAccessHUD: FileAccessHUD,
    fileState: FileState
): string => {
    switch (didCurrentMessageExpire(fileAccessHUD)) {
        case true:
            if (
                SaveSaveStateService.didUserRequestSaveAndSaveHasConcluded(
                    fileState.saveSaveState
                )
            ) {
                SaveSaveStateService.userFinishesRequestingSave(
                    fileState.saveSaveState
                )
            }
            if (
                LoadSaveStateService.didUserRequestLoadAndLoadHasConcluded(
                    fileState.loadSaveState
                )
            ) {
                LoadSaveStateService.userFinishesRequestingLoad(
                    fileState.loadSaveState
                )
            }
            clearMessage(fileAccessHUD)
            enableButtons(fileAccessHUD)
            break
        default:
            const messageToShow = calculateMessageToShow(
                fileState,
                fileAccessHUD
            )
            updateMessageLabel(fileAccessHUD, messageToShow)
            break
    }
    return fileAccessHUD.message
}

const battleIsCurrentlySavingOrLoading = (caller: {
    fileAccessHUD: FileAccessHUD
    fileState: FileState
}) =>
    caller.fileState.saveSaveState.savingInProgress ||
    caller.fileState.loadSaveState.userRequestedLoad ||
    caller.fileState.loadSaveState.applicationStartedLoad

const clickedOnLoadButton = (
    mouseX: number,
    mouseY: number,
    button: Button,
    caller: {
        fileAccessHUD: FileAccessHUD
        fileState: FileState
    }
): {} => {
    if (battleIsCurrentlySavingOrLoading(caller)) {
        return
    }
    LoadSaveStateService.userRequestsLoad(caller.fileState.loadSaveState)
    return undefined
}

const clickedOnSaveButton = (
    mouseX: number,
    mouseY: number,
    button: Button,
    caller: {
        fileAccessHUD: FileAccessHUD
        fileState: FileState
    }
): {} => {
    if (battleIsCurrentlySavingOrLoading(caller)) {
        return
    }
    SaveSaveStateService.userRequestsSave(caller.fileState.saveSaveState)
    disableButtons(caller.fileAccessHUD)
    return undefined
}

const createUIObjects = (fileAccessHUD: FileAccessHUD) => {
    const loadButtonArea: RectArea = RectAreaService.new({
        screenWidth: ScreenDimensions.SCREEN_WIDTH,
        ...FileAccessHUDDesign.LOAD_BUTTON.AREA,
    })
    fileAccessHUD.loadButton = new Button({
        onMoveHandler(
            mouseX: number,
            mouseY: number,
            button: Button,
            caller: any
        ): {} {
            return {}
        },
        readyLabel: LabelService.new({
            area: loadButtonArea,
            fontColor: FileAccessHUDDesign.LOAD_BUTTON.FONT_COLOR,
            textBoxMargin: FileAccessHUDDesign.LOAD_BUTTON.PADDING,
            text: FileAccessHUDDesign.LOAD_BUTTON.TEXT,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            textSize: FileAccessHUDDesign.LOAD_BUTTON.TEXT_SIZE,
            fillColor:
                FileAccessHUDDesign.LOAD_BUTTON.READY_RECTANGLE.fillColor,
            strokeColor:
                FileAccessHUDDesign.LOAD_BUTTON.READY_RECTANGLE.strokeColor,
            strokeWeight:
                FileAccessHUDDesign.LOAD_BUTTON.READY_RECTANGLE.strokeWeight,
        }),
        activeLabel: LabelService.new({
            area: loadButtonArea,
            fontColor: FileAccessHUDDesign.LOAD_BUTTON.FONT_COLOR,
            textBoxMargin: FileAccessHUDDesign.LOAD_BUTTON.PADDING,
            text: FileAccessHUDDesign.LOAD_BUTTON.TEXT,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            textSize: FileAccessHUDDesign.LOAD_BUTTON.TEXT_SIZE,
            fillColor:
                FileAccessHUDDesign.LOAD_BUTTON.ACTIVE_RECTANGLE.fillColor,
            strokeColor:
                FileAccessHUDDesign.LOAD_BUTTON.ACTIVE_RECTANGLE.strokeColor,
            strokeWeight:
                FileAccessHUDDesign.LOAD_BUTTON.ACTIVE_RECTANGLE.strokeWeight,
        }),
        disabledLabel: LabelService.new({
            area: loadButtonArea,
            fontColor: FileAccessHUDDesign.LOAD_BUTTON.FONT_COLOR,
            textBoxMargin: FileAccessHUDDesign.LOAD_BUTTON.PADDING,
            text: FileAccessHUDDesign.LOAD_BUTTON.TEXT,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            textSize: FileAccessHUDDesign.LOAD_BUTTON.TEXT_SIZE,
            fillColor:
                FileAccessHUDDesign.LOAD_BUTTON.DISABLED_RECTANGLE.fillColor,
            strokeColor:
                FileAccessHUDDesign.LOAD_BUTTON.DISABLED_RECTANGLE.strokeColor,
            strokeWeight:
                FileAccessHUDDesign.LOAD_BUTTON.DISABLED_RECTANGLE.strokeWeight,
        }),
        hoverLabel: LabelService.new({
            area: loadButtonArea,
            fontColor: FileAccessHUDDesign.LOAD_BUTTON.FONT_COLOR,
            textBoxMargin: FileAccessHUDDesign.LOAD_BUTTON.PADDING,
            text: FileAccessHUDDesign.LOAD_BUTTON.TEXT,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            textSize: FileAccessHUDDesign.LOAD_BUTTON.TEXT_SIZE,
            fillColor:
                FileAccessHUDDesign.LOAD_BUTTON.HOVER_RECTANGLE.fillColor,
            strokeColor:
                FileAccessHUDDesign.LOAD_BUTTON.HOVER_RECTANGLE.strokeColor,
            strokeWeight:
                FileAccessHUDDesign.LOAD_BUTTON.HOVER_RECTANGLE.strokeWeight,
        }),
        onClickHandler(
            mouseX: number,
            mouseY: number,
            button: Button,
            caller: {
                fileAccessHUD: FileAccessHUD
                fileState: FileState
            }
        ): {} {
            return clickedOnLoadButton(mouseX, mouseY, button, caller)
        },
    })

    const saveButtonArea: RectArea = RectAreaService.new({
        screenWidth: ScreenDimensions.SCREEN_WIDTH,
        ...FileAccessHUDDesign.SAVE_BUTTON.AREA,
    })
    fileAccessHUD.saveButton = new Button({
        readyLabel: LabelService.new({
            area: saveButtonArea,
            fontColor: FileAccessHUDDesign.SAVE_BUTTON.FONT_COLOR,
            textBoxMargin: FileAccessHUDDesign.SAVE_BUTTON.PADDING,
            text: FileAccessHUDDesign.SAVE_BUTTON.TEXT,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            textSize: FileAccessHUDDesign.SAVE_BUTTON.TEXT_SIZE,
            fillColor:
                FileAccessHUDDesign.SAVE_BUTTON.READY_RECTANGLE.fillColor,
            strokeColor:
                FileAccessHUDDesign.SAVE_BUTTON.READY_RECTANGLE.strokeColor,
            strokeWeight:
                FileAccessHUDDesign.SAVE_BUTTON.READY_RECTANGLE.strokeWeight,
        }),
        activeLabel: LabelService.new({
            area: saveButtonArea,
            fontColor: FileAccessHUDDesign.SAVE_BUTTON.FONT_COLOR,
            textBoxMargin: FileAccessHUDDesign.SAVE_BUTTON.PADDING,
            text: FileAccessHUDDesign.SAVE_BUTTON.TEXT,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            textSize: FileAccessHUDDesign.SAVE_BUTTON.TEXT_SIZE,
            fillColor:
                FileAccessHUDDesign.SAVE_BUTTON.ACTIVE_RECTANGLE.fillColor,
            strokeColor:
                FileAccessHUDDesign.SAVE_BUTTON.ACTIVE_RECTANGLE.strokeColor,
            strokeWeight:
                FileAccessHUDDesign.SAVE_BUTTON.ACTIVE_RECTANGLE.strokeWeight,
        }),
        disabledLabel: LabelService.new({
            area: saveButtonArea,
            fontColor: FileAccessHUDDesign.SAVE_BUTTON.FONT_COLOR,
            textBoxMargin: FileAccessHUDDesign.SAVE_BUTTON.PADDING,
            text: FileAccessHUDDesign.SAVE_BUTTON.TEXT,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            textSize: FileAccessHUDDesign.SAVE_BUTTON.TEXT_SIZE,
            fillColor:
                FileAccessHUDDesign.SAVE_BUTTON.DISABLED_RECTANGLE.fillColor,
            strokeColor:
                FileAccessHUDDesign.SAVE_BUTTON.DISABLED_RECTANGLE.strokeColor,
            strokeWeight:
                FileAccessHUDDesign.SAVE_BUTTON.DISABLED_RECTANGLE.strokeWeight,
        }),
        hoverLabel: LabelService.new({
            area: saveButtonArea,
            fontColor: FileAccessHUDDesign.SAVE_BUTTON.FONT_COLOR,
            textBoxMargin: FileAccessHUDDesign.SAVE_BUTTON.PADDING,
            text: FileAccessHUDDesign.SAVE_BUTTON.TEXT,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
            textSize: FileAccessHUDDesign.SAVE_BUTTON.TEXT_SIZE,
            fillColor:
                FileAccessHUDDesign.SAVE_BUTTON.HOVER_RECTANGLE.fillColor,
            strokeColor:
                FileAccessHUDDesign.SAVE_BUTTON.HOVER_RECTANGLE.strokeColor,
            strokeWeight:
                FileAccessHUDDesign.SAVE_BUTTON.HOVER_RECTANGLE.strokeWeight,
        }),
        onClickHandler(
            mouseX: number,
            mouseY: number,
            button: Button,
            caller: {
                fileAccessHUD: FileAccessHUD
                fileState: FileState
            }
        ): {} {
            return clickedOnSaveButton(mouseX, mouseY, button, caller)
        },
    })
    createMessageLabel(fileAccessHUD)
}

const createMessageLabel = (fileAccessHUD: FileAccessHUD) => {
    const messageLabelArea: RectArea = RectAreaService.new({
        screenWidth: ScreenDimensions.SCREEN_WIDTH,
        ...FileAccessHUDDesign.MESSAGE_LABEL.AREA,
    })
    fileAccessHUD.messageLabel = LabelService.new({
        area: messageLabelArea,
        noFill: FileAccessHUDDesign.MESSAGE_LABEL.RECTANGLE.noFill,
        noStroke: FileAccessHUDDesign.MESSAGE_LABEL.RECTANGLE.noStroke,
        textBoxMargin: FileAccessHUDDesign.MESSAGE_LABEL.PADDING,
        text: fileAccessHUD.message,
        horizAlign: HORIZONTAL_ALIGN.CENTER,
        vertAlign: VERTICAL_ALIGN.CENTER,
        textSize: FileAccessHUDDesign.MESSAGE_LABEL.TEXT_SIZE,
        fontColor: FileAccessHUDDesign.MESSAGE_LABEL.FONT_COLOR,
    })
}

const disableButtons = (fileAccessHUD: FileAccessHUD) => {
    fileAccessHUD.loadButton.setStatus(ButtonStatus.DISABLED)
    fileAccessHUD.saveButton.setStatus(ButtonStatus.DISABLED)
}

const enableButtons = (fileAccessHUD: FileAccessHUD) => {
    fileAccessHUD.loadButton.setStatus(ButtonStatus.READY)
    fileAccessHUD.saveButton.setStatus(ButtonStatus.READY)
}

const changeButtonStatusBasedOnMessage = (fileAccessHUD: FileAccessHUD) => {
    if (isValidValue(fileAccessHUD.message)) {
        disableButtons(fileAccessHUD)
    }
}

const didCurrentMessageExpire = (fileAccessHUD: FileAccessHUD) => {
    const messageIsCurrentlySet: boolean = isValidValue(fileAccessHUD.message)
    const messageTimerIsSet: boolean = isValidValue(
        fileAccessHUD.messageDisplayStartTime
    )
    const messageExpired =
        Date.now() >
        fileAccessHUD.messageDisplayStartTime +
            FileAccessHUDDesign.MESSAGE_DISPLAY_DURATION
    return messageIsCurrentlySet && messageTimerIsSet && messageExpired
}

const calculateMessageToShow = (
    fileState: FileState,
    fileAccessHUD: FileAccessHUD
): string => {
    const messageChecks: { [key in FileAccessHUDMessage]?: boolean } = {
        [FileAccessHUDMessage.SAVE_IN_PROGRESS]:
            fileState.saveSaveState.userRequestedSave &&
            fileState.saveSaveState.savingInProgress,
        [FileAccessHUDMessage.SAVE_SUCCESS]:
            fileState.saveSaveState.userRequestedSave &&
            !fileState.saveSaveState.savingInProgress,
        [FileAccessHUDMessage.SAVE_FAILED]:
            fileState.saveSaveState.userRequestedSave &&
            fileState.saveSaveState.errorDuringSaving,
        [FileAccessHUDMessage.LOAD_FAILED]:
            fileState.loadSaveState.userRequestedLoad &&
            fileState.loadSaveState.applicationErroredWhileLoading,
    }

    const messagePriority = [
        FileAccessHUDMessage.SAVE_FAILED,
        FileAccessHUDMessage.SAVE_IN_PROGRESS,
        FileAccessHUDMessage.SAVE_SUCCESS,
        FileAccessHUDMessage.LOAD_FAILED,
    ]

    return messagePriority.find((message) => messageChecks[message])
}

const resetMessageTimer = (fileAccessHUD: FileAccessHUD) => {
    fileAccessHUD.messageDisplayStartTime = Date.now()
}
const updateMessageLabel = (
    fileAccessHUD: FileAccessHUD,
    messageToShow: string
) => {
    if (!isValidValue(messageToShow)) {
        return
    }

    if (fileAccessHUD.message === messageToShow) {
        return
    }

    fileAccessHUD.message = messageToShow
    createMessageLabel(fileAccessHUD)
    resetMessageTimer(fileAccessHUD)
}

const clearMessage = (fileAccessHUD: FileAccessHUD) => {
    fileAccessHUD.message = undefined
    fileAccessHUD.messageDisplayStartTime = undefined
    createMessageLabel(fileAccessHUD)
}
