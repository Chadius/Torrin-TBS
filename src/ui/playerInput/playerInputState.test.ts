import { beforeEach, describe, expect, it } from "vitest"
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
                            pressedKey: ACCEPT_KEY_NO_MODIFIERS,
                        },
                        {
                            pressedKey: ACCEPT_KEY_WITH_SHIFT_MODIFIER,
                            modifiers: {
                                shift: true,
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
                    nextSquaddieInputs[0].pressedKey
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
        ]

        it.each(expectedActionCombinations)(
            `$action`,
            ({ action, combinations }) => {
                expect(playerInput.actions[action]).toEqual(combinations)
            }
        )
    })
})
