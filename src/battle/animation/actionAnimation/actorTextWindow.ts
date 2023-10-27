import {RectArea} from "../../../ui/rectArea";
import {ActionAnimationFontColor, ActionAnimationPhase} from "./actionAnimationConstants";
import {BattleSquaddie} from "../../battleSquaddie";
import {SquaddieActionData} from "../../../squaddie/action";
import {WINDOW_SPACING1, WINDOW_SPACING2} from "../../../ui/constants";
import {ScreenDimensions} from "../../../utils/graphics/graphicsConfig";
import {Label} from "../../../ui/label";
import {HUE_BY_SQUADDIE_AFFILIATION} from "../../../graphicsConstants";
import {ActionTimer} from "./actionTimer";
import {GraphicsContext} from "../../../utils/graphics/graphicsContext";
import {SquaddieTemplate} from "../../../campaign/squaddieTemplate";

export class ActorTextWindow {
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
        this._actorLabel = undefined;
        this._actorUsesActionDescriptionText = "";
    }

    start({actorTemplate, actorBattle, action}: {
        actorTemplate: SquaddieTemplate,
        actorBattle: BattleSquaddie,
        action: SquaddieActionData,
    }) {
        this.reset();

        const actorName: string = actorTemplate.squaddieId.name;
        const actionName: string = action.name;

        this._actorUsesActionDescriptionText = `${actorName} uses\n${actionName}`;
        this._backgroundHue = HUE_BY_SQUADDIE_AFFILIATION[actorTemplate.squaddieId.affiliation];

        this.createActorLabel();
    }

    draw(graphicsContext: GraphicsContext, timer: ActionTimer) {
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
            text: this.actorUsesActionDescriptionText,
            textSize: WINDOW_SPACING2,
            fillColor: labelBackgroundColor,
            fontColor: ActionAnimationFontColor,
        });
    }
}
