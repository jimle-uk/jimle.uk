#!/usr/local/bin/node

const path          = require('path');
const Metalsmith    = require('metalsmith');
const collections   = require('metalsmith-collections');
const layouts       = require('metalsmith-layouts');
const permalinks    = require('metalsmith-permalinks');
const ignore        = require('metalsmith-ignore');
const sass          = require('metalsmith-sass');

const metalsmith_pug        = require('./plugins/metalsmith-pug');
const metalsmith_markdownit = require('./plugins/metalsmith-markdownit');
const cache_posts           = require('./plugins/cache-posts');

const settings      = require('./settings');
const template_tags = require('./src/utils/template_tags');
const TaskSequence = require('./src/utils/task_sequence');
const build_dir     = settings.build_dir;

// =============================================================================
// assets
// =============================================================================
Metalsmith(__dirname)
    .source('src/static/css')
    .destination(`${build_dir}/static/css`)
    .clean(true)
    .use(ignore(['vendor/*']))
    .use(sass({ outputStyle: 'compressed' }))
    .build(function(err) {
        if (err) throw err;
    });

Metalsmith(__dirname)
    .source('src/static/img')
    .destination(`${build_dir}/static/img`)
    .clean(true)
    .build(function(err) {
        if (err) throw err;
    });

// misc assets like favicon, robots.txt
Metalsmith(__dirname)
    .source('src/assets')
    .destination(`${build_dir}`)
    .clean(true)
    .build(function(err) {
        if (err) throw err;
    });

// =============================================================================
// posts
// =============================================================================
const phase_posts = (resolve) => {
    Metalsmith(__dirname)
        .metadata(Object.assign({}, settings, template_tags))
        .source('src/posts')
        .destination(`${build_dir}/posts`)
        .clean(true)
        .use(collections({
            posts: '*.md',
            sortBy: 'date',
            reverse: true
        }))
        .use(metalsmith_markdownit())
        .use(layouts({
            engine: 'pug',
            directory: 'src/templates'
        }))
        .use(cache_posts.plugin)
        .build((err) => {
            if (err) throw err;
            resolve();
        });
};

// =============================================================================
// pages
// =============================================================================
const phase_pages = (resolve) => {
    Metalsmith(__dirname)
        .metadata(Object.assign({}, settings, template_tags))
        .source('src/pages')
        .destination(build_dir)
        .use(metalsmith_pug({
            getPosts: () => cache_posts.data.posts,
            getTags: () => cache_posts.data.tags
        }))
        .build((err) => {
            if (err) throw err;
            resolve();
        })
};

// =============================================================================
// Ensure "posts" are built first, before building out "pages"
// =============================================================================
const taskSequence = new TaskSequence();

taskSequence
    .run(phase_posts)
    .run(phase_pages)
    .end();
