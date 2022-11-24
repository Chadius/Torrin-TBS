import p5 from "p5";
import {SplashScreen} from "./splashScreen";

export type DialogueAction = DialogueBox | SplashScreen;

export type DialogueBoxOptions = {
  name: string;
  text: string;
  portrait: p5.Image;
  animationDuration: number;
}

export class DialogueBox {
  speakerName: string;
  speakerText: string;
  animationDuration: number;
  speakerPortrait: p5.Image;

  startTime: number;
  dialogFinished: boolean;

  constructor(options: Partial<DialogueBoxOptions>) {
    this.speakerName = options.name;
    this.speakerText = options.text;
    this.animationDuration = options.animationDuration;
    this.speakerPortrait = options.portrait;
    this.dialogFinished = false;
  }

  draw(p: p5) {
    const margin: number = 16;

    const dialogueBoxBackgroundColor: [number, number, number] = [200, 10, 50];
    const dialogueBoxTextColor: [number, number, number] = [0, 0, 0];
    const dialogueBoxTop = p.height * 0.7;
    const dialogueBoxHeight = p.height * 0.3;
    const dialogueBoxLeft = margin;

    // draw a box across the bottom
    p.push();
    p.fill(dialogueBoxBackgroundColor);
    p.rect(dialogueBoxLeft, dialogueBoxTop - margin, p.width - margin - margin, dialogueBoxHeight);

    // draw the text
    p.textSize(32);
    p.fill(dialogueBoxTextColor);
    p.text(
      this.speakerText,
      dialogueBoxLeft + margin,
      dialogueBoxTop + margin,
      p.width - margin - margin,
      dialogueBoxHeight - margin
    );

    const speakerBoxTop = dialogueBoxTop - (2.5 * margin);
    const speakerBoxHeight = margin * 3;
    const speakerBoxLeft = margin * 0.5;

    if (this.speakerName) {
      // draw a speaker's box
      const speakerBackgroundColor: [number, number, number] = dialogueBoxBackgroundColor;
      const speakerBoxTextColor: [number, number, number] = [0, 0, 0];

      p.fill(speakerBackgroundColor);
      p.rect(speakerBoxLeft, speakerBoxTop, p.width * 0.3, speakerBoxHeight);

      // draw the speaker's name
      p.textSize(24);
      p.fill(speakerBoxTextColor);
      p.text(
        this.speakerName,
        speakerBoxLeft + (margin * 0.5),
        speakerBoxTop + margin,
        (p.width * 0.3) - margin,
        speakerBoxHeight - margin
      );
    }

    // draw a portrait above the box
    if (this.speakerPortrait) {
      p.image(
        this.speakerPortrait,
        dialogueBoxLeft,
        speakerBoxTop - this.speakerPortrait.height
      );
    }

    p.pop();
  }

  start(): void {
    this.startTime = new Date(Date.now()).getMilliseconds();
  }

  mouseClicked(mouseX: number, mouseY: number) {
    if (this.isTimeExpired()) {
      return;
    }

    if (this.isAnimating()) {
      this.dialogFinished = true;
    }
  }

  isTimeExpired(): boolean {
    return new Date(Date.now()).getMilliseconds() >= this.startTime + this.animationDuration
  }

  isAnimating(): boolean {
    if (this.isTimeExpired()) {
      return false;
    }

    return !this.dialogFinished;
  }

  isFinished(): boolean {
    return !this.isAnimating() || this.dialogFinished;
  }
}
