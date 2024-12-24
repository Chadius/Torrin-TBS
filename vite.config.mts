import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }

    const version = "0.0.021"
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
        "process.env.KEYBOARD_SHORTCUTS_BINDINGS_NEXT_SQUADDIE":
            JSON.stringify(
                process.env.KEYBOARD_SHORTCUTS_BINDINGS_NEXT_SQUADDIE
            ) || JSON.stringify("[88, 17]"),
        "process.env.KEYBOARD_SHORTCUTS_BINDINGS_ACCEPT":
            JSON.stringify(process.env.KEYBOARD_SHORTCUTS_BINDINGS_ACCEPT) ||
            JSON.stringify("[13,32]"),
        "process.env.KEYBOARD_SHORTCUTS_BINDINGS_CANCEL":
            JSON.stringify(process.env.KEYBOARD_SHORTCUTS_BINDINGS_CANCEL) ||
            JSON.stringify("[8,46,27]"),
        "process.env.MOUSE_BUTTON_BINDINGS_ACCEPT":
            JSON.stringify(process.env.MOUSE_BUTTON_BINDINGS_ACCEPT) ||
            JSON.stringify("left"),
        "process.env.MOUSE_BUTTON_BINDINGS_INFO":
            JSON.stringify(process.env.MOUSE_BUTTON_BINDINGS_INFO) ||
            JSON.stringify("center"),
        "process.env.MOUSE_BUTTON_BINDINGS_CANCEL":
            JSON.stringify(process.env.MOUSE_BUTTON_BINDINGS_CANCEL) ||
            JSON.stringify("right"),
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
