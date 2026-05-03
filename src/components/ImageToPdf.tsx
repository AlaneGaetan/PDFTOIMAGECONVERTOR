import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { jsPDF } from 'jspdf';
import { FileImage, Trash2, ArrowLeft, ArrowRight, Download, UploadCloud, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

export function ImageToPdf() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    }
  } as any);

  const removeImage = (id: string) => {
    setImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx !== -1) URL.revokeObjectURL(prev[idx].preview);
      return prev.filter(img => img.id !== id);
    });
  };

  const moveImage = (id: string, direction: 'left' | 'right') => {
    setImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx < 0) return prev;
      if (direction === 'left' && idx === 0) return prev;
      if (direction === 'right' && idx === prev.length - 1) return prev;

      const newImages = [...prev];
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      
      const temp = newImages[idx];
      newImages[idx] = newImages[targetIdx];
      newImages[targetIdx] = temp;
      
      return newImages;
    });
  };

  const generatePDF = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < images.length; i++) {
        if (i > 0) pdf.addPage();
        
        const img = new Image();
        img.src = images[i].preview;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        // Calculate aspect ratio
        const imgRatio = img.width / img.height;
        const pageRatio = pageWidth / pageHeight;

        let renderWidth = pageWidth;
        let renderHeight = pageHeight;
        let x = 0;
        let y = 0;

        if (imgRatio > pageRatio) {
          // Image is wider than page -> Fit to width
          renderHeight = pageWidth / imgRatio;
          y = (pageHeight - renderHeight) / 2;
        } else {
          // Fit to height
          renderWidth = pageHeight * imgRatio;
          x = (pageWidth - renderWidth) / 2;
        }

        // We can just add the image (assuming modern browsers support jpeg/png well in jspdf)
        // jspdf works better if we draw to a canvas and get a generic data URL, but addImage supports pure img elements or data urls
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(dataUrl, 'JPEG', x, y, renderWidth, renderHeight);
        }
      }

      pdf.save('Document.pdf');
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in zoom-in-95 duration-300">
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
          {isDragActive ? "Drop the images here ..." : "Drag & drop images here, or click to select"}
        </p>
        <p className="text-gray-500 text-sm mt-2">Supported formats: JPG, PNG, WEBP</p>
      </div>

      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-gray-800">
              Selected Images ({images.length})
            </h3>
            <button
               onClick={generatePDF}
               disabled={isGenerating}
               className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              <span>{isGenerating ? "Generating..." : "Download PDF"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img, index) => (
              <div key={img.id} className="relative group rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm flex flex-col">
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center p-2">
                  <img src={img.preview} alt="Upload preview" className="max-w-full max-h-full object-contain" />
                </div>
                
                {/* Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => removeImage(img.id)}
                    className="p-1.5 bg-white/90 hover:bg-red-50 text-red-500 rounded-md backdrop-blur-sm shadow-sm"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-2 border-t border-gray-100 flex items-center justify-between bg-white text-gray-500">
                   <button 
                      onClick={() => moveImage(img.id, 'left')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-4 h-4" />
                   </button>
                   <span className="text-xs font-mono">{index + 1}</span>
                   <button 
                      onClick={() => moveImage(img.id, 'right')}
                      disabled={index === images.length - 1}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowRight className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
