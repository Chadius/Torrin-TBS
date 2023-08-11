import {RectArea} from "./rectArea";
import p5 from "p5";

export const scaleImageWidth = ({
                                    imageWidth,
                                    imageHeight,
                                    desiredHeight,
                                }: {
    imageWidth: number,
    imageHeight: number,
    desiredHeight: number,
}): number => {
    return imageWidth * desiredHeight / imageHeight;
}

export const scaleImageHeight = ({
                                     imageWidth,
                                     imageHeight,
                                     desiredWidth,
                                 }: {
    imageWidth: number,
    imageHeight: number,
    desiredWidth: number,
}): number => {
    return imageHeight * desiredWidth / imageWidth;
}

export class ImageUI {
    graphic: p5.Image;
    area: RectArea;
    tintColor: number[];

    constructor({
                    graphic,
                    area,
                }: {
        graphic: p5.Image;
        area: RectArea;
    }) {
        this.graphic = graphic;
        this.area = area;
        this.tintColor = [];
    }

    draw(p: p5) {
        if (this.tintColor) {
            p.tint(
                this.tintColor[0],
                this.tintColor[1],
                this.tintColor[2],
                this.tintColor.length > 3 ? this.tintColor[3] : 255
            );
        }
        p.image(
            this.graphic,
            this.area.left,
            this.area.top,
            this.area.width,
            this.area.height,
        );
        if (this.tintColor) {
            p.noTint();
        }
    }

    setTint(hue: number, saturation: number, brightness: number, alpha: number = 255) {
        this.tintColor = [hue, saturation, brightness, alpha];
    }

    getTint() {
        return [...this.tintColor]
    }

    removeTint() {
        this.tintColor = [];
    }
}

