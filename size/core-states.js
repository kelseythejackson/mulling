// What an app ships when it uses states with their three default loaders.
import { mount, use } from '../dist/core.js';
import { stateLoaders } from '../dist/loaders.js';
use(...stateLoaders);
mount(document.body, { state: 'thinking' });
