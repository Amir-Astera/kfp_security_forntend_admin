export function dataUrlToFile(dataUrl: string, fileName: string): File {
  if (typeof dataUrl !== "string" || dataUrl.length === 0) {
    throw new Error("Некорректные данные изображения");
  }

  const [header, base64Data] = dataUrl.split(",");
  if (!header || !base64Data) {
    throw new Error("Некорректный формат изображения");
  }

  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";

  const binaryString = atob(base64Data);
  const binaryLength = binaryString.length;
  const bytes = new Uint8Array(binaryLength);

  for (let i = 0; i < binaryLength; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
}
