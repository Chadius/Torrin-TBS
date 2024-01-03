import {TitleScreenState, TitleScreenStateHelper} from "./titleScreenState";
import {GameEngineChanges, GameEngineComponent} from "../gameEngine/gameEngineComponent";
import {MouseButton} from "../utils/mouseConfig";
import {GameEngineState} from "../gameEngine/gameEngine";
import {GameModeEnum} from "../utils/startupConfig";
import {LabelHelper} from "../ui/label";
import {Button, ButtonStatus} from "../ui/button";
import {
    HORIZ_ALIGN_CENTER,
    HORIZ_ALIGN_LEFT,
    VERT_ALIGN_CENTER,
    WINDOW_SPACING1,
    WINDOW_SPACING2,
    WINDOW_SPACING4
} from "../ui/constants";
import {RectArea, RectAreaHelper} from "../ui/rectArea";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {TextBox, TextBoxHelper} from "../ui/textBox";
import {KeyButtonName, KeyWasPressed} from "../utils/keyboardConfig";
import {Rectangle, RectangleHelper} from "../ui/rectangle";
import {ResourceHandler} from "../resource/resourceHandler";
import {ImageUI, ScaleImageHeight, ScaleImageWidth} from "../ui/imageUI";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {FILE_MESSAGE_DISPLAY_DURATION} from "../battle/hud/battleSquaddieSelectedHUD";

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

const resourceKeys: string[] = [
    "torrins trial logo",
    "young torrin cutscene portrait",
    "sir camil cutscene portrait",
];

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
    private torrinIcon: ImageUI;
    private torrinIconArea: RectArea;
    private torrinDescriptionText: TextBox;
    private sirCamilIcon: ImageUI;
    private sirCamilIconArea: RectArea;
    private sirCamilDescriptionText: TextBox;
    private startNewGameButton: Button;
    private startNewGameButtonLabel: string;

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
        state.gameSaveFlags.loadRequested = true;
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
            this.titleBannerArea = RectAreaHelper.new({left: 0, top: 0, width: 0, height: 0});
        }

        if (this.torrinIcon === undefined) {
            this.torrinIconArea = RectAreaHelper.new({left: 0, top: 0, width: 0, height: 0});
        }

        if (this.sirCamilIcon === undefined) {
            this.sirCamilIconArea = RectAreaHelper.new({left: 0, top: 0, width: 0, height: 0});
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
                RectAreaHelper.new({
                    left: ScreenDimensions.SCREEN_WIDTH * 0.25,
                    top: 20,
                    width: ScreenDimensions.SCREEN_WIDTH * 0.5,
                    height: ScreenDimensions.SCREEN_HEIGHT * 0.25,
                })

            if (this.areResourcesLoaded() === false) {
                return;
            }

            let image: GraphicImage = getResultOrThrowError(
                this.resourceHandler.getResource("torrins trial logo")
            );

            this.titleBannerArea = RectAreaHelper.new({
                left: (ScreenDimensions.SCREEN_WIDTH - image.width) * 0.5,
                top: 20,
                height: ScreenDimensions.SCREEN_HEIGHT * 0.25,
                width: ScaleImageWidth({
                    imageWidth: image.width,
                    imageHeight: image.height,
                    desiredHeight: ScreenDimensions.SCREEN_HEIGHT * 0.25,
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
                area: RectAreaHelper.new({
                    startColumn: 1,
                    endColumn: 3,
                    left: 20,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: RectAreaHelper.bottom(this.titleBannerArea) + WINDOW_SPACING1,
                    height: WINDOW_SPACING4,
                }),
                text: "Torrin's Trial",
                textSize: WINDOW_SPACING4,
                fontColor: colors.backgroundText,
            })
        }
        return this.titleText;
    }

    private lazyLoadByLine() {
        if (this.byLine === undefined) {
            this.byLine = TextBoxHelper.new({
                area: RectAreaHelper.new({
                    startColumn: 3,
                    endColumn: 4,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: RectAreaHelper.bottom(this.titleText.area),
                    height: WINDOW_SPACING2,
                    margin: WINDOW_SPACING1,
                }),
                text: "by Chad Serrant",
                textSize: WINDOW_SPACING2,
                fontColor: colors.backgroundText,
            })
        }
        return this.byLine;
    }

    private lazyLoadGameDescription() {
        if (this.gameDescription === undefined) {
            this.gameDescription = TextBoxHelper.new({
                area: RectAreaHelper.new({
                    startColumn: 1,
                    endColumn: 6,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: RectAreaHelper.bottom(this.byLine.area),
                    bottom: ScreenDimensions.SCREEN_HEIGHT * 0.8,
                    margin: [WINDOW_SPACING4, WINDOW_SPACING1, WINDOW_SPACING1, WINDOW_SPACING4],
                }),
                text: "Help Torrin and Sir Camil protect their base.\n\nDefeat all the demon infiltrators!",
                vertAlign: VERT_ALIGN_CENTER,
                horizAlign: HORIZ_ALIGN_LEFT,
                textSize: WINDOW_SPACING1 * 2,
                fontColor: colors.descriptionText,
            });
        }

        return this.gameDescription;
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
                this.startNewGameButtonLabel = "Window is too small";
            }
            changePlayButtonLabel = true;
        } else if (
            !windowIsTooSmall
            && !playButtonHasBeenClicked
            && this.startNewGameButtonLabel !== "Click here to Play Demo"
        ) {
            this.startNewGameButtonLabel = "Click here to Play Demo";
            changePlayButtonLabel = true;
        } else if (this.startNewGameButton === undefined) {
            this.startNewGameButtonLabel = "Click here to Play Demo";
            changePlayButtonLabel = true;
        }

        const playButtonHorizontalAlignment = windowIsTooSmall
            ? HORIZ_ALIGN_LEFT
            : HORIZ_ALIGN_CENTER;

        const buttonArea = RectAreaHelper.new({
            left: 0,
            width: ScreenDimensions.SCREEN_WIDTH,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.8,
            bottom: ScreenDimensions.SCREEN_HEIGHT,
        })

        if (this.startNewGameButton === undefined || changePlayButtonLabel) {
            this.startNewGameButton = new Button({
                activeLabel: LabelHelper.new({
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
                readyLabel: LabelHelper.new({
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
        let newButtonLabel: string;
        newButtonLabel = "Continue";
        if (state.gameSaveFlags.loadRequested) {
            newButtonLabel = "Now loading...";
        }

        if (
            state.gameSaveFlags.errorDuringLoading
        ) {
            newButtonLabel = 'Loading failed. Check logs.';
            this.continueGameButton.buttonStatus = ButtonStatus.READY;
            state.gameSaveFlags.errorDuringLoading = false;
            this.errorDuringLoadingDisplayStartTimestamp = Date.now();
        } else if (
            this.errorDuringLoadingDisplayStartTimestamp !== undefined
            && Date.now() - this.errorDuringLoadingDisplayStartTimestamp < FILE_MESSAGE_DISPLAY_DURATION
        ) {
            newButtonLabel = 'Loading failed. Check logs.';
        }

        let changePlayButtonLabel: boolean = (newButtonLabel !== this.continueGameButtonLabel);
        if (changePlayButtonLabel) {
            this.continueGameButtonLabel = newButtonLabel;
        }
        let buttonTextSize = WINDOW_SPACING2;

        const playButtonHorizontalAlignment = HORIZ_ALIGN_CENTER;

        const buttonArea = RectAreaHelper.new({
            left: ScreenDimensions.SCREEN_WIDTH * 3 / 4,
            width: ScreenDimensions.SCREEN_WIDTH / 4,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.7,
            bottom: ScreenDimensions.SCREEN_HEIGHT * 0.8,
        })

        if (this.continueGameButton === undefined || changePlayButtonLabel) {
            this.continueGameButton = new Button({
                activeLabel: LabelHelper.new({
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
                readyLabel: LabelHelper.new({
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

    private lazyLoadBackground() {
        if (this.background === undefined) {

            this.background = RectangleHelper.new({
                area: RectAreaHelper.new({
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
        if (this.torrinIcon === undefined) {
            this.createPlaceholderTorrinIconArea();
        }

        const torrinDescriptionText: string = "Torrin has two powers: \n - Water Cannon: A ranged blast\n - Healing Touch: A close ranged heal";
        if (this.torrinDescriptionText === undefined) {
            this.setTorrinDescriptionText(torrinDescriptionText);
        }

        TextBoxHelper.draw(this.torrinDescriptionText, graphicsContext);

        if (this.sirCamilIcon === undefined) {
            this.createSirCamilPlaceholderIconAreaUnderTorrin();
        }

        const sirCamilDescriptionText: string = "Sir Camil has more health and armor. \n - Longsword: Melee attack."
        if (this.sirCamilDescriptionText === undefined) {
            this.setSirCamilDescriptionText(sirCamilDescriptionText);
        }

        TextBoxHelper.draw(this.sirCamilDescriptionText, graphicsContext);

        if (this.areResourcesLoaded() === false) {
            return;
        }

        if (this.torrinIcon === undefined) {
            let image: GraphicImage = getResultOrThrowError(
                this.resourceHandler.getResource("young torrin cutscene portrait")
            );
            this.setTorrinIconBasedOnImage(image);
            this.setTorrinDescriptionText(torrinDescriptionText);
        }
        this.torrinIcon.draw(graphicsContext);

        if (this.sirCamilIcon === undefined) {
            let image: GraphicImage = getResultOrThrowError(
                this.resourceHandler.getResource("sir camil cutscene portrait")
            );
            this.setSirCamilIconBasedOnImageAndTorrinImage(image);
            this.setSirCamilDescriptionText(sirCamilDescriptionText);
        }
        this.sirCamilIcon.draw(graphicsContext);
    }

    private setSirCamilIconBasedOnImageAndTorrinImage(image: GraphicImage) {
        this.sirCamilIconArea = RectAreaHelper.new({
            left: RectAreaHelper.right(this.sirCamilIconArea) - 110,
            top: RectAreaHelper.bottom(this.torrinIconArea) + WINDOW_SPACING1,
            height: ScaleImageHeight({
                imageWidth: image.width,
                imageHeight: image.height,
                desiredWidth: 100,
            }),
            width: 100,
        });

        this.sirCamilIcon = new ImageUI({
            graphic: image,
            area: this.sirCamilIconArea,
        });
    }

    private setTorrinIconBasedOnImage(image: GraphicImage) {
        this.torrinIconArea = RectAreaHelper.new({
            left: this.torrinIconArea.left,
            top: this.torrinIconArea.top,
            height: ScaleImageHeight({
                imageWidth: image.width,
                imageHeight: image.height,
                desiredWidth: 100,
            }),
            width: 100,
        });

        this.torrinIcon = new ImageUI({
            graphic: image,
            area: this.torrinIconArea,
        })
    }

    private createSirCamilPlaceholderIconAreaUnderTorrin() {
        this.sirCamilIconArea = RectAreaHelper.new({
            startColumn: 10,
            endColumn: 11,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: RectAreaHelper.bottom(this.torrinIconArea) + WINDOW_SPACING1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        });
    }

    private createPlaceholderTorrinIconArea() {
        this.torrinIconArea = RectAreaHelper.new({
            startColumn: 7,
            endColumn: 8,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: RectAreaHelper.bottom(this.byLine.area),
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        });
    }

    private setSirCamilDescriptionText(sirCamilDescriptionText: string) {
        this.sirCamilDescriptionText = TextBoxHelper.new({
            area: RectAreaHelper.new({
                left: this.torrinIconArea.left,
                top: this.sirCamilIconArea.top,
                height: this.sirCamilIconArea.height,
                width: this.sirCamilIconArea.left - this.torrinIconArea.left - WINDOW_SPACING2,
            }),
            text: sirCamilDescriptionText,
            textSize: WINDOW_SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERT_ALIGN_CENTER,
        });
    }

    private setTorrinDescriptionText(torrinDescriptionText: string) {
        this.torrinDescriptionText = TextBoxHelper.new({
            area: RectAreaHelper.new({
                left: RectAreaHelper.right(this.torrinIconArea) + WINDOW_SPACING1,
                top: this.torrinIconArea.top,
                height: this.torrinIconArea.height,
                width: ScreenDimensions.SCREEN_WIDTH - RectAreaHelper.right(this.torrinIconArea) - WINDOW_SPACING2,
            }),
            text: torrinDescriptionText,
            textSize: WINDOW_SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERT_ALIGN_CENTER,
        })
    }
}
