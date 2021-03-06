defmodule BounceOut.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Start the Ecto repository
      BounceOut.Repo,
      # Start the Telemetry supervisor
      BounceOutWeb.Telemetry,
      # Start the PubSub system
      {Phoenix.PubSub, name: BounceOut.PubSub},
      # Start the Endpoint (http/https)
      BounceOutWeb.Endpoint,
      # Start a worker by calling: BounceOut.Worker.start_link(arg)
      {BounceOut.Runtime.Server, []}
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: BounceOut.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    BounceOutWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
