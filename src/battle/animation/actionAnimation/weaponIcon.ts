import p5 from "p5";
import {
    ACTION_ANIMATION_ATTACK_TIME,
    ACTION_ANIMATION_DELAY_TIME,
    ActionAnimationFontColor,
    ActionAnimationPhase,
    TimeElapsedSinceAnimationStarted
} from "./actionAnimationConstants";
import {ScreenDimensions} from "../../../utils/graphicsConfig";
import {RectArea} from "../../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER, WINDOW_SPACING1, WINDOW_SPACING2} from "../../../ui/constants";
import {ActionTimer} from "./actionTimer";
import {Label} from "../../../ui/label";

export class WeaponIcon {
    constructor() {
        this.reset();
    }

    private _startPosition: number;

    get startPosition(): number {
        return this._startPosition;
    }

    private _actorIconArea: RectArea;

    get actorIconArea(): RectArea {
        return this._actorIconArea;
    }

    private _attackingLabel: Label;

    get attackingLabel(): Label {
        return this._attackingLabel;
    }

    reset() {
        this._attackingLabel = undefined;
        this._startPosition = undefined;
        this._actorIconArea = undefined;
    }

    start({actorIconArea}: { actorIconArea: RectArea }) {
        this._actorIconArea = actorIconArea;
    }

    draw(graphicsContext: p5, timer: ActionTimer) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return;
        }

        if (this.attackingLabel === undefined) {
            this.lazyLoadAttackingTextBox();
        }

        const timeElapsed = TimeElapsedSinceAnimationStarted(timer.startTime);

        let horizontalDistance: number = 0;
        switch (timer.currentPhase) {
            case ActionAnimationPhase.BEFORE_ACTION:
                horizontalDistance = 0;
                break;
            case ActionAnimationPhase.DURING_ACTION:
                const attackTime = timeElapsed - ACTION_ANIMATION_DELAY_TIME;
                horizontalDistance =
                    ((6 * ScreenDimensions.SCREEN_WIDTH / 12) - this.startPosition)
                    * (attackTime / ACTION_ANIMATION_ATTACK_TIME);
                break;
            case ActionAnimationPhase.AFTER_ACTION:
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                horizontalDistance = ((6 * ScreenDimensions.SCREEN_WIDTH / 12) - this.startPosition);
        }

        this.attackingLabel.rectangle.area.move({
            left: this.startPosition + horizontalDistance,
            top: this.attackingLabel.rectangle.area.top,
        });
        this.attackingLabel.textBox.area.move({
            left: this.startPosition + horizontalDistance,
            top: this.attackingLabel.rectangle.area.top,
        });
        this.attackingLabel.draw(graphicsContext);
    }

    private lazyLoadAttackingTextBox() {
        const labelBackgroundColor = [
            0,
            10,
            80
        ];

        this._startPosition = this.actorIconArea.right + WINDOW_SPACING1;

        this._attackingLabel = new Label({
            padding: 0,
            area: new RectArea({
                left: this._startPosition,
                top: this.actorIconArea.centerY,
                height: WINDOW_SPACING2,
                width: WINDOW_SPACING1 * 15,
            }),
            text: "Attacking!",
            textSize: WINDOW_SPACING2,
            vertAlign: VERT_ALIGN_CENTER,
            horizAlign: HORIZ_ALIGN_CENTER,
            fillColor: labelBackgroundColor,
            fontColor: ActionAnimationFontColor,
        });
    }
}
