defmodule BounceOutWeb.GameChannelTest do
  use BounceOutWeb.ChannelCase

  setup do
    {:ok, _, socket} =
      BounceOutWeb.UserSocket
      |> socket("user_id", %{some: :assign})
      |> subscribe_and_join(BounceOutWeb.GameChannel, "game:lobby")

    %{socket: socket}
  end

  test "ping replies with status ok", %{socket: socket} do
    ref = push(socket, "ping", %{"hello" => "there"})
  end

  test "shout broadcasts to game:lobby", %{socket: socket} do
    push(socket, "shout", %{"hello" => "all"})
  end

  test "broadcasts are pushed to the client", %{socket: socket} do
    broadcast_from!(socket, "broadcast", %{"some" => "data"})
  end
end
