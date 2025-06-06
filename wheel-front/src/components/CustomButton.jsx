import React from "react";
import styled from "styled-components";

const theme = {
  blue: {
    default: "linear-gradient(135deg, #6c5ce7, #5f3dc4)",
    hover: "linear-gradient(135deg, #5f3dc4, #4c6ef5)",
    shadow: "rgba(108, 92, 231, 0.3)",
    hoverShadow: "rgba(108, 92, 231, 0.4)",
  },
  pink: {
    default: "linear-gradient(135deg, #ff6b6b, #e84393)",
    hover: "linear-gradient(135deg, #e84393, #d63031)",
    shadow: "rgba(255, 107, 107, 0.3)",
    hoverShadow: "rgba(255, 107, 107, 0.4)",
  },
  green: {
    default: "linear-gradient(135deg, #00b894, #00a085)",
    hover: "linear-gradient(135deg, #00a085, #009678)",
    shadow: "rgba(0, 184, 148, 0.3)",
    hoverShadow: "rgba(0, 184, 148, 0.4)",
  },
  orange: {
    default: "linear-gradient(135deg, #ffb300, #e67e22)",
    hover: "linear-gradient(135deg, #e67e22, #d63031)",
    shadow: "rgba(255, 179, 0, 0.4)",
    hoverShadow: "rgba(255, 179, 0, 0.5)",
  },
  red: {
    default: "linear-gradient(135deg, #e17055, #d63031)",
    hover: "linear-gradient(135deg, #d63031, #c0392b)",
    shadow: "rgba(225, 112, 85, 0.3)",
    hoverShadow: "rgba(225, 112, 85, 0.4)",
  },
};

const StyledButton = styled.button`
  background: ${(props) => theme[props.theme]?.default || theme.blue.default};
  color: ${(props) => (props.theme === "orange" ? "#2d3436" : "white")};
  border: none;
  border-radius: ${(props) => (props.large ? "25px" : "12px")};
  padding: ${(props) => (props.large ? "18px 36px" : "12px 24px")};
  font-size: ${(props) => (props.large ? "1.3rem" : "1rem")};
  font-weight: ${(props) => (props.large ? "bold" : "600")};
  text-transform: uppercase;
  letter-spacing: ${(props) => (props.large ? "2px" : "0.5px")};
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 ${(props) => (props.large ? "8px 20px" : "4px 12px")} ${(props) => 
    theme[props.theme]?.shadow || theme.blue.shadow};
  outline: none;
  user-select: none;
  position: relative;
  overflow: hidden;
  min-width: ${(props) => (props.large ? "200px" : "120px")};
  
  &:hover:not(:disabled) {
    background: ${(props) => theme[props.theme]?.hover || theme.blue.hover};
    transform: translateY(-2px);
    box-shadow: 0 ${(props) => (props.large ? "12px 25px" : "6px 16px")} ${(props) => 
      theme[props.theme]?.hoverShadow || theme.blue.hoverShadow};
  }

  &:active:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 ${(props) => (props.large ? "6px 15px" : "3px 8px")} ${(props) => 
      theme[props.theme]?.shadow || theme.blue.shadow};
  }

  &:disabled {
    background: #666;
    cursor: not-allowed;
    opacity: 0.6;
    box-shadow: none;
    transform: none;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover:not(:disabled)::before {
    left: 100%;
  }

  /* Animation pour les clics */
  &:active:not(:disabled) {
    animation: buttonPulse 0.2s ease-out;
  }

  @keyframes buttonPulse {
    0% { transform: scale(1) translateY(-2px); }
    50% { transform: scale(1.02) translateY(-2px); }
    100% { transform: scale(1) translateY(-2px); }
  }

  /* Responsive */
  @media (max-width: 768px) {
    padding: ${(props) => (props.large ? "16px 32px" : "10px 20px")};
    font-size: ${(props) => (props.large ? "1.2rem" : "0.9rem")};
    min-width: ${(props) => (props.large ? "180px" : "100px")};
    letter-spacing: ${(props) => (props.large ? "1px" : "0.3px")};
  }

  @media (max-width: 480px) {
    padding: ${(props) => (props.large ? "14px 28px" : "8px 16px")};
    font-size: ${(props) => (props.large ? "1.1rem" : "0.85rem")};
    min-width: ${(props) => (props.large ? "160px" : "90px")};
  }
`;

const CustomButton = ({ 
  children, 
  theme = "blue", 
  large = false, 
  onClick, 
  disabled = false, 
  className,
  type = "button",
  ...props 
}) => {
  return (
    <StyledButton
      theme={theme}
      large={large}
      onClick={onClick}
      disabled={disabled}
      className={className}
      type={type}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

CustomButton.defaultProps = {
  theme: "blue",
  large: false,
  disabled: false,
};

export default CustomButton;