#!/usr/bin/env python3
"""Isolated quote worker orchestration.

Native geometry is delegated to the pinned `quote-geometry` executable, which
links lib3mf, Open CASCADE, Assimp, and the mesh validation layer. Slicing is
performed by the pinned Bambu Studio CLI. This process intentionally returns a
manual-review result whenever either tool cannot produce complete, validated
metrics.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import os
import subprocess
import tempfile
import threading
import time
import urllib.parse
import urllib.request
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

MAX_INPUT_BYTES = 100 * 1024 * 1024
MAX_RESPONSE_BYTES = 64 * 1024
MAX_ARCHIVE_ENTRIES = 10_000
MAX_ARCHIVE_EXPANDED_BYTES = 1 * 1024 * 1024 * 1024
JOB_TIMEOUT_SECONDS = int(os.environ.get("QUOTE_JOB_TIMEOUT_SECONDS", "300"))
MAX_CONCURRENT_JOBS = max(1, int(os.environ.get("QUOTE_MAX_CONCURRENT_JOBS", "2")))
JOB_SLOTS = threading.BoundedSemaphore(MAX_CONCURRENT_JOBS)
ACTIVE_JOBS: set[str] = set()
ACTIVE_JOBS_LOCK = threading.Lock()


class ManualReview(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def decode_base64url(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def verify_qstash_signature(signature: str, body: bytes) -> bool:
    """Verify QStash's HS256 JWT, body digest, issuer, time, and target URL."""
    try:
        header_part, payload_part, signature_part = signature.split(".")
        header = json.loads(decode_base64url(header_part))
        payload = json.loads(decode_base64url(payload_part))
        if header.get("alg") != "HS256" or payload.get("iss") != "Upstash":
            return False
        now = int(time.time())
        if int(payload.get("exp", 0)) < now or int(payload.get("nbf", 0)) > now + 30:
            return False
        if payload.get("sub") != required_env("QUOTE_WORKER_PUBLIC_URL"):
            return False
        digest = base64.urlsafe_b64encode(hashlib.sha256(body).digest()).decode().rstrip("=")
        if not hmac.compare_digest(str(payload.get("body", "")).rstrip("="), digest):
            return False
        signed = f"{header_part}.{payload_part}".encode()
        supplied = decode_base64url(signature_part)
        keys = (
            os.environ.get("QSTASH_CURRENT_SIGNING_KEY", ""),
            os.environ.get("QSTASH_NEXT_SIGNING_KEY", ""),
        )
        return any(
            key
            and hmac.compare_digest(
                hmac.new(key.encode(), signed, hashlib.sha256).digest(), supplied
            )
            for key in keys
        )
    except (ValueError, TypeError, json.JSONDecodeError, KeyError, binascii.Error):
        return False


def callback(url: str, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode()
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {required_env('QUOTE_WORKER_CALLBACK_SECRET')}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        if response.status < 200 or response.status >= 300:
            raise RuntimeError(f"callback returned HTTP {response.status}")


def progress(url: str, status: str, percent: int, codes: list[str] | None = None) -> None:
    callback(
        url,
        {
            "type": "progress",
            "status": status,
            "progress": percent,
            "diagnosticCodes": codes or [],
        },
    )


def storage_request(method: str, bucket: str, path: str, data: bytes | None = None) -> bytes:
    base = required_env("SUPABASE_URL").rstrip("/")
    key = required_env("SUPABASE_SERVICE_ROLE_KEY")
    encoded_path = "/".join(urllib.parse.quote(part, safe="") for part in path.split("/"))
    request = urllib.request.Request(
        f"{base}/storage/v1/object/{bucket}/{encoded_path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": "application/octet-stream",
            "x-upsert": "true",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        body = response.read(MAX_INPUT_BYTES + 1 if method == "GET" else MAX_RESPONSE_BYTES)
        if method == "GET" and len(body) > MAX_INPUT_BYTES:
            raise ManualReview("oversized_model", "The uploaded model exceeds 100 MB.")
        return body


def validate_zip(path: Path) -> None:
    if not zipfile.is_zipfile(path):
        return
    try:
        with zipfile.ZipFile(path) as archive:
            entries = archive.infolist()
            if len(entries) > MAX_ARCHIVE_ENTRIES:
                raise ManualReview("invalid_archive", "Archive contains too many entries.")
            expanded = sum(entry.file_size for entry in entries)
            if expanded > MAX_ARCHIVE_EXPANDED_BYTES:
                raise ManualReview("invalid_archive", "Archive expansion limit exceeded.")
            for entry in entries:
                if entry.flag_bits & 0x1:
                    raise ManualReview("encrypted_file", "Encrypted archives require manual review.")
                normalized = Path(entry.filename)
                if normalized.is_absolute() or ".." in normalized.parts:
                    raise ManualReview("invalid_archive", "Archive contains an unsafe path.")
                if entry.compress_size > 0 and entry.file_size / entry.compress_size > 10_000:
                    raise ManualReview("invalid_archive", "Archive compression ratio is unsafe.")
    except zipfile.BadZipFile as exc:
        raise ManualReview("invalid_archive", "The model archive is damaged.") from exc


def run_command(args: list[str], timeout: int) -> subprocess.CompletedProcess[str]:
    command_env = {
        key: os.environ[key]
        for key in ("PATH", "LD_LIBRARY_PATH", "TMPDIR")
        if os.environ.get(key)
    }
    command_env.update(
        {
            "LANG": "C.UTF-8",
            "HOME": "/work",
            "XDG_CONFIG_HOME": "/work/config",
            "XDG_CACHE_HOME": "/work/cache",
            "QT_QPA_PLATFORM": "offscreen",
        }
    )
    return subprocess.run(
        args,
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout,
        env=command_env,
    )


def geometry_pass(source: Path, work: Path, unit: str | None, quantity: int) -> dict[str, Any]:
    report = work / "geometry.json"
    canonical = work / "canonical.3mf"
    preview = work / "preview.glb"
    args = [
        os.environ.get("QUOTE_GEOMETRY_BIN", "/opt/flux3d/bin/quote-geometry"),
        "--input",
        str(source),
        "--report",
        str(report),
        "--canonical-3mf",
        str(canonical),
        "--preview-glb",
        str(preview),
        "--z-up",
        "--max-triangles",
        os.environ.get("QUOTE_MAX_TRIANGLES", "5000000"),
        "--max-repair-volume-delta",
        "0.005",
        "--quantity",
        str(max(1, quantity)),
    ]
    if unit:
        args.extend(["--unit", unit])
    process = run_command(args, min(JOB_TIMEOUT_SECONDS, 120))
    if process.returncode != 0 or not report.exists():
        raise ManualReview("manual_review_required", "Native geometry conversion did not complete safely.")
    data = json.loads(report.read_text(encoding="utf-8"))
    if data.get("resultKind") == "manual_review":
        raise ManualReview(
            str(data.get("diagnosticCode", "manual_review_required")),
            str(data.get("message", "Geometry requires manual review.")),
        )
    for field in ("dimensionsMm", "solidVolumeMm3", "geometryHash", "importer", "importerVersion"):
        if field not in data:
            raise ManualReview("manual_review_required", f"Geometry report is missing {field}.")
    data["canonicalPath"] = canonical
    data["previewPath"] = preview
    return data


def parse_sliced_metrics(path: Path) -> dict[str, Any]:
    """Read the separated metrics emitted by the pinned Bambu wrapper."""
    with zipfile.ZipFile(path) as archive:
        reports = [
            name
            for name in archive.namelist()
            if name.lower().endswith("metadata/flux3d_quote_metrics.json")
        ]
        if len(reports) != 1:
            raise ManualReview(
                "slicer_failed",
                "Pinned slicer output did not include separated production metrics.",
            )
        try:
            metrics = json.loads(archive.read(reports[0]))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise ManualReview("slicer_failed", "Slicer metrics report is invalid.") from exc

    mass_fields = (
        "finishedPartWeightGrams",
        "supportWeightGrams",
        "brimWeightGrams",
        "purgeWeightGrams",
        "billableMaterialGrams",
    )
    count_fields = ("elapsedSeconds", "layerCount", "plateCount")
    try:
        for field in mass_fields:
            metrics[field] = float(metrics[field])
            if not 0 <= metrics[field] < 1_000_000:
                raise ValueError(field)
        for field in count_fields:
            metrics[field] = int(metrics[field])
            if metrics[field] <= 0:
                raise ValueError(field)
    except (KeyError, TypeError, ValueError, OverflowError) as exc:
        raise ManualReview("slicer_failed", "Slicer metrics were incomplete or invalid.") from exc

    component_total = sum(metrics[field] for field in mass_fields[:-1])
    tolerance = max(0.05, metrics["billableMaterialGrams"] * 0.001)
    if abs(component_total - metrics["billableMaterialGrams"]) > tolerance:
        raise ManualReview("slicer_failed", "Slicer material components did not reconcile.")
    return metrics


def load_profile(path: Path) -> tuple[dict[str, Any], str]:
    try:
        profile = json.loads(path.read_text(encoding="utf-8"))
        version = str(profile["version"]).strip()
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
        raise ManualReview(
            "manual_review_required", f"Pinned profile {path.name} is invalid."
        ) from exc
    if not version or profile.get("inherits"):
        raise ManualReview(
            "manual_review_required", f"Pinned profile {path.name} is not flattened."
        )
    return profile, version


def slice_model(
    canonical: Path, work: Path, config: dict[str, Any]
) -> tuple[dict[str, Any], Path, dict[str, str]]:
    profile_root = Path(required_env("QUOTE_PROFILE_DIR"))
    layer = float(config["layerHeight"])
    process_names = {0.2: "standard-020.json", 0.12: "quality-012.json", 0.08: "ultra-008.json"}
    process_profile = profile_root / "process" / process_names[layer]
    machine_profile = profile_root / "machine" / "bambu-a1-0.4.json"
    filament_profile = profile_root / "filament" / f"{config['materialId']}.json"
    for profile in (machine_profile, process_profile, filament_profile):
        if not profile.is_file():
            raise ManualReview("manual_review_required", f"Pinned profile {profile.name} is unavailable.")
    machine_data, machine_version = load_profile(machine_profile)
    process_data, process_version = load_profile(process_profile)
    filament_data, filament_version = load_profile(filament_profile)
    del machine_data, filament_data

    process_data["sparse_infill_density"] = f"{int(config['infill'])}%"
    process_data["enable_support"] = "0" if config.get("supports") == "never" else "1"
    derived_process_profile = work / "derived-process.json"
    derived_process_profile.write_text(
        json.dumps(process_data, separators=(",", ":"), sort_keys=True),
        encoding="utf-8",
    )
    output = work / "sliced.gcode.3mf"
    args = [
        os.environ.get("BAMBU_STUDIO_BIN", "/opt/bambu-studio/bambu-studio"),
        "--curr-bed-type",
        "Textured PEI Plate",
        "--load-settings",
        f"{machine_profile};{derived_process_profile}",
        "--load-filaments",
        str(filament_profile),
        "--orient",
        "--arrange",
        "1",
        "--slice",
        "0",
        "--debug",
        "2",
        "--outputdir",
        str(work),
        "--export-3mf",
        str(output),
        str(canonical),
    ]
    process = run_command(args, JOB_TIMEOUT_SECONDS)
    if process.returncode != 0 or not output.is_file():
        raise ManualReview("slicer_failed", "Bambu Studio could not produce a valid slice.")
    return (
        parse_sliced_metrics(output),
        output,
        {
            "machine": machine_version,
            "process": process_version,
            "filament": filament_version,
        },
    )


def run_job(payload: dict[str, Any]) -> None:
    analysis_id = str(payload["analysisId"])
    bucket = str(payload["storageBucket"])
    storage_path = str(payload["storagePath"])
    callback_url = str(payload["callbackUrl"])
    config = payload.get("config") or {}
    started = time.monotonic()
    file_sha = ""
    geometry: dict[str, Any] = {}

    try:
        with tempfile.TemporaryDirectory(prefix=f"quote-{analysis_id[:8]}-") as temp:
            work = Path(temp)
            source = work / Path(storage_path).name
            progress(callback_url, "converting", 10)
            body = storage_request("GET", bucket, storage_path)
            file_sha = hashlib.sha256(body).hexdigest()
            source.write_bytes(body)
            validate_zip(source)

            progress(callback_url, "validating", 30)
            geometry = geometry_pass(
                source,
                work,
                payload.get("unitOverride"),
                int(config.get("quantity", 1)),
            )
            canonical_key = f"{analysis_id}/canonical.3mf"
            preview_key = f"{analysis_id}/preview.glb"
            storage_request("PUT", bucket, canonical_key, geometry["canonicalPath"].read_bytes())
            storage_request("PUT", bucket, preview_key, geometry["previewPath"].read_bytes())

            metrics = None
            slicer_version = None
            slicer_profiles: dict[str, str] = {}
            if config.get("materialId"):
                if not config.get("unitConfirmed", False):
                    raise ManualReview("unit_confirmation_required", "Model units must be confirmed before slicing.")
                progress(callback_url, "orienting", 55)
                progress(callback_url, "slicing", 70)
                metrics, sliced, slicer_profiles = slice_model(
                    geometry["canonicalPath"], work, config
                )
                storage_request("PUT", bucket, f"{analysis_id}/sliced.gcode.3mf", sliced.read_bytes())
                slicer_version = required_env("BAMBU_STUDIO_VERSION")

            callback(
                callback_url,
                {
                    "type": "result",
                    "resultKind": "ready",
                    "geometryHash": geometry["geometryHash"],
                    "fileSha256": file_sha,
                    "importer": geometry["importer"],
                    "importerVersion": geometry["importerVersion"],
                    "slicerVersion": slicer_version,
                    "canonicalModelPath": canonical_key,
                    "previewPath": preview_key,
                    "dimensionsMm": geometry["dimensionsMm"],
                    "solidVolumeMm3": geometry["solidVolumeMm3"],
                    "surfaceAreaMm2": geometry.get("surfaceAreaMm2"),
                    "triangleCount": geometry.get("triangleCount"),
                    "geometryQuality": geometry.get("geometryQuality", {}),
                    "chosenOrientation": geometry.get("chosenOrientation"),
                    "slicerMetrics": metrics,
                    "profileVersions": {
                        **geometry.get("profileVersions", {}),
                        **slicer_profiles,
                        **({"bambuStudio": slicer_version} if slicer_version else {}),
                    },
                    "warningCodes": geometry.get("warningCodes", []),
                    "processingDurationMs": int((time.monotonic() - started) * 1000),
                    "geometryCacheHit": False,
                    "slicingCacheHit": False,
                },
            )
    except ManualReview as exc:
        fallback_hash = geometry.get("geometryHash") or hashlib.sha256(
            (file_sha or analysis_id).encode()
        ).hexdigest()
        callback(
            callback_url,
            {
                "type": "result",
                "resultKind": "manual_review",
                "geometryHash": fallback_hash,
                "fileSha256": file_sha or fallback_hash,
                "importer": str(geometry.get("importer", "none")),
                "importerVersion": str(geometry.get("importerVersion", "unavailable")),
                "dimensionsMm": geometry.get("dimensionsMm", {"x": 0, "y": 0, "z": 0}),
                "solidVolumeMm3": float(geometry.get("solidVolumeMm3", 0)),
                "geometryQuality": geometry.get("geometryQuality", {}),
                "profileVersions": {},
                "warningCodes": [exc.code, "manual_review_required"],
                "manualReview": {"code": exc.code, "message": str(exc)},
                "processingDurationMs": int((time.monotonic() - started) * 1000),
                "geometryCacheHit": False,
                "slicingCacheHit": False,
            },
        )
    except Exception as exc:
        callback(
            callback_url,
            {
                "type": "progress",
                "status": "failed",
                "progress": 100,
                "diagnosticCodes": ["manual_review_required"],
                "failureMessage": f"Worker failed safely: {type(exc).__name__}",
            },
        )
        raise


class Handler(BaseHTTPRequestHandler):
    server_version = "Flux3DQuoteWorker/1"

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/v1/jobs":
            self.send_error(404)
            return
        expected = os.environ.get("QUOTE_WORKER_TOKEN", "").encode()
        supplied = self.headers.get("X-Quote-Worker-Token", "").encode()
        if not expected or not hmac.compare_digest(expected, supplied):
            self.send_error(401)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_RESPONSE_BYTES:
                raise ValueError("invalid content length")
            body = self.rfile.read(length)
            signature = self.headers.get("Upstash-Signature", "")
            if not signature or not verify_qstash_signature(signature, body):
                self.send_error(401)
                return
            payload = json.loads(body)
            required = {"analysisId", "storageBucket", "storagePath", "callbackUrl"}
            if not required.issubset(payload):
                raise ValueError("missing fields")
            analysis_id = str(payload["analysisId"])
            with ACTIVE_JOBS_LOCK:
                if analysis_id in ACTIVE_JOBS:
                    self._send_accepted()
                    return
                if not JOB_SLOTS.acquire(blocking=False):
                    self.send_error(503, "worker capacity reached")
                    return
                ACTIVE_JOBS.add(analysis_id)
            thread = threading.Thread(
                target=self._run_job,
                args=(analysis_id, payload),
                name=f"quote-{analysis_id[:8]}",
                daemon=True,
            )
            thread.start()
        except (ValueError, json.JSONDecodeError):
            self.send_error(400)
            return
        except Exception:
            self.send_error(500)
            return
        self._send_accepted()

    def _send_accepted(self) -> None:
        response = b'{"accepted":true}'
        self.send_response(202)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    @staticmethod
    def _run_job(analysis_id: str, payload: dict[str, Any]) -> None:
        try:
            run_job(payload)
        except Exception as exc:
            print(
                json.dumps(
                    {
                        "level": "error",
                        "event": "quote_job_failed",
                        "analysisId": analysis_id,
                        "errorType": type(exc).__name__,
                    }
                )
            )
        finally:
            with ACTIVE_JOBS_LOCK:
                ACTIVE_JOBS.discard(analysis_id)
            JOB_SLOTS.release()

    def log_message(self, format: str, *args: Any) -> None:
        print(json.dumps({"level": "info", "message": format % args}))


if __name__ == "__main__":
    required_env("QUOTE_WORKER_TOKEN")
    required_env("QUOTE_WORKER_CALLBACK_SECRET")
    required_env("QUOTE_WORKER_PUBLIC_URL")
    required_env("QSTASH_CURRENT_SIGNING_KEY")
    required_env("QSTASH_NEXT_SIGNING_KEY")
    server = ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), Handler)
    server.serve_forever()
