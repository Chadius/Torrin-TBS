import {RectArea} from "../ui/rectArea";
import {SquaddieActivity} from "./activity";
import {Rectangle} from "../ui/rectangle";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {SquaddieEndTurnActivity} from "../battle/history/squaddieEndTurnActivity";

export class ActivityButton {
    buttonArea: RectArea;
    activity: SquaddieActivity | SquaddieEndTurnActivity;
    hue: number;

    constructor(options: {
        buttonArea?: RectArea;
        activity?: SquaddieActivity | SquaddieEndTurnActivity;
        hue?: number;
    }) {
        this.buttonArea = options.buttonArea;
        this.activity = options.activity;
        this.hue = options.hue !== undefined ? options.hue : HUE_BY_SQUADDIE_AFFILIATION[SquaddieAffiliation.UNKNOWN];
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

        if (this.activity instanceof SquaddieEndTurnActivity) {
            p.text("End Turn", textLeft, textTop);
        } else {
            p.text(this.activity.name, textLeft, textTop);
        }

        p.pop();
    }
}
