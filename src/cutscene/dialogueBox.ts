import p5 from "p5";
import {WINDOW_SPACING2, WINDOW_SPACING4} from "../ui/constants";
import {Rectangle} from "../ui/rectangle";
import {RectArea} from "../ui/rectArea";

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

type ButtonRectangle = {
  left: number;
  top: number;
  width: number;
  height: number;
};

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

  textBoxArea: RectArea;
  textBox: Rectangle;
  speakerNameBoxArea: RectArea;
  speakerNameBox: Rectangle;
  answerRectangles: Rectangle[];

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

    this.textBoxArea = new RectArea({
      left: dialogueBoxLeft,
      top: dialogueBoxTop - margin,
      width: this.screenDimensions[0] - margin - margin,
      height: dialogueBoxHeight
    });

    this.textBox = new Rectangle({
      fillColor: dialogueBoxBackgroundColor,
      area: this.textBoxArea
    });

    const speakerBackgroundColor: [number, number, number] = dialogueBoxBackgroundColor;
    const speakerBoxTop = dialogueBoxTop - (2.5 * margin);
    const speakerBoxHeight = margin * 3;
    const speakerBoxLeft = margin * 0.5;

    this.speakerNameBoxArea = new RectArea({
      left: speakerBoxLeft,
      top: speakerBoxTop,
      width: this.screenDimensions[0] * 0.3,
      height: speakerBoxHeight
    });

    this.speakerNameBox = new Rectangle({
      fillColor: speakerBackgroundColor,
      area: this.speakerNameBoxArea
    });

    const answerButtonPositions: RectArea[] = this.getAnswerButtonPositions();
    this.answerRectangles = answerButtonPositions.map((buttonRect) => {
      return new Rectangle({
        fillColor: dialogueBoxBackgroundColor,
        area: new RectArea({
          left: buttonRect.left,
          top: buttonRect.top,
          width: buttonRect.width,
          height: buttonRect.height,
        })
      });
    });
  }

  draw(p: p5) {
    const margin: number = WINDOW_SPACING2;

    const dialogueBoxBackgroundColor: [number, number, number] = [200, 10, 50];
    const dialogueBoxTextColor: [number, number, number] = [0, 0, 0];
    const dialogueBoxTop = p.height * 0.7;
    const dialogueBoxHeight = p.height * 0.3;
    const dialogueBoxLeft = margin;

    this.textBox.draw(p);

    p.push();

    // draw the text
    p.textSize(WINDOW_SPACING4);
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
      const speakerBoxTextColor: [number, number, number] = [0, 0, 0];

      this.speakerNameBox.draw(p);

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

    // draw dialogue boxes
    this.answerRectangles.forEach((answer) => {
      answer.draw(p);
    });

    const answerButtonPositions: RectArea[] = this.getAnswerButtonPositions();
    answerButtonPositions.forEach((button, answerIndex) => {
      p.textSize(24);
      p.fill(dialogueBoxTextColor);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(
        this.answers[answerIndex],
        button.left + button.width * 0.1,
        button.top + button.height * 0.1,
        button.width * 0.9,
        button.height * 0.9,
      );
      p.textAlign(p.LEFT, p.BASELINE);
    });

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
