'use strict';

const components = require('amphora').components,
  _ = require('lodash'),
  through2 = require('through2'),
  throughMap = require('through2-map');

function pagesToXML(locals, multiplex) {
  return throughMap.obj(item => {
    const cmptXml = getPageXML(item.pageRef, item.pageData, locals, multiplex);

    return `<url><loc>${item.pageData.url}</loc>${cmptXml}</url>`;
  });
}

/**
 * For each component on a given a page, render its "sitemap" template, and concatenate the
 * results.
 * @param  {string} pageRef
 * @param  {object} pageData
 * @param  {object} locals
 * @param  {string} templateName - defaults to "sitemap"
 * @return {string}
 */
function getPageXML(pageRef, pageData, locals, multiplex) {
  const indices = components.getIndices(pageRef, pageData);

  return _.map(indices.refs, getCmptXML.bind(this, multiplex, locals)).join('');
}

function getCmptXML(multiplex, locals, cmptData, reference) {
  const template = components.getTemplate(reference, 'sitemap');

  if (template) {
    return multiplex.render(template, _.assign(cmptData, {locals: locals}));
  }
}

/**
 * Convert a stream of pages to a stream of text listing page URLs.
 * @return {[type]} [description]
 */
function pagesToText() {
  return throughMap.obj(item => item.pageData.url + '\n');
}

/**
 * Prepend and/or append text to a stream.
 * @param {string} prelude
 * @param {string} postlude
 * @return {object}
 */
function addBookends(prelude, postlude) {
  let preludeAdded = false;

  return through2(function (item, enc, cb) {
    if (!preludeAdded && prelude) {
      this.push(prelude);
      preludeAdded = true;
    }
    this.push(item);
    cb();
  }, function (cb) {
    if (!preludeAdded && prelude) this.push(prelude); // in case there are no items
    if (postlude) this.push(postlude);
    cb();
  });
};

module.exports = {
  pages: {
    toXML: pagesToXML,
    toText: pagesToText
  },
  strings: {
    addBookends: addBookends
  }
};