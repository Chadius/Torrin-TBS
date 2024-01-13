import {RectArea, RectAreaService} from "../ui/rectArea";
import {ActionEffectSquaddieTemplate} from "../decision/actionEffectSquaddieTemplate";
import {RectangleHelper} from "../ui/rectangle";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {TextBox, TextBoxHelper} from "../ui/textBox";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {ButtonStatus} from "../ui/button";

export class MakeDecisionButton {
    buttonArea: RectArea;
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate;
    hue: number;

    constructor(options: {
        buttonArea?: RectArea;
        actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate;
        hue?: number;
    }) {
        this.buttonArea = options.buttonArea;
        this.actionEffectSquaddieTemplate = options.actionEffectSquaddieTemplate;
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
        actionDescription = this.actionEffectSquaddieTemplate.name;

        const buttonTextBox: TextBox = TextBoxHelper.new({
            area: RectAreaService.new({
                left: RectAreaService.left(background.area),
                top: RectAreaService.bottom(background.area) + 4,
                width: RectAreaService.width(background.area) * 2,
                height: RectAreaService.height(background.area),
            }),
            fontColor: [0, 0, 192],
            text: actionDescription,
            textSize: 12,
        });

        TextBoxHelper.draw(buttonTextBox, graphicsContext);
    }
}
