import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { pdfjsLib } from '../lib/pdfjs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FileDown, RefreshCw, UploadCloud, Download, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface ExtractedImage {
  id: string;
  pageNumber: number;
  dataUrl: string;
}

export function PdfToImage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setPdfFile(acceptedFiles[0]);
      setImages([]); // Reset
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  } as any);

  const extractImages = async () => {
    if (!pdfFile) return;
    
    setIsProcessing(true);
    setImages([]);
    setProgress(0);
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const extracted: ExtractedImage[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        // Set scale for high quality image
        const scale = 2.0; 
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        } as any;

        await page.render(renderContext).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        extracted.push({
          id: `page-${i}`,
          pageNumber: i,
          dataUrl
        });

        setProgress(Math.round((i / numPages) * 100));
      }

      setImages(extracted);
    } catch (error) {
      console.error("Error extracting images from PDF", error);
      alert("Failed to process the PDF. Check console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = (image: ExtractedImage) => {
    saveAs(image.dataUrl, `Page_${image.pageNumber}.jpg`);
  };

  const downloadAllAsZip = async () => {
    if (images.length === 0) return;
    
    const zip = new JSZip();
    
    images.forEach((img) => {
      // dataUrl looks like "data:image/jpeg;base64,....."
      const base64Data = img.dataUrl.split(',')[1];
      zip.file(`Page_${img.pageNumber}.jpg`, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${pdfFile?.name.replace('.pdf', '')}_Images.zip`);
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {!pdfFile ? (
        <div 
          {...getRootProps()} 
          className={cn(
            "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200",
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-700 font-medium text-center">
            {isDragActive ? "Drop the PDF here ..." : "Drag & drop a PDF here, or click to select"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center space-y-4 shadow-sm">
          <FileDown className="w-12 h-12 text-red-500" />
          <div className="text-center">
            <h4 className="font-semibold text-gray-800">{pdfFile.name}</h4>
            <p className="text-sm text-gray-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          
          <div className="flex space-x-3 w-full max-w-xs pt-2">
            <button
               onClick={() => {
                 setPdfFile(null);
                 setImages([]);
               }}
               className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
               disabled={isProcessing}
            >
              Cancel
            </button>
            <button
               onClick={extractImages}
               disabled={isProcessing || images.length > 0}
               className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {isProcessing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                "Convert"
              )}
            </button>
          </div>

          {isProcessing && (
             <div className="w-full max-w-xs mt-4">
               <div className="flex justify-between text-xs text-gray-500 mb-1">
                 <span>Processing...</span>
                 <span>{progress}%</span>
               </div>
               <div className="w-full bg-gray-200 rounded-full h-2">
                 <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
               </div>
             </div>
          )}
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-gray-800">
              Extracted Pages ({images.length})
            </h3>
            <button
               onClick={downloadAllAsZip}
               className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Download ZIP</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="relative group rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm flex flex-col">
                <div className="w-full bg-gray-100 border-b border-gray-200 relative aspect-[1/1.4] flex items-center justify-center p-2">
                  <img src={img.dataUrl} alt={`Page ${img.pageNumber}`} className="max-w-full max-h-full object-contain drop-shadow-sm" />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => downloadImage(img)}
                      className="bg-white text-gray-900 px-3 py-1.5 rounded-lg font-medium text-sm flex items-center space-x-1.5 hover:bg-gray-100 transition-colors"
                    >
                       <Download className="w-4 h-4" />
                       <span>Download</span>
                    </button>
                  </div>
                </div>
                
                <div className="p-2.5 flex items-center justify-between bg-white">
                   <div className="flex items-center space-x-1.5 text-gray-600">
                     <ImageIcon className="w-4 h-4" />
                     <span className="text-sm font-medium">Page {img.pageNumber}</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
