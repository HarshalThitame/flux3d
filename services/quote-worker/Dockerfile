# syntax=docker/dockerfile:1.7
# BASE_IMAGE must be an immutable Python 3 Linux image reference including a
# sha256 digest. Native artifacts are mounted read-only or copied by the release
# pipeline only after their checksums have been verified.
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
ARG BASE_IMAGE

RUN test -n "${BASE_IMAGE}" || (echo "BASE_IMAGE must include an immutable digest" && exit 1)

WORKDIR /opt/flux3d/worker
COPY worker.py /opt/flux3d/worker/worker.py

RUN python3 -m py_compile /opt/flux3d/worker/worker.py \
    && useradd --system --uid 10001 --no-create-home quote-worker \
    && mkdir -p /work /profiles /opt/flux3d/bin /opt/bambu-studio \
    && chown -R quote-worker:quote-worker /work

USER 10001:10001
ENV PORT=8080 \
    QUOTE_PROFILE_DIR=/profiles \
    QUOTE_GEOMETRY_BIN=/opt/flux3d/bin/quote-geometry \
    BAMBU_STUDIO_BIN=/opt/bambu-studio/bambu-studio

EXPOSE 8080
ENTRYPOINT ["python3", "/opt/flux3d/worker/worker.py"]
