import {RectArea} from "../../../ui/rectArea";
import p5 from "p5";
import {ActionAnimationFontColor, ActionAnimationPhase} from "./actionAnimationConstants";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../../battleSquaddie";
import {WINDOW_SPACING1, WINDOW_SPACING2, WINDOW_SPACING4} from "../../../ui/constants";
import {ScreenDimensions} from "../../../utils/graphicsConfig";
import {Label} from "../../../ui/label";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../../../graphicsConstants";
import {ActivityResult} from "../../history/activityResult";
import {ActionTimer} from "./actionTimer";

export class TargetTextWindow {
    constructor() {

    }

    private _result: ActivityResult;

    get result(): ActivityResult {
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

    start({targetStatic, targetDynamic, result}: {
        targetStatic: BattleSquaddieStatic,
        targetDynamic: BattleSquaddieDynamic,
        result: ActivityResult,
    }) {
        this.reset();
        const defenderName: string = targetStatic.squaddieId.name;

        this._targetBeforeActionText = `${defenderName}`;
        this._backgroundHue = HUE_BY_SQUADDIE_AFFILIATION[targetStatic.squaddieId.affiliation];

        this._result = result;
        this.createActorTextBox();
    }

    draw(graphicsContext: p5, timer: ActionTimer) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return;
        }

        if (timer.currentPhase === ActionAnimationPhase.TARGET_REACTS && this.targetAfterActionText === "") {
            this.updateCreateActorTextBox();
        }

        this.targetLabel.draw(graphicsContext);
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
                startColumn: 9,
                endColumn: 12,
                top: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                height: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                margin: [WINDOW_SPACING1, WINDOW_SPACING4, 0, 0],
            }),
            text: this.targetBeforeActionText,
            textSize: WINDOW_SPACING2,
            fillColor: labelBackgroundColor,
            fontColor: ActionAnimationFontColor,
        });
    }

    private updateCreateActorTextBox() {
        this._targetAfterActionText = `${this.result.damageTaken} damage`;

        this.targetLabel.textBox.text = `${this.targetBeforeActionText}\n${this.targetAfterActionText}`;
    }
}