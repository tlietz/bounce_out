defmodule BounceOut do
  @moduledoc """
  The server's public API of the Bounce Out game.
  """
  alias BounceOut.Runtime.Server, as: GameServer

  @spec new_game :: {:error, any} | {:ok, pid}
  def new_game() do
    GameServer.start_link({})
  end

  defdelegate new_player(game_agent), to: GameServer

  defdelegate get_player(game_agent), to: GameServer

  defdelegate get_game(game_agent), to: GameServer
end
