import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventService,
} from "../../battle/orchestrator/battleOrchestratorComponent"

export const PlayerInputTestService = {
    pressAcceptKey: (): OrchestratorComponentKeyEvent =>
        OrchestratorComponentKeyEventService.createPressedKeyEvent(
            JSON.parse(process.env.PLAYER_INPUT_ACCEPT)[0]["pressedKey"]
        ),
    pressCancelKey: (): OrchestratorComponentKeyEvent =>
        OrchestratorComponentKeyEventService.createPressedKeyEvent(
            JSON.parse(process.env.PLAYER_INPUT_CANCEL)[0]["pressedKey"]
        ),
    pressNextKey: (): OrchestratorComponentKeyEvent =>
        OrchestratorComponentKeyEventService.createPressedKeyEvent(
            JSON.parse(process.env.PLAYER_INPUT_NEXT)[0]["pressedKey"]
        ),
}
