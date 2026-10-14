"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, FileText, X, RefreshCw, ShieldAlert, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { validateCsvFileMeta } from "@/lib/trades/csv-sanitizer";

interface UploadResult {
  importId: string;
  fileName: string;
  flaggedFormulas: number;
  status: string;
  fileSizeBytes: number;
}

interface FileDropzoneProps {
  onUploadSuccess?: (result: UploadResult) => void;
  className?: string;
}

export function FileDropzone({ onUploadSuccess, className = "" }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<UploadResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    setErrorMsg(null);
    setSuccessData(null);

    const validation = validateCsvFileMeta({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      setErrorMsg(validation.error || "Invalid file selection.");
      return;
    }

    setSelectedFile(file);
    startUpload(file);
  };

  const startUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(15);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Smooth progress animation increment
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev >= 85 ? 85 : prev + 15));
      }, 120);

      const response = await fetch("/api/trades/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressTimer);

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `Upload failed with HTTP ${response.status}`);
      }

      setUploadProgress(100);
      setSuccessData(json);
      if (onUploadSuccess) {
        onUploadSuccess(json);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload file.";
      setErrorMsg(message);
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setErrorMsg(null);
    setSuccessData(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <AnimatePresence mode="wait">
        {/* State 1: Success Banner & Metadata */}
        {successData && (
          <motion.div
            key="success-box"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="p-6 rounded-[8px] bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-[6px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tradebook Uploaded Successfully
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {successData.fileName} • {formatFileSize(successData.fileSizeBytes || 0)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="btn-zerodha-secondary text-xs py-1.5 px-3 flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Upload Another</span>
              </button>
            </div>

            {/* Formula Warning Note if any threats were sanitized */}
            {successData.flaggedFormulas > 0 && (
              <div className="p-3 rounded-[4px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start space-x-2 text-xs text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Security Guard:</strong> Sanitized {successData.flaggedFormulas} formula injection threat
                  {successData.flaggedFormulas > 1 ? "s" : ""}. Cells were escaped to ensure safe spreadsheet viewing.
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                Import ID: {successData.importId.slice(0, 8)}...
              </span>
              <span className="tag-zerodha bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-semibold">
                Status: Uploaded
              </span>
            </div>
          </motion.div>
        )}

        {/* State 2: Error Notification */}
        {errorMsg && !isUploading && (
          <motion.div
            key="error-box"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-[6px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start justify-between text-xs text-rose-700 dark:text-rose-300"
          >
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Upload Failed:</strong> {errorMsg}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="p-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-200"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* State 3: Interactive Dropzone Canvas */}
        {!successData && (
          <motion.div
            key="dropzone-box"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            whileHover={{ y: isUploading ? 0 : -2 }}
            transition={{ duration: 0.2 }}
            className={`relative p-8 md:p-12 rounded-[8px] border-2 border-dashed transition-all cursor-pointer text-center select-none ${
              isDragOver
                ? "border-[#387ed1] bg-blue-50/60 dark:bg-blue-950/30 scale-[1.01]"
                : "border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 hover:border-[#387ed1] hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
            }`}
          >
            {isUploading ? (
              /* Uploading State with Animated Progress */
              <div className="max-w-sm mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#387ed1] mx-auto flex items-center justify-center animate-pulse">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#387ed1]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Uploading &amp; Sanitizing Tradebook...
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedFile?.name} ({formatFileSize(selectedFile?.size || 0)})
                  </p>
                </div>

                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#387ed1]"
                    initial={{ width: "0%" }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ ease: "easeInOut", duration: 0.2 }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                  <span>Validating CSV structure</span>
                  <span>{uploadProgress}%</span>
                </div>
              </div>
            ) : (
              /* Idle / DragOver State */
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-14 h-14 rounded-[8px] bg-blue-50 dark:bg-blue-950/50 text-[#387ed1] dark:text-sky-400 mx-auto flex items-center justify-center shadow-sm">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {isDragOver ? "Drop CSV file now" : "Drag and drop your tradebook CSV here"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    or click to browse from your device
                  </p>
                </div>

                {/* Badges for Supported Formats */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="px-2.5 py-1 rounded-[3px] text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Zerodha Tradebook (.csv)
                  </span>
                  <span className="px-2.5 py-1 rounded-[3px] text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Custom Column CSV
                  </span>
                  <span className="px-2.5 py-1 rounded-[3px] text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-[#387ed1] dark:text-sky-400 border border-blue-200 dark:border-blue-800">
                    Max 25 MB
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
