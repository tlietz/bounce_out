defmodule BounceOutWeb.GameChannel do
  use BounceOutWeb, :channel

  @impl true
  def join("game:lobby", payload, socket) do
    if authorized?(payload) do
      game = BounceOut.new_game() |> BounceOut.new_player() |> BounceOut.get_game()
      {:ok, %{playerId: game.players, players: game.max_players}, socket}
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
