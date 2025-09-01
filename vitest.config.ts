import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        exclude: [
            "e2e/**",
            "node_modules/**",
            "assets/**",
            "build/**",
            "dist/**",
            "docs/**",
        ],
        env: {
            CAMPAIGN_ID: "coolCampaign",
            SCREEN_WIDTH: JSON.stringify(1280),
            SCREEN_HEIGHT: JSON.stringify(768),
            VERSION: "vitest",
            LOG_MESSAGES: JSON.stringify("false"),
            DEBUG: JSON.stringify("false"),
            STARTUP_MODE: "TITLE_SCREEN",
            MOUSE_BUTTON_BINDINGS_ACCEPT: "left",
            MOUSE_BUTTON_BINDINGS_INFO: "center",
            MOUSE_BUTTON_BINDINGS_CANCEL: "right",
            PLAYER_INPUT_ACCEPT: JSON.stringify([{ press: 13 }, { press: 32 }]),
            PLAYER_INPUT_CANCEL: JSON.stringify([
                { press: 8 },
                { press: 46 },
                { press: 27 },
            ]),
            PLAYER_INPUT_NEXT: JSON.stringify([{ press: 88 }, { press: 17 }]),
            PLAYER_INPUT_LIST_INDEX_0: JSON.stringify([{ press: 49 }]),
            PLAYER_INPUT_LIST_INDEX_1: JSON.stringify([{ press: 50 }]),
            PLAYER_INPUT_LIST_INDEX_2: JSON.stringify([{ press: 51 }]),
            PLAYER_INPUT_LIST_INDEX_3: JSON.stringify([{ press: 52 }]),
            PLAYER_INPUT_LIST_INDEX_4: JSON.stringify([{ press: 53 }]),
            PLAYER_INPUT_LIST_INDEX_5: JSON.stringify([{ press: 54 }]),
            PLAYER_INPUT_LIST_INDEX_6: JSON.stringify([{ press: 55 }]),
            PLAYER_INPUT_LIST_INDEX_7: JSON.stringify([{ press: 56 }]),
            PLAYER_INPUT_LIST_INDEX_8: JSON.stringify([{ press: 57 }]),
            PLAYER_INPUT_END_TURN: JSON.stringify([
                { press: 35 },
                { press: 48 },
            ]),
            PLAYER_INPUT_SCROLL_LEFT: JSON.stringify([
                {
                    hold: {
                        key: 37,
                        delay: 100,
                    },
                    modifiers: { shift: true },
                },
            ]),
            PLAYER_INPUT_SCROLL_RIGHT: JSON.stringify([
                {
                    hold: {
                        key: 39,
                        delay: 100,
                    },
                    modifiers: { shift: true },
                },
            ]),
            PLAYER_INPUT_SCROLL_UP: JSON.stringify([
                {
                    hold: {
                        key: 38,
                        delay: 100,
                    },
                    modifiers: { shift: true },
                },
            ]),
            PLAYER_INPUT_SCROLL_DOWN: JSON.stringify([
                {
                    hold: {
                        key: 40,
                        delay: 100,
                    },
                    modifiers: { shift: true },
                },
            ]),
            PLAYER_INPUT_SCROLL_DIRECTION: JSON.stringify({
                horizontalTracksMouseMovement: true,
                verticalTracksMouseMovement: true,
            }),
            PLAYER_INPUT_DRAG_DIRECTION: JSON.stringify({
                horizontalTracksMouseDrag: true,
                verticalTracksMouseDrag: true,
            }),
            PLAYER_INPUT_MODIFIER_KEY_CODES: JSON.stringify({
                shift: [16],
                ctrl: [17],
                alt: [18],
                meta: [224],
            }),
            MAP_KEYBOARD_SCROLL_SPEED_PER_UPDATE: JSON.stringify({
                horizontal: 7,
                vertical: 5,
            }),
        },
    },
})
