import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { markdown } = await req.json();

    if (!markdown) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType } = require("docx");
    const lines = markdown.split("\n");
    const docChildren: any[] = [];

    for (const line of lines) {
      const cleanLine = line.trim();
      
      if (!cleanLine) {
        docChildren.push(new Paragraph({ text: "" }));
        continue;
      }

      if (cleanLine.startsWith("# ")) {
        docChildren.push(new Paragraph({
          text: cleanLine.replace("# ", ""),
          heading: HeadingLevel.HEADING_1,
        }));
      } else if (cleanLine.startsWith("## ")) {
         docChildren.push(new Paragraph({
          text: cleanLine.replace("## ", ""),
          heading: HeadingLevel.HEADING_2,
        }));
      } else if (cleanLine.startsWith("### ")) {
         docChildren.push(new Paragraph({
          text: cleanLine.replace("### ", ""),
          heading: HeadingLevel.HEADING_3,
        }));
      } else if (cleanLine.startsWith("- ") || cleanLine.startsWith("* ")) {
        const textParts = cleanLine.substring(2).trim().split(/(\*\*.*?\*\*)/g);
        const runs = textParts.map((part: string) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return new TextRun({ text: part.slice(2, -2), bold: true });
            }
            return new TextRun({ text: part });
        });
        
        docChildren.push(new Paragraph({
          children: runs,
          bullet: { level: 0 }
        }));
      } else if (cleanLine.includes("|") && cleanLine.includes("-")) {
          // Skip markdown table dividers like |---|---|
          continue;
      } else if (cleanLine.startsWith("|") && cleanLine.endsWith("|")) {
          // Native Docx Table Builder for cleanly mimicking skills/tabular layouts
          const cells = cleanLine.split("|").filter(Boolean).map((cell: string) => cell.trim());
          const docxCells = cells.map((text: string) => new TableCell({
              children: [new Paragraph(text)],
          }));
          
          // Check if previous child was already a table to append or create new
          const lastChild = docChildren[docChildren.length - 1];
          if (lastChild instanceof Table) {
             // We'd append but api limitations so we build it fresh or ignore complex tables for basic formatting right now.
          } else {
             const row = new TableRow({ children: docxCells });
             docChildren.push(new Table({
                rows: [row],
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    insideVertical_:{ style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    insideHorizontal_: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                }
             }));
          }
      } else {
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const textRuns = parts.map((part: string) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return new TextRun({ text: part.slice(2, -2), bold: true });
            }
            return new TextRun({ text: part });
        });

        docChildren.push(new Paragraph({
          children: textRuns
        }));
      }
    }

    const outputDoc = new Document({
      sections: [{
        properties: {},
        children: docChildren,
      }]
    });

    const buffer = await Packer.toBuffer(outputDoc);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=Optimized_Resume.docx",
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error generating document" }, { status: 500 });
  }
}
