
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppSettings, RoundingMode, ProductionRecord } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DataTable from './components/DataTable';
import Validation from './components/Validation';
import MonthFilter from './components/MonthFilter';
import { processRawData } from './utils/dataProcessors';
import { getGeminiInsights } from './services/geminiService';
import { parseProductionDataWithAi } from './services/pdfParsingService';
// Added UploadCloud to the imports from lucide-react
import { Sparkles, Loader2, CheckCircle, CalendarDays, UploadCloud } from 'lucide-react';

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    roundingMode: RoundingMode.VARIANT_A,
    tombakThreshold: 85,
    tempBuckets: [570, 610, 650],
    tempTolerance: 5,
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [uploadedRecords, setUploadedRecords] = useState<ProductionRecord[]>([]);
  const [uploadStats, setUploadStats] = useState<{ files: number; count: number } | null>(null);
  
  // Filtering state
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // Get raw data processed with current settings
  const allProcessedData = useMemo(() => {
    return uploadedRecords.map(rec => {
        return processRawData([rec], settings)[0];
    });
  }, [settings, uploadedRecords]);

  // Extract unique available months (Format: "YYYY-MM")
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allProcessedData.forEach(rec => {
      // Assuming datum is "DD.MM.YY" or similar. We try to normalize for sorting.
      // A simple split usually works for these protocols
      const parts = rec.datum.split('.');
      if (parts.length === 3) {
        const month = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        months.add(`${year}-${month}`);
      }
    });
    return Array.from(months).sort().reverse();
  }, [allProcessedData]);

  // Filter data based on selection
  const filteredData = useMemo(() => {
    if (selectedMonths.length === 0) return allProcessedData;
    return allProcessedData.filter(rec => {
      const parts = rec.datum.split('.');
      if (parts.length === 3) {
        const month = parts[1].padStart(2, '0');
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        const key = `${year}-${month}`;
        return selectedMonths.includes(key);
      }
      return false;
    });
  }, [allProcessedData, selectedMonths]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (filteredData.length > 0) {
        setIsAiLoading(true);
        const insights = await getGeminiInsights(filteredData);
        setAiInsights(insights);
        setIsAiLoading(false);
      }
    };
    fetchInsights();
  }, [filteredData]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsParsingPdf(true);
    try {
      let allExtractedRecords: ProductionRecord[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const records = await parseProductionDataWithAi(files[i], settings);
        allExtractedRecords = [...allExtractedRecords, ...records];
      }
      
      setUploadedRecords(prev => [...prev, ...allExtractedRecords]);
      setUploadStats({ files: files.length, count: allExtractedRecords.length });
      
      setTimeout(() => setUploadStats(null), 5000);
      
    } catch (error) {
      console.error("Upload failed", error);
      alert(error instanceof Error ? error.message : "Fehler beim Verarbeiten der PDFs.");
    } finally {
      setIsParsingPdf(false);
    }
  }, [settings]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar 
        settings={settings} 
        setSettings={setSettings} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onFileUpload={handleFileUpload}
        isUploading={isParsingPdf}
      />
      
      <main className="flex-1 overflow-x-hidden flex flex-col">
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800">Produktions-Dashboard</h2>
            <p className="text-xs text-gray-500 font-medium">
              {filteredData.length > 0 
                ? `${filteredData.length} Einträge für Auswahl (${allProcessedData.length} gesamt)` 
                : 'Bereit zum Import'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             {uploadStats && (
               <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                 <CheckCircle size={14} />
                 <span>Erfolgreich: {uploadStats.count} Chargen importiert</span>
               </div>
             )}
             
             {isAiLoading || isParsingPdf ? (
               <div className="flex items-center gap-2 text-blue-600 animate-pulse bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                 {isParsingPdf ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                 <span className="text-xs font-bold">
                   {isParsingPdf ? 'KI extrahiert Maschinendaten...' : 'KI analysiert Trends...'}
                 </span>
               </div>
             ) : aiInsights && (
               <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 text-xs font-medium max-w-lg truncate shadow-sm">
                 <Sparkles size={14} className="shrink-0 text-indigo-500" />
                 <span className="truncate italic">"{aiInsights}"</span>
               </div>
             )}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
          {allProcessedData.length === 0 && !isParsingPdf ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="w-full max-w-2xl bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] p-16 flex flex-col items-center text-center gap-8 transition-all hover:border-blue-400 group cursor-pointer shadow-lg shadow-gray-100"
                onClick={() => document.querySelector('input[type="file"]')?.dispatchEvent(new MouseEvent('click'))}
              >
                <div className="bg-blue-50 p-8 rounded-[2rem] group-hover:bg-blue-100 transition-colors">
                  <UploadCloud size={64} className="text-blue-600" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-gray-800 tracking-tight">Protokoll-Analyse starten</h3>
                  <p className="text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Ziehen Sie Ihre <b>PDF-Maschinenprotokolle</b> (Scans oder Digital) hierher.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-full uppercase tracking-widest">
                    <CalendarDays size={14} /> Zeitreihen-Analyse
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-full uppercase tracking-widest">
                    <Sparkles size={14} /> Vision AI
                  </div>
                </div>
              </div>
            </div>
          ) : isParsingPdf ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6">
               <div className="relative">
                 <Loader2 size={80} className="text-blue-600 animate-spin opacity-20" />
                 <Sparkles size={32} className="text-blue-600 absolute inset-0 m-auto animate-pulse" />
               </div>
               <div className="text-center space-y-2">
                 <h3 className="text-xl font-black text-gray-800">Visuelle Aufbereitung...</h3>
                 <p className="text-gray-500 max-w-md">
                   Gemini nutzt Computer Vision, um Handschriften und Tabellenstrukturen in Ihren Scans zu identifizieren.
                 </p>
               </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-700">
              <MonthFilter 
                availableMonths={availableMonths} 
                selectedMonths={selectedMonths} 
                setSelectedMonths={setSelectedMonths} 
              />
              
              {filteredData.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-3xl p-12 text-center text-gray-500 italic">
                  Keine Daten für den gewählten Zeitraum vorhanden.
                </div>
              ) : (
                <>
                  {activeTab === 'dashboard' && <Dashboard data={filteredData} />}
                  {activeTab === 'data' && <DataTable data={filteredData} />}
                  {activeTab === 'validation' && <Validation data={filteredData} />}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
