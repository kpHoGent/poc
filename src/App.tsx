import "./App.css";
import VideoPoseDetector from "./components/VideoPoseDetector";
import TensorflowPoseDetection from "./components/TensorflowPoseDetector";
import PoseComparisonScreen from "./screens/PoseComparisonScreen";

function App() {
  return (
    <div>
      <PoseComparisonScreen />
    </div>
  );
}

export default App;
