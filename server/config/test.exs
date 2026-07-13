import Config
# config/test.exs is executed at compile time in the test environment
# see https://elixir-lang.org/getting-started/mix-otp/introduction-to-mix.html#environments

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :field_hub, FieldHubWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "N2NsK8r4HEFaFPw6CmVpbjepBgVferxd4gBTpgfXe6lsjoAdAzkKVOfhKjnFxQwO",
  server: false

# In test we don't send emails.
config :field_hub, FieldHub.Mailer, adapter: Swoosh.Adapters.Test

# Capture all logs...
config :logger,
  level: :debug

# ... but show only errors and upwards on the console.
config :logger, :console, level: :error

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

config :field_hub,
  file_directory_root: "test/tmp",
  file_read_chunk_size_bytes: 8000,
  file_disk_space_provider: FieldHub.TestDiskSpace,
  file_upload_max_bytes: 1024 * 1024,
  file_project_quota_bytes: 10 * 1024 * 1024,
  file_storage_quota_bytes: 100 * 1024 * 1024,
  file_reserved_free_bytes: 1024 * 1024,
  test_disk_available_bytes: 1024 * 1024 * 1024
