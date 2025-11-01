import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import {
    BattleUISettings,
    BattleUISettingsService,
} from "../orchestrator/uiSettings/uiSettings"
import { Cutscene, CutsceneService } from "../../cutscene/cutscene"
import { isValidValue } from "../../utils/objectValidityCheck"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { GameEngineState } from "../../gameEngine/gameEngineState/gameEngineState"
import { ResourceRepository } from "../../resource/resourceRepository.ts"

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

    update({ gameEngineState }: { gameEngineState: GameEngineState }): void {
        if (!isValidValue(this.currentCutscene)) {
            return
        }

        if (
            this.currentCutscene != undefined &&
            gameEngineState.resourceRepository != undefined &&
            CutsceneService.hasLoaded(
                this.currentCutscene,
                gameEngineState.resourceRepository
            ) &&
            !CutsceneService.isInProgress(this.currentCutscene)
        ) {
            CutsceneService.setResources(
                this.currentCutscene,
                gameEngineState.resourceRepository
            )
            CutsceneService.start({
                cutscene: this.currentCutscene,
                resourceRepository: gameEngineState.resourceRepository,
                context: {
                    battleOrchestratorState:
                        gameEngineState.battleOrchestratorState,
                },
            })
        }
    }

    draw({
        graphics,
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
        graphics: GraphicsBuffer
    }): ResourceRepository | undefined {
        this.drawNEW({
            graphics,
            gameEngineState,
            resourceRepository: gameEngineState.resourceRepository,
        })
        return gameEngineState.resourceRepository
    }

    drawNEW({
        graphics,
        resourceRepository,
        gameEngineState,
    }: {
        gameEngineState: GameEngineState
        graphics: GraphicsBuffer
        resourceRepository: ResourceRepository | undefined
    }): void {
        if (resourceRepository == undefined) return
        if (this.currentCutscene == undefined) return
        if (!CutsceneService.isInProgress(this.currentCutscene)) return

        CutsceneService.draw({
            cutscene: this.currentCutscene,
            graphicsContext: graphics,
            resourceRepository,
        })
        CutsceneService.update(this.currentCutscene, {
            battleOrchestratorState: gameEngineState.battleOrchestratorState,
        })
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
        CutsceneService.start({
            cutscene: this._currentCutscene,
            resourceRepository: gameEngineState.resourceRepository,
            context: {
                battleOrchestratorState:
                    gameEngineState.battleOrchestratorState,
            },
        })
    }
}
