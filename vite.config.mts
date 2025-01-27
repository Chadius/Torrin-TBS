import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }

    const version = "0.0.025"
    const environmentVariables = {
        "process.env.CAMPAIGN_ID":
            JSON.stringify(process.env.CAMPAIGN_ID) ||
            JSON.stringify("templeDefense"),
        "process.env.SCREEN_WIDTH":
            JSON.stringify(process.env.SCREEN_WIDTH) || JSON.stringify(1280),
        "process.env.SCREEN_HEIGHT":
            JSON.stringify(process.env.SCREEN_HEIGHT) || JSON.stringify(768),
        "process.env.VERSION":
            JSON.stringify(process.env.VERSION) || JSON.stringify(version),
        "process.env.LOG_MESSAGES":
            JSON.stringify(process.env.LOG_MESSAGES) || JSON.stringify(false),
        "process.env.STARTUP_MODE":
            JSON.stringify(process.env.STARTUP_MODE) ||
            JSON.stringify("TITLE_SCREEN"),
        "process.env.MOUSE_BUTTON_BINDINGS_ACCEPT":
            JSON.stringify(process.env.MOUSE_BUTTON_BINDINGS_ACCEPT) ||
            JSON.stringify("left"),
        "process.env.MOUSE_BUTTON_BINDINGS_INFO":
            JSON.stringify(process.env.MOUSE_BUTTON_BINDINGS_INFO) ||
            JSON.stringify("center"),
        "process.env.MOUSE_BUTTON_BINDINGS_CANCEL":
            JSON.stringify(process.env.MOUSE_BUTTON_BINDINGS_CANCEL) ||
            JSON.stringify("right"),
        "process.env.PLAYER_INPUT_ACCEPT":
            JSON.stringify(process.env.PLAYER_INPUT_ACCEPT) ||
            JSON.stringify('[{"press":13},{"press":32}]'),
        "process.env.PLAYER_INPUT_CANCEL":
            JSON.stringify(process.env.PLAYER_INPUT_CANCEL) ||
            JSON.stringify('[{"press":8},{"press":46},{"press":27}]'),
        "process.env.PLAYER_INPUT_NEXT":
            JSON.stringify(process.env.PLAYER_INPUT_NEXT) ||
            JSON.stringify('[{"press":88},{"press":17}]'),
        "process.env.PLAYER_INPUT_SCROLL_LEFT":
            JSON.stringify(process.env.PLAYER_SCROLL_LEFT) ||
            JSON.stringify(
                '[{"hold":{"key":37, "delay":100},"modifiers":{"shift":true}}]'
            ),
        "process.env.PLAYER_INPUT_SCROLL_RIGHT":
            JSON.stringify(process.env.PLAYER_SCROLL_RIGHT) ||
            JSON.stringify(
                '[{"hold":{"key":39, "delay":100},"modifiers":{"shift":true}}]'
            ),
        "process.env.PLAYER_INPUT_SCROLL_UP":
            JSON.stringify(process.env.PLAYER_SCROLL_UP) ||
            JSON.stringify(
                '[{"hold":{"key":38, "delay":100},"modifiers":{"shift":true}}]'
            ),
        "process.env.PLAYER_INPUT_SCROLL_DOWN":
            JSON.stringify(process.env.PLAYER_SCROLL_DOWN) ||
            JSON.stringify(
                '[{"hold":{"key":40, "delay":100},"modifiers":{"shift":true}}]'
            ),
        "process.env.PLAYER_INPUT_MODIFIER_KEY_CODES":
            JSON.stringify(process.env.PLAYER_INPUT_MODIFIER_KEY_CODES) ||
            JSON.stringify(
                '{"shift":[16],"ctrl":[17],"alt":[18],"meta":[224]}'
            ),
        "process.env.MAP_KEYBOARD_SCROLL_SPEED_PER_UPDATE":
            JSON.stringify(process.env.MAP_KEYBOARD_SCROLL_SPEED_PER_UPDATE) ||
            JSON.stringify('{"horizontal": 7,"vertical": 5}'),
    }
    if (mode === "production") {
        environmentVariables["process.env.CAMPAIGN_ID"] =
            JSON.stringify("templeDefense")
    } else {
        environmentVariables["process.env.VERSION"] = JSON.stringify(
            `${version}-DEVELOPMENT`
        )
    }

    console.log("VERSION: " + environmentVariables["process.env.VERSION"])
    console.log(
        "CAMPAIGN_ID: " + environmentVariables["process.env.CAMPAIGN_ID"]
    )

    return {
        base: "",
        plugins: [],
        server: {
            open: true,
            port: 3000,
        },
        root: "./",
        define: {
            ...environmentVariables,
        },
    }
})
