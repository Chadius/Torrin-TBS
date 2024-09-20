import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { SquaddieActionAnimator } from "./squaddieActionAnimator"
import { Label, LabelService } from "../../ui/label"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { ActionResultTextService } from "./actionResultTextService"
import { RecordingService } from "../history/recording"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ObjectRepositoryService } from "../objectRepository"
import { BattleActionService } from "../history/battleAction"
import { BattleActionQueueService } from "../history/battleActionQueue"

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
            battleAction: BattleActionQueueService.peek(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue
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

        const processedActionEffectToShow =
            ActionsThisRoundService.getProcessedActionEffectToShow(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            )
        if (processedActionEffectToShow.type !== ActionEffectType.SQUADDIE) {
            return
        }

        if (
            processedActionEffectToShow.decidedActionEffect.type !==
            ActionEffectType.SQUADDIE
        ) {
            return
        }
        const currentActionEffectSquaddieTemplate =
            processedActionEffectToShow.decidedActionEffect.template

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            BattleActionQueueService.peek(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue
            ).action.actionTemplateId
        )

        this.outputTextStrings = []
        this.outputTextStrings =
            ActionResultTextService.outputResultForTextOnly({
                squaddieRepository: gameEngineState.repository,
                actionTemplateName: actionTemplate.name,
                currentActionEffectSquaddieTemplate,
                result: RecordingService.mostRecentEvent(
                    gameEngineState.battleOrchestratorState.battleState
                        .recording
                ).results,
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
