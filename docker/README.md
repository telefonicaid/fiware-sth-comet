# HOWTO BUILD
Launch docker commands inside git root repository directory

- Howto build with default nodejs v0.10.42
  `sudo docker build -f docker/Dockerfile .`

- Howto build with specific nodejs
  `sudo docker build --build-arg NODEJS_VERSION=v0.10.46 -f docker/Dockerfile .`

# HOWTO USE INCLUDED DOCKER COMPOSE FILE
Launch docker-compose commands inside git root repository directory

- Launch this docker-compose command in foreground mode:
  `sudo docker-compose -f docker/docker-compose.yml up`

- Launch this docker-compose command in detached mode:
  `sudo docker-compose -f docker/docker-compose.yml up -d`

