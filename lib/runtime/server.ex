defmodule BounceOut.Runtime.Server do
  alias BounceOut.Impl.Game

  use Agent

  def start_link(_opts) do
    Agent.start_link(fn -> Game.new_game() end, name: :game1)
  end

  def new_player(game_agent) do
    Agent.update(game_agent, &Game.new_player(&1))
    game_agent
  end

  def get_player(game_agent) do
    Agent.get(game_agent, &Game.get_player(&1))
  end

  def get_game(game_agent) do
    Agent.get(game_agent, &Game.get_game(&1))
  end
end
