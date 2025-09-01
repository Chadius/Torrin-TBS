export enum PlayerInputAction {
    ACCEPT = "ACCEPT",
    NEXT = "NEXT",
    CANCEL = "CANCEL",
    SCROLL_LEFT = "SCROLL_LEFT",
    SCROLL_RIGHT = "SCROLL_RIGHT",
    SCROLL_UP = "SCROLL_UP",
    SCROLL_DOWN = "SCROLL_DOWN",
    END_TURN = "END_TURN",
    LIST_INDEX_0 = "LIST_INDEX_0",
    LIST_INDEX_1 = "LIST_INDEX_1",
    LIST_INDEX_2 = "LIST_INDEX_2",
    LIST_INDEX_3 = "LIST_INDEX_3",
    LIST_INDEX_4 = "LIST_INDEX_4",
    LIST_INDEX_5 = "LIST_INDEX_5",
    LIST_INDEX_6 = "LIST_INDEX_6",
    LIST_INDEX_7 = "LIST_INDEX_7",
    LIST_INDEX_8 = "LIST_INDEX_8",
}

export interface PlayerInputButtonCombination {
    press?: number
    hold?: {
        key: number
        delay: number
    }
    modifiers?: {
        shift?: boolean
        ctrl?: boolean
        alt?: boolean
        meta?: boolean
    }
}

export interface PlayerInputState {
    actions: { [a in PlayerInputAction]?: PlayerInputButtonCombination[] }
    heldPlayerInputActions: {
        [a in PlayerInputAction]?: number
    }
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
        searchInputActions({
            playerInput,
            keyCode,
            held: false,
            pressed: true,
        }),
    keyIsDown: (playerInput: PlayerInputState, keyCode: number) => {
        if (playerInput.modifierKeyCodes.shift.keyCodes.includes(keyCode)) {
            playerInput.modifierKeyCodes.shift.active = true
        }

        searchInputActions({ playerInput, keyCode, held: true }).forEach(
            (action) => {
                if (playerInput.heldPlayerInputActions[action] == undefined) {
                    playerInput.heldPlayerInputActions[action] = Date.now()
                }
            }
        )
    },
    keyIsUp: (playerInput: PlayerInputState, keyCode: number) => {
        if (playerInput.modifierKeyCodes.shift.keyCodes.includes(keyCode)) {
            playerInput.modifierKeyCodes.shift.active = false
        }
        searchInputActions({ playerInput, keyCode, held: true }).forEach(
            (action) => (playerInput.heldPlayerInputActions[action] = undefined)
        )
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
                [PlayerInputAction.SCROLL_LEFT]: JSON.parse(
                    process.env.PLAYER_INPUT_SCROLL_LEFT
                ),
                [PlayerInputAction.SCROLL_RIGHT]: JSON.parse(
                    process.env.PLAYER_INPUT_SCROLL_RIGHT
                ),
                [PlayerInputAction.SCROLL_UP]: JSON.parse(
                    process.env.PLAYER_INPUT_SCROLL_UP
                ),
                [PlayerInputAction.SCROLL_DOWN]: JSON.parse(
                    process.env.PLAYER_INPUT_SCROLL_DOWN
                ),
                [PlayerInputAction.END_TURN]: JSON.parse(
                    process.env.PLAYER_INPUT_END_TURN
                ),
                [PlayerInputAction.LIST_INDEX_0]: JSON.parse(
                    process.env.PLAYER_INPUT_LIST_INDEX_0
                ),
                [PlayerInputAction.LIST_INDEX_1]: JSON.parse(
                    process.env.PLAYER_INPUT_LIST_INDEX_1
                ),
                [PlayerInputAction.LIST_INDEX_2]: JSON.parse(
                    process.env.PLAYER_INPUT_LIST_INDEX_2
                ),
                [PlayerInputAction.LIST_INDEX_3]: JSON.parse(
                    process.env.PLAYER_INPUT_LIST_INDEX_3
                ),
                [PlayerInputAction.LIST_INDEX_4]: JSON.parse(
                    process.env.PLAYER_INPUT_LIST_INDEX_4
                ),
                [PlayerInputAction.LIST_INDEX_5]: JSON.parse(
                    process.env.PLAYER_INPUT_LIST_INDEX_5
                ),
                [PlayerInputAction.LIST_INDEX_6]: JSON.parse(
                    process.env.PLAYER_INPUT_LIST_INDEX_6
                ),
                [PlayerInputAction.LIST_INDEX_7]: JSON.parse(
                    process.env.PLAYER_INPUT_LIST_INDEX_7
                ),
                [PlayerInputAction.LIST_INDEX_8]: JSON.parse(
                    process.env.PLAYER_INPUT_LIST_INDEX_8
                ),
            },
            modifierKeyCodes: JSON.parse(
                process.env.PLAYER_INPUT_MODIFIER_KEY_CODES
            ),
        })
    },
    getActionsForHeldKeys: (
        playerInput: PlayerInputState
    ): PlayerInputAction[] =>
        Object.keys(playerInput.actions)
            .map((inputActionStr) => inputActionStr as PlayerInputAction)
            .filter(
                (inputAction) =>
                    playerInput.heldPlayerInputActions[inputAction] != undefined
            )
            .filter((inputAction) =>
                playerInput.actions[inputAction]
                    .filter((combination) => combination.hold != undefined)
                    .some((combination) => {
                        const timeHeld =
                            Date.now() -
                            playerInput.heldPlayerInputActions[inputAction]
                        return timeHeld >= combination.hold.delay
                    })
            ),
    numberToListIndex: (index: number): PlayerInputAction => {
        const numberToListIndex = [
            PlayerInputAction.LIST_INDEX_0,
            PlayerInputAction.LIST_INDEX_1,
            PlayerInputAction.LIST_INDEX_2,
            PlayerInputAction.LIST_INDEX_3,
            PlayerInputAction.LIST_INDEX_4,
            PlayerInputAction.LIST_INDEX_5,
            PlayerInputAction.LIST_INDEX_6,
            PlayerInputAction.LIST_INDEX_7,
            PlayerInputAction.LIST_INDEX_8,
        ]
        return numberToListIndex[index]
    },
    listIndexToNumber: (playerInputAction: PlayerInputAction): number => {
        const listIndexToNumber: { [p in PlayerInputAction]?: number } = {
            [PlayerInputAction.LIST_INDEX_0]: 0,
            [PlayerInputAction.LIST_INDEX_1]: 1,
            [PlayerInputAction.LIST_INDEX_2]: 2,
            [PlayerInputAction.LIST_INDEX_3]: 3,
            [PlayerInputAction.LIST_INDEX_4]: 4,
            [PlayerInputAction.LIST_INDEX_5]: 5,
            [PlayerInputAction.LIST_INDEX_6]: 6,
            [PlayerInputAction.LIST_INDEX_7]: 7,
            [PlayerInputAction.LIST_INDEX_8]: 8,
        }
        return listIndexToNumber[playerInputAction]
    },
    filterListIndexActions: (
        playerInputActions: PlayerInputAction[]
    ): PlayerInputAction[] => {
        const listIndexActions: Set<PlayerInputAction> = new Set([
            PlayerInputAction.LIST_INDEX_0,
            PlayerInputAction.LIST_INDEX_1,
            PlayerInputAction.LIST_INDEX_2,
            PlayerInputAction.LIST_INDEX_3,
            PlayerInputAction.LIST_INDEX_4,
            PlayerInputAction.LIST_INDEX_5,
            PlayerInputAction.LIST_INDEX_6,
            PlayerInputAction.LIST_INDEX_7,
            PlayerInputAction.LIST_INDEX_8,
        ])
        return playerInputActions.filter((playerInputAction) =>
            listIndexActions.has(playerInputAction)
        )
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
    heldPlayerInputActions: {},
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

const searchInputActions = ({
    playerInput,
    keyCode,
    held,
    pressed,
}: {
    playerInput: PlayerInputState
    keyCode: number
    held?: boolean
    pressed?: boolean
}) =>
    Object.keys(playerInput.actions)
        .map((inputActionStr) => inputActionStr as PlayerInputAction)
        .filter((inputAction) =>
            playerInput.actions[inputAction].some((combination) => {
                if (pressed && combination.press !== keyCode) return false
                if (held && combination.hold?.key !== keyCode) return false
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
                    playerInput.modifierKeyCodes.ctrl.active === ctrlModifier &&
                    playerInput.modifierKeyCodes.meta.active === metaModifier &&
                    playerInput.modifierKeyCodes.alt.active === altModifier
                )
            })
        )
