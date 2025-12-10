.PHONY: build-image

IMAGE_NAME=hans

build-image:
	docker build -t $(IMAGE_NAME) .

postgres-truncate:
	docker exec -i postgres-hans psql -U hans -d hans_db -c "
		TRUNCATE configs, guilds, plugins, guilds_plugins, guild_quests, users_settings RESTART IDENTITY CASCADE;
	"
