import { FileState } from "../../gameEngine/fileState"
import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../ui/constants"
import { Button, ButtonStatus } from "../../ui/button/button"
import { LabelService } from "../../ui/label"
import { RectAreaService } from "../../ui/rectArea"
import { LoadSaveStateService } from "../../dataLoader/playerData/loadSaveState"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import {
    TitleScreen,
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenMenuSelection,
    TitleScreenUIObjects,
} from "../titleScreen"

export const TITLE_SCREEN_FILE_MESSAGE_DISPLAY_DURATION = 2000

export class ShouldCreateUpdateGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): ShouldCreateUpdateGameButtonAction {
        return new ShouldCreateUpdateGameButtonAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )
        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.dataBlob, "context")
        if (uiObjects.continueGameButton == undefined) {
            return true
        }

        const { buttonText, isError } = getContinueGameButtonText(context)
        if (
            isError &&
            context.errorDuringLoadingDisplayStartTimestamp == undefined
        ) {
            context.errorDuringLoadingDisplayStartTimestamp = Date.now()
        }

        let errorMessageTimeoutReached = isErrorMessageTimeoutReached(context)
        if (errorMessageTimeoutReached) {
            LoadSaveStateService.reset(context.fileState.loadSaveState)
            context.errorDuringLoadingDisplayStartTimestamp = undefined
        }

        return (
            errorMessageTimeoutReached ||
            uiObjects.continueGameButton.readyLabel.textBox.text !== buttonText
        )
    }
}

export class CreateUpdateGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): CreateUpdateGameButtonAction {
        return new CreateUpdateGameButtonAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.dataBlob, "context")
        const messageBoard = context.messageBoard
        const fileState = context.fileState

        const { buttonText } = getContinueGameButtonText(context)
        const buttonFontSize = WINDOW_SPACING.SPACING2
        const playButtonHorizontalAlignment = HORIZONTAL_ALIGN.CENTER

        uiObjects.continueGameButton = new Button({
            activeLabel: LabelService.new({
                text: "Now loading...",
                fillColor: layout.colors.playButtonActive,
                area: RectAreaService.new(layout.continueGameButton.buttonArea),
                fontSize: buttonFontSize,
                fontColor: layout.colors.playButtonText,
                textBoxMargin: WINDOW_SPACING.SPACING1,
                horizAlign: HORIZONTAL_ALIGN.CENTER,
                vertAlign: VERTICAL_ALIGN.CENTER,
                strokeColor: layout.colors.playButtonStroke,
            }),
            readyLabel: LabelService.new({
                text: buttonText,
                fillColor: layout.colors.playButton,
                area: RectAreaService.new(layout.continueGameButton.buttonArea),
                fontSize: buttonFontSize,
                fontColor: layout.colors.playButtonText,
                textBoxMargin: WINDOW_SPACING.SPACING1,
                horizAlign: playButtonHorizontalAlignment,
                vertAlign: VERTICAL_ALIGN.CENTER,
                strokeColor: layout.colors.playButtonStroke,
            }),
            initialStatus: ButtonStatus.READY,
            onClickHandler(
                _mouseX: number,
                _mouseY: number,
                button: Button,
                _caller: TitleScreen
            ): {} {
                if (context.menuSelection === TitleScreenMenuSelection.NONE) {
                    context.menuSelection =
                        TitleScreenMenuSelection.CONTINUE_GAME

                    LoadSaveStateService.reset(fileState.loadSaveState)
                    messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                        loadSaveState: fileState.loadSaveState,
                    })

                    button.setStatus(ButtonStatus.ACTIVE)
                }
                return {}
            },
        })
        DataBlobService.add<TitleScreenContext>(
            this.dataBlob,
            "context",
            context
        )

        return true
    }
}

const getContinueGameButtonText = (
    context: TitleScreenContext
): { buttonText: string; isError: boolean } => {
    const didLoadingFail = (fileState: FileState): boolean => {
        const loadingFailedDueToError: boolean =
            fileState.loadSaveState.applicationErroredWhileLoading
        const userCanceledLoad: boolean =
            fileState.loadSaveState.userCanceledLoad
        return loadingFailedDueToError || userCanceledLoad
    }

    const wasLoadingEngaged = (fileState: FileState): boolean => {
        const userRequestedLoad: boolean =
            fileState.loadSaveState.userRequestedLoad === true

        return userRequestedLoad || didLoadingFail(fileState)
    }

    const userIsWaitingForLoadToFinish = (fileState: FileState): boolean => {
        const userRequestedLoad: boolean =
            fileState.loadSaveState.userRequestedLoad === true

        return userRequestedLoad && !didLoadingFail(fileState)
    }

    switch (true) {
        case !wasLoadingEngaged(context.fileState):
            return {
                buttonText: "Load file and continue",
                isError: false,
            }
        case userIsWaitingForLoadToFinish(context.fileState):
            return {
                buttonText: "Now loading...",
                isError: false,
            }
        case isErrorMessageTimeoutReached(context):
            return {
                buttonText: "Load file and continue",
                isError: false,
            }
        case context.fileState.loadSaveState.applicationErroredWhileLoading:
            return {
                buttonText: "Loading failed. Check logs.",
                isError: true,
            }
        case context.fileState.loadSaveState.userCanceledLoad:
            return {
                buttonText: `Canceled loading.`,
                isError: true,
            }
        default:
            return {
                buttonText: "unknown loading state",
                isError: true,
            }
    }
}
const isErrorMessageTimeoutReached = (context: TitleScreenContext): boolean => {
    return (
        context.errorDuringLoadingDisplayStartTimestamp !== undefined &&
        Date.now() - context.errorDuringLoadingDisplayStartTimestamp >=
            TITLE_SCREEN_FILE_MESSAGE_DISPLAY_DURATION
    )
}
