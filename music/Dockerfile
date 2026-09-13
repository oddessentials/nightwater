FROM mwader/static-ffmpeg:8.0.1@sha256:252705ff88532fa338e7065c21792756552f8fe7c212f84bc503d3c340689594 AS ffmpeg

FROM node:26.8-alpine3.24@sha256:ef24c5053d50fdc3e4e56eb4e7ddb7861874ab0fdc797046ba897581deb8e868
COPY --from=ffmpeg /ffmpeg /ffprobe /usr/local/bin/
