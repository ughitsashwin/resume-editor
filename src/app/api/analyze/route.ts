import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { resumeText, jobDescription, role, company, templateText } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured." }, { status: 500 });
    }
    
    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: "Resume and Job Description are required" }, { status: 400 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const headers = {
      "Content-Type": "application/json"
    };

    const prompt1 = `Act as a Senior Recruiter. Analyze my resume against this job description for the ${role} position at ${company}. Give me a Match Score out of 100 and list the top missing keywords I need.\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescription}`;

    const res1 = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt1 }] }],
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    if (!res1.ok) {
        const err = await res1.text();
        return NextResponse.json({ error: `Gemini API Error (Prompt 1): ${err}` }, { status: res1.status });
    }

    const data1 = await res1.json();
    const analysisResult = data1.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis returned.";

    return NextResponse.json({
      analysis: analysisResult
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
