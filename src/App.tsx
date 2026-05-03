/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ImageToPdf } from './components/ImageToPdf';
import { PdfToImage } from './components/PdfToImage';
import { FileImage, FileText, ArrowRightLeft } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'img2pdf' | 'pdf2img'>('img2pdf');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Convertio
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Title Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-3">
            {activeTab === 'img2pdf' ? 'Image to PDF Converter' : 'PDF to Image Converter'}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            {activeTab === 'img2pdf' 
              ? 'Easily convert multiple images into a single sorted PDF document.' 
              : 'Extract all pages from a PDF and download them as high-quality images.'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-gray-100 p-1.5 rounded-xl inline-flex shadow-inner">
            <button
              onClick={() => setActiveTab('img2pdf')}
              className={cn(
                "flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === 'img2pdf' 
                  ? "bg-white text-blue-700 shadow-sm" 
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-200/50"
              )}
            >
              <FileImage className="w-4 h-4" />
              <span>Image to PDF</span>
            </button>
            <button
              onClick={() => setActiveTab('pdf2img')}
              className={cn(
                "flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === 'pdf2img' 
                  ? "bg-white text-blue-700 shadow-sm" 
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-200/50"
              )}
            >
              <FileText className="w-4 h-4" />
              <span>PDF to Image</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-10 mb-20 min-h-[400px]">
          {activeTab === 'img2pdf' ? <ImageToPdf /> : <PdfToImage />}
        </div>
      </main>
    </div>
  );
}
