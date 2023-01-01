import {Label} from "../../ui/label";
import {RectArea} from "../../ui/rectArea";
import {
  HORIZ_ALIGN_CENTER,
  HORIZ_ALIGN_LEFT,
  VERT_ALIGN_BASELINE, VERT_ALIGN_CENTER,
  WINDOW_SPACING2,
  WINDOW_SPACING4
} from "../../ui/constants";
import p5 from "p5";
import {ImageUI} from "../../ui/imageUI";

type Options = {
  answer: string;
  position: RectArea;
  screenDimensions: [number, number];
}

export class DialogueAnswerButton {
  answerText: string;
  buttonRect: RectArea;
  answerLabel: Label;
  screenDimensions: [number, number];

  constructor(options: Partial<Options>) {
    this.answerText = options.answer;
    this.buttonRect = options.position;
    this.screenDimensions = options.screenDimensions || [0, 0];

    this.createUIObjects();
  }

  private createUIObjects() {
    const dialogueBoxBackgroundColor: [number, number, number] = [200, 10, 50];
    const dialogueBoxTextColor: [number, number, number] = [0, 0, 0];

    this.answerLabel = new Label({
      padding: [this.buttonRect.height * 0.1, this.buttonRect.width * 0.1],
      area: new RectArea({
        left: this.buttonRect.left,
        top: this.buttonRect.top,
        width: this.buttonRect.width,
        height: this.buttonRect.height,
      }),
      fillColor: dialogueBoxBackgroundColor,
      text: this.answerText,
      textSize: 24,
      fontColor: dialogueBoxTextColor,
      horizAlign: HORIZ_ALIGN_CENTER,
      vertAlign: VERT_ALIGN_CENTER
    })
  }

  draw(p: p5) {
    this.answerLabel.draw(p);
  }

  buttonWasClicked(mouseX: number, mouseY: number): boolean {
    return (
      mouseX >= this.buttonRect.left
      && mouseX <= this.buttonRect.left + this.buttonRect.width
      && mouseY >= this.buttonRect.top
      && mouseY <= this.buttonRect.top + this.buttonRect.height
    );
  }
}
