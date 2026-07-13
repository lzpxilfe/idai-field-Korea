defmodule FieldHubWeb.Rest.Api.Rest.File do
  use FieldHubWeb, :controller

  alias File.Stat
  alias FieldHub.{FileStore, FileUploadQuota}

  require Logger

  def index(conn, %{"project" => project, "types" => types}) when is_list(types) do
    parsed_types =
      types
      |> Enum.map(&parse_type/1)

    parsed_types =
      parsed_types
      |> Enum.filter(fn val ->
        case val do
          {:error, _} ->
            true

          _ ->
            false
        end
      end)
      |> case do
        [] ->
          # No errors found in parsed_types, return parsed_types list as-is
          parsed_types

        errors ->
          # Reduce all errors to a single {:error, msg} tuple.
          errors
          |> Enum.reduce({:error, "Unknown file types: "}, fn {:error, type}, {:error, acc} ->
            {:error, "#{acc} '#{type}'"}
          end)
      end

    case parsed_types do
      {:error, msg} ->
        send_resp(conn, 400, Jason.encode!(%{reason: msg}))

      valid ->
        file_store_data =
          project
          |> Zarex.sanitize()
          |> FileStore.file_index(valid)

        send_resp(conn, 200, Jason.encode!(file_store_data))
    end
  end

  def index(conn, %{"project" => _project, "types" => types}) do
    send_resp(conn, 400, Jason.encode!(%{reason: "Invalid 'types' parameter: '#{types}'."}))
  end

  def index(conn, %{"project" => project}) do
    file_store_data =
      project
      |> Zarex.sanitize()
      |> FileStore.file_index()

    send_resp(conn, 200, Jason.encode!(file_store_data))
  end

  def show(conn, %{"project" => project, "id" => uuid, "type" => type}) when is_binary(type) do
    parsed_type = parse_type(type)

    case parsed_type do
      {:error, type} ->
        send_resp(conn, 400, Jason.encode!(%{reason: "Unknown file type: #{type}"}))

      valid ->
        FileStore.get_file_path(
          Zarex.sanitize(uuid),
          Zarex.sanitize(project),
          valid
        )
        |> case do
          {:error, :enoent} ->
            send_resp(conn, 404, Jason.encode!(%{reason: "Requested file not found"}))

          {:ok, file_path} ->
            send_file(conn, 200, file_path)
        end
    end
  end

  def show(conn, _) do
    send_resp(conn, 400, Jason.encode!(%{reason: "Bad request"}))
  end

  def update(conn, %{"project" => project, "id" => uuid, "type" => type}) when is_binary(type) do
    sanitized_project = Zarex.sanitize(project)
    sanitized_uuid = Zarex.sanitize(uuid)

    with {:parsed_type, parsed_type} when is_atom(parsed_type) <-
           {:parsed_type, parse_type(type)},
         {:parsed_length, {:ok, expected_content_length}} <-
           {:parsed_length, parse_expected_content_length(conn)},
         {:quota, {:ok, reservation}} <-
           {:quota, FileUploadQuota.reserve(sanitized_project, expected_content_length)} do
      try do
        receive_and_store_file(
          conn,
          sanitized_project,
          sanitized_uuid,
          parsed_type,
          expected_content_length
        )
      after
        FileUploadQuota.release(reservation)
      end
    else
      {:parsed_type, {:error, type}} ->
        send_resp(conn, 400, Jason.encode!(%{reason: "Unknown file type: #{type}"}))

      {:parsed_length, {:error, :missing_content_length_header}} ->
        send_resp(conn, 411, Jason.encode!(%{reason: "Missing content length header"}))

      {:parsed_length, {:error, :invalid_content_length_header}} ->
        send_resp(conn, 400, Jason.encode!(%{reason: "Invalid content length header"}))

      {:quota, {:error, :upload_too_large}} ->
        send_resp(conn, 413, Jason.encode!(%{reason: "File exceeds configured upload limit."}))

      {:quota, {:error, :project_quota_exceeded}} ->
        send_resp(conn, 413, Jason.encode!(%{reason: "Project file storage quota exceeded."}))

      {:quota, {:error, :storage_quota_exceeded}} ->
        send_resp(conn, 413, Jason.encode!(%{reason: "Field Hub file storage quota exceeded."}))

      {:quota, {:error, :insufficient_disk_space}} ->
        send_resp(conn, 413, Jason.encode!(%{reason: "Insufficient file storage space."}))

      {:quota, {:error, :storage_unavailable}} ->
        send_resp(conn, 503, Jason.encode!(%{reason: "File storage is unavailable."}))
    end
  end

  defp receive_and_store_file(conn, project, uuid, type, expected_content_length) do
    case FileStore.create_write_io_device(uuid, project, type) do
      {{:ok, io_device}, tmp_file_path} ->
        try do
          case start_body_streaming(conn, io_device, tmp_file_path, expected_content_length) do
            {:ok, streamed_conn, ^expected_content_length} ->
              store_received_file(streamed_conn, project, uuid, type, tmp_file_path)

            {:ok, streamed_conn, _received_bytes} ->
              content_length_mismatch_response(streamed_conn)

            {:error, :upload_too_large, streamed_conn} ->
              send_resp(
                streamed_conn,
                413,
                Jason.encode!(%{reason: "File exceeds configured upload limit."})
              )

            {:error, :content_length_mismatch, streamed_conn} ->
              content_length_mismatch_response(streamed_conn)

            {:error, reason, streamed_conn} when reason in [:enospc, :edquot] ->
              Logger.error("File upload failed because storage is full: #{inspect(reason)}")
              send_resp(streamed_conn, 413, Jason.encode!(%{reason: "Insufficient file storage space."}))

            {:error, reason, streamed_conn} ->
              Logger.warning("File upload stream failed: #{inspect(reason)}")
              send_resp(streamed_conn, 500, Jason.encode!(%{reason: "Unable to write file."}))
          end
        after
          File.rm(tmp_file_path)
        end

      {{:error, reason}, _tmp_file_path} when reason in [:enospc, :edquot] ->
        send_resp(conn, 413, Jason.encode!(%{reason: "Insufficient file storage space."}))

      {{:error, reason}, _tmp_file_path} ->
        Logger.error("Unable to open temporary upload file: #{inspect(reason)}")
        send_resp(conn, 500, Jason.encode!(%{reason: "Unable to write file."}))
    end
  end

  defp store_received_file(conn, project, uuid, type, tmp_file_path) do
    case FileStore.store_by_moving(uuid, project, type, tmp_file_path) do
      :ok ->
        FileStore.clear_cache(project)
        stored_file_metadata = get_stored_file_metadata(uuid, project, type)
        send_resp(conn, 201, Jason.encode!(Map.put(stored_file_metadata, :info, "File created.")))

      {:error, reason} when reason in [:enospc, :edquot] ->
        send_resp(conn, 413, Jason.encode!(%{reason: "Insufficient file storage space."}))

      {:error, reason} ->
        Logger.error("Unable to move temporary upload file into place: #{inspect(reason)}")
        send_resp(conn, 500, Jason.encode!(%{reason: "Unable to store file."}))
    end
  end

  defp content_length_mismatch_response(conn) do
    send_resp(
      conn,
      417,
      Jason.encode!(%{
        reason: "Received file size does not match expected size of content length header."
      })
    )
  end

  defp parse_expected_content_length(conn) do
    get_req_header(conn, "content-length")
    |> case do
      [] ->
        {:error, :missing_content_length_header}

      [string_value] ->
        Integer.parse(string_value)
        |> case do
          {value, ""} when value >= 0 ->
            {:ok, value}

          _ ->
            {:error, :invalid_content_length_header}
        end

      _ ->
        {:error, :invalid_content_length_header}
    end
  end

  defp start_body_streaming(conn, io_device, target_path, expected_content_length) do
    parent = self()

    monitor_pid =
      spawn(fn ->
        Process.monitor(parent)

        receive do
          {:DOWN, _ref, :process, _pid, _reason} ->
            Logger.warning(
              "File upload got interrupted for `#{target_path}`, deleting data received so far."
            )

            File.rm(target_path)
        end
      end)

    try do
      stream_body(
        conn,
        io_device,
        0,
        expected_content_length,
        Application.fetch_env!(:field_hub, :file_upload_max_bytes)
      )
    after
      File.close(io_device)
      Process.exit(monitor_pid, :shutdown)
    end
  end

  @read_length Application.compile_env(:field_hub, :file_read_chunk_size_bytes, 8_000_000)
  defp get_stored_file_metadata(uuid, project, type) do
    with {:ok, file_path} <- FileStore.get_file_path(uuid, project, type),
         {:ok, %Stat{size: size}} <- File.stat(file_path),
         {:ok, md5} <- get_file_hash(file_path, :md5),
         {:ok, sha256} <- get_file_hash(file_path, :sha256) do
      %{
        size_bytes: size,
        md5: md5,
        sha256: sha256
      }
    else
      _ -> %{}
    end
  end

  defp get_file_hash(file_path, algorithm) do
    hash =
      file_path
      |> File.stream!([], @read_length)
      |> Enum.reduce(:crypto.hash_init(algorithm), fn data, context ->
        :crypto.hash_update(context, data)
      end)
      |> :crypto.hash_final()
      |> Base.encode16(case: :lower)

    {:ok, hash}
  rescue
    _ -> {:error, :hash_failed}
  end

  defp stream_body(conn, io_device, received_bytes, expected_content_length, max_upload_bytes) do
    read_body(conn, length: @read_length)
    |> case do
      {:ok, data, conn} ->
        write_upload_chunk(
          data,
          conn,
          io_device,
          received_bytes,
          expected_content_length,
          max_upload_bytes,
          false
        )

      {:more, data, conn} ->
        write_upload_chunk(
          data,
          conn,
          io_device,
          received_bytes,
          expected_content_length,
          max_upload_bytes,
          true
        )

      {:error, reason} ->
        {:error, reason, conn}
    end
  end

  defp write_upload_chunk(
         data,
         conn,
         io_device,
         received_bytes,
         expected_content_length,
         max_upload_bytes,
         more?
       ) do
    new_received_bytes = received_bytes + byte_size(data)

    cond do
      new_received_bytes > max_upload_bytes ->
        {:error, :upload_too_large, conn}

      new_received_bytes > expected_content_length ->
        {:error, :content_length_mismatch, conn}

      true ->
        case IO.binwrite(io_device, data) do
          :ok when more? ->
            stream_body(
              conn,
              io_device,
              new_received_bytes,
              expected_content_length,
              max_upload_bytes
            )

          :ok ->
            {:ok, conn, new_received_bytes}

          {:error, reason} ->
            {:error, reason, conn}
        end
    end
  end

  def delete(conn, %{"project" => project, "id" => uuid}) do
    file_store_data = FileStore.discard(Zarex.sanitize(uuid), Zarex.sanitize(project))

    send_resp(conn, 200, Jason.encode!(%{info: file_store_data}))
  end

  defp parse_type("thumbnail_image") do
    :thumbnail_image
  end

  defp parse_type("original_image") do
    :original_image
  end

  defp parse_type(type) do
    {:error, type}
  end
end
