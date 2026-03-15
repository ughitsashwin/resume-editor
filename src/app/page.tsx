"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, 
  Settings, 
  Briefcase, 
  Building2, 
  ChevronRight, 
  AlertCircle,
  FileText,
  Loader2,
  Trophy,
  PenTool,
  Download,
  Sparkles,
  TrendingUp,
  FileBadge
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [templateText, setTemplateText] = useState(""); // Captures the exact formatting scheme of the uploaded DOCX securely
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [rewrittenResume, setRewrittenResume] = useState("");
  const [postRewriteScore, setPostRewriteScore] = useState("");
  const [userSuggestions, setUserSuggestions] = useState("");
  const [optimizing, setOptimizing] = useState(false);

  const [fileExtracting, setFileExtracting] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState(false);
  const [downloadingCover, setDownloadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
       setUploadedFile(null);
       return;
    }
    setUploadedFile(file);

    if (
      file.type === "application/pdf" || 
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
      file.name.endsWith(".docx")
    ) {
      setFileExtracting(true);
      setError("");
      
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/extract-text", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to parse file");
        
        setResumeText(data.text);
        
        // If it's a DOCX file, save its text extraction pattern to guide Gemini 
        // to mimic that exact layout spacing string structure natively
        if (file.name.endsWith(".docx")) {
          setTemplateText(data.text);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setFileExtracting(false);
      }
    } else {
      setError("Please upload a PDF or DOCX file.");
    }
  };

  const downloadWordDoc = async () => {
    if (!rewrittenResume) return;
    setDownloadingDoc(true);
    
    try {
      const res = await fetch("/api/generate-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // send back pure AI result to be built gracefully
        body: JSON.stringify({ markdown: rewrittenResume })
      });
      
      if (!res.ok) throw new Error("Failed to generate document");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const firstLineName = resumeText.split("\n").map(l => l.trim()).filter(Boolean)[0] || "Optimized_Resume";
      const safeName = firstLineName.replace(/[^a-zA-Z0-9.\-_ ]/g, "").trim();
      const safeRole = role.replace(/[^a-zA-Z0-9.\-_ ]/g, "").trim();
      link.download = `${safeName} - ${safeRole}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloadingDoc(false);
    }
  };

  const downloadOriginalFormat = async () => {
    if (!uploadedFile || !uploadedFile.name.endsWith(".docx")) {
      setError("This extremely precise optimization is only available if you upload a Word Document (.docx) initially.");
      return;
    }
    if (!jobDesc || !role || !company) {
      setError("Please fill out the Job Description, Role, and Company first.");
      return;
    }

    setDownloadingDoc(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("jobDescription", jobDesc);
      formData.append("role", role);
      formData.append("company", company);
      formData.append("userSuggestions", userSuggestions);

      const res = await fetch("/api/rewrite-docx", {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) {
         const errorData = await res.json().catch(() => ({}));
         throw new Error(errorData.error || "Failed to optimally rewrite native .docx file format from AI sequence.");
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const firstLineName = resumeText.split("\n").map(l => l.trim()).filter(Boolean)[0] || "Optimized_Resume";
      const safeName = firstLineName.replace(/[^a-zA-Z0-9.\-_ ]/g, "").trim();
      const safeRole = role.replace(/[^a-zA-Z0-9.\-_ ]/g, "").trim();
      link.download = `${safeName} - ${safeRole}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloadingDoc(false);
    }
  };

  const downloadCoverLetter = async () => {
    if (!rewrittenResume || !jobDesc) {
      setError("Please ensure that your resume is optimized and the Job Description is filled.");
      return;
    }
    
    setDownloadingCover(true);
    setError("");

    try {
      const firstLineName = resumeText.split("\n").map(l => l.trim()).filter(Boolean)[0] || "Applicant";
      const applicantName = firstLineName.replace(/[^a-zA-Z0-9.\-_ ]/g, "").trim();

      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewrittenResume,
          jobDescription: jobDesc,
          role,
          company,
          applicantName
        })
      });

      if (!res.ok) {
         const errorData = await res.json().catch(() => ({}));
         throw new Error(errorData.error || "Failed to optimally generate customized Cover Letter PDF.");
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeRole = role.replace(/[^a-zA-Z0-9.\-_ ]/g, "").trim() || "Role";
      link.download = `Cover_Letter_${applicantName}_${safeRole}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloadingCover(false);
    }
  };

  const startAnalysis = async () => {
    if (!resumeText) {
      setError("Please upload a resume or paste your resume text.");
      return;
    }
    if (!jobDesc || !role || !company) {
      setError("Please fill out Job Description, Role, and Company.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis("");
    setRewrittenResume("");
    setPostRewriteScore("");
    setUserSuggestions("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobDescription: jobDesc,
          role,
          company,
          templateText // Pass existing template structure securely formatting
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Optimization failed");

      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const continueOptimization = async () => {
    setOptimizing(true);
    setError("");

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobDescription: jobDesc,
          role,
          company,
          templateText,
          analysisResult: analysis,
          userSuggestions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Optimization failed");

      setRewrittenResume(data.rewrittenResume);
      setPostRewriteScore(data.postRewriteScore);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans overflow-x-hidden selection:bg-blue-500/30">
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-dark border-b border-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center p-0.5 shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ElevateResume</h1>
            <p className="text-xs text-slate-400 font-medium">AI Career Architect</p>
          </div>
        </div>
        
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-10 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column Controls */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] group-hover:bg-blue-500/10 transition-colors" />
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Target Role
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Role Name</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input 
                    type="text"
                    placeholder="e.g. Senior Frontend Engineer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input 
                    type="text"
                    placeholder="e.g. Google"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-400" />
              Your Resume
            </h2>
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 hover:border-violet-500/50 bg-slate-900/30 rounded-xl p-8 text-center cursor-pointer transition-all group"
              >
                <input 
                  type="file" 
                  accept="application/pdf,.docx" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
                <div className="w-12 h-12 rounded-full bg-white/5 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {fileExtracting ? <Loader2 className="w-6 h-6 text-violet-400 animate-spin" /> : <UploadCloud className="w-6 h-6 text-violet-400" />}
                </div>
                <p className="text-sm text-slate-300 font-medium">
                  {fileExtracting ? "Extracting Format & Text..." : "Upload PDF or Word Docx"}
                </p>
                <p className="text-xs text-emerald-400 mt-2">Uploading DOCX perfectly preserves formatting automatically</p>
              </div>

              <textarea 
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your raw resume text here if you prefer..."
                className="w-full h-40 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 transition-all resize-none"
              />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Job Description
            </h2>
            <textarea 
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the full job description here..."
              className="w-full h-40 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
            />
          </motion.div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startAnalysis}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing & Structuring Format...
              </>
            ) : (
              <>
                Ignite Optimization
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>

        </div>

        {/* Right Column Results */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="popLayout">
            {!analysis && !loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-[600px] glass rounded-3xl flex flex-col items-center justify-center p-8 text-center border-dashed border-white/10"
              >
                <div className="w-24 h-24 mb-6 relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-full h-full glass rounded-full flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-blue-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Ready to Elevate</h3>
                <p className="text-slate-400 max-w-sm text-sm">
                  Fill in your details, provide your resume, and let our ATS AI Architect align your career narrative.
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[600px] glass rounded-3xl flex flex-col items-center justify-center p-8 text-center"
              >
                <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-6" />
                <h3 className="text-xl font-bold text-white mb-2 animate-pulse text-gradient">Architecting your document...</h3>
                <p className="text-slate-400 text-sm">This may take up to 20 seconds. We are actively preserving your layouts structure right now.</p>
              </motion.div>
            )}

            {(analysis || rewrittenResume) && !loading && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="glass rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-emerald-400" />
                    ATS Analysis & Missing Keywords
                  </h2>
                  <div className="prose prose-invert prose-emerald max-w-none text-sm leading-relaxed overflow-x-hidden">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                  </div>
                </div>

                {!rewrittenResume && (
                  <div className="glass rounded-2xl p-8 relative overflow-hidden mt-6 border-dashed border-white/10">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                       <Settings className="w-5 h-5 text-blue-400" />
                       Custom Rewrite Suggestions (Optional)
                    </h2>
                    <textarea 
                      value={userSuggestions}
                      onChange={(e) => setUserSuggestions(e.target.value)}
                      placeholder="e.g. Focus more on my leadership experience, make the tone more aggressive, add a focus on Next.js..."
                      className="w-full h-24 bg-slate-900/50 border border-white/10 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all resize-none mb-6"
                    />
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={continueOptimization}
                      disabled={optimizing}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-4 rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {optimizing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Applying Instructions & Architecting...
                        </>
                      ) : (
                        <>
                          Continue Optimization
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </motion.button>
                  </div>
                )}

                {rewrittenResume && (
                <div className="glass rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px]" />
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <PenTool className="w-6 h-6 text-violet-400" />
                    Optimized Clean Resume
                  </h2>
                  <div className="prose prose-invert prose-violet max-w-none text-sm leading-relaxed bg-slate-900/50 p-6 rounded-xl border border-white/5 whitespace-pre-wrap font-mono">
                    <ReactMarkdown>{rewrittenResume}</ReactMarkdown>
                  </div>
                  
                  {postRewriteScore && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-6 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/20 p-5 rounded-xl flex items-center gap-4"
                    >
                      <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-emerald-400 font-bold mb-1 text-sm tracking-wide uppercase">New Match Score After Optimization</h4>
                        <p className="text-slate-200 text-sm font-medium">{postRewriteScore}</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="mt-8 flex flex-wrap justify-end gap-3">
                    <button 
                      onClick={() => navigator.clipboard.writeText(rewrittenResume)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-slate-300 transition-colors border border-white/10 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Copy Text
                    </button>
                    <button 
                      onClick={downloadWordDoc}
                      disabled={downloadingDoc}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors border border-slate-600 flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                      {downloadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Basic Format (.docx)
                    </button>
                    <button 
                      onClick={downloadCoverLetter}
                      disabled={downloadingCover}
                      className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg text-sm text-blue-300 transition-colors border border-blue-500/30 flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                      {downloadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBadge className="w-4 h-4" />}
                      Cover Letter (.pdf)
                    </button>
                    {uploadedFile?.name.endsWith(".docx") && (
                      <button 
                        onClick={downloadOriginalFormat}
                        disabled={downloadingDoc}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg text-sm text-white transition-colors shadow-lg shadow-emerald-500/20 border border-emerald-500 flex items-center gap-2 font-semibold disabled:opacity-50"
                      >
                        {downloadingDoc ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Preserving True Format...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Download in Original Native Format
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
