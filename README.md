# The Battle of Fell Desert - Turn-Based Strategy Game

## Project Overview

**The Battle for Fell Desert** is a 2D turn-based strategy game built as a web application.
Set in a magical desert fantasy world, the game follows young water elemental Nahla and Sir Camil as they battle demon invaders in tactical hex-grid combat.

[Project Design and Technical design notes are here](TECHNICAL.md)

## Installation

This is a web application that runs using vite and p5.js.

Install the dependencies, and then you should be all set.

- `npm run dev`: This runs the sandbox campaign in debug mode.
- `npm run start-debug`: This runs the main campaign in debug mode.
- `npm run start`: This runs the main campaign in production.
- `npm run test`: Full test suite execution
- `npm run build`: This will bundle the app into the `./dist` folder.
- `npm run zip`: This compresses the bundle into `./build/fill-desert.zip` and is ready for distribution.

## How to play

Controls are mostly bound to the mouse.

- Left Click: Accept
- Right Click: Cancel

There is limited keyboard support.

- Enter/Spacebar: Accept
- Escape/Backspace/Delete: Cancel

Click "Click Here" to get started.

### Battle begins

You alternate between the Player Phase and Enemy Phase. Most of the time your goal is to defeat all enemies before they defeat all of your players.

Each squaddie has 3 Action Points they can use to move and act. You can click on any of the blue spaces to move there. You can change your mind and move elsewhere

When you select an action, you'll see a preview of what it can do. Select a target or cancel. There is a prediction to show you what may happen. Click on OK to confirm, or start canceling.

Attacks have 4 degrees of success:

- Critical Failure: Miss, deal no damage
- Failure: Miss, deal no damage
- Success: Deal expected damage
- Critical Success: Deal double damage

You can also move the map in 4 different ways:

- Move the mouse to the edge of the screen.
- Click the mouse and drag it to move the map.
- Hold the Shift key and press the arrow keys to move the map in that direction.
- Use the mouse wheel to scroll up and down. Hold the shift key and use the mouse wheel to scroll left and right.
