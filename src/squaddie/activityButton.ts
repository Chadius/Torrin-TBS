import {RectArea} from "../ui/rectArea";
import {SquaddieActivity} from "./activity";
import {Rectangle} from "../ui/rectangle";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {SquaddieEndTurnActivity} from "../battle/history/squaddieEndTurnActivity";
import {TextBox} from "../ui/textBox";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {ButtonStatus} from "../ui/button";

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

    private _status: ButtonStatus;

    get status(): ButtonStatus {
        return this._status;
    }

    set status(value: ButtonStatus) {
        this._status = value;
    }

    draw(graphicsContext: GraphicsContext) {
        const background = new Rectangle({
            area: this.buttonArea,
            fillColor: [this.hue, 40, 60],
            strokeColor: [0, 0, 0],
            strokeWeight: 0,
        });

        background.draw(graphicsContext);

        if (
            this.status === ButtonStatus.HOVER
        ) {
            const hoverOutline = new Rectangle({
                area: this.buttonArea,
                strokeColor: [255, 255, 255],
                strokeWeight: 4,
            });

            hoverOutline.draw(graphicsContext);
        }

        let activityButtonText: string;
        if (this.activity instanceof SquaddieEndTurnActivity) {
            activityButtonText = "End Turn";
        } else {
            activityButtonText = this.activity.name;
        }

        const buttonTextBox: TextBox = new TextBox({
            area: new RectArea({
                left: background.area.left,
                top: background.area.bottom + 4,
                width: background.area.width * 2,
                height: background.area.height,
            }),
            fontColor: [0, 0, 192],
            text: activityButtonText,
            textSize: 12,
        });

        buttonTextBox.draw(graphicsContext);
    }
}
