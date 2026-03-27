import QRCode from "qrcode";

export async function createQrDataUrl(value: string) {
  return QRCode.toDataURL(value, {
    margin: 1,
    width: 320,
    color: {
      dark: "#222222",
      light: "#fffaf4",
    },
  });
}
