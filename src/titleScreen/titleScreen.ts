import {TitleScreenState, TitleScreenStateHelper} from "./titleScreenState";
import {GameEngineChanges, GameEngineComponent} from "../gameEngine/gameEngineComponent";
import {MouseButton} from "../utils/mouseConfig";
import {GameEngineState} from "../gameEngine/gameEngine";
import {GameModeEnum} from "../utils/startupConfig";
import {LabelService} from "../ui/label";
import {Button, ButtonStatus} from "../ui/button";
import {
    HORIZ_ALIGN_CENTER,
    HORIZ_ALIGN_LEFT,
    VERT_ALIGN_CENTER,
    WINDOW_SPACING1,
    WINDOW_SPACING2,
    WINDOW_SPACING4
} from "../ui/constants";
import {RectArea, RectAreaService} from "../ui/rectArea";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {TextBox, TextBoxHelper} from "../ui/textBox";
import {KeyButtonName, KeyWasPressed} from "../utils/keyboardConfig";
import {Rectangle, RectangleHelper} from "../ui/rectangle";
import {ResourceHandler} from "../resource/resourceHandler";
import {ImageUI, ScaleImageHeight} from "../ui/imageUI";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {FILE_MESSAGE_DISPLAY_DURATION} from "../battle/hud/battleSquaddieSelectedHUD";
import {LoadSaveStateService} from "../dataLoader/loadSaveState";
import {isValidValue} from "../utils/validityCheck";

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
        screenWidth: 0.3,
    },
    title: {
        screenHeight: 0.55,
    },
    gameDescription: {
        screenHeightTop: 0.56,
        screenHeightBottom: 0.8,
        startColumn: 0,
        endColumn: 6,
    },
    byLine: {
        screenHeight: 0.64,
    },
    startGameButton: {
        smallWindowWarning: "Window is too small",
        playGameMessage: "Click here to Play Demo",
        screenHeightTop: 0.8,
    },
    demon: {
        iconArea: {
            startColumn: 5,
            width: 100,
        },
        descriptionText: "Destroy these demons. They bite pretty hard!",
        iconImageResourceKey: "combat-demon-slither-neutral",
    },
    torrin: {
        iconArea: {
            startColumn: 5,
            width: 100,
        },
        descriptionText: "Torrin can attack at range and heal in melee.",
        iconImageResourceKey: "young torrin cutscene portrait",
    },
    sirCamil: {
        iconArea: {
            startColumn: 6,
            width: 100,
        },
        descriptionText: "Sir Camil has a melee attack and more armor.",
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
    private byLine: TextBox;
    private titleText: TextBox;
    private gameDescription: TextBox;
    private background: Rectangle;
    private titleBanner: ImageUI;
    private titleBannerArea: RectArea;
    private startNewGameButton: Button;
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

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
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

    private draw(state: GameEngineState, graphicsContext: GraphicsContext) {
        RectangleHelper.draw(this.lazyLoadBackground(), graphicsContext);
        this.drawTitleBanner(graphicsContext);

        TextBoxHelper.draw(this.lazyLoadTitle(), graphicsContext);
        TextBoxHelper.draw(this.lazyLoadByLine(), graphicsContext);
        TextBoxHelper.draw(this.lazyLoadGameDescription(), graphicsContext);

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

    private drawTitleBanner(graphicsContext: GraphicsContext) {
        if (this.titleBanner === undefined) {
            this.titleBannerArea =
                RectAreaService.new({
                    left: WINDOW_SPACING1,
                    top: WINDOW_SPACING1,
                    width: ScreenDimensions.SCREEN_WIDTH * 0.25,
                    height: ScreenDimensions.SCREEN_HEIGHT * 0.25,
                })

            if (this.areResourcesLoaded() === false) {
                return;
            }

            let image: GraphicImage = this.resourceHandler.getResource(TitleScreenDesign.logo.iconImageResourceKey);

            this.titleBannerArea = RectAreaService.new({
                left: WINDOW_SPACING1,
                top: WINDOW_SPACING1,
                width: ScreenDimensions.SCREEN_WIDTH * TitleScreenDesign.logo.screenWidth,
                height: ScaleImageHeight({
                    imageWidth: image.width,
                    imageHeight: image.height,
                    desiredWidth: ScreenDimensions.SCREEN_WIDTH * TitleScreenDesign.logo.screenWidth,
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
            this.titleText = TextBoxHelper.new({
                area: RectAreaService.new({
                    startColumn: 0,
                    endColumn: 3,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.title.screenHeight,
                    height: WINDOW_SPACING4,
                }),
                text: "Torrin's Trial",
                textSize: WINDOW_SPACING2,
                fontColor: colors.backgroundText,
                horizAlign: HORIZ_ALIGN_CENTER,
            })
        }
        return this.titleText;
    }

    private lazyLoadGameDescription() {
        if (this.gameDescription === undefined) {
            this.gameDescription = TextBoxHelper.new({
                area: RectAreaService.new({
                    startColumn: TitleScreenDesign.gameDescription.startColumn,
                    endColumn: TitleScreenDesign.gameDescription.endColumn,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.gameDescription.screenHeightTop,
                    bottom: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.gameDescription.screenHeightBottom,
                    margin: [WINDOW_SPACING4, WINDOW_SPACING1, WINDOW_SPACING1, WINDOW_SPACING1],
                }),
                text: "Desert Fantasy Squad Tactics",
                textSize: WINDOW_SPACING4,
                fontColor: colors.descriptionText,
            });
        }

        return this.gameDescription;
    }

    private lazyLoadByLine() {
        if (!isValidValue(this.byLine)) {
            this.byLine = TextBoxHelper.new({
                area: RectAreaService.new({
                    startColumn: 0,
                    endColumn: 5,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.byLine.screenHeight,
                    bottom: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.byLine.screenHeight + WINDOW_SPACING4,
                    margin: WINDOW_SPACING1,
                }),
                text: "by Chad Serrant",
                textSize: WINDOW_SPACING2,
                fontColor: colors.backgroundText,
            })
        }
        return this.byLine;
    }

    private updateStartGameButton(graphicsContext: GraphicsContext) {
        const windowIsTooSmall: boolean = graphicsContext.windowWidth() < ScreenDimensions.SCREEN_WIDTH
            || graphicsContext.windowHeight() < ScreenDimensions.SCREEN_HEIGHT;

        const buttonWidth = graphicsContext.windowWidth() > ScreenDimensions.SCREEN_WIDTH
            ? ScreenDimensions.SCREEN_WIDTH
            : graphicsContext.windowWidth();

        this.startNewGameButtonLabel = "";
        const playButtonHasBeenClicked: boolean = this.startNewGameButton && this.startNewGameButton.getStatus() === ButtonStatus.ACTIVE;
        let changePlayButtonLabel: boolean = false;
        let buttonTextSize = WINDOW_SPACING4;
        if (windowIsTooSmall) {
            buttonTextSize = buttonWidth / 35;
            this.startNewGameButtonLabel = `Set browser window size to ${ScreenDimensions.SCREEN_WIDTH}x${ScreenDimensions.SCREEN_HEIGHT}\n currently ${graphicsContext.windowWidth()}x${graphicsContext.windowHeight()}`;

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
            ? HORIZ_ALIGN_LEFT
            : HORIZ_ALIGN_CENTER;

        const buttonArea = RectAreaService.new({
            left: 0,
            width: ScreenDimensions.SCREEN_WIDTH,
            top: ScreenDimensions.SCREEN_HEIGHT * TitleScreenDesign.startGameButton.screenHeightTop,
            bottom: ScreenDimensions.SCREEN_HEIGHT,
        })

        if (this.startNewGameButton === undefined || changePlayButtonLabel) {
            this.startNewGameButton = new Button({
                activeLabel: LabelService.new({
                    text: "Now loading...",
                    fillColor: colors.playButtonActive,
                    area: buttonArea,
                    textSize: buttonTextSize,
                    fontColor: colors.playButtonText,
                    padding: WINDOW_SPACING1,
                    horizAlign: HORIZ_ALIGN_CENTER,
                    vertAlign: VERT_ALIGN_CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                readyLabel: LabelService.new({
                    text: this.startNewGameButtonLabel,
                    fillColor: colors.playButton,
                    area: buttonArea,
                    textSize: buttonTextSize,
                    fontColor: colors.playButtonText,
                    padding: WINDOW_SPACING1,
                    horizAlign: playButtonHorizontalAlignment,
                    vertAlign: VERT_ALIGN_CENTER,
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

    private updateContinueGameButton(state: GameEngineState, graphicsContext: GraphicsContext) {
        const newButtonLabel = this.getNewButtonLabel(state);

        let changePlayButtonLabel: boolean = (newButtonLabel !== this.continueGameButtonLabel);
        if (changePlayButtonLabel) {
            this.continueGameButtonLabel = newButtonLabel;
        }
        let buttonTextSize = WINDOW_SPACING2;

        const playButtonHorizontalAlignment = HORIZ_ALIGN_CENTER;

        const buttonArea = RectAreaService.new({
            left: ScreenDimensions.SCREEN_WIDTH * 3 / 4,
            width: ScreenDimensions.SCREEN_WIDTH / 4,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.7,
            bottom: ScreenDimensions.SCREEN_HEIGHT * 0.8,
        })

        if (this.continueGameButton === undefined || changePlayButtonLabel) {
            this.continueGameButton = new Button({
                activeLabel: LabelService.new({
                    text: "Now loading...",
                    fillColor: colors.playButtonActive,
                    area: buttonArea,
                    textSize: buttonTextSize,
                    fontColor: colors.playButtonText,
                    padding: WINDOW_SPACING1,
                    horizAlign: HORIZ_ALIGN_CENTER,
                    vertAlign: VERT_ALIGN_CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                readyLabel: LabelService.new({
                    text: this.continueGameButtonLabel,
                    fillColor: colors.playButton,
                    area: buttonArea,
                    textSize: buttonTextSize,
                    fontColor: colors.playButtonText,
                    padding: WINDOW_SPACING1,
                    horizAlign: playButtonHorizontalAlignment,
                    vertAlign: VERT_ALIGN_CENTER,
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
        const defaultMessage: string = "Continue";

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

    private drawCharacterIntroductions(state: GameEngineState, graphicsContext: GraphicsContext) {
        this.drawTorrinCharacterIntroduction(graphicsContext);
        this.drawSirCamilCharacterIntroduction(graphicsContext);
        this.drawDemonCharacterIntroduction(graphicsContext);
    }

    private drawSirCamilCharacterIntroduction(graphicsContext: GraphicsContext) {
        if (this.sirCamilUIElements.icon === undefined) {
            this.createSirCamilPlaceholderIconAreaUnderTorrin();
        }

        if (this.sirCamilUIElements.descriptionText === undefined) {
            this.setSirCamilDescriptionText();
        }

        TextBoxHelper.draw(this.sirCamilUIElements.descriptionText, graphicsContext);

        if (this.areResourcesLoaded() === false) {
            return;
        }

        if (this.sirCamilUIElements.icon === undefined) {
            let image: GraphicImage = this.resourceHandler.getResource("sir camil cutscene portrait");
            this.setSirCamilIconBasedOnImageAndTorrinImage(image);
            this.setSirCamilDescriptionText();
        }
        this.sirCamilUIElements.icon.draw(graphicsContext);
    }

    private setSirCamilIconBasedOnImageAndTorrinImage(image: GraphicImage) {
        this.sirCamilUIElements.iconArea = RectAreaService.new({
            left: RectAreaService.right(this.sirCamilUIElements.iconArea) - 110,
            top: RectAreaService.bottom(this.torrinUIElements.iconArea) + WINDOW_SPACING1,
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
            top: RectAreaService.bottom(this.torrinUIElements.iconArea) + WINDOW_SPACING1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        });
    }

    private setSirCamilDescriptionText() {
        this.sirCamilUIElements.descriptionText = TextBoxHelper.new({
            area: RectAreaService.new({
                left: RectAreaService.right(this.sirCamilUIElements.iconArea) + WINDOW_SPACING1,
                top: this.sirCamilUIElements.iconArea.top,
                height: this.sirCamilUIElements.iconArea.height,
                width: ScreenDimensions.SCREEN_WIDTH - RectAreaService.right(this.sirCamilUIElements.iconArea),
                margin: [0, 0, 0, WINDOW_SPACING1],
            }),
            text: TitleScreenDesign.sirCamil.descriptionText,
            textSize: WINDOW_SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERT_ALIGN_CENTER,
        });
    }

    private drawTorrinCharacterIntroduction(graphicsContext: GraphicsContext) {
        if (this.torrinUIElements.icon === undefined) {
            this.createPlaceholderTorrinIconArea();
        }

        if (this.torrinUIElements.descriptionText === undefined) {
            this.setTorrinDescriptionText();
        }
        TextBoxHelper.draw(this.torrinUIElements.descriptionText, graphicsContext);

        if (this.areResourcesLoaded() === false) {
            return;
        }

        if (this.torrinUIElements.icon === undefined) {
            let image: GraphicImage = this.resourceHandler.getResource("young torrin cutscene portrait");
            this.setTorrinIconBasedOnImage(image);
            this.setTorrinDescriptionText();
        }
        this.torrinUIElements.icon.draw(graphicsContext);
    }

    private setTorrinIconBasedOnImage(image: GraphicImage) {
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
        this.torrinUIElements.descriptionText = TextBoxHelper.new({
            area: RectAreaService.new({
                left: RectAreaService.right(this.torrinUIElements.iconArea) + WINDOW_SPACING1,
                top: this.torrinUIElements.iconArea.top,
                height: this.torrinUIElements.iconArea.height,
                width: ScreenDimensions.SCREEN_WIDTH - RectAreaService.right(this.torrinUIElements.iconArea) - WINDOW_SPACING2,
            }),
            text: TitleScreenDesign.torrin.descriptionText,
            textSize: WINDOW_SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERT_ALIGN_CENTER,
        })
    }

    private createPlaceholderTorrinIconArea() {
        this.torrinUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.torrin.iconArea.startColumn,
            endColumn: TitleScreenDesign.torrin.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        });
    }

    private drawDemonCharacterIntroduction(graphicsContext: GraphicsContext) {
        if (!isValidValue(this.demonUIElements.icon)) {
            this.createDemonPlaceholderIconAreaUnderSirCamil();
        }

        if (this.demonUIElements.descriptionText === undefined) {
            this.setDemonDescriptionText();
        }
        TextBoxHelper.draw(this.demonUIElements.descriptionText, graphicsContext);

        if (this.areResourcesLoaded() === false) {
            return;
        }

        if (!isValidValue(this.demonUIElements.icon)) {
            let image: GraphicImage = this.resourceHandler.getResource(TitleScreenDesign.demon.iconImageResourceKey);
            this.setDemonIconBasedOnImage(image);
            this.setDemonDescriptionText();
        }

        this.demonUIElements.icon.draw(graphicsContext);
    }

    private setDemonDescriptionText() {
        this.demonUIElements.descriptionText = TextBoxHelper.new({
            area: RectAreaService.new({
                left: RectAreaService.right(this.demonUIElements.iconArea) + WINDOW_SPACING1,
                top: this.demonUIElements.iconArea.top,
                height: this.demonUIElements.iconArea.height,
                width: ScreenDimensions.SCREEN_WIDTH - RectAreaService.right(this.demonUIElements.iconArea),
                margin: [0, 0, 0, WINDOW_SPACING1],
            }),
            text: TitleScreenDesign.demon.descriptionText,
            textSize: WINDOW_SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERT_ALIGN_CENTER,
        });
    }

    private createDemonPlaceholderIconAreaUnderSirCamil() {
        this.demonUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.demon.iconArea.startColumn,
            endColumn: TitleScreenDesign.demon.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: RectAreaService.bottom(this.sirCamilUIElements.iconArea) + WINDOW_SPACING1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        });
    }

    private setDemonIconBasedOnImage(image: GraphicImage) {
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
