import p5 from "p5";

export type DialogueAction = DialogueBox;

export class DialogueBox {
  speakerName: string;
  speakerText: string;

  constructor(name: string, text: string) {
    this.speakerName = name;
    this.speakerText = text;
  }

  draw(p: p5) {
  }
}
