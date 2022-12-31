import {ResourceLocator} from "../resource/resourceHandler";
import p5 from "p5";

export interface CutsceneAction {
  getId(): string;
  getResourceLocators(): ResourceLocator[];
  setImageResource(image: p5.Image): void;
  draw(p: p5): void;
  start(): void;
  mouseClicked(mouseX: number, mouseY: number): void;
  isTimeExpired(): boolean;
  isAnimating(): boolean;
  isFinished(): boolean;
}
