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
            KEYBOARD_SHORTCUTS_BINDINGS_NEXT_SQUADDIE: JSON.stringify([88, 17]),
            KEYBOARD_SHORTCUTS_BINDINGS_ACCEPT: JSON.stringify([13]),
            KEYBOARD_SHORTCUTS_BINDINGS_CANCEL: JSON.stringify([8, 46, 27]),
            MOUSE_BUTTON_BINDINGS_ACCEPT: "left",
            MOUSE_BUTTON_BINDINGS_INFO: "center",
            MOUSE_BUTTON_BINDINGS_CANCEL: "right",
        },
    },
})
