# Object-Oriented Design via Service Pattern
Many object-oriented systems are implemented with classes, using the `new` keyword in Typescript.

## Issues with classes
There were a few issues with the traditional class structure:

### Serialization
`JSON.stringify` and `JSON.parse` are easy ways to map interfaces and simple objects to and from strings.

Save file integrity is a priority. When players save a game they should feel confident the file will work.
To maintain Robustness, I try to use the JSON functions directly.
Usability wise, I want to be able to read the parsed object and immediately tell what went wrong.

Classes with private fields present issues.
Private fields are stringified, but they aren't parsed. The parser does not have access to them and cannot set them. Classes rely on their private fields so the loading process fails. I could make custom parse and stringify functions but those are error-prone if they are not updated.

### Ease of Test
Classes mix state and function. 
It's more difficult to figure out why a component is failing. It's also difficult to set up for tests.

## Service pattern
State is easy to serialize if it is separated from the behavior.

In Typescript we can use interfaces without functions to store state.

We can use the Service pattern to create a series of functions.

For example, `Service.new` can create a state object, provided it has the correct arguments.
