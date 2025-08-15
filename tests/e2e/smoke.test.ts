import { composeVideo } from '../../render/graph';
import { defaultSettings } from '../../core/settings';
import * as fs from 'fs';

describe('Smoke E2E', () => {
  it('should compose and export video with overlay', () => {
    const output = composeVideo(defaultSettings);
    expect(fs.existsSync(output)).toBe(true);
  });
});
