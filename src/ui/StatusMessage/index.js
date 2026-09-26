import './styles.css';

// A centred message at the top of the screen, such as a tilt warning. It is added to
// document.body, which is also the WebXR DOM overlay root, so it shows in both modes.
export const StatusMessage = () => {
  const element = document.createElement('div');
  element.className = 'statusMessage';
  document.body.appendChild(element);
  let hideTimer = null;

  const hide = () => {
    clearTimeout(hideTimer);
    element.style.visibility = 'hidden';
  }

  // Shows text, and hides it after durationMs unless durationMs is omitted.
  const show = (text, durationMs) => {
    clearTimeout(hideTimer);
    element.textContent = text;
    element.style.visibility = 'visible';
    if (durationMs !== undefined) hideTimer = setTimeout(hide, durationMs);
  }

  return { show, hide };
}

// Shows the nudge/tilt state from physics.nudge events.
export const showTiltStatus = (statusMessage, nudge) => {
  nudge.addEventListener('warning', ({ detail }) => statusMessage.show(`TILT WARNING ${detail}`, 1500));
  nudge.addEventListener('tilt', () => statusMessage.show('TILT'));
  nudge.addEventListener('reset', () => statusMessage.hide());
}
