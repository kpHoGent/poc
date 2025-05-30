import FileUploader from "../components/FileUploader";

const uploadFlexBoxStyle = {
  display: "flex",
  width: "80%",
  justifyContent: "center",
  justifySelf: "center",
  gap: "2rem",
};

type VideoUploadScreenProps = {
  referenceVideo: File | null;
  handleFileUpload: (videoType: string, file: File) => void;
  isLoading: boolean;
  model: string | null;
  isDetecting: boolean;
  handleGenerateResults: () => void;
};

const VideoUploadScreen: React.FC<VideoUploadScreenProps> = ({
  referenceVideo,
  handleFileUpload,
  isLoading,
  model,
  isDetecting,
  handleGenerateResults,
}) => {
  return (
    <div>
      <div style={uploadFlexBoxStyle}>
        {referenceVideo && (
          <FileUploader
            title="Your video"
            handleFileUpload={(e) => handleFileUpload("target", e)}
          />
        )}
        <FileUploader
          title="Reference video"
          handleFileUpload={(e) => handleFileUpload("reference", e)}
        />
      </div>
      <button
        style={{
          padding: "0.4rem",
          backgroundColor: "lightgreen",
          border: "1px solid lightgray",
          marginTop: "1rem",
          fontWeight: "lighter",
        }}
        disabled={isLoading || !model || isDetecting}
        onClick={handleGenerateResults}
      >
        Generate poses
      </button>
    </div>
  );
};

export default VideoUploadScreen;
