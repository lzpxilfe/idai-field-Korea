defmodule FieldHub.DiskSpace do
  @moduledoc false

  @spec available_bytes(Path.t()) :: {:ok, non_neg_integer()} | {:error, term()}
  def available_bytes(path) do
    path
    |> Path.expand()
    |> String.to_charlist()
    |> :disksup.get_disk_info()
    |> Enum.find(fn
      {_mount, total_kilobytes, available_kilobytes, _capacity_percent} ->
        total_kilobytes > 0 and available_kilobytes >= 0

      _other ->
        false
    end)
    |> case do
      {_mount, _total_kilobytes, available_kilobytes, _capacity_percent} ->
        {:ok, available_kilobytes * 1024}

      nil ->
        {:error, :disk_space_unavailable}
    end
  rescue
    error -> {:error, error}
  catch
    :exit, reason -> {:error, reason}
  end
end
