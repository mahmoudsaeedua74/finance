import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const A4_WIDTH_PX = 794;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

function mountHtmlDocument(html: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;visibility:hidden;"
  );
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    throw new Error("Unable to render PDF document");
  }
  doc.open();
  doc.write(html);
  doc.close();
  return iframe;
}

async function ensureArabicFonts(doc: Document) {
  const specs = [
    '400 13px "Noto Sans Arabic"',
    '500 13px "Noto Sans Arabic"',
    '600 11px "Noto Sans Arabic"',
    '700 22px "Noto Sans Arabic"',
  ];
  await Promise.all(specs.map((spec) => doc.fonts.load(spec).catch(() => undefined)));
  await doc.fonts.ready;
  await new Promise((r) => setTimeout(r, 900));
}

async function waitForDocumentReady(iframe: HTMLIFrameElement) {
  await new Promise<void>((resolve) => {
    if (iframe.contentDocument?.readyState === "complete") resolve();
    else iframe.onload = () => resolve();
  });
  const doc = iframe.contentDocument;
  if (doc) await ensureArabicFonts(doc);
}

/** Renders styled HTML (RTL / Arabic) and downloads a real PDF file. */
export async function downloadHtmlAsPdf(html: string, filename: string): Promise<void> {
  const iframe = mountHtmlDocument(html);
  try {
    await waitForDocumentReady(iframe);
    const body = iframe.contentDocument!.body;
    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: A4_WIDTH_PX,
      width: A4_WIDTH_PX,
      height: body.scrollHeight,
      onclone: (clonedDoc) => {
        clonedDoc.documentElement.setAttribute("dir", "rtl");
        clonedDoc.documentElement.setAttribute("lang", "ar");
        clonedDoc.body.style.fontFamily = '"Noto Sans Arabic","Segoe UI",Tahoma,sans-serif';
        clonedDoc.body.style.letterSpacing = "0";
      },
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const imgHeightMm = (canvas.height * A4_WIDTH_MM) / canvas.width;

    let heightLeft = imgHeightMm;
    let y = 0;

    pdf.addImage(imgData, "JPEG", 0, y, A4_WIDTH_MM, imgHeightMm);
    heightLeft -= A4_HEIGHT_MM;

    while (heightLeft > 0) {
      y = heightLeft - imgHeightMm;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, y, A4_WIDTH_MM, imgHeightMm);
      heightLeft -= A4_HEIGHT_MM;
    }

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    iframe.remove();
  }
}

export function pdfFilename(base: string, suffix?: string): string {
  const slug = base
    .trim()
    .replace(/[^\w\u0600-\u06FF\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const name = slug || "document";
  return suffix ? `${name}-${suffix}.pdf` : `${name}.pdf`;
}
