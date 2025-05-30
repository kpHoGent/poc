import { useRef, useState } from "react";
import mp4Icon from "../assets/mp4_file_icon.png";

const componentStyle = {
  height: "20rem",
  width: "16rem",
  fontFamily: "sans-serif",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const baseUploadBoxStyle = {
  border: "1px dotted lightgray",
  borderRadius: "8px",
  flex: 5,
  padding: "2rem",
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  transition: "background-color 0.2s ease",
  position: "relative" as const,
};

interface FileUploaderProps {
  title: string;
  handleFileUpload: (file: File) => void;
}

const isMp4 = (file: File) => file.type === "video/mp4";

const FileUploader: React.FC<FileUploaderProps> = ({
  title,
  handleFileUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const processFile = (file: File | undefined) => {
    setErrorMessage("");
    if (!file) return;
    if (!isMp4(file)) {
      setErrorMessage(" Only .mp4 files are allowed.");
      return;
    }
    handleFileUpload(file);
    setUploadedFile(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFile(event.target.files?.[0]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    processFile(event.dataTransfer.files?.[0]);
  };

  const uploadBoxStyle = {
    ...baseUploadBoxStyle,
    backgroundColor: isDragging ? "#f0f0f0" : "transparent",
  };

  return (
    <div style={componentStyle}>
      <h4 style={{ flex: "1" }}>{title}</h4>

      <div
        style={uploadBoxStyle}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {uploadedFile ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              wordBreak: "break-all",
              textAlign: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={mp4Icon}
              alt="mp4 icon"
              style={{ width: "48px", height: "48px" }}
            />
            <span
              style={{
                maxWidth: "100%",
                overflowWrap: "break-word",
                textAlign: "center",
                display: "block",
              }}
            >
              {uploadedFile.name}
            </span>
          </div>
        ) : (
          "Click or drag a .mp4 file to upload"
        )}
      </div>

      {errorMessage && (
        <div
          style={{
            color: "#e53935",
            marginTop: "1rem",
            fontSize: "0.95rem",
            backgroundColor: "#fdecea",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
          }}
        >
          {errorMessage}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept=".mp4,video/mp4"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default FileUploader;
