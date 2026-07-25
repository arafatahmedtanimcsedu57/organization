import { useCallback, type KeyboardEvent } from 'react';
import { PAN_STEP, ZOOM_STEP } from '../../../../constants/canvasZoom';

export interface UseCanvasKeyboardOptions {
  panBy: (dx: number, dy: number) => void;
  zoomBy: (factor: number) => void;
  fitToScreen: (animate?: boolean) => void;
}

/**
 * Keyboard navigation for the canvas: arrows pan, +/− zoom, 0 fits. Keystrokes inside the
 * toolbar's search field are left alone so typing a query never pans the chart.
 */
export function useCanvasKeyboard({ panBy, zoomBy, fitToScreen }: UseCanvasKeyboardOptions) {
  return useCallback(
    (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).tagName === 'INPUT') return;
      switch (event.key) {
        case 'ArrowUp':
          panBy(0, PAN_STEP);
          break;
        case 'ArrowDown':
          panBy(0, -PAN_STEP);
          break;
        case 'ArrowLeft':
          panBy(PAN_STEP, 0);
          break;
        case 'ArrowRight':
          panBy(-PAN_STEP, 0);
          break;
        case '+':
        case '=':
          zoomBy(ZOOM_STEP);
          break;
        case '-':
          zoomBy(1 / ZOOM_STEP);
          break;
        case '0':
          fitToScreen();
          break;
        default:
          return;
      }
      event.preventDefault();
    },
    [panBy, zoomBy, fitToScreen],
  );
}
