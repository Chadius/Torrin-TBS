# File Access HUD
## Overview
To help transition from the old HUD to a new HUD, the Save/Load buttons and their functionality was pulled away into their
own component. This took longer than expected and there are caveats that should be taken into account.

## Issue: Who controls the buttons?
The Save and Load buttons need change status over time, but it's difficult to centralize their control.

- Disable the buttons when the user clicks save and wait for 2 seconds before setting to Ready.
- Hover the buttons when the user hovers over them.
- Disable the buttons when it's not the player's turn
- Disable the buttons when a player controlled squaddie has started their turn

Other components know when this happens, and it's important the HUD knows about this. How can we keep track of these events?

### Current: Enable/DisableButtons function
There is a direct function that can enable and disable buttons. It is up to other components to call this when it's necessary.

This means the components have to remember this, and they have to test for another component's behavior.

#### Suggestion: Listener based calls
- Make a message board component.
- FileAccess HUD listens for these events
- Components can generate events to the message board.
- Message board delivers the events to the FileAccess HUD

This decouples the components from the FileAccessHUD, and now it doesn't matter where the message comes from.

Challenge: How do I do this in TypeScript? 
- Make multiple message interfaces with types that share a common MessageBoardMessage interface.
- Make a MessageBoardListener interface that guarantees:
- - messageBoardListenerId so it can be called directly
- - receiveMessage function that passes a MessageBoardMessage
- Make a MessageBoardSender interface that guarantees:
- - messageBoardSenderId that it can refer to
- - sendMessage function that passes a MessageBoardMessage

## Issue: Loading is instant
Clicking the load button has no visual effect in game. Everything manages to resolve before it is drawn.

- Flag is set
- A file prompt appears immediately
- If you select a file, the state is cleared as the file loads
- If you cancel, no error message is shown (that's OK)
- If you load a bad file, the game silently stops (unless it's in the title screen)

If the load is successful or user canceled this is acceptable behavior.

If the file had an error, a message should appear.

The listener system may fix this. Generate a "Load Failed" event and that will set up the flags as needed.
