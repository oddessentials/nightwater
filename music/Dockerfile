FROM mwader/static-ffmpeg:9.0.1@sha256:54e55b0cb8f672870fc38ceb2e6c411855cb3b39c505f5f3b2505ee01ed5f2b7 AS ffmpeg

FROM node:24.21.0-alpine3.24@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81
COPY --from=ffmpeg /ffmpeg /ffprobe /usr/local/bin/
