export enum PlayerInputAction {
    ACCEPT = "ACCEPT",
    NEXT = "NEXT",
    CANCEL = "CANCEL",
}

export interface PlayerInputButtonCombination {
    pressedKey?: number
    modifiers?: {
        shift?: boolean
        ctrl?: boolean
        alt?: boolean
        meta?: boolean
    }
}

export interface PlayerInputState {
    actions: { [a in PlayerInputAction]?: PlayerInputButtonCombination[] }
    modifierKeyCodes: {
        shift: {
            keyCodes: number[]
            active: boolean
        }
        ctrl: {
            keyCodes: number[]
            active: boolean
        }
        alt: {
            keyCodes: number[]
            active: boolean
        }
        meta: {
            keyCodes: number[]
            active: boolean
        }
    }
}

export const PlayerInputStateService = {
    new: ({
        actions,
        modifierKeyCodes,
    }: {
        actions: { [a in PlayerInputAction]?: PlayerInputButtonCombination[] }
        modifierKeyCodes: {
            shift: number[]
            ctrl: number[]
            alt: number[]
            meta: number[]
        }
    }): PlayerInputState =>
        newPlayerInputState({
            actions,
            modifierKeyCodes,
        }),
    getActionsForPressedKey: (
        playerInput: PlayerInputState,
        keyCode: number
    ): PlayerInputAction[] =>
        Object.keys(playerInput.actions)
            .map((inputActionStr) => inputActionStr as PlayerInputAction)
            .filter((inputAction) =>
                playerInput.actions[inputAction].some((combination) => {
                    if (combination.pressedKey !== keyCode) return false
                    const shiftModifier = combination.modifiers?.shift
                        ? combination.modifiers.shift
                        : false
                    const ctrlModifier = combination.modifiers?.ctrl
                        ? combination.modifiers.ctrl
                        : false
                    const altModifier = combination.modifiers?.alt
                        ? combination.modifiers.alt
                        : false
                    const metaModifier = combination.modifiers?.meta
                        ? combination.modifiers.meta
                        : false

                    return (
                        playerInput.modifierKeyCodes.shift.active ===
                            shiftModifier &&
                        playerInput.modifierKeyCodes.ctrl.active ===
                            ctrlModifier &&
                        playerInput.modifierKeyCodes.meta.active ===
                            metaModifier &&
                        playerInput.modifierKeyCodes.alt.active === altModifier
                    )
                })
            ),
    keyIsDown: (playerInput: PlayerInputState, keyCode: number) => {
        if (playerInput.modifierKeyCodes.shift.keyCodes.includes(keyCode)) {
            playerInput.modifierKeyCodes.shift.active = true
        }
    },
    keyIsUp: (playerInput: PlayerInputState, keyCode: number) => {
        if (playerInput.modifierKeyCodes.shift.keyCodes.includes(keyCode)) {
            playerInput.modifierKeyCodes.shift.active = false
        }
    },
    newFromEnvironment: (): PlayerInputState => {
        return newPlayerInputState({
            actions: {
                [PlayerInputAction.ACCEPT]: JSON.parse(
                    process.env.PLAYER_INPUT_ACCEPT
                ),
                [PlayerInputAction.CANCEL]: JSON.parse(
                    process.env.PLAYER_INPUT_CANCEL
                ),
                [PlayerInputAction.NEXT]: JSON.parse(
                    process.env.PLAYER_INPUT_NEXT
                ),
            },
            modifierKeyCodes: JSON.parse(
                process.env.PLAYER_INPUT_MODIFIER_KEY_CODES
            ),
        })
    },
}

const newPlayerInputState = ({
    actions,
    modifierKeyCodes,
}: {
    actions: { [a in PlayerInputAction]?: PlayerInputButtonCombination[] }
    modifierKeyCodes: {
        shift: number[]
        ctrl: number[]
        alt: number[]
        meta: number[]
    }
}): PlayerInputState => ({
    actions,
    modifierKeyCodes: {
        shift: {
            keyCodes: modifierKeyCodes.shift,
            active: false,
        },
        ctrl: {
            keyCodes: modifierKeyCodes.ctrl,
            active: false,
        },
        alt: {
            keyCodes: modifierKeyCodes.alt,
            active: false,
        },
        meta: {
            keyCodes: modifierKeyCodes.meta,
            active: false,
        },
    },
})
