'use strict';

/* Stream functions for streaming pages from Amphora. */

const throughMap = require('through2-map');

/**
 * Streams all pages from a specified site.
 * @param  {object} amphora
 * @param  {string} sitePrefix
 * @return {object} - a stream
 */
module.exports = function (amphora, sitePrefix) {
  return amphora.db.list({
    prefix: sitePrefix + '/pages/',
    keys: true,
    values: true,
    isArray: true,
    limit: 50000,
    json: false
  })
  .pipe(throughMap.obj(item => ({
    pageRef: item.key,
    pageData: JSON.parse(item.value)
  })));
};
