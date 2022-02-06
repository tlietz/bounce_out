defmodule BounceOutWeb.PageController do
  use BounceOutWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end

  def new(conn, _params) do
    game = BounceOut.new_game()

    conn |> put_session(:game, game)
  end
end
