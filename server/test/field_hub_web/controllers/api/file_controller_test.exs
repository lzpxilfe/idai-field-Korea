defmodule FieldHubWeb.Api.Rest.FileTest do
  use FieldHubWeb.ConnCase

  alias FieldHub.{
    FileStore,
    Project,
    User,
    TestHelper
  }

  @cache_name Application.compile_env(:field_hub, :file_index_cache_name)

  @project "test_project"
  @project_user_password "test_project_password"
  @user_name "test_user"
  @user_password "test_password"
  @example_file_path "test/fixtures/logo.png"
  @example_file File.read!(@example_file_path)
  @example_file_stats File.stat!("test/fixtures/logo.png")
  @example_file_md5 :crypto.hash(:md5, @example_file) |> Base.encode16(case: :lower)
  @example_file_sha256 :crypto.hash(:sha256, @example_file) |> Base.encode16(case: :lower)
  @schema File.read!("../core/api-schemas/files-list.json")
          |> Jason.decode!()
          |> ExJsonSchema.Schema.resolve()

  @basic_auth "Basic #{Base.encode64("#{@user_name}:#{@user_password}")}"
  @quota_keys [
    :file_upload_max_bytes,
    :file_project_quota_bytes,
    :file_storage_quota_bytes,
    :file_reserved_free_bytes,
    :test_disk_available_bytes
  ]

  setup_all %{} do
    TestHelper.create_test_db_and_user(@project, @user_name, @user_password)
    User.create(@project, @project_user_password)
    Project.update_user(@project, @project, :member)

    on_exit(fn ->
      TestHelper.remove_test_db_and_user(@project, @user_name)
      User.delete(@project)
    end)
  end

  setup %{} do
    previous_config = Map.new(@quota_keys, &{&1, Application.fetch_env!(:field_hub, &1)})
    FileStore.create_directories(@project)

    on_exit(fn ->
      Enum.each(previous_config, fn {key, value} ->
        Application.put_env(:field_hub, key, value)
      end)

      FileStore.remove_directories(@project)
      Cachex.clear!(@cache_name)
    end)
  end

  test "PUT /files/:project/:uuid creates file with specified uuid and type", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> set_valid_put_headers(credentials)
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 201
    assert Jason.decode!(conn.resp_body) == %{
             "info" => "File created.",
             "md5" => @example_file_md5,
             "sha256" => @example_file_sha256,
             "size_bytes" => @example_file_stats.size
           }
  end

  test "PUT /files/:project/:uuid accepts the default project account used by field clients", %{
    conn: conn
  } do
    credentials = Base.encode64("#{@project}:#{@project_user_password}")

    conn =
      conn
      |> set_valid_put_headers(credentials)
      |> put("/files/#{@project}/tablet-photo-1?type=original_image", @example_file)

    assert conn.status == 201
    assert {:ok, _file_path} = FileStore.get_file_path("tablet-photo-1", @project, :original_image)
  end

  test "PUT /files/:project/:uuid with unsupported type throws 400", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> set_valid_put_headers(credentials)
      |> put("/files/#{@project}/1234?type=unsupported", @example_file)

    assert conn.status == 400
  end

  test "PUT /files/:project/:uuid without Content-Length throws 411", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> put_req_header("authorization", "Basic #{credentials}")
      |> put_req_header("content-type", "image/png")
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 411
  end

  test "PUT /files/:project/:uuid with invalid Content-Length throws 400", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> put_req_header("authorization", "Basic #{credentials}")
      |> put_req_header("content-type", "image/png")
      |> put_req_header("content-length", "not_a_number")
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 400
  end

  test "PUT /files/:project/:uuid with negative Content-Length throws 400", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> put_req_header("authorization", "Basic #{credentials}")
      |> put_req_header("content-type", "image/png")
      |> put_req_header("content-length", "-1")
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 400
  end

  test "PUT /files/:project/:uuid with duplicate Content-Length throws 400", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> put_req_header("authorization", "Basic #{credentials}")
      |> put_req_header("content-type", "image/png")
      |> Map.update!(:req_headers, fn headers ->
        [
          {"content-length", Integer.to_string(byte_size(@example_file))},
          {"content-length", Integer.to_string(byte_size(@example_file))}
          | headers
        ]
      end)
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 400
  end

  test "PUT /files/:project/:uuid without matching Content-Length throws 417", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> put_req_header("authorization", "Basic #{credentials}")
      |> put_req_header("content-type", "image/png")
      |> put_req_header("content-length", "10")
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 417
  end

  test "PUT /files/:project/:uuid rejects declared files above the upload limit", %{conn: conn} do
    Application.put_env(:field_hub, :file_upload_max_bytes, @example_file_stats.size - 1)

    conn =
      conn
      |> set_valid_put_headers(Base.encode64("#{@user_name}:#{@user_password}"))
      |> put("/files/#{@project}/too-large?type=original_image", @example_file)

    assert conn.status == 413
    assert no_temporary_uploads?()
  end

  test "PUT /files/:project/:uuid enforces the actual streamed byte limit", %{conn: conn} do
    Application.put_env(:field_hub, :file_upload_max_bytes, 10_000)
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> put_req_header("authorization", "Basic #{credentials}")
      |> put_req_header("content-type", "image/png")
      |> put_req_header("content-length", "9000")
      |> put("/files/#{@project}/stream-too-large?type=original_image", @example_file)

    assert conn.status == 413
    assert no_temporary_uploads?()
    assert {:error, :enoent} =
             FileStore.get_file_path("stream-too-large", @project, :original_image)
  end

  test "PUT /files/:project/:uuid rejects uploads above the project quota", %{conn: conn} do
    Application.put_env(:field_hub, :file_project_quota_bytes, @example_file_stats.size - 1)

    conn =
      conn
      |> set_valid_put_headers(Base.encode64("#{@user_name}:#{@user_password}"))
      |> put("/files/#{@project}/project-full?type=original_image", @example_file)

    assert conn.status == 413
    assert Jason.decode!(conn.resp_body)["reason"] == "Project file storage quota exceeded."
  end

  test "PUT /files/:project/:uuid rejects uploads above the total storage quota", %{conn: conn} do
    Application.put_env(:field_hub, :file_storage_quota_bytes, @example_file_stats.size - 1)

    conn =
      conn
      |> set_valid_put_headers(Base.encode64("#{@user_name}:#{@user_password}"))
      |> put("/files/#{@project}/storage-full?type=original_image", @example_file)

    assert conn.status == 413
    assert Jason.decode!(conn.resp_body)["reason"] == "Field Hub file storage quota exceeded."
  end

  test "PUT /files/:project/:uuid preserves reserved free disk space", %{conn: conn} do
    reserved = Application.fetch_env!(:field_hub, :file_reserved_free_bytes)
    Application.put_env(:field_hub, :test_disk_available_bytes, reserved + @example_file_stats.size - 1)

    conn =
      conn
      |> set_valid_put_headers(Base.encode64("#{@user_name}:#{@user_password}"))
      |> put("/files/#{@project}/disk-full?type=original_image", @example_file)

    assert conn.status == 413
    assert no_temporary_uploads?()
  end

  test "GET /files/:project/:uuid returns 404 for non-existent file", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}/1234?type=original_image")

    assert conn.status == 404
  end

  test "GET /files/:project/:uuid returns 400 without type parameter", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}/1234")

    assert conn.status == 400
  end

  test "GET /files/:project/:uuid returns 400 with invalid type parameter", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}/1234?type=unknown")

    assert conn.status == 400
  end

  test "GET /files/:project/:uuid returns existing file", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> set_valid_put_headers(credentials)
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 201

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}/1234?type=original_image")

    assert conn.status == 200
    assert conn.resp_body == @example_file
  end

  test "GET /files/:project without valid credentials yields 401", %{conn: conn} do
    credentials = Base.encode64("non_existant_user:made_up_password")

    conn =
      conn
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}")

    assert conn.status == 401
  end

  test "GET /files/:project without files yields valid json", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}")

    assert conn.status == 200

    json_response =
      conn.resp_body
      |> Jason.decode!()

    assert json_response == %{}
    assert ExJsonSchema.Validator.valid?(@schema, json_response)
  end

  test "GET /files/:project with files yields valid json", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> set_valid_put_headers(credentials)
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 201

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}")

    json_response =
      conn.resp_body
      |> Jason.decode!()

    file_size = @example_file_stats.size

    assert %{
             "1234" => %{
               "deleted" => false,
               "types" => ["original_image"],
               "variants" => [%{"name" => "original_image", "size" => ^file_size}]
             }
           } = json_response

    assert ExJsonSchema.Validator.valid?(@schema, json_response)
  end

  test "GET /files/:project different file variants get added to the response", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      conn
      |> set_valid_put_headers(credentials)
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 201

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}")

    json_response =
      conn.resp_body
      |> Jason.decode!()

    assert ExJsonSchema.Validator.valid?(@schema, json_response)

    conn =
      conn
      |> recycle()
      |> set_valid_put_headers(credentials)
      |> put("/files/#{@project}/1234?type=thumbnail_image", @example_file)

    assert conn.status == 201

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}")

    assert conn.status == 200

    json_response =
      conn.resp_body
      |> Jason.decode!()

    file_size = @example_file_stats.size

    assert %{
             "1234" => %{
               "deleted" => false,
               "types" => ["thumbnail_image", "original_image"],
               "variants" => [
                 %{"name" => "thumbnail_image", "size" => ^file_size},
                 %{"name" => "original_image", "size" => ^file_size}
               ]
             }
           } = json_response

    assert ExJsonSchema.Validator.valid?(@schema, json_response)
  end

  test "GET /files/:project only specified file variant gets added to the response", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      set_valid_put_headers(conn, credentials)
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 201

    conn =
      conn
      |> recycle()
      |> set_valid_put_headers(credentials)
      |> put("/files/#{@project}/1234?type=thumbnail_image", @example_file)

    assert conn.status == 201

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", @basic_auth)
      |> get("/files/#{@project}?types[]=original_image")

    json_response =
      conn.resp_body
      |> Jason.decode!()

    assert conn.status == 200

    assert ExJsonSchema.Validator.valid?(@schema, json_response)

    variants = json_response["1234"]["variants"]

    assert [%{"name" => "original_image"}] = variants
  end

  test "GET /files/:project specified but unsupported file variant throws 400", %{conn: conn} do
    conn =
      conn
      |> put_req_header("authorization", @basic_auth)
      |> get("/files/#{@project}?types[]=unsupported")

    assert conn.status == 400
  end

  test "GET /files/:project non array types parameter throws 400", %{conn: conn} do
    conn =
      conn
      |> put_req_header("authorization", @basic_auth)
      |> get("/files/#{@project}?types=unsupported")

    assert conn.status == 400
  end

  test "DELETE /files/:project/:uuid deletes files with specified uuid", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      set_valid_put_headers(conn, credentials)
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 201

    conn =
      conn
      |> recycle()
      |> set_valid_put_headers(credentials)
      |> put("/files/#{@project}/5678?type=original_image", @example_file)

    assert conn.status == 201

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}")

    json_response =
      conn.resp_body
      |> Jason.decode!()

    assert %{
             "1234" => %{"deleted" => false},
             "5678" => %{"deleted" => false}
           } = json_response

    assert ExJsonSchema.Validator.valid?(@schema, json_response)

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", "Basic #{credentials}")
      |> delete("/files/#{@project}/1234")

    assert conn.status == 200

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}")

    json_response =
      conn.resp_body
      |> Jason.decode!()

    assert %{
             "1234" => %{"deleted" => true},
             "5678" => %{"deleted" => false}
           } = json_response

    assert ExJsonSchema.Validator.valid?(@schema, json_response)
  end

  test "GET /files/:project yields deleted fields flagged as deleted", %{conn: conn} do
    credentials = Base.encode64("#{@user_name}:#{@user_password}")

    conn =
      set_valid_put_headers(conn, credentials)
      |> put("/files/#{@project}/1234?type=original_image", @example_file)

    assert conn.status == 201

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}")

    json_response =
      conn.resp_body
      |> Jason.decode!()

    assert %{"1234" => %{"deleted" => false}} = json_response
    assert ExJsonSchema.Validator.valid?(@schema, json_response)

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", "Basic #{credentials}")
      |> delete("/files/#{@project}/1234")

    assert conn.status == 200

    conn =
      conn
      |> recycle()
      |> put_req_header("authorization", "Basic #{credentials}")
      |> get("/files/#{@project}")

    json_response =
      conn.resp_body
      |> Jason.decode!()

    assert %{"1234" => %{"deleted" => true}} = json_response
    assert ExJsonSchema.Validator.valid?(@schema, json_response)
  end

  defp set_valid_put_headers(conn, credentials) do
    conn
    |> put_req_header("authorization", "Basic #{credentials}")
    |> put_req_header("content-type", "image/png")
    |> put_req_header("content-length", "#{@example_file_stats.size}")
  end

  defp no_temporary_uploads? do
    Application.fetch_env!(:field_hub, :file_directory_root)
    |> Path.join("#{@project}/**/*.writing")
    |> Path.wildcard()
    |> Enum.empty?()
  end
end
