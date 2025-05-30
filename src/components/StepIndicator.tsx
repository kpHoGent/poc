type StepIndicatorProps = {
  steps: string[];
  activeStep: number;
};

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, activeStep }) => {
  return (
    <div
      style={{
        display: "flex",
        marginBottom: "2rem",
        justifyContent: "center",
        justifySelf: "center",
        width: "70%",
      }}
    >
      {steps.map((label, index) => {
        const isActive = index === activeStep;
        const isCompleted = index < activeStep;

        const backgroundColor = isCompleted
          ? "lightgreen"
          : isActive
          ? "lightblue"
          : "rgb(230, 220, 82)";

        const baseStyle: React.CSSProperties = {
          position: "relative",
          width: "20%",
          padding: "0 0.5rem 0 1.5rem", // iets meer ruimte aan rechterkant
          height: "2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: isActive ? "bold" : "normal",
          color: "#1c313a",
          backgroundColor,
          zIndex: steps.length - index,
          marginLeft: index > 0 ? "-20px" : "0",
          borderTopLeftRadius: 5,
          borderBottomLeftRadius: 5,
        };

        return (
          <div key={index} style={baseStyle}>
            {label}

            {/* Pijl rechts */}
            {index !== steps.length - 1 && (
              <>
                <div
                  style={{
                    position: "absolute",
                    right: -20,
                    top: 0,
                    width: 0,
                    height: 0,
                    borderTop: "1.25rem solid transparent",
                    borderBottom: "1.25rem solid transparent",
                    borderLeft: `20px solid ${backgroundColor}`,
                    zIndex: 1,
                  }}
                />
                {/* Border rond pijl */}
                <div
                  style={{
                    position: "absolute",
                    right: -21,
                    top: 0,
                    width: 0,
                    height: 0,
                    borderTop: "1.25rem solid transparent",
                    borderBottom: "1.25rem solid transparent",
                    borderLeft: "20px solid rgba(0, 0, 0, 0.4)", // subtielere rand
                    zIndex: 0,
                  }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
