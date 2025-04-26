import {
    MousePress,
    MouseRelease,
    ScreenLocation,
} from "../../../utils/mouseConfig"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { Label, LabelService } from "../../../ui/label"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../../ui/constants"
import { isValidValue } from "../../../utils/objectValidityCheck"
import { SaveSaveStateService } from "../../../dataLoader/saveSaveState"
import { LoadSaveStateService } from "../../../dataLoader/playerData/loadSaveState"
import { GameEngineState } from "../../../gameEngine/gameEngine"
import { BattlePhase } from "../../orchestratorComponents/battlePhaseTracker"
import { OrchestratorUtilities } from "../../orchestratorComponents/orchestratorUtils"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { FileState } from "../../../gameEngine/fileState"
import { MessageBoard } from "../../../message/messageBoard"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import { ButtonStatus } from "../../../ui/button/buttonStatus"
import { Button } from "../../../ui/button/button"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { DataBlob, DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { BehaviorTreeTask } from "../../../utils/behaviorTree/task"
import { SequenceComposite } from "../../../utils/behaviorTree/composite/sequence/sequence"
import { ExecuteAllComposite } from "../../../utils/behaviorTree/composite/executeAll/executeAll"
import {
    FileAccessHUDCreateLoadButton,
    FileAccessHUDShouldCreateLoadButton,
} from "./loadButton"
import { ButtonStatusChangeEventByButtonId } from "../../../ui/button/logic/base"
import {
    FileAccessHUDCreateSaveButton,
    FileAccessHUDShouldCreateSaveButton,
} from "./saveButton"

export enum FileAccessHUDMessage {
    SAVE_SUCCESS = "Saved!",
    SAVE_FAILED = "Save Failed",
    LOAD_FAILED = "Load Failed",
    SAVE_IN_PROGRESS = "Saving...",
}

type FileAccessHUDRectangleColorDescription = {
    fillColor: number[]
    strokeColor: number[]
    strokeWeight: number
}

export interface FileAccessHUDLayout {
    MESSAGE_DISPLAY_DURATION: number
    loadButton: {
        drawingArea: {
            startColumn: number
            endColumn: number
            top: number
            bottom: number
            margin: number[]
        }
        readyStatusStyle: FileAccessHUDRectangleColorDescription
        activeStatusStyle: FileAccessHUDRectangleColorDescription
        hoverStatusStyle: FileAccessHUDRectangleColorDescription
        disabledStatusStyle: FileAccessHUDRectangleColorDescription
        fontColor: number[]
        padding: number
        text: string
        fontSize: number
    }
    saveButton: {
        drawingArea: {
            startColumn: number
            endColumn: number
            top: number
            bottom: number
            margin: number[]
        }
        readyStatusStyle: FileAccessHUDRectangleColorDescription
        activeStatusStyle: FileAccessHUDRectangleColorDescription
        hoverStatusStyle: FileAccessHUDRectangleColorDescription
        disabledStatusStyle: FileAccessHUDRectangleColorDescription
        fontColor: number[]
        padding: number
        text: string
        fontSize: number
    }
    messageLabel: {
        drawingArea: {
            startColumn: number
            endColumn: number
            top: number
            bottom: number
        }
        rectangleStyle: {
            noFill: boolean
            noStroke: boolean
        }
        fontColor: number[]
        padding: number
        fontSize: number
    }
}

export interface FileAccessHUDContext {
    buttonStatusChangeEventDataBlob: ButtonStatusChangeEventByButtonId
}

export class FileAccessHUDData implements DataBlob {
    data: {
        data: {
            uiObjects: FileAccessHUDUIObjects
            layout: FileAccessHUDLayout
            context: FileAccessHUDContext
            [key: string]: any
        }
    }

    constructor() {
        this.data = {
            data: {
                uiObjects: undefined,
                layout: undefined,
                context: undefined,
            },
        }
    }

    getUIObjects(): FileAccessHUDUIObjects {
        return DataBlobService.get<FileAccessHUDUIObjects>(
            this.data,
            "uiObjects"
        )
    }

    setUIObjects(uiObjects: FileAccessHUDUIObjects): void {
        return DataBlobService.add<FileAccessHUDUIObjects>(
            this.data,
            "uiObjects",
            uiObjects
        )
    }

    getLayout(): FileAccessHUDLayout {
        return DataBlobService.get<FileAccessHUDLayout>(this.data, "layout")
    }

    setLayout(layout: FileAccessHUDLayout): void {
        return DataBlobService.add<FileAccessHUDLayout>(
            this.data,
            "layout",
            layout
        )
    }

    getContext(): FileAccessHUDContext {
        return DataBlobService.get<FileAccessHUDContext>(this.data, "context")
    }

    setContext(context: FileAccessHUDContext): void {
        return DataBlobService.add<FileAccessHUDContext>(
            this.data,
            "context",
            context
        )
    }
}

export interface FileAccessHUD {
    data: FileAccessHUDData
    drawUITask: BehaviorTreeTask
    messageLabel: Label
    messageDisplayStartTime: number
    message: string
}

export interface FileAccessHUDUIObjects {
    saveButton: Button
    loadButton: Button
    graphicsContext?: GraphicsBuffer
    resourceHandler?: ResourceHandler
}

export const FileAccessHUDService = {
    new: (): FileAccessHUD => {
        const fileAccessHUD: FileAccessHUD = {
            data: new FileAccessHUDData(),
            drawUITask: undefined,
            messageLabel: undefined,
            messageDisplayStartTime: undefined,
            message: undefined,
        }
        createContext(fileAccessHUD)
        createLayout(fileAccessHUD)
        resetUIObjects(fileAccessHUD)
        createDrawingTask(fileAccessHUD)
        createMessageLabel(fileAccessHUD)
        return fileAccessHUD
    },
    mouseMoved: ({
        fileAccessHUD,
        mouseLocation,
    }: {
        fileAccessHUD: FileAccessHUD
        mouseLocation: ScreenLocation
    }) => {
        getButtons(fileAccessHUD).forEach((button) => {
            button.mouseMoved({
                mouseLocation,
            })
        })
    },
    mousePressed: ({
        fileAccessHUD,
        mousePress,
        fileState,
        messageBoard,
    }: {
        fileAccessHUD: FileAccessHUD
        mousePress: MousePress
        fileState: FileState
        messageBoard: MessageBoard
    }): boolean => {
        getButtons(fileAccessHUD).forEach((button) => {
            button.mousePressed({
                mousePress,
            })
        })

        const uiObjects: FileAccessHUDUIObjects =
            fileAccessHUD.data.getUIObjects()
        const loadButtonWasClicked: boolean =
            uiObjects.loadButton?.getStatusChangeEvent()?.mousePress !=
            undefined
        const saveButtonWasClicked: boolean =
            uiObjects.saveButton?.getStatusChangeEvent()?.mousePress !=
            undefined

        if (loadButtonWasClicked) {
            reactToLoadGameButtonStatusChangeEvent(
                fileAccessHUD,
                fileState,
                messageBoard
            )
        }
        if (saveButtonWasClicked) {
            reactToSaveGameButtonStatusChangeEvent(fileAccessHUD, fileState)
        }
        return loadButtonWasClicked || saveButtonWasClicked
    },
    mouseReleased: ({
        fileAccessHUD,
        mouseRelease,
        fileState,
        messageBoard,
    }: {
        fileAccessHUD: FileAccessHUD
        mouseRelease: MouseRelease
        fileState: FileState
        messageBoard: MessageBoard
    }): boolean => {
        getButtons(fileAccessHUD).forEach((button) => {
            button.mouseReleased({
                mouseRelease,
            })
        })

        const uiObjects: FileAccessHUDUIObjects =
            fileAccessHUD.data.getUIObjects()
        const loadButtonWasClicked: boolean =
            uiObjects.loadButton?.getStatusChangeEvent()?.mouseRelease !=
            undefined
        const saveButtonWasClicked: boolean =
            uiObjects.saveButton?.getStatusChangeEvent()?.mouseRelease !=
            undefined

        if (loadButtonWasClicked) {
            reactToLoadGameButtonStatusChangeEvent(
                fileAccessHUD,
                fileState,
                messageBoard
            )
        }
        if (saveButtonWasClicked) {
            reactToSaveGameButtonStatusChangeEvent(fileAccessHUD, fileState)
        }
        return loadButtonWasClicked || saveButtonWasClicked
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
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn({
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
            })
        ) {
            return disableButtons(fileAccessHUD)
        }

        changeButtonStatusBasedOnMessage(fileAccessHUD)
        getButtons(fileAccessHUD).forEach((button) => {
            button.clearStatus()
        })
    },
    updateButtonStatus: (fileAccessHUD: FileAccessHUD) => {
        changeButtonStatusBasedOnMessage(fileAccessHUD)
    },
    updateStatusMessage: ({
        fileAccessHUD,
        fileState,
        messageBoard,
    }: {
        fileAccessHUD: FileAccessHUD
        fileState: FileState
        messageBoard: MessageBoard
    }): string => {
        return updateStatusMessage({
            fileAccessHUD: fileAccessHUD,
            fileState: fileState,
            messageBoard: messageBoard,
        })
    },
    draw: (fileAccessHUD: FileAccessHUD, graphicsContext: GraphicsBuffer) => {
        if (isValidValue(fileAccessHUD.messageLabel.textBox.text)) {
            LabelService.draw(fileAccessHUD.messageLabel, graphicsContext)
        }
        const uiObjects: FileAccessHUDUIObjects =
            fileAccessHUD.data.getUIObjects()
        uiObjects.graphicsContext = graphicsContext
        fileAccessHUD.data.setUIObjects(uiObjects)

        fileAccessHUD.drawUITask.run()
        getButtons(fileAccessHUD).forEach((button) => {
            DataBlobService.add<GraphicsBuffer>(
                button.buttonStyle.dataBlob,
                "graphicsContext",
                graphicsContext
            )
            button.draw()
        })
    },
    enableButtons: (fileAccessHUD: FileAccessHUD) => {
        return enableButtons(fileAccessHUD)
    },
}

const updateStatusMessage = ({
    fileAccessHUD,
    fileState,
    messageBoard,
}: {
    fileAccessHUD: FileAccessHUD
    fileState: FileState
    messageBoard: MessageBoard
}): string => {
    if (!didCurrentMessageExpire(fileAccessHUD)) {
        const messageToShow = calculateMessageToShow(fileState, fileAccessHUD)
        updateMessageLabel(fileAccessHUD, messageToShow)
        return fileAccessHUD.message
    }

    if (
        SaveSaveStateService.didUserRequestSaveAndSaveHasConcluded(
            fileState.saveSaveState
        )
    ) {
        SaveSaveStateService.userFinishesRequestingSave(fileState.saveSaveState)
    }
    if (
        LoadSaveStateService.didUserRequestLoadAndLoadHasConcluded(
            fileState.loadSaveState
        )
    ) {
        messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_DATA_LOAD_FINISH_REQUEST_LOAD,
            loadSaveState: fileState.loadSaveState,
        })
    }
    clearMessage(fileAccessHUD)
    enableButtons(fileAccessHUD)
    return fileAccessHUD.message
}

const battleIsCurrentlySavingOrLoading = (caller: {
    fileAccessHUD: FileAccessHUD
    fileState: FileState
}) =>
    caller.fileState.saveSaveState.savingInProgress ||
    caller.fileState.loadSaveState.userRequestedLoad

const createMessageLabel = (fileAccessHUD: FileAccessHUD) => {
    const layout = fileAccessHUD.data.getLayout()
    const messageLabelArea: RectArea = RectAreaService.new({
        screenWidth: ScreenDimensions.SCREEN_WIDTH,
        ...layout.messageLabel.drawingArea,
    })
    fileAccessHUD.messageLabel = LabelService.new({
        area: messageLabelArea,
        noFill: layout.messageLabel.rectangleStyle.noFill,
        noStroke: layout.messageLabel.rectangleStyle.noStroke,
        textBoxMargin: layout.messageLabel.padding,
        text: fileAccessHUD.message,
        horizAlign: HORIZONTAL_ALIGN.CENTER,
        vertAlign: VERTICAL_ALIGN.CENTER,
        fontSize: layout.messageLabel.fontSize,
        fontColor: layout.messageLabel.fontColor,
    })
}

const disableButtons = (fileAccessHUD: FileAccessHUD) => {
    getButtons(fileAccessHUD)
        .filter((x) => x)
        .forEach((button) => {
            button.changeStatus({
                newStatus: ButtonStatus.DISABLED,
            })
        })
}

const enableButtons = (fileAccessHUD: FileAccessHUD) => {
    getButtons(fileAccessHUD)
        .filter((x) => x)
        .forEach((button) => {
            button.changeStatus({
                newStatus: ButtonStatus.READY,
            })
        })
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
    const layout = fileAccessHUD.data.getLayout()
    const messageExpired =
        Date.now() >
        fileAccessHUD.messageDisplayStartTime + layout.MESSAGE_DISPLAY_DURATION
    return messageIsCurrentlySet && messageTimerIsSet && messageExpired
}

const calculateMessageToShow = (
    fileState: FileState,
    _fileAccessHUD: FileAccessHUD
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

const createLayout = (fileAccessHUD: FileAccessHUD) => {
    fileAccessHUD.data.setLayout({
        MESSAGE_DISPLAY_DURATION: 2000,
        loadButton: {
            drawingArea: {
                startColumn: 10,
                endColumn: 10,
                top: 50,
                bottom: 80,
                margin: [0, WINDOW_SPACING.SPACING1, 0, 0],
            },
            readyStatusStyle: {
                fillColor: [10, 2, 192],
                strokeColor: [16, 16, 16],
                strokeWeight: 2,
            },
            activeStatusStyle: {
                fillColor: [10, 2, 192],
                strokeColor: [10, 16, 16],
                strokeWeight: 4,
            },
            hoverStatusStyle: {
                fillColor: [10, 2, 224],
                strokeColor: [10, 16, 32],
                strokeWeight: 10,
            },
            disabledStatusStyle: {
                fillColor: [10, 2, 32],
                strokeColor: [16, 16, 16],
                strokeWeight: 2,
            },
            fontColor: [20, 5, 16],
            padding: WINDOW_SPACING.SPACING1,
            text: "Load",
            fontSize: 14,
        },
        saveButton: {
            drawingArea: {
                startColumn: 10,
                endColumn: 10,
                top: 10,
                bottom: 40,
                margin: [0, WINDOW_SPACING.SPACING1, 0, 0],
            },
            readyStatusStyle: {
                fillColor: [10, 2, 192],
                strokeColor: [16, 16, 16],
                strokeWeight: 2,
            },
            activeStatusStyle: {
                fillColor: [10, 2, 192],
                strokeColor: [16, 16, 16],
                strokeWeight: 4,
            },
            hoverStatusStyle: {
                fillColor: [10, 2, 224],
                strokeColor: [10, 16, 32],
                strokeWeight: 10,
            },
            disabledStatusStyle: {
                fillColor: [10, 2, 32],
                strokeColor: [16, 16, 16],
                strokeWeight: 2,
            },
            fontColor: [20, 5, 16],
            padding: WINDOW_SPACING.SPACING1,
            text: "Save",
            fontSize: 14,
        },
        messageLabel: {
            drawingArea: {
                startColumn: 8,
                endColumn: 9,
                top: 10,
                bottom: 60,
            },
            rectangleStyle: {
                noFill: true,
                noStroke: true,
            },
            fontColor: [0, 0, 100],
            padding: WINDOW_SPACING.SPACING1,
            fontSize: 20,
        },
    })
}

const createContext = (fileAccessHUD: FileAccessHUD) => {
    fileAccessHUD.data.setContext({
        buttonStatusChangeEventDataBlob: DataBlobService.new(),
    })
}

const resetUIObjects = (fileAccessHUD: FileAccessHUD) => {
    const uiObjects: FileAccessHUDUIObjects = {
        loadButton: undefined,
        saveButton: undefined,
        graphicsContext: undefined,
        resourceHandler: undefined,
    }
    fileAccessHUD.data.setUIObjects(uiObjects)
}

const createDrawingTask = (fileAccessHUD: FileAccessHUD) => {
    const createLoadButtonTask = new SequenceComposite(fileAccessHUD.data, [
        new FileAccessHUDShouldCreateLoadButton(fileAccessHUD.data),
        new FileAccessHUDCreateLoadButton(fileAccessHUD.data),
    ])

    const createSaveButtonTask = new SequenceComposite(fileAccessHUD.data, [
        new FileAccessHUDShouldCreateSaveButton(fileAccessHUD.data),
        new FileAccessHUDCreateSaveButton(fileAccessHUD.data),
    ])

    const drawTask = new SequenceComposite(fileAccessHUD.data, [])

    fileAccessHUD.drawUITask = new ExecuteAllComposite(fileAccessHUD.data, [
        createLoadButtonTask,
        createSaveButtonTask,
        drawTask,
    ])
}

const reactToLoadGameButtonStatusChangeEvent = (
    fileAccessHUD: FileAccessHUD,
    fileState: FileState,
    messageBoard: MessageBoard
) => {
    const uiObjects: FileAccessHUDUIObjects = fileAccessHUD.data.getUIObjects()
    const loadButton = uiObjects.loadButton
    const statusChangeEvent = loadButton.getStatusChangeEvent()
    if (statusChangeEvent?.newStatus != ButtonStatus.ACTIVE) return

    if (
        battleIsCurrentlySavingOrLoading({
            fileAccessHUD,
            fileState,
        })
    ) {
        return
    }
    messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
        loadSaveState: fileState.loadSaveState,
    })
}

const reactToSaveGameButtonStatusChangeEvent = (
    fileAccessHUD: FileAccessHUD,
    fileState: FileState
) => {
    const uiObjects: FileAccessHUDUIObjects = fileAccessHUD.data.getUIObjects()
    const saveButton = uiObjects.saveButton
    const statusChangeEvent = saveButton.getStatusChangeEvent()
    if (statusChangeEvent?.newStatus != ButtonStatus.ACTIVE) return

    if (
        battleIsCurrentlySavingOrLoading({
            fileAccessHUD,
            fileState,
        })
    ) {
        return
    }
    SaveSaveStateService.userRequestsSave(fileState.saveSaveState)
    disableButtons(fileAccessHUD)
}

const getButtons = (fileAccessHUD: FileAccessHUD) => {
    const uiObjects: FileAccessHUDUIObjects = fileAccessHUD.data.getUIObjects()
    return [uiObjects.loadButton, uiObjects.saveButton].filter((x) => x)
}
