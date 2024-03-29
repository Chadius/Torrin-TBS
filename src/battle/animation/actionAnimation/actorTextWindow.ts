import {RectAreaService} from "../../../ui/rectArea";
import {ActionAnimationFontColor, ActionAnimationPhase} from "./actionAnimationConstants";
import {BattleSquaddie} from "../../battleSquaddie";
import {WINDOW_SPACING1, WINDOW_SPACING2} from "../../../ui/constants";
import {ScreenDimensions} from "../../../utils/graphics/graphicsConfig";
import {Label, LabelHelper} from "../../../ui/label";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../../../graphicsConstants";
import {ActionTimer} from "./actionTimer";
import {GraphicsContext} from "../../../utils/graphics/graphicsContext";
import {SquaddieTemplate} from "../../../campaign/squaddieTemplate";
import {SquaddieSquaddieResults} from "../../history/squaddieSquaddieResults";
import {ActionResultTextService} from "../actionResultTextService";

export class ActorTextWindow {
    results: SquaddieSquaddieResults;
    actorTemplate: SquaddieTemplate;
    actorBattle: BattleSquaddie;
    actionTemplateName: string;

    constructor() {

    }

    private _backgroundHue: number;

    get backgroundHue(): number {
        return this._backgroundHue;
    }

    private _actorUsesActionDescriptionText: string;

    get actorUsesActionDescriptionText(): string {
        return this._actorUsesActionDescriptionText;
    }

    private _actorLabel: Label;

    get actorLabel(): Label {
        return this._actorLabel;
    }

    reset() {
        this.actorTemplate = undefined;
        this.actorBattle = undefined;
        this.actionTemplateName = undefined;
        this.results = undefined;
        this._actorLabel = undefined;
        this._actorUsesActionDescriptionText = "";
    }

    start({actorTemplate, actorBattle, actionTemplateName, results}: {
        actorTemplate: SquaddieTemplate,
        actorBattle: BattleSquaddie,
        actionTemplateName: string,
        results: SquaddieSquaddieResults,
    }) {
        this.reset();

        this.actorTemplate = actorTemplate;
        this.actorBattle = actorBattle;
        this.actionTemplateName = actionTemplateName;
        this.results = results;

        const actorName: string = actorTemplate.squaddieId.name;

        this._actorUsesActionDescriptionText = `${actorName} uses\n${actionTemplateName}`;
        this._backgroundHue = HUE_BY_SQUADDIE_AFFILIATION[actorTemplate.squaddieId.affiliation];
        this.results = results;

        this.updateActorLabel({});
    }

    draw(graphicsContext: GraphicsContext, timer: ActionTimer) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return;
        }

        this.updateActorLabel({timer});
        LabelHelper.draw(this.actorLabel, graphicsContext);
    }

    private updateActorLabel({timer}: { timer?: ActionTimer }) {
        const actorUsesActionDescriptionText = ActionResultTextService.calculateActorUsesActionDescriptionText({
            timer,
            actionTemplateName: this.actionTemplateName,
            actorTemplate: this.actorTemplate,
            results: this.results,
        });
        if (this.actorLabel && this.actorUsesActionDescriptionText === actorUsesActionDescriptionText) {
            return;
        }
        this._actorUsesActionDescriptionText = actorUsesActionDescriptionText;

        const labelBackgroundColor = [
            this.backgroundHue,
            10,
            80
        ];

        this._actorLabel = LabelHelper.new({
            padding: WINDOW_SPACING1,
            area: RectAreaService.new({
                startColumn: 4,
                endColumn: 5,
                top: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                height: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                margin: [WINDOW_SPACING1, WINDOW_SPACING1, 0, 0],
            }),
            text: this.actorUsesActionDescriptionText,
            textSize: WINDOW_SPACING2,
            fillColor: labelBackgroundColor,
            fontColor: ActionAnimationFontColor,
        });
    }
}
