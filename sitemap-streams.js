'use strict';

const components = require('amphora').components,
  _ = require('lodash'),
  through2 = require('through2');

function pagesToXML(locals, multiplex) {
  return through2.obj(function (item, enc, cb) {
    const cmptXml = getPageXML(item.pageRef, item.pageData, locals, multiplex);

    this.push(`<url><loc>${item.pageData.url}</loc>${cmptXml}</url>`);
    cb();
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
  return through2.obj(function (item, enc, cb) {
    try {
      this.push(item.pageData.url + '\n');
    } catch (ex) {
      console.log(__filename, 'warn', 'SitemapTextTransform', ex.message);
    }
    cb();
  });
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

module.exports.addBookends = addBookends;
module.exports.pagesToText = pagesToText;
module.exports.pagesToXML = pagesToXML;
