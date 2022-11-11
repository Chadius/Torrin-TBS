import p5 from "p5";
import {SplashScreen} from "./splashScreen";

export type DialogueAction = DialogueBox | SplashScreen;

export class DialogueBox {
  speakerName: string;
  speakerText: string;
  animationDuration: number;

  startTime: number;
  dialogFinished: boolean;

  constructor(name: string, text: string, animationDuration: number) {
    this.speakerName = name;
    this.speakerText = text;
    this.animationDuration = animationDuration;
    this.dialogFinished = false;
  }

  draw(p: p5) {
  }

  start(): void {
    this.startTime = new Date(Date.now()).getMilliseconds();
  }

  mouseClicked(mouseX: number, mouseY: number) {
    if (this.isAnimating()) {
      this.dialogFinished = true;
    }
  }

  isAnimating(): boolean {
    const timeExpired = new Date(Date.now()).getMilliseconds() >= this.startTime + this.animationDuration
    if (timeExpired) {
      return false;
    }

    return !this.dialogFinished;
  }

  isFinished(): boolean {
    return !this.isAnimating() || this.dialogFinished;
  }
}
