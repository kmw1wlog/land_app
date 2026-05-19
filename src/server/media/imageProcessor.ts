// TODO: Move this MVP placeholder to sharp/squoosh before beta.
// Production flow should strip EXIF, generate WebP variants, and produce fixed thumbnails.
export function imageProcessingNotice() {
  return "MVP에서는 원본 저장만 수행합니다. 베타 전 EXIF 제거와 WebP 변환을 적용해야 합니다.";
}
