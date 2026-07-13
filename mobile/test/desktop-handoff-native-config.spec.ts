import fs from 'fs';
import path from 'path';

describe('Android desktop handoff transport', () => {
  it('allows the local HTTP endpoint exposed by Field Desktop', () => {
    const manifest = fs.readFileSync(
      path.resolve(
        __dirname,
        '../android/app/src/main/AndroidManifest.xml'
      ),
      'utf8'
    );

    expect(manifest).toContain('android:usesCleartextTraffic="true"');
  });
});
