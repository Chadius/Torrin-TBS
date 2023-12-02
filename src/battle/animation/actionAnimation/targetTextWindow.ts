import {RectArea} from "../../../ui/rectArea";
import {ActionAnimationFontColor, ActionAnimationPhase} from "./actionAnimationConstants";
import {BattleSquaddie} from "../../battleSquaddie";
import {WINDOW_SPACING1, WINDOW_SPACING2} from "../../../ui/constants";
import {ScreenDimensions} from "../../../utils/graphics/graphicsConfig";
import {Label} from "../../../ui/label";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../../../graphicsConstants";
import {ActionResultPerSquaddie, DegreeOfSuccess} from "../../history/actionResultPerSquaddie";
import {ActionTimer} from "./actionTimer";
import {GraphicsContext} from "../../../utils/graphics/graphicsContext";
import {SquaddieTemplate} from "../../../campaign/squaddieTemplate";
import {SquaddieAction, SquaddieActionHandler} from "../../../squaddie/action";

export class TargetTextWindow {
    constructor() {

    }

    private _result: ActionResultPerSquaddie;

    get result(): ActionResultPerSquaddie {
        return this._result;
    }

    private _backgroundHue: number;

    get backgroundHue(): number {
        return this._backgroundHue;
    }

    private _targetBeforeActionText: string;

    get targetBeforeActionText(): string {
        return this._targetBeforeActionText;
    }

    private _targetAfterActionText: string;

    get targetAfterActionText(): string {
        return this._targetAfterActionText;
    }

    private _targetLabel: Label;

    get targetLabel(): Label {
        return this._targetLabel;
    }

    reset() {
        this._targetLabel = undefined;
        this._targetBeforeActionText = "";
        this._targetAfterActionText = "";
    }

    start({targetTemplate, targetBattle, result, action}: {
        targetTemplate: SquaddieTemplate,
        targetBattle: BattleSquaddie,
        result: ActionResultPerSquaddie,
        action: SquaddieAction,
    }) {
        this.reset();
        const defenderName: string = targetTemplate.squaddieId.name;

        this.createBeforeActionText({targetTemplate, targetBattle, result, action});
        this._backgroundHue = HUE_BY_SQUADDIE_AFFILIATION[targetTemplate.squaddieId.affiliation];

        this._result = result;
        this.createActorTextBox();
    }

    draw(graphicsContext: GraphicsContext, timer: ActionTimer) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return;
        }

        if (timer.currentPhase === ActionAnimationPhase.TARGET_REACTS && this.targetAfterActionText === "") {
            this.updateCreateActorTextBox();
        }

        this.targetLabel.draw(graphicsContext);
    }

    private createBeforeActionText({targetTemplate, targetBattle, result, action}: {
        targetTemplate: SquaddieTemplate,
        targetBattle: BattleSquaddie,
        result: ActionResultPerSquaddie,
        action: SquaddieAction,
    }) {
        this._targetBeforeActionText = `${targetTemplate.squaddieId.name}`;

        if (SquaddieActionHandler.isHindering(action)) {
            this._targetBeforeActionText += `\nAC ${targetBattle.inBattleAttributes.armyAttributes.armorClass}`;
        }
    }

    private createActorTextBox() {
        const labelBackgroundColor = [
            this.backgroundHue,
            10,
            80
        ];

        this._targetLabel = new Label({
            padding: WINDOW_SPACING1,
            area: new RectArea({
                startColumn: 6,
                endColumn: 7,
                top: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                height: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                margin: [WINDOW_SPACING1, 0, 0, WINDOW_SPACING1],
            }),
            text: this.targetBeforeActionText,
            textSize: WINDOW_SPACING2,
            fillColor: labelBackgroundColor,
            fontColor: ActionAnimationFontColor,
        });
    }

    private updateCreateActorTextBox() {
        this._targetAfterActionText = "";

        switch (this.result.actorDegreeOfSuccess) {
            case DegreeOfSuccess.FAILURE:
                this._targetAfterActionText = `MISS`;
                break;
            case DegreeOfSuccess.SUCCESS:
                if (this.result.damageTaken === 0 && this.result.healingReceived === 0) {
                    this._targetAfterActionText = `NO DAMAGE`;
                } else if (this.result.damageTaken > 0) {
                    this._targetAfterActionText = `${this.result.damageTaken} damage`;
                }
                break;
            default:
                break;
        }

        if (this.result.healingReceived > 0) {
            this._targetAfterActionText += `${this.result.healingReceived} healed`;
        }

        this.targetLabel.textBox.text = `${this.targetBeforeActionText}\n${this.targetAfterActionText}`;
    }
}
