# Webpack, or what is this thing?

https://frontendengineering.substack.com/p/process-is-not-defined

![Write source, go through build step to make bundle.js, send bundle to browser](https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9965b011-70a2-4d6c-8d82-0d3e8322ee82_842x281.png)
- You write some source code that may refer to environment variables.
- Compilers turn this into bundle.js, a single minified/compressed file.
- Bundle is sent directly to the browser to run it.

Webpack does a bunch of other stuff, like optimizing your code for production or adding debug tracing for development mode.

# How to inject webpack environment variables
https://docs.w3cub.com/webpack~5/api/cli#cli-environment-variables

The browser shouldn't have access to your environment - that's a security concern. So how do you inject variables?
Webpack will look for references to `process.env`, evaluate them on the programmer's machine, and replace them with the now hard coded value.

If the webpack config does not have it, then the code is left alone as `process.env`, but the browser will conclude "I don't know what process is" and throw an exception.

![webpack is the build step that replaces references to process.env](https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Fb78ce7ac-1f68-4bde-8976-5598c43c7c30_836x264.png)

## Configuring webpack config

You can use the `DefinePlugin` plugin in webpack to tell webpack what code to replace. Here's an example that replaces some environment variables like `CAMPAIGN_ID`. Make sure to add safe defaults.

```javascript
const environmentVariables = {
    "process.env.CAMPAIGN_ID": JSON.stringify(process.env.CAMPAIGN_ID) || JSON.stringify("templeDefense"),
    "process.env.SCREEN_WIDTH": JSON.stringify(process.env.SCREEN_WIDTH) || JSON.stringify(1280),
    "process.env.SCREEN_HEIGHT": JSON.stringify(process.env.SCREEN_HEIGHT) || JSON.stringify(768),
    "process.env.VERSION": JSON.stringify(process.env.VERSION) || JSON.stringify(version),
}
```

Then you add the `DefinePlugin` to the plugins section, passing in the environment variables.
```javascript
plugins: [
    new webpack.DefinePlugin(environmentVariables),
]
```

In `package.json`, your command should pass environment flags to the webpack command.
Note that you should run the command, too. `webpack serve` needs the flags as well.
You can always combine the flags, bundle the code and run the app with the same command, like so:

```json
{
  "dev": "CAMPAIGN_ID='sandbox' webpack serve --open --mode=development"
}
```

## Giving webpack environmental flags
Should you run it in development mode? Or production mode? Are there any flags you want to add?

You can use the `--env` flag, but now `module.export` must become a function. It will get env as an argument. Here's an example of a function:

"production" and "development" are built in keywords, it will know what you're trying to do here. These are added to the `argv` argument.

In this sample `modules.export` file, we both the `--env` argument and the `--mode` argument to override either the `CAMPAIGN_ID` or the `VERSION` we will inject into the app.

```javascript
module.exports = (env, argv) => {
    const version = "0.0.006"
    const environmentVariables = {
        "process.env.CAMPAIGN_ID": JSON.stringify(process.env.CAMPAIGN_ID) || JSON.stringify("templeDefense"),
        "process.env.VERSION": JSON.stringify(process.env.VERSION) || JSON.stringify(version),
    }
    if (argv.mode === "production") {
        environmentVariables["process.env.CAMPAIGN_ID"] = JSON.stringify("templeDefense")
    } else {
        environmentVariables["process.env.VERSION"] = JSON.stringify(`${version}-DEVELOPMENT`)
    }

    let base = {
        mode: argv.mode || "production",
        // ... other settings
        plugins: [
            new webpack.DefinePlugin(environmentVariables),
        ],
    }

    return base
}
```

If I want to run it in development mode and override `CAMPAIGN_ID`, this is how I would do it:
```bash
CAMPAIGN_ID='sandbox' webpack serve --open --mode=development
```
