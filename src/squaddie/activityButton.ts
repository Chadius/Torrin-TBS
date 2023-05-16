import {RectArea} from "../ui/rectArea";
import {SquaddieActivity} from "./activity";
import {endTurnActivity} from "./endTurnActivity";
import {Rectangle} from "../ui/rectangle";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {SquaddieAffiliation} from "./squaddieAffiliation";

export type ActivityButtonOptions = {
    buttonArea: RectArea;
    activity: SquaddieActivity;
    hue: number;
    isEndTurn: boolean;
};

export class ActivityButton {
    buttonArea: RectArea;
    activity: SquaddieActivity;
    hue: number;

    constructor(options: Partial<ActivityButtonOptions> = {}) {
        this.buttonArea = options.buttonArea;
        this.activity = options.activity;
        this.hue = options.hue !== undefined ? options.hue : HUE_BY_SQUADDIE_AFFILIATION[SquaddieAffiliation.UNKNOWN];

        if (options.isEndTurn) {
            this.activity = endTurnActivity;
        }
    }

    draw(p: p5) {
        const background = new Rectangle({
            area: this.buttonArea,
            fillColor: [this.hue, 40, 60],
            strokeColor: [0, 0, 0],
            strokeWeight: 0,
        });

        background.draw(p);

        p.push();
        const textLeft: number = background.area.getLeft();
        const textTop: number = background.area.getBottom() + 16;

        p.textSize(12);
        p.fill("#efefef");

        p.text(this.activity.name, textLeft, textTop);

        p.pop();
    }
}
