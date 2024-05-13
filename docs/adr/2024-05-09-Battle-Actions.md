# Life Cycle of an Action
Battle is about processing a series of actions. This is the key component of battle and should be treated as a primary object.

The life of an action has these steps, and we could build a state machine about it.

1. Choose an Actor
2. Consider all Actions
3. Select Action Options
4. Preview Action Results
5. Process Action Results
6. Show Action Results

We need to consider:
- How the player advances
- How the computer advances
- Multiple steps can be performed at once
- The player can undo previous steps
- The player can cancel the current step

## Choose an Actor
Actions begin with an actor. Most actors have a location, stats and actions they can take. 

In later development, the environment may be able to take actions. Imagine a volcano that spews rocks, or sand flows.
I would probably implement this using a neutral squaddie, but it could be conceived without an actor.

Valid squaddies:
- Have actions remaining to act with
- Aren't paralyzed, stunned, captured, etc.

### Computer considerations
The AI will make multiple steps: Choose Actor, Select Action, Select Targets, and confirm it.

### Player considerations
The player will have to click on the squaddie they want to act with. Valid options:
- Are player controlled (usually on the Player Team)

#### Cancel/Undo
This is the first decision involved in making an action. Players can simply choose a different squaddie, or they can 
click on the map to cancel.

Note this only applies if the squaddie hasn't acted yet. If they have, then there is no way to cancel without undoing 
all actions.

## Consider all Actions
Show all actor's possible actions and quickly summarize what they do.
- An icon showcasing the general type of ability (a sword for melee attacks, a bow for ranged attacks, a heart to heal, etc.)
- The name of the action

We should show the action's quirks, if possible. Anything that differs from a 1 action point melee attack for 1 damage. 
Examples include:
- Range: 1-3
- 2 Damage
- 1 Healing
- 2 Action Points

If the action isn't possible, disable the button. Players still know the action exists, it's simply not useful right now.
Examples include:
- No targets in range
- Targets have full health, no need to heal
- Not enough Action Points

Note that basic movement isn't shown as a button. It's assumed the player will click on the map to move to their location.

### Computer considerations
The AI considers all actions as part of its processing. No need to show this unless the player observes the squaddie as 
part of the "choose actor" state.
### Player considerations
Players should know all valid actions as soon as possible. This way they don't waste time fiddling with unneeded actions.
How much do we disable? Depends on how much hand holding we want to do. This may be a later configurable option.

Hovering over a disabled action should have a popup telling them why it's disabled.

#### Cancel/Undo
The player hasn't made a decision yet - merely observing their actions.
- If they moved into a position where they thought they could act, they may wish to undo their previous movement.
- Do we let them cancel non-movement actions if they can't make the action they wanted to? This may be a configurable option.
- Maybe let them cancel if it affects allies

## Select Action Options
Now there is an opportunity to select the target.

If there is no target, or it hits everyone, or the player had to select the target (like moving) then there is no need 
for this step.

Note that an action can have multiple options. We need to stay in this step until all target options are selected.
- Move to a given location
- Select a squaddie
- Select a suboption (Body/Mind/Soul attacks, for example)

### Computer considerations
The AI will make multiple steps: Choose Actor, Select Action, Select Targets, and confirm it.
### Player considerations
How do we present sub-options? A mid-screen drop down menu should be enough.
How do we make sure options correctly update? For example, there may be a charge attack where the player can make 
an attack after moving.
- Option decision 1 has to involve movement
- Option decision 2 has to let them target from the destination

If the charge action requires a target, we have to make sure they cannot move to places they cannot attack from.  

#### Cancel
If an action has multiple options, the player needs to be able to step through them all.

#### Undo
Canceling before the first option means the player will back out of selecting the action and we should revert to the 
Consider all Actions step. 

## Preview Action Results
This step displays the likelihood of the action working, and its effects on the target.
Also show the action being used.

For attacks this would show the chance to hit and the expected damage, for example.

This is the last chance to avoid spending resources on an action.

### Computer considerations
The computer automatically confirms all actions. No UI work is required.

### Player considerations
The player expects to see the chance to hit and have a chance to either confirm the action or cancel.
- The game should indicate the chance to hit
- The game should show important modifiers, like MAP, or short term bonuses. 

Should we make a difference between cancelling the last option and all options?

#### Cancel/Undo
Cancelling should clear all options and return to Select Action Options.
Or maybe just the last option set? Uncertain.

## Process Action Results
The action is confirmed. It's time to find out what happens.

There is no additional input from the player or computer needed, we're just calculating.
## Show Action Results
The action is confirmed and the game knows the results. It's time to show it.

- The player should be able to skip the animation, as these animations take up the most time.
- The player should be able to skip animations by default. This means holding a button or adding a UI button to show animation.
- The player may wish for some animations to be skipped and some to be played by default. For example, skip the minion attacks, but animate fighting the boss.
- Can the player skip all NPC animations? Just skip all animations unless it triggers a player death or a mission failure.

#### Cancel
Player can always cancel the animation but this will complete the step.
This is done to speed up the game.
#### Undo
Should we allow people to undo results after seeing it? This will require special code to hold the game state.
