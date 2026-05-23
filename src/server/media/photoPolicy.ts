export const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const maxImageBytes = 6 * 1024 * 1024;

type ListingPhotoUpload = Pick<File, "type" | "size">;

export function validateListingPhotoUpload(file: ListingPhotoUpload) {
  const errors: string[] = [];
  if (!allowedImageTypes.has(file.type)) {
    errors.push("jpg, png, webp 이미지만 업로드할 수 있습니다.");
  }
  if (file.size > maxImageBytes) {
    errors.push("이미지 용량은 6MB 이하만 허용합니다.");
  }
  return errors;
}

export function publicPhotoAllowed(photo: {
  moderationStatus: string;
  licenseStatus: string;
  consentStatus: string;
}) {
  return (
    photo.moderationStatus === "approved" &&
    photo.licenseStatus !== "rejected" &&
    ["owner_confirmed", "tenant_confirmed", "not_required"].includes(photo.consentStatus)
  );
}
