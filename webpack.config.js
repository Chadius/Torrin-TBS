const HtmlWebpackPlugin = require("html-webpack-plugin")
const path = require("path")
const webpack = require("webpack")

module.exports = (env, argv) => {
    const version = "0.0.006"
    const environmentVariables = {
        "process.env.CAMPAIGN_ID": JSON.stringify(process.env.CAMPAIGN_ID) || JSON.stringify("templeDefense"),
        "process.env.SCREEN_WIDTH": JSON.stringify(process.env.SCREEN_WIDTH) || JSON.stringify(1280),
        "process.env.SCREEN_HEIGHT": JSON.stringify(process.env.SCREEN_HEIGHT) || JSON.stringify(768),
        "process.env.VERSION": JSON.stringify(process.env.VERSION) || JSON.stringify(version),
        "process.env.LOG_MESSAGES": JSON.stringify(process.env.LOG_MESSAGES) || JSON.stringify(false),
        "process.env.STARTUP_MODE": JSON.stringify(process.env.STARTUP_MODE) || JSON.stringify("TITLE_SCREEN"),
        "process.env.KEYBOARD_SHORTCUTS_BINDINGS_NEXT_SQUADDIE": JSON.stringify(process.env.KEYBOARD_SHORTCUTS_BINDINGS_NEXT_SQUADDIE) || JSON.stringify("[88, 17]"),
        "process.env.KEYBOARD_SHORTCUTS_BINDINGS_ACCEPT": JSON.stringify(process.env.KEYBOARD_SHORTCUTS_BINDINGS_ACCEPT) || JSON.stringify("[13]"),
        "process.env.KEYBOARD_SHORTCUTS_BINDINGS_CANCEL": JSON.stringify(process.env.KEYBOARD_SHORTCUTS_BINDINGS_CANCEL) || JSON.stringify("[8,46,27]"),
        "process.env.MOUSE_BUTTON_BINDINGS_ACCEPT": JSON.stringify(process.env.MOUSE_BUTTON_BINDINGS_ACCEPT) || JSON.stringify("left"),
        "process.env.MOUSE_BUTTON_BINDINGS_INFO": JSON.stringify(process.env.MOUSE_BUTTON_BINDINGS_INFO) || JSON.stringify("center"),
        "process.env.MOUSE_BUTTON_BINDINGS_CANCEL": JSON.stringify(process.env.MOUSE_BUTTON_BINDINGS_CANCEL) || JSON.stringify("right"),
    }
    if (argv.mode === "production") {
        environmentVariables["process.env.CAMPAIGN_ID"] = JSON.stringify("templeDefense")
    } else {
        environmentVariables["process.env.VERSION"] = JSON.stringify(`${version}-DEVELOPMENT`)
    }

    let base = {
        mode: argv.mode || "production",
        devtool:
            "inline-source-map",
        entry:
            "./src/index.ts",
        module:
            {
                rules: [
                    {
                        test: /\.tsx?$/,
                        use: "ts-loader",
                        exclude: [/node_modules/, /test/],
                    },
                ],
            }
        ,
        resolve: {
            extensions: [".tsx", ".ts", ".js"],
        }
        ,
        output: {
            filename: "bundle.js",
            path:
                path.resolve(__dirname, "dist"),
        }
        ,
        devServer: {
            static: "./dist",
        }
        ,
        plugins: [
            new HtmlWebpackPlugin({
                title: "Torrin's Trial",
            }),
            new webpack.DefinePlugin(environmentVariables),
        ],
    }

    console.log("VERSION: " + environmentVariables["process.env.VERSION"])
    console.log("CAMPAIN_ID: " + environmentVariables["process.env.CAMPAIGN_ID"])

    return base
}
