defmodule BounceOut.Impl.Game do
  @type t :: %__MODULE__{
          players: integer,
          max_players: integer
        }

  defstruct(
    players: 0,
    max_players: 2
  )

  @spec new_game() :: t
  def new_game() do
    %__MODULE__{}
  end

  @spec new_player(t) :: t
  def new_player(game) do
    %{game | players: game.players + 1}
  end

  @spec get_player(t) :: integer
  def get_player(game) do
    game.players
  end

  def get_game(game) do
    game
  end
end
