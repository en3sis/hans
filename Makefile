.PHONY: build-image

IMAGE_NAME=hans

build-image:
	docker build -t $(IMAGE_NAME) . 

# Fix entity indices in training data
fix-entity-indices:
	ts-node scripts/fix-entity-indices.js