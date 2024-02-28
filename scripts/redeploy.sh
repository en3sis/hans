#!/bin/bash

# Change directory to /hans folder
cd hans

# Pull the latest image from en3sis/hans:nightly
docker pull en3sis/hans:nightly

# Stop and remove the "hans" Docker container
docker stop hans && docker rm hans

# Run the "hans" Docker container with necessary options
docker run --env-file .env --name hans -d --restart=always en3sis/hans:nightly

# Wait for the Docker container to start
sleep 5

# Check the container logs to verify successful execution
docker logs hans
