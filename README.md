# Bounce Out

[insert gif of demo here]

A multiplayer, synchronous turn-based game with a Javascript client and an Elixir server.
The code that simulates the physics of the sliding balls is done on the client.
The server takes care of validating player inputs, game lobby creation, and management of games.

The client and server communicate with websockets. A Postgres database is used to temporarioly store games that were played in the event that a player is reported for cheating, in which case the game data would be analyzed to determine if cheating occured.

## Client and Server Interaction

A good way to see how the client and server interact is by going through a couple rounds of a game:

1. Server starts the game with multiple clients and information on the starting location of their balls.
2. The clients choose launch vectors for each of their balls.
3. The clients sends their vectors and ball locations to the server.
4. The server caps the vectors to a pre-determined maximum magnitude in case a client tried to cheat by putting in a value that was too big.
5. The server sends out all the vectors it receives to the clients with the current location of the balls that the server has.
6. The clients use the launch vectors and ball locations from the server to animate the game state updating.
   This way, if a bad actor tried changing the local location of the balls before the simulation occurs, it will have no effect.
7. Immediately after the animation is finished, two of the clients send the updated location of their balls to the server. If there is a disagreement with the location of the balls, the game will continue with whatever
8. The server updates the position of the balls in its state.
9. If all of the balls of a client have fallen off, that client loses. A game can result in a draw.
   If no client has lost, return to step `2`.
10. The server stores the game info in the database temporarily so that the game can be analyzed in the event that a player reports cheating.

With this system, none of the simulation code has to be run on the server unless a player reports cheating. This helps us in multiple ways:

- We do not have to worry about finding a way to have both the client and server run a consistent simulation to each other every round.
- The server is more performant, and cheaper since it does not have to do as much work.

## TODO

- [ ] Javascript client
- [ ] Elixir server
- [ ] Database that stores games
- [ ] Add CI/CL pipelines
- [ ] md book
