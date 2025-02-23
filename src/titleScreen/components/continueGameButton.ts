import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import {
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenUIObjects,
} from "../titleScreen"
import { Label, LabelService } from "../../ui/label"
import { RectAreaService } from "../../ui/rectArea"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../ui/constants"
import { ButtonStatus } from "../../ui/button/buttonStatus"
import {
    AllLabelButtonDataBlob,
    AllLabelButtonDrawTask,
    AllLabelButtonUIObjects,
} from "../../ui/button/style/AllLabelStyle/allLabelStyle"
import { Button } from "../../ui/button/button"
import { ButtonLogicChangeOnRelease } from "../../ui/button/logic/buttonLogicChangeOnRelease"
import { LoadSaveStateService } from "../../dataLoader/playerData/loadSaveState"
import { FileState } from "../../gameEngine/fileState"

const TITLE_SCREEN_CONTINUE_BUTTON_ID = "TITLE_SCREEN_CONTINUE_BUTTON_ID"

export class ShouldCreateContinueGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): ShouldCreateContinueGameButtonAction {
        return new ShouldCreateContinueGameButtonAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )
        const continueGameButton = uiObjects.continueGameButton

        if (continueGameButton == undefined) return true

        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.dataBlob, "context")

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

        const readyButtonLabel: Label =
            DataBlobService.get<AllLabelButtonUIObjects>(
                uiObjects.continueGameButton.buttonStyle.dataBlob,
                "uiObjects"
            )?.buttonLabelsByStatus[ButtonStatus.READY]
        if (readyButtonLabel == undefined) return true

        return (
            errorMessageTimeoutReached ||
            readyButtonLabel.textBox.text !== buttonText
        )
    }
}

export class CreateContinueGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): CreateContinueGameButtonAction {
        return new CreateContinueGameButtonAction(this.dataBlob)
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

        const { buttonText } = getContinueGameButtonText(context)
        const buttonFontSize = WINDOW_SPACING.SPACING2
        const playButtonHorizontalAlignment = HORIZONTAL_ALIGN.CENTER

        const buttonLogic = new ButtonLogicChangeOnRelease({
            dataBlob: context.buttonStatusChangeEventDataBlob,
        })
        const allLabelButtonDataBlob: AllLabelButtonDataBlob = {
            data: {
                layout: {
                    labelByButtonStatus: {
                        [ButtonStatus.READY]: LabelService.new({
                            text: buttonText,
                            fillColor: layout.colors.playButton,
                            area: RectAreaService.new(
                                layout.continueGameButton.buttonArea
                            ),
                            fontSize: buttonFontSize,
                            fontColor: layout.colors.playButtonText,
                            textBoxMargin: WINDOW_SPACING.SPACING1,
                            horizAlign: playButtonHorizontalAlignment,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            strokeColor: layout.colors.playButtonStroke,
                        }),
                        [ButtonStatus.HOVER]: LabelService.new({
                            text: "Click to open a file",
                            fillColor: layout.colors.playButtonActive,
                            area: RectAreaService.new(
                                layout.continueGameButton.buttonArea
                            ),
                            fontSize: buttonFontSize,
                            fontColor: layout.colors.playButtonText,
                            textBoxMargin: WINDOW_SPACING.SPACING1,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            strokeColor: layout.colors.playButtonStroke,
                        }),
                        [ButtonStatus.ACTIVE]: LabelService.new({
                            text: "Now loading...",
                            fillColor: layout.colors.playButtonActive,
                            area: RectAreaService.new(
                                layout.continueGameButton.buttonArea
                            ),
                            fontSize: buttonFontSize,
                            fontColor: layout.colors.playButtonText,
                            textBoxMargin: WINDOW_SPACING.SPACING1,
                            horizAlign: HORIZONTAL_ALIGN.CENTER,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            strokeColor: layout.colors.playButtonStroke,
                        }),
                        [ButtonStatus.DISABLED]: LabelService.new({
                            area: RectAreaService.new({
                                left: 30,
                                top: 30,
                                width: 30,
                                height: 20,
                            }),
                            text: "Disabled",
                            textBoxMargin: undefined,
                            fontColor: [0, 0, 0],
                            fontSize: 10,
                        }),
                    },
                },
            },
        }
        const drawTask = new AllLabelButtonDrawTask({
            buttonLogic: buttonLogic,
            dataBlob: allLabelButtonDataBlob,
        })

        uiObjects.continueGameButton = new Button({
            id: TITLE_SCREEN_CONTINUE_BUTTON_ID,
            drawTask,
            buttonLogic,
        })

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
        case !wasLoadingEngaged(context.fileState) ||
            isErrorMessageTimeoutReached(context):
            return {
                buttonText: "Load file and continue",
                isError: false,
            }
        case userIsWaitingForLoadToFinish(context.fileState):
            return {
                buttonText: "Now loading...",
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

export const TITLE_SCREEN_FILE_MESSAGE_DISPLAY_DURATION = 2000
const isErrorMessageTimeoutReached = (context: TitleScreenContext): boolean => {
    return (
        context.errorDuringLoadingDisplayStartTimestamp !== undefined &&
        Date.now() - context.errorDuringLoadingDisplayStartTimestamp >=
            TITLE_SCREEN_FILE_MESSAGE_DISPLAY_DURATION
    )
}
