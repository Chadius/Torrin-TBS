import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventService,
} from "../../battle/orchestrator/battleOrchestratorComponent"
import {
    PlayerInputState,
    PlayerInputStateService,
} from "../../ui/playerInput/playerInputState"

export const PlayerInputTestService = {
    pressAcceptKey: (): OrchestratorComponentKeyEvent =>
        OrchestratorComponentKeyEventService.createPressedKeyEvent(
            JSON.parse(process.env.PLAYER_INPUT_ACCEPT)[0]["press"]
        ),
    pressCancelKey: (): OrchestratorComponentKeyEvent =>
        OrchestratorComponentKeyEventService.createPressedKeyEvent(
            JSON.parse(process.env.PLAYER_INPUT_CANCEL)[0]["press"]
        ),
    pressNextKey: (): OrchestratorComponentKeyEvent =>
        OrchestratorComponentKeyEventService.createPressedKeyEvent(
            JSON.parse(process.env.PLAYER_INPUT_NEXT)[0]["press"]
        ),
    holdScrollRightKey: (playerInputState: PlayerInputState) => {
        holdModifierKeys({
            playerInputState,
            shift: JSON.parse(process.env.PLAYER_INPUT_SCROLL_RIGHT)[0][
                "modifiers"
            ].shift,
        })
        holdKey({
            playerInputState,
            keyCode: JSON.parse(process.env.PLAYER_INPUT_SCROLL_RIGHT)[0][
                "hold"
            ].key,
        })
    },
    holdScrollLeftKey: (playerInputState: PlayerInputState) => {
        holdModifierKeys({
            playerInputState,
            shift: JSON.parse(process.env.PLAYER_INPUT_SCROLL_LEFT)[0][
                "modifiers"
            ].shift,
        })
        holdKey({
            playerInputState,
            keyCode: JSON.parse(process.env.PLAYER_INPUT_SCROLL_LEFT)[0]["hold"]
                .key,
        })
    },
    holdScrollUpKey: (playerInputState: PlayerInputState) => {
        holdModifierKeys({
            playerInputState,
            shift: JSON.parse(process.env.PLAYER_INPUT_SCROLL_UP)[0][
                "modifiers"
            ].shift,
        })
        holdKey({
            playerInputState,
            keyCode: JSON.parse(process.env.PLAYER_INPUT_SCROLL_UP)[0]["hold"]
                .key,
        })
    },
    holdScrollDownKey: (playerInputState: PlayerInputState) => {
        holdModifierKeys({
            playerInputState,
            shift: JSON.parse(process.env.PLAYER_INPUT_SCROLL_DOWN)[0][
                "modifiers"
            ].shift,
        })
        holdKey({
            playerInputState,
            keyCode: JSON.parse(process.env.PLAYER_INPUT_SCROLL_DOWN)[0]["hold"]
                .key,
        })
    },
}

const holdModifierKeys = ({
    playerInputState,
    shift,
}: {
    playerInputState: PlayerInputState
    shift: boolean
}) => {
    const keyUpOrDown = (keyCodes: number[], keyIsDown: boolean) => {
        if (keyCodes.length === 0) return
        if (keyIsDown) {
            PlayerInputStateService.keyIsDown(playerInputState, keyCodes[0])
            return
        }
        PlayerInputStateService.keyIsUp(playerInputState, keyCodes[0])
    }

    keyUpOrDown(playerInputState.modifierKeyCodes.shift.keyCodes, shift)
}

const holdKey = ({
    playerInputState,
    keyCode,
}: {
    playerInputState: PlayerInputState
    keyCode: number
}) => {
    PlayerInputStateService.keyIsDown(playerInputState, keyCode)
}
