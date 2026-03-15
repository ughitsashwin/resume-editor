import { NextResponse } from "next/server";
import mammoth from "mammoth";
import PDFParser from "pdf2json";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      text = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, true as NodeJS.Dict<string> | boolean | undefined | any);
        pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
        pdfParser.on("pdfParser_dataReady", () => {
          resolve(pdfParser.getRawTextContent());
        });
        pdfParser.parseBuffer(buffer);
      });
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
      file.name.toLowerCase().endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json({ error: "Unsupported file type. Please upload a PDF or DOCX file." }, { status: 400 });
    }

    // Clean up extreme whitespace from extraction
    text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error parsing file" }, { status: 500 });
  }
}
