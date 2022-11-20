import p5 from "p5";

export type SplashScreenOptions = {
  imageName: string;
}

export class SplashScreen {
  imageName: string;
  dialogFinished: boolean;

  constructor(options: Partial<SplashScreenOptions>) {
    this.imageName = options.imageName;
    this.dialogFinished = false;
  }

  start(): void {
  }

  mouseClicked(mouseX: number, mouseY: number) {
    if (this.isAnimating()) {
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
  }
}
