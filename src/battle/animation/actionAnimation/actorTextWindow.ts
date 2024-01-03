import {RectAreaHelper} from "../../../ui/rectArea";
import {ActionAnimationFontColor, ActionAnimationPhase} from "./actionAnimationConstants";
import {BattleSquaddie} from "../../battleSquaddie";
import {SquaddieSquaddieAction} from "../../../squaddie/action";
import {WINDOW_SPACING1, WINDOW_SPACING2} from "../../../ui/constants";
import {ScreenDimensions} from "../../../utils/graphics/graphicsConfig";
import {Label, LabelHelper} from "../../../ui/label";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../../../graphicsConstants";
import {ActionTimer} from "./actionTimer";
import {GraphicsContext} from "../../../utils/graphics/graphicsContext";
import {SquaddieTemplate} from "../../../campaign/squaddieTemplate";
import {SquaddieSquaddieResults} from "../../history/squaddieSquaddieResults";
import {ActionResultTextWriter} from "../actionResultTextWriter";
import {RollResultService} from "../../actionCalculator/rollResult";
import {ActionResultText} from "./actionResultText";

export class ActorTextWindow {
    results: SquaddieSquaddieResults;
    actorTemplate: SquaddieTemplate;
    actorBattle: BattleSquaddie;
    action: SquaddieSquaddieAction;

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
        this.action = undefined;
        this.results = undefined;
        this._actorLabel = undefined;
        this._actorUsesActionDescriptionText = "";
    }

    start({actorTemplate, actorBattle, action, results}: {
        actorTemplate: SquaddieTemplate,
        actorBattle: BattleSquaddie,
        action: SquaddieSquaddieAction,
        results: SquaddieSquaddieResults,
    }) {
        this.reset();

        this.actorTemplate = actorTemplate;
        this.actorBattle = actorBattle;
        this.action = action;
        this.results = results;

        const actorName: string = actorTemplate.squaddieId.name;
        const actionName: string = action.name;

        this._actorUsesActionDescriptionText = `${actorName} uses\n${actionName}`;
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
        const actorUsesActionDescriptionText = this.calculateActorUsesActionDescriptionText({timer});
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
            area: RectAreaHelper.new({
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

    private calculateActorUsesActionDescriptionText({timer}: { timer?: ActionTimer }): string {
        let actorUsesActionDescriptionText = ActionResultTextWriter.getSquaddieUsesActionString({
            squaddieTemplate: this.actorTemplate,
            action: this.action,
            newline: true,
        });
        if (!timer) {
            return actorUsesActionDescriptionText;
        }
        if ([
                ActionAnimationPhase.DURING_ACTION,
                ActionAnimationPhase.TARGET_REACTS,
                ActionAnimationPhase.SHOWING_RESULTS,
                ActionAnimationPhase.FINISHED_SHOWING_RESULTS,
            ].includes(timer.currentPhase)
            && this.results.actingSquaddieRoll.occurred
        ) {
            actorUsesActionDescriptionText += `\n\n`;
            actorUsesActionDescriptionText += `   rolls(${this.results.actingSquaddieRoll.rolls[0]}, ${this.results.actingSquaddieRoll.rolls[1]})`;


            const attackPenaltyDescriptions = ActionResultText.getAttackPenaltyDescriptions(this.results.actingSquaddieModifiers);
            if (attackPenaltyDescriptions.length > 0) {
                actorUsesActionDescriptionText += "\n" + attackPenaltyDescriptions.join("\n");
            }

            actorUsesActionDescriptionText += `\n${ActionResultText.getActingSquaddieRollTotalIfNeeded(this.results)}`;

            if (RollResultService.isACriticalSuccess(this.results.actingSquaddieRoll)) {
                actorUsesActionDescriptionText += `\n\nCRITICAL HIT!`;
            }
            if (RollResultService.isACriticalFailure(this.results.actingSquaddieRoll)) {
                actorUsesActionDescriptionText += `\n\nCRITICAL MISS!!`;
            }
        }
        return actorUsesActionDescriptionText;
    }
}
