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
            LOG_MESSAGES: JSON.stringify(false),
            STARTUP_MODE: "TITLE_SCREEN",
            MOUSE_BUTTON_BINDINGS_ACCEPT: "left",
            MOUSE_BUTTON_BINDINGS_INFO: "center",
            MOUSE_BUTTON_BINDINGS_CANCEL: "right",
            PLAYER_INPUT_ACCEPT: JSON.stringify([
                { pressedKey: 13 },
                { pressedKey: 32 },
            ]),
            PLAYER_INPUT_CANCEL: JSON.stringify([
                { pressedKey: 8 },
                { pressedKey: 46 },
                { pressedKey: 27 },
            ]),
            PLAYER_INPUT_NEXT: JSON.stringify([
                { pressedKey: 88 },
                { pressedKey: 17 },
            ]),
            PLAYER_INPUT_MODIFIER_KEY_CODES: JSON.stringify({
                shift: [16],
                ctrl: [17],
                alt: [18],
                meta: [224],
            }),
        },
    },
})
