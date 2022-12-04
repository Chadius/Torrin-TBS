import p5 from "p5";

type RequiredOptions = {
  id: string;
}

type Options = {
  animationDuration: number;
  screenImage: p5.Image;
}

export class SplashScreen {
  id: string;
  startTime: number;
  dialogFinished: boolean;
  animationDuration: number;
  screenImage: p5.Image;

  constructor(options: RequiredOptions & Partial<Options>) {
    this.id = options.id;
    this.screenImage = options.screenImage;
    this.animationDuration = options.animationDuration || 0;
    this.dialogFinished = false;
  }

  start(): void {
    this.startTime = new Date(Date.now()).getMilliseconds();
  }

  isTimeExpired(): boolean {
    return new Date(Date.now()).getMilliseconds() >= this.startTime + this.animationDuration
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
