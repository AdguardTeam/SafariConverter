/**
 * Clean unused folders in build dir
 */

import path from 'path';
import del from 'del';
import {BUILD_DIR, CONVERTER_BUILD_DIR, EXTENSION_BUILD_DIR} from './consts';

const paths = [
    path.join(BUILD_DIR, CONVERTER_BUILD_DIR),
    path.join(BUILD_DIR, EXTENSION_BUILD_DIR)
];

const clean = () => del(paths);

export default clean;
