type SelectProps = {
  label: string;
  options: { value: string; label: string }[];
  onSelect: (option: string) => void;
};

const Select: React.FC<SelectProps> = ({ label, options, onSelect }) => {
  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSelect(e.target.value);
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        maxWidth: "20rem",
        justifySelf: "center",
      }}
    >
      <label>{label}</label>
      <select
        onChange={handleSelect}
        style={{
          border: "1px solid lightgray",
          borderRadius: "5px",
          padding: "0.5rem",
        }}
      >
        <option value="">Selecteer een model</option>
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
