# UI Blockers
A list of possible noise barriers that the player might face, and how to mitigate them.

## Must spend Multiple Action Points for a given turn
During play testing, I would see people start a turn, perform one action, and then try to switch teammates.
There was frustration over making the switch, not realizing their turn was still ongoing, and then switching back.

### Mitigations
- Keep the UI highlighting the character.
- Highlight the map movement to show where they can move and act with their remaining actions.
- Slightly dim other characters so the player is drawn to the actor.
- Highlight the selected location to show where the actor is.

## How many Action Points?
One player did think about healing their teammate, but they didn't realize they lost too many actions getting into range.
So they got in range, tried to heal and were surprised when the "You need 2 action points" message appeared.
Their teammate then died from taking too much damage.

### Mitigations
- Action buttons should mention if they do not cost 1 action point (DONE)
- Action bar should glow to indicate how many points the player will spend on this action.

## Had to memorize what actions did
- Torrin's ranged attack was getting performed in melee. Either players didn't know it was ranged or they treated everything as melee.
- Torrin's healing ability was not obvious. Players would let a wounded Sir Camil travel on while Torrin idled.

### Mitigations
- Add icons for buttons to quickly explain their intent (DONE)
- Add a quick text description under the button to explain interesting behavior (DONE)
- Add a dialogue that appears if Sir Camil is injured at the start of a turn. Maybe have him suggest a retreat if Torrin is out of reach.
- Add pop up text to explain what the action does.

## MAP is unknown
Players didn't notice the Multiple Attack Penalty. There's too much text already, they're not reading it.

### Mitigations
- Add a "-3 attack" message on the buttons affected by it
- Change the visual attack display to show the debuffs more prominently

## No Undo
It's hard to experiment when you can't undo decisions like moving into range. Players are just learning the system, it would be good to let them undo decisions.

## First mission needs training wheels (scaffolding)
I need a smoother experience for newcomers. They need to have the freedom to explore the rules without getting overwhelemed.

### Mitigations
- First enemy will always miss
- First enemy will always get hit
- Warn about the group of 3 enemies
- Update AI to warn the final two will rush as soon as you get close
