import {DialogueBox} from "./dialogue/dialogueBox";
import {DecisionTrigger} from "./DecisionTrigger";
import {CutsceneAction} from "./cutsceneAction";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER, WINDOW_SPACING1, WINDOW_SPACING4} from "../ui/constants";
import {Button, ButtonStatus} from "../ui/button";
import {LabelHelper} from "../ui/label";
import {RectAreaService} from "../ui/rectArea";
import {ResourceHandler, ResourceLocator, ResourceType} from "../resource/resourceHandler";
import {isResult, unwrapResultOrError} from "../utils/ResultOrError";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";
import {TextSubstitutionContext} from "../textSubstitution/textSubstitution";

const FAST_FORWARD_ACTION_WAIT_TIME_MILLISECONDS = 100;

type Options = {
    actions: CutsceneAction[];
    decisionTriggers: DecisionTrigger[];
    screenDimensions: [number, number];
    resourceHandler: ResourceHandler;
}

export class Cutscene {
    dialogueActions: CutsceneAction[];
    decisionTriggers: DecisionTrigger[];
    screenDimensions: {
        width: number,
        height: number
    };

    dialogueActionIndex: number | undefined;
    currentAction: CutsceneAction | undefined;

    fastForwardButton: Button;
    fastForwardPreviousTimeTick: number | undefined;

    resourceHandler: ResourceHandler;
    allResourceLocators: ResourceLocator[];
    allResourceKeys: string[];

    constructor(options: Partial<Options>) {
        this.dialogueActions = options.actions ? [...options.actions] : [];
        this.decisionTriggers = options.decisionTriggers ? [...options.decisionTriggers] : [];
        this.screenDimensions = {
            width: options.screenDimensions ? options.screenDimensions[0] : 0,
            height: options.screenDimensions ? options.screenDimensions[1] : 0,
        };

        this.dialogueActionIndex = undefined;

        this.resourceHandler = options.resourceHandler;
        this.collectResourceLocatorsAndKeys();

        this.setUpFastForwardButton();
    }

    hasLoaded(): boolean {
        if (!this.doesResourceHandlerExist()) {
            return true;
        }
        return this.resourceHandler.areAllResourcesLoaded(this.allResourceKeys);
    }

    isInProgress(): boolean {
        return (this.dialogueActionIndex !== undefined && this.currentAction !== undefined)
    }

    isFinished(): boolean {
        return (this.dialogueActionIndex !== undefined && this.currentAction === undefined);
    }

    draw(graphicsContext: GraphicsContext) {
        if (this.currentAction !== undefined) {
            this.currentAction.draw(graphicsContext);
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

        if (this.currentAction === undefined) {
            this.gotoNextAction();
            this.startAction(context);
            return;
        }

        this.currentAction.mouseClicked(mouseX, mouseY);
        if (this.currentAction.isFinished()) {
            this.gotoNextAction();
            this.startAction(context);
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

        this.dialogueActions.forEach(action => {
            action.getResourceLocators().forEach(locator => {
                if (!locator.key) {
                    return;
                }

                if (locator.type === ResourceType.IMAGE) {
                    let foundImage: GraphicImage;
                    const foundResourceResultOrError = cutscene.resourceHandler.getResource(locator.key);
                    if (isResult(foundResourceResultOrError)) {
                        foundImage = unwrapResultOrError(foundResourceResultOrError);
                        action.setImageResource(
                            foundImage
                        )
                    }
                }
            });
        });
    }

    start(context: TextSubstitutionContext): Error {
        if (!this.hasLoaded()) {
            return new Error("cutscene has not finished loading");
        }

        this.gotoNextAction();
        this.startAction(context);
        return undefined;
    }

    startAction(context: TextSubstitutionContext): void {
        if (this.currentAction !== undefined) {
            this.currentAction.start(context);
        }
    }

    getNextAction(): {
        nextAction: CutsceneAction,
        actionIndex: number
    } {
        const trigger: DecisionTrigger = this.getTriggeredAction();
        let nextAction: CutsceneAction;
        let currentActionIndex: number = this.dialogueActionIndex;

        if (trigger !== undefined) {
            nextAction = this.findDialogueByID(trigger.destinationDialogId);
            return {
                nextAction: nextAction,
                actionIndex: this.findDialogueIndexByID(trigger.destinationDialogId)
            };
        }

        currentActionIndex =
            currentActionIndex === undefined ?
                0 :
                currentActionIndex + 1;

        nextAction = this.dialogueActions[currentActionIndex];
        return {
            nextAction: nextAction,
            actionIndex: currentActionIndex
        };
    }

    gotoNextAction(): void {
        const nextAction = this.getNextAction();
        this.currentAction = nextAction.nextAction;
        this.dialogueActionIndex = nextAction.actionIndex;
    }

    getCurrentAction(): CutsceneAction {
        return this.currentAction;
    }

    stop(): void {
        this.currentAction = undefined;
        this.dialogueActionIndex = undefined;
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
            if (this.getNextAction().nextAction !== undefined) {
                this.gotoNextAction();
                this.startAction(context);
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
        if (this.getNextAction().nextAction === undefined) {
            return false;
        }

        if (!(this.currentAction instanceof DialogueBox)) {
            return true;
        }

        return !(this.currentAction instanceof DialogueBox && this.currentAction.asksUserForAnAnswer());
    }

    private collectResourceLocatorsAndKeys() {
        const onlyUnique = (value: ResourceLocator, index: number, self: ResourceLocator[]) => {
            return self.findIndex(res => res.type == value.type && res.key == value.key) === index;
        }

        this.allResourceLocators = this.dialogueActions.map(action => action.getResourceLocators())
            .flat()
            .filter(x => x && x.key)
            .filter(onlyUnique);
        this.allResourceKeys = this.allResourceLocators.map(res => res.key)
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

    private getTriggeredAction(): DecisionTrigger {
        if (
            this.currentAction === undefined
        ) {
            return undefined;
        }

        const selectedAnswer = this.currentAction instanceof DialogueBox ? this.currentAction.answerSelected : undefined;

        return this.decisionTriggers.find((action) =>
                action.sourceDialogId === this.currentAction.getId()
                && (
                    !action.doesThisRequireAMatchingAnswer()
                    || action.sourceDialogAnswer === selectedAnswer
                )
        );
    }

    private findDialogueByID(targetId: string): CutsceneAction | undefined {
        return this.dialogueActions.find((dialog) =>
            dialog.getId() === targetId
        );
    }

    private findDialogueIndexByID(targetId: string): number {
        return this.dialogueActions.findIndex((dialog) =>
            dialog.getId() === targetId
        );
    }

    private getFastForwardButtonLocation() {
        return {
            left: this.screenDimensions.width * 0.8,
            top: this.screenDimensions.height * 0.1,
            width: this.screenDimensions.width * 0.15,
            height: this.screenDimensions.height * 0.1
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
