import {RectArea} from "./rectArea";
import p5 from "p5";

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
            this.area.getLeft(),
            this.area.getTop(),
            this.area.getWidth(),
            this.area.getHeight(),
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

