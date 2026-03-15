import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";

export async function POST(req: Request) {
  try {
    const { rewrittenResume, jobDescription, role, company, applicantName } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured." }, { status: 500 });
    }

    if (!rewrittenResume || !jobDescription) {
       return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = `Act as an expert Career Coach and Copywriter.
Write a personalized cover letter that tells my story, shows passion, and proves I am the right fit for the ${role} position at ${company}.
It must be no more than 450 words (1 Page).
Use my newly optimized resume and the job description as context.

My Name: ${applicantName || 'Applicant'}

Optimized Resume:
${rewrittenResume}

Job Description:
${jobDescription}

CRITICAL INSTRUCTION: Output ONLY the raw letter text. DO NOT use markdown, bold text, stars (*), or any special formatting. Just output clean, raw text with paragraphs separated by blank lines. Start directly with the greeting or the header. Make it extremely professional and compelling.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });

    if (!res.ok) {
       const err = await res.text();
       return NextResponse.json({ error: `Gemini API Error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    let coverLetterText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    coverLetterText = coverLetterText.replace(/\*/g, ''); // strip markdown asterisks

    // Build PDF directly in memory buffer
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 60 });
      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      doc.font("Times-Roman").fontSize(11);

      // Simple paragraph separation handler
      const paragraphs = coverLetterText.split(/(?:\r?\n){2,}/).map((p: string) => p.trim()).filter(Boolean);
      
      paragraphs.forEach((p: string, index: number) => {
         // Some lines like dates or signatures might not need to be justified, 
         // but instructions said "the whole text is 'Justify text' aligned"
         doc.text(p.replace(/\r?\n/g, ' '), { align: "justify" });
         if (index < paragraphs.length - 1) {
            doc.moveDown(1.5);
         }
      });

      doc.end();
    });

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Cover_Letter_${(applicantName || 'Applicant').replace(/[^a-zA-Z0-9.\-_]/g, "_")}.pdf"`,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
