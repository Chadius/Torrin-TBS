import {RectArea} from "./rectArea";
import {GraphicImage, GraphicsContext} from "../utils/graphics/graphicsContext";

export const ScaleImageWidth = ({
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

export const ScaleImageHeight = ({
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
    graphic: GraphicImage;
    area: RectArea;
    tintColor: number[];

    constructor({
                    graphic,
                    area,
                }: {
        graphic: GraphicImage;
        area: RectArea;
    }) {
        this.graphic = graphic;
        this.area = area;
        this.tintColor = [];
    }

    draw(graphicsContext: GraphicsContext) {
        if (this.tintColor) {
            graphicsContext.tint(
                this.tintColor[0],
                this.tintColor[1],
                this.tintColor[2],
                this.tintColor.length > 3 ? this.tintColor[3] : 255
            );
        }
        graphicsContext.image(
            this.graphic,
            this.area.left,
            this.area.top,
            this.area.width,
            this.area.height,
        );
        if (this.tintColor) {
            graphicsContext.noTint();
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

