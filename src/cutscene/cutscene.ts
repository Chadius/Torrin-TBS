import {DialogueAction} from "./dialogueBox";
import p5 from "p5";

export class Cutscene {
  dialogueActions: DialogueAction[];
  dialogueActionIndex: number | undefined;
  currentDialogue: DialogueAction | undefined;
  dialogueInProgress: boolean;

  constructor(dialogues: DialogueAction[]) {
    this.dialogueActions = [...dialogues];
    this.dialogueActionIndex = undefined;

    this.dialogueInProgress = false;
  }

  isInProgress(): boolean {
    return this.dialogueInProgress;
  }

  isFinished(): boolean {
    return false;
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
      return;
    }

    this.currentDialogue.mouseClicked(mouseX, mouseY);
    if (this.currentDialogue.isFinished()) {
      this.getNextAction();
    }
  }

  start(): void {
    this.dialogueInProgress = true;
    this.getNextAction();
  }

  getNextAction(): DialogueAction {
    this.dialogueActionIndex =
      this.dialogueActionIndex === undefined ?
      0 :
      this.dialogueActionIndex + 1;

    this.currentDialogue = this.dialogueActions[this.dialogueActionIndex];
    return this.currentDialogue;
  }

  getCurrentAction(): DialogueAction {
    return this.currentDialogue;
  }

  stop(): void {
    this.dialogueInProgress = false;
    this.currentDialogue = undefined;
    this.dialogueActionIndex = undefined;
  }
};
