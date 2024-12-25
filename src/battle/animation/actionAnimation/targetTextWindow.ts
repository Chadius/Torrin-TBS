import { RectAreaService } from "../../../ui/rectArea"
import {
    ActionAnimationFontColor,
    ActionAnimationPhase,
} from "./actionAnimationConstants"
import { BattleSquaddie } from "../../battleSquaddie"
import { WINDOW_SPACING } from "../../../ui/constants"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { Label, LabelService } from "../../../ui/label"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../graphicsConstants"
import { ActionTimer } from "./actionTimer"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { ActionResultTextService } from "../actionResultTextService"
import { ActionEffectTemplate } from "../../../action/template/actionEffectTemplate"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { BattleActionSquaddieChange } from "../../history/battleAction/battleActionSquaddieChange"

export class TargetTextWindow {
    private _result: BattleActionSquaddieChange

    get result(): BattleActionSquaddieChange {
        return this._result
    }

    private _backgroundHue: number

    get backgroundHue(): number {
        return this._backgroundHue
    }

    private _targetBeforeActionText: string

    get targetBeforeActionText(): string {
        return this._targetBeforeActionText
    }

    private _targetAfterActionText: string

    get targetAfterActionText(): string {
        return this._targetAfterActionText
    }

    private _targetLabel: Label

    get targetLabel(): Label {
        return this._targetLabel
    }

    reset() {
        this._targetLabel = undefined
        this._targetBeforeActionText = ""
        this._targetAfterActionText = ""
    }

    start({
        targetTemplate,
        targetBattle,
        result,
        actionEffectSquaddieTemplate,
    }: {
        targetTemplate: SquaddieTemplate
        targetBattle: BattleSquaddie
        result: BattleActionSquaddieChange
        actionEffectSquaddieTemplate: ActionEffectTemplate
    }) {
        this.reset()

        this.createBeforeActionText({
            targetTemplate,
            targetBattle,
            result,
            actionEffectSquaddieTemplate,
        })
        this._backgroundHue =
            HUE_BY_SQUADDIE_AFFILIATION[targetTemplate.squaddieId.affiliation]

        this._result = result
        this.createActorTextBox()
    }

    draw(graphicsContext: GraphicsBuffer, timer: ActionTimer) {
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return
        }

        if (
            timer.currentPhase === ActionAnimationPhase.TARGET_REACTS &&
            this.targetAfterActionText === ""
        ) {
            this.updateCreateActorTextBox()
        }

        LabelService.draw(this.targetLabel, graphicsContext)
    }

    private createBeforeActionText({
        targetTemplate,
        targetBattle,
        result,
        actionEffectSquaddieTemplate,
    }: {
        targetTemplate: SquaddieTemplate
        targetBattle: BattleSquaddie
        result: BattleActionSquaddieChange
        actionEffectSquaddieTemplate: ActionEffectTemplate
    }) {
        this._targetBeforeActionText =
            ActionResultTextService.getBeforeActionText({
                targetTemplate,
                targetBattle,
                actionEffectSquaddieTemplate: actionEffectSquaddieTemplate,
            })
    }

    private createActorTextBox() {
        const labelBackgroundColor = [this.backgroundHue, 10, 80]

        this._targetLabel = LabelService.new({
            textBoxMargin: WINDOW_SPACING.SPACING1,
            area: RectAreaService.new({
                startColumn: 6,
                endColumn: 7,
                top: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                height: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                margin: [
                    WINDOW_SPACING.SPACING1,
                    0,
                    0,
                    WINDOW_SPACING.SPACING1,
                ],
            }),
            text: this.targetBeforeActionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fillColor: labelBackgroundColor,
            fontColor: ActionAnimationFontColor,
        })
    }

    private updateCreateActorTextBox() {
        this._targetAfterActionText =
            ActionResultTextService.getAfterActionText({
                result: this._result,
            })

        this.targetLabel.textBox.text = `${this.targetBeforeActionText}\n${this.targetAfterActionText}`
    }
}
