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

const TargetTextWindowLayout = {
    top: ScreenDimensions.SCREEN_HEIGHT * 0.33,
    height: ScreenDimensions.SCREEN_HEIGHT * 0.25,
}

export class TargetTextWindow {
    private _result: BattleActionSquaddieChange | undefined

    get result(): BattleActionSquaddieChange | undefined {
        return this._result
    }

    private _backgroundHue: number | undefined

    get backgroundHue(): number | undefined {
        return this._backgroundHue
    }

    private _targetBeforeActionText: string | undefined

    get targetBeforeActionText(): string | undefined {
        return this._targetBeforeActionText
    }

    private _targetAfterActionText: string | undefined

    get targetAfterActionText(): string | undefined {
        return this._targetAfterActionText
    }

    private _targetLabel: Label | undefined

    get targetLabel(): Label | undefined {
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
        result: BattleActionSquaddieChange | undefined
        actionEffectSquaddieTemplate: ActionEffectTemplate
    }) {
        this.reset()

        this.createBeforeActionText({
            targetTemplate,
            targetBattle,
            actionEffectSquaddieTemplate,
        })
        this._backgroundHue =
            HUE_BY_SQUADDIE_AFFILIATION[targetTemplate.squaddieId.affiliation]

        this._result = result
        this.createActorTextBox()
    }

    draw(graphicsContext: GraphicsBuffer, timer: ActionTimer | undefined) {
        if (timer == undefined) return
        if (timer.currentPhase === ActionAnimationPhase.INITIALIZED) {
            return
        }

        if (
            timer.currentPhase === ActionAnimationPhase.TARGET_REACTS &&
            this.targetAfterActionText === ""
        ) {
            this.updateCreateActorTextBox()
        }

        if (this.targetLabel)
            LabelService.draw(this.targetLabel, graphicsContext)
    }

    private createBeforeActionText({
        targetTemplate,
        targetBattle,
        actionEffectSquaddieTemplate,
    }: {
        targetTemplate: SquaddieTemplate
        targetBattle: BattleSquaddie
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
        if (
            this.targetBeforeActionText == undefined ||
            this.backgroundHue == undefined
        )
            return
        const labelBackgroundColor = [this.backgroundHue, 10, 80]

        this._targetLabel = LabelService.new({
            textBoxMargin: WINDOW_SPACING.SPACING1,
            area: RectAreaService.new({
                startColumn: 6,
                endColumn: 7,
                top: TargetTextWindowLayout.top,
                height: TargetTextWindowLayout.height,
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
        if (this._result == undefined || this.targetLabel == undefined) return
        this._targetAfterActionText =
            ActionResultTextService.getAfterActionText({
                result: this._result,
            })

        this.targetLabel.textBox.text = `${this.targetBeforeActionText}\n${this.targetAfterActionText}`
    }
}
