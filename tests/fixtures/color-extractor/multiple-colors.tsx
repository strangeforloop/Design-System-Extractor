import styled from "styled-components";

const Card = styled.section`
  background: #FF0000;
  color: #00FF00;
`;

export function Page() {
  return (
    <>
      <Card />
      <span style={{ borderColor: "#0000FF" }}>x</span>
    </>
  );
}
