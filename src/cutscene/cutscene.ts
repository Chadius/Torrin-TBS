import {DialogueBox} from "./dialogueBox";
import p5 from "p5";
import {DecisionTrigger} from "./DecisionTrigger";
import {CutsceneAction} from "./cutsceneAction";
import {WINDOW_SPACING1, WINDOW_SPACING4} from "../ui/constants";
import {Label} from "../ui/label";
import {RectArea} from "../ui/rectArea";

const FAST_FORWARD_ACTION_WAIT_TIME_MILLISECONDS = 100;

type Options = {
  actions: CutsceneAction[];
  decisionTriggers: DecisionTrigger[];
  screenDimensions: [number, number];
}

export class Cutscene {
  dialogueActions: CutsceneAction[];
  decisionTriggers: DecisionTrigger[];
  screenDimensions: {width: number, height: number};

  dialogueActionIndex: number | undefined;
  currentAction: CutsceneAction | undefined;
  fastForwardPreviousTimeTick: number | undefined;

  constructor(options: Partial<Options>) {
    this.dialogueActions = options.actions ? [...options.actions] : [];
    this.decisionTriggers = options.decisionTriggers ? [...options.decisionTriggers] : [];
    this.screenDimensions = {
      width: options.screenDimensions ? options.screenDimensions[0] : 0,
      height: options.screenDimensions ? options.screenDimensions[1] : 0,
    };

    this.dialogueActionIndex = undefined;
    this.fastForwardPreviousTimeTick = undefined;
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

    this.drawFastForwardButton(p);
  }

  private drawFastForwardButton(p: p5): void {
    if (!this.canFastForward()) {
      return;
    }

    const fastForwardButtonLocation = this.getFastForwardButtonLocation();
    const buttonActivateBackgroundColor: [number, number, number] = [200, 10, 50];
    const buttonDeactivateBackgroundColor: [number, number, number] = [200, 5, 30];
    const buttonTextColor: [number, number, number] = [0, 0, 0];
    let buttonText: string;

    p.push();
    if (this.isFastForward()) {
      p.fill(buttonDeactivateBackgroundColor);
      buttonText = "Stop FF";
    } else {
      p.fill(buttonActivateBackgroundColor);
      buttonText = "Fast-forward";
    }

    p.rect(fastForwardButtonLocation.left, fastForwardButtonLocation.top, fastForwardButtonLocation.width, fastForwardButtonLocation.height);

    const margin = WINDOW_SPACING1;
    p.textSize(WINDOW_SPACING4);
    p.fill(buttonTextColor);
    p.text(
      buttonText,
      fastForwardButtonLocation.left + margin,
      fastForwardButtonLocation.top + margin,
      fastForwardButtonLocation.width - margin - margin,
      fastForwardButtonLocation.height - margin
    );

    p.pop();
    return;
  }

  mouseClicked(mouseX: number, mouseY: number) {
    if (this.didUserClickOnFastForwardButton(mouseX, mouseY)) {
      this.toggleFastForwardMode();
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

  start(): void {
    this.gotoNextAction();
    this.startAction();
  }

  startAction(): void {
    if (this.currentAction !== undefined) {
      this.currentAction.start();
    }
  }

  getNextAction(): {nextAction: CutsceneAction, actionIndex: number} {
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
      action.source_dialog_id === this.currentAction.id
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
      dialog.id === target_id
    );
  }

  private findDialogueIndexByID(target_id: string): number {
    return this.dialogueActions.findIndex((dialog) =>
      dialog.id === target_id
    );
  }

  isFastForward(): boolean {
    return this.fastForwardPreviousTimeTick !== undefined;
  }

  private didUserClickOnFastForwardButton(mouseX: number, mouseY: number): boolean {
    const fastForwardButtonDimensions = this.getFastForwardButtonLocation();

    return (
      mouseX >= fastForwardButtonDimensions.left
      && mouseX < fastForwardButtonDimensions.left + fastForwardButtonDimensions.width
      && mouseY >= fastForwardButtonDimensions.top
      && mouseY < fastForwardButtonDimensions.top + fastForwardButtonDimensions.height
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
      return;
    }
    this.activateFastForwardMode();
  }

  private activateFastForwardMode(): void {
    this.fastForwardPreviousTimeTick = Date.now();
  }

  private deactivateFastForwardMode(): void {
    this.fastForwardPreviousTimeTick = undefined;
  }

  update(): void {
    if(!this.canFastForward()) {
      this.deactivateFastForwardMode();
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
      } else {
        this.deactivateFastForwardMode();
      }
      return;
    }
  }

  canFastForward(): boolean {
    if (this.getNextAction().nextAction === undefined) {
      return false;
    }

    if(!(this.currentAction instanceof DialogueBox)) {
      return true;
    }

    return !(this.currentAction instanceof DialogueBox && this.currentAction.asksUserForAnAnswer());
  }
}
