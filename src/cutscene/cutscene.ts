import {DialogueAction} from "./dialogueBox";
import p5 from "p5";

export class Cutscene {
  dialogueActions: DialogueAction[];
  dialogueActionIndex: number | undefined;
  currentDialogue: DialogueAction | undefined;

  constructor(dialogues: DialogueAction[]) {
    this.dialogueActions = [...dialogues];
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
    this.currentDialogue = undefined;
    this.dialogueActionIndex = undefined;
  }
};
