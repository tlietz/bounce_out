defmodule BounceOut do
  @moduledoc """
  The server's public API of the Bounce Out game.
  """

  defdelegate new_game(), to: BounceOut.Impl.Game

  defdelegate new_player(game), to: BounceOut.Impl.Game

  defdelegate get_player(game), to: BounceOut.Impl.Game
end
