export type OpenPdfResult = 'ok' | 'empty' | 'json';

export function openPdfBlob(
  blob: Blob | null | undefined,
  fileName: string
): OpenPdfResult {
  if (!blob || blob.size === 0) {
    return 'empty';
  }
  if (blob.type && blob.type.indexOf('json') >= 0) {
    return 'json';
  }
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank');
  if (!opened) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'ok';
}
