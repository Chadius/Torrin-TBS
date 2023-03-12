import {RectArea} from "./rectArea";

type RequiredOptions = {
    graphic: p5.Image;
    area: RectArea;
}

export type ImageUIOptions = RequiredOptions;

export class ImageUI {
    graphic: p5.Image;
    area: RectArea;

    constructor(options: ImageUIOptions) {
        this.graphic = options.graphic;
        this.area = options.area;
    }

    draw(p: p5) {
        p.image(
            this.graphic,
            this.area.getLeft(),
            this.area.getTop(),
        );
    }
}

