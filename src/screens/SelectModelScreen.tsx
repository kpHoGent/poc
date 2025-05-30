import Select from "../components/Select";

const availableModels = [
  { value: "Lightning", label: "Lightning" },
  { value: "Thunder", label: "Thunder" },
];

type SelectModelScreenProps = {
  onSelect: (modelName: string) => void;
  isLoading: boolean;
  model: string | null;
  handleLoadModel: () => void;
};

const SelectModelScreen: React.FC<SelectModelScreenProps> = ({
  onSelect,
  isLoading,
  model,
  handleLoadModel,
}) => {
  return (
    <div>
      <Select
        label="Choose a PoseNet model"
        options={availableModels}
        onSelect={(e) => onSelect(e)}
      />
      <button
        style={{
          padding: "0.4rem",
          backgroundColor: "lightgreen",
          border: "1px solid lightgray",
          marginTop: "1rem",
          fontWeight: "lighter",
        }}
        disabled={isLoading || !model}
        onClick={handleLoadModel}
      >
        Load Model
      </button>
    </div>
  );
};

export default SelectModelScreen;
