import {DialoguePlayerService, DialoguePlayerState} from "./dialogue/dialogueBoxPlayer";
import {CutsceneDecisionTrigger, CutsceneDecisionTriggerService} from "./DecisionTrigger";
import {CutsceneAction, CutsceneActionPlayerType} from "./cutsceneAction";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER, WINDOW_SPACING1, WINDOW_SPACING4} from "../ui/constants";
import {Button, ButtonStatus} from "../ui/button";
import {LabelHelper} from "../ui/label";
import {RectAreaService} from "../ui/rectArea";
import {ResourceHandler, ResourceLocator, ResourceType} from "../resource/resourceHandler";
import {isResult, unwrapResultOrError} from "../utils/ResultOrError";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {TextSubstitutionContext} from "../textSubstitution/textSubstitution";
import {Dialogue, DialogueService} from "./dialogue/dialogue";
import {SplashScreen, SplashScreenService} from "./splashScreen";
import {SplashScreenPlayerService, SplashScreenPlayerState} from "./splashScreenPlayer";
import {isValidValue} from "../utils/validityCheck";
import {ScreenDimensions} from "../utils/graphics/graphicsConfig";

const FAST_FORWARD_ACTION_WAIT_TIME_MILLISECONDS = 100;

// TODO extract information into an interface
// TODO class is built using the interface
export type CutsceneDirection = Dialogue | SplashScreen;
export type CutsceneDirectionPlayerState = DialoguePlayerState | SplashScreenPlayerState;

export class Cutscene {
    directions: CutsceneDirection[];
    directionIndex: number | undefined;
    currentDirection: CutsceneDirection | undefined;

    cutscenePlayerStateById: {
        [t: string]: CutsceneDirectionPlayerState
    };

    decisionTriggers: CutsceneDecisionTrigger[];

    fastForwardButton: Button;
    fastForwardPreviousTimeTick: number | undefined;

    resourceHandler: ResourceHandler;
    allResourceLocators: ResourceLocator[];
    allResourceKeys: string[];

    constructor({
                    actions,
                    decisionTriggers,
                    resourceHandler,
                    directions,
                }: {
        actions?: CutsceneAction[]; // TODO get rid of this
        decisionTriggers?: CutsceneDecisionTrigger[];
        directions?: CutsceneDirection[];
        resourceHandler?: ResourceHandler;
    }) {
        this.directions = isValidValue(directions)
            ? [...directions]
            : [];
        this.directionIndex = undefined;

        this.decisionTriggers = isValidValue(decisionTriggers)
            ? [...decisionTriggers]
            : [];

        this.cutscenePlayerStateById = {};
        this.directions.forEach(direction => {
            switch (direction.type) {
                case CutsceneActionPlayerType.DIALOGUE:
                    this.cutscenePlayerStateById[direction.id] = DialoguePlayerService.new({
                        dialogue: direction,
                    });
                    break;
                case CutsceneActionPlayerType.SPLASH_SCREEN:
                    this.cutscenePlayerStateById[direction.id] = SplashScreenPlayerService.new({
                        splashScreen: direction,
                    });
                    break;
            }
        })

        this.resourceHandler = resourceHandler;
        this.collectResourceLocatorsAndKeys();

        this.setUpFastForwardButton();
    }

    hasLoaded(): boolean {
        if (!this.doesResourceHandlerExist()) {
            return true;
        }
        return this.resourceHandler.areAllResourcesLoaded(this.allResourceKeys);
    }

    // TODO delete this
    TODODeleteMeisInProgress(): boolean {
        return false;
    }

    isInProgress(): boolean {
        return (this.directionIndex !== undefined && this.currentDirection !== undefined)
    }

    isFinished(): boolean {
        return (this.directionIndex !== undefined && this.currentDirection === undefined);
    }

    draw(graphicsContext: GraphicsContext) {
        if (this.currentDirection !== undefined) {
            switch (this.currentDirection.type) {
                case CutsceneActionPlayerType.DIALOGUE:
                    DialoguePlayerService.draw(
                        this.cutscenePlayerStateById[this.currentDirection.id] as DialoguePlayerState,
                        graphicsContext
                    );
                    break;
                case CutsceneActionPlayerType.SPLASH_SCREEN:
                    SplashScreenPlayerService.draw(
                        this.cutscenePlayerStateById[this.currentDirection.id] as SplashScreenPlayerState,
                        graphicsContext
                    );
                    break;
            }
        }

        if (this.canFastForward()) {
            this.fastForwardButton.draw(graphicsContext);
        }
    }

    mouseMoved(mouseX: number, mouseY: number) {
        if (this.fastForwardButton.mouseMoved(mouseX, mouseY, this) === true) {
            return;
        }
    }

    mouseClicked(mouseX: number, mouseY: number, context: TextSubstitutionContext) {
        if (this.fastForwardButton.mouseClicked(mouseX, mouseY, this) === true) {
            return;
        }

        if (this.currentDirection === undefined) {
            this.gotoNextDirection();
            this.startDirection(context);
            return;
        }

        switch (this.currentDirection.type) {
            case CutsceneActionPlayerType.DIALOGUE:
                DialoguePlayerService.mouseClicked(
                    this.cutscenePlayerStateById[this.currentDirection.id] as DialoguePlayerState,
                    mouseX, mouseY,
                )
                break;
            case CutsceneActionPlayerType.SPLASH_SCREEN:
                SplashScreenPlayerService.mouseClicked(
                    this.cutscenePlayerStateById[this.currentDirection.id] as SplashScreenPlayerState,
                    mouseX, mouseY
                )
                break;
        }

        let directionIsFinished: boolean = false;
        switch (this.currentDirection.type) {
            case CutsceneActionPlayerType.DIALOGUE:
                directionIsFinished = DialoguePlayerService.isFinished(
                    this.cutscenePlayerStateById[this.currentDirection.id] as DialoguePlayerState,
                )
                break;
            case CutsceneActionPlayerType.SPLASH_SCREEN:
                directionIsFinished = SplashScreenPlayerService.isFinished(
                    this.cutscenePlayerStateById[this.currentDirection.id] as SplashScreenPlayerState,
                )
                break;
        }

        if (directionIsFinished) {
            this.gotoNextDirection();
            this.startDirection(context);
        }
    }

    loadResources(): Error[] {
        if (!this.doesResourceHandlerExist()) {
            return;
        }

        return this.resourceHandler.loadResources(this.allResourceKeys);
    }

    setResources() {
        if (!this.doesResourceHandlerExist()) {
            return;
        }

        if (!this.resourceHandler.areAllResourcesLoaded(this.allResourceKeys)) {
            return;
        }

        const cutscene = this;

        this.directions.forEach(direction => {
            let resourceLocators: ResourceLocator[] = this.getResourceLocators(direction);

            switch (direction.type) {
                case CutsceneActionPlayerType.DIALOGUE:
                    this.cutscenePlayerStateById[direction.id] = DialoguePlayerService.new({
                        dialogue: direction,
                    });
                    break;
                case CutsceneActionPlayerType.SPLASH_SCREEN:
                    this.cutscenePlayerStateById[direction.id] = SplashScreenPlayerService.new({
                        splashScreen: direction,
                    });
                    break;
            }

            resourceLocators.forEach(locator => {
                if (!locator.key) {
                    return;
                }

                if (locator.type === ResourceType.IMAGE) {
                    let foundImage: GraphicImage;
                    const foundResourceResultOrError = cutscene.resourceHandler.getResource(locator.key);
                    if (isResult(foundResourceResultOrError)) {
                        foundImage = unwrapResultOrError(foundResourceResultOrError);

                        switch (this.cutscenePlayerStateById[direction.id].type) {
                            case CutsceneActionPlayerType.DIALOGUE:
                                DialoguePlayerService.setImageResource(
                                    this.cutscenePlayerStateById[direction.id] as DialoguePlayerState,
                                    foundImage,
                                );
                                break;
                            case CutsceneActionPlayerType.SPLASH_SCREEN:
                                SplashScreenPlayerService.setImageResource(
                                    this.cutscenePlayerStateById[direction.id] as SplashScreenPlayerState,
                                    foundImage,
                                );
                                break;
                        }
                    }
                }
            });
        });
    }

    start(context: TextSubstitutionContext): Error {
        if (!this.hasLoaded()) {
            return new Error("cutscene has not finished loading");
        }

        this.gotoNextDirection();
        this.startDirection(context);
        return undefined;
    }

    startDirection(context: TextSubstitutionContext): void {
        if (this.currentDirection !== undefined) {
            switch (this.currentDirection.type) {
                case CutsceneActionPlayerType.DIALOGUE:
                    return DialoguePlayerService.start(
                        this.cutscenePlayerStateById[this.currentDirection.id] as DialoguePlayerState,
                        context,
                    );
                case CutsceneActionPlayerType.SPLASH_SCREEN:
                    return SplashScreenPlayerService.start(
                        this.cutscenePlayerStateById[this.currentDirection.id] as SplashScreenPlayerState,
                        context,
                    );
            }
        }
    }

    getNextCutsceneDirection(): {
        nextDirection: CutsceneDirection,
        directionIndex: number
    } {
        const trigger: CutsceneDecisionTrigger = this.getTriggeredAction();
        let nextDirection: CutsceneDirection;
        let currentDirectionIndex: number = this.directionIndex;

        if (trigger !== undefined) {
            return {
                nextDirection: this.findDirectionByID(trigger.destinationDialogId),
                directionIndex: this.findDirectionIndexByID(trigger.destinationDialogId)
            };
        }

        currentDirectionIndex =
            currentDirectionIndex === undefined
                ? 0
                : currentDirectionIndex + 1;

        nextDirection = this.directions[currentDirectionIndex];
        return {
            nextDirection: nextDirection,
            directionIndex: currentDirectionIndex
        };
    }

    gotoNextDirection(): void {
        ({
            nextDirection: this.currentDirection,
            directionIndex: this.directionIndex,
        } = this.getNextCutsceneDirection());
    }

    getCurrentDirection(): CutsceneDirection {
        return this.currentDirection;
    }

    stop(): void {
        this.currentDirection = undefined;
        this.directionIndex = undefined;
    }

    isFastForward(): boolean {
        return this.fastForwardPreviousTimeTick !== undefined;
    }

    update(context: TextSubstitutionContext): void {
        if (!this.canFastForward()) {
            this.deactivateFastForwardMode();
            this.fastForwardButton.setStatus(ButtonStatus.READY);
            return;
        }

        if (!this.isFastForward()) {
            return;
        }

        if (
            Date.now() > this.fastForwardPreviousTimeTick + FAST_FORWARD_ACTION_WAIT_TIME_MILLISECONDS
        ) {
            if (this.getNextCutsceneDirection().nextDirection !== undefined) {
                this.gotoNextDirection();
                this.startDirection(context);
                this.activateFastForwardMode();
                this.fastForwardButton.setStatus(ButtonStatus.ACTIVE);
            } else {
                this.deactivateFastForwardMode();
                this.fastForwardButton.setStatus(ButtonStatus.READY);
            }
            return;
        }
    }

    canFastForward(): boolean {
        if (this.getNextCutsceneDirection().nextDirection === undefined) {
            return false;
        }

        if (this.currentDirection.type !== CutsceneActionPlayerType.DIALOGUE) {
            return true;
        }

        return !DialogueService.asksUserForAnAnswer(this.currentDirection);
    }

    private collectResourceLocatorsAndKeys() {
        const onlyUnique = (value: ResourceLocator, index: number, self: ResourceLocator[]) => {
            return self.findIndex(res => res.type == value.type && res.key == value.key) === index;
        }

        this.allResourceLocators = this.directions.map(action =>
            this.getResourceLocators(action)
        )
            .flat()
            .filter(x => x && x.key)
            .filter(onlyUnique);

        this.allResourceKeys = this.allResourceLocators.map(res => res.key)
    }

    private getResourceLocators(direction: CutsceneDirection): ResourceLocator[] {
        switch (direction.type) {
            case CutsceneActionPlayerType.DIALOGUE:
                return DialogueService.getResourceLocators(direction);
            case CutsceneActionPlayerType.SPLASH_SCREEN:
                return SplashScreenService.getResourceLocators(direction);
            default:
                return [];
        }
    }

    private setUpFastForwardButton() {
        this.fastForwardPreviousTimeTick = undefined;

        const fastForwardButtonLocation = this.getFastForwardButtonLocation();
        const buttonActivateBackgroundColor: [number, number, number] = [200, 10, 50];
        const buttonDeactivateBackgroundColor: [number, number, number] = [200, 5, 30];
        const buttonTextColor: [number, number, number] = [0, 0, 0];

        const buttonArea = RectAreaService.new({
            left: fastForwardButtonLocation.left,
            top: fastForwardButtonLocation.top,
            width: fastForwardButtonLocation.width,
            height: fastForwardButtonLocation.height
        });

        this.fastForwardButton = new Button({
            activeLabel: LabelHelper.new({
                text: "Stop FF",
                fillColor: buttonDeactivateBackgroundColor,
                area: buttonArea,
                textSize: WINDOW_SPACING4,
                fontColor: buttonTextColor,
                padding: WINDOW_SPACING1,
                horizAlign: HORIZ_ALIGN_CENTER,
                vertAlign: VERT_ALIGN_CENTER,
            }),
            readyLabel: LabelHelper.new({
                text: "Fast-forward",
                fillColor: buttonActivateBackgroundColor,
                area: buttonArea,
                textSize: WINDOW_SPACING4,
                fontColor: buttonTextColor,
                padding: WINDOW_SPACING1,
                horizAlign: HORIZ_ALIGN_CENTER,
                vertAlign: VERT_ALIGN_CENTER,
            }),
            hoverLabel: LabelHelper.new({
                text: "Click to FF",
                fillColor: buttonActivateBackgroundColor,
                area: buttonArea,
                textSize: WINDOW_SPACING4,
                fontColor: buttonTextColor,
                padding: WINDOW_SPACING1,
                horizAlign: HORIZ_ALIGN_CENTER,
                vertAlign: VERT_ALIGN_CENTER,
            }),
            initialStatus: ButtonStatus.READY,
            onClickHandler(mouseX: number, mouseY: number, button: Button, caller: Cutscene): {} {
                caller.toggleFastForwardMode();
                if (caller.isFastForward()) {
                    button.setStatus(ButtonStatus.ACTIVE);
                } else {
                    button.setStatus(ButtonStatus.READY);
                }
                return;
            }
        })
    }

    private doesResourceHandlerExist(): boolean {
        if (!this.resourceHandler) {
            return false;
        }
        return this.allResourceLocators && this.allResourceLocators.length > 0;
    }

    private getTriggeredAction(): CutsceneDecisionTrigger {
        if (
            this.currentDirection === undefined
        ) {
            return undefined;
        }

        let selectedAnswer: number = undefined;

        if (this.cutscenePlayerStateById[this.currentDirection.id].type === CutsceneActionPlayerType.DIALOGUE) {
            selectedAnswer = (this.cutscenePlayerStateById[this.currentDirection.id] as DialoguePlayerState).answerSelected;
        }

        return this.decisionTriggers.find((action) =>
                action.sourceDialogId === this.currentDirection.id
                && (
                    !CutsceneDecisionTriggerService.doesThisRequireAMatchingAnswer(action)
                    || action.sourceDialogAnswer === selectedAnswer
                )
        );
    }

    private findDirectionByID(targetId: string): CutsceneDirection | undefined {
        return this.directions.find((dialog) =>
            dialog.id === targetId
        );
    }

    private findDirectionIndexByID(targetId: string): number {
        return this.directions.findIndex((dialog) =>
            dialog.id === targetId
        );
    }

    private getFastForwardButtonLocation() {
        return {
            left: ScreenDimensions.SCREEN_WIDTH * 0.8,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.1,
            width: ScreenDimensions.SCREEN_WIDTH * 0.15,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1
        };
    }

    private toggleFastForwardMode(): void {
        if (this.isFastForward()) {
            this.deactivateFastForwardMode();
            this.fastForwardButton.setStatus(ButtonStatus.READY);
            return;
        }
        this.activateFastForwardMode();
        this.fastForwardButton.setStatus(ButtonStatus.ACTIVE);
    }

    private activateFastForwardMode(): void {
        this.fastForwardPreviousTimeTick = Date.now();
    }

    private deactivateFastForwardMode(): void {
        this.fastForwardPreviousTimeTick = undefined;
    }
}
