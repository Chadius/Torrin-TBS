import {DialogueBox} from "./dialogueBox";
import p5 from "p5";
import {DecisionTrigger} from "./DecisionTrigger";
import {CutsceneAction} from "./cutsceneAction";

type Options = {
  actions: CutsceneAction[];
  decisionTriggers: DecisionTrigger[];
}

export class Cutscene {
  dialogueActions: CutsceneAction[];
  dialogueActionIndex: number | undefined;
  currentDialogue: CutsceneAction | undefined;
  decisionTriggers: DecisionTrigger[];

  constructor(options: Partial<Options>) {
    this.dialogueActions = options.actions ? [...options.actions] : [];
    this.decisionTriggers = options.decisionTriggers ? [...options.decisionTriggers] : [];

    this.dialogueActionIndex = undefined;
  }

  isInProgress(): boolean {
    return (this.dialogueActionIndex !== undefined && this.currentDialogue !== undefined)
  }

  isFinished(): boolean {
    return (this.dialogueActionIndex !== undefined && this.currentDialogue === undefined);
  }

  draw(p: p5) {
    if (this.currentDialogue !== undefined) {
      this.currentDialogue.draw(p);
      return;
    }
  }

  mouseClicked(mouseX: number, mouseY: number) {
    if (this.currentDialogue === undefined) {
      this.getNextAction();
      this.startAction();
      return;
    }

    this.currentDialogue.mouseClicked(mouseX, mouseY);
    if (this.currentDialogue.isFinished()) {
      this.getNextAction();
      this.startAction();
    }
  }

  start(): void {
    this.getNextAction();
    this.startAction();
  }

  startAction(): void {
    if (this.currentDialogue !== undefined) {
      this.currentDialogue.start();
    }
  }

  getNextAction(): CutsceneAction {
    const trigger: DecisionTrigger = this.getTriggeredAction();
    if (trigger !== undefined) {
      this.currentDialogue = this.findDialogueByID(trigger.destination_dialog_id);
      if (this.currentDialogue !== undefined) {
        this.dialogueActionIndex = this.findDialogueIndexByID(this.currentDialogue.id);
      } else {
        this.dialogueActionIndex = undefined;
      }
      return;
    }

    this.dialogueActionIndex =
      this.dialogueActionIndex === undefined ?
        0 :
        this.dialogueActionIndex + 1;

    this.currentDialogue = this.dialogueActions[this.dialogueActionIndex];
    return this.currentDialogue;
  }

  private getTriggeredAction(): DecisionTrigger {
    if (
      this.currentDialogue === undefined
    ) {
      return undefined;
    }

    const selectedAnswer = this.currentDialogue instanceof DialogueBox ? this.currentDialogue.answerSelected : undefined;

    return this.decisionTriggers.find((action) =>
      action.source_dialog_id === this.currentDialogue.id
      && (
        !action.doesThisRequireAMatchingAnswer()
        || action.source_dialog_answer === selectedAnswer
      )
    );
  }

  getCurrentAction(): CutsceneAction {
    return this.currentDialogue;
  }

  stop(): void {
    this.currentDialogue = undefined;
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
};
