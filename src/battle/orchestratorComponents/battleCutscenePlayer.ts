import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { Cutscene, CutsceneService } from "../../cutscene/cutscene"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { isValidValue } from "../../utils/validityCheck"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../resource/resourceHandler"

export class BattleCutscenePlayer implements BattleOrchestratorComponent {
    private _currentCutscene: Cutscene

    get currentCutscene(): Cutscene {
        return this._currentCutscene
    }

    private _currentCutsceneId: string

    get currentCutsceneId(): string {
        return this._currentCutsceneId
    }

    hasCompleted(state: GameEngineState): boolean {
        return !(
            this.currentCutscene &&
            CutsceneService.isInProgress(this.currentCutscene)
        )
    }

    mouseEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        if (
            event.eventType === OrchestratorComponentMouseEventType.MOVED &&
            this.currentCutscene &&
            CutsceneService.isInProgress(this.currentCutscene)
        ) {
            CutsceneService.mouseMoved(
                this.currentCutscene,
                event.mouseX,
                event.mouseY
            )
            return
        }
        if (
            event.eventType === OrchestratorComponentMouseEventType.CLICKED &&
            this.currentCutscene &&
            CutsceneService.isInProgress(this.currentCutscene)
        ) {
            CutsceneService.mouseClicked(
                this.currentCutscene,
                event.mouseX,
                event.mouseY,
                { battleOrchestratorState: state.battleOrchestratorState }
            )
        }
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        if (event.eventType === OrchestratorComponentKeyEventType.PRESSED) {
            CutsceneService.keyboardPressed({
                cutscene: this.currentCutscene,
                event,
                context: {
                    battleOrchestratorState:
                        gameEngineState.battleOrchestratorState,
                },
                playerInputState: gameEngineState.playerInputState,
            })
        }
    }

    uiControlSettings(_state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            pauseTimer: true,
            displayPlayerHUD: false,
        })
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
        if (!isValidValue(this.currentCutscene)) {
            return
        }

        if (
            CutsceneService.hasLoaded(
                this.currentCutscene,
                gameEngineState.resourceHandler
            ) &&
            !CutsceneService.isInProgress(this.currentCutscene)
        ) {
            CutsceneService.setResources(
                this.currentCutscene,
                gameEngineState.resourceHandler
            )
            CutsceneService.start(
                this.currentCutscene,
                gameEngineState.resourceHandler,
                {
                    battleOrchestratorState:
                        gameEngineState.battleOrchestratorState,
                }
            )
        }

        if (CutsceneService.isInProgress(this.currentCutscene)) {
            CutsceneService.update(this.currentCutscene, {
                battleOrchestratorState:
                    gameEngineState.battleOrchestratorState,
            })
            CutsceneService.draw(
                this.currentCutscene,
                graphicsContext,
                resourceHandler
            )
        }
    }

    recommendStateChanges(
        state: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        return {}
    }

    reset(state: GameEngineState) {
        this._currentCutsceneId = undefined
        this._currentCutscene = undefined
    }

    startCutscene(cutsceneId: string, state: GameEngineState) {
        if (
            !state.battleOrchestratorState.battleState.cutsceneCollection
                .cutsceneById[cutsceneId]
        ) {
            throw new Error(`No cutscene with Id ${cutsceneId}`)
        }

        if (
            this.currentCutscene &&
            CutsceneService.isInProgress(this.currentCutscene)
        ) {
            return
        }

        this._currentCutsceneId = cutsceneId
        this._currentCutscene =
            state.battleOrchestratorState.battleState.cutsceneCollection.cutsceneById[
                cutsceneId
            ]
        CutsceneService.start(this.currentCutscene, state.resourceHandler, {
            battleOrchestratorState: state.battleOrchestratorState,
        })
    }
}
