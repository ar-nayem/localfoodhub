import { saveUploadedFile } from "../media/save";

/** Vendor-facing image uploads (logo/banner/food/gallery/promotion/category) are always
 * images — thin wrapper over the shared saver so vendor call sites don't need to think
 * about `kind`. */
export async function saveUploadedImage(file: File, shopId: string) {
  return saveUploadedFile(file, shopId, "image");
}
