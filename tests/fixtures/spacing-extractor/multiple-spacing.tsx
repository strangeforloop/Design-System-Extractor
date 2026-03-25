import styled from "styled-components";

const Card = styled.article`
  padding: 8px;
  margin: 1rem;
`;

export function Ui() {
  return <Card style={{ gap: "12px", height: "100%" }} />;
}
