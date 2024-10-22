import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { SquaddieActionAnimator } from "./squaddieActionAnimator"
import { Label, LabelService } from "../../ui/label"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ActionResultTextService } from "./actionResultTextService"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ObjectRepositoryService } from "../objectRepository"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { ActionEffectSquaddieTemplate } from "../../action/template/actionEffectSquaddieTemplate"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"

export const ANIMATE_TEXT_WINDOW_WAIT_TIME = 5000

export class SquaddieSkipsAnimationAnimator implements SquaddieActionAnimator {
    outputTextDisplay: Label
    outputTextStrings: string[]
    private animationCompleteStartTime: number
    private userCanceledAction: boolean

    hasCompleted(state: GameEngineState): boolean {
        const userWaited: boolean =
            this.animationCompleteStartTime !== undefined &&
            Date.now() - this.animationCompleteStartTime >=
                ANIMATE_TEXT_WINDOW_WAIT_TIME
        return userWaited || this.userCanceledAction
    }

    mouseEventHappened(
        state: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void {
        if (
            mouseEvent.eventType === OrchestratorComponentMouseEventType.CLICKED
        ) {
            this.userCanceledAction = true
        }
    }

    reset(gameEngineState: GameEngineState): void {
        this.resetInternalState()
        BattleActionService.setAnimationCompleted({
            battleAction: BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            ),
            animationCompleted: true,
        })
    }

    start(state: GameEngineState): void {
        this.maybeInitializeAnimationTimer()
    }

    update(state: GameEngineState, graphics: GraphicsBuffer): void {
        this.maybeInitializeAnimationTimer()
        this.draw(state, graphics)
    }

    private resetInternalState() {
        this.outputTextDisplay = undefined
        this.animationCompleteStartTime = undefined
        this.userCanceledAction = false
    }

    private maybeInitializeAnimationTimer() {
        if (this.animationCompleteStartTime === undefined) {
            this.animationCompleteStartTime = Date.now()
        }
    }

    private drawActionDescription(
        gameEngineState: GameEngineState,
        graphics: GraphicsBuffer
    ) {
        if (this.outputTextDisplay !== undefined) {
            LabelService.draw(this.outputTextDisplay, graphics)
            return
        }

        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        if (actionToShow?.action.actionTemplateId === undefined) {
            return
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            actionToShow.action.actionTemplateId
        )

        this.outputTextStrings = []
        this.outputTextStrings =
            ActionResultTextService.outputResultForTextOnly({
                squaddieRepository: gameEngineState.repository,
                actionTemplateName: actionTemplate.name,
                currentActionEffectSquaddieTemplate: actionTemplate
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingBattleSquaddieId:
                    actionToShow.actor.actorBattleSquaddieId,
                actingContext: actionToShow.actor.actorContext,
                battleActionSquaddieChanges: actionToShow.effect.squaddie,
            })

        const textToDraw = this.outputTextStrings.join("\n")

        this.outputTextDisplay = LabelService.new({
            area: RectAreaService.new({
                startColumn: 4,
                endColumn: 10,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                percentTop: 40,
                percentHeight: 20,
            }),
            fillColor: [0, 0, 60],
            strokeColor: [0, 0, 0],
            strokeWeight: 4,

            text: textToDraw,
            textSize: 24,
            fontColor: [0, 0, 16],
            textBoxMargin: [16, 0, 0, 16],
        })
        LabelService.draw(this.outputTextDisplay, graphics)
    }

    private draw(state: GameEngineState, graphics: GraphicsBuffer) {
        this.drawActionDescription(state, graphics)
    }
}
