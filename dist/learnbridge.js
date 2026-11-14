/**
 * LearnBridge — Master Web Components Distribution Bundle
 *
 * Exposes all accessible custom elements for standalone execution or
 * zero-friction embedding into host learning platforms such as ALX Savanna.
 *
 * Usage in host platform:
 *   <script type="module" src="https://.../learnbridge.js"></script>
 *   <learnbridge-player src="..." captions-en="..." captions-am="..."></learnbridge-player>
 *   <learnbridge-transcript src="..."></learnbridge-transcript>
 *   <learnbridge-certificate recipient="..." cert-id="..."></learnbridge-certificate>
 *   <learnbridge-job-card role-title="..." organization="..."></learnbridge-job-card>
 */

import LearnBridgePlayer from '../components/learnbridge-player.js';
import LearnBridgeTranscript from '../components/learnbridge-transcript.js';
import LearnBridgeInterpreter from '../components/learnbridge-interpreter.js';
import LearnBridgeJobCard from '../components/learnbridge-job-card.js';
import LearnBridgeCertificate from '../components/learnbridge-certificate.js';
import LearnBridgeResourceList from '../components/learnbridge-resource-list.js';

export {
  LearnBridgePlayer,
  LearnBridgeTranscript,
  LearnBridgeInterpreter,
  LearnBridgeJobCard,
  LearnBridgeCertificate,
  LearnBridgeResourceList
};

console.log('[LearnBridge] All accessible Web Components registered successfully.');
