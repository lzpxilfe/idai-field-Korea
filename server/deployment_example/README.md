# Example deployment guide

This is a tutorial guide for deploying Field Hub. __This describes a very basic installation, so be aware that depending on your local hosting infrastructure, it may be useful or even be required to make adjustments. For production, run Field Hub behind a TLS reverse proxy and firewall. Do not expose CouchDB directly to the network.__

## Prerequisites

We will use [Docker](https://docs.docker.com/get-started/overview/). For this guide there are two Docker concepts to be aware of:
1. images
2. containers

You can think of a Docker image as the bundled package containing the application, and of a Docker container as a running instance of such a package.

For more details please refer to the Docker documentation.

## Files

Alongside this README, you will find a simple [docker-compose.yml](docker-compose.yml). You may copy that file to your server (or desktop PC/laptop if you just want to try it out locally).

The docker-compose file describes 2 services: 
1. [CouchDB](https://couchdb.apache.org/), the database software Field Hub uses. CouchDB provides its own Docker images: https://hub.docker.com/_/couchdb
2. Field Hub, the application itself.

Additionally, an [.env](.env) file sets up some environment variables for docker-compose:

```
COUCHDB_ADMIN_NAME=fieldhub_admin
COUCHDB_ADMIN_PASSWORD=
COUCHDB_USER_NAME=app_user
COUCHDB_USER_PASSWORD=
DB_DATA_DIRECTORY=./couch_data

FIELD_HUB_VERSION=3.5.3
HOST=localhost
SECRET_KEY_BASE=
FILE_DIRECTORY=./files
FIELD_HUB_BIND_ADDRESS=127.0.0.1
FIELD_HUB_HOST_PORT=8080
```

Fill in unique secret values before starting the application. Empty password or `SECRET_KEY_BASE` values make `docker compose` fail deliberately.

## Test run the application

The first thing we should do is create a directory for the application to store the synchronized files in. In the directory run

```
mkdir files && chown nobody files/
```

_Note: if you want the files to be put somewhere else, you can do that by updating the `FILE_DIRECTORY` environment variable in the [.env](.env) file._

Run the application from the directory containing both files with:

```
docker compose up
```

This should run the application in the foreground and display logs for both services. By default, Field Hub is bound to `127.0.0.1:8080` on the host and CouchDB is available only inside the Docker network.

Assuming you are trying this out on your local PC or Laptop, check [localhost:8080](http://localhost:8080). Do not publish CouchDB's `5984` port unless you have a separate, authenticated administration network.

### Creating a project

Open http://localhost:8080 and login with the CouchDB admin credentials as defined in your [.env](.env) file. You should be able to create new projects in your browser. Create a project `my_first_project`, you can set a custom password or have Field Hub generate one for you.

After project creation, your `FILE_DIRECTORY` you should now have a directory with the name `my_first_project`, itself containing two directories `original_image` and `thumbnail_image`. CouchDB remains private on the Docker network; use Field Hub or an explicitly secured maintenance tunnel for administration.

You can now create a `my_first_project` project in your Field Desktop application and should then be able to sync a Field Client with the server given the correct credentials and the servers domain or IP. Of course, if you already have a Field Desktop project you can instead repeat the steps above but replace `my_first_project` with the project key of your Field Desktop project.

### Collaborating

After you have created and setup `my_first_project` in your Field Desktop application and synced it to your Field Hub instance on a server, others can use the "Download project" option in Field Desktop to get the project and start collaborating. They __must__ use "Download project", __not__ create a new project `my_first_project` on their own, because the latter will cause data conflicts.

## Using the application in production

To run the application in production, you should do (atleast) 5 things:
1. Uncomment the restart policy parts in the docker-compose file
2. Setup docker daemon as a system service on your server (so that it starts after each server restart)
3. Set the environment, especially `COUCHDB_ADMIN_PASSWORD` `COUCHDB_USER_PASSWORD`, `HOST` and `SECRET_KEY_BASE`. Generate `SECRET_KEY_BASE` with at least 64 random bytes.
4. Keep CouchDB un-published to the host. If emergency administration is required, use a temporary SSH tunnel or a firewall-restricted management network.
5. Put Field Hub behind a TLS reverse proxy, set `FIELD_HUB_BIND_ADDRESS=127.0.0.1`, and expose only the proxy's HTTPS port to field devices. See also the general [Wiki](https://github.com/dainst/idai-field/wiki/Field-Hub).

Afterwards stop and delete all previously created test containers.

```
docker compose down -v
```

Finally, we want to start everything in the background, using the detached `-d` option.

```
docker compose up -d
```

If you want to see which containers are now running there are several commands.

To view resource usage:
```
docker stats
```

To view container information:
```
docker container ls
```

To view a container's logs:
```
docker logs <container name>
```

For more, please refer to the Docker documentation.
