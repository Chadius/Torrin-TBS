import { beforeEach, describe, expect, it, vi } from "vitest"
import {
    PlayerInputAction,
    PlayerInputButtonCombination,
    PlayerInputState,
    PlayerInputStateService,
} from "./playerInputState"

describe("Player Input State", () => {
    describe("keyboard", () => {
        let playerInput: PlayerInputState
        let ACCEPT_KEY_NO_MODIFIERS: number
        const ACCEPT_KEY_WITH_SHIFT_MODIFIER = 2
        const SHIFT_MODIFIER_KEY = 3
        let nextSquaddieInputs: PlayerInputButtonCombination[]

        beforeEach(() => {
            ACCEPT_KEY_NO_MODIFIERS = JSON.parse(
                process.env.PLAYER_INPUT_ACCEPT
            )[0]["pressedKey"]

            nextSquaddieInputs = JSON.parse(process.env.PLAYER_INPUT_NEXT)

            playerInput = PlayerInputStateService.new({
                modifierKeyCodes: {
                    shift: [SHIFT_MODIFIER_KEY],
                    ctrl: [],
                    meta: [],
                    alt: [],
                },
                actions: {
                    [PlayerInputAction.ACCEPT]: [
                        {
                            press: ACCEPT_KEY_NO_MODIFIERS,
                        },
                        {
                            press: ACCEPT_KEY_WITH_SHIFT_MODIFIER,
                            modifiers: {
                                shift: true,
                            },
                        },
                        {
                            hold: {
                                key: ACCEPT_KEY_NO_MODIFIERS,
                                delay: 100,
                            },
                        },
                    ],
                    [PlayerInputAction.NEXT]: nextSquaddieInputs,
                },
            })
        })

        it("knows when a keyboard button is pressed", () => {
            let actions: PlayerInputAction[] =
                PlayerInputStateService.getActionsForPressedKey(
                    playerInput,
                    nextSquaddieInputs[0].press
                )
            expect(actions).includes(PlayerInputAction.NEXT)
        })

        it("knows when an action requires a modifier key", () => {
            let actions: PlayerInputAction[] =
                PlayerInputStateService.getActionsForPressedKey(
                    playerInput,
                    ACCEPT_KEY_WITH_SHIFT_MODIFIER
                )
            expect(actions).not.include(PlayerInputAction.ACCEPT)
            PlayerInputStateService.keyIsDown(playerInput, SHIFT_MODIFIER_KEY)

            actions = PlayerInputStateService.getActionsForPressedKey(
                playerInput,
                ACCEPT_KEY_WITH_SHIFT_MODIFIER
            )
            expect(actions).includes(PlayerInputAction.ACCEPT)

            PlayerInputStateService.keyIsUp(playerInput, SHIFT_MODIFIER_KEY)
            actions = PlayerInputStateService.getActionsForPressedKey(
                playerInput,
                ACCEPT_KEY_WITH_SHIFT_MODIFIER
            )
            expect(actions).not.includes(PlayerInputAction.ACCEPT)
        })

        it("knows when a key can be held down", () => {
            let actions: PlayerInputAction[]
            const dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
            PlayerInputStateService.keyIsDown(
                playerInput,
                ACCEPT_KEY_NO_MODIFIERS
            )
            actions = PlayerInputStateService.getActionsForHeldKeys(playerInput)
            expect(actions).toHaveLength(0)

            dateSpy.mockReturnValue(100)
            actions = PlayerInputStateService.getActionsForHeldKeys(playerInput)
            expect(actions).includes(PlayerInputAction.ACCEPT)

            PlayerInputStateService.keyIsUp(
                playerInput,
                ACCEPT_KEY_NO_MODIFIERS
            )
            actions = PlayerInputStateService.getActionsForHeldKeys(playerInput)
            expect(actions).toHaveLength(0)
        })
    })

    describe("default player input uses environment to define keys", () => {
        let playerInput: PlayerInputState
        beforeEach(() => {
            playerInput = PlayerInputStateService.newFromEnvironment()
        })

        const expectedActionCombinations = [
            {
                action: PlayerInputAction.ACCEPT,
                combinations: JSON.parse(process.env.PLAYER_INPUT_ACCEPT),
            },
            {
                action: PlayerInputAction.CANCEL,
                combinations: JSON.parse(process.env.PLAYER_INPUT_CANCEL),
            },
            {
                action: PlayerInputAction.NEXT,
                combinations: JSON.parse(process.env.PLAYER_INPUT_NEXT),
            },
            {
                action: PlayerInputAction.SCROLL_LEFT,
                combinations: JSON.parse(process.env.PLAYER_INPUT_SCROLL_LEFT),
            },
            {
                action: PlayerInputAction.SCROLL_RIGHT,
                combinations: JSON.parse(process.env.PLAYER_INPUT_SCROLL_RIGHT),
            },
            {
                action: PlayerInputAction.SCROLL_UP,
                combinations: JSON.parse(process.env.PLAYER_INPUT_SCROLL_UP),
            },
            {
                action: PlayerInputAction.SCROLL_DOWN,
                combinations: JSON.parse(process.env.PLAYER_INPUT_SCROLL_DOWN),
            },
        ]

        it.each(expectedActionCombinations)(
            `$action`,
            ({ action, combinations }) => {
                expect(playerInput.actions[action]).toEqual(combinations)
            }
        )
    })
})
