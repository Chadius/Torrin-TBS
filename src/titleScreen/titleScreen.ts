import { TitleScreenState, TitleScreenStateHelper } from "./titleScreenState"
import {
    GameEngineChanges,
    GameEngineComponent,
} from "../gameEngine/gameEngineComponent"
import { MouseButton } from "../utils/mouseConfig"
import { GameEngineState } from "../gameEngine/gameEngine"
import { GameModeEnum } from "../utils/startupConfig"
import { LabelService } from "../ui/label"
import { Button, ButtonStatus } from "../ui/button"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../ui/constants"
import { RectArea, RectAreaService } from "../ui/rectArea"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { TextBox, TextBoxService } from "../ui/textBox/textBox"
import { Rectangle, RectangleService } from "../ui/rectangle"
import { ResourceHandler } from "../resource/resourceHandler"
import { LoadSaveStateService } from "../dataLoader/playerData/loadSaveState"
import { isValidValue } from "../utils/validityCheck"
import p5 from "p5"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import {
    ImageUI,
    ImageUILoadingBehavior,
    ImageUIService,
} from "../ui/imageUI/imageUI"
import {
    PlayerInputAction,
    PlayerInputStateService,
} from "../ui/playerInput/playerInputState"
import { MessageBoardMessageType } from "../message/messageBoardMessage"

export const FILE_MESSAGE_DISPLAY_DURATION = 2000

enum TitleScreenMenuSelection {
    NONE = "NONE",
    NEW_GAME = "NEW_GAME",
    CONTINUE_GAME = "CONTINUE_GAME",
}

const colors = {
    background: [73, 10, 46],
    backgroundText: [73, 10, 6],
    titleBanner: [207, 37, 80],
    titleBannerStroke: [207, 6, 20],
    descriptionText: [73, 10, 96],
    playButton: [207, 67, 40],
    playButtonStroke: [207, 67, 80],
    playButtonActive: [207, 47, 20],
    playButtonText: [207, 17, 80],
}

const TitleScreenDesign = {
    logo: {
        iconImageResourceKey: "torrins trial logo",
        screenHeight: 0.5,
    },
    title: {
        screenHeight: 0.52,
        startColumn: 1,
        endColumn: 4,
    },
    byLine: {
        screenHeight: 0.52,
        startColumn: 2,
        endColumn: 5,
    },
    gameDescription: {
        screenHeightTop: 0.02,
        screenHeightBottom: 0.32,
        startColumn: 4,
        endColumn: 11,
        text: "Desert Fantasy Squad Tactics",
    },
    startGameButton: {
        smallWindowWarning: "Window is too small",
        playGameMessage: "START: click here / press enter",
        buttonArea: {
            left: WINDOW_SPACING.SPACING4,
            right: ScreenDimensions.SCREEN_WIDTH - WINDOW_SPACING.SPACING4,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.63,
            bottom: ScreenDimensions.SCREEN_HEIGHT * 0.85,
        },
    },
    continueGameButton: {
        buttonArea: {
            left:
                ScreenDimensions.SCREEN_WIDTH * 0.74 - WINDOW_SPACING.SPACING1,
            right: ScreenDimensions.SCREEN_WIDTH - WINDOW_SPACING.SPACING1,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.86,
            bottom: ScreenDimensions.SCREEN_HEIGHT - WINDOW_SPACING.SPACING1,
        },
    },
    demonSlither: {
        iconArea: {
            startColumn: 6,
            width: 80,
        },
        descriptionText: "Destroy all demons. These Slither demons bite!",
        iconImageResourceKey: "combat-demon-slither-neutral",
    },
    demonLocust: {
        iconArea: {
            startColumn: 6,
            width: 80,
        },
        descriptionText: "Locust demons attack from range.",
        iconImageResourceKey: "combat-demon-locust-neutral",
    },
    nahla: {
        iconArea: {
            startColumn: 5,
            width: 100,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        },
        descriptionText:
            "This is Nahla. She can attack at range and heal with a touch.",
        iconImageResourceKey: "young nahla cutscene portrait",
    },
    sirCamil: {
        iconArea: {
            startColumn: 5,
            width: 100,
            top:
                ScreenDimensions.SCREEN_HEIGHT * 0.13 +
                WINDOW_SPACING.SPACING1 +
                100,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        },
        descriptionText: "Her friend, Sir Camil has a sword and shield.",
        iconImageResourceKey: "sir camil cutscene portrait",
    },
    version: {
        startColumn: 0,
        endColumn: 1,
        fontSize: 8,
        top: ScreenDimensions.SCREEN_HEIGHT - WINDOW_SPACING.SPACING4,
        bottom: ScreenDimensions.SCREEN_HEIGHT - WINDOW_SPACING.SPACING1,
        fontColor: [0, 0, 128],
    },
}

const resourceKeys: string[] = [
    TitleScreenDesign.logo.iconImageResourceKey,
    TitleScreenDesign.sirCamil.iconImageResourceKey,
    TitleScreenDesign.demonSlither.iconImageResourceKey,
    TitleScreenDesign.demonLocust.iconImageResourceKey,
    TitleScreenDesign.nahla.iconImageResourceKey,
]

export class TitleScreen implements GameEngineComponent {
    startLoadingResources: boolean
    continueGameButton: Button
    continueGameButtonLabel: string
    errorDuringLoadingDisplayStartTimestamp: number
    menuSelection: TitleScreenMenuSelection
    startNewGameButton: Button
    version: string
    private byLine: TextBox
    private titleText: TextBox
    private gameDescription: TextBox
    private background: Rectangle
    private titleBanner: ImageUI
    private titleBannerArea: RectArea
    private startNewGameButtonLabel: string
    private versionTextBox: TextBox
    private demonSlitherUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }

    private demonLocustUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }

    private sirCamilUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }

    private nahlaUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }
    private readonly _resourceHandler: ResourceHandler

    constructor({
        resourceHandler,
        version,
    }: {
        resourceHandler: ResourceHandler
        version: string
    }) {
        this._resourceHandler = resourceHandler
        this.version = version
        this.resetInternalState()
    }

    get resourceHandler(): ResourceHandler {
        return this._resourceHandler
    }

    get newGameSelected(): boolean {
        return this.menuSelection === TitleScreenMenuSelection.NEW_GAME
    }

    update(state: GameEngineState, graphicsContext: GraphicsBuffer): void {
        if (this.startLoadingResources === false) {
            this.loadResourcesFromHandler()
        }
        this.draw(state, graphicsContext, state.resourceHandler)
    }

    keyPressed(gameEngineState: GameEngineState, keyCode: number): void {
        const actions: PlayerInputAction[] =
            PlayerInputStateService.getActionsForPressedKey(
                gameEngineState.playerInputState,
                keyCode
            )
        if (actions.includes(PlayerInputAction.ACCEPT)) {
            this.startNewGameButton.onClickHandler(
                0,
                0,
                this.startNewGameButton,
                this
            )
        }
    }

    mouseClicked(
        state: GameEngineState,
        mouseButton: MouseButton,
        mouseX: number,
        mouseY: number
    ): void {
        this.startNewGameButton.mouseClicked(mouseX, mouseY, this)
        this.continueGameButton.mouseClicked(mouseX, mouseY, this)
    }

    mouseMoved(state: GameEngineState, mouseX: number, mouseY: number): void {
        // No action
    }

    hasCompleted(state: GameEngineState): boolean {
        return this.menuSelection !== TitleScreenMenuSelection.NONE
    }

    reset(state: GameEngineState): void {
        this.resetInternalState()
    }

    setup(): TitleScreenState {
        return TitleScreenStateHelper.new()
    }

    recommendStateChanges(
        state: GameEngineState
    ): GameEngineChanges | undefined {
        return {
            nextMode: GameModeEnum.LOADING_BATTLE,
        }
    }

    markGameToBeLoaded(gameEngineState: GameEngineState): void {
        LoadSaveStateService.reset(gameEngineState.fileState.loadSaveState)
        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
            loadSaveState: gameEngineState.fileState.loadSaveState,
        })
    }

    private draw(
        state: GameEngineState,
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ): void {
        RectangleService.draw(this.lazyLoadBackground(), graphicsContext)
        this.drawTitleBanner(graphicsContext, resourceHandler)

        TextBoxService.draw(this.lazyLoadTitle(), graphicsContext)
        TextBoxService.draw(this.lazyLoadByLine(), graphicsContext)
        TextBoxService.draw(this.lazyLoadGameDescription(), graphicsContext)
        TextBoxService.draw(this.lazyLoadVersion(), graphicsContext)

        this.updateStartGameButton(graphicsContext).draw(graphicsContext)
        this.updateContinueGameButton(state).draw(graphicsContext)
        this.drawCharacterIntroductions(graphicsContext, resourceHandler)
    }

    private resetInternalState() {
        this.startLoadingResources = false

        if (this.titleBanner === undefined) {
            this.titleBannerArea = RectAreaService.new({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
            })
        }

        if (!isValidValue(this.demonSlitherUIElements)) {
            this.demonSlitherUIElements = {
                icon: undefined,
                iconArea: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                }),
                descriptionText: undefined,
            }
        }
        if (!isValidValue(this.demonSlitherUIElements.icon)) {
            this.demonSlitherUIElements.iconArea = RectAreaService.new({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
            })
        }
        if (!isValidValue(this.demonLocustUIElements)) {
            this.demonLocustUIElements = {
                icon: undefined,
                iconArea: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                }),
                descriptionText: undefined,
            }
        }
        if (!isValidValue(this.demonLocustUIElements.icon)) {
            this.demonLocustUIElements.iconArea = RectAreaService.new({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
            })
        }

        if (!isValidValue(this.nahlaUIElements)) {
            this.nahlaUIElements = {
                icon: undefined,
                iconArea: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                }),
                descriptionText: undefined,
            }
        }
        if (!isValidValue(this.nahlaUIElements.icon)) {
            this.nahlaUIElements.iconArea = RectAreaService.new({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
            })
        }

        if (!isValidValue(this.sirCamilUIElements)) {
            this.sirCamilUIElements = {
                icon: undefined,
                iconArea: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                }),
                descriptionText: undefined,
            }
        }
        if (!isValidValue(this.sirCamilUIElements.icon)) {
            this.sirCamilUIElements.iconArea = RectAreaService.new({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
            })
        }

        this.titleBanner = undefined
        this.startNewGameButton = undefined
        this.continueGameButton = undefined
        this.byLine = undefined
        this.titleText = undefined
        this.menuSelection = TitleScreenMenuSelection.NONE
        this.errorDuringLoadingDisplayStartTimestamp = undefined
    }

    private drawTitleBanner(
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        if (this.titleBanner === undefined) {
            this.titleBannerArea = RectAreaService.new({
                left: WINDOW_SPACING.SPACING1,
                top: WINDOW_SPACING.SPACING1,
                width: ScreenDimensions.SCREEN_WIDTH * 0.25,
                height: ScreenDimensions.SCREEN_HEIGHT * 0.25,
            })

            if (this.areResourcesLoaded() === false) {
                return
            }

            let image: p5.Image = this.resourceHandler.getResource(
                TitleScreenDesign.logo.iconImageResourceKey
            )

            this.titleBannerArea = RectAreaService.new({
                left: WINDOW_SPACING.SPACING1,
                top: WINDOW_SPACING.SPACING1,
                height:
                    ScreenDimensions.SCREEN_HEIGHT *
                    TitleScreenDesign.logo.screenHeight,
                width: ImageUIService.scaleImageWidth({
                    imageWidth: image.width,
                    imageHeight: image.height,
                    desiredHeight:
                        ScreenDimensions.SCREEN_HEIGHT *
                        TitleScreenDesign.logo.screenHeight,
                }),
            })

            this.titleBanner = new ImageUI({
                imageLoadingBehavior: {
                    resourceKey: undefined,
                    loadingBehavior:
                        ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
                },
                graphic: image,
                area: this.titleBannerArea,
            })
        }

        this.titleBanner.draw({ graphicsContext, resourceHandler })
    }

    private lazyLoadTitle() {
        if (this.titleText === undefined) {
            this.titleText = TextBoxService.new({
                area: RectAreaService.new({
                    startColumn: TitleScreenDesign.title.startColumn,
                    endColumn: TitleScreenDesign.title.endColumn,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top:
                        ScreenDimensions.SCREEN_HEIGHT *
                        TitleScreenDesign.title.screenHeight,
                    height: WINDOW_SPACING.SPACING4,
                }),
                text: "Torrin's Trial",
                fontSize: WINDOW_SPACING.SPACING2,
                fontColor: colors.backgroundText,
            })
        }
        return this.titleText
    }

    private lazyLoadGameDescription() {
        if (this.gameDescription === undefined) {
            this.gameDescription = TextBoxService.new({
                area: RectAreaService.new({
                    startColumn: TitleScreenDesign.gameDescription.startColumn,
                    endColumn: TitleScreenDesign.gameDescription.endColumn,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top:
                        ScreenDimensions.SCREEN_HEIGHT *
                        TitleScreenDesign.gameDescription.screenHeightTop,
                    bottom:
                        ScreenDimensions.SCREEN_HEIGHT *
                        TitleScreenDesign.gameDescription.screenHeightBottom,
                    margin: WINDOW_SPACING.SPACING1,
                }),
                text: TitleScreenDesign.gameDescription.text,
                fontSize: WINDOW_SPACING.SPACING4,
                fontColor: colors.descriptionText,
            })
        }

        return this.gameDescription
    }

    private lazyLoadByLine() {
        if (!isValidValue(this.byLine)) {
            this.byLine = TextBoxService.new({
                area: RectAreaService.new({
                    startColumn: TitleScreenDesign.byLine.startColumn,
                    endColumn: TitleScreenDesign.byLine.endColumn,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top:
                        ScreenDimensions.SCREEN_HEIGHT *
                        TitleScreenDesign.byLine.screenHeight,
                    bottom:
                        ScreenDimensions.SCREEN_HEIGHT *
                            TitleScreenDesign.byLine.screenHeight +
                        WINDOW_SPACING.SPACING4,
                }),
                text: "by Chad Serrant",
                fontSize: WINDOW_SPACING.SPACING2,
                fontColor: colors.backgroundText,
            })
        }
        return this.byLine
    }

    private lazyLoadVersion() {
        if (this.versionTextBox === undefined) {
            this.versionTextBox = TextBoxService.new({
                area: RectAreaService.new({
                    startColumn: TitleScreenDesign.version.startColumn,
                    endColumn: TitleScreenDesign.version.endColumn,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: TitleScreenDesign.version.top,
                    bottom: TitleScreenDesign.version.bottom,
                    margin: WINDOW_SPACING.SPACING1,
                }),
                text: `Version ${this.version}`,
                fontSize: TitleScreenDesign.version.fontSize,
                fontColor: TitleScreenDesign.version.fontColor,
            })
        }

        return this.versionTextBox
    }

    private updateStartGameButton(graphicsContext: GraphicsBuffer) {
        const windowIsTooSmall: boolean =
            graphicsContext.width < ScreenDimensions.SCREEN_WIDTH ||
            graphicsContext.height < ScreenDimensions.SCREEN_HEIGHT

        const buttonWidth =
            graphicsContext.width > ScreenDimensions.SCREEN_WIDTH
                ? ScreenDimensions.SCREEN_WIDTH
                : graphicsContext.width

        this.startNewGameButtonLabel = ""
        const playButtonHasBeenClicked: boolean =
            this.startNewGameButton &&
            this.startNewGameButton.getStatus() === ButtonStatus.ACTIVE
        let changePlayButtonLabel: boolean = false
        let buttonFontSize = WINDOW_SPACING.SPACING4
        if (windowIsTooSmall) {
            buttonFontSize = buttonWidth / 35
            this.startNewGameButtonLabel = `Set browser window size to ${ScreenDimensions.SCREEN_WIDTH}x${ScreenDimensions.SCREEN_HEIGHT}\n currently ${graphicsContext.width}x${graphicsContext.height}`

            const buttonTextMinimumSize = 18
            if (buttonFontSize < buttonTextMinimumSize) {
                buttonFontSize = buttonTextMinimumSize
                this.startNewGameButtonLabel =
                    TitleScreenDesign.startGameButton.smallWindowWarning
            }
            changePlayButtonLabel = true
        } else if (
            (!windowIsTooSmall &&
                !playButtonHasBeenClicked &&
                this.startNewGameButtonLabel !==
                    TitleScreenDesign.startGameButton.playGameMessage) ||
            this.startNewGameButton === undefined
        ) {
            this.startNewGameButtonLabel =
                TitleScreenDesign.startGameButton.playGameMessage
            changePlayButtonLabel = true
        }

        const playButtonHorizontalAlignment = windowIsTooSmall
            ? HORIZONTAL_ALIGN.LEFT
            : HORIZONTAL_ALIGN.CENTER

        if (this.startNewGameButton === undefined || changePlayButtonLabel) {
            this.startNewGameButton = new Button({
                activeLabel: LabelService.new({
                    text: "Now loading...",
                    fillColor: colors.playButtonActive,
                    area: RectAreaService.new(
                        TitleScreenDesign.startGameButton.buttonArea
                    ),
                    fontSize: buttonFontSize,
                    fontColor: colors.playButtonText,
                    textBoxMargin: WINDOW_SPACING.SPACING1,
                    horizAlign: HORIZONTAL_ALIGN.CENTER,
                    vertAlign: VERTICAL_ALIGN.CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                readyLabel: LabelService.new({
                    text: this.startNewGameButtonLabel,
                    fillColor: colors.playButton,
                    area: RectAreaService.new(
                        TitleScreenDesign.startGameButton.buttonArea
                    ),
                    fontSize: buttonFontSize,
                    fontColor: colors.playButtonText,
                    textBoxMargin: WINDOW_SPACING.SPACING1,
                    horizAlign: playButtonHorizontalAlignment,
                    vertAlign: VERTICAL_ALIGN.CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                initialStatus: ButtonStatus.READY,
                onClickHandler(
                    mouseX: number,
                    mouseY: number,
                    button: Button,
                    caller: TitleScreen
                ): {} {
                    if (
                        caller.menuSelection === TitleScreenMenuSelection.NONE
                    ) {
                        caller.menuSelection = TitleScreenMenuSelection.NEW_GAME
                        button.setStatus(ButtonStatus.ACTIVE)
                    }
                    return {}
                },
            })
        }

        return this.startNewGameButton
    }

    private updateContinueGameButton(gameEngineState: GameEngineState) {
        const newButtonLabel = this.getNewButtonLabel(gameEngineState)

        let changePlayButtonLabel: boolean =
            newButtonLabel !== this.continueGameButtonLabel
        if (changePlayButtonLabel) {
            this.continueGameButtonLabel = newButtonLabel
        }
        let buttonFontSize = WINDOW_SPACING.SPACING2

        const playButtonHorizontalAlignment = HORIZONTAL_ALIGN.CENTER

        if (this.continueGameButton === undefined || changePlayButtonLabel) {
            this.continueGameButton = new Button({
                activeLabel: LabelService.new({
                    text: "Now loading...",
                    fillColor: colors.playButtonActive,
                    area: RectAreaService.new(
                        TitleScreenDesign.continueGameButton.buttonArea
                    ),
                    fontSize: buttonFontSize,
                    fontColor: colors.playButtonText,
                    textBoxMargin: WINDOW_SPACING.SPACING1,
                    horizAlign: HORIZONTAL_ALIGN.CENTER,
                    vertAlign: VERTICAL_ALIGN.CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                readyLabel: LabelService.new({
                    text: this.continueGameButtonLabel,
                    fillColor: colors.playButton,
                    area: RectAreaService.new(
                        TitleScreenDesign.continueGameButton.buttonArea
                    ),
                    fontSize: buttonFontSize,
                    fontColor: colors.playButtonText,
                    textBoxMargin: WINDOW_SPACING.SPACING1,
                    horizAlign: playButtonHorizontalAlignment,
                    vertAlign: VERTICAL_ALIGN.CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                initialStatus: ButtonStatus.READY,
                onClickHandler(
                    mouseX: number,
                    mouseY: number,
                    button: Button,
                    caller: TitleScreen
                ): {} {
                    if (
                        caller.menuSelection === TitleScreenMenuSelection.NONE
                    ) {
                        caller.menuSelection =
                            TitleScreenMenuSelection.CONTINUE_GAME
                        caller.markGameToBeLoaded(gameEngineState)
                        button.setStatus(ButtonStatus.ACTIVE)
                    }
                    return {}
                },
            })
        }

        return this.continueGameButton
    }

    private getNewButtonLabel(state: GameEngineState): string {
        const loadFileAndContinueMessage = "Load file and continue"
        if (!this.wasLoadingEngaged(state)) {
            return loadFileAndContinueMessage
        }
        if (this.userIsWaitingForLoadToFinish(state)) {
            return "Now loading..."
        }

        const loadingFailedDueToError: boolean =
            state.fileState.loadSaveState.applicationErroredWhileLoading
        if (loadingFailedDueToError) {
            const applicationErrorMessage = "Loading failed. Check logs."
            this.updateErrorLabel(applicationErrorMessage)

            if (
                this.shouldShowApplicationErrorMessage(applicationErrorMessage)
            ) {
                return applicationErrorMessage
            }

            LoadSaveStateService.reset(state.fileState.loadSaveState)
            this.errorDuringLoadingDisplayStartTimestamp = undefined
            return loadFileAndContinueMessage
        }

        const userCancelMessage: string = `Canceled loading.`
        const currentlyShowingUserCancelMessage: boolean =
            isValidValue(this.continueGameButton) &&
            this.continueGameButton.readyLabel.textBox.text ===
                userCancelMessage
        if (!currentlyShowingUserCancelMessage) {
            this.updateLabelForUserCancel(userCancelMessage)
            return userCancelMessage
        }

        if (!this.isErrorMessageTimeoutReached()) {
            return userCancelMessage
        }

        LoadSaveStateService.reset(state.fileState.loadSaveState)
        this.errorDuringLoadingDisplayStartTimestamp = undefined
        return loadFileAndContinueMessage
    }

    private isErrorMessageTimeoutReached(): boolean {
        return (
            this.errorDuringLoadingDisplayStartTimestamp !== undefined &&
            Date.now() - this.errorDuringLoadingDisplayStartTimestamp >=
                FILE_MESSAGE_DISPLAY_DURATION
        )
    }

    private didLoadingFail(gameEngineState: GameEngineState): boolean {
        const loadingFailedDueToError: boolean =
            gameEngineState.fileState.loadSaveState
                .applicationErroredWhileLoading
        const userCanceledLoad: boolean =
            gameEngineState.fileState.loadSaveState.userCanceledLoad
        return loadingFailedDueToError || userCanceledLoad
    }

    private wasLoadingEngaged(gameEngineState: GameEngineState): boolean {
        const userRequestedLoad: boolean =
            gameEngineState.fileState.loadSaveState.userRequestedLoad === true

        return userRequestedLoad || this.didLoadingFail(gameEngineState)
    }

    private userIsWaitingForLoadToFinish(
        gameEngineState: GameEngineState
    ): boolean {
        const userRequestedLoad: boolean =
            gameEngineState.fileState.loadSaveState.userRequestedLoad === true

        return userRequestedLoad && !this.didLoadingFail(gameEngineState)
    }

    private shouldShowApplicationErrorMessage(
        applicationErrorMessage: string
    ): boolean {
        const currentlyShowingApplicationErrorMessage: boolean =
            isValidValue(this.continueGameButton) &&
            this.continueGameButton.readyLabel.textBox.text ===
                applicationErrorMessage

        if (!currentlyShowingApplicationErrorMessage) {
            return true
        }

        return !this.isErrorMessageTimeoutReached()
    }

    private updateErrorLabel(applicationErrorMessage: string) {
        const currentlyShowingApplicationErrorMessage: boolean =
            isValidValue(this.continueGameButton) &&
            this.continueGameButton.readyLabel.textBox.text ===
                applicationErrorMessage

        if (!currentlyShowingApplicationErrorMessage) {
            if (this.continueGameButton) {
                this.continueGameButton.buttonStatus = ButtonStatus.READY
            }
            this.errorDuringLoadingDisplayStartTimestamp = Date.now()
        }
    }

    private updateLabelForUserCancel(userCancelMessage: string) {
        if (this.continueGameButton) {
            this.continueGameButton.buttonStatus = ButtonStatus.READY
        }
        this.errorDuringLoadingDisplayStartTimestamp = Date.now()
        return userCancelMessage
    }

    private lazyLoadBackground() {
        if (this.background === undefined) {
            this.background = RectangleService.new({
                area: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: ScreenDimensions.SCREEN_WIDTH,
                    height: ScreenDimensions.SCREEN_HEIGHT,
                }),
                fillColor: colors.background,
            })
        }
        return this.background
    }

    private loadResourcesFromHandler() {
        this.startLoadingResources = true
        resourceKeys.forEach((key) => {
            if (!this.resourceHandler.isResourceLoaded(key)) {
                this.resourceHandler.loadResource(key)
            }
        })
    }

    private areResourcesLoaded(): boolean {
        return this.resourceHandler.areAllResourcesLoaded(resourceKeys)
    }

    private drawCharacterIntroductions(
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        this.drawNahlaCharacterIntroduction(graphicsContext, resourceHandler)
        this.drawSirCamilCharacterIntroduction(graphicsContext, resourceHandler)
        this.drawDemonSlitherCharacterIntroduction(
            graphicsContext,
            resourceHandler
        )
        this.drawDemonLocustCharacterIntroduction(
            graphicsContext,
            resourceHandler
        )
    }

    private drawSirCamilCharacterIntroduction(
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        if (this.sirCamilUIElements.icon === undefined) {
            this.createSirCamilPlaceholderIconAreaUnderNahla()
        }

        if (this.sirCamilUIElements.descriptionText === undefined) {
            this.setSirCamilDescriptionText()
        }

        TextBoxService.draw(
            this.sirCamilUIElements.descriptionText,
            graphicsContext
        )

        if (this.areResourcesLoaded() === false) {
            return
        }

        if (this.sirCamilUIElements.icon === undefined) {
            let image: p5.Image = this.resourceHandler.getResource(
                "sir camil cutscene portrait"
            )
            this.setSirCamilIconBasedOnImageAndNahlaImage(image)
            this.setSirCamilDescriptionText()
        }
        this.sirCamilUIElements.icon.draw({ graphicsContext, resourceHandler })
    }

    private setSirCamilIconBasedOnImageAndNahlaImage(image: p5.Image) {
        ;({
            iconArea: this.sirCamilUIElements.iconArea,
            icon: this.sirCamilUIElements.icon,
        } = updateIconBasedOnImage({
            iconArea: this.sirCamilUIElements.iconArea,
            image,
            desiredWidth: TitleScreenDesign.sirCamil.iconArea.width,
            overrides: {
                top:
                    RectAreaService.bottom(this.nahlaUIElements.iconArea) +
                    WINDOW_SPACING.SPACING1,
            },
        }))
    }

    private createSirCamilPlaceholderIconAreaUnderNahla() {
        this.sirCamilUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.sirCamil.iconArea.startColumn,
            endColumn: TitleScreenDesign.sirCamil.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: TitleScreenDesign.sirCamil.iconArea.top,
            height: TitleScreenDesign.sirCamil.iconArea.height,
        })
    }

    private setSirCamilDescriptionText() {
        this.sirCamilUIElements.descriptionText = TextBoxService.new({
            area: RectAreaService.new({
                left:
                    RectAreaService.right(this.sirCamilUIElements.iconArea) +
                    WINDOW_SPACING.SPACING1,
                top: this.sirCamilUIElements.iconArea.top,
                height: this.sirCamilUIElements.iconArea.height,
                width:
                    ScreenDimensions.SCREEN_WIDTH -
                    RectAreaService.right(this.sirCamilUIElements.iconArea),
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
            }),
            text: TitleScreenDesign.sirCamil.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }

    private drawNahlaCharacterIntroduction(
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        if (this.nahlaUIElements.icon === undefined) {
            this.createPlaceholderNahlaIconArea()
        }

        if (this.nahlaUIElements.descriptionText === undefined) {
            this.setNahlaDescriptionText()
        }
        TextBoxService.draw(
            this.nahlaUIElements.descriptionText,
            graphicsContext
        )

        if (this.areResourcesLoaded() === false) {
            return
        }

        if (this.nahlaUIElements.icon === undefined) {
            let image: p5.Image = this.resourceHandler.getResource(
                "young nahla cutscene portrait"
            )
            this.setNahlaIconBasedOnImage(image)
            this.setNahlaDescriptionText()
        }
        this.nahlaUIElements.icon.draw({ graphicsContext, resourceHandler })
    }

    private setNahlaIconBasedOnImage(image: p5.Image) {
        ;({
            iconArea: this.nahlaUIElements.iconArea,
            icon: this.nahlaUIElements.icon,
        } = updateIconBasedOnImage({
            iconArea: this.nahlaUIElements.iconArea,
            image,
            desiredWidth: TitleScreenDesign.nahla.iconArea.width,
        }))
    }

    private setNahlaDescriptionText() {
        this.nahlaUIElements.descriptionText = TextBoxService.new({
            area: RectAreaService.new({
                left:
                    RectAreaService.right(this.nahlaUIElements.iconArea) +
                    WINDOW_SPACING.SPACING1,
                top: this.nahlaUIElements.iconArea.top,
                height: this.nahlaUIElements.iconArea.height,
                width:
                    ScreenDimensions.SCREEN_WIDTH -
                    RectAreaService.right(this.nahlaUIElements.iconArea) -
                    WINDOW_SPACING.SPACING2,
            }),
            text: TitleScreenDesign.nahla.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }

    private createPlaceholderNahlaIconArea() {
        this.nahlaUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.nahla.iconArea.startColumn,
            endColumn: TitleScreenDesign.nahla.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: TitleScreenDesign.nahla.iconArea.top,
            height: TitleScreenDesign.nahla.iconArea.top,
        })
    }

    private drawDemonSlitherCharacterIntroduction(
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        if (!isValidValue(this.demonSlitherUIElements.icon)) {
            this.createDemonSlitherPlaceholderIconAreaUnderSirCamil()
        }

        if (this.demonSlitherUIElements.descriptionText === undefined) {
            this.setDemonSlitherDescriptionText()
        }
        TextBoxService.draw(
            this.demonSlitherUIElements.descriptionText,
            graphicsContext
        )

        if (this.areResourcesLoaded() === false) {
            return
        }

        if (!isValidValue(this.demonSlitherUIElements.icon)) {
            let image: p5.Image = this.resourceHandler.getResource(
                TitleScreenDesign.demonSlither.iconImageResourceKey
            )
            this.setDemonSlitherIconBasedOnImage(image)
            this.setDemonSlitherDescriptionText()
        }

        this.demonSlitherUIElements.icon.draw({
            graphicsContext,
            resourceHandler,
        })
    }

    private setDemonSlitherDescriptionText() {
        this.demonSlitherUIElements.descriptionText = TextBoxService.new({
            area: RectAreaService.new({
                left:
                    RectAreaService.right(
                        this.demonSlitherUIElements.iconArea
                    ) + WINDOW_SPACING.SPACING1,
                top: this.demonSlitherUIElements.iconArea.top,
                height: this.demonSlitherUIElements.iconArea.height,
                width:
                    ScreenDimensions.SCREEN_WIDTH -
                    RectAreaService.right(this.demonSlitherUIElements.iconArea),
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
            }),
            text: TitleScreenDesign.demonSlither.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }

    private createDemonSlitherPlaceholderIconAreaUnderSirCamil() {
        this.demonSlitherUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.demonSlither.iconArea.startColumn,
            endColumn: TitleScreenDesign.demonSlither.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top:
                RectAreaService.bottom(this.sirCamilUIElements.iconArea) +
                WINDOW_SPACING.SPACING1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        })
    }

    private setDemonSlitherIconBasedOnImage(image: p5.Image) {
        ;({
            iconArea: this.demonSlitherUIElements.iconArea,
            icon: this.demonSlitherUIElements.icon,
        } = updateIconBasedOnImage({
            iconArea: this.demonSlitherUIElements.iconArea,
            image,
            desiredWidth: TitleScreenDesign.nahla.iconArea.width,
        }))
    }

    private drawDemonLocustCharacterIntroduction(
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        if (!isValidValue(this.demonLocustUIElements.icon)) {
            this.createDemonLocustPlaceholderIconAreaUnderDemonSlither()
        }

        if (this.demonLocustUIElements.descriptionText === undefined) {
            this.setDemonLocustDescriptionText()
        }
        TextBoxService.draw(
            this.demonLocustUIElements.descriptionText,
            graphicsContext
        )

        if (this.areResourcesLoaded() === false) {
            return
        }

        if (!isValidValue(this.demonLocustUIElements.icon)) {
            let image: p5.Image = this.resourceHandler.getResource(
                TitleScreenDesign.demonLocust.iconImageResourceKey
            )
            this.updateDemonLocustIconBasedOnImage(image)
            this.setDemonLocustDescriptionText()
        }

        this.demonLocustUIElements.icon.draw({
            graphicsContext,
            resourceHandler,
        })
    }

    private setDemonLocustDescriptionText() {
        this.demonLocustUIElements.descriptionText = TextBoxService.new({
            area: RectAreaService.new({
                left:
                    RectAreaService.right(this.demonLocustUIElements.iconArea) +
                    WINDOW_SPACING.SPACING1,
                top: this.demonLocustUIElements.iconArea.top,
                height: this.demonLocustUIElements.iconArea.height,
                width:
                    ScreenDimensions.SCREEN_WIDTH -
                    RectAreaService.right(this.demonLocustUIElements.iconArea),
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
            }),
            text: TitleScreenDesign.demonLocust.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }

    private createDemonLocustPlaceholderIconAreaUnderDemonSlither() {
        this.demonLocustUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.demonLocust.iconArea.startColumn,
            endColumn: TitleScreenDesign.demonLocust.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top:
                RectAreaService.bottom(this.demonSlitherUIElements.iconArea) +
                WINDOW_SPACING.SPACING1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        })
    }

    private updateDemonLocustIconBasedOnImage(image: p5.Image) {
        ;({
            iconArea: this.demonLocustUIElements.iconArea,
            icon: this.demonLocustUIElements.icon,
        } = updateIconBasedOnImage({
            iconArea: this.demonLocustUIElements.iconArea,
            image,
            desiredWidth: TitleScreenDesign.demonLocust.iconArea.width,
        }))
    }
}

const updateIconBasedOnImage = ({
    iconArea,
    image,
    desiredWidth,
    overrides,
}: {
    iconArea: RectArea
    image: p5.Image
    desiredWidth: number
    overrides?: {
        top?: number
    }
}) => {
    iconArea = RectAreaService.new({
        left: RectAreaService.left(iconArea),
        top: overrides?.top ?? RectAreaService.top(iconArea),
        height: ImageUIService.scaleImageHeight({
            imageWidth: image.width,
            imageHeight: image.height,
            desiredWidth,
        }),
        width: desiredWidth,
    })

    return {
        iconArea,
        icon: new ImageUI({
            imageLoadingBehavior: {
                resourceKey: undefined,
                loadingBehavior: ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
            },
            graphic: image,
            area: iconArea,
        }),
    }
}
