export class SplashScreen {
  imageName: string;
  dialogFinished: boolean;

  constructor(imageName: string) {
    this.imageName = imageName;
    this.dialogFinished = false;
  }

  mouseClicked(mouseX: number, mouseY: number) {
    this.dialogFinished = true;
  }

  isFinished(): boolean {
    return this.dialogFinished;
  }
}
