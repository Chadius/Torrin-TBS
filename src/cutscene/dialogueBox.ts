import p5 from "p5";
import {
  HORIZ_ALIGN_CENTER,
  HORIZ_ALIGN_LEFT,
  VERT_ALIGN_BASELINE, VERT_ALIGN_CENTER,
  WINDOW_SPACING2,
  WINDOW_SPACING4
} from "../ui/constants";
import {RectArea} from "../ui/rectArea";
import {ImageUI} from "../ui/imageUI";
import {Label} from "../ui/label";

type RequiredOptions = {
  id: string;
}

type Options = {
  name: string;
  text: string;
  portrait: p5.Image;
  animationDuration: number;
  answers: string[];
  screenDimensions: [number, number];
}

export class DialogueBox {
  id: string;
  speakerName: string;
  speakerText: string;
  animationDuration: number;
  speakerPortrait: p5.Image;
  answers: string[];
  screenDimensions: [number, number];

  startTime: number;
  dialogFinished: boolean;
  answerSelected: number;

  speakerImage: ImageUI;

  speakerTextLabel: Label;
  speakerNameLabel: Label;
  answerLabels: Label[];

  constructor(options: RequiredOptions & Partial<Options>) {
    this.id = options.id;
    this.speakerName = options.name;
    this.speakerText = options.text;
    this.animationDuration = options.animationDuration;
    this.speakerPortrait = options.portrait;
    this.answers = options.answers || [];
    this.screenDimensions = options.screenDimensions || [0, 0];

    this.answerSelected = -1;
    this.dialogFinished = false;

    this.createUIObjects();
  }

  createUIObjects() {
    const margin: number = WINDOW_SPACING2;

    const dialogueBoxBackgroundColor: [number, number, number] = [200, 10, 50];
    const dialogueBoxTextColor: [number, number, number] = [0, 0, 0];
    const dialogueBoxTop = this.screenDimensions[1] * 0.7;
    const dialogueBoxHeight = this.screenDimensions[1] * 0.3;
    const dialogueBoxLeft = margin;

    this.speakerTextLabel = new Label({
      padding: [margin * 2, margin, 0, margin],
      area: new RectArea({
        left: dialogueBoxLeft,
        top: dialogueBoxTop - margin,
        width: this.screenDimensions[0] - margin - margin,
        height: dialogueBoxHeight
      }),
      fillColor: dialogueBoxBackgroundColor,
      text: this.speakerText,
      textSize: WINDOW_SPACING4,
      fontColor: dialogueBoxTextColor
    });

    const speakerBackgroundColor: [number, number, number] = dialogueBoxBackgroundColor;
    const speakerBoxTop = dialogueBoxTop - (2.5 * margin);
    const speakerBoxHeight = margin * 3;
    const speakerBoxLeft = margin * 0.5;

    const speakerBoxTextColor: [number, number, number] = [0, 0, 0];
    this.speakerNameLabel = new Label({
      padding: [margin, 0, 0, margin * 0.5],
      area: new RectArea({
        left: speakerBoxLeft,
        top: speakerBoxTop,
        width: this.screenDimensions[0] * 0.3,
        height: speakerBoxHeight
      }),
      fillColor: speakerBackgroundColor,
      text: this.speakerName,
      textSize: 24,
      fontColor: speakerBoxTextColor,
      horizAlign: HORIZ_ALIGN_LEFT,
      vertAlign: VERT_ALIGN_BASELINE,
    });

    const answerButtonPositions: RectArea[] = this.getAnswerButtonPositions();
    this.answerLabels = answerButtonPositions.map((buttonRect, answerIndex) =>
      new Label({
        padding: [buttonRect.height *0.1, buttonRect.width*0.1],
        area: new RectArea({
          left: buttonRect.left,
          top: buttonRect.top,
          width: buttonRect.width,
          height: buttonRect.height,
        }),
        fillColor: dialogueBoxBackgroundColor,
        text: this.answers[answerIndex],
        textSize: 24,
        fontColor: dialogueBoxTextColor,
        horizAlign: HORIZ_ALIGN_CENTER,
        vertAlign: VERT_ALIGN_CENTER
      })
    );

    if (this.speakerPortrait) {
      this.speakerImage = new ImageUI({
        graphic: this.speakerPortrait,
        area: new RectArea({
          left: dialogueBoxLeft,
          top: speakerBoxTop - this.speakerPortrait.height,
          width: this.speakerPortrait.width,
          height: this.speakerPortrait.height,
        })
      })
    }
  }

  draw(p: p5) {
    p.push();

    this.speakerTextLabel.draw(p);
    if (this.speakerName) {
      this.speakerNameLabel.draw(p);
    }
    this.speakerImage.draw(p);
    this.answerLabels.forEach((answer) => answer.draw(p));

    p.pop();
  }

  start(): void {
    this.startTime = Date.now();
  }

  getAnswerButtonPositions(): RectArea[] {
    if (!this.asksUserForAnAnswer()) {
      return [];
    }

    const buttonTop = this.screenDimensions[1] * 0.9;
    const buttonHeight = this.screenDimensions[1] * 0.1;

    if (this.answers.length == 1) {
      return [
        new RectArea({
          left: 0,
          top: buttonTop,
          width: this.screenDimensions[0],
          height: buttonHeight
        })
      ];
    }

    const BUTTON_GAP_WHITESPACE_PERCENTAGE = 25;
    const BUTTON_GAP_PIXEL_MINIMUM = 50;

    let numberOfGaps = this.answers.length - 1;
    let rawTotalButtonGapSpace = this.screenDimensions[0] * BUTTON_GAP_WHITESPACE_PERCENTAGE / 100;

    let buttonGapWidth = rawTotalButtonGapSpace / numberOfGaps;
    if (buttonGapWidth < BUTTON_GAP_PIXEL_MINIMUM) {
      buttonGapWidth = BUTTON_GAP_PIXEL_MINIMUM;
    }

    let totalButtonGap = buttonGapWidth * (this.answers.length - 1);
    let totalButtonSpace = this.screenDimensions[0] - totalButtonGap;
    let buttonWidth = totalButtonSpace / this.answers.length;

    return this.answers.map((text, index): RectArea => {
      return new RectArea({
        left: (buttonWidth + buttonGapWidth) * index,
        top: buttonTop,
        width: buttonWidth,
        height: buttonHeight
      });
    });
  }

  mouseClicked(mouseX: number, mouseY: number) {
    if(this.asksUserForAnAnswer()) {
      const answerButtonPositions: RectArea[] = this.getAnswerButtonPositions();

      const answerSelected: number | null = answerButtonPositions.findIndex((buttonPosition) => {
        return (
          mouseX >= buttonPosition.left
          && mouseX <= buttonPosition.left + buttonPosition.width
          && mouseY >= buttonPosition.top
          && mouseY <= buttonPosition.top + buttonPosition.height
        );
      });

      if (answerSelected !== -1) {
        this.dialogFinished = true;
        this.answerSelected = answerSelected;
      }
      return;
    }

    if (this.isAnimating() && !this.asksUserForAnAnswer()) {
      this.dialogFinished = true;
    }
  }

  isTimeExpired(): boolean {
    return Date.now() >= this.startTime + this.animationDuration
  }

  asksUserForAnAnswer(): boolean {
    return this.answers.length > 0;
  }

  isAnimating(): boolean {
    if (this.isTimeExpired() && !this.asksUserForAnAnswer()) {
      return false;
    }

    return !this.dialogFinished;
  }

  isFinished(): boolean {
    return !this.isAnimating() || this.dialogFinished;
  }
}
