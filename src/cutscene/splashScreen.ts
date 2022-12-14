import p5 from "p5";
import {ResourceLocator, ResourceType} from "../resource/resourceHandler";
import {CutsceneAction} from "./cutsceneAction";
import {ImageUI} from "../ui/imageUI";
import {RectArea} from "../ui/rectArea";

type RequiredOptions = {
  id: string;
}

type Options = {
  animationDuration: number;
  screenImage: p5.Image;
  screenImageResourceKey: string;
  screenDimensions: [number, number];
}

export class SplashScreen implements CutsceneAction{
  id: string;
  startTime: number;
  dialogFinished: boolean;
  animationDuration: number;
  screenImageResourceKey: string;
  screenImage: ImageUI;
  screenDimensions: [number, number];

  constructor(options: RequiredOptions & Partial<Options>) {
    this.id = options.id;
    this.screenImageResourceKey = options.screenImageResourceKey;
    this.animationDuration = options.animationDuration || 0;
    this.dialogFinished = false;
    this.screenDimensions = options.screenDimensions || [0, 0];
  }

  getId(): string {
    return this.id;
  }

  getResourceLocators(): ResourceLocator[] {
    return [
      {
        type: ResourceType.IMAGE,
        key: this.screenImageResourceKey
      }
    ]
  }

  setImageResource(image: p5.Image) {
    this.setScreenImage(image);
  }

  setScreenImage(screen: p5.Image) {
    this.screenImage = new ImageUI({
      graphic: screen,
      area: new RectArea({
        left: (this.screenDimensions[0] - screen.width)/2,
        top: (this.screenDimensions[1] - screen.height)/2,
        width: screen.width,
        height:screen.height,
      })
    });
  }

  start(): void {
    this.dialogFinished = false;
    this.startTime = Date.now();
  }

  isTimeExpired(): boolean {
    return Date.now() >= this.startTime + this.animationDuration
  }

  mouseClicked(mouseX: number, mouseY: number) {
    if (this.isTimeExpired() && this.isAnimating()) {
      this.dialogFinished = true;
    }
  }

  isAnimating(): boolean {
    return !this.dialogFinished;
  }

  isFinished(): boolean {
    return !this.isAnimating() || this.dialogFinished;
  }

  draw(p: p5): void {
    if (this.screenImage) {
      this.screenImage.draw(p);
    }
  }
}
