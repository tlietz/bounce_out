defmodule BounceOutWeb.GameChannel do
  use BounceOutWeb, :channel

  alias BounceOut.Impl.Game

  @impl true
  def join("game:lobby", payload, socket) do
    if authorized?(payload) do
      player = Game.new_game() |> Game.new_player() |> Game.get_player()
      {:ok, player, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_in("player", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  def handle_in("launchVecs", payload, socket) do
    broadcast_from!(socket, "launchVecs", payload)
    {:noreply, socket}
  end

  # Add authorization logic here as required.
  defp authorized?(_payload) do
    true
  end
end
