# Gameplay observations
## Free Range Movement
One player got confused on whose turn it was and made 0 distance moves, consuming all actions to switch, and then clicking back and uggggggghhhhhh
I've seen it before.

### Not clear you cannot interrupt turns
Once you move, you have to spend all of your actions for that character.
Need to make sure for free-range movement that you can cancel by returning to start position.

## Ending the Turn broke the game
"this.component is undefined" is all I got.
I Ended the Turn and it just hung forever.

## Boot size is inconsistent
When moving, one person didn't understand what the 1 boot icon meant.
They noticed the 2 boots and 3 boots icons were the same size boots, so why not make 1 boot the same?
Or add a number next to the boot, so I don't have to make a new icon for 4 boots.
I'm getting rid of the boots in the first place.

## OK/Cancel button can be offscreen
Which will hang the game because the UI is waiting for you to accept/cancel.
Luckily I added keyboard controls and someone suggested hitting Enter before I said it. Yay for instincts/reading the tutorial!
Boo that it was offscreen! I wasn't able to reproduce it, but I was able to cut it partially offscreen.

## Click on the Target -> "No targets in Range"
This came up a few times. The player would click on the action, see nothing is in range, try to click on the "Click on the target" icon and realize that doesn't work.

I should make it look more like an error message if no applicable targets are in range.

# Tech ideas
## Shoelace
https://shoelace.style/

Basic HTML components for web development, not complicated

## Central Limit Theorem
https://en.wikipedia.org/wiki/Central_limit_theorem

The more random samples you collect, the more likely you'll build a normal distribution.

So for 2d6, you'll create a standard normal distribution.

Maybe I can draw a curve of some kind to represent the distribution as a visual display.

## Hexagon Searching
Red Blob Games and A* searching, always a hoot.

https://www.redblobgames.com/grids/hexagons/#pathfinding
