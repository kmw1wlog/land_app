#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 2
fi

driver_version="$(awk '/NVRM version/ {print $8; exit}' /proc/driver/nvidia/version 2>/dev/null || true)"
if [ -z "${driver_version}" ]; then
  exec "$@"
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cache_root="${HOMEPATH_NVIDIA_LIB_CACHE:-${repo_root}/.cache/nvidia-driver-libs/${driver_version}}"
lib_dir="${cache_root}/root/usr/lib/x86_64-linux-gnu"
bin_dir="${cache_root}/root/usr/bin"

if [ ! -e "${lib_dir}/libcuda.so.1" ] || [ ! -e "${lib_dir}/libnvidia-ml.so.1" ]; then
  mkdir -p "${cache_root}/debs" "${cache_root}/root"
  package_version="$(apt-cache madison libnvidia-compute-535 2>/dev/null | awk -v v="${driver_version}" '$3 ~ "^" v "-" {print $3; exit}' || true)"
  if [ -z "${package_version}" ]; then
    echo "No matching libnvidia-compute-535 package found for loaded driver ${driver_version}." >&2
    echo "Reboot after the installed NVIDIA driver update, or install matching driver libraries." >&2
    exit 1
  fi
  (
    cd "${cache_root}/debs"
    apt download "libnvidia-compute-535=${package_version}" "nvidia-utils-535=${package_version}"
  )
  for deb in "${cache_root}"/debs/*.deb; do
    dpkg-deb -x "${deb}" "${cache_root}/root"
  done
fi

export LD_LIBRARY_PATH="${lib_dir}:${LD_LIBRARY_PATH:-}"
export PATH="${bin_dir}:${PATH}"
exec "$@"
