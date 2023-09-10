import {RectArea} from "../../../ui/rectArea";
import p5 from "p5";
import {ActionAnimationFontColor, ActionAnimationPhase} from "./actionAnimationConstants";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../../battleSquaddie";
import {SquaddieActivity} from "../../../squaddie/activity";
import {WINDOW_SPACING1, WINDOW_SPACING2} from "../../../ui/constants";
import {ScreenDimensions} from "../../../utils/graphics/graphicsConfig";
import {Label} from "../../../ui/label";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../../../graphicsConstants";
import {ActionTimer} from "./actionTimer";

export class ActorTextWindow {
    constructor() {

    }

    private _backgroundHue: number;

    get backgroundHue(): number {
        return this._backgroundHue;
    }

    private _actorUsesActivityText: string;

    get actorUsesActivityText(): string {
        return this._actorUsesActivityText;
    }

    private _actorLabel: Label;

    get actorLabel(): Label {
        return this._actorLabel;
    }

    reset() {
        this._actorLabel = undefined;
        this._actorUsesActivityText = "";
    }

    start({actorStatic, actorDynamic, activity}: {
        actorStatic: BattleSquaddieStatic,
        actorDynamic: BattleSquaddieDynamic,
        activity: SquaddieActivity
    }) {
        this.reset();

        const actorName: string = actorStatic.squaddieId.name;
        const activityName: string = activity.name;

        this._actorUsesActivityText = `${actorName} uses\n${activityName}`;
        this._backgroundHue = HUE_BY_SQUADDIE_AFFILIATION[actorStatic.squaddieId.affiliation];

        this.createActorLabel();
    }

    draw(graphicsContext: p5, timer: ActionTimer) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return;
        }

        if (this.actorLabel === undefined) {
            this.createActorLabel();
        }
        this.actorLabel.draw(graphicsContext);
    }

    private createActorLabel() {
        const labelBackgroundColor = [
            this.backgroundHue,
            10,
            80
        ];

        this._actorLabel = new Label({
            padding: WINDOW_SPACING1,
            area: new RectArea({
                startColumn: 0,
                endColumn: 2,
                top: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                height: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                margin: [WINDOW_SPACING1, 0, 0, WINDOW_SPACING1],
            }),
            text: this.actorUsesActivityText,
            textSize: WINDOW_SPACING2,
            fillColor: labelBackgroundColor,
            fontColor: ActionAnimationFontColor,
        });
    }
}
