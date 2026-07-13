defmodule FieldHub.FileUploadQuota do
  @moduledoc false

  use GenServer

  alias FieldHub.FileStore

  @type rejection_reason ::
          :upload_too_large
          | :project_quota_exceeded
          | :storage_quota_exceeded
          | :insufficient_disk_space
          | :storage_unavailable

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  @spec reserve(String.t(), non_neg_integer()) :: {:ok, reference()} | {:error, rejection_reason()}
  def reserve(project, expected_bytes) do
    GenServer.call(__MODULE__, {:reserve, project, expected_bytes})
  end

  @spec release(reference()) :: :ok
  def release(token) do
    GenServer.call(__MODULE__, {:release, token})
  end

  @impl true
  def init(_state) do
    {:ok, %{reservations: %{}, monitors: %{}}}
  end

  @impl true
  def handle_call({:reserve, project, expected_bytes}, {owner, _tag}, state) do
    case check_capacity(project, expected_bytes, state.reservations) do
      :ok ->
        token = make_ref()
        monitor = Process.monitor(owner)

        reservation = %{
          project: project,
          expected_bytes: expected_bytes,
          monitor: monitor
        }

        new_state = %{
          reservations: Map.put(state.reservations, token, reservation),
          monitors: Map.put(state.monitors, monitor, token)
        }

        {:reply, {:ok, token}, new_state}

      {:error, reason} ->
        {:reply, {:error, reason}, state}
    end
  end

  def handle_call({:release, token}, _from, state) do
    {:reply, :ok, remove_reservation(state, token)}
  end

  @impl true
  def handle_info({:DOWN, monitor, :process, _pid, _reason}, state) do
    case Map.fetch(state.monitors, monitor) do
      {:ok, token} -> {:noreply, remove_reservation(state, token, false)}
      :error -> {:noreply, state}
    end
  end

  defp check_capacity(project, expected_bytes, reservations) do
    max_upload_bytes = config!(:file_upload_max_bytes)

    if expected_bytes > max_upload_bytes do
      {:error, :upload_too_large}
    else
      with {:ok, project_usage} <- FileStore.project_usage_bytes(project),
           {:ok, storage_usage} <- FileStore.total_usage_bytes(),
           {:ok, available_bytes} <- available_bytes(),
           :ok <-
             check_limit(
               project_usage,
               reserved_bytes(reservations, project),
               expected_bytes,
               config!(:file_project_quota_bytes),
               :project_quota_exceeded
             ),
           :ok <-
             check_limit(
               storage_usage,
               reserved_bytes(reservations),
               expected_bytes,
               config!(:file_storage_quota_bytes),
               :storage_quota_exceeded
             ),
           :ok <- check_disk_space(available_bytes, reservations, expected_bytes) do
        :ok
      else
        {:error, reason}
        when reason in [
               :project_quota_exceeded,
               :storage_quota_exceeded,
               :insufficient_disk_space
             ] ->
          {:error, reason}

        {:error, _reason} ->
          {:error, :storage_unavailable}
      end
    end
  end

  defp check_limit(used, reserved, incoming, limit, reason) do
    if used + reserved + incoming <= limit, do: :ok, else: {:error, reason}
  end

  defp check_disk_space(available, reservations, incoming) do
    reserved_free = config!(:file_reserved_free_bytes)

    if available - reserved_bytes(reservations) - incoming >= reserved_free do
      :ok
    else
      {:error, :insufficient_disk_space}
    end
  end

  defp available_bytes do
    provider = Application.fetch_env!(:field_hub, :file_disk_space_provider)
    provider.available_bytes(FileStore.root_directory())
  end

  defp reserved_bytes(reservations, project \\ nil) do
    reservations
    |> Map.values()
    |> Enum.filter(fn reservation -> is_nil(project) or reservation.project == project end)
    |> Enum.sum_by(& &1.expected_bytes)
  end

  defp config!(key) do
    case Application.fetch_env!(:field_hub, key) do
      value when is_integer(value) and value >= 0 -> value
      value -> raise ArgumentError, "#{key} must be a non-negative integer, got: #{inspect(value)}"
    end
  end

  defp remove_reservation(state, token, demonitor? \\ true) do
    case Map.pop(state.reservations, token) do
      {nil, _reservations} ->
        state

      {%{monitor: monitor}, reservations} ->
        if demonitor?, do: Process.demonitor(monitor, [:flush])
        %{reservations: reservations, monitors: Map.delete(state.monitors, monitor)}
    end
  end
end
