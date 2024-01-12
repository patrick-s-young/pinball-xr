import './styles.css';

export const ARButton = () => {
  const arButtonContainer = document.createElement('div');
  const arButton = document.createElement('button');
  arButtonContainer.className = 'ARButton';
  arButton.innerHTML = 'Enter AR';
  arButtonContainer.appendChild(arButton);
  document.body.appendChild(arButtonContainer);

  const setVisible = (isVisible) => arButtonContainer.style.display = isVisible ? 'flex' : 'none';

  return {
    get self() { return arButton },
    setVisible
  }
}
    