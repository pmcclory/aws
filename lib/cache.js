'use strict';

let cache = new Map();

module.exports = {
  set: (key, value) => {
    cache.set(key, value);
  },
  get: (key) => {
    return cache.get(key);
  }
}