import {RectArea, RectAreaHelper} from "../ui/rectArea";
import {SquaddieSquaddieAction} from "./action";
import {RectangleHelper} from "../ui/rectangle";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {SquaddieEndTurnActionData} from "../battle/history/squaddieEndTurnAction";
import {TextBox, TextBoxHelper} from "../ui/textBox";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {ButtonStatus} from "../ui/button";

export class UseActionButton {
    buttonArea: RectArea;
    action: SquaddieSquaddieAction;
    endTurnAction: SquaddieEndTurnActionData;
    hue: number;

    constructor(options: {
        buttonArea?: RectArea;
        action?: SquaddieSquaddieAction;
        endTurnAction?: SquaddieEndTurnActionData;
        hue?: number;
    }) {
        this.buttonArea = options.buttonArea;
        this.action = options.action;
        this.endTurnAction = options.endTurnAction;
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
        const background = RectangleHelper.new({
            area: this.buttonArea,
            fillColor: [this.hue, 40, 60],
            strokeColor: [0, 0, 0],
            strokeWeight: 0,
        });

        RectangleHelper.draw(background, graphicsContext);

        if (
            this.status === ButtonStatus.HOVER
        ) {
            const hoverOutline = RectangleHelper.new({
                area: this.buttonArea,
                strokeColor: [255, 255, 255],
                strokeWeight: 4,
            });

            RectangleHelper.draw(hoverOutline, graphicsContext);
        }

        let actionDescription: string;
        if (this.action != null) {
            actionDescription = this.action.name;
        } else {
            actionDescription = "End Turn";
        }

        const buttonTextBox: TextBox = TextBoxHelper.new({
            area: RectAreaHelper.new({
                left: RectAreaHelper.left(background.area),
                top: RectAreaHelper.bottom(background.area) + 4,
                width: RectAreaHelper.width(background.area) * 2,
                height: RectAreaHelper.height(background.area),
            }),
            fontColor: [0, 0, 192],
            text: actionDescription,
            textSize: 12,
        });

        TextBoxHelper.draw(buttonTextBox, graphicsContext);
    }
}
