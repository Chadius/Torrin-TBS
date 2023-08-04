import p5 from "p5";
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
import {ScreenDimensions} from "../utils/graphicsConfig";
import {TextBox} from "../ui/textBox";
import {KeyButtonName, KeyWasPressed} from "../utils/keyboardConfig";
import {Rectangle} from "../ui/rectangle";

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

export class TitleScreen implements GameEngineComponent {
    private playButton: Button;
    private titleBanner: Label;
    private byLine: TextBox;
    private titleText: TextBox;
    private gameDescription: TextBox;
    private background: Rectangle;

    constructor() {
        this.resetInternalState();
    }

    private _newGameSelected: boolean;

    get newGameSelected(): boolean {
        return this._newGameSelected;
    }

    update(state: TitleScreenState, p: p5): void {
        this.draw(state, p);
    }

    keyPressed(state: TitleScreenState, keyCode: number): void {
        if (KeyWasPressed(KeyButtonName.ACCEPT, keyCode)) {
            this.loadGameAndComplete();
        }
    }

    mouseClicked(state: TitleScreenState, mouseButton: MouseButton, mouseX: number, mouseY: number): void {
        this.loadGameAndComplete();
    }

    mouseMoved(state: TitleScreenState, mouseX: number, mouseY: number): void {
    }

    hasCompleted(state: TitleScreenState): boolean {
        return this.newGameSelected === true;
    }

    reset(state: TitleScreenState): void {
        this.resetInternalState();
    }

    setup({graphicsContext}: { graphicsContext: p5 }): TitleScreenState {
        return new TitleScreenState({});
    }

    recommendStateChanges(state: GameEngineComponentState): GameEngineChanges | undefined {
        return {
            nextMode: GameModeEnum.BATTLE,
        }
    }

    private draw(state: TitleScreenState, p: p5) {
        this.lazyLoadBackground(p).draw(p);
        this.lazyLoadTitleBanner(state, p).draw(p);
        this.lazyLoadTitle(state, p).draw(p);
        this.lazyLoadByLine(state, p).draw(p);
        this.lazyLoadGameDescription(state, p).draw(p);
        this.lazyLoadPlayButton(state, p).draw(p);
    }

    private loadGameAndComplete() {
        this._newGameSelected = true;
    }

    private resetInternalState() {
        this.titleBanner = undefined;
        this.playButton = undefined;
        this.byLine = undefined;
        this.titleText = undefined;
    }

    private lazyLoadTitleBanner(state: TitleScreenState, p: p5) {
        if (this.titleBanner === undefined) {
            this.titleBanner = new Label({
                area: new RectArea({
                    left: ScreenDimensions.SCREEN_WIDTH * 0.25,
                    width: ScreenDimensions.SCREEN_WIDTH * 0.5,
                    top: 20,
                    height: ScreenDimensions.SCREEN_HEIGHT * 0.25,
                }),
                text: "Torrin's Trial",
                horizAlign: HORIZ_ALIGN_CENTER,
                vertAlign: VERT_ALIGN_CENTER,
                fillColor: colors.titleBanner,
                textSize: WINDOW_SPACING4 * 2,
                fontColor: colors.titleBannerStroke,
                padding: WINDOW_SPACING1,
            });
        }

        return this.titleBanner;
    }

    private lazyLoadTitle(state: TitleScreenState, p: p5) {
        if (this.titleText === undefined) {
            this.titleText = new TextBox({
                area: new RectArea({
                    startColumn: 2,
                    endColumn: 3,
                    screenWidth: ScreenDimensions.SCREEN_WIDTH,
                    screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                    top: this.titleBanner.rectangle.area.bottom + WINDOW_SPACING1,
                    height: WINDOW_SPACING4,
                }),
                text: "Torrin's Trial",
                textSize: WINDOW_SPACING4,
                fontColor: colors.backgroundText,
            })
        }
        return this.titleText;
    }

    private lazyLoadByLine(state: TitleScreenState, p: p5) {
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

    private lazyLoadGameDescription(state: TitleScreenState, p: p5) {
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
                text: "Torrin and Sir Camil fight off the demons who invaded the castle.\n\nClick on them to take turns moving around the map and attacking the enemy.\n\nDefeat all demons to win.",
                vertAlign: VERT_ALIGN_CENTER,
                horizAlign: HORIZ_ALIGN_LEFT,
                textSize: WINDOW_SPACING1 * 2,
                fontColor: colors.descriptionText,
            });
        }

        return this.gameDescription;
    }

    private lazyLoadPlayButton(state: TitleScreenState, p: p5) {
        if (this.playButton === undefined) {
            const buttonTextColor = [100, 0, 30];

            const buttonArea = new RectArea({
                left: 0,
                width: ScreenDimensions.SCREEN_WIDTH,
                top: ScreenDimensions.SCREEN_HEIGHT * 0.8,
                bottom: ScreenDimensions.SCREEN_HEIGHT,
            })

            this.playButton = new Button({
                activeLabel: new Label({
                    text: "Starting",
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

    private lazyLoadBackground(p: p5) {
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
}
