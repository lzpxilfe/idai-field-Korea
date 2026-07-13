defmodule FieldHub.FileUploadQuotaTest do
  use ExUnit.Case

  alias FieldHub.{FileStore, FileUploadQuota}

  @project "quota-test"
  @quota_keys [
    :file_upload_max_bytes,
    :file_project_quota_bytes,
    :file_storage_quota_bytes,
    :file_reserved_free_bytes,
    :test_disk_available_bytes
  ]

  setup do
    previous_config = Map.new(@quota_keys, &{&1, Application.fetch_env!(:field_hub, &1)})

    FileStore.remove_directories(@project)
    FileStore.create_directories(@project)

    Application.put_env(:field_hub, :file_upload_max_bytes, 100)
    Application.put_env(:field_hub, :file_project_quota_bytes, 100)
    Application.put_env(:field_hub, :file_storage_quota_bytes, 100)
    Application.put_env(:field_hub, :file_reserved_free_bytes, 10)
    Application.put_env(:field_hub, :test_disk_available_bytes, 1_000)

    on_exit(fn ->
      Enum.each(previous_config, fn {key, value} ->
        Application.put_env(:field_hub, key, value)
      end)

      FileStore.remove_directories(@project)
    end)
  end

  test "rejects a file larger than the per-upload limit" do
    Application.put_env(:field_hub, :file_upload_max_bytes, 9)

    assert {:error, :upload_too_large} = FileUploadQuota.reserve(@project, 10)
  end

  test "counts existing project files against the project quota" do
    :ok = FileStore.store("existing", @project, :original_image, "123456")
    Application.put_env(:field_hub, :file_project_quota_bytes, 10)

    assert {:error, :project_quota_exceeded} = FileUploadQuota.reserve(@project, 5)
  end

  test "counts existing files against the total storage quota" do
    :ok = FileStore.store("existing", @project, :original_image, "123456")
    Application.put_env(:field_hub, :file_storage_quota_bytes, 10)

    assert {:error, :storage_quota_exceeded} = FileUploadQuota.reserve(@project, 5)
  end

  test "keeps configured free disk space in reserve" do
    Application.put_env(:field_hub, :test_disk_available_bytes, 14)

    assert {:error, :insufficient_disk_space} = FileUploadQuota.reserve(@project, 5)
  end

  test "rejects uploads when free disk space cannot be determined" do
    Application.put_env(:field_hub, :test_disk_available_bytes, {:error, :unavailable})

    assert {:error, :storage_unavailable} = FileUploadQuota.reserve(@project, 5)
  end

  test "includes concurrent upload reservations in quota checks" do
    Application.put_env(:field_hub, :file_project_quota_bytes, 10)
    parent = self()

    uploader =
      spawn(fn ->
        {:ok, token} = FileUploadQuota.reserve(@project, 6)
        send(parent, :reserved)

        receive do
          :release -> FileUploadQuota.release(token)
        end
      end)

    uploader_monitor = Process.monitor(uploader)

    assert_receive :reserved
    assert {:error, :project_quota_exceeded} = FileUploadQuota.reserve(@project, 5)

    send(uploader, :release)
    assert_receive {:DOWN, ^uploader_monitor, :process, ^uploader, :normal}
  end
end
