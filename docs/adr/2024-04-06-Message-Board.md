# Message Board design
## Problem
### Tight coupling between components
Component A needs to react to an action Component B generates.

Component B can call Component A, but:
- Testing Component B requires adding or mocking Component A, coupling them together
- It's difficult to change the order of components (the HUD refactor comes to mind)

### Testing requires lots of mocking
Some components have too many dependencies or they have lots of other objects to rely on.

Unit testing is cumbersome because the requirements have to be mocked and a lot of behavior has to be known upfront.

## Message Board pattern
This is similar to the Listener/Receiver pattern.
A MessageBoard object handles talking to other objects. 

- MessageBoard is part of the global state so it is always accessible.
- Listeners register themselves with the MessageBoard. They give their ID and the type of message they would like to receive.
- Callers send a message with a given type to the MessageBoard.
- The MessageBoard calls all listeners for the message type.

## Complications and Limitations
### Listener must follow an interface
It's difficult to make stateless objects. A listener must follow an interface to send messages and give an id.
TypeScript doesn't do duck typing, so I need to make a class with the interface. When it gets a message it can pass the 
payload on to the stateless library functions.

### Infinite Message loop
If we're not careful we can make an infinite loop if the message generates another message and another component 
responds to it immediately with another message.

A few guidelines:
- Try to avoid calling messages in the response callbacks.
- Rewrite Message Board so it doesn't immediately call, but rather makes a stack of messages to call
- Message Board can warn if it's more than X levels deep using a counter of some kind.
- A message board that received a type of message cannot send that message in the response.

### What payload should be used
Do I pass the global state?
Do I pass the relevant info?

Because the receivers may change at any point I can't assume I know what the caller needs.

Since I'm using a lot of stateless objects I also need to send the state itself.
