import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUp, CheckCircle2, X } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  acceptTypes?: string;
  maxSizeMB?: number;
  buttonText?: string;
  uploading: boolean;
  error?: string | null;
  success?: boolean;
}

export default function FileUpload({
  onFileUpload,
  acceptTypes = ".xlsx,.xls",
  maxSizeMB = 5,
  buttonText = "Upload File",
  uploading,
  error,
  success
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const validTypes = acceptTypes.split(',').map(type => 
      type.trim().replace('.', '').toLowerCase()
    );

    if (!fileType || !validTypes.includes(fileType)) {
      return `File type not supported. Please upload ${acceptTypes} files only.`;
    }

    // Check file size
    if (file.size > maxSizeBytes) {
      return `File is too large. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const error = validateFile(file);

      if (error) {
        alert(error);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const error = validateFile(file);

      if (error) {
        alert(error);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (selectedFile) {
      try {
        await onFileUpload(selectedFile);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : success 
              ? 'border-green-400 bg-green-50' 
              : error 
                ? 'border-red-400 bg-red-50' 
                : 'border-gray-300 hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center py-4">
          {success ? (
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
              <p className="text-green-700 font-medium">Upload successful!</p>
              <p className="text-sm text-green-600 mt-1">The file has been processed successfully.</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={clearSelectedFile}
              >
                Upload Another File
              </Button>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={acceptTypes}
                onChange={handleFileChange}
              />

              {selectedFile ? (
                <div className="w-full">
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg mb-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded">
                        <FileUp className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={clearSelectedFile}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={handleSubmit}
                      disabled={uploading}
                      className="w-full md:w-auto"
                    >
                      {uploading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        'Process File'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <FileUp className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4 flex flex-col items-center">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {acceptTypes.replaceAll('.', '')} files up to {maxSizeMB}MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleButtonClick}
                    className="mt-4"
                  >
                    {buttonText}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}