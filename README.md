# Bounce Out

[insert gif of demo here]

[insert images to make terminology such as `launch vector`, and `piece` clear]

A multiplayer, synchronous turn-based game with a Javascript client and an Elixir server.
The code that simulates the physics of the sliding balls is done on the client.
The server takes care of validating player inputs, game lobby creation, and management of games.

The client and server communicate with websockets. A Postgres database is used to temporarioly store games that were played in the event that a player is reported for cheating, in which case the game data would be analyzed to determine if cheating occured.

## Client and Server Interaction

A good way to see how the client and server interact is by going through a couple rounds of a game:

1. Server starts the game with multiple clients and information on the starting location of their balls.
2. The clients choose launch vectors for each of their balls.
3. The client caps the launch vectors to a pre-determined maximum magnitude in case a client tried to cheat by value that was too big.
4. The clients send their vectors and ball locations to the server.
5. The server sends out all vectors of the client's opponent to each client ,with the current location of the balls that the server has.
6. The clients use the launch vectors and ball locations from the server to animate the game state updating.
   This way, if a bad actor tried changing the local location of the balls before the simulation occurs, it will have no effect.
7. Immediately after the animation is finished, clients send the updated location of their balls to the server.
8. The server updates the position of the balls in its state.
9. If all of the balls of a client have fallen off, that client loses. A game can result in a draw.
   If no client has lost, return to step `2`.
10. The server stores the game info in the database temporarily so that the game can be analyzed in the event that a player reports cheating.

With this system, none of the simulation code has to be run on the server. This helps us in the following ways:

- We do not have to worry about finding a way to have both the client and server run a consistent simulation every round.
- The server is more performant and the cost of running the server is cheaper since it does not have to do as much work.

## Implementing the launch mechanism

Plan 1:

1. Pieces are assigned `collisionFilters` that correspond to the player that controls while still allowing all pieces to collide with each other.
2. Each player's mouse is assigned their unique `collisionFilter` to correspond to the pieces they can set the launch vector for.
3. At the beginning of the round, all pieces start off as being set to `static` = true.
4. Players drag their launch vectors into place.
5. Once time is up:
    1. The `collisionFilter` of the mice are changed so that they are no longer matching the pieces.
    2. The `static` property of each piece is set to false
    3. The pieces are launched
6. Once pieces have stopped moving, return to step `3`

Plan 2:

1. Pieces are assigned a `collisionFilter` such that they can collide with each other.
2. Each player's mouse is assigned a `collisionFilter` such that it cannot collide with the pieces.
3. At the beginning of the round, a `sensor` is created on top of each piece controlled by the player with a `collisionFilter` that matches the player's mouse.
4. Players drag their launch vectors into place.
5. Once time is up:
    1. The `sensor`s are destroyed
    2. The pieces are launched
6. Once pieces have stopped moving, return to step `3`

In the app, the algorithm outlined in `plan 2` was used because it had the least amount of things to change and keep track of each round.

## Assigning Pieces Owned by each Client

The current plan to assign which pieces each client owns is the following:

1. A game lobby is created with a set maximum number of players.
2. The server sends a `player` integer, starting at `0` to the person that creates the lobby.  
3. Every time a person joins the lobby, `player` is incremented and sent to the client that joined until the maximum number of players for that lobby is reached.
4. Clients take the array `[1, 2, 3]`, then add `3 * player` to each index to get an array of the ids of the pieces that they own.

## TODO

- [ ] Javascript client
- [ ] Elixir server
- [ ] Database that stores games
- [ ] Allow players to create account
- [ ] Allow players to save favorite color as skin
- [ ] Add CI/CL pipelines
- [ ] md book
