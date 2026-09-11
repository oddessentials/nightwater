FROM mwader/static-ffmpeg:8.0.1@sha256:252705ff88532fa338e7065c21792756552f8fe7c212f84bc503d3c340689594 AS ffmpeg

FROM node:24.21.0-alpine3.24@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81
COPY --from=ffmpeg /ffmpeg /ffprobe /usr/local/bin/
