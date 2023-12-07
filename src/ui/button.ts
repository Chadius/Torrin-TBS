import {Label, LabelHelper} from "./label";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {RectAreaHelper} from "./rectArea";

type RequiredOptions = {
    readyLabel: Label;
}

type Options = {
    activeLabel: Label;
    disabledLabel: Label;
    hoverLabel: Label;
    onClickHandler: (mouseX: number, mouseY: number, button: Button, caller: any) => {}
    onMoveHandler: (mouseX: number, mouseY: number, button: Button, caller: any) => {}
    initialStatus: ButtonStatus;
}

export type ButtonArguments = RequiredOptions & Partial<Options>;

export enum ButtonStatus {
    READY = "READY",
    ACTIVE = "ACTIVE",
    DISABLED = "DISABLED",
    HOVER = "HOVER",
}

export class Button {
    readyLabel: Label;
    activeLabel: Label;
    disabledLabel: Label;
    hoverLabel: Label;
    onClickHandler: (mouseX: number, mouseY: number, button: Button, caller: any) => {}
    onMoveHandler: (mouseX: number, mouseY: number, button: Button, caller: any) => {}
    buttonStatus: ButtonStatus;

    constructor(options: ButtonArguments) {
        this.readyLabel = options.readyLabel;
        this.activeLabel = options.activeLabel;
        this.disabledLabel = options.disabledLabel;
        this.hoverLabel = options.hoverLabel;
        this.onClickHandler = options.onClickHandler;
        this.onMoveHandler = options.onMoveHandler;

        this.buttonStatus = options.initialStatus || ButtonStatus.READY;
    }

    mouseClicked(mouseX: number, mouseY: number, caller: any): boolean {
        if (
            (
                this.getStatus() === ButtonStatus.READY
                || this.getStatus() === ButtonStatus.ACTIVE
                || this.getStatus() === ButtonStatus.HOVER
            ) &&
            this.isMouseOnButton(mouseX, mouseY)
        ) {
            this.onClickHandler(mouseX, mouseY, this, caller);
            return true;
        }
        return false;
    }

    mouseMoved(mouseX: number, mouseY: number, caller: any): boolean {
        if (!this.hoverLabel) {
            return false;
        }

        if (
            this.getStatus() === ButtonStatus.READY
            && this.isMouseOnButton(mouseX, mouseY)
        ) {
            this.setStatus(ButtonStatus.HOVER);
            if (this.onMoveHandler) {
                this.onMoveHandler(mouseX, mouseY, this, caller);
            }
            return true;
        }

        if (
            this.getStatus() === ButtonStatus.HOVER
            && !this.isMouseOnButton(mouseX, mouseY)
        ) {
            this.setStatus(ButtonStatus.READY);
        }

        return false;
    }

    setStatus(status: ButtonStatus): void {
        this.buttonStatus = status;
    }

    getStatus(): ButtonStatus {
        return this.buttonStatus;
    }

    draw(graphicsContext: GraphicsContext) {
        LabelHelper.draw(this.getCurrentLabel(), graphicsContext);
    }

    private getCurrentLabel(): Label {
        const labelByStatus = {
            [ButtonStatus.READY]: this.readyLabel,
            [ButtonStatus.ACTIVE]: this.activeLabel,
            [ButtonStatus.DISABLED]: this.disabledLabel,
            [ButtonStatus.HOVER]: this.hoverLabel,
        }

        return labelByStatus[this.getStatus()];
    }

    private isMouseOnButton(mouseX: number, mouseY: number): boolean {
        const label = this.getCurrentLabel();
        return RectAreaHelper.isInside(label.rectangle.area, mouseX, mouseY);
    }
}
