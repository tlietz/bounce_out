defmodule BounceOutWeb.GameChannel do
  use BounceOutWeb, :channel

  @impl true
  def join("game:lobby", payload, socket) do
    if authorized?(payload) do
      {:ok, 1, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("player", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (game:lobby).
  @impl true
  def handle_in("shout", payload, socket) do
    broadcast!(socket, "shout", payload)
    {:noreply, socket}
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
