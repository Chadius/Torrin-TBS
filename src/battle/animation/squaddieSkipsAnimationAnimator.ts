import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { SquaddieActionAnimator } from "./squaddieActionAnimator"
import { Label, LabelService } from "../../ui/label"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { ActionResultTextService } from "./actionResultTextService"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ObjectRepositoryService } from "../objectRepository"
import { BattleActionService } from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ResourceHandler } from "../../resource/resourceHandler"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export const ANIMATE_TEXT_WINDOW_WAIT_TIME = 5000

export class SquaddieSkipsAnimationAnimator implements SquaddieActionAnimator {
    outputTextDisplay: Label | undefined
    outputTextStrings: string[] | undefined
    private animationCompleteStartTime: number | undefined
    private userCanceledAction: boolean | undefined

    hasCompleted(_: GameEngineState): boolean {
        const userWaited: boolean =
            this.animationCompleteStartTime !== undefined &&
            Date.now() - this.animationCompleteStartTime >=
                ANIMATE_TEXT_WINDOW_WAIT_TIME
        return userWaited || (this.userCanceledAction ?? false)
    }

    mouseEventHappened(
        state: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ): void {
        if (
            mouseEvent.eventType === OrchestratorComponentMouseEventType.RELEASE
        ) {
            this.userCanceledAction = true
        }
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        keyEvent: OrchestratorComponentKeyEvent
    ): void {
        if (keyEvent.eventType === OrchestratorComponentKeyEventType.PRESSED) {
            this.userCanceledAction = true
        }
    }

    reset(gameEngineState: GameEngineState): void {
        this.resetInternalState()
        const battleAction = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
        if (battleAction == undefined) return
        BattleActionService.setAnimationCompleted({
            battleAction: battleAction,
            animationCompleted: true,
        })
    }

    start(state: GameEngineState): void {
        this.maybeInitializeAnimationTimer()
    }

    update({
        gameEngineState,
        graphicsContext,
        resourceHandler,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        this.maybeInitializeAnimationTimer()
        this.draw(gameEngineState, graphicsContext)
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

        const actionToShow = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )

        if (actionToShow?.action.actionTemplateId === undefined) {
            return
        }
        if (gameEngineState.repository == undefined) return
        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            actionToShow.action.actionTemplateId
        )

        this.outputTextStrings = []
        this.outputTextStrings =
            ActionResultTextService.outputResultForTextOnly({
                squaddieRepository: gameEngineState.repository,
                actionTemplateName: actionTemplate.name,
                currentActionEffectTemplate:
                    actionTemplate.actionEffectTemplates[0],
                actingBattleSquaddieId:
                    actionToShow.actor.actorBattleSquaddieId,
                actorContext: actionToShow.actor.actorContext,
                battleActionSquaddieChanges: actionToShow.effect.squaddie || [],
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
            fontSize: 24,
            fontColor: [0, 0, 16],
            textBoxMargin: [16, 0, 0, 16],
        })
        LabelService.draw(this.outputTextDisplay, graphics)
    }

    private draw(state: GameEngineState, graphics: GraphicsBuffer) {
        this.drawActionDescription(state, graphics)
    }
}
