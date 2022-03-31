defmodule BounceOut.Impl.Game do
  @type playerId :: integer
  @type position :: {integer, integer}
  @type state :: :initializing | :choosing | :simulating | :finished

  @type t :: %__MODULE__{
          players: integer,
          max_players: integer,
          game_state: state,
          piece_positions: %{playerId => [position]}
        }

  defstruct(
    players: 0,
    max_players: 2,
    game_state: :initializing,
    # a map with key of playerId, and value of piece position {x, y}
    piece_positions: %{}
  )

  @spec new_game() :: t
  def new_game() do
    %__MODULE__{
      piece_positions: %{1 => []}
    }
  end

  @spec new_player(t) :: t
  def new_player(game) do
    if game.players < game.max_players do
      %{game | players: game.players + 1}
    else
      %{game | players: 1}
    end
  end

  @spec get_player(t) :: playerId
  def get_player(game) do
    game.players
  end

  @spec get_game(t) :: t
  def get_game(game) do
    game
  end
end
