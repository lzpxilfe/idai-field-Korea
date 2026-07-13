defmodule FieldHub.TestDiskSpace do
  @moduledoc false

  def available_bytes(_path) do
    case Application.fetch_env!(:field_hub, :test_disk_available_bytes) do
      value when is_integer(value) -> {:ok, value}
      {:error, _reason} = error -> error
    end
  end
end
