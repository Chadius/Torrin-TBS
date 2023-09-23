import {TitleScreenState} from "./titleScreenState";
import {GameEngineChanges, GameEngineComponent} from "../gameEngine/gameEngineComponent";
import {MouseButton} from "../utils/mouseConfig";
import {GameEngineComponentState} from "../gameEngine/gameEngine";
import {GameModeEnum} from "../utils/startupConfig";
import {Label} from "../ui/label";
import {Button, ButtonStatus} from "../ui/button";
import {
    HORIZ_ALIGN_CENTER,
    HORIZ_ALIGN_LEFT,
    VERT_ALIGN_CENTER,
    WINDOW_SPACING1,
    WINDOW_SPACING2,
    WINDOW_SPACING4
} from "../ui/constants";
import {RectArea} from "../ui/rectArea";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";
import {TextBox} from "../ui/textBox";
import {KeyButtonName, KeyWasPressed} from "../utils/keyboardConfig";
import {Rectangle} from "../ui/rectangle";
import {ResourceHandler} from "../resource/resourceHandler";
import {ImageUI, ScaleImageHeight, ScaleImageWidth} from "../ui/imageUI";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";

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
    private playButton: Button;
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
    private _showingLoadingMessage: boolean;

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

    private _newGameSelected: boolean;

    get newGameSelected(): boolean {
        return this._newGameSelected;
    }

    update(state: TitleScreenState, graphicsContext: GraphicsContext): void {
        this.loadResourcesFromHandler();
        this.draw(state, graphicsContext);
    }

    keyPressed(state: TitleScreenState, keyCode: number): void {
        if (KeyWasPressed(KeyButtonName.ACCEPT, keyCode)) {
            this.playButton.onClickHandler(0, 0, this.playButton, this);
        }
    }

    mouseClicked(state: TitleScreenState, mouseButton: MouseButton, mouseX: number, mouseY: number): void {
        this.playButton.mouseClicked(mouseX, mouseY, this);
    }

    mouseMoved(state: TitleScreenState, mouseX: number, mouseY: number): void {
    }

    hasCompleted(state: TitleScreenState): boolean {
        return this.newGameSelected === true;
    }

    reset(state: TitleScreenState): void {
        this.resetInternalState();
    }

    setup(): TitleScreenState {
        return new TitleScreenState({});
    }

    recommendStateChanges(state: GameEngineComponentState): GameEngineChanges | undefined {
        return {
            nextMode: GameModeEnum.BATTLE,
        }
    }

    private draw(state: TitleScreenState, graphicsContext: GraphicsContext) {
        this.lazyLoadBackground().draw(graphicsContext);
        this.drawTitleBanner(graphicsContext);

        this.lazyLoadTitle().draw(graphicsContext);
        this.lazyLoadByLine().draw(graphicsContext);
        this.lazyLoadGameDescription().draw(graphicsContext);

        this.lazyLoadPlayButton().draw(graphicsContext);
        if (this._showingLoadingMessage) {
            this._newGameSelected = true;
        }
        this.drawCharacterIntroductions(state, graphicsContext);
    }

    private loadGameAndComplete() {
        this._showingLoadingMessage = true;
    }

    private resetInternalState() {
        if (this.titleBanner === undefined) {
            this.titleBannerArea = new RectArea({left: 0, top: 0, width: 0, height: 0});
        }

        if (this.torrinIcon === undefined) {
            this.torrinIconArea = new RectArea({left: 0, top: 0, width: 0, height: 0});
        }

        if (this.sirCamilIcon === undefined) {
            this.sirCamilIconArea = new RectArea({left: 0, top: 0, width: 0, height: 0});
        }

        this.titleBanner = undefined;
        this.playButton = undefined;
        this.byLine = undefined;
        this.titleText = undefined;
        this._showingLoadingMessage = false;
        this._newGameSelected = false;
    }

    private drawTitleBanner(graphicsContext: GraphicsContext) {
        if (this.titleBanner === undefined) {

            this.titleBannerArea =
                new RectArea({
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

            this.titleBannerArea = new RectArea({
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
            this.titleText = new TextBox({
                area: new RectArea({
                    startColumn: 1,
                    endColumn: 3,
                    left: 20,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: this.titleBannerArea.bottom + WINDOW_SPACING1,
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
            this.byLine = new TextBox({
                area: new RectArea({
                    startColumn: 3,
                    endColumn: 4,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: this.titleText.area.bottom,
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
            this.gameDescription = new TextBox({
                area: new RectArea({
                    startColumn: 1,
                    endColumn: 6,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: this.byLine.area.bottom,
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

    private lazyLoadPlayButton() {
        if (this.playButton === undefined) {
            const buttonArea = new RectArea({
                left: 0,
                width: ScreenDimensions.SCREEN_WIDTH,
                top: ScreenDimensions.SCREEN_HEIGHT * 0.8,
                bottom: ScreenDimensions.SCREEN_HEIGHT,
            })

            this.playButton = new Button({
                activeLabel: new Label({
                    text: "Now loading...",
                    fillColor: colors.playButtonActive,
                    area: buttonArea,
                    textSize: WINDOW_SPACING4,
                    fontColor: colors.playButtonText,
                    padding: WINDOW_SPACING1,
                    horizAlign: HORIZ_ALIGN_CENTER,
                    vertAlign: VERT_ALIGN_CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                readyLabel: new Label({
                    text: "Click here to Play Demo",
                    fillColor: colors.playButton,
                    area: buttonArea,
                    textSize: WINDOW_SPACING4,
                    fontColor: colors.playButtonText,
                    padding: WINDOW_SPACING1,
                    horizAlign: HORIZ_ALIGN_CENTER,
                    vertAlign: VERT_ALIGN_CENTER,
                    strokeColor: colors.playButtonStroke,
                }),
                initialStatus: ButtonStatus.READY,
                onClickHandler(mouseX: number, mouseY: number, button: Button, caller: TitleScreen): {} {
                    caller.loadGameAndComplete();
                    button.setStatus(ButtonStatus.ACTIVE);
                    return;
                }
            })
        }
        return this.playButton;
    }

    private lazyLoadBackground() {
        if (this.background === undefined) {

            this.background = new Rectangle({
                area: new RectArea({
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
        this.resourceHandler.loadResources(resourceKeys);
    }

    private areResourcesLoaded(): boolean {
        return this.resourceHandler.areAllResourcesLoaded(resourceKeys);
    }

    private drawCharacterIntroductions(state: TitleScreenState, graphicsContext: GraphicsContext) {
        if (this.torrinIcon === undefined) {
            this.createPlaceholderTorrinIconArea();
        }

        const torrinDescriptionText: string = "Torrin has two powers: \n - Water Cannon: A ranged blast\n - Healing Touch: A close ranged heal";
        if (this.torrinDescriptionText === undefined) {
            this.setTorrinDescriptionText(torrinDescriptionText);
        }

        this.torrinDescriptionText.draw(graphicsContext);

        if (this.sirCamilIcon === undefined) {
            this.createSirCamilPlaceholderIconAreaUnderTorrin();
        }

        const sirCamilDescriptionText: string = "Sir Camil has more health. \n - Longsword: Melee attack, very strong."
        if (this.sirCamilDescriptionText === undefined) {
            this.setSirCamilDescriptionText(sirCamilDescriptionText);
        }

        this.sirCamilDescriptionText.draw(graphicsContext);

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
        this.sirCamilIconArea = new RectArea({
            left: this.sirCamilIconArea.right - 110,
            top: this.torrinIconArea.bottom + WINDOW_SPACING1,
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
        this.torrinIconArea = new RectArea({
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
        this.sirCamilIconArea = new RectArea({
            startColumn: 10,
            endColumn: 11,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: this.torrinIconArea.bottom + WINDOW_SPACING1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        });
    }

    private createPlaceholderTorrinIconArea() {
        this.torrinIconArea = new RectArea({
            startColumn: 7,
            endColumn: 8,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: this.byLine.area.bottom,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        });
    }

    private setSirCamilDescriptionText(sirCamilDescriptionText: string) {
        this.sirCamilDescriptionText = new TextBox({
            area: new RectArea({
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
        this.torrinDescriptionText = new TextBox({
            area: new RectArea({
                left: this.torrinIconArea.right + WINDOW_SPACING1,
                top: this.torrinIconArea.top,
                height: this.torrinIconArea.height,
                width: ScreenDimensions.SCREEN_WIDTH - this.torrinIconArea.right - WINDOW_SPACING2,
            }),
            text: torrinDescriptionText,
            textSize: WINDOW_SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERT_ALIGN_CENTER,
        })
    }
}
