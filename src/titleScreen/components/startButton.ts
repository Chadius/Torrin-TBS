import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import { WindowService } from "../../utils/graphics/window"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
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

const TITLE_SCREEN_START_BUTTON_ID = "TITLE_SCREEN_START_BUTTON_ID"

export class ShouldCreateStartGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )
        const startGameButton = uiObjects.startGameButton

        if (startGameButton == undefined) return true

        const { width: windowWidth, height: windowHeight } =
            WindowService.getDimensions()

        const windowIsTooSmall: boolean =
            windowWidth < ScreenDimensions.SCREEN_WIDTH ||
            windowHeight < ScreenDimensions.SCREEN_HEIGHT

        if (windowIsTooSmall) return true

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        const playButtonHasBeenClicked: boolean =
            startGameButton?.getStatus() === ButtonStatus.ACTIVE

        const readyButtonLabel: Label =
            DataBlobService.get<AllLabelButtonUIObjects>(
                uiObjects.startGameButton.buttonStyle.dataBlob,
                "uiObjects"
            )?.buttonLabelsByStatus[ButtonStatus.READY]
        if (readyButtonLabel == undefined) return true

        return (
            !playButtonHasBeenClicked &&
            readyButtonLabel.textBox.text !==
                layout.startGameButton.playGameMessage
        )
    }
}

export class CreateStartGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
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

        const {
            buttonFontSize,
            readyLabelText,
            playButtonHorizontalAlignment,
        } = this.calculateReadyLabelText()

        const buttonLogic = new ButtonLogicChangeOnRelease({
            dataBlob: context.buttonStatusChangeEventDataBlob,
        })
        const allLabelButtonDataBlob: AllLabelButtonDataBlob = {
            data: {
                layout: {
                    labelByButtonStatus: {
                        [ButtonStatus.READY]: LabelService.new({
                            text: readyLabelText,
                            fillColor: layout.colors.playButton,
                            area: RectAreaService.new(
                                layout.startGameButton.buttonArea
                            ),
                            fontSize: buttonFontSize,
                            fontColor: layout.colors.playButtonText,
                            textBoxMargin: WINDOW_SPACING.SPACING1,
                            horizAlign: playButtonHorizontalAlignment,
                            vertAlign: VERTICAL_ALIGN.CENTER,
                            strokeColor: layout.colors.playButtonStroke,
                        }),
                        [ButtonStatus.HOVER]: LabelService.new({
                            text: "Click to play!",
                            fillColor: layout.colors.playButtonActive,
                            area: RectAreaService.new(
                                layout.startGameButton.buttonArea
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
                                layout.startGameButton.buttonArea
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

        uiObjects.startGameButton = new Button({
            id: TITLE_SCREEN_START_BUTTON_ID,
            drawTask,
            buttonLogic,
        })

        return true
    }

    private calculateReadyLabelText() {
        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        const { width: windowWidth, height: windowHeight } =
            WindowService.getDimensions()

        const buttonWidth =
            windowWidth > ScreenDimensions.SCREEN_WIDTH
                ? ScreenDimensions.SCREEN_WIDTH
                : windowWidth

        const windowIsTooSmall: boolean =
            windowWidth < ScreenDimensions.SCREEN_WIDTH ||
            windowHeight < ScreenDimensions.SCREEN_HEIGHT

        if (!windowIsTooSmall) {
            return {
                readyLabelText: layout.startGameButton.playGameMessage,
                buttonFontSize: WINDOW_SPACING.SPACING4,
                playButtonHorizontalAlignment: HORIZONTAL_ALIGN.CENTER,
            }
        }

        let buttonFontSize = buttonWidth / 35
        let readyLabelText = `Set browser window size to ${ScreenDimensions.SCREEN_WIDTH}x${ScreenDimensions.SCREEN_HEIGHT}\n currently ${windowWidth}x${windowHeight}`

        const buttonTextMinimumSize = 18
        if (buttonFontSize < buttonTextMinimumSize) {
            buttonFontSize = buttonTextMinimumSize
            readyLabelText = layout.startGameButton.smallWindowWarning
        }

        return {
            readyLabelText,
            buttonFontSize,
            playButtonHorizontalAlignment: HORIZONTAL_ALIGN.LEFT,
        }
    }
}
