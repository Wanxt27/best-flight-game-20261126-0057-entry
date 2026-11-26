// Input: keyboard state plus mouse clicks on the menu buttons.
// Keys are read per frame; clicks are delivered as one-shot actions.
export function makeInput() {
  return {
    pitch: 0,        // -1 down, +1 up (from ArrowUp/ArrowDown)
    turn: 0,         // -1 left, +1 right (from ArrowLeft/ArrowRight)
    throttleUp: false,
    throttleDown: false,
    airbrake: false,
    keys: new Set(),
    click: null,     // {x, y} in canvas pixels, consumed once per frame
  };
}

export function attachInput(input, canvas, onAction) {
  const keyMap = {
    ArrowUp: 'pitchUp',
    ArrowDown: 'pitchDown',
    ArrowLeft: 'turnLeft',
    ArrowRight: 'turnRight',
    w: 'throttleUp',
    W: 'throttleUp',
    s: 'throttleDown',
    S: 'throttleDown',
    ' ': 'airbrake',
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    input.keys.add(event.key);
    const action = keyMap[event.key];
    if (action) input[action] = true;
    if (event.key === 'Enter') onAction('confirm');
    if (event.key === 'r' || event.key === 'R') onAction('restart');
    if (event.key === 'p' || event.key === 'P') onAction('pause');
    if (event.key === 'm' || event.key === 'M') onAction('mute');
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key);
    const action = keyMap[event.key];
    if (action) input[action] = false;
  });

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    input.click = { x, y };
    onAction('click');
  });

  window.addEventListener('blur', () => {
    for (const key of Object.keys(keyMap)) input[keyMap[key]] = false;
    input.keys.clear();
  });
}

// Collapse raw key state into the -1..1 axes the flight model wants.
export function pollInput(input) {
  input.pitch = (input.pitchUp ? 1 : 0) + (input.pitchDown ? -1 : 0);
  input.turn = (input.turnRight ? 1 : 0) + (input.turnLeft ? -1 : 0);
  return input;
}
