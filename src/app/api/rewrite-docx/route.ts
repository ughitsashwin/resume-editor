// @ts-nocheck
import { NextResponse } from "next/server";
import AdmZip from "adm-zip";

// Safely escape strictly XML compliant inner run strings to prevent unallowed syntax crashes cleanly
function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const jobDesc = formData.get("jobDescription") as string;
        const role = formData.get("role") as string;
        const company = formData.get("company") as string;

        if (!file || !jobDesc) {
            return NextResponse.json({ error: "File and Job Description are required" }, { status: 400 });
        }

        if (file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && !file.name.endsWith(".docx")) {
             return NextResponse.json({ error: "Only pure DOCX Word files can be modified in-place directly." }, { status: 400 });
        }

        // Parse to buffer cleanly
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const zip = new AdmZip(buffer);
        const xml = zip.readAsText("word/document.xml");

        if (!xml) {
           return NextResponse.json({ error: "Invalid DOCX format or unreadable XML" }, { status: 400 });
        }

        // Extremely native string/regex isolation of word paragraph containers
        const pRegex = /<w:p([ >].*?)<\/w:p>/gs;
        const paragraphs: string[] = [];
        let match;
        
        while ((match = pRegex.exec(xml)) !== null) {
          const pContent = match[0];
          // Find all text fragments within this exact single overall paragraph node wrapper
          const tRegex = /<w:t(?: [^>]*)?>(.*?)<\/w:t>/gs;
          let text = "";
          let tMatch;
          while ((tMatch = tRegex.exec(pContent)) !== null) {
             text += tMatch[1];
          }
          if (text.trim()) {
             paragraphs.push(text);
          }
        }

        if (paragraphs.length === 0) {
             return NextResponse.json({ error: "No readable body paragraphs extracted from the document." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY || "";
        if (!apiKey) {
           return NextResponse.json({ error: "API key not configured." }, { status: 500 });
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const prompt = `Act as an expert Resume Writer and Career Coach. 
I am going to provide you with a pure JSON array containing individual string paragraphs extracted sequentially directly from my Resume.
I also have a target Job Description for a ${role} position at ${company}.

Your task is to heavily optimize the resume text bullet points and summary perfectly to align with the job description using the ART framework.

CRITICAL INSTRUCTION - PAY STRICT ATTENTION:
1. You MUST return ONLY a strictly valid JSON array of exactly ${paragraphs.length} strings. 
2. Every rewritten string MUST mathematically correspond sequentially 1-to-1 to the exact original array index from my input array.
3. If an index contains my Name, Contact Email, Location, or basic Header Jargon, DO NOT change it! Leave it exactly as it was.
4. Only heavily rewrite the professional summary strings and work experience bullet point strings.
5. UK English & Grammar: Thoroughly double-check the entire document for spelling and grammar mistakes, and enforce strict UK English spelling and formatting throughout all generated strings.
6. Clean Text Only: NEVER include structural labels like (A), (R), (T), or [Action: ...] in the generated strings. Output ONLY the pure sentences. Also, do not use HTML entities (e.g. write '&' or 'and' instead of '&amp;').
7. NEVER add more indices or paragraphs to the array than exactly ${paragraphs.length}.
8. OUTPUT NOTHING ELSE. Do NOT wrap your output in markdown \`\`\`json blocks. Return raw JSON text parsing compliant output starting with '[' and ending with ']'.

--- Job Description ---
${jobDesc}

--- Resume Paragraphs Array ---
${JSON.stringify(paragraphs)}
`;

        const res = await fetch(url, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { 
                 temperature: 0.2, // very rigid factual arrays
              }
           })
        });
        
        if (!res.ok) {
           const errTxt = await res.text();
           return NextResponse.json({ error: `AI Fetch Failed: ${errTxt}` }, { status: 500 });
        }

        const data = await res.json();
        let rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!rawJson) {
           return NextResponse.json({ error: "Empty output from AI" }, { status: 500 });
        }

        rawJson = rawJson.replace(/```json/gi, "").replace(/```/g, "").trim();
        let rewrittenArray: string[];
        
        try {
           rewrittenArray = JSON.parse(rawJson);
        } catch (e) {
           return NextResponse.json({ error: "The AI failed to format the paragraphs accurately. Try again." }, { status: 500 });
        }
        
        // Ensure array sizes perfectly match so we don't accidentally corrupt sequential mappings
        if (rewrittenArray.length !== paragraphs.length) {
            console.warn("Array mismatch warning. Padding or trimming to recover...");
             while (rewrittenArray.length < paragraphs.length) {
                 rewrittenArray.push(paragraphs[rewrittenArray.length]);
             }
             rewrittenArray = rewrittenArray.slice(0, paragraphs.length);
        }

        // Now dynamically rewrite the XML buffer natively in place, preserving margins/colors/tables dynamically.
        let index = 0;
        let pRegexRewrite = /<w:p([ >].*?)<\/w:p>/gs;
        
        const newXml = xml.replace(pRegexRewrite, (pContent) => {
            const tRegex = /<w:t(?: [^>]*)?>(.*?)<\/w:t>/gs;
            let text = "";
            let tMatch;
            while ((tMatch = tRegex.exec(pContent)) !== null) {
                text += tMatch[1];
            }
            if (text.trim()) {
                const targetText = rewrittenArray[index] || text;
                index++;
                
                // BYPASS: If the AI didn't purposefully rewrite this specific array index (E.G. Name, Email, LinkedIn, GitHub headers),
                // we must return the raw original XML string intact immediately. 
                // This prevents squashing `<w:hyperlink>` and `<w:r>` sub-tags into a single text node thus breaking the links!
                const cleanTarget = targetText.replace(/\s+/g, " ").trim();
                const cleanSource = text.replace(/\s+/g, " ").trim();
                if (cleanTarget === cleanSource || cleanSource.includes("Linkedin") || cleanSource.includes("GitHub")) {
                    return pContent;
                }
                
                // Replace the physical inner-XML text wrapper for the very first valid text node, empty the fragmented partial nodes.
                let firstTFound = false;
                return pContent.replace(/(<w:t(?: [^>]*)?>)(.*?)(<\/w:t>)/g, (fullMatch, openTag, oldText, closeTag) => {
                   if (!firstTFound) {
                       firstTFound = true;
                       return openTag + escapeXml(targetText) + closeTag;
                   } else {
                       return openTag + closeTag;
                   }
                });
            }
            return pContent; // Return unchanged node tree spacing wrappers
        });

        zip.updateFile("word/document.xml", Buffer.from(newXml, "utf8"));
        const newBuffer = zip.toBuffer();

        return new NextResponse(newBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            // Native filename parsing handling
            "Content-Disposition": `attachment; filename="Rewritten_Template_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}"`,
          },
        });

    } catch(err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
