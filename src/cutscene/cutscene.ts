import {DialogueBox} from "./dialogueBox";
import p5 from "p5";
import {DecisionTrigger} from "./DecisionTrigger";
import {CutsceneAction} from "./cutsceneAction";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER, WINDOW_SPACING1, WINDOW_SPACING4} from "../ui/constants";
import {Button, ButtonStatus} from "../ui/button";
import {Label} from "../ui/label";
import {RectArea} from "../ui/rectArea";
import {ResourceHandler, ResourceLocator, ResourceType} from "../resource/resourceHandler";

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
  screenDimensions: { width: number, height: number };

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

    this.setUpFastforwardButton();
  }

  private collectResourceLocatorsAndKeys() {
    const onlyUnique = (value: ResourceLocator, index: number, self: ResourceLocator[]) => {
      return self.findIndex(res => res.type == value.type && res.key == value.key) === index;
    }

    const resourceLocators = this.dialogueActions.map(action => action.getResourceLocators())
      .flat()
      .filter(x => x && x.key)
      .filter(onlyUnique)
    ;
    this.allResourceLocators = resourceLocators;
    this.allResourceKeys = this.allResourceLocators.map(res => res.key)
  }

  private setUpFastforwardButton() {
    this.fastForwardPreviousTimeTick = undefined;

    const fastForwardButtonLocation = this.getFastForwardButtonLocation();
    const buttonActivateBackgroundColor: [number, number, number] = [200, 10, 50];
    const buttonDeactivateBackgroundColor: [number, number, number] = [200, 5, 30];
    const buttonTextColor: [number, number, number] = [0, 0, 0];

    const buttonArea = new RectArea({
      left: fastForwardButtonLocation.left,
      top: fastForwardButtonLocation.top,
      width: fastForwardButtonLocation.width,
      height: fastForwardButtonLocation.height
    });

    this.fastForwardButton = new Button({
      activeLabel: new Label({
        text: "Stop FF",
        fillColor: buttonDeactivateBackgroundColor,
        area: buttonArea,
        textSize: WINDOW_SPACING4,
        fontColor: buttonTextColor,
        padding: WINDOW_SPACING1,
        horizAlign: HORIZ_ALIGN_CENTER,
        vertAlign: VERT_ALIGN_CENTER,
      }),
      readyLabel: new Label({
        text: "Fast-forward",
        fillColor: buttonActivateBackgroundColor,
        area: buttonArea,
        textSize: WINDOW_SPACING4,
        fontColor: buttonTextColor,
        padding: WINDOW_SPACING1,
        horizAlign: HORIZ_ALIGN_CENTER,
        vertAlign: VERT_ALIGN_CENTER,
      }),
      hoverLabel: new Label({
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

  draw(p: p5) {
    if (this.currentAction !== undefined) {
      this.currentAction.draw(p);
    }

    if (this.canFastForward()) {
      this.fastForwardButton.draw(p);
    }
  }

  mouseMoved(mouseX: number, mouseY: number) {
    if (this.fastForwardButton.mouseMoved(mouseX, mouseY, this) === true) {
      return;
    }
  }

  mouseClicked(mouseX: number, mouseY: number) {
    if (this.fastForwardButton.mouseClicked(mouseX, mouseY, this) === true) {
      return;
    }

    if (this.currentAction === undefined) {
      this.gotoNextAction();
      this.startAction();
      return;
    }

    this.currentAction.mouseClicked(mouseX, mouseY);
    if (this.currentAction.isFinished()) {
      this.gotoNextAction();
      this.startAction();
    }
  }

  loadResources() {
    if(!this.doesResourceHandlerExist()) {
      return;
    }

    this.resourceHandler.loadResources(this.allResourceKeys);
  }

  private doesResourceHandlerExist(): boolean {
    if (!this.resourceHandler) {
      return false;
    }
    if (!(this.allResourceLocators && this.allResourceLocators.length > 0)) {
      return false;
    }
    return true;
  }

  setResources() {
    if(!this.doesResourceHandlerExist()) {
      return;
    }

    if (!this.resourceHandler.areAllResourcesLoaded(this.allResourceKeys) ) {
      return;
    }

    const cutscene = this;

    this.dialogueActions.forEach(action => {
      action.getResourceLocators().forEach(locator => {
        if(!locator.key) {
          return;
        }

        if (locator.type === ResourceType.IMAGE) {
          const foundImage: p5.Image = cutscene.resourceHandler.getResource(
            locator.key
          ) as p5.Image;

          if (foundImage) {
            action.setImageResource(
              foundImage
            )
          }
        }
      });
    });
  }

  start(): Error {
    if(!this.hasLoaded()) {
      return new Error("cutscene has not finished loading");
    }

    this.gotoNextAction();
    this.startAction();
    return undefined;
  }

  startAction(): void {
    if (this.currentAction !== undefined) {
      this.currentAction.start();
    }
  }

  getNextAction(): { nextAction: CutsceneAction, actionIndex: number } {
    const trigger: DecisionTrigger = this.getTriggeredAction();
    let nextAction: CutsceneAction;
    let currentActionIndex: number = this.dialogueActionIndex;

    if (trigger !== undefined) {
      nextAction = this.findDialogueByID(trigger.destination_dialog_id);
      return {
        nextAction: nextAction,
        actionIndex: this.findDialogueIndexByID(trigger.destination_dialog_id)
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

  private getTriggeredAction(): DecisionTrigger {
    if (
      this.currentAction === undefined
    ) {
      return undefined;
    }

    const selectedAnswer = this.currentAction instanceof DialogueBox ? this.currentAction.answerSelected : undefined;

    return this.decisionTriggers.find((action) =>
        action.source_dialog_id === this.currentAction.getId()
        && (
          !action.doesThisRequireAMatchingAnswer()
          || action.source_dialog_answer === selectedAnswer
        )
    );
  }

  getCurrentAction(): CutsceneAction {
    return this.currentAction;
  }

  stop(): void {
    this.currentAction = undefined;
    this.dialogueActionIndex = undefined;
  }

  private findDialogueByID(target_id: string): CutsceneAction | undefined {
    return this.dialogueActions.find((dialog) =>
      dialog.getId() === target_id
    );
  }

  private findDialogueIndexByID(target_id: string): number {
    return this.dialogueActions.findIndex((dialog) =>
      dialog.getId() === target_id
    );
  }

  isFastForward(): boolean {
    return this.fastForwardPreviousTimeTick !== undefined;
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

  update(): void {
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
        this.startAction();
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
}
