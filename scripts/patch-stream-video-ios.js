/**
 * EAS / Yarn Classic: `patch:` in resolutions is Yarn Berry-only, so installs may stay unpatched.
 * This runs after every install and no-ops Stream screen-share audio mixing when the old ObjC
 * references ScreenShareAudioMixer (missing from some WebRTC builds).
 */
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@stream-io',
  'video-react-native-sdk',
  'ios',
  'StreamVideoReactNative.m',
);

function main() {
  if (!fs.existsSync(target)) {
    console.log('[patch-stream-video-ios] Skip: file not found');
    return;
  }
  const src = fs.readFileSync(target, 'utf8');
  // Comments/imports mention the type; only the real ObjC reference needs patching.
  if (!src.includes('ScreenShareAudioMixer *mixer')) {
    console.log('[patch-stream-video-ios] Skip: already patched or layout changed');
    return;
  }
  const pragma = '#pragma mark - Screen Share Audio Mixing';
  const i = src.indexOf(pragma);
  if (i === -1) {
    console.warn('[patch-stream-video-ios] ScreenShareAudioMixer found but pragma missing');
    process.exitCode = 1;
    return;
  }
  const end = src.lastIndexOf('\n@end');
  if (end === -1 || end < i) {
    console.warn('[patch-stream-video-ios] Could not find implementation @end');
    process.exitCode = 1;
    return;
  }
  const replacement = `${pragma}
/**
 * Patched in postinstall: WebRTC may not expose ScreenShareAudioMixer / screenShareAudioMixer.
 * No-op for iOS compile (audio-only; no screen-share audio mixing).
 */

RCT_EXPORT_METHOD(startScreenShareAudioMixing:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    resolve(nil);
}

RCT_EXPORT_METHOD(stopScreenShareAudioMixing:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    resolve(nil);
}
`;
  fs.writeFileSync(target, src.slice(0, i) + replacement + src.slice(end), 'utf8');
  console.log('[patch-stream-video-ios] Patched', path.relative(process.cwd(), target));
}

main();
