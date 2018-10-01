'use strict';

/* Stream functions for streaming pages from Amphora. */

const throughMap = require('through2-map'),
  _omit = require('lodash/omit');

/**
 * Streams all pages from a specified site.
 * @param  {object} amphora
 * @param  {string} sitePrefix
 * @return {object} - a stream
 */
module.exports = function (amphora, db, sitePrefix) {
  return db.createReadStream({
    prefix: sitePrefix + '/_pages/',
    keys: true,
    values: true,
    isArray: true,
    limit: -1,
    json: false
  })
  .pipe(throughMap.obj(item => {
    var data = JSON.parse(item);

    return {
      pageRef: data._ref,
      pageData: _omit(data, ['_ref'])
    };
  }));
};
