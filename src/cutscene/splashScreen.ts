import p5 from "p5";
import {ResourceLocator, ResourceType} from "../resource/resourceHandler";
import {CutsceneAction} from "./cutsceneAction";

type RequiredOptions = {
  id: string;
}

type Options = {
  animationDuration: number;
  screenImage: p5.Image;
  screenImageResourceKey: string;
}

export class SplashScreen implements CutsceneAction{
  id: string;
  startTime: number;
  dialogFinished: boolean;
  animationDuration: number;
  screenImage: p5.Image;
  screenImageResourceKey: string;

  constructor(options: RequiredOptions & Partial<Options>) {
    this.id = options.id;
    this.screenImage = options.screenImage;
    this.screenImageResourceKey = options.screenImageResourceKey;
    this.animationDuration = options.animationDuration || 0;
    this.dialogFinished = false;
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
    this.screenImage = screen;
  }

  start(): void {
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
    p.push();

    if (this.screenImage) {
      p.image(
        this.screenImage,
        (p.width - this.screenImage.width)/2,
        (p.height - this.screenImage.height)/2,
      );
    }

    p.pop();
  }
}
