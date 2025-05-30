import { useState } from "react";
import useTFPoseDetector from "../hooks/useTFPoseDetector";
import SelectModelScreen from "./SelectModelScreen";
import VideoUploadScreen from "./VideoUploadScreen";
import StepIndicator from "../components/StepIndicator";
import ResultGraphsScreen from "./ResultGraphsScreen";
import VisualizationScreen from "./VisualizationScreen";

const PoseComparisonScreen: React.FC = () => {
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  const [targetVideo, setTargetVideo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [referencePoses, setReferencePoses] = useState<any[]>([]);
  const [targetPoses, setTargetPoses] = useState<any[]>([]);
  const [interpolatedAngleDiffs, setInterpolatedAngleDiffs] = useState<
    number[][]
  >([]);

  const { loadModel, isLoading, isDetecting, detectPose } = useTFPoseDetector();

  const handleFileUpload = (videotype: string, file: File) => {
    if (videotype === "reference") setReferenceVideo(file);
    if (videotype === "target") setTargetVideo(file);
  };

  const handleLoadModel = async () => {
    try {
      if (!model) return;
      await loadModel(model);
      setActiveStep(1);
    } catch (error) {
      setError("The following error occured: " + error);
    }
  };

  const handleGenerateResults = async () => {
    try {
      if (!referenceVideo || !targetVideo) return;
      const refVideoPoses = await detectPose(referenceVideo);
      const targetVideoPoses = await detectPose(targetVideo);
      setReferencePoses(refVideoPoses);
      setTargetPoses(targetVideoPoses);
      setActiveStep(2);
    } catch (error) {
      setError("The following error occured: " + error);
    }
  };

  const handleGoToVisualization = (interpolated: number[][]) => {
    setInterpolatedAngleDiffs(interpolated);
    setActiveStep(3);
  };

  return (
    <div
      style={{
        width: "100%",
      }}
    >
      <h2>Pose comparison</h2>
      <StepIndicator
        activeStep={activeStep}
        steps={[
          "Model selecteren",
          "Video uploaden",
          "Resultaten tabel",
          "Visualisatie",
        ]}
      />

      {activeStep === 0 && (
        <SelectModelScreen
          model={model}
          onSelect={setModel}
          handleLoadModel={handleLoadModel}
          isLoading={isLoading}
        />
      )}
      {activeStep === 1 && (
        <VideoUploadScreen
          referenceVideo={referenceVideo}
          handleFileUpload={handleFileUpload}
          isLoading={isLoading}
          model={model}
          isDetecting={isDetecting}
          handleGenerateResults={handleGenerateResults}
        />
      )}
      {activeStep === 2 && (
        <ResultGraphsScreen
          video1Poses={referencePoses}
          video2Poses={targetPoses}
          handleGoToVisualization={handleGoToVisualization}
        />
      )}
      {activeStep === 3 && referenceVideo && targetVideo && (
        <VisualizationScreen
          referenceVideoUrl={URL.createObjectURL(referenceVideo)}
          targetVideoUrl={URL.createObjectURL(targetVideo)}
          targetPoses={targetPoses}
          angleDiffs={interpolatedAngleDiffs}
        />
      )}

      {error && (
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
          {error}
        </div>
      )}
    </div>
  );
};

export default PoseComparisonScreen;
