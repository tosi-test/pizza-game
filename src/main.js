const canvas = document.querySelector('#game-canvas');
const context = canvas.getContext('2d');

const sceneColor = '#2d6cdf';

function resizeCanvas() {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.floor(window.innerWidth * pixelRatio);
  const height = Math.floor(window.innerHeight * pixelRatio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function render() {
  resizeCanvas();

  context.fillStyle = sceneColor;
  context.fillRect(0, 0, window.innerWidth, window.innerHeight);

  requestAnimationFrame(render);
}

render();
