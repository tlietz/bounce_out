defmodule BounceOutWeb.PageControllerTest do
  use BounceOutWeb.ConnCase

  test "GET /", %{conn: conn} do
    conn = get(conn, "/")
  end
end
