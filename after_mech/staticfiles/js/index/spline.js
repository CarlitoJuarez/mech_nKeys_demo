
import { Application } from '@splinetool/runtime';

function initSpline() {
  const canvas = document.getElementById('canvas3d');
  if (!canvas) return false;

  const app = new Application(canvas);
  app.load('https://prod.spline.design/lhQ2sxVtUo5KXGjj/scene.splinecode');
  return true;
}

if (!initSpline()) {
  window.addEventListener('DOMContentLoaded', () => {
    initSpline();
  }, { once: true });
}
