// An app that imports only mount() from the complete entry: every loader must still be registered.
import { mount } from '../dist/mulling.js';
mount(document.body, { type: 'coil' });
