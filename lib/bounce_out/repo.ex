defmodule BounceOut.Repo do
  use Ecto.Repo,
    otp_app: :bounce_out,
    adapter: Ecto.Adapters.Postgres
end
