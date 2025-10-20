import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { BattleUISettings, BattleUISettingsService } from "../orchestrator/uiSettings/uiSettings"
import { Cutscene, CutsceneService } from "../../cutscene/cutscene"
import { isValidValue } from "../../utils/objectValidityCheck"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ResourceHandler } from "../../resource/resourceHandler"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"

export class BattleCutscenePlayer implements BattleOrchestratorComponent {
    private _currentCutscene: Cutscene | undefined

    get currentCutscene(): Cutscene | undefined {
        return this._currentCutscene
    }

    private _currentCutsceneId: string | undefined

    get currentCutsceneId(): string | undefined {
        return this._currentCutsceneId
    }

    hasCompleted(_state: GameEngineState): boolean {
        return !(
            this.currentCutscene &&
            CutsceneService.isInProgress(this.currentCutscene)
        )
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        if (
            event.eventType === OrchestratorComponentMouseEventType.LOCATION &&
            this.currentCutscene &&
            CutsceneService.isInProgress(this.currentCutscene)
        ) {
            CutsceneService.mouseMoved({
                cutscene: this.currentCutscene,
                mouseLocation: {
                    ...event.mouseLocation,
                },
            })
            return
        }
        if (
            event.eventType === OrchestratorComponentMouseEventType.RELEASE &&
            this.currentCutscene &&
            CutsceneService.isInProgress(this.currentCutscene)
        ) {
            CutsceneService.mousePressed({
                cutscene: this.currentCutscene,
                mousePress: {
                    ...event.mouseRelease,
                },
                context: {
                    battleOrchestratorState:
                        gameEngineState.battleOrchestratorState,
                },
            })
        }
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        if (
            event.eventType === OrchestratorComponentKeyEventType.PRESSED &&
            this.currentCutscene != undefined
        ) {
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

    uiControlSettings(_state: GameEngineState): BattleUISettings {
        return BattleUISettingsService.new({
            letMouseScrollCamera: true,
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
        resourceHandler: ResourceHandler | undefined
    }): void {
        if (!isValidValue(this.currentCutscene)) {
            return
        }

        if (
            this.currentCutscene != undefined &&
            gameEngineState.resourceHandler != undefined &&
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

        if (
            this.currentCutscene != undefined &&
            CutsceneService.isInProgress(this.currentCutscene)
        ) {
            CutsceneService.draw(
                this.currentCutscene,
                graphicsContext,
                resourceHandler
            )
            CutsceneService.update(this.currentCutscene, {
                battleOrchestratorState:
                    gameEngineState.battleOrchestratorState,
            })
        }
    }

    recommendStateChanges(
        _state: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        return {}
    }

    reset(_state: GameEngineState) {
        this._currentCutsceneId = undefined
        this._currentCutscene = undefined
    }

    startCutscene(cutsceneId: string, gameEngineState: GameEngineState) {
        if (
            gameEngineState.battleOrchestratorState.battleState
                .cutsceneCollection == undefined ||
            !gameEngineState.battleOrchestratorState.battleState
                .cutsceneCollection.cutsceneById[cutsceneId]
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
            gameEngineState.battleOrchestratorState.battleState.cutsceneCollection.cutsceneById[
                cutsceneId
            ]
        CutsceneService.start(
            this._currentCutscene,
            gameEngineState.resourceHandler,
            {
                battleOrchestratorState:
                    gameEngineState.battleOrchestratorState,
            }
        )
    }
}
