import { BehaviorTreeTask } from "../../utils/behaviorTree/task"
import { DataBlob, DataBlobService } from "../../utils/dataBlob/dataBlob"
import { WindowService } from "../../utils/graphics/window"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    TitleScreen,
    TitleScreenContext,
    TitleScreenLayout,
    TitleScreenMenuSelection,
    TitleScreenUIObjects,
} from "../titleScreen"
import { LabelService } from "../../ui/label"
import { RectAreaService } from "../../ui/rectArea"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../ui/constants"
import { DEPRECATEDButton } from "../../ui/buttonDEPRECATED/DEPRECATEDButton"
import { ButtonStatus } from "../../ui/button/buttonStatus"

export class ShouldCreateStartGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): ShouldCreateStartGameButtonAction {
        return new ShouldCreateStartGameButtonAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const { width: windowWidth, height: windowHeight } =
            WindowService.getDimensions()

        const windowIsTooSmall: boolean =
            windowWidth < ScreenDimensions.SCREEN_WIDTH ||
            windowHeight < ScreenDimensions.SCREEN_HEIGHT

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        const playButtonHasBeenClicked: boolean =
            uiObjects.startNewGameButton &&
            uiObjects.startNewGameButton.getStatus() === ButtonStatus.ACTIVE

        switch (true) {
            case uiObjects.startNewGameButton == undefined:
                return true
            case windowIsTooSmall:
                return true
            case !playButtonHasBeenClicked &&
                uiObjects.startNewGameButton.readyLabel.textBox.text !==
                    layout.startGameButton.playGameMessage:
                return true
            default:
                return false
        }
    }
}

export class CreateStartGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): CreateStartGameButtonAction {
        return new CreateStartGameButtonAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        const {
            buttonFontSize,
            readyLabelText,
            playButtonHorizontalAlignment,
        } = this.calculateReadyLabelText()

        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.dataBlob, "context")

        uiObjects.startNewGameButton = new DEPRECATEDButton({
            activeLabel: LabelService.new({
                text: "Now loading...",
                fillColor: layout.colors.playButtonActive,
                area: RectAreaService.new(layout.startGameButton.buttonArea),
                fontSize: buttonFontSize,
                fontColor: layout.colors.playButtonText,
                textBoxMargin: WINDOW_SPACING.SPACING1,
                horizAlign: HORIZONTAL_ALIGN.CENTER,
                vertAlign: VERTICAL_ALIGN.CENTER,
                strokeColor: layout.colors.playButtonStroke,
            }),
            readyLabel: LabelService.new({
                text: readyLabelText,
                fillColor: layout.colors.playButton,
                area: RectAreaService.new(layout.startGameButton.buttonArea),
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
                button: DEPRECATEDButton,
                _caller: TitleScreen
            ): {} {
                if (context.menuSelection === TitleScreenMenuSelection.NONE) {
                    context.menuSelection = TitleScreenMenuSelection.NEW_GAME
                    button.setStatus(ButtonStatus.ACTIVE)
                }
                return {}
            },
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
