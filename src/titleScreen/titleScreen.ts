import {TitleScreenState, TitleScreenStateHelper} from "./titleScreenState";
import {GameEngineChanges, GameEngineComponent} from "../gameEngine/gameEngineComponent";
import {MouseButton} from "../utils/mouseConfig";
import {GameEngineState} from "../gameEngine/gameEngine";
import {GameModeEnum} from "../utils/startupConfig";
import {LabelService} from "../ui/label";
import {Button, ButtonStatus} from "../ui/button";
import {HORIZONTAL_ALIGN, VERTICAL_ALIGN, WINDOW_SPACING} from "../ui/constants";
import {RectArea, RectAreaService} from "../ui/rectArea";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {TextBox, TextBoxService} from "../ui/textBox";
import {KeyButtonName, KeyWasPressed} from "../utils/keyboardConfig";
import {Rectangle, RectangleHelper} from "../ui/rectangle";
import {ResourceHandler} from "../resource/resourceHandler";
import {ImageUI, ScaleImageHeight, ScaleImageWidth} from "../ui/imageUI";
import {GraphicsBuffer} from "../utils/graphics/graphicsRenderer";
import {FILE_MESSAGE_DISPLAY_DURATION} from "../battle/hud/battleSquaddieSelectedHUD";
import {LoadSaveStateService} from "../dataLoader/loadSaveState";
import {isValidValue} from "../utils/validityCheck";
import p5 from "p5";

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
        }
    },
    continueGameButton: {
        buttonArea: {
            left: ScreenDimensions.SCREEN_WIDTH * 0.74 - WINDOW_SPACING.SPACING1,
            right: ScreenDimensions.SCREEN_WIDTH - WINDOW_SPACING.SPACING1,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.86,
            bottom: ScreenDimensions.SCREEN_HEIGHT - WINDOW_SPACING.SPACING1,
        }
    },
    demon: {
        iconArea: {
            startColumn: 6,
            width: 100,
        },
        descriptionText: "Destroy these demons. They bite pretty hard!",
        iconImageResourceKey: "combat-demon-slither-neutral",
    },
    torrin: {
        iconArea: {
            startColumn: 5,
            width: 100,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.10,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        },
        descriptionText: "This is Torrin. She can attack at range and heal in melee.",
        iconImageResourceKey: "young torrin cutscene portrait",
    },
    sirCamil: {
        iconArea: {
            startColumn: 5,
            width: 100,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.13 + WINDOW_SPACING.SPACING1 + 100,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        },
        descriptionText: "Her friend, Sir Camil has a melee attack and more armor.",
        iconImageResourceKey: "sir camil cutscene portrait",
    },
}

const resourceKeys: string[] = [
    TitleScreenDesign.logo.iconImageResourceKey,
    TitleScreenDesign.sirCamil.iconImageResourceKey,
    TitleScreenDesign.demon.iconImageResourceKey,
    TitleScreenDesign.torrin.iconImageResourceKey,
]

export class TitleScreen implements GameEngineComponent {
    startLoadingResources: boolean;
    continueGameButton: Button;
    continueGameButtonLabel: string;
    errorDuringLoadingDisplayStartTimestamp: number;
    menuSelection: TitleScreenMenuSelection;
    startNewGameButton: Button;
    private byLine: TextBox;
    private titleText: TextBox;
    private gameDescription: TextBox;
    private background: Rectangle;
    private titleBanner: ImageUI;
    private titleBannerArea: RectArea;
    private startNewGameButtonLabel: string;

    private demonUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }

    private sirCamilUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }

    private torrinUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }

    constructor({
                    resourceHandler
                }: {
        resourceHandler: ResourceHandler
    }) {
        this._resourceHandler = resourceHandler;
        this.resetInternalState();
    }

    private _resourceHandler: ResourceHandler;

    get resourceHandler(): ResourceHandler {
        return this._resourceHandler;
    }

    get newGameSelected(): boolean {
        return this.menuSelection === TitleScreenMenuSelection.NEW_GAME;
    }

    update(state: GameEngineState, graphicsContext: GraphicsBuffer): void {
        if (this.startLoadingResources === false) {
            this.loadResourcesFromHandler();
        }
        this.draw(state, graphicsContext);
    }

    keyPressed(state: GameEngineState, keyCode: number): void {
        if (KeyWasPressed(KeyButtonName.ACCEPT, keyCode)) {
            this.startNewGameButton.onClickHandler(0, 0, this.startNewGameButton, this);
        }
    }

    mouseClicked(state: GameEngineState, mouseButton: MouseButton, mouseX: number, mouseY: number): void {
        this.startNewGameButton.mouseClicked(mouseX, mouseY, this);
        this.continueGameButton.mouseClicked(mouseX, mouseY, this);
    }

    mouseMoved(state: GameEngineState, mouseX: number, mouseY: number): void {
    }

    hasCompleted(state: GameEngineState): boolean {
        return this.menuSelection !== TitleScreenMenuSelection.NONE;
    }

    reset(state: GameEngineState): void {
        this.resetInternalState();
    }

    setup(): TitleScreenState {
        return TitleScreenStateHelper.new();
    }

    recommendStateChanges(state: GameEngineState): GameEngineChanges | undefined {
        return {
            nextMode: GameModeEnum.LOADING_BATTLE,
        }
    }

    markGameToBeLoaded(state: GameEngineState): void {
        LoadSaveStateService.reset(state.fileState.loadSaveState);
        LoadSaveStateService.userRequestsLoad(state.fileState.loadSaveState);
    }

    private draw(state: GameEngineState, graphicsContext: GraphicsBuffer) {
        RectangleHelper.draw(this.lazyLoadBackground(), graphicsContext);
        this.drawTitleBanner(graphicsContext);

        TextBoxService.draw(this.lazyLoadTitle(), graphicsContext);
        TextBoxService.draw(this.lazyLoadByLine(), graphicsContext);
        TextBoxService.draw(this.lazyLoadGameDescription(), graphicsContext);

        this.updateStartGameButton(graphicsContext).draw(graphicsContext);
        this.updateContinueGameButton(state, graphicsContext).draw(graphicsContext);
        this.drawCharacterIntroductions(state, graphicsContext);
    }

    private resetInternalState() {
        this.startLoadingResources = false;

        if (this.titleBanner === undefined) {
            this.titleBannerArea = RectAreaService.new({left: 0, top: 0, width: 0, height: 0});
        }

        if (!isValidValue(this.demonUIElements)) {
            this.demonUIElements = {
                icon: undefined,
                iconArea: RectAreaService.new({left: 0, top: 0, width: 0, height: 0}),
                descriptionText: undefined,
            }
        }
        if (!isValidValue(this.demonUIElements.icon)) {
            this.demonUIElements.iconArea = RectAreaService.new({left: 0, top: 0, width: 0, height: 0});
        }

        if (!isValidValue(this.torrinUIElements)) {
            this.torrinUIElements = {
                icon: undefined,
                iconArea: RectAreaService.new({left: 0, top: 0, width: 0, height: 0}),
                descriptionText: undefined,
            }
        }
        if (!isValidValue(this.torrinUIElements.icon)) {
            this.torrinUIElements.iconArea = RectAreaService.new({left: 0, top: 0, width: 0, height: 0});
        }

        if (!isValidValue(this.sirCamilUIElements)) {
            this.sirCamilUIElements = {
                icon: undefined,
                iconArea: RectAreaService.new({left: 0, top: 0, width: 0, height: 0}),
                descriptionText: undefined,
            }
        }
        if (!isValidValue(this.sirCamilUIElements.icon)) {
            this.sirCamilUIElements.iconArea = RectAreaService.new({left: 0, top: 0, width: 0, height: 0});
        }

        this.titleBanner = undefined;
        this.startNewGameButton = undefined;
        this.continueGameButton = undefined;
        this.byLine = undefined;
        this.titleText = undefined;
        this.menuSelection = TitleScreenMenuSelection.NONE;
        this.errorDuringLoadingDisplayStartTimestamp = undefined;
    }

    private drawTitleBanner(graphicsContext: GraphicsBuffer) {
        if (this.titleBanner === undefined) {
            this.titleBannerArea =
                RectAreaService.new({
                    left: WINDOW_SPACING.SPACING1,
                    top: WINDOW_SPACING.SPACING1,
                    width: ScreenDimensions.SCREEN_WIDTH * 0.25,
                    height: ScreenDimensions.SCREEN_HEIGHT * 0.25,
                })

            if (this.areResourcesLoaded() === false) {
                return;
            }

            let image: p5.Image = this.resourceHandler.getResource(TitleScreenDesign.logo.iconImageResourceKey);

            this.titleBannerArea = RectAreaService.new({
                left: WINDOW_SPACING.SPACING1,
                top: WINDOW_SPACING.SPACING1,
                height: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.logo.screenHeight,
                width: ScaleImageWidth({
                    imageWidth: image.width,
                    imageHeight: image.height,
                    desiredHeight: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.logo.screenHeight,
                }),
            })

            this.titleBanner = new ImageUI({
                graphic: image,
                area: this.titleBannerArea,
            })
        }

        this.titleBanner.draw(graphicsContext);
    }

    private lazyLoadTitle() {
        if (this.titleText === undefined) {
            this.titleText = TextBoxService.new({
                area: RectAreaService.new({
                    startColumn: TitleScreenDesign.title.startColumn,
                    endColumn: TitleScreenDesign.title.endColumn,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.title.screenHeight,
                    height: WINDOW_SPACING.SPACING4,
                }),
                text: "Torrin's Trial",
                textSize: WINDOW_SPACING.SPACING2,
                fontColor: colors.backgroundText,
            })
        }
        return this.titleText;
    }

    private lazyLoadGameDescription() {
        if (this.gameDescription === undefined) {
            this.gameDescription = TextBoxService.new({
                area: RectAreaService.new({
                    startColumn: TitleScreenDesign.gameDescription.startColumn,
                    endColumn: TitleScreenDesign.gameDescription.endColumn,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.gameDescription.screenHeightTop,
                    bottom: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.gameDescription.screenHeightBottom,
                    margin: WINDOW_SPACING.SPACING1,
                }),
                text: TitleScreenDesign.gameDescription.text,
                textSize: WINDOW_SPACING.SPACING4,
                fontColor: colors.descriptionText,
            });
        }

        return this.gameDescription;
    }

    private lazyLoadByLine() {
        if (!isValidValue(this.byLine)) {
            this.byLine = TextBoxService.new({
                area: RectAreaService.new({
                    startColumn: TitleScreenDesign.byLine.startColumn,
                    endColumn: TitleScreenDesign.byLine.endColumn,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.byLine.screenHeight,
                    bottom: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.byLine.screenHeight + WINDOW_SPACING.SPACING4,
                }),
                text: "by Chad Serrant",
                textSize: WINDOW_SPACING.SPACING2,
                fontColor: colors.backgroundText,
            })
        }
        return this.byLine;
    }

    private updateStartGameButton(graphicsContext: GraphicsBuffer) {
        const windowIsTooSmall: boolean = graphicsContext.width < ScreenDimensions.SCREEN_WIDTH
            || graphicsContext.height < ScreenDimensions.SCREEN_HEIGHT;

        const buttonWidth = graphicsContext.width > ScreenDimensions.SCREEN_WIDTH
            ? ScreenDimensions.SCREEN_WIDTH
            : graphicsContext.width;

        this.startNewGameButtonLabel = "";
        const playButtonHasBeenClicked: boolean = this.startNewGameButton && this.startNewGameButton.getStatus() === ButtonStatus.ACTIVE;
        let changePlayButtonLabel: boolean = false;
        let buttonTextSize = WINDOW_SPACING.SPACING4;
        if (windowIsTooSmall) {
            buttonTextSize = buttonWidth / 35;
            this.startNewGameButtonLabel = `Set browser window size to ${ScreenDimensions.SCREEN_WIDTH}x${ScreenDimensions.SCREEN_HEIGHT}\n currently ${graphicsContext.width}x${graphicsContext.height}`;

            const buttonTextMinimumSize = 18;
            if (buttonTextSize < buttonTextMinimumSize) {
                buttonTextSize = buttonTextMinimumSize;
                this.startNewGameButtonLabel = TitleScreenDesign.startGameButton.smallWindowWarning;
            }
            changePlayButtonLabel = true;
        } else if (
            !windowIsTooSmall
            && !playButtonHasBeenClicked
            && this.startNewGameButtonLabel !== TitleScreenDesign.startGameButton.playGameMessage
        ) {
            this.startNewGameButtonLabel = TitleScreenDesign.startGameButton.playGameMessage;
            changePlayButtonLabel = true;
        } else if (this.startNewGameButton === undefined) {
            this.startNewGameButtonLabel = TitleScreenDesign.startGameButton.playGameMessage;
            changePlayButtonLabel = true;
        }

        const playButtonHorizontalAlignment = windowIsTooSmall
            ? HORIZONTAL_ALIGN.LEFT
            : HORIZONTAL_ALIGN.CENTER;

        if (this.startNewGameButton === undefined || changePlayButtonLabel) {
            this.startNewGameButton = new Button({
                activeLabel: LabelService.new({
                    text: "Now loading...",
                    fillColor: colors.playButtonActive,
                    area: RectAreaService.new(TitleScreenDesign.startGameButton.buttonArea),
                    textSize: buttonTextSize,
                    fontColor: colors.playButtonText,
                    textBoxMargin: WINDOW_SPACING.SPACING1,
                    horizAlign: HORIZONTAL_ALIGN.CENTER,
                    vertAlign: VERTICAL_ALIGN.CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                readyLabel: LabelService.new({
                    text: this.startNewGameButtonLabel,
                    fillColor: colors.playButton,
                    area: RectAreaService.new(TitleScreenDesign.startGameButton.buttonArea),
                    textSize: buttonTextSize,
                    fontColor: colors.playButtonText,
                    textBoxMargin: WINDOW_SPACING.SPACING1,
                    horizAlign: playButtonHorizontalAlignment,
                    vertAlign: VERTICAL_ALIGN.CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                initialStatus: ButtonStatus.READY,
                onClickHandler(mouseX: number, mouseY: number, button: Button, caller: TitleScreen): {} {
                    if (caller.menuSelection === TitleScreenMenuSelection.NONE) {
                        caller.menuSelection = TitleScreenMenuSelection.NEW_GAME;
                        button.setStatus(ButtonStatus.ACTIVE);
                    }
                    return;
                }
            })
        }

        return this.startNewGameButton;
    }

    private updateContinueGameButton(state: GameEngineState, graphicsContext: GraphicsBuffer) {
        const newButtonLabel = this.getNewButtonLabel(state);

        let changePlayButtonLabel: boolean = (newButtonLabel !== this.continueGameButtonLabel);
        if (changePlayButtonLabel) {
            this.continueGameButtonLabel = newButtonLabel;
        }
        let buttonTextSize = WINDOW_SPACING.SPACING2;

        const playButtonHorizontalAlignment = HORIZONTAL_ALIGN.CENTER;

        if (this.continueGameButton === undefined || changePlayButtonLabel) {
            this.continueGameButton = new Button({
                activeLabel: LabelService.new({
                    text: "Now loading...",
                    fillColor: colors.playButtonActive,
                    area: RectAreaService.new(TitleScreenDesign.continueGameButton.buttonArea),
                    textSize: buttonTextSize,
                    fontColor: colors.playButtonText,
                    textBoxMargin: WINDOW_SPACING.SPACING1,
                    horizAlign: HORIZONTAL_ALIGN.CENTER,
                    vertAlign: VERTICAL_ALIGN.CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                readyLabel: LabelService.new({
                    text: this.continueGameButtonLabel,
                    fillColor: colors.playButton,
                    area: RectAreaService.new(TitleScreenDesign.continueGameButton.buttonArea),
                    textSize: buttonTextSize,
                    fontColor: colors.playButtonText,
                    textBoxMargin: WINDOW_SPACING.SPACING1,
                    horizAlign: playButtonHorizontalAlignment,
                    vertAlign: VERTICAL_ALIGN.CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                initialStatus: ButtonStatus.READY,
                onClickHandler(mouseX: number, mouseY: number, button: Button, caller: TitleScreen): {} {
                    if (caller.menuSelection === TitleScreenMenuSelection.NONE) {
                        caller.menuSelection = TitleScreenMenuSelection.CONTINUE_GAME;
                        caller.markGameToBeLoaded(state);
                        button.setStatus(ButtonStatus.ACTIVE);
                    }
                    return;
                }
            })
        }

        return this.continueGameButton;
    }

    private getNewButtonLabel(state: GameEngineState): string {
        const defaultMessage: string = "Load file and continue";

        const userRequestedLoad: boolean = state.fileState.loadSaveState.userRequestedLoad === true;

        const loadingFailedDueToError: boolean = state.fileState.loadSaveState.applicationErroredWhileLoading
        const userCanceledLoad: boolean = state.fileState.loadSaveState.userCanceledLoad;
        const loadingFailed: boolean = loadingFailedDueToError || userCanceledLoad;

        if (
            !(userRequestedLoad || loadingFailed)
        ) {
            return defaultMessage;
        }

        const loadingMessage: string = "Now loading...";
        if (
            userRequestedLoad
            && !loadingFailed
        ) {
            return loadingMessage;
        }

        const errorMessageTimeoutIsReached: boolean = this.errorDuringLoadingDisplayStartTimestamp !== undefined
            && Date.now() - this.errorDuringLoadingDisplayStartTimestamp >= FILE_MESSAGE_DISPLAY_DURATION;

        const applicationErrorMessage: string = 'Loading failed. Check logs.';
        const currentlyShowingApplicationErrorMessage: boolean = isValidValue(this.continueGameButton)
            && this.continueGameButton.readyLabel.textBox.text === applicationErrorMessage;

        if (loadingFailedDueToError) {
            if (!currentlyShowingApplicationErrorMessage) {
                if (this.continueGameButton) {
                    this.continueGameButton.buttonStatus = ButtonStatus.READY;
                }
                this.errorDuringLoadingDisplayStartTimestamp = Date.now();
                return applicationErrorMessage;
            }

            if (!errorMessageTimeoutIsReached) {
                return applicationErrorMessage;
            }

            LoadSaveStateService.reset(state.fileState.loadSaveState);
            this.errorDuringLoadingDisplayStartTimestamp = undefined;
            return defaultMessage;
        }

        const userCancelMessage: string = `Canceled loading.`;
        const currentlyShowingUserCancelMessage: boolean = isValidValue(this.continueGameButton)
            && this.continueGameButton.readyLabel.textBox.text === userCancelMessage;
        if (!currentlyShowingUserCancelMessage) {
            if (this.continueGameButton) {
                this.continueGameButton.buttonStatus = ButtonStatus.READY;
            }
            this.errorDuringLoadingDisplayStartTimestamp = Date.now();
            return userCancelMessage;
        }

        if (!errorMessageTimeoutIsReached) {
            return userCancelMessage;
        }

        LoadSaveStateService.reset(state.fileState.loadSaveState);
        this.errorDuringLoadingDisplayStartTimestamp = undefined;
        return defaultMessage;
    }

    private lazyLoadBackground() {
        if (this.background === undefined) {
            this.background = RectangleHelper.new({
                area: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: ScreenDimensions.SCREEN_WIDTH,
                    height: ScreenDimensions.SCREEN_HEIGHT
                }),
                fillColor: colors.background,
            });
        }
        return this.background;
    }

    private loadResourcesFromHandler() {
        this.startLoadingResources = true;
        resourceKeys.forEach(key => {
            if (!this.resourceHandler.isResourceLoaded(key)) {
                this.resourceHandler.loadResource(key);
            }
        });
    }

    private areResourcesLoaded(): boolean {
        return this.resourceHandler.areAllResourcesLoaded(resourceKeys);
    }

    private drawCharacterIntroductions(state: GameEngineState, graphicsContext: GraphicsBuffer) {
        this.drawTorrinCharacterIntroduction(graphicsContext);
        this.drawSirCamilCharacterIntroduction(graphicsContext);
        this.drawDemonCharacterIntroduction(graphicsContext);
    }

    private drawSirCamilCharacterIntroduction(graphicsContext: GraphicsBuffer) {
        if (this.sirCamilUIElements.icon === undefined) {
            this.createSirCamilPlaceholderIconAreaUnderTorrin();
        }

        if (this.sirCamilUIElements.descriptionText === undefined) {
            this.setSirCamilDescriptionText();
        }

        TextBoxService.draw(this.sirCamilUIElements.descriptionText, graphicsContext);

        if (this.areResourcesLoaded() === false) {
            return;
        }

        if (this.sirCamilUIElements.icon === undefined) {
            let image: p5.Image = this.resourceHandler.getResource("sir camil cutscene portrait");
            this.setSirCamilIconBasedOnImageAndTorrinImage(image);
            this.setSirCamilDescriptionText();
        }
        this.sirCamilUIElements.icon.draw(graphicsContext);
    }

    private setSirCamilIconBasedOnImageAndTorrinImage(image: p5.Image) {
        this.sirCamilUIElements.iconArea = RectAreaService.new({
            left: RectAreaService.left(this.sirCamilUIElements.iconArea),
            top: RectAreaService.bottom(this.torrinUIElements.iconArea) + WINDOW_SPACING.SPACING1,
            height: ScaleImageHeight({
                imageWidth: image.width,
                imageHeight: image.height,
                desiredWidth: 100,
            }),
            width: 100,
        });

        this.sirCamilUIElements.icon = new ImageUI({
            graphic: image,
            area: this.sirCamilUIElements.iconArea,
        });
    }

    private createSirCamilPlaceholderIconAreaUnderTorrin() {
        this.sirCamilUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.sirCamil.iconArea.startColumn,
            endColumn: TitleScreenDesign.sirCamil.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: TitleScreenDesign.sirCamil.iconArea.top,
            height: TitleScreenDesign.sirCamil.iconArea.height,
        });
    }

    private setSirCamilDescriptionText() {
        this.sirCamilUIElements.descriptionText = TextBoxService.new({
            area: RectAreaService.new({
                left: RectAreaService.right(this.sirCamilUIElements.iconArea) + WINDOW_SPACING.SPACING1,
                top: this.sirCamilUIElements.iconArea.top,
                height: this.sirCamilUIElements.iconArea.height,
                width: ScreenDimensions.SCREEN_WIDTH - RectAreaService.right(this.sirCamilUIElements.iconArea),
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
            }),
            text: TitleScreenDesign.sirCamil.descriptionText,
            textSize: WINDOW_SPACING.SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        });
    }

    private drawTorrinCharacterIntroduction(graphicsContext: GraphicsBuffer) {
        if (this.torrinUIElements.icon === undefined) {
            this.createPlaceholderTorrinIconArea();
        }

        if (this.torrinUIElements.descriptionText === undefined) {
            this.setTorrinDescriptionText();
        }
        TextBoxService.draw(this.torrinUIElements.descriptionText, graphicsContext);

        if (this.areResourcesLoaded() === false) {
            return;
        }

        if (this.torrinUIElements.icon === undefined) {
            let image: p5.Image = this.resourceHandler.getResource("young torrin cutscene portrait");
            this.setTorrinIconBasedOnImage(image);
            this.setTorrinDescriptionText();
        }
        this.torrinUIElements.icon.draw(graphicsContext);
    }

    private setTorrinIconBasedOnImage(image: p5.Image) {
        this.torrinUIElements.iconArea = RectAreaService.new({
            left: this.torrinUIElements.iconArea.left,
            top: this.torrinUIElements.iconArea.top,
            height: ScaleImageHeight({
                imageWidth: image.width,
                imageHeight: image.height,
                desiredWidth: TitleScreenDesign.torrin.iconArea.width,
            }),
            width: TitleScreenDesign.torrin.iconArea.width,
        });

        this.torrinUIElements.icon = new ImageUI({
            graphic: image,
            area: this.torrinUIElements.iconArea,
        })
    }

    private setTorrinDescriptionText() {
        this.torrinUIElements.descriptionText = TextBoxService.new({
            area: RectAreaService.new({
                left: RectAreaService.right(this.torrinUIElements.iconArea) + WINDOW_SPACING.SPACING1,
                top: this.torrinUIElements.iconArea.top,
                height: this.torrinUIElements.iconArea.height,
                width: ScreenDimensions.SCREEN_WIDTH - RectAreaService.right(this.torrinUIElements.iconArea) - WINDOW_SPACING.SPACING2,
            }),
            text: TitleScreenDesign.torrin.descriptionText,
            textSize: WINDOW_SPACING.SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }

    private createPlaceholderTorrinIconArea() {
        this.torrinUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.torrin.iconArea.startColumn,
            endColumn: TitleScreenDesign.torrin.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: TitleScreenDesign.torrin.iconArea.top,
            height: TitleScreenDesign.torrin.iconArea.top,
        });
    }

    private drawDemonCharacterIntroduction(graphicsContext: GraphicsBuffer) {
        if (!isValidValue(this.demonUIElements.icon)) {
            this.createDemonPlaceholderIconAreaUnderSirCamil();
        }

        if (this.demonUIElements.descriptionText === undefined) {
            this.setDemonDescriptionText();
        }
        TextBoxService.draw(this.demonUIElements.descriptionText, graphicsContext);

        if (this.areResourcesLoaded() === false) {
            return;
        }

        if (!isValidValue(this.demonUIElements.icon)) {
            let image: p5.Image = this.resourceHandler.getResource(TitleScreenDesign.demon.iconImageResourceKey);
            this.setDemonIconBasedOnImage(image);
            this.setDemonDescriptionText();
        }

        this.demonUIElements.icon.draw(graphicsContext);
    }

    private setDemonDescriptionText() {
        this.demonUIElements.descriptionText = TextBoxService.new({
            area: RectAreaService.new({
                left: RectAreaService.right(this.demonUIElements.iconArea) + WINDOW_SPACING.SPACING1,
                top: this.demonUIElements.iconArea.top,
                height: this.demonUIElements.iconArea.height,
                width: ScreenDimensions.SCREEN_WIDTH - RectAreaService.right(this.demonUIElements.iconArea),
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
            }),
            text: TitleScreenDesign.demon.descriptionText,
            textSize: WINDOW_SPACING.SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        });
    }

    private createDemonPlaceholderIconAreaUnderSirCamil() {
        this.demonUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.demon.iconArea.startColumn,
            endColumn: TitleScreenDesign.demon.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: RectAreaService.bottom(this.sirCamilUIElements.iconArea) + WINDOW_SPACING.SPACING4,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        });
    }

    private setDemonIconBasedOnImage(image: p5.Image) {
        this.demonUIElements.iconArea = RectAreaService.new({
            left: this.demonUIElements.iconArea.left,
            top: this.demonUIElements.iconArea.top,
            height: ScaleImageHeight({
                imageWidth: image.width,
                imageHeight: image.height,
                desiredWidth: TitleScreenDesign.demon.iconArea.width,
            }),
            width: TitleScreenDesign.demon.iconArea.width,
        });

        this.demonUIElements.icon = new ImageUI({
            graphic: image,
            area: this.demonUIElements.iconArea,
        })
    }
}
