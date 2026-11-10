// What an app ships when it uses one loader and nothing else.
import { mount, use } from '../dist/core.js';
import { coil } from '../dist/loaders.js';
use(coil);
mount(document.body, { type: 'coil' });
