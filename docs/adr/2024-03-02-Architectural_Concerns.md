# Technical Overview
This is a single-player game. The entire engine downloads in one shot, while the engine retrieves resources as needed.

The user runs in a single HTML 5 canvas, using primarily the mouse (and maybe the keyboard.)

There is no server; the user is responsible to save and load files. THe game will give them a save file in JSON they can load at a later time.

# Operational Characteristics
## Performance
The size of the package is important, as the user will download the game everytime they want to play.
The game is expected to run in a browser, so some kind of JavaScript engine is required.

## Robustness
If an internet connection is bad, the game should indicate it cannot retrieve resources and wait for the connection to be restored.

# Structural Characteristics
## Configurability
Users should be able to upload configuration files to set controls and visual characteristics.

## Installability
Users should find it easy to get the program running.
Standard JavaScript players like web browsers should be enough.

# Cross-Cutting Characteristics
## Accessibility
The game is very visual in nature. The program should accommodate for large text, color blindness.

## Usability
Players need to understand the game's rules.
