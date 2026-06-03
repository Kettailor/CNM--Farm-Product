const QR_BYTE_LIMIT = 78;

function encodedAnimalId(animalId: string) {
  return encodeURIComponent(animalId);
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

export function buildPublicLivestockAnimalPath(animalId: string) {
  return `/public/vat-nuoi/${encodedAnimalId(animalId)}`;
}

export function buildPublicLivestockAnimalShortPath(animalId: string) {
  return `/p/v/${encodedAnimalId(animalId)}`;
}

export function buildPublicLivestockAnimalQrValue(animalId: string, origin: string) {
  const absoluteShortUrl = `${origin.replace(/\/$/, "")}${buildPublicLivestockAnimalShortPath(animalId)}`;
  return byteLength(absoluteShortUrl) <= QR_BYTE_LIMIT ? absoluteShortUrl : buildPublicLivestockAnimalShortPath(animalId);
}
