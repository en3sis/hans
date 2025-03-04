.PHONY: build-image

IMAGE_NAME=hans

build-image:
	docker build -t $(IMAGE_NAME) . 
