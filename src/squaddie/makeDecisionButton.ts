import {RectArea, RectAreaService} from "../ui/rectArea";
import {RectangleHelper} from "../ui/rectangle";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../graphicsConstants";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {TextBox, TextBoxHelper} from "../ui/textBox";
import {GraphicsContext} from "../utils/graphics/graphicsContext";
import {ButtonStatus} from "../ui/button";
import {ActionTemplate} from "../action/template/actionTemplate";
import {getValidValueOrDefault} from "../utils/validityCheck";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {ImageUI} from "../ui/imageUI";
import {ResourceHandler} from "../resource/resourceHandler";
import {ActionEffectType} from "../action/template/actionEffectTemplate";
import {ActionEffectSquaddieTemplate} from "../action/template/actionEffectSquaddieTemplate";

const DECISION_BUTTON_LAYOUT_COLORS = {
    strokeSaturation: 50,
    strokeBrightness: 100,
    strokeWeight: 4,
    fillSaturation: 50,
    fillBrightness: 100,
    fillAlpha: 127,
    templateNameTextTopMargin: 4,
    templateNameTextSize: 12,
    templateNameFontColor: [0, 0, 192],
    infoTextTopMargin: 12,
    infoTextSize: 10,
    infoFontColor: [0, 0, 192 - 64],
}

export class MakeDecisionButton {
    buttonArea: RectArea;
    actionTemplate: ActionTemplate;
    hue: number;
    buttonIconResourceKey: string;
    buttonIcon: ImageUI;
    name: string;

    constructor({
                    buttonArea,
                    actionTemplate,
                    hue,
                    resourceHandler,
                    buttonIconResourceKey,
                }: {
        buttonArea?: RectArea;
        actionTemplate: ActionTemplate;
        hue?: number;
        buttonIconResourceKey: string;
        resourceHandler: ResourceHandler;
    }) {
        this.buttonArea = buttonArea;
        this.actionTemplate = actionTemplate;
        this.hue = getValidValueOrDefault(
            hue,
            HUE_BY_SQUADDIE_AFFILIATION[SquaddieAffiliation.UNKNOWN]
        );
        this.buttonIconResourceKey = buttonIconResourceKey;
        this.createButtonGraphic(resourceHandler);
        this.buttonArea = RectAreaService.new({
            left: this.buttonIcon.area.left,
            top: this.buttonIcon.area.top,
            width: this.buttonIcon.area.width,
            height: this.buttonIcon.area.height,
        });
    }

    private _status: ButtonStatus;

    get status(): ButtonStatus {
        return this._status;
    }

    set status(value: ButtonStatus) {
        this._status = value;
    }

    draw(graphicsContext: GraphicsContext) {
        this.buttonIcon.draw(graphicsContext);

        if (this.status === ButtonStatus.HOVER) {
            const hoverOutline = RectangleHelper.new({
                area: this.buttonArea,
                strokeColor: [
                    this.hue,
                    DECISION_BUTTON_LAYOUT_COLORS.strokeSaturation,
                    DECISION_BUTTON_LAYOUT_COLORS.strokeBrightness,
                ],
                fillColor: [
                    this.hue,
                    DECISION_BUTTON_LAYOUT_COLORS.fillSaturation,
                    DECISION_BUTTON_LAYOUT_COLORS.fillBrightness,
                    DECISION_BUTTON_LAYOUT_COLORS.fillAlpha,
                ],
                strokeWeight: DECISION_BUTTON_LAYOUT_COLORS.strokeWeight,
            });

            RectangleHelper.draw(hoverOutline, graphicsContext);
        }

        let actionDescription = this.actionTemplate.name;
        const buttonTextBox: TextBox = TextBoxHelper.new({
            area: RectAreaService.new({
                left: RectAreaService.left(this.buttonIcon.area),
                top: RectAreaService.bottom(this.buttonIcon.area) + DECISION_BUTTON_LAYOUT_COLORS.templateNameTextTopMargin,
                width: RectAreaService.width(this.buttonIcon.area) * 2,
                height: DECISION_BUTTON_LAYOUT_COLORS.templateNameTextSize * 1.5,
            }),
            fontColor: DECISION_BUTTON_LAYOUT_COLORS.templateNameFontColor,
            text: actionDescription,
            textSize: DECISION_BUTTON_LAYOUT_COLORS.templateNameTextSize,
        });
        TextBoxHelper.draw(buttonTextBox, graphicsContext);

        let infoTextTop = RectAreaService.bottom(buttonTextBox.area) + DECISION_BUTTON_LAYOUT_COLORS.infoTextTopMargin;
        if (this.actionTemplate.actionPoints !== 1) {
            this.drawActionPoints(graphicsContext, infoTextTop);
            infoTextTop += (DECISION_BUTTON_LAYOUT_COLORS.infoTextSize * 1.5) + DECISION_BUTTON_LAYOUT_COLORS.infoTextTopMargin;
        }

        const templateRange = this.getActionTemplateRange();
        const minRangeIsWorthDescribing =
            templateRange.minimumRange === undefined
            || templateRange.minimumRange > 1;
        const maxRangeIsWorthDescribing =
            templateRange.maximumRange === undefined
            || templateRange.maximumRange > 1;
        if (minRangeIsWorthDescribing || maxRangeIsWorthDescribing) {
            this.drawActionRange(graphicsContext, infoTextTop, templateRange.minimumRange || 0, templateRange.maximumRange || 0);
        }
    }

    drawActionPoints(graphicsContext: GraphicsContext, top: number) {
        const buttonTextBox: TextBox = TextBoxHelper.new({
            area: RectAreaService.new({
                left: RectAreaService.left(this.buttonIcon.area),
                top: top,
                width: RectAreaService.width(this.buttonIcon.area) * 2,
                height: DECISION_BUTTON_LAYOUT_COLORS.infoTextSize * 1.5,
            }),
            fontColor: DECISION_BUTTON_LAYOUT_COLORS.infoFontColor,
            text: `Action Points: ${this.actionTemplate.actionPoints}`,
            textSize: DECISION_BUTTON_LAYOUT_COLORS.infoTextSize,
        });
        TextBoxHelper.draw(buttonTextBox, graphicsContext);
    }

    getActionTemplateRange(): {
        minimumRange: number;
        maximumRange: number;
    } {
        const actionEffectSquaddieTemplates = this.actionTemplate.actionEffectTemplates
            .filter(actionEffectTemplate => actionEffectTemplate.type === ActionEffectType.SQUADDIE)
            .map(actionEffectSquaddieTemplate => actionEffectSquaddieTemplate as ActionEffectSquaddieTemplate);

        return {
            minimumRange: Math.min(...actionEffectSquaddieTemplates.map(actionEffectSquaddieTemplate => actionEffectSquaddieTemplate.minimumRange)),
            maximumRange: Math.max(...actionEffectSquaddieTemplates.map(actionEffectSquaddieTemplate => actionEffectSquaddieTemplate.maximumRange)),
        };
    }

    drawActionRange(graphicsContext: GraphicsContext, top: number, minimumRange: number, maximumRange: number) {
        const buttonTextBox: TextBox = TextBoxHelper.new({
            area: RectAreaService.new({
                left: RectAreaService.left(this.buttonIcon.area),
                top: top,
                width: RectAreaService.width(this.buttonIcon.area) * 2,
                height: DECISION_BUTTON_LAYOUT_COLORS.infoTextSize * 1.5,
            }),
            fontColor: DECISION_BUTTON_LAYOUT_COLORS.infoFontColor,
            text: `Range: ${minimumRange} - ${maximumRange}`,
            textSize: DECISION_BUTTON_LAYOUT_COLORS.infoTextSize,
        });
        TextBoxHelper.draw(buttonTextBox, graphicsContext);
    }

    createButtonGraphic(resourceHandler: ResourceHandler) {
        const image = getResultOrThrowError(resourceHandler.getResource(this.buttonIconResourceKey));
        this.buttonIcon = new ImageUI({
            graphic: image,
            area: RectAreaService.new({
                left: this.buttonArea.left,
                top: this.buttonArea.top,
                width: image.width,
                height: image.height,
            })
        });
    }
}
