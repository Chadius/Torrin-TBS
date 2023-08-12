import p5 from "p5";
import {
    ACTION_ANIMATION_ATTACK_TIME, ActionAnimationFontColor,
    ACTOR_X_SCREEN_COLUMN_END,
    ACTOR_X_SCREEN_COLUMN_START
} from "./abilityAnimationConstants";
import {ScreenDimensions} from "../../../utils/graphicsConfig";
import {RectArea} from "../../../ui/rectArea";
import {TextBox} from "../../../ui/textBox";
import {VERT_ALIGN_CENTER, WINDOW_SPACING1, WINDOW_SPACING2} from "../../../ui/constants";

export class WeaponIcon {
    get attackingTextBox(): TextBox {
        return this._attackingTextBox;
    }
    get animationStartTime(): number {
        return this._animationStartTime;
    }
    get actorIconArea(): RectArea {
        return this._actorIconArea;
    }
    private _animationStartTime: number
    private _actorIconArea: RectArea;
    private _attackingTextBox: TextBox;
    constructor() {
        this.reset();
    }

    reset () {
        this._animationStartTime = undefined;
        this._attackingTextBox = undefined;
    }

    start ({actorIconArea}: {actorIconArea: RectArea}) {
        this._animationStartTime = Date.now();
        this._actorIconArea = actorIconArea;
    }

    draw(graphicsContext: p5) {
        if (this._animationStartTime === undefined) {
            return;
        }

        const timeElapsed = Math.min(Date.now() - this.animationStartTime, ACTION_ANIMATION_ATTACK_TIME);

        const lerpX: number = (
            ScreenDimensions.SCREEN_WIDTH * ACTOR_X_SCREEN_COLUMN_START / 12,
            - ScreenDimensions.SCREEN_WIDTH * ACTOR_X_SCREEN_COLUMN_END / 12
        ) * (timeElapsed / ACTION_ANIMATION_ATTACK_TIME);

        const startPosition = ScreenDimensions.SCREEN_WIDTH * ACTOR_X_SCREEN_COLUMN_START / 12;

        if (this.attackingTextBox === undefined) {
            this.lazyLoadAttackingTextBox();
        }

        this.attackingTextBox.area.move({
            left: startPosition + lerpX,
            top: this.attackingTextBox.area.top,
        });
        this.attackingTextBox.draw(graphicsContext);
    }

    private lazyLoadAttackingTextBox() {
        this._attackingTextBox = new TextBox({
            area: new RectArea({
                left: this.actorIconArea.right + WINDOW_SPACING1,
                top: this.actorIconArea.centerY,
                height: WINDOW_SPACING2,
                width: WINDOW_SPACING1 * 30,
            }),
            text: "Attacking!",
            textSize: WINDOW_SPACING2,
            fontColor: ActionAnimationFontColor,
            vertAlign: VERT_ALIGN_CENTER,
        });
    }
}
