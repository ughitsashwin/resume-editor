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

    const prompt2 = `Now make the necessary changes but I want you to act as an expert Resume Writer and Career Coach. I am going to provide you with my current Resume and a Job Description. Your task is to rewrite my whole resume on to be highly competitive, ATS-friendly, and optimized for this specific role (${role} at ${company}). Please follow these strict guidelines: 1. Use the ART Framework: For every bullet point, follow the Action (past-tense verb), Result (measurable outcome/metric), and Transformation (why it mattered/value to the company) structure. 2. ATS Optimization: Naturally integrate high-priority keywords and skills found in the job description without 'keyword stuffing.' 3. Action-Oriented Language: Start every bullet point with a strong, diverse action verb (e.g., Spearheaded, Orchestrated, Optimized, Architected). Avoid passive phrases like 'Responsible for' or 'Assisted with.' 4. Quantify Impact: Where possible, estimate or use placeholders for metrics (e.g., '% increase,' '$ saved,' or 'hours reduced') to demonstrate the 'Result' and 'Transformation.' 5. Industry Standards: Ensure the tone is professional, modern, and concise. Avoid jargon that isn't relevant to the specific industry of the job description.

CRITICAL INSTRUCTION: You MUST output ONLY the final rewritten resume text. Do NOT wrap it in Markdown code blocks (like \`\`\`markdown). Do not preface it with "Here is your rewritten resume". Just start immediately with the applicant's name and format it perfectly, mimicking this exact structured template layout:
${templateText}

Previous Analysis: ${analysisResult}

Original Resume:
${resumeText}

Job Description:
${jobDescription}`;

    const res2 = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt2 }] }],
        generationConfig: {
          temperature: 0.4 // lower temperature for rigid formatting lock
        }
      })
    });

    if (!res2.ok) {
        const err = await res2.text();
        return NextResponse.json({ error: `Gemini API Error (Prompt 2): ${err}` }, { status: res2.status });
    }

    const data2 = await res2.json();
    const rewrittenResume = data2.candidates?.[0]?.content?.parts?.[0]?.text || "No resume rewrite returned.";

    const prompt3 = `Act as a Senior Recruiter. Analyze my NEWLY OPTIMIZED resume against this exact job description for the ${role} position at ${company}. 

Give me ONLY the new final Match Score percentage (e.g., "95%") and a single very short sentence about why it improved, without any extra conversation or markdown formatting.

Optimized Resume:
${rewrittenResume}

Job Description:
${jobDescription}`;

    const res3 = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt3 }] }],
        generationConfig: {
          temperature: 0.1 // very factual for scoring
        }
      })
    });

    if (!res3.ok) {
        const err = await res3.text();
        return NextResponse.json({ error: `Gemini API Error (Prompt 3): ${err}` }, { status: res3.status });
    }

    const data3 = await res3.json();
    const postRewriteScore = data3.candidates?.[0]?.content?.parts?.[0]?.text || "Score not available";

    return NextResponse.json({
      analysis: analysisResult,
      rewrittenResume: rewrittenResume,
      postRewriteScore: postRewriteScore
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
