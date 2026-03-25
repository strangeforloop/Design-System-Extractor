import React from 'react';
import styled from 'styled-components';

const StyledButton = styled.button`
  background: #3B82F6;
  color: #FFFFFF;
  padding: 16px 24px;
  border: 2px solid #2563EB;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background: #2563EB;
    border-color: #1D4ED8;
  }
`;

export const Button = () => {
  return <StyledButton>Click me</StyledButton>;
};