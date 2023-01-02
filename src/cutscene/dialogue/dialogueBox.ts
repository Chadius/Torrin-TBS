import p5 from "p5";
import {RectArea} from "../../ui/rectArea";
import {ResourceLocator, ResourceType} from "../../resource/resourceHandler";
import {CutsceneAction} from "../cutsceneAction";
import {DialogueTextBox} from "./dialogueTextBox";
import {DialogueSpeakerNameBox} from "./dialogueSpeakerNameBox";
import {DialogueSpeakerImage} from "./dialogueSpeakerImage";
import {DialogueAnswerButton} from "./dialogueAnswerButton";

type RequiredOptions = {
  id: string;
}

type Options = {
  name: string;
  text: string;
  portrait: p5.Image;
  portraitResourceKey: string;
  animationDuration: number;
  answers: string[];
  screenDimensions: [number, number];
}

export class DialogueBox implements CutsceneAction {
  id: string;
  screenDimensions: [number, number];
  dialogFinished: boolean;

  startTime: number;
  animationDuration: number;

  answers: string[];
  answerSelected: number;
  answerButtons: DialogueAnswerButton[];

  textBox: DialogueTextBox;
  speakerNameBox: DialogueSpeakerNameBox;
  speakerPortrait: p5.Image;
  speakerPortraitResourceKey: string;
  speakerImage: DialogueSpeakerImage;

  constructor(options: RequiredOptions & Partial<Options>) {
    this.id = options.id;
    this.answers = options.answers || [];
    this.animationDuration = options.animationDuration;
    this.speakerPortrait = options.portrait;
    this.speakerPortraitResourceKey = options.portraitResourceKey;
    this.screenDimensions = options.screenDimensions || [0, 0];

    this.answerSelected = -1;
    this.dialogFinished = false;

    this.textBox = new DialogueTextBox(options);
    this.speakerNameBox = new DialogueSpeakerNameBox(options);

    this.createUIObjects();
  }

  getId(): string {
    return this.id;
  }

  createUIObjects() {
    const answerButtonPositions: RectArea[] = this.getAnswerButtonPositions();
    this.answerButtons = answerButtonPositions.map((position, index) => new DialogueAnswerButton({
      answer: this.answers[index],
      position: position,
      screenDimensions: this.screenDimensions
    }));

    this.setSpeakerUI();
  }

  setSpeakerUI() {
     if (this.speakerPortrait) {
       this.speakerImage = new DialogueSpeakerImage({
         speakerPortrait: this.speakerPortrait,
         screenDimensions: this.screenDimensions
       });
    }
  }

  getResourceLocators(): ResourceLocator[] {
    return [
      {
        type: ResourceType.IMAGE,
        key: this.speakerPortraitResourceKey
      }
    ]
  }

  setImageResource(image: p5.Image) {
    this.setPortrait(image);
  }

  setPortrait(portrait: p5.Image) {
    this.speakerPortrait = portrait;
    this.setSpeakerUI();
  }

  draw(p: p5) {
    p.push();

    this.textBox?.draw(p);
    this.speakerNameBox?.draw(p);
    this.speakerImage?.draw(p);
    this.answerButtons.forEach((answer) => answer.draw(p));

    p.pop();
  }

  start(): void {
    this.dialogFinished = false;
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
      const answerSelected: number | null = this.answerButtons.findIndex((answerButton) => {
        return answerButton.buttonWasClicked(mouseX, mouseY);
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
