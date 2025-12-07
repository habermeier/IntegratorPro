import React, { useState } from 'react';
import { HardwareModule, Connection } from '../types';
import { analyzeProject } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface GeminiAdvisorProps {
  modules: HardwareModule[];
  connections: Connection[];
}

const GeminiAdvisor: React.FC<GeminiAdvisorProps> = ({ modules, connections }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    const result = await analyzeProject(modules, connections);
    setReport(result);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
       <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">Project Validation</h2>
            <p className="text-indigo-100 max-w-xl text-lg leading-relaxed">
                Use Gemini 2.5 Flash to analyze your wiring diagram, power budget, and rack layout. 
                We'll look for missing power supplies, connector mismatches, and rack spacing issues.
            </p>
            <button 
                onClick={runAnalysis}
                disabled={loading}
                className="mt-8 bg-white text-indigo-700 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-indigo-50 transition transform hover:scale-105 active:scale-95 disabled:opacity-75 disabled:scale-100 flex items-center"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Analyzing System...
                    </>
                ) : (
                    "Run System Check"
                )}
            </button>
          </div>
          {/* Decorative circles */}
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-indigo-500 rounded-full opacity-30 blur-3xl"></div>
          <div className="absolute bottom-[-20px] left-[50px] w-40 h-40 bg-violet-400 rounded-full opacity-20 blur-2xl"></div>
       </div>

       {report && (
           <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-y-auto shadow-inner prose prose-invert max-w-none">
                <ReactMarkdown>{report}</ReactMarkdown>
           </div>
       )}
       
       {!report && !loading && (
           <div className="flex-1 flex items-center justify-center text-slate-600 italic border border-dashed border-slate-800 rounded-xl">
               Analysis results will appear here.
           </div>
       )}
    </div>
  );
};

export default GeminiAdvisor;
