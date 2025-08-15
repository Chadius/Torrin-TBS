# The Battle of Fell Desert - Turn-Based Strategy Game

## Project Overview

**The Battle for Fell Desert** is a 2D turn-based strategy game built as a web application.
Set in a magical desert fantasy world, the game follows young water elemental Nahla and Sir Camil as they battle demon invaders in tactical hex-grid combat.

## Architecture & Design Decisions

Interfaces are easier to serialize, so there is a separation between raw data and the Services that use them.

Classes are used in instances where the fields are only used in runtime.

### Layered Architecture

#### Presentation Layer

Files in (`src/ui/`, `src/titleScreen/`, `src/battle/`) deal with user input and graphics.

- UI groups text and input into a single design atoms (buttons, labels, rectangles, images)
- TitleScreen uses buttons to start the campaign or load an existing file
- During Battle, passes mouse clicks to components to figure out the user's intent and animate actions
- Cutscenes and dialog are presented and are clicked through by the user
- Images are loaded lazily and loading is abstracted as much as possible. The assets may "pop in" when ready or the game can wait for them to finish loading before continuing.

#### Game Logic Layer

Files in (`src/battle/`, `src/gameEngine/`) interpret commands.

- Game Engine waits for the user to start the campaign or for the battle to end
- Battle alternates turns between player and enemy until victory or defeat

#### Domain Layer

Files in (`src/squaddie/`, `src/action/`) carry the concepts of the units (squaddies) on field and how to resolve attacking/movement.
Most of these are Service objects that work solely on interfaces, which make it easier to test the logic in isolation.

- Squaddies have names, hit points and movement per action
- Attacks are resolved between four degrees of success
- Squaddies can buff themselves for more defense or quicker movement

#### Data Layer

Files in (`src/resource/`, `src/dataLoader/`) are designed to handle loading resources and abstracting I/O access.

- Campaigns store game logic (enemy statistics, map placement)
- Each squaddie and action has its own growth data (Nahla, Demon Locusts, Longsword)
- Maps are constructed using a series of two character strings, consisting of the terrain and a space.

### Game Engine Design

The game uses a hierarchical design, relying on the drawing event loop that runs every frame.

The system also has a rudimentary messaging system. Components can send a message with necessary information and listeners can react to it. For example, the player wants to load a file. The file loader doesn't care who sent the message to load the file.

#### Game Engine

GameEngine is responsible for loading the campaign. It is also responsible for starting the title screen or the battle.
GameEngine also registers components to the messaging system.

#### BattleOrchestrator

The BattleOrchestrator uses a state machine to figure out which mode to show next.

- Player wants to give commands
- Show a Squaddie moving around
- Trigger a dialog based on mission-defined triggers
- Determine victory or defeat, then redirect to the game engine

#### BattleOrchestrator components

BattleOrchestrator has separate components for logical actions to help separate concerns.

- Player Action Target Select handles finding applicable targets, waiting for the user to select one (or selecting the only available target), and waiting for the user to confirm or cancel the action. Uses the StateMachine for logic and the ViewController for presentation.
- Battle Computer Squaddie calculates an action on its own using a Strategy pattern to prioritize different actions.

### Hexagonal Grid System

Movement and aiming attacks take place on a hexagonal grid system. Most of the logic is contained in (`src/hexMap/`).

- On screen locations are converted to Map Coordinates
- A\* algorithm for Pathfinding to determine the shortest distance between locations and to find the closest location a squaddie can stop on.
- Movement types can reduce movement costs and make some terrain passable (but not stoppable)
- Parses terrain from text strings

## Technology Stack & Library Selection

### Typescript

Type safety and interfaces for ease of use. However, I have to use a bundler to transpile to Javascript.

The bundler does make it easy to plug in which campaign I want and whether I want more debug information or not.

### p5.js

https://p5js.org/ is a relatively simple library that handles input and 2D graphics using HTML canvas.

- Web interface so users don't have to download or install, compatible on multiple browsers
- Primitives like lines, rectangles and circles make prototyping interfaces relatively quickly
- No built-in UI means I have to build a lot from scratch

### Vite & vitest

Test first is important for development, and vitest is similar enough to Jest I was able to get started.

- Some unit tests can be done by stubbing out the p5.js Graphics interface into a mock (see mocks.MockedGraphicsBufferService) and testing the arguments are called correctly.
- Components extract layout constants, object context and visual presentation to simplify testing.
- It may be possible to swap out graphics engines in the future if I keep it cleanly separated.

## Testing Strategy & Testability

- Write tests.
- Watch them fail for the right reason.
- Add enough code to make them pass.
  Every component is built with this approach before integrating it into the system.

- Some commonly used setup is moved into functions or utility files. For example, creating a squaddie and putting them on a map.
- The messaging system decouples callers from receivers, so I can test in isolation. Many tests begin with the component receiving a message.
- Most objects have functions to validate or sanitize them (or throw errors if it cannot be sanitized.) Important when accepting file data.

Stubbing out I/O has its own pitfalls. Sometimes the open dialog window appears repeatedly.

I'm still thinking about journey tests. I attempted to set up a test suite that would navigate through a standard turn, but it had to be updated repeatedly when an underlying component changed- I had the wrong abstraction layer.
